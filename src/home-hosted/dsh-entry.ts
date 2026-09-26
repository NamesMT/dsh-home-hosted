/**
 * The server entry that represents the running harness.
 *
 * An existing entry is never rewritten: this plugin only owns `autostart`,
 * `onPortConflict` and `stop.killPortHolders`. A generated entry (only used when
 * there is none) mirrors how this process was actually launched where that is
 * knowable, and otherwise falls back to the `dsh web` app arguments.
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
import { dshCandidatesUnder, dshLauncherPath, dshSearchRoot, writeDshLauncher } from './launcher.js'

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
  host: string
  profile: string | null
  dshHome: string
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
      entryExtension: path.extname(local),
      // Where this install sits, so a rebuilt/moved copy is found next boot.
      searchRoots: [dshSearchRoot(local)].filter((root): root is string => root !== null),
    })
    return { program: process.execPath, args: [local], cliEntry: local, shimPath: null, source: 'entry', launcherPath: launcher.path }
  }

  // Not launched as an entry: a clone that is not on PATH still installs into
  // the harness home, and that is a far better answer than "not found".
  const installed = findDshEntry(dshHome)
  if (installed !== null) {
    const launcher = writeDshLauncher({ stateDir, dshHome, resolvedEntry: installed, entryExtension: path.extname(installed) })
    return { program: process.execPath, args: [installed], cliEntry: installed, shimPath: null, source: 'entry', launcherPath: launcher.path }
  }

  const found = await (options.findOnPath ?? which)('dsh')
  if (found === null)
    return null
  const launch = resolveShimmedCli(found, process.execPath)
  return launch === null ? null : { ...launch, launcherPath: null }
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
 * Re-point an entry that boots a local build directly at the stable launcher.
 *
 * Only this shape qualifies: the entry runs the same script this process does,
 * and that script is not already the launcher. An upgrade cannot repair the
 * entry it created in an earlier release otherwise — the plugin never rewrites
 * an existing entry's command.
 */
/**
 * Whether an entry *could* need that repair, without resolving anything.
 *
 * Resolving a local dsh walks the harness home, so the write path asks this
 * first: a global `dsh` on PATH, or an entry already on the launcher, is
 * settled here and never triggers the walk.
 */
export function needsLauncherRepair(config: { command?: string, args?: string[] }): boolean {
  const program = config.command
  if (typeof program !== 'string' || program.length === 0)
    return false
  if (path.isAbsolute(program))
    return true
  return (config.args ?? []).some((arg, index) => index === 0 && path.isAbsolute(arg))
}

export function launcherRepair(
  config: { command?: string, args?: string[] },
  launch: DshLaunch | null,
): { command: string, args: string[] } | null {
  if (launch?.launcherPath == null || launch.launcherPath.length === 0)
    return null
  const launcher = launch.launcherPath
  const stored = entryScript(config)
  if (stored === null || stored === launcher)
    return null
  if (stored !== launch.cliEntry)
    return null
  // The old argv named the script as an absolute first argument; the launcher
  // takes its place, so that one has to go and every app argument has to stay.
  const rest = (config.args ?? []).filter((arg, index) => !(index === 0 && path.isAbsolute(arg)))
  return { command: process.execPath, args: [launcher, ...rest] }
}

export function buildDshEntry(facts: DshFacts): ServerEntry {
  const launch = facts.launch
  const profile = facts.profile === null || facts.profile === undefined ? 'web' : facts.profile

  const appArgs: string[] = []
  if (facts.port !== null) {
    appArgs.push(
      '--port', '{port}',
      '--host', '{host}',
      '--no-open',
      '--trusted-host', `localhost:{port}`,
    )
    if (facts.host === '0.0.0.0')
      appArgs.push('--trusted-host', '{lanIp}:{port}')
  }

  const launcherArgs = profile === 'web' ? ['web'] : ['--profile', profile]
  const generated = launch === null
    ? { command: 'dsh', entryArgs: [] as string[] }
    : buildCommand(launch, facts.launcherPath ?? null)

  return {
    id: facts.id,
    label: 'DSH web',
    enabled: true,
    autostart: true,
    command: generated.command,
    args: [...generated.entryArgs, ...launcherArgs, ...appArgs],
    bind: facts.host === '0.0.0.0' ? 'lan' : 'local',
    port: facts.port,
    cwd: process.cwd(),
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
