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
  | 'entries.remove'
  | 'entries.restore'
  | 'boot.install'
  | 'boot.uninstall'
  | 'boot.verify'
  | 'panel.start'
  | 'panel.stop'
  | 'panel.takeover'
  | 'panel.reclaimToken'
  | 'cli.installGlobal'
  | 'ui.manage'
  | 'settings.update'

/** A settings write sends only the changed subtree; the host merges group by group. */
export interface SettingsPatch {
  autostart?: Partial<PluginSettings['autostart']>
  manageDsh?: boolean
  entries?: PluginSettings['entries']
  panel?: Partial<PluginSettings['panel']>
  authNotice?: boolean
  reclaimToken?: boolean
  instancesNotice?: boolean
  uiStyle?: UiStyle
  agentTools?: Partial<PluginSettings['agentTools']>
  cli?: Partial<PluginSettings['cli']>
}

/**
 * A state root to act on instead of the panel this plugin manages. Only a panel
 * discovery reports is accepted, and only on the endpoints {@link FOREIGN_MECHANISMS}
 * lists.
 */
export interface ForeignTarget {
  /** A discovered panel's `--home`; omitted means the panel this plugin manages. */
  home?: string
  /**
   * How to reach it; omitted means the endpoint's first mechanism. Only a value
   * {@link FOREIGN_MECHANISMS} lists for that endpoint is accepted.
   */
  via?: ForeignMechanism
}

/**
 * How this plugin can act on a panel it does not manage.
 *
 * `file` edits that panel's `servers.config.json`, `cli` runs the home-hosted
 * CLI against its state root, and `api` enrols a token for it and drives its own
 * HTTP API — the only way to reach some operations, and the only one that gives
 * live status.
 */
export type ForeignMechanism = 'file' | 'cli' | 'api'

/**
 * Which ways each endpoint has to reach another panel, least invasive first (the
 * first entry is the default when a caller names no mechanism). A config edit
 * needs no credential, the CLI needs none either, and `api` mints one.
 *
 * Anything absent here is about this machine or about the managed panel itself
 * and is never aimed elsewhere.
 */
export const FOREIGN_MECHANISMS: Partial<Record<RpcEndpoint, readonly ForeignMechanism[]>> = {
  'servers.list': ['file', 'api'],
  'servers.create': ['file', 'api'],
  'servers.update': ['file', 'api'],
  'servers.delete': ['file', 'api'],
  'servers.start': ['cli', 'api'],
  'servers.stop': ['cli', 'api'],
  'servers.restart': ['cli', 'api'],
  'ui.manage': ['cli'],
}

export interface EndpointPayloads {
  /** `refresh` bypasses the short panel-inventory cache; status is live either way. */
  'status': { refresh?: boolean }
  'servers.list': ForeignTarget
  'servers.get': { id: string }
  'servers.create': ForeignTarget & { entry: ServerEntry }
  'servers.update': ForeignTarget & { id: string, patch: ServerEntryPatch }
  'servers.delete': ForeignTarget & { id: string }
  'servers.start': ForeignTarget & { id: string }
  'servers.stop': ForeignTarget & { id: string }
  'servers.restart': ForeignTarget & { id: string }
  'servers.freePort': { id: string }
  'entries.apply': { intents: EntryIntent[] }
  /** Stop managing an entry: restore what it was, or remove it when we created it. */
  'entries.remove': { id: string }
  'entries.restore': { id: string }
  'boot.install': { mechanism?: BootMechanism }
  'boot.uninstall': { mechanism?: BootMechanism }
  'boot.verify': Record<string, never>
  /** Start the preferred CLI as a detached panel; refused while one already answers. */
  'panel.start': Record<string, never>
  /**
   * Stop the answering panel through its own CLI. The servers it supervises stop
   * with it, which can include the dsh this plugin is running in.
   */
  'panel.stop': Record<string, never>
  /** Stop the answering panel and start the preferred copy instead. */
  'panel.takeover': { force?: boolean }
  /**
   * Mint a fresh panel API token and enrol it, replacing one the panel refuses.
   * Clearing first is what makes it work when home-hosted already holds a hash.
   */
  'panel.reclaimToken': Record<string, never>
  /** Install the pinned range as a global CLI, so the `global` preference can use it. */
  'cli.installGlobal': Record<string, never>
  /** Drive the panel's own UI: status, update, revert, or switch to a local build. */
  'ui.manage': ForeignTarget & { action: UiAction, file?: string }
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

/** Every policy home-hosted's config schema accepts; anything else stops it booting. */
export const ON_PORT_CONFLICT_POLICIES: readonly OnPortConflict[] = ['block', 'warn', 'follow', 'reclaim', 'kill']

export function isOnPortConflict(value: unknown): value is OnPortConflict {
  return typeof value === 'string' && (ON_PORT_CONFLICT_POLICIES as readonly string[]).includes(value)
}

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
  /**
   * Run under home-hosted's nanny, so stopping or restarting the *panel* leaves
   * this process alive. Needs home-hosted 0.6.3.
   */
  persistent: boolean
  autostart: boolean
  onPortConflict: OnPortConflict
  stopKillPortHolders: boolean
}

/** Keys an intent owns: a patch touches these and nothing else. */
export const OWNED_ENTRY_KEYS = ['autostart', 'onPortConflict', 'persistent', 'stop'] as const

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

/**
 * `enrolled` — the plugin holds a token; `present` — home-hosted has one this
 * plugin does not hold; `absent` — none exists yet; `stale` — the plugin holds
 * one the panel just refused; `unknown` — the panel was not reachable to ask.
 */
export type TokenState = 'enrolled' | 'present' | 'absent' | 'stale' | 'unknown'

export interface PanelStatus {
  /** `$HHOSTED_HOME` this plugin resolved, whether or not the panel answers. */
  home: string
  reachable: boolean
  /** The port the panel's own config holds (what a restart would use). */
  configPort?: number | null
  url: string | null
  version: string | null
  pid: number | null
  /** How writes are authenticated right now. */
  writeVia: 'api' | 'file' | 'none'
  token: TokenState
  /** True when the panel was asked and accepted the token, so `token` is measured, not assumed. */
  tokenVerified?: boolean
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

export type UiAction = 'status' | 'update' | 'revert' | 'switch'

export interface UiResult {
  ok: boolean
  detail: string
  /** The active UI, when the action reported or changed one. */
  ui?: { name: string | null, version: string | null, repo?: string | null, tag?: string | null } | null
  output?: string
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
// Panels on this machine
// ---------------------------------------------------------------------------

/**
 * `home-hosted` is not one panel per machine: a person can install it per
 * project, or run several panels from one install with different `--home`
 * roots. The plugin drives exactly one of them — the root it resolved.
 */
export type InstanceSource = 'managed' | 'env' | 'sibling' | 'configured'

/** One home-hosted panel: its state root, and the facts readable from it. */
export interface InstanceView {
  /** The state root itself: what `--home` / `$HHOSTED_HOME` names. */
  home: string
  /**
   * The panel this plugin drives. Every tool call targets it unless the call
   * names another panel, and the plugin never writes to another one.
   */
  managed: boolean
  /** This dsh process runs as one of this panel's entries (`HHOSTED_SERVER_ID`). */
  hosting: boolean
  url: string | null
  port: number | null
  pid: number | null
  version: string | null
  /** A `run.json` whose pid is still alive. */
  running: boolean
  projectDir: string | null
  /** Entries in that panel's `servers.config.json`; `null` when it is unreadable. */
  servers: number | null
  /** How discovery found this root. */
  source: InstanceSource
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
  | 'servers_lifecycle'
  | 'servers_edit'
  | 'autostart_manage'
  | 'ui_manage'

export const AGENT_TOOL_NAMES: readonly AgentToolName[] = [
  'status',
  'servers_list',
  'servers_lifecycle',
  'servers_edit',
  'autostart_manage',
  'ui_manage',
]

/**
 * Tools that change something. They ask for approval only when the calling
 * session is not already `danger-full-access`.
 */
export const MUTATING_AGENT_TOOLS: readonly AgentToolName[] = [
  'servers_lifecycle',
  'servers_edit',
  'autostart_manage',
  'ui_manage',
]

/** The shape this release writes; a file without it was written by 0.1.x. */
export const SETTINGS_VERSION = 3

export type UiStyle = 'detailed' | 'compact'

export interface PluginSettings {
  version: number
  autostart: {
    enabled: boolean
    /** `auto` picks the best available mechanism; an explicit one is honoured only when available. */
    mechanism: 'auto' | BootMechanism
    /** The last install/uninstall attempt, kept so a failure survives a reload. */
    lastAttempt?: BootAttempt
  }
  /** Manage the running harness as a home-hosted entry. */
  manageDsh: boolean
  entries: EntryIntent[]
  agentTools: {
    enabled: boolean
    allow: AgentToolName[]
  }
  /** Port the panel should listen on; `null` keeps whatever the config holds. */
  panel: {
    port: number | null
  }
  /** Point dsh web's sign-in page at the panel log that holds the tokenised URL. */
  authNotice: boolean
  /**
   * When the panel refuses the plugin's API token, re-enrol one on the spot
   * instead of failing the call. On by default: a token that went stale (someone
   * cleared it, or minted their own) should not keep an agent tool from working.
   */
  reclaimToken: boolean
  /**
   * Tell the agent how many home-hosted panels exist on this machine, and ask
   * the user which one to act on when there is more than one. On by default: a
   * plugin that owns one panel must not look like the only one there is.
   */
  instancesNotice: boolean
  /** `detailed` shows cards and open disclosures; `compact` folds both away. */
  uiStyle: UiStyle
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
  version: SETTINGS_VERSION,
  autostart: { enabled: false, mechanism: 'auto' },
  manageDsh: false,
  entries: [],
  // Every tool on by default; the session's own permission mode is what gates them.
  agentTools: { enabled: true, allow: [...AGENT_TOOL_NAMES] },
  panel: { port: null },
  authNotice: true,
  reclaimToken: true,
  instancesNotice: true,
  uiStyle: 'detailed',
  cli: { prefer: 'pinned' },
}

export interface HomeHostedStatus {
  /** The entry id this plugin manages; the page must not assume "dsh". */
  defaultEntryId: string
  panel: PanelStatus
  /** The panel root this plugin instance drives, so a second install is visible. */
  panelRoot?: string
  /** How that root was chosen; `legacy` means an existing `~/.home-hosted` panel was adopted. */
  panelRootSource?: 'env' | 'legacy' | 'instance'
  /** The OS boot artifact name this state root owns. */
  bootUnitName?: string
  /** Every home-hosted panel found on this machine, the managed one first. */
  instances?: InstanceView[]
  boot: BootStatus
  entries: ManagedEntryStatus[]
  servers: ServerEntryView[]
  settings: PluginSettings
  /** The CLI the plugin drives; absent only from a host older than this field. */
  cli?: CliStatus
  /** Set when the panel could not be reached, so the UI can show a degraded page. */
  lastError: string | null
}
