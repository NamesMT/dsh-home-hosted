import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  binEntryFromManifest,
  compareVersions,
  EXPECTED_RANGE,
  MIN_SUPPORTED_VERSION,
  pinnedManifestPath,
  resolveCli,
} from '../src/home-hosted/resolve.js'
import { parseVersion } from '../src/home-hosted/launch.js'
import { fileURLToPath } from 'node:url'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

/** A fake installed package with a bin entry. */
function fakePackage(root: string, version = '0.9.0', bin: unknown = { 'home-hosted': 'bin/home-hosted.mjs' }): string {
  const dir = path.join(root, 'node_modules', 'home-hosted')
  const manifest = path.join(dir, 'package.json')
  writeJsonFile(manifest, { name: 'home-hosted', version, bin })
  fs.mkdirSync(path.join(dir, 'bin'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'bin', 'home-hosted.mjs'), '#!/usr/bin/env node\nconsole.log(`v${version}`)\n', 'utf8')
  return manifest
}

describe('CLI version handling', () => {
  it('reads the first version out of CLI output, prerelease included', () => {
    expect(parseVersion('home-hosted 0.6.1')).toBe('0.6.1')
    expect(parseVersion('0.5.0\n')).toBe('0.5.0')
    expect(parseVersion('1.2.3-rc.4 extra')).toBe('1.2.3-rc.4')
    expect(parseVersion('no version here')).toBeNull()
    expect(parseVersion(null)).toBeNull()
  })

  it('orders releases above their own prereleases', () => {
    expect(compareVersions('0.6.1', '0.6.1-rc.1')).toBeGreaterThan(0)
    expect(compareVersions('0.6.1-rc.1', '0.6.1')).toBeLessThan(0)
    expect(compareVersions('0.5.0', '0.6.1')).toBeLessThan(0)
    expect(compareVersions('0.6.1', '0.6.1')).toBe(0)
    // The version classes a plain string compare gets wrong, and which decide whether a
    // capability is "supported" and which `dsh` a boot entry runs.
    for (const [a, b, want] of [
      ['1.0.0-rc.2', '1.0.0-rc.10', -1],   // numeric prerelease identifiers
      ['1.0.0-alpha', '1.0.0-beta', -1],   // alphanumeric, lexicographic
      ['1.0.0-alpha.1', '1.0.0-alpha', 1], // a prefix sorts first
      ['1.0.0-1', '1.0.0-alpha', -1],      // numeric below alphanumeric
      ['0.02.0', '0.2.0', 0],              // leading zeroes
      ['0.9.0', '0.10.0', -1],             // numeric core, not lexical
      ['1.0.0-rc.1', '1.0.0', -1],         // prerelease below its release
      ['1.0.0', '1.0.0-rc.1', 1],
    ] as const) {
      expect(compareVersions(a, b), `compare(${a}, ${b})`).toBe(want)
      // `-0` is `0` for ordering: compare numerically, not with `Object.is`.
      expect(compareVersions(b, a) === 0, `compare(${b}, ${a})`).toBe(want === 0)
      if (want !== 0)
        expect(Math.sign(compareVersions(b, a)), `compare(${b}, ${a})`).toBe(-Math.sign(want))
    }
  })

  it('accepts both bin manifest shapes', () => {
    scratch = tempDir()
    expect(binEntryFromManifest(fakePackage(scratch.path))).toBe(path.join(scratch.path, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'))
    expect(binEntryFromManifest(fakePackage(scratch.path, '0.6.1', 'bin/home-hosted.mjs')))
      .toBe(path.join(scratch.path, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'))
    expect(binEntryFromManifest(path.join(scratch.path, 'missing', 'package.json'))).toBeNull()
  })
})

describe('CLI resolution order', () => {
  it('lets an explicit operator override win', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const override = path.join(scratch.path, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs')
    const resolution = await resolveCli({
      override,
      packageManifest: () => manifest,
      readVersion: async () => '9.9.9',
    })
    expect(resolution.status.source).toBe('config')
    expect(resolution.status.version).toBe('9.9.9')
    expect(resolution.launch?.program).toBe(process.execPath)
  })

  it('refuses an override that cannot identify itself, instead of promoting it to supported', async () => {
    scratch = tempDir()
    // The reported defect through `homeHostedCommand`: an `hh.exe`-like file the operator named.
    // The old code read a null version as "unknown, therefore supported" and returned it as the
    // launch — a boot entry that starts the Windows help viewer.
    const impostor = path.join(scratch.path, 'bin', 'hh.exe')
    fs.mkdirSync(path.dirname(impostor), { recursive: true })
    fs.writeFileSync(impostor, 'not a home-hosted CLI\n', 'utf8')
    const resolution = await resolveCli({
      override: impostor,
      packageManifest: () => null,
      // The measured behaviour of the real thing: no output, so no version.
      readVersion: async () => null,
    })
    expect(resolution.launch).toBeNull()
    expect(resolution.status.source).toBe('config')
    expect(resolution.status.supported).toBe(false)
    expect(resolution.status.version).toBeNull()
    expect(resolution.status.path).toBe(impostor)
    // The two ways to be unusable are distinguishable, because the remedy differs.
    expect(resolution.status.detail).toContain('did not identify as home-hosted')
    expect(resolution.status.detail).not.toContain('does not exist')
  })

  it('still names a missing override as missing, not as unidentifiable', async () => {
    scratch = tempDir()
    const missing = path.join(scratch.path, 'nowhere', 'home-hosted')
    const resolution = await resolveCli({ override: missing, packageManifest: () => null })
    expect(resolution.launch).toBeNull()
    expect(resolution.status.supported).toBe(false)
    expect(resolution.status.detail).toContain('does not exist')
    expect(resolution.status.detail).not.toContain('did not identify')
  })

  it('accepts an override that does identify, so the instruction is still carried out', async () => {
    // The negative direction: the strictness above must not break a legitimate override.
    scratch = tempDir()
    const real = path.join(scratch.path, 'bin', 'home-hosted.mjs')
    fs.mkdirSync(path.dirname(real), { recursive: true })
    fs.writeFileSync(real, '#!/usr/bin/env node\nconsole.log("0.11.0")\n', 'utf8')
    const resolution = await resolveCli({
      override: real,
      packageManifest: () => null,
      readVersion: async () => '0.11.0',
    })
    expect(resolution.launch).not.toBeNull()
    expect(resolution.status.source).toBe('config')
    expect(resolution.status.supported).toBe(true)
    expect(resolution.status.version).toBe('0.11.0')
  })

  it('reports an override that does not exist instead of silently running another copy', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const missing = path.join(scratch.path, 'nowhere', 'home-hosted')
    const resolution = await resolveCli({
      override: missing,
      packageManifest: () => manifest,
    })
    // Never substituted: the operator asked for this exact command.
    expect(resolution.launch).toBeNull()
    expect(resolution.status.source).toBe('config')
    expect(resolution.status.path).toBe(missing)
    expect(resolution.status.supported).toBe(false)
    expect(resolution.status.detail).toContain('could not be used')
    // The alternatives are still reported, so the page can offer them.
    expect(resolution.status.dependency).toMatchObject({ source: 'dependency' })
  })

  it('prefers the plugin\'s own pinned dependency over PATH', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const resolution = await resolveCli({
      packageManifest: () => manifest,
      readVersion: async () => '0.9.0',
      findOnPath: async () => '/usr/local/bin/home-hosted',
    })
    expect(resolution.status.source).toBe('dependency')
    expect(resolution.status.path).toBe(path.join(scratch.path, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'))
    expect(resolution.status.supported).toBe(true)
    expect(resolution.status.detail).toContain('pinned dependency')
  })

  it('falls back to PATH, and says the copy is not the pinned one', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const resolution = await resolveCli({
      packageManifest: () => null,
      readVersion: async () => '0.9.0',
      findOnPath: async command => (command === 'home-hosted' ? manifest.replace('package.json', 'bin/home-hosted.mjs') : null),
    })
    expect(resolution.status.source).toBe('path')
    expect(resolution.status.supported).toBe(true)
    expect(resolution.status.detail).toContain('not the pinned dependency')
  })

  it('flags a CLI older than the oldest supported release', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path, '0.3.0')
    const resolution = await resolveCli({
      packageManifest: () => manifest,
      readVersion: async () => '0.3.0',
    })
    expect(resolution.status.supported).toBe(false)
    expect(resolution.status.detail).toContain('oldest supported release')
  })

  it('draws the supported floor at home-hosted 0.9.0', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const pathOf = async (command: string): Promise<string | null> =>
      command === 'home-hosted' ? manifest.replace('package.json', 'bin/home-hosted.mjs') : null

    const at = await resolveCli({ packageManifest: () => null, readVersion: async () => '0.9.0', findOnPath: pathOf })
    expect(at.status.supported).toBe(true)

    // 0.8.3 is the release this floor excludes: it reads a schema-2 stamp as a newer release's
    // file, so the two gates cannot both be satisfied.
    const below = await resolveCli({ packageManifest: () => null, readVersion: async () => '0.8.3', findOnPath: pathOf })
    expect(below.status.supported).toBe(false)
    expect(below.status.detail).toContain('oldest supported release (0.9.0)')
  })

  it('reports no CLI at all instead of inventing one', async () => {
    const resolution = await resolveCli({
      packageManifest: () => null,
      findOnPath: async () => null,
    })
    expect(resolution.launch).toBeNull()
    expect(resolution.status).toMatchObject({ source: 'none', path: null, supported: false })
    expect(resolution.status.detail).toContain('no home-hosted CLI found')
  })

  /**
   * The one null version still accepted, and why it is not the old bug.
   *
   * A PATH hit or an override with no version is refused now, so the only way `version` reaches
   * the final branch as null is a **pinned dependency whose own manifest declares no `version`**.
   * That copy still ships with this plugin and is still the one it was built against, so it is
   * used and reported as "unknown version" — never as a version that was checked.
   */
  it('accepts a pinned dependency whose manifest declares no version, and says so', async () => {
    scratch = tempDir()
    const dir = path.join(scratch.path, 'node_modules', 'home-hosted')
    fs.mkdirSync(path.join(dir, 'bin'), { recursive: true })
    writeJsonFile(path.join(dir, 'package.json'), { name: 'home-hosted', bin: { 'home-hosted': 'bin/home-hosted.mjs' } })
    fs.writeFileSync(path.join(dir, 'bin', 'home-hosted.mjs'), '#!/usr/bin/env node\n', 'utf8')
    const resolution = await resolveCli({
      packageManifest: () => path.join(dir, 'package.json'),
      findOnPath: async () => null,
    })
    expect(resolution.status.source).toBe('dependency')
    expect(resolution.status.version).toBeNull()
    expect(resolution.status.supported).toBe(true)
    expect(resolution.status.detail).toContain('unknown version')
  })

  it('ships a dependency the plugin can resolve in this repo', () => {
    // The whole point of the pin: the plugin carries its own copy.
    expect(pinnedManifestPath()).not.toBeNull()
  })
})

describe('CLI preference', () => {
  /** Both copies exist: the plugin's own, and one on PATH. */
  async function both(prefer: 'pinned' | 'global') {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    return await resolveCli({
      prefer,
      packageManifest: () => manifest,
      readVersion: async () => '0.9.0',
      findOnPath: async command => (command === 'home-hosted' ? manifest.replace('package.json', 'bin/home-hosted.mjs') : null),
    })
  }

  it('prefers the pinned dependency by default', async () => {
    const resolution = await both('pinned')
    expect(resolution.status.source).toBe('dependency')
    expect(resolution.status.prefer).toBe('pinned')
    expect(resolution.status.dependency).toMatchObject({ source: 'dependency', version: '0.9.0' })
    expect(resolution.status.global).toMatchObject({ source: 'path', version: '0.9.0' })
  })

  it('uses the global install when that is the chosen preference', async () => {
    const resolution = await both('global')
    expect(resolution.status.source).toBe('path')
    expect(resolution.status.prefer).toBe('global')
    expect(resolution.status.detail).toBe('the global install on PATH (0.9.0)')
  })

  it('falls back to the pinned copy when the chosen global install is missing', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const resolution = await resolveCli({
      prefer: 'global',
      packageManifest: () => manifest,
      findOnPath: async () => null,
    })
    expect(resolution.status.source).toBe('dependency')
    expect(resolution.status.global).toBeNull()
  })

  it('falls back to PATH when the pinned copy is missing, whatever the preference', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const resolution = await resolveCli({
      prefer: 'pinned',
      packageManifest: () => null,
      findOnPath: async command => (command === 'home-hosted' ? manifest.replace('package.json', 'bin/home-hosted.mjs') : null),
      readVersion: async () => '0.9.0',
    })
    expect(resolution.status.source).toBe('path')
    expect(resolution.status.dependency).toBeNull()
  })
})

/**
 * A hit on PATH is a candidate, not an install: it must answer `--version` to prove what it is.
 *
 * The reported defect: on Windows `where hh` answers `C:\Windows\hh.exe` — the Microsoft HTML Help
 * viewer, a Windows built-in — because `hh` is a legitimate alias of the CLI (its `bin` map declares
 * `{"home-hosted": …, "hh": …}`). `hh.exe --version` printed nothing and exited non-zero, so the
 * version was `null`, and `supported = version === null || …` read that as a *supported* global
 * install. With `cli.prefer: 'global'` the generated launcher and the OS boot entry then pointed at
 * the help viewer.
 */
describe('a PATH hit must prove it is home-hosted', () => {
  /** A file at `path` that exists and is not a script node runs directly. */
  function impostor(root: string, name: string): string {
    const file = path.join(root, name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, 'this is not a home-hosted CLI\n', 'utf8')
    return file
  }

  it('rejects an hh that cannot answer --version, and never calls it supported', async () => {
    scratch = tempDir()
    const fakeHh = impostor(path.join(scratch.path, 'Windows'), 'hh.exe')
    const resolution = await resolveCli({
      packageManifest: () => null,
      findOnPath: async () => fakeHh,
      // The measured behaviour of the real thing: no output, so no version.
      readVersion: async () => null,
    })
    // The whole bug in one line: an unidentifiable path is not an install.
    expect(resolution.launch).toBeNull()
    expect(resolution.status.source).toBe('none')
    expect(resolution.status.path).toBeNull()
    expect(resolution.status.supported).toBe(false)
    expect(resolution.status.global).toBeNull()
    // It must say why, rather than silently falling back to the pinned copy.
    expect(resolution.status.detail).toContain(fakeHh)
    expect(resolution.status.detail).toContain('did not identify as home-hosted')
  })

  it('skips a hit inside the Windows system directory without probing it', async () => {
    scratch = tempDir()
    // A real file, so the only reason to skip it is the directory rule — not "it does not exist".
    // `%SystemRoot%` is pointed at the scratch dir because the rule reads the environment, and a
    // real `C:\Windows` does not exist on the machine that runs this.
    const systemRoot = path.join(scratch.path, 'Windows')
    const systemHit = impostor(systemRoot, 'hh.exe')
    const probed: string[] = []
    const resolution = await resolveCli({
      platform: 'win32',
      env: { SystemRoot: systemRoot },
      packageManifest: () => null,
      findAllOnPath: async () => [systemHit],
      readVersion: async (launch) => {
        probed.push(launch.cliEntry ?? launch.shimPath ?? launch.program)
        // It *would* identify if it were probed, so a pass cannot come from a null version.
        return '0.9.4'
      },
    })
    // Never run: probing it can flash its help window, and it is not an install either way.
    expect(probed).toEqual([])
    expect(resolution.status.global).toBeNull()
    expect(resolution.status.source).toBe('none')
    expect(resolution.status.detail).toContain(systemHit)
  })

  it('keeps a hit outside the system directory on the same platform', async () => {
    // The control for the test above: same platform, same env, same readVersion — only the path
    // differs. Without it a broken skip would look like a working one.
    scratch = tempDir()
    const systemRoot = path.join(scratch.path, 'Windows')
    fs.mkdirSync(systemRoot, { recursive: true })
    const shim = impostor(path.join(scratch.path, 'AppData', 'Roaming', 'npm'), 'hh.cmd')
    const resolution = await resolveCli({
      platform: 'win32',
      env: { SystemRoot: systemRoot },
      packageManifest: () => null,
      findAllOnPath: async () => [shim],
      readVersion: async () => '0.9.4',
    })
    expect(resolution.status.source).toBe('path')
    expect(resolution.status.path).toBe(shim)
  })

  it('picks the hit that identifies when where.exe returns several', async () => {
    scratch = tempDir()
    const first = impostor(scratch.path, 'first/hh.exe')
    const second = impostor(scratch.path, 'second/hh.exe')
    const third = path.join(scratch.path, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs')
    fs.mkdirSync(path.dirname(third), { recursive: true })
    fs.writeFileSync(third, '#!/usr/bin/env node\n', 'utf8')
    const seen: string[] = []
    const resolution = await resolveCli({
      packageManifest: () => null,
      findAllOnPath: async () => [first, second, third],
      readVersion: async (launch) => {
        const entry = launch.cliEntry ?? launch.shimPath ?? launch.program
        seen.push(entry)
        // The first two are the impostor shape; only the third answers.
        return entry === third ? '0.9.4' : null
      },
    })
    // Each hit in the order `where.exe` gave them, stopping at the one that identifies.
    expect(seen).toEqual([first, second, third])
    expect(resolution.status.source).toBe('path')
    expect(resolution.status.path).toBe(third)
    expect(resolution.status.version).toBe('0.9.4')
    expect(resolution.status.supported).toBe(true)
    // Every refusal is still named, so the page can explain the ones it passed over.
    expect(resolution.status.detail).toContain(first)
    expect(resolution.status.detail).toContain(second)
  })

  it('accepts a .cmd shim that does identify', async () => {
    scratch = tempDir()
    const shim = path.join(scratch.path, 'global', 'home-hosted.cmd')
    fs.mkdirSync(path.dirname(shim), { recursive: true })
    fs.writeFileSync(shim, '@echo off\r\necho 0.9.4\r\n', 'utf8')
    const resolution = await resolveCli({
      platform: 'win32',
      packageManifest: () => null,
      findAllOnPath: async () => [shim],
      readVersion: async () => '0.9.4',
    })
    // A Windows global install is a .cmd, and it must stay usable — `prefer: 'global'` is a feature.
    expect(resolution.status.source).toBe('path')
    expect(resolution.launch).not.toBeNull()
    expect(resolution.launch?.program).toBe(shim)
    expect(resolution.status.supported).toBe(true)
  })

  it('does not treat a rejected PATH hit as the reason to abandon the pinned copy', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const impostorPath = impostor(path.join(scratch.path, 'Windows'), 'hh.exe')
    const resolution = await resolveCli({
      packageManifest: () => manifest,
      findAllOnPath: async () => [impostorPath],
      readVersion: async () => null,
    })
    // The pinned copy still wins, and the impostor is reported rather than mistaken for one.
    expect(resolution.status.source).toBe('dependency')
    expect(resolution.status.global).toBeNull()
    expect(resolution.status.detail).toContain('pinned dependency')
    expect(resolution.status.detail).toContain('did not identify as home-hosted')
  })
})

/**
 * The **committed bundle** must carry the range too — and it is a third place, not a build detail.
 *
 * `lib/` is committed because a local install runs no `prepare` script, so the file that ships is
 * whatever was last checked in. Bumping `package.json` and `EXPECTED_RANGE` without rebuilding left
 * the bundle inlining `^0.9.0` while everything else said `^0.9.4`: users were offered the old range,
 * and the release failed because `release.yml` builds before changelogen and the rebuild dirtied a
 * tracked file. CI was green throughout — nothing compared the two.
 *
 * Compares the *value esbuild inlined*, not the file bytes: a byte comparison would assert esbuild's
 * output is identical across platforms, which the release gate (macOS) would turn into a false
 * positive. This only cares that the shipped constant matches the source constant.
 */
describe('the committed bundle carries the range the source declares', () => {
  const bundlePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'index.js')

  it('inlines the same EXPECTED_RANGE as resolve.ts', () => {
    const bundle = fs.readFileSync(bundlePath, 'utf8')
    // esbuild renames nothing here, but match on the assignment rather than a bare string so an
    // unrelated `^0.9.4` in a comment cannot satisfy this.
    const inlined = /var EXPECTED_RANGE = "([^"]+)"/.exec(bundle)?.[1]
    expect(inlined, 'lib/index.js must inline EXPECTED_RANGE — run `pnpm build`').toBeDefined()
    expect(inlined, 'lib/index.js is stale — run `pnpm build` and commit it').toBe(EXPECTED_RANGE)
  })

})

/**
 * `docs/PANEL.md` states that the supported range "is stated twice and both must agree:
 * `dependencies['home-hosted']` in `package.json` and `EXPECTED_RANGE` in `resolve.ts`"
 * — and that bumping one alone makes the page recommend a range the plugin is not built
 * against. That was **unenforced**: setting the manifest to `^0.7.99` while
 * `EXPECTED_RANGE` stayed `^0.7.3` failed nothing. This makes the documented rule a
 * checked one, reading the manifest as data rather than restating the string.
 */
describe('the pinned range is stated in two places and they agree', () => {
  const manifestPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json')

  it('matches the range the plugin advertises', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { dependencies?: Record<string, string> }
    expect(manifest.dependencies?.['home-hosted'], 'package.json must pin home-hosted').toBe(EXPECTED_RANGE)
  })

  it('keeps the oldest supported release inside that range', () => {
    // `MIN_SUPPORTED_VERSION` is the floor the plugin relies on, so it has to be a
    // version the range actually admits — a floor *above* the range would advertise a
    // copy the plugin then refuses.
    expect(compareVersions(MIN_SUPPORTED_VERSION, EXPECTED_RANGE.replace(/^[^0-9]*/, ''))).toBeLessThanOrEqual(0)
  })
})

/**
 * The Plugins page's artwork, which fails silently when it is wrong.
 *
 * dsh reads `package.json#icon` as a **relative path inside the package** and inlines it as a
 * data URL (`iconOf` in `dsh-app-boot`); anything it refuses — an absolute path, an extension it
 * does not know, a file over 256 KiB, one that escapes the package — renders the generic default
 * mark with only a `error` string in a field nothing displays. So the three ways to get this
 * wrong are checked here: the field resolves, the file ships, and it is one of the four types.
 *
 * `files` is what `pnpm pack` publishes, so an icon outside it exists in the repo and not in what
 * users install — the same failure, one release later.
 */
describe('the package artwork', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { icon?: string, files?: string[] }

  it('names a relative path inside the package, as the resolver demands', () => {
    expect(manifest.icon, 'package.json needs an icon for the Plugins page').toBeDefined()
    const icon = manifest.icon!
    // `iconOf` rejects these three outright: absolute POSIX, absolute Windows, or a URL scheme.
    expect(path.isAbsolute(icon), 'the icon must be a relative path').toBe(false)
    expect(/^[A-Za-z][A-Za-z\d+.-]*:/u.test(icon), 'the icon must not be a URL').toBe(false)
    const target = path.resolve(root, icon)
    const relative = path.relative(root, target)
    expect(relative.startsWith('..') || path.isAbsolute(relative), 'the icon must stay inside the package').toBe(false)
  })

  it('ships a real file the resolver will inline', () => {
    const icon = manifest.icon!
    const target = path.resolve(root, icon)
    expect(fs.existsSync(target), `${icon} is declared but missing`).toBe(true)
    // The four types `ICON_MEDIA_TYPES` maps; anything else throws and shows the default mark.
    expect(['.svg', '.png', '.jpg', '.jpeg', '.webp']).toContain(path.extname(target).toLowerCase())
    expect(fs.statSync(target).size, 'the resolver refuses an icon over 256 KiB').toBeLessThanOrEqual(256 * 1024)
  })

  it('publishes the icon, so the installed copy is not the one without it', () => {
    const icon = manifest.icon!.replace(/^\.\//, '')
    // `files` entries are prefixes of published paths (`lib` covers `lib/index.js`).
    const published = (manifest.files ?? []).some(entry => icon === entry || icon.startsWith(`${entry.replace(/\/$/, '')}/`))
    expect(published, `package.json#files must include ${icon}`).toBe(true)
  })
})

/**
 * The Desktop override regression, pinned.
 *
 * Under DSH Desktop this process *is* the Electron binary, and Electron with a script argument
 * and no `ELECTRON_RUN_AS_NODE` exits 0 printing nothing — it answers `--version` itself instead
 * of running the script (measured). The version probe therefore cannot use `launch.program`
 * there: doing so made every legitimate script override, including the pinned dependency's own
 * `.mjs`, unidentifiable and refused.
 *
 * `nodeInterpreter` is the seam that makes the Desktop shape assertable on a non-Electron host:
 * without it, `process.execPath` here *is* real node and the test would pass for the wrong reason.
 */
describe('a script override under Desktop', () => {
  /**
   * A stand-in for the machine's node: really runs the script it is given, and leaves a marker.
   *
   * The marker is what makes this pin the *right* thing. On a non-Electron host
   * `process.execPath` is itself a working node, so a probe that wrongly used
   * `launch.program` would still print the version and the test would pass for the wrong
   * reason — the same trap the reviewer found in `test/launcher.test.ts`. Only the marker
   * distinguishes "the resolved interpreter ran" from "this process happened to work".
   */
  function realNode(root: string): { path: string, marker: string } {
    const node = path.join(root, 'node')
    const marker = path.join(root, 'node-ran')
    fs.writeFileSync(node, `#!/bin/sh\n: > "${marker}"\nexec "${process.execPath}" "$@"\n`, { mode: 0o755 })
    return { path: node, marker }
  }

  function scriptOverride(root: string, version = '0.11.0'): string {
    const cli = path.join(root, 'home-hosted.mjs')
    fs.writeFileSync(cli, `console.log('${version}')\n`, 'utf8')
    return cli
  }

  it('identifies a legitimate script override by running it with a real node', async () => {
    scratch = tempDir()
    const node = realNode(scratch.path)
    const resolution = await resolveCli({
      override: scriptOverride(scratch.path),
      platform: 'win32',
      packageManifest: () => null,
      findAllOnPath: async () => [],
      nodeInterpreter: async () => ({ path: node.path, source: 'bundled' }),
    })
    // The Desktop fix in one assertion: the probe found a node and the override identified.
    expect(resolution.launch).not.toBeNull()
    expect(resolution.status.source).toBe('config')
    expect(resolution.status.supported).toBe(true)
    expect(resolution.status.version).toBe('0.11.0')
    // And it was the *resolved* interpreter that ran it — not this process by luck, which is
    // what the version alone cannot tell on a host where `process.execPath` is already node.
    expect(fs.existsSync(node.marker), 'the resolved node was the one executed').toBe(true)
  })

  it('refuses that same override when no node resolves, rather than pretending it is fine', async () => {
    // The other half: an unprobeable override must still be reported, not trusted blindly —
    // which is the reported `hh.exe` defect. Both rules hold at once.
    scratch = tempDir()
    const resolution = await resolveCli({
      override: scriptOverride(scratch.path),
      platform: 'win32',
      packageManifest: () => null,
      findAllOnPath: async () => [],
      nodeInterpreter: async () => null,
    })
    expect(resolution.launch).toBeNull()
    expect(resolution.status.supported).toBe(false)
    expect(resolution.status.detail).toContain('did not identify as home-hosted')
  })
})
