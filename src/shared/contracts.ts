/**
 * The one wire contract shared by the host half and the browser half.
 *
 * Nothing here may import a Node builtin: the browser bundle includes this
 * module verbatim.
 */

/** Exact Fetch route registered on DeepSeek Harness's authenticated `/api` channel. */
export const RPC_PATH = '/home-hosted'

/** Bumped when a payload shape changes; a mismatch is reported, never guessed at. */
export const RPC_VERSION = 1

export interface RpcError {
  code: string
  message: string
  detail?: unknown
}

export type Envelope<T> = { ok: true, value: T } | { ok: false, error: RpcError }

/** Endpoints the browser and the agent tools both speak. */
export type RpcEndpoint =
  | 'status'
  | 'servers.list'
  | 'servers.get'
  | 'servers.create'
  | 'servers.update'
  | 'servers.delete'
  | 'servers.start'
  | 'servers.stop'
  | 'servers.restart'
  | 'servers.freePort'
  | 'entries.apply'
  | 'entries.restore'
  | 'boot.install'
  | 'boot.uninstall'
  | 'boot.verify'
  | 'panel.start'
  | 'panel.takeover'
  | 'cli.installGlobal'
  | 'settings.update'

/** A settings write sends only the changed subtree; the host merges group by group. */
export interface SettingsPatch {
  autostart?: Partial<PluginSettings['autostart']>
  entries?: PluginSettings['entries']
  agentTools?: Partial<PluginSettings['agentTools']>
  cli?: Partial<PluginSettings['cli']>
}

export interface EndpointPayloads {
  'status': { refresh?: boolean }
  'servers.list': Record<string, never>
  'servers.get': { id: string }
  'servers.create': { entry: ServerEntry }
  'servers.update': { id: string, patch: ServerEntryPatch }
  'servers.delete': { id: string }
  'servers.start': { id: string }
  'servers.stop': { id: string }
  'servers.restart': { id: string }
  'servers.freePort': { id: string }
  'entries.apply': { intents: EntryIntent[] }
  'entries.restore': { id: string }
  'boot.install': { mechanism?: BootMechanism }
  'boot.uninstall': { mechanism?: BootMechanism }
  'boot.verify': Record<string, never>
  /** Start the preferred CLI as a detached panel; refused while one already answers. */
  'panel.start': Record<string, never>
  /** Stop the answering panel and start the preferred copy instead. */
  'panel.takeover': { force?: boolean }
  /** Install the pinned range as a global CLI, so the `global` preference can use it. */
  'cli.installGlobal': Record<string, never>
  'settings.update': { patch: SettingsPatch }
}

export interface RpcRequest {
  v: number
  endpoint: RpcEndpoint
  payload?: unknown
}

// ---------------------------------------------------------------------------
// Server entries
// ---------------------------------------------------------------------------

export type OnPortConflict = 'block' | 'warn' | 'follow' | 'reclaim' | 'kill'

/** Only the fields this plugin reads or writes are typed; the rest is preserved. */
export interface ServerEntry {
  id: string
  label?: string
  enabled?: boolean
  autostart?: boolean
  command?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  dataEnvs?: Record<string, string>
  port?: number | null
  bind?: string
  onPortConflict?: OnPortConflict
  stop?: { killPortHolders?: boolean, [key: string]: unknown }
  health?: Record<string, unknown>
  restart?: Record<string, unknown>
  [key: string]: unknown
}

export type ServerEntryPatch = Partial<ServerEntry>

/** What the plugin decides about one entry, and the keys it therefore owns. */
export interface EntryIntent {
  id: string
  autostart: boolean
  onPortConflict: OnPortConflict
  stopKillPortHolders: boolean
}

/** Keys an intent owns: a patch touches these and nothing else. */
export const OWNED_ENTRY_KEYS = ['autostart', 'onPortConflict', 'stop'] as const

export interface ServerEntryView {
  id: string
  status: string
  pid: number | null
  url: string | null
  config: ServerEntry
}

export interface ManagedEntryStatus {
  intent: EntryIntent
  exists: boolean
  /** True once the plugin has adopted the entry and holds a snapshot of what it was. */
  managed: boolean
  /** Owned keys whose live value differs from the intent. */
  drift: string[]
  live: ServerEntryView | null
  snapshot: ServerEntry | null
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export type TokenState = 'enrolled' | 'present' | 'absent' | 'unknown'

export interface PanelStatus {
  /** `$HHOSTED_HOME` this plugin resolved, whether or not the panel answers. */
  home: string
  reachable: boolean
  url: string | null
  version: string | null
  pid: number | null
  /** How writes are authenticated right now. */
  writeVia: 'api' | 'file' | 'none'
  token: TokenState
  detail: string
}

/** Which home-hosted CLI the plugin drives, and where it came from. */
export type CliSource = 'config' | 'dependency' | 'path' | 'none'

/** One place a CLI could come from, with the version found there. */
export interface CliCandidate {
  source: 'config' | 'dependency' | 'path'
  path: string | null
  version: string | null
}

export interface PanelControlResult {
  ok: boolean
  detail: string
  url?: string | null
  version?: string | null
}

export interface CliStatus {
  /** `config` (operator override), `dependency` (the pinned copy), `path`, or none. */
  source: CliSource
  path: string | null
  version: string | null
  /** The range the plugin ships in its own dependencies. */
  expectedRange: string
  /** False when the resolved CLI is older than the oldest release this plugin supports. */
  supported: boolean
  /** The stable launcher a boot entry runs instead of a moving node_modules path. */
  launcherPath?: string | null
  /** What the launcher answers right now, as the boot entry would invoke it. */
  launcherVersion?: string | null
  /** Which copy the plugin prefers. */
  prefer?: 'pinned' | 'global'
  /** The plugin's own copy, when it resolves. */
  dependency?: CliCandidate | null
  /** The global install on PATH, when there is one. */
  global?: CliCandidate | null
  detail: string
}

// ---------------------------------------------------------------------------
// Boot autostart
// ---------------------------------------------------------------------------

export type BootMechanism =
  | 'systemd-user'
  | 'systemd-system'
  | 'xdg-autostart'
  | 'launchd-agent'
  | 'launchd-daemon'
  | 'windows-run'
  | 'windows-task'
  | 'container'
  | 'unsupported'

export type BootState =
  | 'not-installed'
  | 'installed-disabled'
  | 'enabled-running'
  | 'enabled-failing'
  | 'unsupported'

export interface BootCandidate {
  mechanism: BootMechanism
  available: boolean
  /** Starts before an interactive login. */
  bootCapable: boolean
  /** This process can drive it without an elevation prompt. */
  privileged: boolean
  reason: string
}

export interface BootStatus {
  platform: 'linux' | 'darwin' | 'win32' | 'other'
  mechanism: BootMechanism | null
  recommended: BootMechanism | null
  state: BootState
  bootCapable: boolean
  privileged: boolean
  unitPath: string | null
  /** Exact commands a person can run when this process cannot elevate. */
  commands: string[]
  detail: string
  candidates: BootCandidate[]
}

// ---------------------------------------------------------------------------
// Plugin settings (UI-managed, persisted outside the Cordis config)
// ---------------------------------------------------------------------------

export type AgentToolName =
  | 'status'
  | 'servers_list'
  | 'servers_start'
  | 'servers_stop'
  | 'servers_restart'
  | 'servers_create'
  | 'servers_update'
  | 'servers_delete'
  | 'autostart_install'
  | 'autostart_uninstall'

export const AGENT_TOOL_NAMES: readonly AgentToolName[] = [
  'status',
  'servers_list',
  'servers_start',
  'servers_stop',
  'servers_restart',
  'servers_create',
  'servers_update',
  'servers_delete',
  'autostart_install',
  'autostart_uninstall',
]

/** Tools that change something; every one of them asks for approval first. */
export const MUTATING_AGENT_TOOLS: readonly AgentToolName[] = [
  'servers_start',
  'servers_stop',
  'servers_restart',
  'servers_create',
  'servers_update',
  'servers_delete',
  'autostart_install',
  'autostart_uninstall',
]

export interface PluginSettings {
  autostart: {
    enabled: boolean
    /** `auto` picks the best available mechanism; an explicit one is honoured only when available. */
    mechanism: 'auto' | BootMechanism
    /** The last install/uninstall attempt, kept so a failure survives a reload. */
    lastAttempt?: BootAttempt
  }
  entries: EntryIntent[]
  agentTools: {
    enabled: boolean
    allow: AgentToolName[]
  }
  cli: {
    /** `pinned` runs the copy this plugin ships; `global` runs the one on PATH. */
    prefer: 'pinned' | 'global'
  }
}

export interface BootAttempt {
  ok: boolean
  /** `install` or `uninstall`. */
  action: 'install' | 'uninstall'
  mechanism: BootMechanism | null
  detail: string
  /** The exact commands a person can run when the attempt needed privilege. */
  commands: string[]
  at: number
}

export const DEFAULT_SETTINGS: PluginSettings = {
  autostart: { enabled: false, mechanism: 'auto' },
  entries: [],
  agentTools: { enabled: false, allow: ['status', 'servers_list'] },
  cli: { prefer: 'pinned' },
}

export interface HomeHostedStatus {
  panel: PanelStatus
  boot: BootStatus
  entries: ManagedEntryStatus[]
  servers: ServerEntryView[]
  settings: PluginSettings
  /** The CLI the plugin drives; absent only from a host older than this field. */
  cli?: CliStatus
  /** Set when the panel could not be reached, so the UI can show a degraded page. */
  lastError: string | null
}
