import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildDshLauncherSource,
  buildLauncherSource,
  dshLauncherPath,
  dshLauncherRecordPath,
  dshSearchRoot,
  findCandidate,
  launcherPath,
  launcherRecordPath,
  preflightLauncher,
  readDshLauncherRecord,
  readLauncherRecord,
  versionOfEntry,
  writeDshLauncher,
  writeLauncher,
} from '../src/home-hosted/launcher.js'
import { run } from '../src/util/exec.js'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

/** A fake pinned copy in the pnpm layout the plugin actually sees. */
function fakePinned(profileDir: string, version: string, hash = 'zod@4.6.5'): string {
  const pkg = path.join(profileDir, 'node_modules', '.pnpm', `home-hosted@${version}_${hash}`, 'node_modules', 'home-hosted')
  writeJsonFile(path.join(pkg, 'package.json'), { name: 'home-hosted', version, bin: { 'home-hosted': 'bin/home-hosted.mjs' } })
  fs.mkdirSync(path.join(pkg, 'bin'), { recursive: true })
  fs.writeFileSync(
    path.join(pkg, 'bin', 'home-hosted.mjs'),
    `#!/usr/bin/env node\nconsole.log('fake-home-hosted ${version} ' + process.argv.slice(2).join(' '))\n`,
    'utf8',
  )
  return path.join(pkg, 'bin', 'home-hosted.mjs')
}

interface Harness {
  state: string
  dshHome: string
  profile: string
  entry: string
}

function harness(version = '0.6.1'): Harness {
  scratch = tempDir()
  const dshHome = path.join(scratch.path, 'dsh')
  const profile = path.join(dshHome, 'profiles', 'web')
  const state = path.join(scratch.path, 'state')
  fs.mkdirSync(profile, { recursive: true })
  fs.mkdirSync(state, { recursive: true })
  return { state, dshHome, profile, entry: fakePinned(profile, version) }
}

describe('boot launcher', () => {
  it('writes an executable, self-contained script and records what it resolved', () => {
    const h = harness()
    const written = writeLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry, resolvedVersion: '0.6.1', minVersion: '0.4.1' })

    expect(written.path).toBe(launcherPath(h.state))
    expect(fs.statSync(written.path).mode & 0o777).toBe(0o755)
    const source = fs.readFileSync(written.path, 'utf8')
    expect(source.startsWith('#!/usr/bin/env node')).toBe(true)
    expect(source).toContain('managed by dsh-home-hosted')
    expect(source).not.toMatch(/from '\.\.?\//) // self-contained: node builtins only
    expect(readLauncherRecord(h.state)).toMatchObject({ entry: h.entry, version: '0.6.1' })

    // Idempotent: a second write of the same state changes nothing.
    expect(writeLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry, resolvedVersion: '0.6.1', minVersion: '0.4.1' }).changed).toBe(false)
  })

  it('runs the pinned copy and forwards its arguments', async () => {
    const h = harness()
    writeLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry, minVersion: '0.4.1' })
    const result = await run(launcherPath(h.state), ['up', '--foreground', '--home', '/tmp/example'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('fake-home-hosted 0.6.1 up --foreground --home /tmp/example')
  })

  it('survives a profile reinstall that moves the pinned path', async () => {
    const h = harness()
    writeLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry, minVersion: '0.4.1' })
    expect(await preflightLauncher(h.state)).toBe('0.6.1')

    // pnpm moves the directory (new peer hash) and the recorded path goes stale.
    const store = path.join(h.profile, 'node_modules', '.pnpm')
    const versionDir = fs.readdirSync(store).find(name => name.startsWith('home-hosted@0.6.1'))
    fs.renameSync(path.join(store, versionDir!), path.join(store, 'home-hosted@0.6.1_zod@4.7.0'))
    expect(fs.existsSync(h.entry)).toBe(false)

    expect(await preflightLauncher(h.state)).toBe('0.6.1')
  })

  it('reports a clear failure when nothing is installed anywhere', async () => {
    const h = harness()
    writeLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: null, minVersion: '0.4.1' })
    fs.rmSync(path.join(h.dshHome, 'profiles'), { recursive: true, force: true })
    // PATH keeps node (the shebang needs it) but holds no home-hosted install.
    const result = await run(launcherPath(h.state), ['--version'], { env: { PATH: path.dirname(process.execPath) } })
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('no home-hosted CLI found')
  })

  it('prefers the newest satisfying copy when several are installed', () => {
    const h = harness('0.6.1')
    fakePinned(h.profile, '0.7.0')
    fakePinned(h.profile, '0.3.0')
    const picked = findCandidate([h.profile], '0.4.1')
    expect(picked).toContain('home-hosted@0.7.0_')
    expect(versionOfEntry(picked!)).toBe('0.7.0')
  })

  it('names the launcher path and record it will own', () => {
    const h = harness()
    expect(launcherPath(h.state)).toBe(path.join(h.state, 'bin', 'home-hosted.mjs'))
    expect(launcherRecordPath(h.state)).toBe(path.join(h.state, 'bin', 'resolved.json'))
    expect(buildLauncherSource({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry, minVersion: '0.4.1' }))
      .toContain(h.dshHome)
  })

  it('runs through the shebang the way a unit will, on POSIX', () => {
    const h = harness()
    writeLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry, minVersion: '0.4.1' })
    const script = fs.readFileSync(launcherPath(h.state), 'utf8')
    if (process.platform !== 'win32')
      expect(script.split('\n')[0]).toBe('#!/usr/bin/env node')
  })
})

interface DshHarness {
  state: string
  dshHome: string
  profile: string
  entry: string
}

/** A fake dsh install in the pnpm layout the harness home actually uses. */
function fakeDsh(profileDir: string, version: string, hash = 'pnpmhash'): string {
  const pkg = path.join(profileDir, 'node_modules', '.pnpm', `@deepseek-ai+dsh@${version}_${hash}`, 'node_modules', '@deepseek-ai', 'dsh')
  writeJsonFile(path.join(pkg, 'package.json'), { name: '@deepseek-ai/dsh', version, bin: { dsh: 'lib/bin.js' } })
  fs.mkdirSync(path.join(pkg, 'lib'), { recursive: true })
  fs.writeFileSync(path.join(pkg, 'lib', 'bin.js'), `console.log('fake-dsh ${version} @' + process.argv[1] + ' ' + process.argv.slice(2).join(' '))\n`, 'utf8')
  return path.join(pkg, 'lib', 'bin.js')
}

function dshHarness(version = '0.1.7'): DshHarness {
  scratch = tempDir()
  const dshHome = path.join(scratch.path, 'dsh')
  const profile = path.join(dshHome, 'profiles', 'web')
  const state = path.join(scratch.path, 'state')
  fs.mkdirSync(profile, { recursive: true })
  fs.mkdirSync(state, { recursive: true })
  return { state, dshHome, profile, entry: fakeDsh(profile, version) }
}

/** The reporter's machine: a local dsh, and a different one later on PATH. */
function pinnedHarness(): { state: string, dshHome: string, clone: string, global: string, profile: string, pathValue: string } {
  const home = tempDir()
  scratch = home
  const clone = path.join(home.path, 'Desktop', 'MMO', 'deepseek-harness')
  fs.mkdirSync(path.join(clone, 'lib'), { recursive: true })
  writeJsonFile(path.join(clone, 'package.json'), { name: 'dsh', version: '0.0.0-local' })
  const cloneEntry = path.join(clone, 'lib', 'bin.js')
  fs.writeFileSync(cloneEntry, 'console.log("local-build dsh " + process.argv.slice(2).join(" "))\n', 'utf8')

  const globalDir = path.join(home.path, '.local', 'bin')
  const profile = path.join(home.path, 'global', 'profiles', 'web')
  const globalEntry = fakeDsh(profile, '9.9.9')
  fs.mkdirSync(globalDir, { recursive: true })
  // A package-manager shim dsh leaves on PATH: not a JS entry itself.
  fs.writeFileSync(path.join(globalDir, 'dsh'), `# cmd-shim-target=${globalEntry}\n`, 'utf8')
  fs.chmodSync(path.join(globalDir, 'dsh'), 0o755)

  return {
    state: path.join(home.path, 'state'),
    dshHome: path.join(home.path, 'dsh'),
    clone: cloneEntry,
    global: globalEntry,
    profile,
    pathValue: [globalDir, path.dirname(process.execPath)].join(path.delimiter),
  }
}

describe('dsh launcher', () => {
  it('writes an executable script and records the entry it resolved', () => {
    const h = dshHarness()
    const written = writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry, entryExtension: '.js' })

    expect(written.path).toBe(dshLauncherPath(h.state, '.js'))
    expect(fs.statSync(written.path).mode & 0o777).toBe(0o755)
    const source = fs.readFileSync(written.path, 'utf8')
    expect(source.startsWith('#!/usr/bin/env node')).toBe(true)
    expect(source).toContain('managed by dsh-home-hosted')
    expect(source).not.toMatch(/from '\.\.?\//) // self-contained: node builtins only
    expect(readDshLauncherRecord(h.state)).toMatchObject({ entry: h.entry })

    expect(writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry, entryExtension: '.js' }).changed).toBe(false)
  })

  it('matches the recorded entry extension', () => {
    const h = dshHarness()
    expect(dshLauncherPath(h.state)).toBe(path.join(h.state, 'bin', 'dsh.mjs'))
    expect(dshLauncherPath(h.state, '.cjs')).toBe(path.join(h.state, 'bin', 'dsh.cjs'))
    // A .cjs entry needs a CommonJS launcher: node will not load ESM from .cjs.
    const cjs = buildDshLauncherSource({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry, entryExtension: '.cjs' })
    expect(cjs).toContain("require('node:child_process')")
    expect(cjs).not.toContain('import fs from')
    expect(dshLauncherRecordPath(h.state)).toBe(path.join(h.state, 'bin', 'dsh-resolved.json'))
    expect(buildDshLauncherSource({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry })).toContain(h.dshHome)
  })

  it('runs the recorded dsh entry and forwards its arguments', async () => {
    const h = dshHarness()
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry })
    const result = await run(dshLauncherPath(h.state), ['web', '--port', '3080'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('fake-dsh 0.1.7 @')
    expect(result.stdout).toContain('web --port 3080')
  })

  it('runs a CommonJS entry through a CommonJS launcher', async () => {
    const h = dshHarness('0.1.6')
    const cjs = path.join(h.profile, 'node_modules', 'dsh', 'bin', 'dsh.cjs')
    fs.mkdirSync(path.dirname(cjs), { recursive: true })
    fs.writeFileSync(path.join(h.profile, 'node_modules', 'dsh', 'package.json'), '{"name":"dsh","version":"0.1.6"}\n', 'utf8')
    fs.writeFileSync(cjs, 'console.log("fake-cjs-dsh @" + process.argv[1] + " " + process.argv.slice(2).join(" "))\n', 'utf8')

    const written = writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: cjs, entryExtension: '.cjs' })
    expect(written.path).toBe(dshLauncherPath(h.state, '.cjs'))

    const result = await run(written.path, ['web'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('fake-cjs-dsh @' + cjs + ' web')
  })

  it('re-finds a local build whose recorded path moved', async () => {
    const h = dshHarness()
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry })
    expect((await run(dshLauncherPath(h.state), ['web'])).stdout).toContain('fake-dsh 0.1.7')

    // A rebuild/move of the clone leaves the recorded path dangling.
    const store = path.join(h.profile, 'node_modules', '.pnpm')
    fs.renameSync(path.join(store, '@deepseek-ai+dsh@0.1.7_pnpmhash'), path.join(store, '@deepseek-ai+dsh@0.1.7_otherhash'))
    expect(fs.existsSync(h.entry)).toBe(false)

    const after = await run(dshLauncherPath(h.state), ['web'])
    expect(after.code).toBe(0)
    expect(after.stdout).toContain('fake-dsh 0.1.7')
  })

  it('prefers a newer build over a recorded path that still exists', async () => {
    const h = dshHarness('0.1.6')
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry })
    // An upgrade lands beside the old copy: the record is only refreshed while
    // the plugin runs, so the launcher itself must prefer the newer build.
    fakeDsh(h.profile, '0.1.8')

    const result = await run(dshLauncherPath(h.state), ['web'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('fake-dsh 0.1.8 @')
    expect(result.stdout).not.toContain('fake-dsh 0.1.6')
  })

  it('keeps the recorded path among equal versions', async () => {
    const h = dshHarness('0.1.7')
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry })
    const other = fakeDsh(h.profile, '0.1.7', 'otherhash')

    const result = await run(dshLauncherPath(h.state), ['web'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('fake-dsh 0.1.7 @' + h.entry)
    expect(result.stdout).not.toContain(other)
  })

  it('boots the pinned image over a higher-version copy on PATH', async () => {
    const h = pinnedHarness()
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.clone, pinnedEntry: h.clone })

    const result = await run(dshLauncherPath(h.state), ['web'], { env: { PATH: h.pathValue } })
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('local-build dsh web')
    expect(result.stdout).not.toContain('fake-dsh 9.9.9')
  })

  it('keeps a recorded pin when the plugin restarts behind its own launcher', async () => {
    const h = pinnedHarness()
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.clone, pinnedEntry: h.clone })
    // A process booted through the launcher resolves nothing local, so the
    // rewrite must carry the pin forward — even when the caller offers the
    // global copy it found on PATH instead.
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.global, pinnedEntry: h.global })

    expect(readDshLauncherRecord(h.state)).toMatchObject({ pinned: h.clone })
    const result = await run(dshLauncherPath(h.state), ['web'], { env: { PATH: h.pathValue } })
    expect(result.stdout).toContain('local-build dsh web')
    expect(result.stdout).not.toContain('fake-dsh 9.9.9')
  })

  it('adopts a new pin only when the caller is the running image', async () => {
    const h = pinnedHarness()
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.clone, pinnedEntry: h.clone })
    // A deliberate re-pin: this process *is* the other image.
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.global, pinnedEntry: h.global, repin: true })

    expect(readDshLauncherRecord(h.state)).toMatchObject({ pinned: h.global })
  })

  it('falls back to a version sort once the pinned image is gone', async () => {
    const h = pinnedHarness()
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.clone, pinnedEntry: h.clone })
    fs.rmSync(h.clone)

    const result = await run(dshLauncherPath(h.state), ['web'], { env: { PATH: h.pathValue } })
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('fake-dsh 9.9.9')

    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.global })
    expect(readDshLauncherRecord(h.state)?.pinned ?? null).toBeNull()
  })

  it('does not let a package that merely has lib/bin.js outrank a real dsh', async () => {
    const h = pinnedHarness()
    // An unrelated package at the clone's root, reporting a much higher
    // version: its build file matches by name only, so it must never be booted
    // while a copy that is dsh by construction exists.
    const impostorRoot = path.join(path.dirname(h.state), 'unrelated-project')
    const impostor = path.join(impostorRoot, 'lib', 'bin.js')
    fs.mkdirSync(path.dirname(impostor), { recursive: true })
    fs.writeFileSync(impostor, 'console.log("impostor web")\n', 'utf8')
    writeJsonFile(path.join(impostorRoot, 'package.json'), { name: 'unrelated', version: '99.0.0' })
    // The real copy is not the recorded entry either, so the probe competes on
    // version alone and must still lose to a copy that is dsh by construction.
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: null, searchRoots: [impostorRoot, h.profile] })

    const result = await run(dshLauncherPath(h.state), ['web'], { env: { PATH: h.pathValue } })
    expect(result.code).toBe(0)
    expect(result.stdout).not.toContain('impostor')
    expect(result.stdout).toContain('fake-dsh 9.9.9')
  })

  it('takes the last pnpm store, not an earlier segment that merely looks like one', () => {
    const root = path.join('/home', 'me', 'proj')
    const store = path.join(root, 'node_modules', '.pnpm', '@deepseek-ai+dsh@0.1.7_abc')
    expect(dshSearchRoot(path.join(store, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'))).toBe(root)
  })

  it('never selects a directory that merely looks like dsh on PATH', async () => {
    const h = dshHarness()
    const bin = path.join(scratch!.path, 'bin')
    fs.mkdirSync(path.join(bin, 'dsh'), { recursive: true })
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: null })
    fs.rmSync(path.join(h.dshHome, 'profiles'), { recursive: true, force: true })

    // PATH keeps node, so the launcher starts, but holds no dsh binary.
    const pathValue = [bin, path.dirname(process.execPath)].join(path.delimiter)
    const result = await run(dshLauncherPath(h.state), ['web'], { env: { PATH: pathValue } })
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('no dsh entry found')
  })

  it('re-finds a project install whose recorded entry moved', async () => {
    const h = dshHarness()
    // A project that carries dsh as its own dependency, with pnpm's layout.
    const project = path.join(scratch!.path, 'a', 'b')
    const store = path.join(project, 'node_modules', '.pnpm')
    const pkg = (hash: string): string => path.join(store, `@deepseek-ai+dsh@0.1.7_${hash}`, 'node_modules', '@deepseek-ai', 'dsh')
    fs.mkdirSync(path.join(pkg('aaa'), 'lib'), { recursive: true })
    writeJsonFile(path.join(pkg('aaa'), 'package.json'), { name: '@deepseek-ai/dsh', version: '0.1.7' })
    const entry = path.join(pkg('aaa'), 'lib', 'bin.js')
    fs.writeFileSync(entry, 'console.log("project dsh " + process.argv.slice(2).join(" "))\n', 'utf8')

    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: entry })
    fs.rmSync(path.join(h.dshHome, 'profiles'), { recursive: true, force: true })
    expect((await run(dshLauncherPath(h.state), ['web'])).stdout).toContain('project dsh web')

    // A reinstall moves the versioned store path; the project root stays put.
    fs.mkdirSync(path.join(pkg('bbb'), 'lib'), { recursive: true })
    writeJsonFile(path.join(pkg('bbb'), 'package.json'), { name: '@deepseek-ai/dsh', version: '0.1.7' })
    fs.writeFileSync(path.join(pkg('bbb'), 'lib', 'bin.js'), 'console.log("project dsh " + process.argv.slice(2).join(" "))\n', 'utf8')
    fs.rmSync(path.join(store, '@deepseek-ai+dsh@0.1.7_aaa'), { recursive: true, force: true })

    const after = await run(dshLauncherPath(h.state), ['web'])
    expect(after.code).toBe(0)
    expect(after.stdout).toContain('project dsh web')
  })

  it('exits non-zero with one clear remedy when no dsh is anywhere', async () => {
    const h = dshHarness()
    writeDshLauncher({ stateDir: h.state, dshHome: h.dshHome, resolvedEntry: h.entry })
    fs.rmSync(path.join(h.dshHome, 'profiles'), { recursive: true, force: true })

    const result = await run(dshLauncherPath(h.state), ['web'], { env: { PATH: path.dirname(process.execPath) } })
    expect(result.code).toBe(1)
    expect(result.stderr.trim().split('\n')).toHaveLength(1)
    expect(result.stderr).toContain('no dsh entry found')
    expect(result.stderr).toContain('Reinstall dsh')
  })
})
