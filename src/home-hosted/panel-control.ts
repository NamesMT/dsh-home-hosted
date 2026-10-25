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
import { repairPanelMigration } from './panel-migrate.js'

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

/**
 * The words a CLI command runs with, aimed at this panel: its state root, and the project relative
 * entry paths resolve against.
 */
function cliArgs(deps: PanelControlDeps, words: string[]): string[] {
  const args = [...(deps.launch?.args ?? []), ...words, '--home', deps.home]
  if (deps.projectDir)
    args.push('--project', deps.projectDir)
  return args
}

/** Run the resolved CLI with this panel's argv; one seam for every command. */
async function runCliArgs(deps: PanelControlDeps, words: string[]): Promise<RunResult> {
  const args = cliArgs(deps, words)
  if (deps.exec !== undefined)
    return await deps.exec(args, deps.env)
  const launch = deps.launch
  if (launch === null)
    return { command: '', args, code: null, signal: null, stdout: '', stderr: 'no home-hosted CLI is available', timedOut: false, error: null }
  return await run(launch.program, args, {
    env: deps.env,
    timeoutMs: deps.timeoutMs ?? 90_000,
  })
}

/**
 * Start the preferred CLI as a detached panel; the CLI itself does the detaching.
 *
 * A failed `up` is asked one question before it is reported: does the panel's own `migrate` say a
 * migration is pending? An upgrade that raised the config schema leaves exactly that — a panel that
 * refuses to start on every attempt, with the only remedy a command this page cannot run — so the
 * repair is applied and the start retried once. The rule is `repairPanelMigration`, shared with the
 * generated launcher, which runs the same at boot with no page open.
 */
export async function startPanel(deps: PanelControlDeps): Promise<PanelControlResult> {
  const result = await runCliArgs(deps, ['up'])
  if (result.code === 0) {
    const match = /https?:\/\/[^\s]+/.exec(result.stdout)
    return { ok: true, detail: 'the panel is answering', url: match?.[0] ?? null }
  }

  const failed = result.stderr.trim() || result.stdout.trim() || `the CLI exited ${String(result.code)}`
  const migration = await repairPanelMigration(words => runCliArgs(deps, words))
  if (migration.failure !== null)
    return { ok: false, detail: `${failed}; the panel config needs a migration and it did not apply: ${migration.failure}` }
  if (migration.note === null)
    return { ok: false, detail: failed }

  // The same `up` that just failed, now on a config the panel can boot.
  const retried = await runCliArgs(deps, ['up'])
  if (retried.code !== 0) {
    const again = retried.stderr.trim() || retried.stdout.trim() || `the CLI exited ${String(retried.code)}`
    return { ok: false, detail: `${migration.note}, but the panel still did not start: ${again}` }
  }
  const match = /https?:\/\/[^\s]+/.exec(retried.stdout)
  return { ok: true, detail: `${migration.note}; the panel is answering`, url: match?.[0] ?? null }
}

/**
 * Stop the panel through its own CLI.
 *
 * The panel supervises servers, and `down` stops those that are not `persistent`.
 * A persistent entry runs under its own nanny, so it survives the panel — and the
 * entry this plugin writes is persistent, so the dsh serving this page is normally
 * not among the stopped. An entry with `autostart` is started again on the next
 * panel start; it is not restarted here.
 */
export async function stopPanel(deps: PanelControlDeps): Promise<PanelControlResult> {
  const result = await runCliArgs(deps, ['down'])
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

export function activationHelperPath(stateDir: string): string {
  return path.join(launcherDir(stateDir), 'panel-activate.mjs')
}

export function activationLogPath(stateDir: string): string {
  return path.join(launcherDir(stateDir), 'panel-activate.log')
}

/**
 * The generated helper that hands the panel to an autostart mechanism.
 *
 * It has to outlive this process for the same reason the takeover helper does:
 * stopping the panel also stops the servers it supervises, and the plugin is
 * usually one of them, so nothing here may wait on the answer.
 *
 * The order is the whole design. `files` and `requires` are proven first, while
 * the panel is still up: a start that could never work must never be attempted
 * after the old panel is already gone. Then the panel is stopped — the CLI's
 * `down`, which is the only stop that also reports whether the pid went — because
 * a start over a *running* panel is refused by home-hosted itself (`run.json`
 * names a live pid). Only then does the start command run, and only after it
 * succeeded are the other mechanisms' entries removed: retiring them any earlier
 * would delete the entry that is currently keeping the panel alive.
 */
export interface ActivationPlan {
  /** Steps that start the panel under the mechanism, in order. */
  commands: string[][]
  /** Proof commands that must exit 0 before the panel is touched. */
  requires: string[][]
  /** Files that must exist before the panel is touched. */
  files: string[]
  /** The CLI's own stop, which also reports whether the panel went. */
  stop: string[]
  /**
   * Steps that stop the panel the *previous* mechanism supervises, run before
   * the CLI's `down`. Without them a switch loses the race: the old entry's own
   * restart policy brings the panel back as soon as `down` returns, before the
   * new entry starts one.
   */
  detach: string[][]
  /** The pid of the panel being replaced; escalation waits on it. */
  oldPid: number | null
  /** Steps that remove the other mechanisms' entries, run after the start. */
  retire: string[][]
  /** The log a person reads when the panel does not come back. */
  logPath: string
}

/** The generated helper's source; exported so a test can inspect it. */
export function buildActivationSource(plan: ActivationPlan, marker = 'managed by dsh-home-hosted'): string {
  return `#!/usr/bin/env node
// ${marker} — starts the panel through its autostart entry; do not edit.
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const STEPS = ${JSON.stringify(plan.commands)}
const REQUIRES = ${JSON.stringify(plan.requires)}
const FILES = ${JSON.stringify(plan.files)}
const STOP = ${JSON.stringify(plan.stop)}
const DETACH = ${JSON.stringify(plan.detach)}
const OLD_PID = ${JSON.stringify(plan.oldPid)}
const RETIRE = ${JSON.stringify(plan.retire)}
const LOG = ${JSON.stringify(plan.logPath)}

function log(line) {
  try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + line + '\\n') } catch {}
}

function fail(line) {
  log(line)
  process.exit(1)
}

function alive(pid) {
  if (typeof pid !== 'number') return false
  // EPERM means the pid exists and is not ours to signal; treating it as gone
  // would skip the escalation and start a second panel over a live one.
  try { process.kill(pid, 0); return true } catch (error) { return error?.code === 'EPERM' }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Everything is proven while the panel is still answering: a start that could
// never work must not be attempted after the old panel is already gone.
for (const file of FILES) {
  if (!fs.existsSync(file))
    fail('refusing to stop the panel: ' + file + ' is not there')
}
for (const probe of REQUIRES) {
  const result = spawnSync(probe[0], probe.slice(1), { stdio: 'ignore' })
  if (result.error || result.status !== 0)
    fail('refusing to stop the panel: ' + probe.join(' ') + ' did not confirm (' + String(result.status ?? result.error) + ')')
}

// A panel the previous mechanism supervises must be stopped through that
// mechanism first: its restart policy would revive it the moment 'down' ends.
for (const step of DETACH) {
  log('detaching from the previous autostart entry: ' + step.join(' '))
  const result = spawnSync(step[0], step.slice(1), { stdio: 'ignore' })
  log('exited ' + String(result.status ?? result.error))
}

// The panel has to be gone before the entry runs: home-hosted refuses to start a
// second panel while run.json names a live pid, so starting over a running one
// leaves the entry failed while the old panel keeps the port.
log('stopping the answering panel: ' + STOP.join(' '))
const stopped = spawnSync(STOP[0], STOP.slice(1), { stdio: 'ignore', timeout: 90000 })
log('down exited ' + String(stopped.status ?? stopped.error))

/**
 * Never signal OLD_PID from here.
 *
 * The CLI's own 'down' is the only thing that may stop the panel, and it already escalates
 * (SIGTERM, then SIGKILL) for a panel it can prove is alive. A pid is not an identity: the OS
 * recycles pids, so the number in run.json may belong to an unrelated process, and this helper
 * has no birth time to tell them apart. Signalling on "the pid answers" is how a takeover
 * SIGTERMs a stranger — measured, before this guard existed.
 *
 * 'down' succeeds on both real cases, so there is usually nothing to wait for: it returns once
 * the panel exited, and since home-hosted 0.7.20 the start below succeeds even when the recorded
 * pid was recycled (its 'up' overwrites a record it cannot prove is live), where earlier releases
 * refused with "already running". The wait is kept for a 'down' that did not report success, and
 * it never signals.
 */
if (stopped.status !== 0 && alive(OLD_PID)) {
  log('down did not report success and the recorded pid is still alive; waiting, and NOT signalling it — it may not be the panel any more')
  for (let i = 0; i < 40 && alive(OLD_PID); i += 1)
    await sleep(250)
  if (alive(OLD_PID))
    log('the recorded pid is still alive after waiting; the start below may be refused')
}

for (const step of STEPS) {
  log('running ' + step.join(' '))
  const result = spawnSync(step[0], step.slice(1), { stdio: 'ignore' })
  log('exited ' + String(result.status ?? result.error))
  if (result.error || result.status !== 0)
    fail(step.join(' ') + ' did not succeed, so the panel is down')
}

// Only now: the entry being removed may be the one that just started the panel,
// and a failure to remove it is logged rather than fatal — the panel is up.
for (const step of RETIRE) {
  log('retiring ' + step.join(' '))
  const result = spawnSync(step[0], step.slice(1), { stdio: 'ignore' })
  log('exited ' + String(result.status ?? result.error))
}

log('the autostart entry was told to start the panel')
`
}

/**
 * How the installed entry changes the panel's state, when one offers both halves.
 *
 * An entry with a restart policy (`Restart=always`, `KeepAlive`) treats the CLI's `down` as an
 * unexpected death and revives the panel seconds later, and a CLI `up` beside an installed entry
 * starts a panel the entry cannot stop — so the unit goes on reporting `enabled-failing` while
 * one answers. Whoever supervises the panel is who may change its state.
 */
export interface TakeoverControl {
  mechanism: string
  /** Steps that stop the panel this entry supervises, in order. */
  stop: string[][]
  /** Steps that start it again, in order. */
  start: string[][]
}

/** The generated helper's source; exported so a test can inspect it. */
export function buildTakeoverSource(deps: PanelControlDeps, oldPid: number | null, control: TakeoverControl | null = null, marker = 'managed by dsh-home-hosted'): string {
  const program = deps.launch?.program ?? process.execPath
  const args = deps.launch === null
    ? []
    : [...deps.launch.args, 'up', '--home', deps.home, ...(deps.projectDir ? ['--project', deps.projectDir] : [])]
  const downArgs = [...(deps.launch?.args ?? []), 'down', '--home', deps.home]
  // The entry's own steps when it has them, the CLI otherwise. `null` is "nothing installed", not
  // "fall back silently": the helper logs which path it took, because the two leave the machine
  // in different states.
  const stopSteps = control === null ? null : control.stop
  const startSteps = control === null ? null : control.start
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
const ENTRY_STOP = ${JSON.stringify(stopSteps)}
const ENTRY_START = ${JSON.stringify(startSteps)}

function log(line) {
  try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + line + '\\n') } catch {}
}

function alive(pid) {
  if (typeof pid !== 'number') return false
  // EPERM means the pid exists and is not ours to signal; treating it as gone
  // would skip the escalation and start a second panel over a live one.
  try { process.kill(pid, 0); return true } catch (error) { return error?.code === 'EPERM' }
}

function runSteps(steps) {
  for (const step of steps) {
    log('running ' + step.join(' '))
    const result = spawnSync(step[0], step.slice(1), { stdio: 'ignore' })
    log('exited ' + String(result.status ?? result.error))
    if (result.error || result.status !== 0)
      return result
  }
  return { status: 0 }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * The stop goes through the entry when one supervises the panel, the CLI otherwise.
 *
 * A CLI 'down' under an entry with 'Restart=always' is a death the entry did not cause, so systemd
 * revives the panel seconds later: the swap races its own mechanism and the unit reports a run
 * that never started the answering process. Only the entry may stop what it supervises.
 */
let stopped = { status: 0 }
if (ENTRY_STOP === null) {
  log('stopping the answering panel through the CLI: ' + PROGRAM + ' ' + DOWN_ARGS.join(' '))
  stopped = spawnSync(PROGRAM, DOWN_ARGS, { env: { ...process.env, ...ENV }, stdio: 'ignore' })
}
else {
  log('stopping the answering panel through its autostart entry')
  stopped = runSteps(ENTRY_STOP)
  // An entry can be installed and enabled while the answering panel came from somewhere else —
  // a hand-run 'up', another supervisor. Its stop then returns 0 having stopped nothing, and
  // starting over a live panel leaves the entry failed while the old one keeps the port. The
  // CLI's 'down' is the only thing that ends a panel no entry supervises.
  let waited = 0
  while (waited < 40 && alive(OLD_PID)) {
    await sleep(250)
    waited += 1
  }
  if (alive(OLD_PID)) {
    log('the entry stopped nothing this helper can see, so the answering panel is not the one it supervises; stopping it through the CLI')
    stopped = spawnSync(PROGRAM, DOWN_ARGS, { env: { ...process.env, ...ENV }, stdio: 'ignore' })
  }
}
log('stop exited ' + String(stopped.status))

/**
 * Never signal OLD_PID from here — see the same guard in the activation helper.
 *
 * The stop is the only thing that may end the panel, and the CLI's own 'down' escalates for a
 * panel it can prove is alive. This helper has no birth time, so "the pid answers" cannot tell
 * the panel from a stranger that inherited the number; signalling on it SIGTERMs an unrelated
 * process. A pid still alive after a successful stop is therefore not the panel.
 */
for (let i = 0; i < 40 && stopped.status !== 0 && alive(OLD_PID); i += 1)
  await sleep(250)

if (stopped.status !== 0 && alive(OLD_PID))
  log('the stop did not report success and the recorded pid is still alive; NOT signalling it — it may not be the panel any more')

/**
 * Start: the entry when there is one, the CLI otherwise.
 *
 * An entry whose stop was just run also starts the panel itself, so the start must be asked of it
 * rather than racing a CLI 'up' against its own restart policy.
 */
let started = { status: 0 }
if (ENTRY_START === null) {
  log('starting through the CLI: ' + PROGRAM + ' ' + ARGS.join(' '))
  started = spawnSync(PROGRAM, ARGS, { env: { ...process.env, ...ENV }, stdio: 'ignore' })
}
else {
  log('starting through its autostart entry')
  started = runSteps(ENTRY_START)
}
log('started with exit ' + String(started.status))
`
}

export function writeTakeoverHelper(deps: PanelControlDeps, oldPid: number | null, control: TakeoverControl | null = null): string {
  const file = takeoverHelperPath(deps.stateDir)
  writeFileAtomic(file, buildTakeoverSource(deps, oldPid, control), 0o755)
  fs.chmodSync(file, 0o755)
  return file
}

export function writeActivationHelper(stateDir: string, plan: ActivationPlan): string {
  const file = activationHelperPath(stateDir)
  writeFileAtomic(file, buildActivationSource(plan), 0o755)
  fs.chmodSync(file, 0o755)
  return file
}

/**
 * Spawn the activation helper detached and return immediately: the panel's
 * shutdown is about to stop this very process when the plugin runs under it, so
 * waiting for the result would lose the answer.
 *
 * The helper is left to it: whatever it does to the panel, the entry it starts
 * is the one that brings the plugin back.
 */
export function spawnActivation(stateDir: string, plan: ActivationPlan, spawnChild: SpawnDetached = spawnDetached): PanelControlResult {
  const helper = writeActivationHelper(stateDir, plan)
  let child: ChildProcess
  try {
    child = spawnChild(process.execPath, [helper])
  }
  catch (error) {
    return { ok: false, detail: `could not start the autostart helper: ${error instanceof Error ? error.message : String(error)}` }
  }
  child.on('error', () => {})
  child.unref()
  return {
    ok: true,
    detail: `starting the panel through its autostart entry now; the page shows it again when it answers`,
  }
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
export interface TakeoverOptions {
  /** The installed entry's own stop and start; null when nothing supervises the panel. */
  control?: TakeoverControl | null
}

export function spawnTakeover(deps: PanelControlDeps, oldPid: number | null, options: TakeoverOptions = {}, spawnChild: SpawnDetached = spawnDetached): PanelControlResult {
  const control = options.control ?? null
  const helper = writeTakeoverHelper(deps, oldPid, control)
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
    detail: control === null
      ? 'replacing the panel now; the page shows the panel again under the preferred copy once it answers'
      : `replacing the panel through its ${control.mechanism} entry now; the page shows it again once it answers`,
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
