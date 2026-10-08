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
import type { RunResult } from '../src/util/exec.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

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

  it('writes the helper executable', () => {
    const { deps: d } = deps()
    const file = writeTakeoverHelper(d, null)
    expect(file).toBe(takeoverHelperPath(d.stateDir))
    expect(fs.statSync(file).mode & 0o777).toBe(0o755)
  })

  it('replaces a panel from a detached helper that outlives this process', async () => {
    const { deps: d, log } = deps()
    const result = spawnTakeover(d, null)
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

  it('never turns a helper that could not start into an uncaught exception', () => {
    const { deps: d } = deps()
    const fake = new EventEmitter()
    ;(fake as unknown as { unref: () => void }).unref = () => {}

    const result = spawnTakeover(d, null, (() => fake as never))
    expect(result.ok).toBe(true)
    // A detached child reports a failed start asynchronously; without a listener
    // that 'error' event is thrown and ends the host process.
    expect(() => fake.emit('error', new Error('EAGAIN'))).not.toThrow()
  })

  it('reports a helper that could not be spawned at all', () => {
    const { deps: d } = deps()
    const result = spawnTakeover(d, null, (() => { throw new Error('EPERM') }))
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

  it('spawns the helper detached and never waits for it', () => {
    scratch = tempDir()
    const state = path.join(scratch.path, 'state')
    fs.mkdirSync(state, { recursive: true })
    const spawned: string[][] = []
    const fake = new EventEmitter()
    ;(fake as unknown as { unref: () => void }).unref = () => { spawned.push(['unref']) }

    const result = spawnActivation(state, plan, ((program: string, args: string[]) => {
      spawned.push([program, ...args])
      return fake as never
    }) as never)
    expect(result.ok).toBe(true)
    expect(spawned[0]?.[1]).toBe(activationHelperPath(state))
    expect(spawned[1]).toEqual(['unref'])

    const failed = spawnActivation(state, plan, () => { throw new Error('EPERM') })
    expect(failed.ok).toBe(false)
    expect(failed.detail).toContain('EPERM')
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
