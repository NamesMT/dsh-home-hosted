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
  /**
   * The home of the account the entry runs as.
   *
   * `HOME` is written into every entry's environment, and that is the problem:
   * installed through `sudo`, it is root's home, so the panel the entry starts
   * resolves `~` (and anything else HOME-relative) into `/root` and dies with a
   * permission error that never mentions its own user.
   *
   * `undefined` means account resolution was not involved, so this process's own
   * `HOME` is right. A string is that account's home. `null` means an account *was*
   * resolved but its home is not knowable here — an LDAP or NIS login has no
   * `/etc/passwd` row — and then the line is *omitted* rather than left at the
   * installer's, because an explicit `Environment=HOME=` overrides `User=` and
   * systemd fills in the right one from NSS itself.
   */
  accountHome?: string | null
  /**
   * The environment this process's own values (`HOME`, `PATH`) are read from.
   *
   * Injected so a caller that decides the entry's account from a given environment
   * also builds the entry's own environment from it: reading `process.env` here
   * while resolving the account elsewhere is how the two came to describe
   * different people.
   */
  env?: Readonly<Record<string, string | undefined>>
}

/** A deterministic environment for a boot-time entry, with absolute values. */
export function homeHostedEnv(facts: HomeHostedFacts, launch: CliLaunch, extra: Record<string, string> = {}): Record<string, string> {
  // The entry's own environment is built from the environment its account was
  // resolved from, never from this process's: under `sudo` those are two
  // different people, and reading `process.env` here is how the `User=` line and
  // the `HOME=` line came to disagree.
  const source = facts.env ?? process.env
  const dirs = [
    launch.shimPath === null ? null : path.dirname(launch.shimPath),
    path.dirname(process.execPath),
    ...(source.PATH ?? '').split(path.delimiter),
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
    HOME: source.HOME ?? source.USERPROFILE ?? '',
    HHOSTED_HOME: facts.home,
    ...extra,
  }
  // Only when it is genuinely a *different* home: a spec that merely repeats this
  // process's own environment stays byte-identical, so an existing entry is not
  // rewritten on every plugin start.
  const accountHome = facts.accountHome?.trim()
  if (accountHome !== undefined && accountHome.length > 0) {
    if (accountHome !== env.HOME)
      env.HOME = accountHome
  }
  else if (facts.accountHome === null) {
    // An account was resolved but its home is not knowable here. Dropping the line
    // is the only safe answer: leaving it would hand the panel the installer's
    // home (root's), and `User=` cannot correct an explicit `Environment=HOME=`.
    delete env.HOME
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
  /** The account's home, so an entry launched by root does not inherit `/root`. */
  accountHome?: string | null
  /** The environment this process's own values are read from. */
  env?: Readonly<Record<string, string | undefined>>
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
    env: homeHostedEnv(
      {
        ...facts,
        // `undefined` means the option was not given; `null` is a decision (an
        // account whose home is unknowable), and `??` would erase it.
        accountHome: options.accountHome === undefined ? facts.accountHome : options.accountHome,
        env: options.env ?? facts.env,
      },
      launch,
    ),
    marker: options.marker ?? 'managed by dsh-home-hosted',
    // One artifact per state root, so two plugin instances cannot overwrite or
    // delete each other's entry. The machine-default install keeps the old name.
    unitName: options.unitName ?? bootUnitName(options.stateDir),
    label: 'home-hosted control panel',
    logDir,
  }
}
