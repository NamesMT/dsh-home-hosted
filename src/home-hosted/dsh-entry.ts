/**
 * The server entry that represents the running harness.
 *
 * An existing entry is never rewritten: this plugin only owns `autostart`,
 * `onPortConflict` and `stop.killPortHolders`. A generated entry (only used when
 * there is none) mirrors how this process was actually launched where that is
 * knowable, and otherwise falls back to the `dsh web` app arguments.
 *
 * The generated entry binds loopback only: `dsh` refuses `--host 0.0.0.0`, so a
 * running harness configured to bind the network cannot boot through an entry
 * that repeats its host.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { ServerEntry } from '../shared/contracts.js'
import { readJson } from '../util/fsx.js'
import { dshHome as resolveDshHome, pluginStateDir } from '../util/paths.js'
import type { CliLaunch } from './launch.js'
import { resolveShimmedCli, which } from './launch.js'
import { compareVersions } from './resolve.js'
import { dshCandidatesUnder, dshLauncherPath, dshSearchRoot, readDshLauncherRecord, writeDshLauncher } from './launcher.js'

/**
 * Which profile this process is running.
 *
 * `DSH_PROFILE` alone is not trustworthy: it can be inherited from a parent
 * shell that ran a different profile (that is how an entry once ended up booting
 * `web` under another profile's home). The process's own argv is authoritative,
 * then the profile directory the launcher pointed at, then the env var.
 */
export function detectProfile(argv: readonly string[], env: Record<string, string | undefined> = {}): string {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile' && typeof argv[index + 1] === 'string' && !argv[index + 1]!.startsWith('-'))
      return argv[index + 1]!
    if (arg?.startsWith('--profile='))
      return arg.slice('--profile='.length)
  }

  const dir = env.DSH_PROFILE_DIR
  if (typeof dir === 'string' && dir.length > 0) {
    const base = path.basename(dir)
    if (base.length > 0 && base !== '.' && base !== path.sep)
      return base
  }

  const app = argv.slice(2).find(candidate => candidate !== undefined && !candidate.startsWith('-'))
  if (app !== undefined && app.length > 0)
    return app

  const fromEnv = env.DSH_PROFILE
  return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : 'web'
}

export interface DshFacts {
  id: string
  port: number | null
  profile: string | null
  dshHome: string
  /** The project this row belongs to; defaults to this process's cwd. */
  projectDir?: string | null
  launch: CliLaunch | null
  /**
   * The stable launcher a local/clone entry must boot through, when one exists.
   * Null keeps the older shape: the resolved program and its own argv.
   */
  launcherPath?: string | null
}

export interface DshLaunch extends CliLaunch {
  /** The stable launcher written for this launch, or null for `dsh` on PATH. */
  launcherPath: string | null
}

export interface ResolveDshLaunchOptions {
  /** The plugin state dir the launcher is written into; defaults to `$DSH_HOME/dsh-home-hosted`. */
  stateDir?: string
  /** The harness home the resolver records as the launcher's search root. */
  dshHome?: string
  /** Test seam: what this process was launched as; defaults to `process.argv[1]`. */
  argv1?: string | null
  /** Test seam: locate a command on PATH. */
  findOnPath?: (command: string) => Promise<string | null>
  /** The project whose own dsh dependency should win; defaults to this process's cwd. */
  projectDir?: string | null
}

/** The nearest package.json's version, for ordering clone candidates. */
function versionOf(entry: string): string | null {
  let dir = path.dirname(entry)
  for (let hop = 0; hop < 4; hop += 1) {
    const manifest = readJson<{ version?: string }>(path.join(dir, 'package.json'))
    if (typeof manifest?.version === 'string')
      return manifest.version
    dir = path.dirname(dir)
  }
  return null
}

function isEntry(file: string): boolean {
  return /\.[cm]?js$/.test(file) && fs.existsSync(file) && !fs.statSync(file).isDirectory()
}

/** The resolved target behind a shim or symlink; the path itself when that fails. */
function realPath(file: string): string {
  try {
    return fs.realpathSync(file)
  }
  catch {
    return file
  }
}

/**
 * A local clone's built entry, reconstructed from where a clone keeps its build.
 *
 * A clone installs dsh in its own tree, so `argv[1]` names a *build output*
 * (`lib/bin.js` inside `node_modules`, and after a rebuild a different one): the
 * install root is derived from it and every known build location is checked, so a
 * rebuild does not require a new boot entry.
 */
export function cloneEntryFrom(argv1: string): string | null {
  if (!isEntry(argv1))
    return null
  const root = path.dirname(path.dirname(argv1))
  for (const candidate of [
    path.join(root, 'lib', 'bin.js'),
    path.join(root, 'lib', 'bin.mjs'),
    path.join(root, 'lib', 'bin.cjs'),
    path.join(root, 'dist', 'bin.js'),
    path.join(root, 'bin', 'dsh.js'),
    path.join(root, 'bin', 'dsh.mjs'),
  ]) {
    if (isEntry(candidate))
      return candidate
  }
  return argv1
}

/**
 * The entry this process runs, however it was launched.
 *
 * `argv[1]` is directly the built entry for a clone or an installed copy. When
 * it is instead a package-manager shim (`.bin/dsh`), the shim's own recorded
 * target names the real entry, which is the path a boot entry must carry.
 */
function launchedEntry(argv1: string): string | null {
  const real = realPath(argv1)
  const direct = cloneEntryFrom(real)
  if (direct !== null)
    return direct
  const shimmed = resolveShimmedCli(real, process.execPath)
  return shimmed?.cliEntry == null ? null : cloneEntryFrom(shimmed.cliEntry)
}

/** The best dsh entry installed under a harness home, flat or pnpm. */
export function findDshEntry(dshHome: string): string | null {
  const found: string[] = []
  found.push(...dshCandidatesUnder(dshHome))
  for (const name of readdirNames(path.join(dshHome, 'profiles')))
    found.push(...dshCandidatesUnder(path.join(dshHome, 'profiles', name)))
  const withVersion = found.map(entry => ({ entry, version: versionOf(entry) }))
  withVersion.sort((a, b) => compareVersions(b.version ?? '0.0.0', a.version ?? '0.0.0'))
  return withVersion[0]?.entry ?? null
}

function readdirNames(dir: string): string[] {
  try {
    return fs.readdirSync(dir)
  }
  catch {
    return []
  }
}

/**
 * The dsh a project declares as its own dependency.
 *
 * A project that depends on dsh has already decided which dsh belongs to it, and
 * running the global one there is how a build shares a data directory with a
 * version it was not made for. Resolution stays inside the project: the
 * package-manager shim it wrote, then the package layouts every manager
 * produces, then the pnpm store.
 *
 * Nothing here shells out to `npx`/`pnpm`: a boot entry must not need one of
 * them on PATH, must never fall back to downloading from the registry, and
 * `node_modules` is the contract npm, pnpm, yarn (node-modules linker) and bun
 * all keep.
 */
export function projectDshEntry(dir: string, depth = 4): string | null {
  let current = resolveDir(dir)
  for (let hop = 0; hop <= depth; hop += 1) {
    const shim = path.join(current, 'node_modules', '.bin', 'dsh')
    const shimmed = resolveShimmedCli(shim, process.execPath)
    if (shimmed?.cliEntry != null && isEntry(shimmed.cliEntry))
      return shimmed.cliEntry
    const found = dshCandidatesUnder(current)
      .map(entry => ({ entry, version: versionOf(entry) }))
      .sort((a, b) => compareVersions(b.version ?? '0.0.0', a.version ?? '0.0.0'))
    if (found[0] !== undefined)
      return found[0].entry
    const parent = path.dirname(current)
    if (parent === current)
      break
    current = parent
  }
  return null
}

function resolveDir(dir: string): string {
  try {
    return fs.realpathSync(dir)
  }
  catch {
    return path.resolve(dir)
  }
}

/**
 * Where the running harness's own CLI entry is.
 *
 * A local clone's build path is not stable enough to bake into a boot entry, so
 * the clone case records the entry in a generated launcher and returns that
 * launcher's path; the launcher re-finds dsh at boot. A plain `dsh` on PATH is
 * already resolved to a stable entry and keeps its current shape.
 */
export async function resolveDshLaunch(options: ResolveDshLaunchOptions = {}): Promise<DshLaunch | null> {
  const argv1 = options.argv1 === undefined ? process.argv[1] : options.argv1
  const dshHome = options.dshHome ?? resolveDshHome()
  const stateDir = options.stateDir ?? pluginStateDir()

  // A project that declares its own dsh keeps it: whoever started this process,
  // the panel must run the dsh that project installed, not one from PATH.
  const projectDir = options.projectDir === undefined ? process.cwd() : options.projectDir
  const declared = projectDir === null || projectDir.trim().length === 0 ? null : projectDshEntry(projectDir)
  if (declared !== null && realPath(declared) !== realPath(launcherFor(stateDir, declared))) {
    const launcher = writeDshLauncher({
      stateDir,
      dshHome,
      resolvedEntry: declared,
      pinnedEntry: declared,
      repin: true,
      entryExtension: path.extname(declared),
      searchRoots: [dshSearchRoot(declared), projectDir].filter((root): root is string => typeof root === 'string' && root.length > 0),
    })
    return { program: process.execPath, args: [declared], cliEntry: declared, shimPath: null, source: 'entry', launcherPath: launcher.path }
  }

  const local = typeof argv1 === 'string' && argv1.length > 0 ? launchedEntry(argv1) : null
  // A process already booted through the launcher is not a clone to snapshot:
  // one more layer would just reimplement the launcher. Both sides are
  // canonicalised first — on macOS a temp directory is reached as `/var/...`
  // and resolved as `/private/var/...`, and comparing those would stack a
  // second launcher on every boot.
  if (local !== null && realPath(local) !== realPath(dshLauncherPath(stateDir, path.extname(local)))) {
    const launcher = writeDshLauncher({
      stateDir,
      dshHome,
      resolvedEntry: local,
      // The running image is the one a boot entry must keep running: a global
      // copy that reports a higher version is not an upgrade of this install.
      pinnedEntry: local,
      repin: true,
      entryExtension: path.extname(local),
      // Where this install sits, so a rebuilt/moved copy is found next boot.
      searchRoots: [dshSearchRoot(local)].filter((root): root is string => root !== null),
    })
    return { program: process.execPath, args: [local], cliEntry: local, shimPath: null, source: 'entry', launcherPath: launcher.path }
  }

  // This process *is* the launcher's child. The launcher already decided which
  // dsh to run and recorded it; resolving again could only produce a different
  // answer (whatever `$DSH_HOME` or PATH happens to hold) and would then be
  // baked into the row — the exact drift this launcher exists to prevent.
  if (argv1 !== undefined && argv1 !== null && realPath(argv1) === realPath(dshLauncherPath(stateDir, path.extname(local ?? argv1)))) {
    const pinned = readDshLauncherRecord(stateDir)?.pinned ?? null
    if (pinned !== null) {
      const launcher = dshLauncherPath(stateDir, path.extname(pinned))
      const launch = resolveShimmedCli(pinned, process.execPath)
      const cliEntry = launch?.cliEntry ?? pinned
      // Re-assert the record for a launcher that was written before a pin
      // existed; a carried pin is not re-chosen.
      if (readDshLauncherRecord(stateDir)?.entry !== pinned)
        writeDshLauncher({ stateDir, dshHome, resolvedEntry: cliEntry, pinnedEntry: pinned, entryExtension: path.extname(pinned) })
      return { program: process.execPath, args: [launcher], cliEntry, shimPath: null, source: 'entry', launcherPath: launcher }
    }
  }

  // Not launched as an entry: a clone that is not on PATH still installs into
  // the harness home, and that is a far better answer than "not found". An
  // existing pin is the running image and outranks anything found here.
  const installed = findDshEntry(dshHome)
  if (installed !== null) {
    const launcher = writeDshLauncher({ stateDir, dshHome, resolvedEntry: installed, entryExtension: path.extname(installed) })
    return { program: process.execPath, args: [installed], cliEntry: installed, shimPath: null, source: 'entry', launcherPath: launcher.path }
  }

  const found = await (options.findOnPath ?? which)('dsh')
  if (found === null)
    return null
  // A launcher with no pin left is a decision for the user, not for this
  // process: returning the PATH shape would rewrite the row to that absolute
  // entry, and nothing would repair it once PATH changes again.
  if (readDshLauncherRecord(stateDir)?.pinned != null)
    return null
  const launch = resolveShimmedCli(found, process.execPath)
  return launch === null ? null : { ...launch, launcherPath: null }
}

/** The launcher a given entry would boot through, whatever its extension. */
function launcherFor(stateDir: string, entry: string): string {
  return dshLauncherPath(stateDir, path.extname(entry))
}

function buildCommand(launch: CliLaunch, launcherPath: string | null): { command: string, entryArgs: string[] } {
  if (launcherPath !== null && launcherPath.length > 0)
    return { command: process.execPath, entryArgs: [launcherPath] }
  return { command: launch.program, entryArgs: launch.args }
}

/** The script a stored entry actually runs, out of its command and leading args. */
function entryScript(config: { command?: string, args?: string[] }): string | null {
  const program = config.command
  if (typeof program !== 'string' || program.length === 0)
    return null
  // A bare command (`dsh`, `dsh.cmd`) is itself the executable. An absolute one
  // is `process.execPath` here, and the script is the argument that follows.
  if (!path.isAbsolute(program))
    return program
  const rest = config.args ?? []
  return rest.find(arg => path.isAbsolute(arg)) ?? program
}

/**
 * Re-point an entry at the stable launcher for the pinned image.
 *
 * Qualifying shapes, and only these: the entry runs the script this pattern
 * pins (a local build recorded in an earlier release), reaches that script
 * through a package-manager shim, or names a bare `dsh`/`dsh.cmd` that a later
 * PATH lookup would answer with a different copy. An entry that runs a
 * *different* dsh is somebody's deliberate choice and is never touched.
 *
 * An entry this process was booted through is also left alone: repairing it
 * would point it at itself, since that is already the launcher.
 */
/**
 * Whether a bare `dsh` in this project reaches the image we mean.
 *
 * home-hosted resolves a bare command through `<cwd>/node_modules/.bin` first
 * and only then PATH, so a project that installed dsh as a dependency gets its
 * own copy by name — no absolute path to bake in, and it follows the package
 * manager the project actually uses.
 */
export function localDshCommand(projectDir: string | null | undefined, entry: string | null): string | null {
  if (typeof projectDir !== 'string' || projectDir.trim().length === 0 || entry === null)
    return null
  const shim = resolveShimmedCli(path.join(projectDir, 'node_modules', '.bin', 'dsh'))?.cliEntry ?? null
  if (shim === null)
    return null
  return realPath(shim) === realPath(entry) ? 'dsh' : null
}

/**
 * The script a boot row should run: `dsh` when this project's own shim reaches
 * the pinned image, else the stable launcher for it.
 */
export function pinnedScriptFor(launch: DshLaunch | null, projectDir?: string | null): string | null {
  if (launch === null)
    return null
  const entry = launch.cliEntry ?? launch.args.find(arg => path.isAbsolute(arg)) ?? null
  if (localDshCommand(projectDir, entry) === 'dsh')
    return 'dsh'
  const launcher = launch.launcherPath
  if (launcher !== null && launcher.length > 0)
    return launcher
  return entry
}

/** Whether a stored command is a bare name PATH decides, not a path we know. */
function isBareCommand(stored: string): boolean {
  return !/[/\\]/.test(stored) && (stored === 'dsh' || /^dsh\.(?:cmd|exe)$/i.test(stored))
}

/**
 * Whether an entry *could* need that repair, without resolving anything.
 *
 * Resolving a local dsh walks the harness home, so the write path asks this
 * first. Almost every shape can need one — an absolute command, an absolute
 * first argument, a bare `dsh` — and the cheap answer is therefore "yes" here
 * and a full comparison in `launcherRepair`, which is what decides whether
 * anything is actually rewritten.
 */
export function needsLauncherRepair(config: { command?: string, args?: string[] }): boolean {
  const program = config.command
  if (typeof program !== 'string' || program.length === 0)
    return false
  if (path.isAbsolute(program))
    return true
  if (isBareCommand(program))
    return true
  return (config.args ?? []).some(arg => path.isAbsolute(arg))
}

export interface LauncherRepairOptions {
  /**
   * True for a row this plugin created: its command is the plugin's to set, so a
   * stored script that is neither the pinned one nor a shim to it is replaced
   * rather than respected as somebody's choice.
   */
  ownedCommand?: boolean
}

export function launcherRepair(
  config: { command?: string, args?: string[] },
  launch: DshLaunch | null,
  options: LauncherRepairOptions & { projectDir?: string | null } = {},
): { command: string, args: string[], cwd?: string } | null {
  const pinned = pinnedScriptFor(launch, options.projectDir)
  if (pinned === null || launch === null)
    return null
  // Two different questions: what the row should run (`targetBare`), and where
  // the old command kept its script (only a non-bare command inlined one).
  const targetBare = pinned === 'dsh'
  const storedBare = isBareCommand(entryScript(config) ?? '')
  const stored = entryScript(config)
  if (stored === null || stored === pinned)
    return null
  if (!storedBare && options.ownedCommand !== true) {
    // An entry this plugin did not create may be somebody's deliberate choice of
    // dsh, so only the script this pattern pins or a shim to it qualifies.
    const target = resolveShimmedCli(stored, process.execPath)?.cliEntry ?? stored
    if (target !== launch.cliEntry && target !== pinned)
      return null
  }
  // A bare stored command carries no script argument, so nothing is dropped: an
  // absolute app argument (`--home /Users/x/.dsh`) has to survive. Any other
  // shape loses its inlined script, wherever in the argv it sits.
  const args = config.args ?? []
  const script = storedBare ? -1 : args.findIndex(arg => path.isAbsolute(arg) || arg === pinned)
  const rest = script === -1 ? args : args.filter((_, index) => index !== script)
  // A bare command is only local-first with the right cwd, so the row carries
  // the project it was resolved from.
  return targetBare
    ? { command: 'dsh', args: rest, ...(typeof options.projectDir === 'string' && options.projectDir.length > 0 ? { cwd: options.projectDir } : {}) }
    : { command: process.execPath, args: [pinned, ...rest] }
}

export function buildDshEntry(facts: DshFacts): ServerEntry {
  const launch = facts.launch
  const profile = facts.profile === null || facts.profile === undefined ? 'web' : facts.profile

  const appArgs: string[] = []
  if (facts.port !== null) {
    appArgs.push(
      '--port', '{port}',
      '--host', '127.0.0.1',
      '--no-open',
      '--trusted-host', `localhost:{port}`,
    )
  }

  const launcherArgs = profile === 'web' ? ['web'] : ['--profile', profile]
  // A project that declares dsh gets its own copy by name: home-hosted resolves
  // a bare command through the row's cwd and its own project dir before PATH, so
  // there is no absolute path to bake in and nothing to move when the project does.
  const projectDir = facts.projectDir === undefined || facts.projectDir === null ? process.cwd() : facts.projectDir
  const local = launch === null ? null : localDshCommand(projectDir, launch.cliEntry)
  const generated = launch === null || local === 'dsh'
    ? { command: 'dsh', entryArgs: [] as string[] }
    : buildCommand(launch, facts.launcherPath ?? null)

  return {
    id: facts.id,
    label: 'DSH web',
    enabled: true,
    autostart: true,
    command: generated.command,
    args: [...generated.entryArgs, ...launcherArgs, ...appArgs],
    bind: 'local',
    port: facts.port,
    cwd: projectDir,
    env: {},
    dataEnvs: { DSH_HOME: facts.dshHome },
    onPortConflict: 'kill',
    stop: { killPortHolders: true },
    health: {
      enabled: true,
      mode: 'http',
      // 401 is normal here: the panel answers the login route when auth is on.
      http: { path: '/', method: 'GET', expectStatusBelow: 500, expectBody: '' },
    },
  }
}
