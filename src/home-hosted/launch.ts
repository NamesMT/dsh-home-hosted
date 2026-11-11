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

export interface WhichOptions {
  /** Which OS's locator to ask; defaults to this process's. */
  platform?: NodeJS.Platform
  /**
   * Test seam: how the locator is run.
   *
   * Not a convenience — on a WSL host `where.exe` is genuinely on PATH through interop, so a
   * test that let the real probe run would assert Windows against a machine that is not Windows.
   */
  exec?: (program: string, args: string[]) => Promise<{ code: number | null, stdout: string }>
}

/**
 * Every path the OS reports for a command, in the order it lists them.
 *
 * `where.exe` prints **one line per hit**, so taking the first line is a guess about which copy
 * is the right one: measured on Windows 11, `cmd.exe /c "where hh"` answers `C:\Windows\hh.exe`
 * and exits 0, and that binary is the HTML Help viewer rather than any package's shim.
 *
 * POSIX `which` needs `-a` to list more than the first, so that is asked for. A `which` that
 * lacks the flag exits **non-zero and prints nothing on stdout** (measured: GNU which 2.25
 * answers `no --version in (…)` on *stderr* and exit 1), which is why the retry keys on an
 * empty result rather than on the exit code alone — and why a locator that put its single hit
 * on stderr would be reported as absent rather than as one hit. That is the deliberate trade:
 * one hit silently standing for several is the defect this function exists to remove.
 */
export async function whichAll(command: string, options: WhichOptions = {}): Promise<string[]> {
  const platform = options.platform ?? process.platform
  const exec = options.exec ?? ((program, args) => run(program, args, { timeoutMs: 5000 }))
  const lines = (result: { code: number | null, stdout: string }): string[] =>
    result.code !== 0 ? [] : result.stdout.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
  if (platform === 'win32')
    return lines(await exec('where.exe', [command]))
  const hits = lines(await exec('which', ['-a', command]))
  return hits.length > 0 ? hits : lines(await exec('which', [command]))
}

export async function which(command: string, options: WhichOptions = {}): Promise<string | null> {
  return (await whichAll(command, options))[0] ?? null
}

export interface WindowsPathOptions {
  platform?: NodeJS.Platform
  /** The environment `SystemRoot`/`WINDIR` are read from. */
  env?: Readonly<Record<string, string | undefined>>
}

/**
 * Is this path inside the Windows system directory?
 *
 * The OS owns that directory and a package manager never installs into it, so a hit there is not a
 * candidate at all: `where.exe` answers `C:\Windows\hh.exe` for `hh` (the binary that alias is meant
 * to reach, `home-hosted.cmd`, is elsewhere), and **probing it can flash its help window**. So a hit
 * here is skipped before it is run, never after.
 *
 * Compared with `path.win32` rather than `path`, so this answers the same question whichever OS the
 * caller runs on — a test on Linux can still assert the Windows rule.
 */
export function isWindowsSystemPath(candidate: string, options: WindowsPathOptions = {}): boolean {
  if ((options.platform ?? process.platform) !== 'win32')
    return false
  const env = options.env ?? process.env
  const declared = [env.SystemRoot, env.WINDIR].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  const roots = declared.length > 0 ? declared : ['C:\\Windows']
  return roots.some((root) => {
    // `path.win32.relative` is case-insensitive, as the filesystem is.
    const relative = path.win32.relative(path.win32.resolve(root), path.win32.resolve(candidate))
    return relative.length > 0 && relative !== '..' && !relative.startsWith(`..${path.win32.sep}`) && !path.win32.isAbsolute(relative)
  })
}

/** The first `x.y.z[-pre]` in a CLI's output. */
export function parseVersion(output: string | null): string | null {
  const match = /(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(output ?? '')
  return match === null ? null : `${match[1]}.${match[2]}.${match[3]}${match[4] === undefined ? '' : `-${match[4]}`}`
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
