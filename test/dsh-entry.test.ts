import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { buildDshEntry, detectProfile, launcherRepair, localDshCommand, needsLauncherRepair, resolveDshLaunch } from '../src/home-hosted/dsh-entry.js'
import type { DshFacts, DshLaunch } from '../src/home-hosted/dsh-entry.js'
import { dshLauncherPath, dshLauncherRecordPath, readDshLauncherRecord } from '../src/home-hosted/launcher.js'
import { run } from '../src/util/exec.js'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

const argv = (...rest: string[]): string[] => ['/usr/bin/node', '/opt/dsh/lib/bin.js', ...rest]

/** Run with a temporary PATH: a bare `dsh` command is only knowable that way. */
async function withEnv<T>(env: Record<string, string>, body: () => Promise<T> | T): Promise<T> {
  const previous = process.env.PATH
  process.env.PATH = env.PATH
  try {
    return await body()
  }
  finally {
    process.env.PATH = previous
  }
}

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

/** A locally cloned and built dsh, the layout a clone's build output has. */
function fakeClone(version = '0.0.0-local'): string {
  scratch = tempDir()
  const root = path.join(scratch.path, 'dsh-clone')
  writeJsonFile(path.join(root, 'package.json'), { name: 'dsh', version })
  fs.mkdirSync(path.join(root, 'lib'), { recursive: true })
  fs.writeFileSync(path.join(root, 'lib', 'bin.js'), 'console.log("clone dsh " + process.argv.slice(2).join(" "))\n', 'utf8')
  return root
}

/** A dsh installed into a harness home's profile, as a package manager leaves it. */
function fakeInstalled(dshHome: string, version: string): string {
  const pkg = path.join(dshHome, 'profiles', 'web', 'node_modules', '.pnpm', `@deepseek-ai+dsh@${version}`, 'node_modules', '@deepseek-ai', 'dsh')
  writeJsonFile(path.join(pkg, 'package.json'), { name: '@deepseek-ai/dsh', version, bin: { dsh: 'lib/bin.js' } })
  fs.mkdirSync(path.join(pkg, 'lib'), { recursive: true })
  fs.writeFileSync(path.join(pkg, 'lib', 'bin.js'), `console.log('installed dsh ${version}')\n`, 'utf8')
  return path.join(pkg, 'lib', 'bin.js')
}

/** A project that carries dsh as its own dependency (`~/a/b` with `package.json`). */
function fakeProjectInstall(version = '0.1.7-rc.2'): { project: string, entry: string, shim: string } {
  scratch = tempDir()
  const project = path.join(scratch.path, 'a', 'b')
  const pkg = path.join(project, 'node_modules', '@deepseek-ai', 'dsh')
  writeJsonFile(path.join(pkg, 'package.json'), { name: '@deepseek-ai/dsh', version, bin: { dsh: 'lib/bin.js' } })
  fs.mkdirSync(path.join(pkg, 'lib'), { recursive: true })
  const entry = path.join(pkg, 'lib', 'bin.js')
  fs.writeFileSync(entry, 'console.log("project dsh " + process.argv.slice(2).join(" "))\n', 'utf8')
  // The package-manager shim a `dsh` invocation actually goes through.
  const shim = path.join(project, 'node_modules', '.bin', 'dsh')
  fs.mkdirSync(path.dirname(shim), { recursive: true })
  fs.writeFileSync(shim, `#!/bin/sh\n# cmd-shim-target=${entry}\nexec node "${entry}" "$@"\n`, 'utf8')
  fs.chmodSync(shim, 0o755)
  return { project, entry, shim }
}

function facts(overrides: Partial<DshFacts> = {}): DshFacts {
  return {
    id: 'dsh',
    port: 3080,
    profile: 'web',
    dshHome: '/home/me/.dsh',
    launch: { program: '/usr/bin/node', args: ['/opt/dsh/lib/bin.js'], cliEntry: '/opt/dsh/lib/bin.js', shimPath: null, source: 'entry' },
    ...overrides,
  }
}

describe('generated dsh entry', () => {
  it('boots a local clone through the stable launcher, not the build path', () => {
    const entry = buildDshEntry(facts({ launcherPath: '/home/me/.dsh/dsh-home-hosted/bin/dsh.mjs' }))
    expect(entry.command).toBe(process.execPath)
    expect(entry.args![0]).toBe('/home/me/.dsh/dsh-home-hosted/bin/dsh.mjs')
    expect(entry.args!).not.toContain('/opt/dsh/lib/bin.js')
    expect(entry.args!.slice(1)).toEqual([
      'web',
      '--port', '{port}',
      '--host', '127.0.0.1',
      '--no-open',
      '--trusted-host', 'localhost:{port}',
    ])
    expect(entry.bind).toBe('local')
  })

  it('keeps the launcher entry shape when no launcher is supplied', () => {
    expect(buildDshEntry(facts()).command).toBe('/usr/bin/node')
    expect(buildDshEntry(facts()).args![0]).toBe('/opt/dsh/lib/bin.js')
  })

  it('keeps a global dsh on PATH exactly as it worked before', () => {
    const global: DshFacts = {
      ...facts(),
      launch: { program: '/usr/local/bin/dsh', args: [], cliEntry: null, shimPath: '/usr/local/bin/dsh', source: 'shim' },
      launcherPath: null,
    }
    const entry = buildDshEntry(global)
    expect(entry.command).toBe('/usr/local/bin/dsh')
    expect(entry.args![0]).toBe('web')
  })

  it('keeps --profile and web handling intact through the launcher', () => {
    const launcherPath = '/home/me/.dsh/dsh-home-hosted/bin/dsh.mjs'
    expect(buildDshEntry(facts({ launcherPath, profile: 'work' })).args).toEqual([
      launcherPath,
      '--profile', 'work',
      '--port', '{port}',
      '--host', '127.0.0.1',
      '--no-open',
      '--trusted-host', 'localhost:{port}',
    ])
    // No known port: app flags are dropped, the app argument is not.
    expect(buildDshEntry(facts({ launcherPath, port: null })).args).toEqual([launcherPath, 'web'])
  })

  it('never asks dsh to bind beyond loopback, which its CLI refuses', () => {
    const entry = buildDshEntry(facts({ launcherPath: '/home/me/.dsh/dsh-home-hosted/bin/dsh.mjs' }))
    expect(entry.args).not.toContain('0.0.0.0')
    expect(entry.args).not.toContain('{host}')
    expect(entry.args).not.toContain('{lanIp}:{port}')
  })
})

describe('resolving the running dsh', () => {
  it('records a local clone in the generated launcher and boots through it', async () => {
    const root = fakeClone()
    const state = path.join(scratch!.path, 'state')
    const dshHome = path.join(scratch!.path, 'home')
    const resolved = await resolveDshLaunch({ stateDir: state, dshHome, argv1: path.join(root, 'lib', 'bin.js'), findOnPath: async () => null })

    const launcher = dshLauncherPath(state)
    expect(resolved?.launcherPath).toBe(launcher)
    expect(resolved?.cliEntry).toBe(path.join(root, 'lib', 'bin.js'))
    expect(readDshLauncherRecord(state)).toMatchObject({ entry: path.join(root, 'lib', 'bin.js') })

    const entry = buildDshEntry(facts({ dshHome, launch: resolved, launcherPath: resolved?.launcherPath ?? null }))
    expect(entry.command).toBe(process.execPath)
    expect(entry.args![0]).toBe(launcher)

    // The entry home carries no dsh at all; only the recorded clone can serve it.
    const result = await run(launcher, ['web', '--port', '3080'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('clone dsh web --port 3080')
  })

  it('records a project-local install and boots through it', async () => {
    const { project, entry } = fakeProjectInstall()
    const state = path.join(scratch!.path, '.dsh', 'dsh-home-hosted')
    const dshHome = path.join(scratch!.path, '.dsh')

    const resolved = await resolveDshLaunch({ stateDir: state, dshHome, argv1: entry, findOnPath: async () => null })
    const launcher = dshLauncherPath(state)
    expect(resolved?.cliEntry).toBe(entry)
    expect(resolved?.launcherPath).toBe(launcher)
    // The project root is recorded: the harness home holds no dsh at all, so a
    // moved copy can only be re-found from the project that installed it.
    expect(readDshLauncherRecord(state)).toMatchObject({ entry, roots: [project] })

    const result = await run(launcher, ['web', '--port', '3080'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('project dsh web --port 3080')
  })

  it('resolves a project install reached through its package-manager shim', async () => {
    const { project, entry, shim } = fakeProjectInstall()
    const state = path.join(scratch!.path, '.dsh', 'dsh-home-hosted')
    const dshHome = path.join(scratch!.path, '.dsh')

    // `.bin/dsh` is a shell shim, not a `.js`: the shim's recorded target names
    // the entry the boot entry must carry.
    const resolved = await resolveDshLaunch({ stateDir: state, dshHome, argv1: shim, findOnPath: async () => null })
    expect(resolved?.cliEntry).toBe(entry)
    expect(readDshLauncherRecord(state)).toMatchObject({ entry, roots: [project] })
  })

  it('does not stack a second launcher on a process already booted through one', async () => {
    const root = fakeClone()
    const state = path.join(scratch!.path, 'state')
    const dshHome = path.join(scratch!.path, 'home')
    const launcher = dshLauncherPath(state)
    fs.mkdirSync(path.dirname(launcher), { recursive: true })
    fs.writeFileSync(launcher, '// generated\n', 'utf8')

    // Second boot: the managed entry runs the launcher, which spawns the clone.
    const resolved = await resolveDshLaunch({ stateDir: state, dshHome, argv1: launcher, findOnPath: async () => null })
    expect(resolved?.launcherPath ?? null).toBeNull()

    // A dist-based clone resolves to the same build regardless of which of its
    // files the process was launched as.
    const dist = path.join(root, 'dist')
    fs.mkdirSync(dist, { recursive: true })
    fs.writeFileSync(path.join(dist, 'bin.js'), 'console.log("dist dsh")\n', 'utf8')
    const viaDist = await resolveDshLaunch({ stateDir: state, dshHome, argv1: path.join(dist, 'bin.js'), findOnPath: async () => null })
    expect(viaDist?.cliEntry).toBe(path.join(root, 'lib', 'bin.js'))
  })

  it('records an installed copy when the process was not launched as an entry', async () => {
    scratch = tempDir()
    const dshHome = path.join(scratch.path, 'home')
    const installed = fakeInstalled(dshHome, '0.1.7')
    const state = path.join(dshHome, 'dsh-home-hosted')

    const resolved = await resolveDshLaunch({ stateDir: state, dshHome, argv1: null, findOnPath: async () => null })
    expect(resolved?.cliEntry).toBe(installed)
    expect(resolved?.launcherPath).toBe(dshLauncherPath(state))
  })

  it('leaves a global dsh on PATH in the existing shape', async () => {
    const found = fakeClone()
    const shim = path.join(found, 'lib', 'bin.js')
    const resolved = await resolveDshLaunch({ stateDir: path.join(scratch!.path, 'state'), argv1: null, findOnPath: async () => shim })
    expect(resolved?.source).toBe('entry')
    expect(resolved?.launcherPath).toBeNull()
    expect(resolved?.args).toEqual([shim])
  })

  it('pins the running image, and keeps the pin when booted behind its launcher', async () => {
    scratch = tempDir()
    // The reporter's shape: the clone the plugin was installed on carries its
    // own build, and a different dsh answers on PATH.
    const clone = path.join(scratch.path, 'Desktop', 'MMO', 'deepseek-harness')
    fs.mkdirSync(path.join(clone, 'lib'), { recursive: true })
    writeJsonFile(path.join(clone, 'package.json'), { name: 'dsh', version: '0.0.0-local' })
    const entry = path.join(clone, 'lib', 'bin.js')
    fs.writeFileSync(entry, 'console.log("local-build dsh web")\n', 'utf8')

    const bin = path.join(scratch.path, 'bin')
    const globalDir = path.join(scratch.path, 'global')
    const global = fakeInstalled(globalDir, '0.1.9')
    fs.mkdirSync(bin, { recursive: true })
    fs.writeFileSync(path.join(bin, 'dsh'), `#!/bin/sh\n# cmd-shim-target=${global}\nexec node "${global}" "$@"\n`, 'utf8')
    fs.chmodSync(path.join(bin, 'dsh'), 0o755)

    const dshHome = path.join(scratch.path, 'home')
    const state = path.join(dshHome, 'dsh-home-hosted')
    const findOnPath = async () => path.join(bin, 'dsh')

    const first = await resolveDshLaunch({ stateDir: state, dshHome, argv1: entry, findOnPath })
    expect(first?.cliEntry).toBe(entry)
    expect(readDshLauncherRecord(state)).toMatchObject({ entry, pinned: entry })

    // Next boot: the entry runs the launcher, so argv[1] is no longer the
    // build. The launcher already chose, and there is a different dsh under the
    // harness home and on PATH — the pin must survive both.
    const second = await resolveDshLaunch({ stateDir: state, dshHome, argv1: dshLauncherPath(state), findOnPath })
    expect(second?.cliEntry).toBe(entry)
    expect(second?.launcherPath).toBe(dshLauncherPath(state))
    expect(readDshLauncherRecord(state)).toMatchObject({ entry, pinned: entry })
  })
})

describe('profile detection', () => {
  it('reads the profile the process was actually launched with', () => {
    expect(detectProfile(argv('--profile', 'hhsample', '--no-open'), { DSH_PROFILE: 'web' })).toBe('hhsample')
    expect(detectProfile(argv('--profile=hhsample'), {})).toBe('hhsample')
  })

  it('falls back to the profile directory the launcher pointed at', () => {
    expect(detectProfile(argv('--no-open'), { DSH_PROFILE_DIR: '/home/me/.dsh/profiles/web' })).toBe('web')
  })

  it('treats the app name as the profile, as `dsh web` does', () => {
    expect(detectProfile(argv('web', '--port', '3080'), { DSH_PROFILE: 'wrong' })).toBe('web')
  })

  it('never lets an inherited DSH_PROFILE override the argv', () => {
    expect(detectProfile(argv('--profile', 'hhsample'), { DSH_PROFILE: 'web', DSH_PROFILE_DIR: '/p/web' })).toBe('hhsample')
  })

  it('defaults to web when nothing says otherwise', () => {
    expect(detectProfile(argv('--no-open'), {})).toBe('web')
  })
})

describe('repairing an entry that boots a clone directly', () => {
  const launch = (launcherPath: string | null, cliEntry: string): DshLaunch => ({
    program: process.execPath,
    args: [cliEntry],
    cliEntry,
    shimPath: null,
    source: 'entry',
    launcherPath,
  })

  it('re-points the stored entry at the launcher, keeping every app argument', () => {
    const repaired = launcherRepair(
      { command: process.execPath, args: ['/opt/dsh-clone/lib/bin.js', 'web', '--port', '3080', '--no-open'] },
      launch('/state/bin/dsh.mjs', '/opt/dsh-clone/lib/bin.js'),
    )
    expect(repaired).toEqual({
      command: process.execPath,
      args: ['/state/bin/dsh.mjs', 'web', '--port', '3080', '--no-open'],
    })
  })

  it('re-points an entry that named a bare dsh, so PATH stops deciding it', async () => {
    // A bare `dsh` on PATH answers with a different copy than the one this
    // plugin pins: that is the row the panel would start the wrong dsh from.
    scratch = tempDir()
    const bin = path.join(scratch.path, 'bin')
    const global = fakeInstalled(path.join(scratch.path, 'global'), '0.1.9')
    fs.mkdirSync(bin, { recursive: true })
    fs.writeFileSync(path.join(bin, 'dsh'), `#!/bin/sh\n# cmd-shim-target=${global}\nexec node "${global}" "$@"\n`, 'utf8')
    fs.chmodSync(path.join(bin, 'dsh'), 0o755)
    const pathValue = [bin, process.env.PATH ?? ''].join(path.delimiter)

    await withEnv({ PATH: pathValue }, async () => {
      expect(launcherRepair(
        { command: 'dsh', args: ['web', '--port', '3080', '--no-open'] },
        launch('/state/bin/dsh.mjs', '/opt/dsh-clone/lib/bin.js'),
      )).toEqual({
        command: process.execPath,
        args: ['/state/bin/dsh.mjs', 'web', '--port', '3080', '--no-open'],
      })
    })
  })

  it('keeps an absolute app argument when repairing a bare command', () => {
    // A bare command has no script argument, so the "drop the leading script"
    // rule must not eat `--home <path>`.
    expect(launcherRepair(
      { command: 'dsh', args: ['web', '--home', '/Users/destiny/.dsh'] },
      launch('/state/bin/dsh.mjs', '/opt/dsh-clone/lib/bin.js'),
    )).toEqual({
      command: process.execPath,
      args: ['/state/bin/dsh.mjs', 'web', '--home', '/Users/destiny/.dsh'],
    })
  })

  it('re-points an entry stopped at a package-manager shim', () => {
    const { entry, shim } = fakeProjectInstall()
    const resolved = launch('/state/bin/dsh.mjs', entry)
    expect(launcherRepair({ command: shim, args: ['web'] }, resolved)).toEqual({
      command: process.execPath,
      args: ['/state/bin/dsh.mjs', 'web'],
    })
    // The same shim as the leading argument of an absolute command.
    expect(launcherRepair({ command: process.execPath, args: [shim, 'web'] }, resolved)).toEqual({
      command: process.execPath,
      args: ['/state/bin/dsh.mjs', 'web'],
    })
  })

  it('does not rewrite the entry when it already runs the launcher', () => {
    expect(launcherRepair(
      { command: process.execPath, args: ['/state/bin/dsh.mjs', 'web'] },
      launch('/state/bin/dsh.mjs', '/opt/dsh-clone/lib/bin.js'),
    )).toBeNull()
  })

  it('never touches an entry that runs a different dsh', () => {
    expect(launcherRepair(
      { command: process.execPath, args: ['/other/dsh/lib/bin.js', 'web'] },
      launch('/state/bin/dsh.mjs', '/opt/dsh-clone/lib/bin.js'),
    )).toBeNull()
    expect(launcherRepair(
      { command: '/other/bin/dsh', args: ['web'] },
      launch('/state/bin/dsh.mjs', '/opt/dsh-clone/lib/bin.js'),
    )).toBeNull()
  })

  it('uses the project\'s own dsh by name when it declares one', async () => {
    // home-hosted resolves a bare command through <cwd>/node_modules/.bin first,
    // so a project that depends on dsh gets its own copy with no path baked in.
    scratch = tempDir()
    const project = path.join(scratch.path, 'proj')
    const entry = path.join(project, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    fs.mkdirSync(path.dirname(entry), { recursive: true })
    fs.writeFileSync(entry, 'console.log("local dsh")\n', 'utf8')
    const bin = path.join(project, 'node_modules', '.bin')
    fs.mkdirSync(bin, { recursive: true })
    fs.writeFileSync(path.join(bin, 'dsh'), `#!/bin/sh\n# cmd-shim-target=${entry}\nexec node "${entry}" "$@"\n`, 'utf8')
    fs.chmodSync(path.join(bin, 'dsh'), 0o755)

    expect(localDshCommand(project, entry)).toBe('dsh')
    expect(localDshCommand(project, '/other/dsh/lib/bin.js')).toBeNull()

    const generated = buildDshEntry(facts({
      projectDir: project,
      launch: launch('/state/bin/dsh.mjs', entry),
      launcherPath: '/state/bin/dsh.mjs',
    }))
    expect(generated.command).toBe('dsh')
    expect(generated.args).toEqual(['web', '--port', '{port}', '--host', '127.0.0.1', '--no-open', '--trusted-host', 'localhost:{port}'])
    expect(generated.cwd).toBe(project)
  })

  it('re-points a row that runs some other dsh at the project\'s own', () => {
    scratch = tempDir()
    const project = path.join(scratch.path, 'proj')
    const entry = path.join(project, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    fs.mkdirSync(path.dirname(entry), { recursive: true })
    fs.writeFileSync(entry, 'console.log("local dsh")\n', 'utf8')
    const bin = path.join(project, 'node_modules', '.bin')
    fs.mkdirSync(bin, { recursive: true })
    fs.writeFileSync(path.join(bin, 'dsh'), `#!/bin/sh\n# cmd-shim-target=${entry}\nexec node "${entry}" "$@"\n`, 'utf8')
    fs.chmodSync(path.join(bin, 'dsh'), 0o755)

    // A row this plugin created, stopped at a global shim: it becomes the
    // project's own copy, and every app argument survives.
    expect(launcherRepair(
      { command: '/Users/destiny/.local/bin/dsh', args: ['web', '--port', '3080'] },
      launch('/state/bin/dsh.mjs', entry),
      { ownedCommand: true, projectDir: project },
    )).toEqual({ command: 'dsh', args: ['web', '--port', '3080'], cwd: project })

    // An adopted row is still the person's choice, and is left alone.
    expect(launcherRepair(
      { command: '/Users/destiny/.local/bin/dsh', args: ['web'] },
      launch('/state/bin/dsh.mjs', entry),
      { projectDir: project },
    )).toBeNull()
  })

  it('only asks for a resolve when the shape can need one', () => {
    expect(needsLauncherRepair({ command: 'dsh', args: ['web'] })).toBe(true)
    expect(needsLauncherRepair({ command: 'dsh.cmd', args: ['web'] })).toBe(true)
    expect(needsLauncherRepair({ command: process.execPath, args: ['/opt/dsh/lib/bin.js', 'web'] })).toBe(true)
    expect(needsLauncherRepair({ command: '/opt/bin/dsh', args: ['web'] })).toBe(true)
    expect(needsLauncherRepair({})).toBe(false)
  })
})
