import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it } from 'vitest'
import type { CliLaunch } from '../src/home-hosted/launch.js'
import {
  buildTakeoverSource,
  installGlobal,
  spawnTakeover,
  startPanel,
  takeoverHelperPath,
  writeTakeoverHelper,
} from '../src/home-hosted/panel-control.js'
import type { PanelControlDeps } from '../src/home-hosted/panel-control.js'
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

  it('writes a self-contained takeover helper that names the old pid and the CLI', () => {
    const { deps: d } = deps()
    const source = buildTakeoverSource(d, 4242)
    expect(source.startsWith('#!/usr/bin/env node')).toBe(true)
    expect(source).toContain('managed by dsh-home-hosted')
    expect(source).toContain('4242')
    expect(source).toContain(`"${path.join(d.stateDir, 'bin', 'panel-takeover.log')}"`)
    expect(source).not.toMatch(/from '\.\.?\//)
    expect(source).toContain('up')
    // Stop the panel the supported way first, then escalate.
    expect(source).toContain('DOWN_ARGS')
    expect(source).toContain('"down"')
    expect(source.indexOf('SIGTERM')).toBeLessThan(source.indexOf('SIGKILL'))
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
    expect(result.detail).toContain('disconnect')

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
