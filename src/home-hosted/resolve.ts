/**
 * Which home-hosted CLI this plugin drives.
 *
 * The plugin ships its own pinned copy as a dependency, so the version that runs
 * the panel at boot is the version this plugin was built against — not whatever
 * `home-hosted` happens to be on PATH. Resolution order:
 *
 * 1. the operator's `homeHostedCommand` override (explicit wins),
 * 2. the pinned dependency,
 * 3. PATH, as a fallback for a checkout whose dependencies are not installed.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { CliSource, CliStatus } from '../shared/contracts.js'
import { run } from '../util/exec.js'
import type { CliLaunch } from './launch.js'
import { resolveShimmedCli, which } from './launch.js'

/** The range the plugin ships and is tested against. */
export const EXPECTED_RANGE = '^0.6.1'

/** Oldest release whose API and config schema this plugin relies on. */
export const MIN_SUPPORTED_VERSION = '0.4.1'

export interface CliResolution {
  launch: CliLaunch | null
  status: CliStatus
}

export interface ResolveCliOptions {
  override?: string | null
  /** Test seam: the pinned package's manifest path, or null when it is not installed. */
  packageManifest?: () => string | null
  /** Test seam: ask the CLI for its own version. */
  readVersion?: (launch: CliLaunch) => Promise<string | null>
  /** Test seam: locate a command on PATH. */
  findOnPath?: (command: string) => Promise<string | null>
  timeoutMs?: number
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

async function defaultReadVersion(launch: CliLaunch, timeoutMs: number): Promise<string | null> {
  const result = await run(launch.program, [...launch.args, '--version'], { timeoutMs })
  return parseVersion(result.stdout) ?? parseVersion(result.stderr)
}

function detailFor(source: CliSource, version: string | null, supported: boolean): string {
  const shown = version ?? 'unknown version'
  switch (source) {
    case 'config':
      return `from the configured command (${shown})`
    case 'dependency':
      return supported
        ? `the pinned dependency (${shown})`
        : `the pinned dependency is below the oldest supported release (${MIN_SUPPORTED_VERSION})`
    case 'path':
      return supported
        ? `a global install on PATH (${shown}), not the pinned dependency ${EXPECTED_RANGE}`
        : `a global install on PATH (${shown}) is below the oldest supported release (${MIN_SUPPORTED_VERSION})`
    default:
      return 'no home-hosted CLI found: install the plugin with its dependencies, or put home-hosted on PATH'
  }
}

export async function resolveCli(options: ResolveCliOptions = {}): Promise<CliResolution> {
  const timeoutMs = options.timeoutMs ?? 5000
  let launch: CliLaunch | null = null
  let source: CliSource = 'none'

  const override = options.override?.trim()
  if (override !== undefined && override.length > 0) {
    launch = resolveShimmedCli(path.resolve(override))
    if (launch !== null)
      source = 'config'
  }

  if (launch === null) {
    const manifest = (options.packageManifest ?? pinnedManifestPath)()
    const entry = manifest === null ? null : binEntryFromManifest(manifest)
    if (entry !== null && fs.existsSync(entry)) {
      launch = { program: process.execPath, args: [entry], cliEntry: entry, shimPath: null, source: 'entry' }
      source = 'dependency'
    }
  }

  if (launch === null) {
    const locate = options.findOnPath ?? which
    const found = (await locate('home-hosted')) ?? (await locate('hh'))
    if (found !== null) {
      launch = resolveShimmedCli(path.resolve(found))
      if (launch !== null)
        source = 'path'
    }
  }

  if (launch === null) {
    return {
      launch: null,
      status: { source: 'none', path: null, version: null, expectedRange: EXPECTED_RANGE, supported: false, detail: detailFor('none', null, false) },
    }
  }

  const version = await (options.readVersion ?? (target => defaultReadVersion(target, timeoutMs)))(launch)
  const supported = version === null || compareVersions(version, MIN_SUPPORTED_VERSION) >= 0
  return {
    launch,
    status: {
      source,
      path: launch.cliEntry ?? launch.shimPath ?? launch.program,
      version,
      expectedRange: EXPECTED_RANGE,
      supported,
      detail: detailFor(source, version, supported),
    },
  }
}
