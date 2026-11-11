/**
 * Which home-hosted CLI this plugin drives.
 *
 * The plugin ships its own pinned copy as a dependency and prefers it, so the
 * version that runs the panel at boot is the version this plugin was built
 * against — not whatever `home-hosted` happens to be on PATH. Preferring a
 * global install is a supported setting, not an accident.
 *
 * Resolution order: the operator's `homeHostedCommand` override always wins,
 * then the preferred copy, then the other one as a fallback.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { CliCandidate, CliSource, CliStatus } from '../shared/contracts.js'
import { run } from '../util/exec.js'
import type { CliLaunch } from './launch.js'
import { isWindowsSystemPath, parseVersion, resolveShimmedCli, which, whichAll } from './launch.js'
import { launchArgv } from './node-interpreter.js'
import type { NodeInterpreterSource } from './node-interpreter.js'

/** The range the plugin ships and is tested against. `dependencies['home-hosted']` must match. */
export const EXPECTED_RANGE = '^0.11.0'

/**
 * Oldest release whose API, config schema and CLI this plugin relies on.
 *
 * 0.9.0 raised the config schema to 2 and made an **unstamped** file read as schema 1, so its
 * `up` refuses a config written without a stamp — the shape 0.8 wrote, and the shape this
 * plugin wrote before it stamped one. A 0.8.x panel is not a lesser-supported copy: it reads a
 * schema-2 stamp as a newer release's file and refuses that in turn, so no stamp satisfies both
 * and there is no version-conditional path. The remedy for an old root is the panel's own
 * `home-hosted migrate`, which is what lifts a config; this plugin never does.
 */
export const MIN_SUPPORTED_VERSION = '0.9.0'

export type CliPreference = 'pinned' | 'global'

export interface CliResolution {
  launch: CliLaunch | null
  status: CliStatus
}

export interface ResolveCliOptions {
  override?: string | null
  /** Which copy to run when both exist. */
  prefer?: CliPreference
  /** Test seam: the pinned package's manifest path, or null when it is not installed. */
  packageManifest?: () => string | null
  /** Test seam: ask a CLI for its own version. */
  readVersion?: (launch: CliLaunch) => Promise<string | null>
  /** Test seam: locate a command on PATH, first hit only. */
  findOnPath?: (command: string) => Promise<string | null>
  /** Test seam: every path the OS reports for a command, in its own order. */
  findAllOnPath?: (command: string) => Promise<string[]>
  /** Test seam: which platform's PATH rules apply. */
  platform?: NodeJS.Platform
  /** Test seam: the environment `SystemRoot`/`WINDIR` are read from. */
  env?: Readonly<Record<string, string | undefined>>
  /**
   * Test seam: the node that runs a JS file, for the version probe.
   *
   * Under Desktop this process is the Electron binary, which cannot run the script it is
   * handed, so the probe must ask for an interpreter instead of using this process. Pinned in a
   * test so the Desktop shape is assertable on a machine that is not Electron.
   */
  nodeInterpreter?: NodeInterpreterSource
  timeoutMs?: number
}

interface Candidate {
  candidate: CliCandidate
  launch: CliLaunch
}

/** Where the pinned `home-hosted` manifest is, resolved from this module. */
export function pinnedManifestPath(): string | null {
  try {
    return createRequire(import.meta.url).resolve('home-hosted/package.json')
  }
  catch {
    return null
  }
}

/** The `home-hosted` bin entry a package manifest declares. */
export function binEntryFromManifest(manifestPath: string): string | null {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { bin?: string | Record<string, string> }
    const declared = typeof manifest.bin === 'string'
      ? manifest.bin
      : manifest.bin?.['home-hosted'] ?? Object.values(manifest.bin ?? {})[0]
    return typeof declared === 'string' && declared.length > 0
      ? path.resolve(path.dirname(manifestPath), declared)
      : null
  }
  catch {
    return null
  }
}

/**
 * Numeric comparison, semver-compatible; a prerelease sorts below its own release.
 *
 * Prerelease identifiers are compared **piece by piece, numerically where both are numeric**,
 * because a plain string compare puts `rc.2` *above* `rc.10` — the opposite of semver, and
 * this ordering decides which `dsh` a boot entry runs. The same algorithm is inlined into
 * both generated launchers as `COMPARE_VERSIONS_SOURCE`; keep the two in step.
 */
export function compareVersions(a: string, b: string): number {
  const split = (value: string): { parts: number[], pre: string[] } => {
    const [core, pre = ''] = value.split('-', 2)
    return {
      parts: (core ?? '').split('.').map(part => Number.parseInt(part, 10) || 0),
      pre: pre.length > 0 ? pre.split('.') : [],
    }
  }
  const left = split(a)
  const right = split(b)
  for (let index = 0; index < 3; index += 1) {
    const diff = (left.parts[index] ?? 0) - (right.parts[index] ?? 0)
    if (diff !== 0)
      return diff < 0 ? -1 : 1
  }
  // No prerelease outranks any prerelease: `1.0.0` > `1.0.0-rc.1`.
  if (left.pre.length === 0 || right.pre.length === 0) {
    if (left.pre.length === right.pre.length)
      return 0
    return left.pre.length === 0 ? 1 : -1
  }
  for (let index = 0; index < Math.max(left.pre.length, right.pre.length); index += 1) {
    const one = left.pre[index]
    const two = right.pre[index]
    // A shorter prerelease list sorts first when it is a prefix of the other.
    if (one === undefined)
      return -1
    if (two === undefined)
      return 1
    if (one === two)
      continue
    const oneNum = /^\d+$/.test(one) ? Number.parseInt(one, 10) : null
    const twoNum = /^\d+$/.test(two) ? Number.parseInt(two, 10) : null
    if (oneNum !== null && twoNum !== null)
      return oneNum < twoNum ? -1 : 1
    // Numeric identifiers always sort below alphanumeric ones.
    if (oneNum !== null)
      return -1
    if (twoNum !== null)
      return 1
    return one < two ? -1 : 1
  }
  return 0
}

function detailFor(source: CliSource, version: string | null, supported: boolean, prefer: CliPreference, unusableOverride: { reason: 'missing' | 'not-identified', path: string } | null = null): string {
  const shown = version ?? 'unknown version'
  switch (source) {
    case 'config':
      if (unusableOverride === null)
        return `from the configured command (${shown})`
      // The two failures have different remedies, so they are not one sentence.
      return unusableOverride.reason === 'missing'
        ? `the configured command could not be used: ${unusableOverride.path} does not exist (or is not a file this plugin can run); fix homeHostedCommand, or clear it to let the plugin choose`
        : `the configured command could not be used: ${unusableOverride.path} did not identify as home-hosted (it answered no version), so it was not run; fix homeHostedCommand, or clear it to let the plugin choose`
    case 'dependency':
      return supported
        ? `the pinned dependency (${shown})`
        : `the pinned dependency is below the oldest supported release (${MIN_SUPPORTED_VERSION})`
    case 'path':
      if (!supported)
        return `the global install on PATH (${shown}) is below the oldest supported release (${MIN_SUPPORTED_VERSION})`
      return prefer === 'global'
        ? `the global install on PATH (${shown})`
        : `a global install on PATH (${shown}), not the pinned dependency ${EXPECTED_RANGE}`
    default:
      return 'no home-hosted CLI found: install the plugin with its dependencies, or put home-hosted on PATH'
  }
}

/** A PATH hit that was refused, and why, so the page can explain a fallback instead of hiding it. */
interface PathRejection {
  path: string
  reason: 'system-directory' | 'not-identified' | 'not-runnable'
}

function rejectionReason(entry: PathRejection): string {
  switch (entry.reason) {
    case 'system-directory':
      // Never probed, so this says where it is rather than what it answered.
      return `${entry.path} is in the Windows system directory, where a package manager never installs`
    case 'not-runnable':
      return `${entry.path} is not a file this plugin can run`
    default:
      return `${entry.path} did not identify as home-hosted`
  }
}

/** One clause naming every path that was refused, or null when nothing was. */
function pathRejectionNote(rejected: readonly PathRejection[]): string | null {
  if (rejected.length === 0)
    return null
  const clauses = rejected.map(rejectionReason)
  return `on PATH: ${clauses.join('; ')}`
}

/**
 * Ask a CLI for its own version, the way every other launch of it is run.
 *
 * The probe *is* a launch, so it obeys the same rule as the boot entry, the panel's own start
 * and the generated helpers: a script entry needs a real node, and under Desktop
 * `process.execPath` is the Electron binary. Measured on Windows: the Electron executable with a
 * script argument and no `ELECTRON_RUN_AS_NODE` exits 0 printing nothing, because it answers
 * `--version` itself rather than running the script — so probing with `launch.program` made every
 * legitimate script override (including the pinned dependency's own `.mjs`) unidentifiable and
 * refused. `launchArgv` is the one place that decides how a launch runs, so the probe uses it too.
 */
async function defaultReadVersion(launch: CliLaunch, timeoutMs: number, source?: NodeInterpreterSource): Promise<string | null> {
  const argv = await launchArgv(launch, ['--version'], source)
  if (argv === null)
    return null
  const [program, ...args] = argv
  if (program === undefined)
    return null
  const result = await run(program, args, { timeoutMs })
  return parseVersion(result.stdout) ?? parseVersion(result.stderr)
}

export async function resolveCli(options: ResolveCliOptions = {}): Promise<CliResolution> {
  const timeoutMs = options.timeoutMs ?? 5000
  const prefer = options.prefer ?? 'pinned'
  const readVersion = options.readVersion ?? (launch => defaultReadVersion(launch, timeoutMs, options.nodeInterpreter))
  const locate = options.findOnPath ?? which

  // 1. An explicit override is not a preference: it is an instruction. An
  //    instruction that cannot be carried out is reported, never silently
  //    replaced by a copy the operator did not ask for.
  //
  //    "Carried out" means the target identifies itself: a value that cannot name
  //    its own version is not this plugin's CLI, whatever the operator pointed at
  //    (an `hh.exe` is the reported case). Two ways to be unusable, kept apart in the
  //    detail because the remedy differs — a path that is not there, and a program
  //    that runs but does not answer as home-hosted.
  const override = options.override?.trim()
  let unusableOverride: { reason: 'missing' | 'not-identified', path: string } | null = null
  if (override !== undefined && override.length > 0) {
    const launch = resolveShimmedCli(path.resolve(override))
    if (launch === null) {
      unusableOverride = { reason: 'missing', path: override }
    }
    else {
      const version = await readVersion(launch)
      // No version is not "unknown but trust it": it is the same proof the PATH loop
      // demands, and accepting it here reproduced the defect through `homeHostedCommand`.
      if (version === null) {
        unusableOverride = { reason: 'not-identified', path: launch.cliEntry ?? launch.shimPath ?? launch.program }
      }
      else {
        const supported = compareVersions(version, MIN_SUPPORTED_VERSION) >= 0
        return {
          launch,
          status: {
            source: 'config',
            path: launch.cliEntry ?? launch.shimPath ?? launch.program,
            version,
            expectedRange: EXPECTED_RANGE,
            supported,
            prefer,
            dependency: null,
            global: null,
            detail: detailFor('config', version, supported, prefer),
          },
        }
      }
    }
  }

  // 2. The two copies this plugin knows about.
  const manifest = (options.packageManifest ?? pinnedManifestPath)()
  const dependencyEntry = manifest === null ? null : binEntryFromManifest(manifest)
  let dependency: Candidate | null = null
  if (dependencyEntry !== null && fs.existsSync(dependencyEntry)) {
    let version: string | null = null
    try {
      version = (JSON.parse(fs.readFileSync(manifest as string, 'utf8')) as { version?: string }).version ?? null
    }
    catch {
      version = null
    }
    dependency = {
      candidate: { source: 'dependency', path: dependencyEntry, version },
      launch: { program: process.execPath, args: [dependencyEntry], cliEntry: dependencyEntry, shimPath: null, source: 'entry' },
    }
  }

  /**
   * A hit on PATH is a *candidate*, never an install: it must prove it is home-hosted by answering
   * `--version` with a parseable version. `hh` is the reason — it is a legitimate alias of the CLI,
   * and on Windows `where hh` answers `C:\Windows\hh.exe`, the HTML Help viewer, which exits
   * non-zero and prints nothing. A null version there used to read as "supported" and could become
   * a boot entry that starts the help viewer.
   *
   * Several hits are tried in the order the OS gives them, each skipped first when it sits in the
   * Windows system directory, which a package manager never installs into and which may flash a
   * window when run.
   */
  const platform = options.platform ?? process.platform
  // A caller that only stubs the first hit keeps the old single-candidate shape.
  const listAll: (command: string) => Promise<string[]> = options.findAllOnPath
    ?? (options.findOnPath !== undefined
      ? async command => [await locate(command)].filter((hit): hit is string => hit !== null)
      : async command => await whichAll(command, { platform }))
  const rejected: PathRejection[] = []
  let global: Candidate | null = null
  for (const command of ['home-hosted', 'hh']) {
    for (const hit of await listAll(command)) {
      const absolute = path.resolve(hit)
      if (isWindowsSystemPath(absolute, { platform, env: options.env })) {
        rejected.push({ path: absolute, reason: 'system-directory' })
        continue
      }
      const launch = resolveShimmedCli(absolute)
      if (launch === null) {
        rejected.push({ path: absolute, reason: 'not-runnable' })
        continue
      }
      const version = await readVersion(launch)
      if (version === null) {
        rejected.push({ path: launch.cliEntry ?? launch.shimPath ?? launch.program, reason: 'not-identified' })
        continue
      }
      global = {
        candidate: { source: 'path', path: launch.cliEntry ?? launch.shimPath ?? launch.program, version },
        launch,
      }
      break
    }
    if (global !== null)
      break
  }

  const order = prefer === 'global' ? [global, dependency] : [dependency, global]
  const chosen = order.find(item => item !== null) ?? null
  const dependencySummary = dependency?.candidate ?? null
  const globalSummary = global?.candidate ?? null
  // A refused hit is appended to whatever the resolution says, so a fallback explains itself
  // instead of leaving the page to claim the pinned copy for no stated reason.
  const withRejections = (detail: string): string => [detail, pathRejectionNote(rejected)].filter((part): part is string => part !== null).join('; ')

  if (unusableOverride !== null) {
    return {
      launch: null,
      status: {
        source: 'config',
        path: unusableOverride.path,
        version: null,
        expectedRange: EXPECTED_RANGE,
        supported: false,
        prefer,
        dependency: dependencySummary,
        global: globalSummary,
        detail: withRejections(detailFor('config', null, false, prefer, unusableOverride)),
      },
    }
  }

  if (chosen === null) {
    return {
      launch: null,
      status: {
        source: 'none',
        path: null,
        version: null,
        expectedRange: EXPECTED_RANGE,
        supported: false,
        prefer,
        dependency: dependencySummary,
        global: globalSummary,
        detail: withRejections(detailFor('none', null, false, prefer)),
      },
    }
  }

  const version = chosen.candidate.version
  /**
   * A null version here is a deliberate, narrow allowance, not the old bug.
   *
   * `source: 'path'` can no longer be null — the loop above rejects any PATH hit that does not
   * identify — and `source: 'config'` is the same rule since the override refuses one too. What
   * remains is the **pinned dependency**, whose version comes from its own `package.json`: a
   * manifest that declares none is still the copy this plugin shipped and was tested against, so
   * it is accepted and shown as "unknown version". It is reported by `detail`, never presented as
   * a version that was checked.
   */
  const pinned = chosen.candidate.source === 'dependency'
  const supported = version === null ? pinned : compareVersions(version, MIN_SUPPORTED_VERSION) >= 0
  return {
    launch: chosen.launch,
    status: {
      source: chosen.candidate.source,
      path: chosen.candidate.path,
      version,
      expectedRange: EXPECTED_RANGE,
      supported,
      prefer,
      dependency: dependencySummary,
      global: globalSummary,
      detail: withRejections(detailFor(chosen.candidate.source, version, supported, prefer)),
    },
  }
}
