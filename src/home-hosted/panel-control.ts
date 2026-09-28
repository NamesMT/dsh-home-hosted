/**
 * Starting, replacing and globally installing the panel.
 *
 * Starting it is the same thing a person does by hand: run the CLI's `up`, which
 * re-spawns itself detached, writes `run.json` and returns once the panel
 * answers. Replacing a panel *is* different — stopping the one that is answering
 * also stops the servers it supervises, including the dsh this plugin runs in —
 * so the replacement is done by a detached helper that outlives this process.
 */
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { PanelControlResult } from '../shared/contracts.js'
import { run } from '../util/exec.js'
import type { RunResult } from '../util/exec.js'
import { writeFileAtomic } from '../util/fsx.js'
import type { CliLaunch } from './launch.js'
import { launcherDir } from './launcher.js'

/** How the panel's CLI is run: the resolved argv plus an environment. */
export type PanelCliExec = (args: string[], env: Record<string, string | undefined>) => Promise<RunResult>

export interface PanelControlDeps {
  /** The CLI to run, already resolved. */
  launch: CliLaunch | null
  home: string
  projectDir?: string | null
  stateDir: string
  /** Environment for the spawned CLI (absolute PATH, HOME, HHOSTED_HOME). */
  env: Record<string, string>
  timeoutMs?: number
  /** Test seam: run the resolved CLI without spawning it. */
  exec?: PanelCliExec
}

function cliArgs(deps: PanelControlDeps, command: 'up' | 'down' | 'restart'): string[] {
  const args = [...(deps.launch?.args ?? []), command, '--home', deps.home]
  if (deps.projectDir)
    args.push('--project', deps.projectDir)
  return args
}

async function runCli(deps: PanelControlDeps, command: 'up' | 'down' | 'restart'): Promise<{ code: number | null, stdout: string, stderr: string, error: string | null }> {
  const args = cliArgs(deps, command)
  if (deps.exec !== undefined)
    return await deps.exec(args, deps.env)
  const launch = deps.launch
  if (launch === null)
    return { code: null, stdout: '', stderr: 'no home-hosted CLI is available', error: null }
  return await run(launch.program, args, {
    env: deps.env,
    timeoutMs: deps.timeoutMs ?? 90_000,
  })
}

/** Start the preferred CLI as a detached panel; the CLI itself does the detaching. */
export async function startPanel(deps: PanelControlDeps): Promise<PanelControlResult> {
  const result = await runCli(deps, 'up')
  if (result.code !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `the CLI exited ${String(result.code)}`
    return { ok: false, detail }
  }
  const match = /https?:\/\/[^\s]+/.exec(result.stdout)
  return { ok: true, detail: 'the panel is answering', url: match?.[0] ?? null }
}

/**
 * Stop the panel through its own CLI.
 *
 * The panel is the parent of every server it supervises, so this stops those
 * too — including the dsh this plugin may be running in. That is the point of
 * the button, not a hazard to hide: the caller's UI says so. An entry with
 * `autostart` is started again on the next panel start; it is not restarted here.
 */
export async function stopPanel(deps: PanelControlDeps): Promise<PanelControlResult> {
  const result = await runCli(deps, 'down')
  if (result.code !== 0) {
    const detail = result.error ?? (result.stderr.trim() || result.stdout.trim() || `the CLI exited ${String(result.code)}`)
    return { ok: false, detail: `the panel did not stop: ${detail}` }
  }
  return { ok: true, detail: 'the panel stopped; the servers it supervised stopped with it' }
}

export function takeoverHelperPath(stateDir: string): string {
  return path.join(launcherDir(stateDir), 'panel-takeover.mjs')
}

export function takeoverLogPath(stateDir: string): string {
  return path.join(launcherDir(stateDir), 'panel-takeover.log')
}

/** The generated helper's source; exported so a test can inspect it. */
export function buildTakeoverSource(deps: PanelControlDeps, oldPid: number | null, marker = 'managed by dsh-home-hosted'): string {
  const program = deps.launch?.program ?? process.execPath
  const args = deps.launch === null
    ? []
    : [...deps.launch.args, 'up', '--home', deps.home, ...(deps.projectDir ? ['--project', deps.projectDir] : [])]
  const downArgs = [...(deps.launch?.args ?? []), 'down', '--home', deps.home]
  return `#!/usr/bin/env node
// ${marker} — replaces the panel; do not edit.
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const OLD_PID = ${JSON.stringify(oldPid)}
const DOWN_ARGS = ${JSON.stringify(downArgs)}
const PROGRAM = ${JSON.stringify(program)}
const ARGS = ${JSON.stringify(args)}
const ENV = ${JSON.stringify(deps.env)}
const LOG = ${JSON.stringify(takeoverLogPath(deps.stateDir))}

function log(line) {
  try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + line + '\\n') } catch {}
}

function alive(pid) {
  if (typeof pid !== 'number') return false
  try { process.kill(pid, 0); return true } catch { return false }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

log('stopping the answering panel: ' + PROGRAM + ' ' + DOWN_ARGS.join(' '))
const down = spawnSync(PROGRAM, DOWN_ARGS, { env: { ...process.env, ...ENV }, stdio: 'ignore' })
log('down exited ' + String(down.status))

for (let i = 0; i < 40 && alive(OLD_PID); i += 1)
  await sleep(250)

if (alive(OLD_PID)) {
  log('still alive; sending SIGTERM')
  try { process.kill(OLD_PID, 'SIGTERM') } catch {}
  for (let i = 0; i < 40 && alive(OLD_PID); i += 1)
    await sleep(250)
}

if (alive(OLD_PID)) {
  log('still alive; sending SIGKILL')
  try { process.kill(OLD_PID, 'SIGKILL') } catch {}
  for (let i = 0; i < 20 && alive(OLD_PID); i += 1)
    await sleep(250)
}

log('starting ' + PROGRAM + ' ' + ARGS.join(' '))
const result = spawnSync(PROGRAM, ARGS, { env: { ...process.env, ...ENV }, stdio: 'ignore' })
log('started with exit ' + String(result.status))
`
}

export function writeTakeoverHelper(deps: PanelControlDeps, oldPid: number | null): string {
  const file = takeoverHelperPath(deps.stateDir)
  writeFileAtomic(file, buildTakeoverSource(deps, oldPid), 0o755)
  fs.chmodSync(file, 0o755)
  return file
}

/** Spawn a helper process; injected so a test can drive the failure paths. */
export type SpawnDetached = (program: string, args: string[]) => ChildProcess

function spawnDetached(program: string, args: string[]): ChildProcess {
  return spawn(program, args, { detached: true, stdio: 'ignore' })
}

/**
 * Spawn the helper detached and return immediately: the old panel's shutdown is
 * about to stop this very process, so waiting for the result would lose it.
 */
export function spawnTakeover(deps: PanelControlDeps, oldPid: number | null, spawnChild: SpawnDetached = spawnDetached): PanelControlResult {
  const helper = writeTakeoverHelper(deps, oldPid)
  let child: ChildProcess
  try {
    child = spawnChild(process.execPath, [helper])
  }
  catch (error) {
    return { ok: false, detail: `could not start the panel-replacement helper: ${error instanceof Error ? error.message : String(error)}` }
  }
  // A detached child reports a failed start asynchronously; an unhandled 'error'
  // event is thrown, and that would end this process instead of the helper's.
  child.on('error', () => {})
  child.unref()
  return {
    ok: true,
    detail: 'replacing the panel now; this page will disconnect and come back under the preferred copy',
  }
}

/** Install the pinned range globally, so the `global` preference has something to use. */
export async function installGlobal(
  range: string,
  options: { pnpm?: boolean, run?: typeof run } = {},
): Promise<{ ok: boolean, detail: string, output: string }> {
  const execute = options.run ?? run
  const usePnpm = options.pnpm ?? true
  const result = usePnpm
    ? await execute('pnpm', ['add', '-g', `home-hosted@${range}`], { timeoutMs: 300_000 })
    : await execute('npm', ['install', '-g', `home-hosted@${range}`], { timeoutMs: 300_000 })
  const output = `${result.stdout}\n${result.stderr}`.trim()
  if (result.code !== 0)
    return { ok: false, detail: result.error ?? `the installer exited ${String(result.code)}`, output }
  return { ok: true, detail: `installed home-hosted@${range} globally`, output }
}
