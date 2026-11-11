/**
 * Which real node runs a JavaScript file.
 *
 * `process.execPath` is the node interpreter in every ordinary install — a POSIX
 * service and a plain `node` both run this plugin — so the answer there is this
 * process's own executable and nothing about an existing spec changes. DSH Desktop
 * breaks that assumption: the plugin runs inside Electron, where `process.execPath`
 * is `…\DeepSeek Harness\DeepSeek Harness.exe`. Electron behaves as node only with
 * `ELECTRON_RUN_AS_NODE=1` in its environment, and a Windows autostart entry has
 * nowhere to put one — a Task Scheduler `<Exec>` action and an `HKCU\…\Run` value
 * carry a command line and no environment — so an entry whose command is
 * `process.execPath` starts the Desktop application instead of the panel.
 *
 * Desktop does ship a real standalone node under its resources directory, and PATH
 * is the last resort — not a dependable one, since nothing here has `node` on the
 * Windows PATH. Either way a candidate is **proved** by running it: a file that
 * exists is not a program that runs, and Desktop's `runtime\bin\node.cmd` is exactly
 * the trap — a shim that works only with an environment no entry supplies.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { run } from '../util/exec.js'
import type { CliLaunch } from './launch.js'
import { parseVersion, which } from './launch.js'

/** Where Desktop keeps a standalone node, relative to Electron's `process.resourcesPath`. */
const BUNDLED_NODE_DIRS = ['runtime', 'primary-runtime', 'dependencies', 'node', 'bin'] as const

/** Long enough for a cold `node.exe`, short enough that a status read is not stalled by it. */
const PROBE_TIMEOUT_MS = 5000

/** A *failed* resolution is remembered this long, so installing a node takes effect on its own. */
const FAILURE_TTL_MS = 60_000

/** How a program that runs a JS file was found. */
export type NodeInterpreterSourceKind = 'execPath' | 'bundled' | 'path'

export interface NodeInterpreter {
  /** Absolute path to a program that runs a JavaScript file. */
  path: string
  /**
   * `execPath` — this process already is node; `bundled` — the standalone node inside
   * Desktop's resources; `path` — a `node` found on PATH.
   */
  source: NodeInterpreterSourceKind
}

/** Resolves the interpreter; the seam a caller takes so a test can pin the answer. */
export type NodeInterpreterSource = () => Promise<NodeInterpreter | null>

/**
 * The seams the resolution reads.
 *
 * Every default describes this process; a test pins them instead of installing
 * Electron, and `probe`/`findOnPath`/`exists` stand in for the machine so a test
 * never runs a stranger's binary.
 */
export interface NodeInterpreterDeps {
  platform?: NodeJS.Platform
  /** Defaults to `process.execPath`. */
  execPath?: string
  /** Electron's `process.resourcesPath`; absent in plain node. */
  resourcesPath?: string | null
  /** Electron's `process.versions.electron`; absent in plain node. */
  electron?: string | null
  /** Defaults to `fs.existsSync`. */
  exists?: (file: string) => boolean
  /** Proves a candidate runs a JS file; the default asks it for `--version`. */
  probe?: (file: string) => Promise<boolean>
  /** Finds a command on PATH; defaults to `which`. */
  findOnPath?: (command: string) => Promise<string | null>
}

/**
 * What a caller says when no interpreter resolves.
 *
 * Every clause describes the situation rather than one machine: the CLI *was* found,
 * an entry cannot carry an environment, and both candidates were asked. It must never
 * read as "no home-hosted CLI is available" — that is a different failure with a
 * different remedy, and here the CLI may be perfectly fine.
 */
export const NO_INTERPRETER_DETAIL = 'the home-hosted CLI was found, but no node that can run it was: this process is the DeepSeek Harness Desktop application, an autostart entry carries no environment so the entry cannot be told to behave as node, and neither the node bundled with Desktop nor a `node` on PATH answered. Install Node, or run dsh under plain node'

/** Electron's `process.resourcesPath`; not in `@types/node`, which has no Electron. */
function processResourcesPath(): string | null {
  const value = (process as unknown as { resourcesPath?: unknown }).resourcesPath
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** `--version` prints a parseable version; that, and a zero exit, is the whole proof. */
async function runVersion(file: string): Promise<boolean> {
  const result = await run(file, ['--version'], { timeoutMs: PROBE_TIMEOUT_MS })
  // The exit code is part of the proof: a shim that prints something node-like and then
  // fails is not a node that will run the panel. Both streams, because which one carries
  // a version belongs to the program rather than to us.
  if (result.code !== 0)
    return false
  return parseVersion(result.stdout) !== null || parseVersion(result.stderr) !== null
}

/**
 * The node that runs a JS file here, in order of authority.
 *
 * 1. **this process's own executable**, while it really is node — the ordinary case,
 *    and the one that must stay byte-identical: nothing is asked of the machine;
 * 2. **Desktop's bundled runtime node**, under `process.resourcesPath`, while it exists
 *    *and* answers `--version`;
 * 3. **a `node` on PATH**, proved the same way — `which`/`where` reports what a shell
 *    would run, and on Windows that can be a `.cmd` needing an environment, which the
 *    probe refuses;
 * 4. **null**, so a caller reports the failure instead of writing a broken entry.
 */
export async function resolveNodeInterpreter(deps: NodeInterpreterDeps = {}): Promise<NodeInterpreter | null> {
  const platform = deps.platform ?? process.platform
  const execPath = deps.execPath ?? process.execPath
  const electron = deps.electron === undefined
    ? (process.versions.electron as string | undefined)
    : deps.electron

  // 1. Not Electron: this process is the interpreter, so existing specs keep their exact
  // bytes and no subprocess is run to find out.
  if (electron === null || electron === undefined || electron.length === 0)
    return { path: execPath, source: 'execPath' }

  const resourcesPath = deps.resourcesPath === undefined ? processResourcesPath() : deps.resourcesPath
  const exists = deps.exists ?? fs.existsSync
  const probe = deps.probe ?? runVersion

  // 2. Desktop's own standalone node, beside the Electron binary rather than inside it.
  if (typeof resourcesPath === 'string' && resourcesPath.length > 0) {
    const bundled = path.join(resourcesPath, ...BUNDLED_NODE_DIRS, platform === 'win32' ? 'node.exe' : 'node')
    if (exists(bundled) && await probe(bundled))
      return { path: bundled, source: 'bundled' }
  }

  // 3. A node on PATH, proved rather than trusted.
  const found = await (deps.findOnPath ?? which)('node')
  if (found !== null && await probe(found))
    return { path: found, source: 'path' }

  return null
}

/**
 * Whether this launch runs a JS file, and so needs a real node as its program.
 *
 * The interface's own definition is the fact: `args` are "args that must precede the command,
 * e.g. the CLI entry path", so a launch carrying any names a script for the program to run,
 * and a shim or executable carries none. That is the same rule `resolveShimmedCli` writes, and
 * taking it from the contract rather than from the file extension keeps a `source`-agnostic
 * caller correct. `cliEntry` is the secondary evidence, for a launch built elsewhere.
 */
export function launchRunsScript(launch: Pick<CliLaunch, 'args' | 'cliEntry'> | null): boolean {
  if (launch === null)
    return false
  return launch.args.length > 0 || launch.cliEntry !== null
}

/**
 * What to do about a program that might be a Windows command shim.
 *
 * Three outcomes, deliberately distinct. Collapsing them into one `null` is how this went
 * wrong once already: "not a shim, use it directly" and "a shim that must not be run" look
 * the same to a `??` chain, and the fallthrough hands back the bare `.cmd` — the exact
 * blocker. `refused` must never fall through to anything.
 */
export type CmdShimPlan =
  /** Run this argv; `argv[0]` is `cmd.exe`. */
  | { kind: 'argv', argv: string[] }
  /** A `.cmd`/`.bat` that cannot be run safely (a cmd metacharacter, or not on Windows). */
  | { kind: 'refused', reason: string }
  /** Not a command shim at all, so the caller supplies the program itself. */
  | { kind: 'none' }

/** Characters `cmd.exe` treats as syntax even inside an argv word. */
const CMD_METACHARACTER = /[&|<>^%]/

/**
 * How to run a program that may be a Windows `.cmd`/`.bat` shim.
 *
 * A `.cmd` is not an executable image, so `spawn` without a shell answers `EINVAL` — measured
 * with the bundled node 24.21.0: `spawnSync('…\\home-hosted.cmd', ['up'], {stdio:'pipe'})`
 * → `{"error":"EINVAL"}`, while `cmd.exe /d /c <shim> up` runs. An npm or pnpm **global**
 * install on Windows is exactly that `.cmd`, so every panel action silently failed there.
 *
 * The form is `cmd /d /c <shim> <words>` **with the shim as its own argv word**. This is the one
 * copy of that rule: the version probe is a launch too, so it goes through {@link launchArgv}
 * rather than keeping a second implementation. The `/d /s /c "<line>"` single-line forms fail as soon
 * as the path contains a space (`…\Program Files (x86)\…`), while this form handles spaces,
 * parentheses and `%`, because `run()` passes each word separately and `cmd.exe` does its own
 * quoting. A path carrying a cmd metacharacter is **refused** rather than quoted: guessing that
 * quoting is how a value becomes a command. `ComSpec` names the interpreter, so a machine that
 * moved it is still right.
 *
 * Pure apart from the `platform` default, so both callers and the tests can pin every branch.
 */
export function cmdShimArgv(program: string, words: string[], platform: NodeJS.Platform = process.platform): CmdShimPlan {
  if (!/\.(?:cmd|bat)$/i.test(program))
    return { kind: 'none' }
  // A `.cmd` on a platform that cannot run one is not "use it directly" — it is unrunnable.
  if (platform !== 'win32')
    return { kind: 'refused', reason: `${program} is a Windows command shim, which ${platform} cannot run` }
  if (CMD_METACHARACTER.test(program))
    return { kind: 'refused', reason: `${program} carries a cmd.exe metacharacter, so it cannot be passed to cmd.exe safely` }
  return { kind: 'argv', argv: [process.env.ComSpec ?? 'cmd.exe', '/d', '/c', program, ...words] }
}

/**
 * This launch as a complete argv a `spawn` without a shell can run: `[program, ...words]`.
 *
 * One rule, in one place, for every way this plugin starts the CLI — the panel's own start and
 * stop, every direct CLI command, the UI subcommands, and the hand-over helper's stop. Three
 * things can be the program, and only the first is obvious:
 *
 * - a **script** entry: a real node, then the entry file, because `launch.args[0]` is the entry
 *   and not a program. Spreading those args produced `[entry.mjs, 'down', …]`, which runs on
 *   POSIX only by its shebang and mode bit and on Windows not at all (`EFTYPE`, measured);
 * - a `.cmd`/`.bat` **shim**: `cmd.exe /d /c <shim> <words>`, never the shim itself (`EINVAL`,
 *   measured) — {@link cmdShimArgv};
 * - anything else (a real executable, a POSIX shim): itself, with the words after it.
 *
 * Null means this cannot be run at all — no node for a script, or a `.cmd` that cannot be run —
 * so a caller refuses instead of spawning something that fails silently with a null status.
 */
export async function launchArgv(
  launch: CliLaunch,
  words: string[],
  source: NodeInterpreterSource = nodeInterpreter,
  platform: NodeJS.Platform = process.platform,
): Promise<string[] | null> {
  const shim = cmdShimArgv(launch.program, words, platform)
  // A refusal is never allowed to fall through to `[launch.program, …]`: that is the bare
  // `.cmd`, and spawning it is the blocker this branch exists to prevent.
  if (shim.kind === 'refused')
    return null
  if (shim.kind === 'argv')
    return shim.argv
  if (launchRunsScript(launch)) {
    const interpreter = await source()
    return interpreter === null ? null : [interpreter.path, ...launch.args, ...words]
  }
  return [launch.program, ...words]
}

/**
 * The argv a generated helper carries for the CLI, as a literal program plus args.
 *
 * A generated helper is already running under a real node, so a script entry's program inside
 * it is `process.execPath` — correct *there*, and wrong in the plugin, where that value is the
 * Electron binary under Desktop. A `.cmd` shim still needs `cmd.exe`, so it goes through the
 * same {@link cmdShimArgv} instead of being baked in as a program the helper cannot spawn.
 *
 * `program` may be a JS expression (`process.execPath`) rather than a literal; the caller
 * serialises it, because that is a property of the helper's source rather than of this argv.
 */
export function helperArgv(
  launch: CliLaunch,
  words: string[],
  platform: NodeJS.Platform = process.platform,
): { program: string, args: string[] } | null {
  const shim = cmdShimArgv(launch.program, words, platform)
  if (shim.kind === 'refused')
    return null
  if (shim.kind === 'argv')
    return { program: shim.argv[0] ?? 'cmd.exe', args: shim.argv.slice(1) }
  if (launchRunsScript(launch)) {
    // `process.execPath` *inside* the helper is a real node; no resolution is needed here, and
    // asking for one would be answering a question this call does not have.
    return { program: 'process.execPath', args: [...launch.args, ...words] }
  }
  return { program: launch.program, args: words }
}

let cached: { at: number, value: NodeInterpreter | null } | null = null

/**
 * The interpreter for this process, resolved once.
 *
 * Every boot spec and every generated helper asks the same question, and proving an
 * answer costs a subprocess, so a success is kept for the life of the process. A
 * *failure* is kept only briefly: the remedy is to install Node, and a negative answer
 * remembered forever would keep reporting a machine that had since been fixed. The
 * window matches the CLI resolution's cache, so a page poll does not pay for the probe.
 */
export async function nodeInterpreter(): Promise<NodeInterpreter | null> {
  const now = Date.now()
  if (cached !== null && (cached.value !== null || now - cached.at < FAILURE_TTL_MS))
    return cached.value
  const value = await resolveNodeInterpreter()
  cached = { at: now, value }
  return value
}

/** Forget the cached answer; a test that pins the process seams calls this first. */
export function forgetNodeInterpreter(): void {
  cached = null
}
