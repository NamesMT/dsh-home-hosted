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

export interface BootProvider {
  mechanism: BootMechanism
  detect(): Promise<BootCandidate>
  status(spec: BootSpec): Promise<{ state: BootState, unitPath: string | null, detail: string, commands: string[] }>
  install(spec: BootSpec): Promise<BootActionResult>
  uninstall(spec: BootSpec): Promise<BootActionResult>
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

export interface BootProviderContext {
  platform: NodeJS.Platform
  home: string
  env: Record<string, string | undefined>
  run: BootRunner
  sudo: () => Promise<boolean>
  isRoot: boolean
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
}

export interface BootLadder {
  providers: BootProvider[]
  detect(): Promise<{ platform: BootStatus['platform'], candidates: BootCandidate[] }>
  status(spec: BootSpec, mechanism?: BootMechanism): Promise<BootStatus>
  install(spec: BootSpec, mechanism?: BootMechanism): Promise<BootActionResult & { mechanism: BootMechanism | null, status: BootStatus }>
  uninstall(spec: BootSpec, mechanism?: BootMechanism): Promise<BootActionResult & { status: BootStatus }>
}

export type BootProviderStatus = Awaited<ReturnType<BootProvider['status']>>
