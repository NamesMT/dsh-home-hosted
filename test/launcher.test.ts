import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildLauncherSource,
  findCandidate,
  launcherPath,
  launcherRecordPath,
  preflightLauncher,
  readLauncherRecord,
  versionOfEntry,
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
