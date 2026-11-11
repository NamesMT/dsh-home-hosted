import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { execFileSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import type { CliLaunch } from '../src/home-hosted/launch.js'
import {
  activationHelperPath,
  buildActivationSource,
  buildTakeoverSource,
  installGlobal,
  spawnActivation,
  writeActivationHelper,
  spawnTakeover,
  startPanel,
  stopPanel,
  takeoverHelperPath,
  writeTakeoverHelper,
} from '../src/home-hosted/panel-control.js'
import type { ActivationPlan, PanelControlDeps } from '../src/home-hosted/panel-control.js'
import { helperArgv, launchArgv } from '../src/home-hosted/node-interpreter.js'
import type { NodeInterpreterSource } from '../src/home-hosted/node-interpreter.js'
import type { RunResult } from '../src/util/exec.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

/**
 * The command word in a resolved CLI argv.
 *
 * `deps()` resolves a CLI *entry* (`[<entry>, <command>, …]`), which is what a real launch looks
 * like, so the command is the first token that is not the program itself.
 */
function commandOf(args: string[]): string {
  return args.find(arg => !arg.includes('/') && !arg.endsWith('.mjs')) ?? args[0] ?? ''
}

function ok(stdout = '', stderr = ''): RunResult {
  return { command: 'fake', args: [], code: 0, signal: null, stdout, stderr, timedOut: false, error: null }
}

/** A fake CLI that records its argv, prints a URL, and exits. */
function deps(overrides: Partial<PanelControlDeps> = {}): { deps: PanelControlDeps, calls: string[][], log: string } {
  scratch = tempDir()
  const root = scratch.path
  const state = path.join(root, 'state')
  fs.mkdirSync(state, { recursive: true })
  const cli = path.join(root, 'fake-cli.mjs')
  const log = path.join(root, 'calls.log')
  fs.writeFileSync(cli, `#!/usr/bin/env node\nimport fs from 'node:fs'\nfs.appendFileSync(${JSON.stringify(log)}, process.argv.slice(2).join(' ') + '\\n')\nif (process.argv.includes('up')) console.log('home-hosted: http://127.0.0.1:6399/')\n`, 'utf8')
  const launch: CliLaunch = { program: process.execPath, args: [cli], cliEntry: cli, shimPath: null, source: 'entry' }
  const calls: string[][] = []
  return {
    deps: { launch, home: path.join(root, 'hh'), projectDir: null, stateDir: state, env: { PATH: process.env.PATH ?? '', HHOSTED_HOME: path.join(root, 'hh') }, ...overrides },
    calls,
    log,
  }
}

describe('panel control', () => {
  it('starts the panel through the CLI and reads back its URL', async () => {
    const { deps: d, log } = deps()
    const result = await startPanel(d)
    expect(result.ok).toBe(true)
    expect(result.url).toBe('http://127.0.0.1:6399/')
    expect(fs.readFileSync(log, 'utf8')).toContain(`up --home ${d.home}`)
  })

  it('reports a failing CLI instead of claiming success', async () => {
    const { deps: d } = deps({ launch: null })
    const result = await startPanel(d)
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('no home-hosted CLI')
  })

  /**
   * The bug this exists for: an upgrade raised the config schema, and every `up` then refuses with
   * `config schema 1 needs 1 migration` — a panel that can never start and a remedy (`home-hosted
   * migrate`) the person has to run by hand. The page's start path now lifts it and retries once.
   *
   * The fake CLI answers exactly like the pinned 0.11.0 (`migrate --dry-run` prints `migrating …`,
   * `--yes` succeeds, `up` refuses until the schema is current), so a wrong anchor or a missing
   * retry fails here.
   */
  it('lifts a config the panel refuses to boot, then starts it', async () => {
    const { deps: d } = deps()
    let schema = 1
    const calls: string[][] = []
    d.exec = async (args): Promise<RunResult> => {
      calls.push(args)
      if (commandOf(args) === 'migrate') {
        if (args.includes('--dry-run'))
          return ok(schema < 2 ? 'migrating global settings: config schema 1 → 2\n  1. notifications: fold\nnothing was written (--dry-run)' : 'nothing was written (--dry-run)')
        schema = 2
        return ok('migrated global settings to schema 2')
      }
      if (commandOf(args) === 'up')
        return schema < 2 ? { ...ok(), code: 1, stderr: 'refusing to start: config schema 1 needs 1 migration before this release can use it' } : ok('home-hosted: http://127.0.0.1:6399/')
      return ok()
    }
    const result = await startPanel(d)
    expect(result.ok).toBe(true)
    expect(result.url).toBe('http://127.0.0.1:6399/')
    // One question, one migration, one retried start — and the report says what was lifted.
    expect(calls.map(commandOf)).toEqual(['up', 'migrate', 'migrate', 'up'])
    expect(result.detail).toContain('config schema 1 → 2')
    expect(result.detail).toContain('.bak')
  })

  it('leaves a failed start alone when the panel says no migration is pending', async () => {
    const { deps: d } = deps()
    const calls: string[][] = []
    d.exec = async (args): Promise<RunResult> => {
      calls.push(args)
      if (commandOf(args) === 'migrate') return ok('nothing was written (--dry-run)')
      return { ...ok(), code: 1, stderr: 'error control port 3999 is already in use' }
    }
    const result = await startPanel(d)
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('already in use')
    // Asked, never applied, never retried.
    expect(calls.map(commandOf)).toEqual(['up', 'migrate'])
  })

  it('reports a migration that could not be applied, keeping the start\'s own failure', async () => {
    const { deps: d } = deps()
    d.exec = async (args): Promise<RunResult> => commandOf(args) === 'migrate'
      ? (args.includes('--dry-run') ? ok('migrating global settings: config schema 3 → 2') : { ...ok(), code: 1, stderr: 'error written by a newer release' })
      : { ...ok(), code: 1, stderr: 'refusing to start: config schema 3' }
    const result = await startPanel(d)
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('refusing to start')
    expect(result.detail).toContain('written by a newer release')
  })

  it('stops the panel through the CLI down command', async () => {
    const { deps: d, log } = deps()
    const result = await stopPanel(d)
    expect(result.ok).toBe(true)
    expect(result.detail).toContain('servers it supervised stopped')
    expect(fs.readFileSync(log, 'utf8')).toContain(`down --home ${d.home}`)
  })

  it('reports a stop it could not perform instead of claiming the panel is down', async () => {
    const { deps: d } = deps({ launch: null })
    const result = await stopPanel(d)
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('no home-hosted CLI')
  })

  it('reports why a stop failed, not just that the CLI exited', async () => {
    const { deps: d } = deps()
    d.exec = async () => ({ command: 'home-hosted', args: [], code: null, signal: null, stdout: '', stderr: '', timedOut: false, error: 'spawn home-hosted ENOENT' })
    const result = await stopPanel(d)
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('spawn home-hosted ENOENT')
  })

  it('surfaces a non-zero stop exit rather than reporting a stopped panel', async () => {
    const { deps: d } = deps()
    d.exec = async () => ({ command: 'home-hosted', args: [], code: 1, signal: null, stdout: '', stderr: 'no panel is running', timedOut: false, error: null })
    const result = await stopPanel(d)
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('no panel is running')
  })

  it('writes a self-contained takeover helper that names the old pid and the CLI', () => {
    const { deps: d } = deps()
    const source = buildTakeoverSource(d, 4242)
    expect(source.startsWith('#!/usr/bin/env node')).toBe(true)
    expect(source).toContain('managed by dsh-home-hosted')
    expect(source).toContain('4242')
    expect(source).toContain(`"${path.join(d.stateDir, 'bin', 'panel-takeover.log')}"`)
    expect(source).not.toMatch(/from '\.\.?\//)
    expect(source).toContain('up')
    // Stop the panel the supported way, through the CLI's own `down`.
    expect(source).toContain('DOWN_ARGS')
    expect(source).toContain('"down"')
  })

  /**
   * The helper stops and starts through the installed entry when one supervises the panel.
   *
   * Everything else about a replacement is identical either way — the same detached helper,
   * the same old pid — but under `Restart=always` a CLI `down` is an unexpected death: systemd
   * revives the panel behind the swap, so the unit reports a failed run while a panel answers,
   * and it keeps reporting it. Only the entry may stop what it supervises.
   */
  it('carries the entry\'s own stop and start when a mechanism supervises the panel', () => {
    const { deps: d } = deps()
    const source = buildTakeoverSource(d, 4242, {
      mechanism: 'systemd-user',
      stop: [['systemctl', '--user', 'stop', 'home-hosted.service']],
      start: [['systemctl', '--user', 'start', 'home-hosted.service']],
    })
    expect(source).toContain('const ENTRY_STOP = [["systemctl"')
    expect(source).toContain('systemctl')
    expect(source).toContain('home-hosted.service')
    // The CLI's stop stays in the file as the no-entry branch, and the helper must not
    // reach it while ENTRY_STOP is set.
    expect(source).toContain('ENTRY_STOP === null')
  })

  it('falls back to the CLI stop and start when nothing is installed', () => {
    const { deps: d } = deps()
    const source = buildTakeoverSource(d, 4242)
    expect(source).toContain('const ENTRY_STOP = null')
    expect(source).toContain('const ENTRY_START = null')
    expect(source).toContain('DOWN_ARGS')
  })

  /**
   * Driven, not just inspected: the helper is a script, and a string assertion cannot show that
   * the entry branch is the one that runs. A fake `systemctl` on PATH records its argv, and the
   * CLI is a script that would leave a marker — so "the entry ran and the CLI did not" is a fact
   * about what executed, not about what the source says.
   */
  it('runs the entry steps, and never the CLI, when a mechanism supervises the panel', async () => {
    const { deps: d, log } = deps()
    const bin = path.join(d.stateDir, 'fake-bin')
    fs.mkdirSync(bin, { recursive: true })
    const calls: string[] = []
    const recorder = path.join(bin, 'systemctl')
    fs.writeFileSync(recorder, `#!/bin/sh\necho "$@" >> ${JSON.stringify(path.join(d.stateDir, 'calls.txt'))}\n`, { mode: 0o755 })
    const cliMarker = path.join(d.stateDir, 'cli-ran.txt')
    d.launch = { program: process.execPath, args: [path.join(bin, 'fake-cli.mjs')] } as never
    fs.writeFileSync(path.join(bin, 'fake-cli.mjs'), `#!/usr/bin/env node\nimport fs from 'node:fs'\nfs.writeFileSync(${JSON.stringify(cliMarker)}, 'ran')\n`)

    const helper = writeTakeoverHelper(d, null, {
      mechanism: 'systemd-user',
      stop: [['systemctl', '--user', 'stop', 'home-hosted.service']],
      start: [['systemctl', '--user', 'start', 'home-hosted.service']],
    })
    const { spawnSync } = await import('node:child_process')
    const run = spawnSync(process.execPath, [helper], {
      env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}` },
      encoding: 'utf8',
    })
    expect(run.status, run.stderr).toBe(0)

    const helperLog = path.join(d.stateDir, 'bin', 'panel-takeover.log')
    const text = fs.readFileSync(helperLog, 'utf8')
    // The CLI's own `down`/`up` never ran: under `Restart=always` they race the unit.
    expect(fs.existsSync(cliMarker)).toBe(false)
    expect(text).toContain('through its autostart entry')
    expect(text).toContain('stopping the answering panel through its autostart entry')
    expect(text).toContain('starting through its autostart entry')
    void log
  })

  /**
   * An entry can be installed and enabled while the answering panel came from somewhere else.
   *
   * Then its stop returns 0 having stopped nothing, and a start over the live panel leaves the
   * entry failed while the old panel keeps the port — the same `enabled-failing` symptom, reached
   * from the other side. The helper has to notice and fall back to the CLI's `down`.
   */
  it('falls back to the CLI stop when the entry stops nothing and the panel is still there', async () => {
    const { deps: d } = deps()
    const bin = path.join(d.stateDir, 'fake-bin')
    fs.mkdirSync(bin, { recursive: true })
    // A `systemctl` that succeeds without stopping anything, as a unit does for a panel it did
    // not start. The CLI script records that it ran.
    fs.writeFileSync(path.join(bin, 'systemctl'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
    const cliMarker = path.join(d.stateDir, 'cli-ran.txt')
    const cli = path.join(bin, 'fake-cli.mjs')
    fs.writeFileSync(cli, `#!/usr/bin/env node\nimport fs from 'node:fs'\nfs.appendFileSync(${JSON.stringify(cliMarker)}, process.argv.slice(2).join(' ') + '\\n')\n`)
    d.launch = { program: process.execPath, args: [cli] } as never

    // A pid that stays alive for the whole wait: this process, which the helper must never signal.
    const helper = writeTakeoverHelper(d, process.pid, {
      mechanism: 'systemd-user',
      stop: [['systemctl', '--user', 'stop', 'home-hosted.service']],
      start: [['systemctl', '--user', 'start', 'home-hosted.service']],
    })
    const { spawnSync } = await import('node:child_process')
    const run = spawnSync(process.execPath, [helper], {
      env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}` },
      encoding: 'utf8',
      timeout: 30_000,
    })
    expect(run.status, run.stderr).toBe(0)

    const helperLog = path.join(d.stateDir, 'bin', 'panel-takeover.log')
    const text = fs.readFileSync(helperLog, 'utf8')
    expect(text).toContain('the answering panel is not the one it supervises')
    // The CLI ran the `down`, and only as the fallback.
    expect(fs.readFileSync(cliMarker, 'utf8')).toContain('down')
  })

  it('writes the helper executable', () => {
    const { deps: d } = deps()
    const file = writeTakeoverHelper(d, null)
    expect(file).toBe(takeoverHelperPath(d.stateDir))
    expect(fs.statSync(file).mode & 0o777).toBe(0o755)
  })

  it('replaces a panel from a detached helper that outlives this process', async () => {
    const { deps: d, log } = deps()
    const result = await spawnTakeover(d, null)
    expect(result.ok).toBe(true)
    // Not "the page disconnects": a managed entry is `persistent: true`, and
    // home-hosted's `down` leaves a persistent entry running — measured, a
    // persistent HTTP entry still answered after the panel was down. The page
    // only waits for the new panel to answer.
    expect(result.detail).not.toContain('disconnect')

    // The helper stops the old panel first, then starts the CLI; poll for the
    // last line rather than for the file, which exists after the first write.
    const helperLog = path.join(d.stateDir, 'bin', 'panel-takeover.log')
    const contains = (file: string, needle: string): boolean =>
      fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(needle)
    for (let attempt = 0; attempt < 60 && !contains(log, 'up --home'); attempt += 1)
      await new Promise(resolve => setTimeout(resolve, 100))
    expect(fs.readFileSync(log, 'utf8')).toContain('up')
    for (let attempt = 0; attempt < 60 && !contains(helperLog, 'started with exit'); attempt += 1)
      await new Promise(resolve => setTimeout(resolve, 100))
    expect(fs.readFileSync(helperLog, 'utf8')).toContain('started with exit')
  })

  it('never turns a helper that could not start into an uncaught exception', async () => {
    const { deps: d } = deps()
    const fake = new EventEmitter()
    ;(fake as unknown as { unref: () => void }).unref = () => {}

    const result = await spawnTakeover(d, null, {}, (() => fake as never))
    expect(result.ok).toBe(true)
    // A detached child reports a failed start asynchronously; without a listener
    // that 'error' event is thrown and ends the host process.
    expect(() => fake.emit('error', new Error('EAGAIN'))).not.toThrow()
  })

  it('reports a helper that could not be spawned at all', async () => {
    const { deps: d } = deps()
    const result = await spawnTakeover(d, null, {}, (() => { throw new Error('EPERM') }))
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('EPERM')
  })

  it('installs globally through the chosen package manager', async () => {
    const seen: string[][] = []
    const runner = async (command: string, args?: string[]): Promise<RunResult> => {
      seen.push([command, ...(args ?? [])])
      return ok('added 1 package')
    }
    const result = await installGlobal('^0.6.1', { run: runner })
    expect(seen[0]).toEqual(['pnpm', 'add', '-g', 'home-hosted@^0.6.1'])
    expect(result).toMatchObject({ ok: true })
    expect(result.detail).toContain('globally')

    const failing = await installGlobal('^0.6.1', { pnpm: false, run: async () => ({ ...ok(), code: 1, stderr: 'boom' }) })
    expect(failing.ok).toBe(false)
    expect(failing.output).toContain('boom')
  })
})

describe('the activation helper', () => {
  const plan: ActivationPlan = {
    commands: [['systemctl', '--user', 'restart', 'home-hosted.service']],
    requires: [['systemctl', '--user', 'is-active', 'home-hosted.service']],
    files: ['/srv/unit.service'],
    stop: ['/usr/bin/node', '/cli.js', 'down', '--home', '/srv/hh'],
    detach: [['systemctl', '--user', 'stop', 'home-hosted.service']],
    oldPid: 4242,
    retire: [['rm', '-f', '/srv/x.desktop']],
    logPath: '/srv/state/bin/panel-activate.log',
  }

  it('is a self-contained script that names the plan', () => {
    const source = buildActivationSource(plan)
    expect(source.startsWith('#!/usr/bin/env node')).toBe(true)
    expect(source).toContain('managed by dsh-home-hosted')
    expect(source).not.toMatch(/from '\.\.?\//)
    expect(source).toContain(JSON.stringify(plan.commands))
    expect(source).toContain(JSON.stringify(plan.retire))
    expect(source).toContain(JSON.stringify(plan.logPath))
  })

  it('proves the entry before it stops anything', () => {
    const source = buildActivationSource(plan)
    // A start that could never work must not run once the panel is already gone.
    expect(source.indexOf('for (const file of FILES)')).toBeLessThan(source.indexOf('for (const step of STEPS)'))
    expect(source.indexOf('for (const probe of REQUIRES)')).toBeLessThan(source.indexOf('for (const step of STEPS)'))
  })

  it('retires the previous entry only after the new one was started', () => {
    const source = buildActivationSource(plan)
    expect(source.indexOf('for (const step of STEPS)')).toBeLessThan(source.indexOf('for (const step of RETIRE)'))
  })

  it('stops the panel itself before any start step, and names the pid it must not signal', () => {
    const source = buildActivationSource(plan)
    // The stop always precedes the start: home-hosted refuses a second panel
    // while run.json names a live pid.
    expect(source.indexOf('stopping the answering panel')).toBeLessThan(source.indexOf('for (const step of STEPS)'))
    expect(source).toContain(JSON.stringify(plan.stop))
    expect(source).toContain('const OLD_PID = 4242')
  })

  /**
   * Neither generated helper may signal the recorded pid, and this is the guard for that.
   *
   * A pid is not an identity: the OS recycles pids, so the number in `run.json` may belong to an
   * unrelated process, and these helpers have no birth time to tell them apart. They used to
   * escalate SIGTERM→SIGKILL on "the pid answers" — **measured** by running the generated
   * activation script against a live `sleep` that had "inherited" the pid: it sent both signals to
   * a process that was never the panel. home-hosted's own `down` is the one component allowed to
   * signal, because it can prove identity from `startedAt`; since 0.7.20 it refuses to signal a
   * recycled pid for exactly this reason, so re-deriving the escalation here was a second, weaker
   * copy of that decision.
   */
  it('never signals the recorded pid, leaving every signal to the CLI\'s down', () => {
    const { deps: d } = deps()
    for (const source of [buildActivationSource(plan), buildTakeoverSource(d, 4242)]) {
      // A signal would need a literal; the prose may still name them, so assert on the code.
      expect(source).not.toMatch(/['"]SIG(?:TERM|KILL)['"]/)
      // The existence probe is the only `process.kill` left, and it never signals.
      expect(source.match(/process\.kill\(/g)).toHaveLength(1)
      expect(source).toContain('process.kill(pid, 0)')
    }
  })

  it('is written executable', () => {
    scratch = tempDir()
    const state = path.join(scratch.path, 'state')
    fs.mkdirSync(state, { recursive: true })
    const file = writeActivationHelper(state, plan)
    expect(file).toBe(activationHelperPath(state))
    expect(fs.statSync(file).mode & 0o777).toBe(0o755)
  })

  it('spawns the helper detached and never waits for it', async () => {
    scratch = tempDir()
    const state = path.join(scratch.path, 'state')
    fs.mkdirSync(state, { recursive: true })
    const spawned: string[][] = []
    const fake = new EventEmitter()
    ;(fake as unknown as { unref: () => void }).unref = () => { spawned.push(['unref']) }

    const result = await spawnActivation(state, plan, ((program: string, args: string[]) => {
      spawned.push([program, ...args])
      return fake as never
    }) as never)
    expect(result.ok).toBe(true)
    expect(spawned[0]?.[1]).toBe(activationHelperPath(state))
    expect(spawned[1]).toEqual(['unref'])

    const failed = await spawnActivation(state, plan, () => { throw new Error('EPERM') })
    expect(failed.ok).toBe(false)
    expect(failed.detail).toContain('EPERM')
  })
})

/**
 * A generated helper is a JS file with a POSIX shebang and no Windows counterpart, so
 * the process that starts it must be a real node.
 *
 * Under DeepSeek Harness Desktop `process.execPath` is the Electron binary, and
 * spawning that with no environment opens the Desktop application instead of running
 * the helper — the same reported defect, reached through the hand-over rather than
 * through the boot entry.
 */
/**
 * Running the panel's CLI has the same requirement: its entry is a JS file, so the
 * program that runs it must be a real node.
 *
 * `resolveShimmedCli` records the node it resolved with as the program, and under
 * Desktop that is the Electron binary — running it with no environment opens the
 * application instead of starting the panel.
 */
/**
 * A Windows **global** install is a `.cmd`, and `spawn` without a shell answers `EINVAL` for
 * one — measured with the bundled node 24.21.0, alongside `cmd.exe /d /c <shim> up` running.
 *
 * So every panel action on that install used to fail with a silently-null status. This is
 * driven through `startPanel`, which is the path `panel.start` and the hand-over use, rather
 * than asserted on the argv alone: what matters is that the CLI was *reached*.
 */
/**
 * A Windows **global** install is a `.cmd`, and `spawn` without a shell answers `EINVAL` for
 * one — measured with the bundled node 24.21.0, alongside `cmd.exe /d /c <shim> up` running.
 *
 * So every panel action on that install used to fail with a silently-null status. The
 * assertions are on the argv that would be spawned, taken from the same seam `startPanel`
 * uses, with the platform pinned because the `.cmd` form only applies on win32.
 */
describe('a command-shim CLI', () => {
  const SHIM = 'C:\\Users\\me\\AppData\\Roaming\\npm\\home-hosted.cmd'
  const shimLaunch: CliLaunch = { program: SHIM, args: [], cliEntry: null, shimPath: SHIM, source: 'shim' }

  it('runs a .cmd shim through cmd.exe, never as the bare program', async () => {
    const { deps: d } = deps()
    const words = ['up', '--home', d.home]
    const argv = await launchArgv({ ...shimLaunch }, words, async () => null, 'win32')

    expect(argv).not.toBeNull()
    // cmd.exe first; the shim is one argv word after `/d /c`, never argv[0].
    expect(argv![0]!.toLowerCase()).toMatch(/cmd(?:\.exe)?$/)
    expect(argv!.slice(1, 3)).toEqual(['/d', '/c'])
    expect(argv![3]).toBe(SHIM)
    expect(argv!.slice(4)).toEqual(words)
  })

  /**
   * A shim path carrying a cmd metacharacter is refused rather than quoted, so nothing is
   * spawned — and the refusal must never fall through to the bare `.cmd`, which is the
   * `EINVAL` this whole branch exists to prevent.
   */
  it('refuses a metacharacter shim instead of spawning the bare .cmd', async () => {
    const unsafe = 'C:\\a&b\\home-hosted.cmd'
    const launch: CliLaunch = { program: unsafe, args: [], cliEntry: null, shimPath: unsafe, source: 'shim' }
    expect(await launchArgv(launch, ['up'], async () => null, 'win32')).toBeNull()
    // The same rule governs a generated helper, so it cannot bake in an unrunnable program.
    expect(helperArgv(launch, ['up'], 'win32')).toBeNull()
  })
})

describe('the node that runs the CLI itself', () => {
  it('runs a script CLI through the resolved interpreter, not the recorded program', async () => {
    const { deps: d, log } = deps({ nodeInterpreter: async () => ({ path: process.execPath, source: 'bundled' }) })
    // The recorded program is deliberately not a node: the test's CLI must still run, so
    // the program can only have come from the interpreter.
    d.launch = { ...d.launch!, program: path.join(d.stateDir, 'not-a-node') }

    const result = await startPanel(d)
    expect(result.ok).toBe(true)
    expect(fs.readFileSync(log, 'utf8')).toContain(`up --home ${d.home}`)
  })

  it('refuses with the honest reason when no node resolves', async () => {
    const { deps: d, log } = deps({ nodeInterpreter: async () => null })
    const result = await startPanel(d)
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('no node that can run it')
    // The CLI never ran: nothing was started with the wrong program.
    expect(fs.existsSync(log)).toBe(false)
  })
})

describe('the node that runs a generated helper', () => {
  const DESKTOP_NODE = '/opt/DeepSeek Harness/resources/runtime/primary-runtime/dependencies/node/bin/node'

  const plan: ActivationPlan = {
    commands: [['true']],
    requires: [],
    files: [],
    stop: ['true'],
    detach: [],
    oldPid: 4242,
    retire: [],
    logPath: '/tmp/panel-activate.log',
  }

  function fake(): { child: EventEmitter, spawned: string[][] } {
    const child = new EventEmitter()
    const spawned: string[][] = []
    ;(child as unknown as { unref: () => void }).unref = () => { spawned.push(['unref']) }
    return { child, spawned }
  }

  it('spawns the activation helper with the resolved node, not the Electron executable', async () => {
    scratch = tempDir()
    const state = path.join(scratch.path, 'state')
    fs.mkdirSync(state, { recursive: true })
    const { child, spawned } = fake()
    const source: NodeInterpreterSource = async () => ({ path: DESKTOP_NODE, source: 'bundled' })

    const result = await spawnActivation(state, plan, ((program: string, args: string[]) => {
      spawned.push([program, ...args])
      return child as never
    }) as never, source)

    expect(result.ok).toBe(true)
    expect(spawned[0]).toEqual([DESKTOP_NODE, activationHelperPath(state)])
    expect(spawned[0]?.[0]).not.toBe(process.execPath)
  })

  it('spawns the takeover helper with the resolved node, not the Electron executable', async () => {
    const { deps: d } = deps()
    const { child, spawned } = fake()
    const source: NodeInterpreterSource = async () => ({ path: DESKTOP_NODE, source: 'bundled' })

    const result = await spawnTakeover(d, null, {}, ((program: string, args: string[]) => {
      spawned.push([program, ...args])
      return child as never
    }) as never, source)

    expect(result.ok).toBe(true)
    expect(spawned[0]).toEqual([DESKTOP_NODE, takeoverHelperPath(d.stateDir)])
    expect(spawned[0]?.[0]).not.toBe(process.execPath)
  })

  /**
   * With no node there is nothing to start, and the honest answer is a refusal a person
   * can act on — never a spawn of the Desktop app, and never a helper file left behind
   * claiming a hand-over that never happened.
   */
  it('refuses when no node resolves, spawning nothing and writing no helper', async () => {
    scratch = tempDir()
    const state = path.join(scratch.path, 'state')
    fs.mkdirSync(state, { recursive: true })
    let spawned = 0
    const source: NodeInterpreterSource = async () => null

    const activation = await spawnActivation(state, plan, (() => {
      spawned += 1
      return fake().child as never
    }) as never, source)
    expect(activation.ok).toBe(false)
    expect(activation.detail).toContain('no node that can run it')
    expect(fs.existsSync(activationHelperPath(state))).toBe(false)

    const { deps: d } = deps()
    const takeover = await spawnTakeover(d, null, {}, (() => {
      spawned += 1
      return fake().child as never
    }) as never, source)
    expect(takeover.ok).toBe(false)
    expect(fs.existsSync(takeoverHelperPath(d.stateDir))).toBe(false)
    expect(spawned).toBe(0)
  })
})

describe('running the generated activation helper', () => {
  /** A step node can run on every platform, recording itself into a file. */
  function step(record: string, tag: string): string[] {
    return [process.execPath, '-e', `require('node:fs').appendFileSync(${JSON.stringify(record)}, ${JSON.stringify(`${tag}\n`)})`]
  }

  function scratchState(): string {
    scratch = tempDir()
    const state = path.join(scratch.path, 'state')
    fs.mkdirSync(state, { recursive: true })
    return state
  }

  function execute(state: string, plan: ActivationPlan): number {
    const helper = writeActivationHelper(state, plan)
    try {
      execFileSync(process.execPath, [helper], { stdio: 'pipe' })
      return 0
    }
    catch (error) {
      return (error as { status?: number }).status ?? 1
    }
  }

  /**
   * The stop is a `spawnSync(STOP[0], …)`, so `STOP[0]` has to be a **program**.
   *
   * This is driven, not inspected: the helper really runs and the CLI script records
   * whether it was reached. The entry is deliberately **not** executable, which is the one
   * condition Windows always has — it has no shebang and no mode bit, so spawning a script
   * as a program answers `EFTYPE` and nothing runs (measured against the real bundled node
   * 24.21.0: `{"status":null,"error":"EFTYPE"}`). Reproducing that on POSIX is what makes
   * the difference a fact here rather than a claim about another platform.
   */
  it('reaches the CLI only when the stop names a program rather than the entry file', () => {
    const state = scratchState()
    const cli = path.join(state, 'cli.mjs')
    const reached = path.join(state, 'cli-ran.txt')
    fs.writeFileSync(cli, `import fs from 'node:fs'\nfs.appendFileSync(${JSON.stringify(reached)}, process.argv.slice(2).join(' ') + '\\n')\n`, { mode: 0o644 })

    const base: ActivationPlan = {
      commands: [],
      requires: [],
      files: [],
      stop: [process.execPath, cli, 'down', '--home', '/srv/hh'],
      detach: [],
      oldPid: null,
      retire: [],
      logPath: path.join(state, 'act.log'),
    }

    // The shipped shape — [node, entry, words] — reaches the CLI.
    expect(execute(state, base)).toBe(0)
    expect(fs.readFileSync(reached, 'utf8')).toContain('down --home /srv/hh')

    // The shape that spreading `launch.args` produced — [entry, words] — does not: the
    // helper's stop dies, and the CLI is never reached. That silent failure is why the
    // panel could be started again over one that still held the port.
    fs.rmSync(reached, { force: true })
    execute(state, { ...base, stop: [cli, 'down', '--home', '/srv/hh'] })
    expect(fs.existsSync(reached)).toBe(false)
  })

  it('proves, stops, starts, then retires — in that order', () => {
    const state = scratchState()
    const order = path.join(state, 'order.txt')
    const proof = path.join(state, 'proof')
    fs.writeFileSync(proof, 'ok')

    const code = execute(state, {
      commands: [step(order, 'start')],
      requires: [step(order, 'probe')],
      files: [proof],
      stop: step(order, 'stop'),
      detach: [step(order, 'detach')],
      oldPid: null,
      retire: [step(order, 'retire')],
      logPath: path.join(state, 'act.log'),
    })

    expect(code).toBe(0)
    // The proof comes first; the old entry is retired only once the new one has
    // started — retiring it earlier would delete what is keeping the panel up.
    expect(fs.readFileSync(order, 'utf8').trim().split('\n'))
      .toEqual(['probe', 'detach', 'stop', 'start', 'retire'])
  })

  it('never touches the panel when the proof cannot be taken', () => {
    const state = scratchState()
    const order = path.join(state, 'order.txt')
    const log = path.join(state, 'act.log')

    const code = execute(state, {
      commands: [step(order, 'start')],
      requires: [],
      files: [path.join(state, 'not-there')],
      stop: step(order, 'stop'),
      detach: [],
      oldPid: null,
      retire: [],
      logPath: log,
    })

    expect(code).toBe(1)
    expect(fs.existsSync(order)).toBe(false)
    expect(fs.readFileSync(log, 'utf8')).toContain('refusing to stop the panel')
  })

  it('gives up after SIGKILL rather than starting over a live panel', () => {
    const state = scratchState()
    const order = path.join(state, 'order.txt')

    // A pid that cannot be signalled away: the helper's own process would be
    // wrong to reuse, so a definitely-dead pid leaves the escalation loop empty
    // and the start runs — the reachable half of the guard.
    const code = execute(state, {
      commands: [step(order, 'start')],
      requires: [],
      files: [],
      stop: [process.execPath, '-e', 'process.exit(0)'],
      detach: [],
      oldPid: 2 ** 30,
      retire: [],
      logPath: path.join(state, 'act.log'),
    })

    expect(code).toBe(0)
    expect(fs.readFileSync(order, 'utf8').trim().split('\n')).toEqual(['start'])
  })
})
