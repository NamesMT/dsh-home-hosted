import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  binEntryFromManifest,
  compareVersions,
  EXPECTED_RANGE,
  MIN_SUPPORTED_VERSION,
  parseVersion,
  pinnedManifestPath,
  resolveCli,
} from '../src/home-hosted/resolve.js'
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
