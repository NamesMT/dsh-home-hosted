/**
 * How the home-hosted daemon is launched, and what a boot entry for it contains.
 *
 * The executable is resolved to an absolute program plus argv: a generated boot
 * entry must not depend on a login shell's PATH. When the resolved command is a
 * package-manager shim, its `cmd-shim-target` comment names the real entry, and
 * node runs that directly — the same guarantee the shim itself gives.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { BootSpec } from '../boot/types.js'
import { run } from '../util/exec.js'
import { readText } from '../util/fsx.js'
import { bootUnitName } from '../util/paths.js'

/** The artifact name every install wrote before it was per state root. */
export const LEGACY_BOOT_UNIT_NAME = 'home-hosted'

export interface CliLaunch {
  program: string
  /** Args that must precede the command, e.g. the CLI entry path. */
  args: string[]
  cliEntry: string | null
  shimPath: string | null
  source: 'override' | 'entry' | 'shim-target' | 'shim'
}

export async function which(command: string): Promise<string | null> {
  const probe = process.platform === 'win32' ? 'where.exe' : 'which'
  const result = await run(probe, [command], { timeoutMs: 5000 })
  if (result.code !== 0)
    return null
  const first = result.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean)[0]
  return first ?? null
}

/** Turn a resolved CLI path into an absolute program + argv. */
export function resolveShimmedCli(absolute: string, nodePath = process.execPath): CliLaunch | null {
  if (!fs.existsSync(absolute))
    return null
  if (/\.(?:mjs|cjs|js)$/.test(absolute))
    return { program: nodePath, args: [absolute], cliEntry: absolute, shimPath: null, source: 'entry' }

  const shimTarget = /^#\s*cmd-shim-target=(.+)$/m.exec(readText(absolute) ?? '')?.[1]?.trim()
  if (shimTarget !== undefined && fs.existsSync(shimTarget))
    return { program: nodePath, args: [shimTarget], cliEntry: shimTarget, shimPath: absolute, source: 'shim-target' }

  // A shim with no readable target still works when node is on the entry's PATH.
  return { program: absolute, args: [], cliEntry: null, shimPath: absolute, source: 'shim' }
}

export async function resolveHomeHostedLaunch(override?: string | null): Promise<CliLaunch | null> {
  const configured = override?.trim()
  const found = configured && configured.length > 0 ? configured : (await which('home-hosted')) ?? (await which('hh'))
  if (found === null || found === undefined)
    return null

  const launch = resolveShimmedCli(path.resolve(found))
  if (launch === null)
    return null
  return configured ? { ...launch, source: 'override' } : launch
}

export interface HomeHostedFacts {
  home: string
  projectDir?: string | null
  version?: string | null
}

/** A deterministic environment for a boot-time entry, with absolute values. */
export function homeHostedEnv(facts: HomeHostedFacts, launch: CliLaunch, extra: Record<string, string> = {}): Record<string, string> {
  const dirs = [
    launch.shimPath === null ? null : path.dirname(launch.shimPath),
    path.dirname(process.execPath),
    ...(process.env.PATH ?? '').split(path.delimiter),
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ].filter((dir): dir is string => typeof dir === 'string' && dir.length > 0)
  const seen = new Set<string>()
  const pathValue = dirs.filter((dir) => {
    if (seen.has(dir))
      return false
    seen.add(dir)
    return true
  }).join(path.delimiter)

  const env: Record<string, string> = {
    PATH: pathValue,
    HOME: process.env.HOME ?? process.env.USERPROFILE ?? '',
    HHOSTED_HOME: facts.home,
    ...extra,
  }
  if (facts.projectDir)
    env.HHOSTED_PROJECT = facts.projectDir
  return env
}

export interface BootSpecOptions {
  stateDir: string
  /** The artifact name to write; defaults to the one this state root owns. */
  unitName?: string
  marker?: string
}

export function buildHomeHostedBootSpec(
  facts: HomeHostedFacts,
  launch: CliLaunch,
  options: BootSpecOptions,
): BootSpec {
  const logDir = path.join(facts.home, '.logs')
  fs.mkdirSync(logDir, { recursive: true })
  const args = [...launch.args, 'up', '--foreground', '--home', facts.home]
  if (facts.projectDir)
    args.push('--project', facts.projectDir)

  return {
    command: launch.program,
    args,
    cwd: facts.projectDir ?? facts.home,
    env: homeHostedEnv(facts, launch),
    marker: options.marker ?? 'managed by dsh-home-hosted',
    // One artifact per state root, so two plugin instances cannot overwrite or
    // delete each other's entry. The machine-default install keeps the old name.
    unitName: options.unitName ?? bootUnitName(options.stateDir),
    label: 'home-hosted control panel',
    logDir,
  }
}
