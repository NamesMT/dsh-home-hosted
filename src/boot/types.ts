/**
 * The boot ladder's frozen surface.
 *
 * A provider is stateless: everything it needs arrives in `BootSpec` and a
 * context of injectable seams. Nothing here consults the operating system at
 * module scope, so importing this family is safe on every platform.
 */
import type { BootCandidate, BootMechanism, BootState, BootStatus } from '../shared/contracts.js'

export interface BootSpec {
  /** Absolute program (node), never a shim. */
  command: string
  /** Absolute CLI entry plus args. */
  args: string[]
  /** Absolute working directory. */
  cwd: string
  /** Absolute values only (PATH, HOME, HHOSTED_HOME, …). */
  env: Record<string, string>
  /** Text identifying this plugin as the writer of an artifact. */
  marker: string
  /** e.g. 'home-hosted'. */
  unitName: string
  /** Human label. */
  label: string
  /** Absolute directory the entry may log into. */
  logDir: string
}

export interface BootActionResult {
  ok: boolean
  changed: boolean
  detail: string
  /** Exact commands a person can run when privilege is missing. */
  commands: string[]
  needsPrivilege: boolean
}

/**
 * How to start the panel through an installed mechanism.
 *
 * An install has to *prove* the entry starts the panel, and a probe is not it: a
 * LaunchAgent whose label was never booted reads as installed while nothing
 * runs. So each mechanism names its own start steps.
 *
 * Everything is argv, never a shell: these run later in a detached helper that
 * has none of this process's context. The panel is stopped before they run: the
 * CLI refuses to start a second panel while `run.json` names a live pid, so a
 * start attempted over a running one fails even when the entry itself is right.
 *
 * `activate()` answers null when the mechanism cannot start anything now (an
 * entry the desktop session or the shell reads at login). Killing a panel we
 * cannot bring back is worse than leaving it up, so that path stops nothing.
 */
export interface BootStart {
  /** argv steps, in order; the first that fails ends the attempt. */
  commands: string[][]
  /** Proof that must hold before the panel is touched at all. */
  requires: {
    /** Probes that must exit 0. */
    commands: string[][]
    /** Files that must exist. */
    files: string[]
  }
  display: string[]
}

/** What removes a mechanism's entry without waiting for it to stop anything. */
export interface BootRetirement {
  commands: string[][]
  display: string[]
}

/** A mechanism's start steps plus everything a switch has to clean up. */
export interface BootActivation extends BootStart {
  /**
   * How to stop the panel *this* mechanism supervises, when it supervises one.
   *
   * A switch cannot rely on the CLI's `down` alone: the entry it is coming from
   * would restart the panel it just lost (`Restart=always`, `KeepAlive`), racing
   * the new entry. Empty means this mechanism supervises nothing here.
   */
  stop: string[][]
  /** Steps that remove the other mechanisms' entries. */
  retire: string[][]
  /** Which mechanisms those steps belong to. */
  retired: BootMechanism[]
  /** The retirement as one copy-pasteable block. */
  retireDisplay: string[]
}

export interface BootProvider {
  mechanism: BootMechanism
  detect(): Promise<BootCandidate>
  status(spec: BootSpec): Promise<{ state: BootState, unitPath: string | null, detail: string, commands: string[] }>
  install(spec: BootSpec): Promise<BootActionResult>
  uninstall(spec: BootSpec): Promise<BootActionResult>
  /** The start steps for an installed entry; null when this mechanism cannot start one now. */
  activate?(spec: BootSpec): Promise<BootStart | null>
  /** Steps that stop the panel this mechanism supervises, without removing its entry. */
  stopCommands?(spec: BootSpec): Promise<string[][]>
  /**
   * Steps that delete this mechanism's entry *without* stopping the panel it may
   * be running. A switch retires the mechanism it came from inside the helper,
   * after the panel is already down, so `uninstall()`'s `--now` forms would race
   * the start. `bootout` is the one exception: launchd has no way to unload a job
   * without stopping it, which is why retirement runs after the stop, never before.
   */
  retireCommands?(spec: BootSpec): Promise<BootRetirement>
}

/** One injected process result; `run()` from `util/exec.ts` is structurally assignable. */
export interface BootRunResult {
  code: number | null
  stdout: string
  stderr: string
  error?: string | null
}

export interface BootRunOptions {
  cwd?: string
  env?: Record<string, string | undefined>
  timeoutMs?: number
}

/** argv-only, never a shell. `run` from `util/exec.ts` satisfies this. */
export type BootRunner = (command: string, args: string[], options?: BootRunOptions) => Promise<BootRunResult>

/** One row of the user database, as account resolution needs it. */
export interface PasswdEntry {
  name: string
  uid: number
  home: string
}

/**
 * The account a boot entry should run as — deliberately not `$USER`.
 *
 * `sudo` and `pkexec` rewrite `USER`/`LOGNAME` to the *target* account, and a
 * panel started from a root shell or a root unit sees `USER=root`. A unit written
 * from that is a unit that runs the panel as root. `uid` is what the elevating
 * tool left behind (`SUDO_UID`/`PKEXEC_UID`) or this process's own euid, and the
 * name/home come from the user database rather than from the environment.
 */
export interface BootAccount {
  name: string
  uid: number | null
  home: string | null
  /** Root must never be written into a unit as if it were a choice. */
  root: boolean
  /**
   * Whether the user database actually places this name.
   *
   * An unverified name is not necessarily wrong — an LDAP login has no
   * `/etc/passwd` row — but systemd cannot resolve it either, and `User=<name it
   * cannot resolve>` makes the unit refuse to start (`status=217/USER`), so the
   * writer warns instead of installing a crash-loop in silence.
   */
  verified: boolean
}

export interface BootProviderContext {
  platform: NodeJS.Platform
  home: string
  env: Record<string, string | undefined>
  run: BootRunner
  sudo: () => Promise<boolean>
  isRoot: boolean
  /** This process's own uid; defaults to `process.getuid()`. Injected so a test can pin it. */
  uid?: number | null
  /** Directories whose owner names the human a root-launched panel belongs to. */
  ownerPaths?: readonly string[]
  /** The user database to resolve against; defaults to the real one. */
  passwd?: readonly PasswdEntry[]
  /** Where a refusal or a root-account fallback is said out loud. */
  warn?: (message: string) => void
  /** Existence probe; defaults to `fs.existsSync`. Injected so container/PID-1 detection is testable. */
  exists?: (file: string) => boolean
}

export interface BootLadderOptions {
  platform?: NodeJS.Platform
  home?: string
  env?: Record<string, string | undefined>
  run?: BootRunner
  sudo?: () => Promise<boolean>
  exists?: (file: string) => boolean
  uid?: number | null
  ownerPaths?: readonly string[]
  passwd?: readonly PasswdEntry[]
  warn?: (message: string) => void
}

export interface BootLadder {
  providers: BootProvider[]
  detect(): Promise<{ platform: BootStatus['platform'], candidates: BootCandidate[] }>
  status(spec: BootSpec, mechanism?: BootMechanism): Promise<BootStatus>
  install(spec: BootSpec, mechanism?: BootMechanism): Promise<BootActionResult & { mechanism: BootMechanism | null, status: BootStatus }>
  uninstall(spec: BootSpec, mechanism?: BootMechanism): Promise<BootActionResult & { status: BootStatus }>
  /** The start command for an installed entry, after it was confirmed installed. */
  activate(spec: BootSpec, mechanism?: BootMechanism): Promise<BootActivation | null>
}

export type BootProviderStatus = Awaited<ReturnType<BootProvider['status']>>
