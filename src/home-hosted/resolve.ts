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
import { resolveShimmedCli, which } from './launch.js'

/** The range the plugin ships and is tested against. */
export const EXPECTED_RANGE = '^0.6.4'

/** Oldest release whose API and config schema this plugin relies on. */
export const MIN_SUPPORTED_VERSION = '0.4.1'

/** Oldest release whose config schema accepts `onPortConflict: kill`. */
export const MIN_KILL_VERSION = '0.6.0'
/** `persistent` (the nanny that keeps an entry alive across panel restarts). */
export const MIN_PERSISTENT_VERSION = '0.6.3'

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
  /** Test seam: locate a command on PATH. */
  findOnPath?: (command: string) => Promise<string | null>
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

/** The first `x.y.z[-pre]` in a CLI's output. */
export function parseVersion(output: string | null): string | null {
  const match = /(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(output ?? '')
  return match === null ? null : `${match[1]}.${match[2]}.${match[3]}${match[4] === undefined ? '' : `-${match[4]}`}`
}

/** Numeric comparison; a prerelease sorts below its own release. */
export function compareVersions(a: string, b: string): number {
  const split = (value: string): { parts: number[], pre: string | null } => {
    const [core, pre = null] = value.split('-', 2)
    return { parts: (core ?? '').split('.').map(part => Number.parseInt(part, 10) || 0), pre }
  }
  const left = split(a)
  const right = split(b)
  for (let index = 0; index < 3; index += 1) {
    const diff = (left.parts[index] ?? 0) - (right.parts[index] ?? 0)
    if (diff !== 0)
      return diff < 0 ? -1 : 1
  }
  if (left.pre === right.pre)
    return 0
  if (left.pre === null)
    return 1
  if (right.pre === null)
    return -1
  return left.pre < right.pre ? -1 : 1
}

function detailFor(source: CliSource, version: string | null, supported: boolean, prefer: CliPreference, unusableOverride: string | null = null): string {
  const shown = version ?? 'unknown version'
  switch (source) {
    case 'config':
      return unusableOverride === null
        ? `from the configured command (${shown})`
        : `the configured command could not be used: ${unusableOverride} does not exist (or is not a file this plugin can run); fix homeHostedCommand, or clear it to let the plugin choose`
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

async function defaultReadVersion(launch: CliLaunch, timeoutMs: number): Promise<string | null> {
  const result = await run(launch.program, [...launch.args, '--version'], { timeoutMs })
  return parseVersion(result.stdout) ?? parseVersion(result.stderr)
}

export async function resolveCli(options: ResolveCliOptions = {}): Promise<CliResolution> {
  const timeoutMs = options.timeoutMs ?? 5000
  const prefer = options.prefer ?? 'pinned'
  const readVersion = options.readVersion ?? (launch => defaultReadVersion(launch, timeoutMs))
  const locate = options.findOnPath ?? which

  // 1. An explicit override is not a preference: it is an instruction. An
  //    instruction that cannot be carried out is reported, never silently
  //    replaced by a copy the operator did not ask for.
  const override = options.override?.trim()
  let unusableOverride: string | null = null
  if (override !== undefined && override.length > 0) {
    const launch = resolveShimmedCli(path.resolve(override))
    if (launch === null) {
      unusableOverride = override
    }
    else {
      const version = await readVersion(launch)
      const supported = version === null || compareVersions(version, MIN_SUPPORTED_VERSION) >= 0
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

  let global: Candidate | null = null
  const found = (await locate('home-hosted')) ?? (await locate('hh'))
  if (found !== null) {
    const launch = resolveShimmedCli(path.resolve(found))
    if (launch !== null) {
      global = {
        candidate: { source: 'path', path: launch.cliEntry ?? launch.shimPath ?? launch.program, version: await readVersion(launch) },
        launch,
      }
    }
  }

  const order = prefer === 'global' ? [global, dependency] : [dependency, global]
  const chosen = order.find(item => item !== null) ?? null
  const dependencySummary = dependency?.candidate ?? null
  const globalSummary = global?.candidate ?? null

  if (unusableOverride !== null) {
    return {
      launch: null,
      status: {
        source: 'config',
        path: unusableOverride,
        version: null,
        expectedRange: EXPECTED_RANGE,
        supported: false,
        prefer,
        dependency: dependencySummary,
        global: globalSummary,
        detail: detailFor('config', null, false, prefer, unusableOverride),
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
        detail: detailFor('none', null, false, prefer),
      },
    }
  }

  const version = chosen.candidate.version
  const supported = version === null || compareVersions(version, MIN_SUPPORTED_VERSION) >= 0
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
      detail: detailFor(chosen.candidate.source, version, supported, prefer),
    },
  }
}
