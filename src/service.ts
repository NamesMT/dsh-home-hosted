/**
 * The one implementation behind both surfaces: the browser page and the agent
 * tools call the same endpoints, so they cannot drift apart.
 *
 * Writes prefer the panel API (the store ignores its own writes, so nothing is
 * restarted behind the user's back) and fall back to an atomic config-file write
 * only when the panel is not answering.
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import type { BootMechanism, BootStatus, DshSurface, EntryIntent, ForeignMechanism, HomeHostedStatus, InstanceView, ManagedEntryStatus, PanelControlResult, PanelStatus, RpcEndpoint, ServerEntry, ServerEntryPatch, ServerEntryView, UiAction, UiResult, WorkspaceSummary } from './shared/contracts.js'
import { FOREIGN_MECHANISMS, isOnPortConflict, isWorkspaceId, ON_PORT_CONFLICT_POLICIES } from './shared/contracts.js'
import type { BootActivation, BootSpec } from './boot/types.js'
import type { ActivationPlan } from './home-hosted/panel-control.js'
import { createBootLadder } from './boot/index.js'
import { accountOf } from './boot/index.js'
import type { AccountInput, PasswdEntry } from './boot/index.js'
import { findEntry, patchEntry, readConfig, readGlobalSettings, removeEntry as removeConfigEntry, setControl, upsertEntry, writeConfig } from './home-hosted/config-file.js'
import { DEFAULT_WORKSPACE, defaultWorkspace, isLegacyRoot, readWorkspaces, serversFile } from './home-hosted/layout.js'
import type { RawConfig } from './home-hosted/config-file.js'
import { buildDshEntry, detectProfile, launcherRepair, needsLauncherRepair, resolveDshLaunch } from './home-hosted/dsh-entry.js'
import type { DshLaunch } from './home-hosted/dsh-entry.js'
import { canonicalPath, discoverInstances } from './home-hosted/instances.js'
import { defaultIntent, isCreatedEntry, ownedDrift, ownedPatch, restorePatch, snapshotOwned } from './home-hosted/entries.js'
import { buildHomeHostedBootSpec, homeHostedEnv, LEGACY_BOOT_UNIT_NAME } from './home-hosted/launch.js'
import type { CliResolution } from './home-hosted/resolve.js'
import { EXPECTED_RANGE, MIN_SUPPORTED_VERSION, resolveCli } from './home-hosted/resolve.js'
import { preflightLauncher, writeLauncher } from './home-hosted/launcher.js'
import type { PanelControlDeps } from './home-hosted/panel-control.js'
import { activationLogPath, installGlobal, spawnActivation, spawnTakeover, startPanel as startPanelProcess, stopPanel as stopPanelProcess } from './home-hosted/panel-control.js'
import { PanelClient, PanelError, probeToken, verifyToken } from './home-hosted/panel.js'
import { readRuntime, probePanel, pidAlive } from './home-hosted/runtime.js'
import { apiTokenEnrolled, ensureToken, readStoredToken, reclaimToken, tokenSlot } from './home-hosted/token.js'
import type { SettingsStore } from './settings.js'
import { bootUnitName, dshHome } from './util/paths.js'
import type { RunResult } from './util/exec.js'
import { run } from './util/exec.js'
import { readJson, writeJsonAtomic } from './util/fsx.js'

const ENTRY_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/

/** A token probe is an auxiliary fact, not a user action: never let it stall a poll. */
const TOKEN_PROBE_TIMEOUT_MS = 3000

/** How often a deleted managed entry may be put back from the status read. */
const ENTRY_RECOVERY_INTERVAL_MS = 30_000

/** How long a panel inventory stands before the next read re-scans the disk. */
const INSTANCES_CACHE_MS = 10_000

/** This plugin's own package root, used as a search hint for the pinned CLI. */
function pluginRoot(): string | null {
  try {
    return path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  }
  catch {
    return null
  }
}

/** What a boot install/uninstall answers with; mirrors the boot module's shape. */
export interface BootInstallResult {
  ok: boolean
  changed: boolean
  detail: string
  commands: string[]
  needsPrivilege: boolean
  /** Present on install; an uninstall names no mechanism. */
  mechanism?: BootMechanism | null
  status: BootStatus
}

/** The subset of the boot ladder this service uses. */
export interface BootLadderLike {
  status: (spec: BootSpec, mechanism?: BootMechanism) => Promise<BootStatus>
  install: (spec: BootSpec, mechanism?: BootMechanism) => Promise<BootInstallResult>
  uninstall: (spec: BootSpec, mechanism?: BootMechanism) => Promise<BootInstallResult>
  activate: (spec: BootSpec, mechanism?: BootMechanism, from?: BootMechanism | null) => Promise<BootActivation | null>
}

export class HomeHostedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message)
    this.name = 'HomeHostedError'
  }
}

/** An entry another panel's config holds: no live status without that panel's API. */
function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function foreignView(entry: ServerEntry, workspace: string): ServerEntryView {
  return { id: entry.id, workspace, status: 'unknown', pid: null, url: null, config: entry }
}

export interface HomeHostedServiceOptions {
  home: string
  /** How that root was chosen: an explicit env var, an adopted legacy panel, or this instance's own. */
  panelHomeSource?: 'env' | 'legacy' | 'instance'
  stateDir: string
  homeHostedCommand?: string
  defaultEntryId: string
  /**
   * The dsh surface this host runs in. Desktop boots its reserved profile
   * itself, so the harness is never one of the panel's entries there.
   */
  surface?: DshSurface
  /** Other home-hosted state roots to report as panels; discovery finds the rest. */
  instanceRoots?: readonly string[]
  /** Test seam: this process's `$HHOSTED_HOME`; defaults to the environment. */
  envHome?: string | null
  /** Test seam: where `~/.home-hosted*` siblings are looked for; defaults to the user's home. */
  homeDir?: string
  settings: SettingsStore
  /** Test seam: run the home-hosted CLI without spawning it. */
  execCli?: (args: string[], env: Record<string, string | undefined>) => Promise<RunResult>
  /** Test seam: supply the boot ladder instead of probing the real OS. */
  createLadder?: () => BootLadderLike
  /** Test seam: hand the panel to an autostart entry without spawning a helper. */
  spawnActivation?: (stateDir: string, plan: ActivationPlan) => PanelControlResult
  /** The project the managed `dsh` row belongs to; defaults to this process's cwd. */
  projectDir?: string
  /** Test seam: resolve the running harness instead of reading this process. */
  resolveDsh?: (options: { dshHome: string, stateDir: string, projectDir?: string | null }) => Promise<DshLaunch | null>
  /** Test seam: the environment account resolution reads; defaults to this process's. */
  env?: Readonly<Record<string, string | undefined>>
  /** Test seam: this process's uid; defaults to `process.getuid()`. */
  uid?: number | null
  /** Test seam: the user database to resolve the entry's account against. */
  passwd?: readonly PasswdEntry[]
}

interface CachedClient {
  client: PanelClient
  until: number
}

interface LiveEntry {
  view: ServerEntryView
  config: ServerEntry
}

export class HomeHostedService extends Service {
  private clientCache: CachedClient | null = null
  /** The last token this service proved against a panel, so a poll does not re-probe it. */
  private tokenProof: { url: string, token: string, until: number } | null = null
  private tokenDetail = ''
  /** When a missing managed entry was last put back, so a poll cannot become a write loop. */
  private entryRecoveryAt = 0
  /** When a managed row was last re-pointed at the pinned dsh, for the same reason. */
  private commandRepairAt = 0
  /** The last panel inventory, so a model-step assembly never reads the disk. */
  private instanceCache: { at: number, list: InstanceView[] } | null = null
  private readonly snapshotsFile: string

  constructor(ctx: Context, private readonly options: HomeHostedServiceOptions) {
    super(ctx, 'homeHosted')
    this.snapshotsFile = path.join(options.stateDir, 'snapshots.json')
  }

  private projectDir(): string {
    return this.options.projectDir ?? process.cwd()
  }

  /**
   * The workspace this plugin manages. Fixed to the panel's own default: one
   * workspace is what its intent (reconcile, the harness entry, snapshots) is
   * about, and a setting for it bought nothing but a way to write into the wrong
   * one. Every other workspace is still reachable per call.
   */
  private managedWorkspace(): string {
    return DEFAULT_WORKSPACE
  }

  private async resolveDsh(dshHome: string, projectDir: string | null = this.projectDir()): Promise<DshLaunch | null> {
    return await (this.options.resolveDsh ?? (options => resolveDshLaunch(options)))({
      dshHome,
      stateDir: this.options.stateDir,
      projectDir,
    })
  }

  // -------------------------------------------------------------------------
  // Panels on this machine
  // -------------------------------------------------------------------------

  /**
   * The panel inventory, cached for a short while: the page polls status and
   * the prompt provider reads it at every assembly. `refresh` (or an expired
   * cache) re-reads the disk.
   */
  async instances(refresh = false): Promise<InstanceView[]> {
    if (refresh || this.instanceCache === null || Date.now() - this.instanceCache.at >= INSTANCES_CACHE_MS)
      return this.measureInstances()
    return this.instanceCache.list
  }

  /**
   * The inventory for a caller that cannot await — a prompt provider runs
   * synchronously before a model step. Discovery is synchronous too, so this
   * re-measures a stale cache in place and never blocks the step.
   */
  instancesNow(): InstanceView[] {
    if (this.instanceCache !== null && Date.now() - this.instanceCache.at < INSTANCES_CACHE_MS)
      return this.instanceCache.list
    return this.measureInstances()
  }

  private measureInstances(): InstanceView[] {
    const now = Date.now()
    try {
      this.instanceCache = {
        at: now,
        list: discoverInstances({
          managedHome: this.options.home,
          extraRoots: this.options.instanceRoots,
          envHome: this.options.envHome === undefined ? process.env.HHOSTED_HOME ?? null : this.options.envHome,
          homeDir: this.options.homeDir,
          hostingEntryId: this.selfEntryId(),
        }),
      }
    }
    catch {
      // An unreadable machine is an empty inventory, never a failed model step.
      this.instanceCache = { at: now, list: [] }
    }
    return this.instanceCache.list
  }

  /** The inventory as last measured, without touching the disk. */
  instancesSnapshot(): InstanceView[] {
    return this.instanceCache?.list ?? []
  }

  // -------------------------------------------------------------------------
  // Acting on another panel
  // -------------------------------------------------------------------------

  /**
   * The state root a call targets: the managed one unless it names another panel
   * discovery reported. A caller-supplied path is never acted on directly, so a
   * stray string cannot become a way to write anywhere on the disk.
   */
  private async targetHome(requested: unknown): Promise<{ home: string, foreign: boolean }> {
    if (requested === undefined || requested === null || requested === '')
      return { home: this.options.home, foreign: false }
    if (typeof requested !== 'string')
      throw new HomeHostedError('a panel target must be a state root path', 'INSTANCE_INVALID')
    if (requested.trim().length === 0)
      return { home: this.options.home, foreign: false }
    const home = canonicalPath(requested)
    if (home === canonicalPath(this.options.home))
      return { home: this.options.home, foreign: false }
    const instances = await this.instances()
    if (!instances.some(instance => instance.home === home && !instance.managed))
      throw new HomeHostedError(`"${requested}" is not a home-hosted panel this machine reports`, 'INSTANCE_UNKNOWN')
    return { home, foreign: true }
  }

  /**
   * How a call reaches another panel. `via` names it; without one the endpoint's
   * least invasive mechanism is used, which is the order the shared list keeps.
   */
  private mechanismFor(endpoint: RpcEndpoint, requested: unknown): ForeignMechanism {
    const allowed = FOREIGN_MECHANISMS[endpoint]
    if (allowed === undefined)
      throw new HomeHostedError(`"${endpoint}" cannot be aimed at another panel`, 'INSTANCE_UNSUPPORTED')
    if (requested === undefined || requested === null)
      return allowed[0] as ForeignMechanism
    if (typeof requested === 'string' && (allowed as readonly string[]).includes(requested))
      return requested as ForeignMechanism
    throw new HomeHostedError(
      `"${String(requested)}" is not a way to reach another panel for ${endpoint}; use one of ${allowed.join(', ')}`,
      'MECHANISM_UNSUPPORTED',
    )
  }

  /** Whether a token this plugin already holds for a panel still works. */
  private async foreignTokenWorks(home: string): Promise<boolean> {
    const runtime = readRuntime(home)
    if (runtime === null || runtime.url.length === 0)
      return false
    const stored = readStoredToken(this.options.stateDir, tokenSlot(home))
    return stored !== null && await verifyToken(runtime.url, stored)
  }

  /**
   * A client for another panel: the plugin's own credential for that state root,
   * minted and enrolled the first time it is needed, proved against the panel,
   * and replaced when the panel no longer accepts it.
   *
   * home-hosted keeps only a hash, so an existing token this plugin does not hold
   * can only be replaced — which is what choosing this mechanism means.
   */
  private async foreignClient(home: string): Promise<PanelClient> {
    const runtime = readRuntime(home)
    if (runtime === null || runtime.url.length === 0)
      throw new HomeHostedError(`no panel is running at ${home}, so its API cannot be used`, 'PANEL_UNAVAILABLE')
    const slot = tokenSlot(home)
    const exec = async (args: string[], env: Record<string, string | undefined>) => await this.cliExec(args, env)
    const stored = readStoredToken(this.options.stateDir, slot)
    if (stored !== null && await verifyToken(runtime.url, stored))
      return new PanelClient({ baseUrl: runtime.url, token: stored, workspace: this.managedWorkspace() })

    const enrolled = stored !== null || apiTokenEnrolled(home)
      ? await reclaimToken({ home, stateDir: this.options.stateDir, exec, slot })
      : await ensureToken({ home, stateDir: this.options.stateDir, exec, slot })
    if (enrolled.token === null)
      throw new HomeHostedError(enrolled.detail, 'TOKEN_UNAVAILABLE')
    return new PanelClient({ baseUrl: runtime.url, token: enrolled.token, workspace: this.managedWorkspace() })
  }

  /**
   * Another panel's own entries. Its managed workspace is not knowable from here,
   * so its default one is read and written.
   */
  private readForeignConfig(home: string, workspace: string = defaultWorkspace(home)): RawConfig {
    const read = readConfig(home, workspace)
    if (read.error !== null || read.raw === null)
      throw new HomeHostedError(read.error ?? `no servers config in ${home}`, 'CONFIG_UNREADABLE')
    return read.raw
  }

  /**
   * Every workspace a panel serves, with counts. The running panel answers with
   * live numbers; otherwise the registry plus each workspace's config file is
   * enough to name them and count their entries.
   */
  private async workspaceSummaries(home: string, foreign: boolean): Promise<WorkspaceSummary[]> {
    const registry = readWorkspaces(home)
    const fromFile: WorkspaceSummary[] = registry.workspaces.map(entry => ({
      id: entry.id,
      label: entry.label,
      servers: (readConfig(home, entry.id).raw?.servers ?? []).length,
      running: 0,
      source: 'file',
    }))
    try {
      const client = foreign
        ? (await this.foreignTokenWorks(home) ? await this.foreignClient(home) : null)
        : await this.tryClient()
      if (client !== null) {
        const live = await client.listWorkspaces()
        return live.map(entry => ({ id: entry.id, label: entry.label, servers: entry.serverCount, running: entry.runningCount, source: 'api' as const }))
      }
    }
    catch {
      // The files remain the best available truth.
    }
    return fromFile
  }

  /** Another panel's entries as its config holds them: live status needs its API token. */
  private listForeign(home: string, workspace: string = defaultWorkspace(home)): ServerEntryView[] {
    return (this.readForeignConfig(home, workspace).servers ?? []).map(entry => foreignView(entry, workspace))
  }

  /**
   * A workspace's entries read from disk, for when no panel client is available.
   * The page shows them with `status: 'unknown'`, which is the truth: nothing is
   * supervising them from this process's point of view.
   */
  private fileServers(home: string, workspace: string): { servers: ServerEntryView[], error: string | null } {
    const read = readConfig(home, workspace)
    return {
      servers: (read.raw?.servers ?? []).map(entry => foreignView(entry, workspace)),
      error: read.error,
    }
  }

  private createForeign(home: string, entry: ServerEntry, workspace: string = defaultWorkspace(home)): ServerEntryView {
    const raw = this.readForeignConfig(home, workspace)
    if (findEntry(raw, entry.id) !== null)
      throw new HomeHostedError(`"${entry.id}" already exists in ${serversFile(home, workspace)}`, 'DUPLICATE_SERVER')
    // The same two-phase add the managed path uses: that panel's watcher starts a
    // newly added `autostart` entry at once, while a changed definition is only
    // applied at that entry's next start.
    writeConfig(home, upsertEntry(raw, { ...entry, autostart: false }), this.writtenBy(home), workspace)
    const added = this.readForeignConfig(home, workspace)
    writeConfig(home, patchEntry(added, entry.id, { autostart: entry.autostart === true }), this.writtenBy(home), workspace)
    return this.writtenForeignEntry(home, entry.id, workspace)
  }

  private updateForeign(home: string, id: string, patch: ServerEntryPatch, workspace: string = defaultWorkspace(home)): ServerEntryView {
    const raw = this.readForeignConfig(home, workspace)
    if (findEntry(raw, id) === null)
      throw new HomeHostedError(`no server "${id}" exists in ${serversFile(home, workspace)}`, 'UNKNOWN_SERVER')
    // A patch never renames: the id is the key it was found by.
    const next = patchEntry(raw, id, { ...patch, id })
    writeConfig(home, next, this.writtenBy(home), workspace)
    return this.writtenForeignEntry(home, id, workspace)
  }

  /** What a write actually left on disk, never what it was asked to write. */
  private writtenForeignEntry(home: string, id: string, workspace: string = defaultWorkspace(home)): ServerEntryView {
    const entry = findEntry(this.readForeignConfig(home, workspace), id)
    if (entry === null)
      throw new HomeHostedError(`the write to ${serversFile(home, workspace)} did not take`, 'FOREIGN_WRITE_LOST')
    return foreignView(entry, workspace)
  }

  private deleteForeign(home: string, id: string, workspace: string = defaultWorkspace(home)): { id: string, home: string, via: 'file' } {
    const raw = this.readForeignConfig(home, workspace)
    if (findEntry(raw, id) === null)
      throw new HomeHostedError(`no server "${id}" exists in ${serversFile(home, workspace)}`, 'UNKNOWN_SERVER')
    writeConfig(home, removeConfigEntry(raw, id), this.writtenBy(home), workspace)
    return { id, home, via: 'file' }
  }

  /**
   * Start, stop or restart one entry through that panel's own CLI: this plugin
   * holds no API token for a panel it does not manage, and a config edit cannot
   * start anything. The CLI has no server restart, so a restart is a stop
   * followed by a start — a stop that is not followed by one is reported.
   */
  private async lifecycleForeign(home: string, action: 'start' | 'stop' | 'restart', id: string, workspace: string = defaultWorkspace(home)): Promise<{ home: string, workspace: string, id: string, action: string, via: 'cli' }> {
    const once = async (command: string): Promise<void> => {
      const result = await this.cliExec([command, id, '--workspace', workspace, '--home', home], { ...process.env, HHOSTED_HOME: home })
      if (result.code !== 0) {
        const output = [result.stderr, result.stdout, result.error].filter(part => typeof part === 'string' && part.trim().length > 0).join('\n').trim()
        throw new HomeHostedError(output.length > 0 ? output : `home-hosted ${command} ${id} exited ${String(result.code)}`, 'CLI_FAILED')
      }
    }

    if (action === 'restart') {
      await once('stop')
      await once('start')
    }
    else {
      await once(action)
    }
    return { home, workspace, id, action, via: 'cli' }
  }

  // -------------------------------------------------------------------------
  // Facts
  // -------------------------------------------------------------------------

  private runtime() {
    return readRuntime(this.options.home)
  }

  /** The entry id this very process was started as, when the panel supervises us. */
  selfEntryId(): string | null {
    const id = process.env.HHOSTED_SERVER_ID
    return id !== undefined && id.length > 0 ? id : null
  }

  /** What the config's `meta.writtenBy` names: the panel release when we can read it. */
  private writtenBy(home = this.options.home): string {
    return readRuntime(home)?.version ?? 'dsh-home-hosted'
  }

  private webServer(): { port: number | null } {
    const service = this.ctx.get('webServer') as { port?: unknown } | undefined
    const port = typeof service?.port === 'number' ? service.port : null
    return { port }
  }

  private cliCache: { prefer: 'pinned' | 'global', resolution: CliResolution, launcher: string | null, launcherVersion: string | null, until: number } | null = null

  /**
   * Resolve the preferred CLI, refresh the stable launcher a boot entry runs, and
   * preflight that launcher the same way the entry will invoke it.
   */
  private async cli(): Promise<{ resolution: CliResolution, launcher: string | null, launcherVersion: string | null }> {
    const prefer = this.options.settings.get().cli.prefer
    if (this.cliCache !== null && this.cliCache.until > Date.now() && this.cliCache.prefer === prefer)
      return this.cliCache
    const resolution = await resolveCli({ override: this.options.homeHostedCommand, prefer })
    let launcher: string | null = null
    let launcherVersion: string | null = null
    if (resolution.launch !== null) {
      launcher = writeLauncher({
        stateDir: this.options.stateDir,
        dshHome: dshHome(),
        resolvedEntry: resolution.launch.cliEntry ?? resolution.launch.shimPath ?? null,
        resolvedVersion: resolution.status.version,
        pluginRoot: pluginRoot(),
        minVersion: MIN_SUPPORTED_VERSION,
      }).path
      launcherVersion = await preflightLauncher(this.options.stateDir)
    }
    this.cliCache = { prefer, resolution, launcher, launcherVersion, until: Date.now() + 60_000 }
    return this.cliCache
  }

  private async panelControlDeps(): Promise<PanelControlDeps> {
    const { resolution } = await this.cli()
    const launch = resolution.launch
    const projectDir = process.env.HHOSTED_PROJECT ?? this.runtime()?.projectDir ?? null
    return {
      launch,
      home: this.options.home,
      projectDir,
      stateDir: this.options.stateDir,
      env: launch === null ? {} : homeHostedEnv({ home: this.options.home, projectDir }, launch),
      exec: this.options.execCli,
    }
  }

  private async cliExec(args: string[], env: Record<string, string | undefined>) {
    if (this.options.execCli !== undefined)
      return await this.options.execCli(args, env)
    const { resolution } = await this.cli()
    const launch = resolution.launch
    if (launch === null)
      throw new HomeHostedError(resolution.status.detail, 'CLI_NOT_FOUND')
    return await run(launch.program, [...launch.args, ...args], { env, timeoutMs: 30_000 })
  }

  // -------------------------------------------------------------------------
  // Panel
  // -------------------------------------------------------------------------

  /** The panel page showing this session's log, where its tokenised URL is. */
  panelLogUrl(): string | null {
    const url = this.runtime()?.url
    if (url === undefined || url.length === 0)
      return null
    // The workspace is part of the URL; the legacy `/logs` path would land on the
    // panel's default workspace, which is not necessarily the managed one.
    return `${url.replace(/\/+$/, '')}/w/${encodeURIComponent(this.managedWorkspace())}/logs?server=${encodeURIComponent(this.options.defaultEntryId)}`
  }

  /**
   * Relocate a pre-0.7 root into `.hh`. `up` does this on its own, but a person
   * looking at a root this plugin cannot write needs the one step that fixes it;
   * `migrate` is the CLI that does exactly that, non-interactively with `--yes`.
   */
  async migrateRoot(): Promise<PanelControlResult> {
    if (!isLegacyRoot(this.options.home))
      return { ok: true, detail: `${this.options.home} is already on the .hh layout` }
    const result = await this.cliExec(['migrate', '--yes', '--home', this.options.home], { ...process.env, HHOSTED_HOME: this.options.home })
    if (result.code !== 0) {
      const output = [result.stderr, result.stdout, result.error].filter(part => typeof part === 'string' && part.trim().length > 0).join('\n').trim()
      return { ok: false, detail: output.length > 0 ? output : `home-hosted migrate exited ${String(result.code)}` }
    }
    return { ok: true, detail: `${this.options.home} was moved to the .hh layout` }
  }

  /** The port the panel's settings hold, without touching a running panel. */
  private configuredPort(): number | null {
    const control = readGlobalSettings(this.options.home).raw?.control as { port?: unknown } | undefined
    return typeof control?.port === 'number' ? control.port : null
  }

  /** Write the chosen panel port into the state the panel boots from. */
  private applyPanelPort(): void {
    const port = this.options.settings.get().panel.port
    if (port === null || port === this.configuredPort())
      return
    setControl(this.options.home, { port }, this.writtenBy())
  }

  /** Whether this exact token was already proved against this exact panel. */
  private tokenProven(url: string, token: string): boolean {
    return this.tokenProof !== null && this.tokenProof.until > Date.now()
      && this.tokenProof.url === url && this.tokenProof.token === token
  }

  private proveToken(url: string, token: string): void {
    this.tokenProof = { url, token, until: Date.now() + 30_000 }
  }

  async panelStatus(): Promise<PanelStatus> {
    const runtime = this.runtime()
    const stored = readStoredToken(this.options.stateDir)
    const enrolledOnDisk = apiTokenEnrolled(this.options.home)
    const reachable = runtime !== null && (pidAlive(runtime.pid) || await probePanel(runtime.url))
    const answered = runtime !== null && await probePanel(runtime.url)

    // The token state is measured, not assumed: when the panel answers, the
    // plugin's own token is proved against it. A refusal is `stale`; a panel
    // that would not answer the API call leaves the state `unknown` rather than
    // claiming a measurement that was never taken.
    let token: PanelStatus['token'] = 'unknown'
    let tokenVerified = false
    if (answered) {
      if (stored === null) {
        token = enrolledOnDisk ? 'present' : 'absent'
      }
      else if (this.tokenProven(runtime.url, stored)) {
        token = 'enrolled'
        tokenVerified = true
      }
      else {
        const probe = await probeToken(runtime.url, stored, TOKEN_PROBE_TIMEOUT_MS)
        if (probe === 'ok') {
          token = 'enrolled'
          tokenVerified = true
          this.proveToken(runtime.url, stored)
        }
        else if (probe === 'refused') {
          token = 'stale'
          tokenVerified = true
        }
      }
    }

    // A token the panel refuses is not a write path, however present it is on disk.
    const writeVia: PanelStatus['writeVia'] = token === 'enrolled' ? 'api' : 'file'

    return {
      home: this.options.home,
      reachable: answered,
      configPort: this.configuredPort(),
      url: runtime?.url ?? null,
      version: runtime?.version ?? null,
      pid: runtime?.pid ?? null,
      writeVia,
      token,
      tokenVerified,
      detail: answered
        ? (token === 'enrolled'
            ? (this.tokenDetail || 'the panel is answering and this plugin holds a token')
            : token === 'stale'
              ? 'the panel refused this plugin\'s API token, so writes go straight to the workspace config file; regenerate the token'
              : token === 'present'
                ? 'the panel is answering, but home-hosted already holds an API token this plugin does not have'
                : token === 'absent'
                  ? 'the panel is answering but no API token is enrolled for it yet; writes go to the workspace config file until one is'
                  : 'the panel answered, but the plugin\'s token could not be checked')
        : (runtime === null
            ? 'no .hh/run.json: the panel is not running, so entries are written straight to the workspace config file'
            : token === 'present' || token === 'stale'
              ? 'the panel process is up but does not answer with this plugin\'s API token, so this page cannot reach it'
              : 'the panel process is alive but is not answering'),
    }
  }

  /**
   * Replace the panel's API token with a fresh one and prove it.
   *
   * home-hosted keeps only a hash, so a token this plugin does not hold cannot
   * be recovered: a new token replaces the old hash in one CLI write, and it is
   * proved against the answering panel before being reported.
   *
   * The panel is not required to be *answering*: a missing or refused token is a
   * common reason it cannot be reached at all, and refusing the repair for that
   * reason would leave no way out from the page. Only a panel that was never
   * started is refused — there is nothing to enrol a token against yet.
   */
  async reclaimPanelToken(): Promise<HomeHostedStatus> {
    const runtime = this.runtime()
    if (runtime === null) {
      throw new HomeHostedError(
        'the panel has not been started, so there is nothing to enrol a token against; start it first',
        'PANEL_UNAVAILABLE',
      )
    }
    const answering = await probePanel(runtime.url)

    const result = await reclaimToken({
      home: this.options.home,
      stateDir: this.options.stateDir,
      exec: (args, env) => this.cliExec(args, env),
    })
    // Whatever happened, nothing cached was built from the token in play now.
    this.clientCache = null
    this.tokenProof = null
    this.tokenDetail = result.detail
    if (result.token === null)
      throw new HomeHostedError(result.detail, 'TOKEN_RECLAIM_FAILED')

    if (!answering) {
      // Enrolled, but there is nothing to hand it to yet. The page says so
      // instead of claiming a verification it could not take.
      this.tokenDetail = `${result.detail}; the panel is not answering, so it could not be proved yet`
      return await this.status()
    }

    const probe = await probeToken(runtime.url, result.token, TOKEN_PROBE_TIMEOUT_MS)
    if (probe !== 'ok') {
      throw new HomeHostedError(
        probe === 'refused'
          ? 'a fresh token was enrolled, but the panel refused it; check the panel log before trying again'
          : 'a fresh token was enrolled, but the panel stopped answering before it could be verified',
        'TOKEN_RECLAIM_UNVERIFIED',
      )
    }
    this.proveToken(runtime.url, result.token)
    return await this.status()
  }

  private async tryClient(): Promise<PanelClient | null> {
    if (this.clientCache !== null && this.clientCache.until > Date.now())
      return this.clientCache.client
    const runtime = this.runtime()
    if (runtime === null || !(await probePanel(runtime.url)))
      return null

    const ensured = await ensureToken({
      home: this.options.home,
      stateDir: this.options.stateDir,
      exec: (args, env) => this.cliExec(args, env),
    })
    this.tokenDetail = ensured.detail
    if (ensured.token === null)
      return null
    if (!(await verifyToken(runtime.url, ensured.token)))
      return null

    const client = new PanelClient({ baseUrl: runtime.url, token: ensured.token, workspace: this.managedWorkspace() })
    this.clientCache = { client, until: Date.now() + 30_000 }
    this.proveToken(runtime.url, ensured.token)
    return client
  }

  private async requireClient(): Promise<PanelClient> {
    const client = await this.tryClient()
    if (client === null) {
      const status = await this.panelStatus()
      throw new HomeHostedError(status.detail, 'PANEL_UNAVAILABLE')
    }
    return client
  }

  // -------------------------------------------------------------------------
  // Snapshot bookkeeping
  // -------------------------------------------------------------------------

  /**
   * What an adopted entry looked like before this plugin touched it, keyed by id
   * inside the workspace those snapshots belong to. A file from another workspace
   * is ignored: ids repeat across workspaces, and restoring the wrong one would
   * rewrite an entry this plugin never adopted.
   */
  private snapshots(): Record<string, ServerEntry> {
    const raw = readJson<Record<string, unknown>>(this.snapshotsFile)
    if (raw === null)
      return {}
    if (raw.version === 2 && isRecordValue(raw.entries))
      return raw.workspace === this.managedWorkspace() ? raw.entries as Record<string, ServerEntry> : {}
    // A file from before workspaces: there was one workspace, and it was `default`.
    return this.managedWorkspace() === DEFAULT_WORKSPACE ? raw as Record<string, ServerEntry> : {}
  }

  private saveSnapshots(snapshots: Record<string, ServerEntry>): void {
    writeJsonAtomic(this.snapshotsFile, { version: 2, workspace: this.managedWorkspace(), entries: snapshots }, 0o600)
  }

  // -------------------------------------------------------------------------
  // Entries
  // -------------------------------------------------------------------------

  private async liveEntries(): Promise<Map<string, LiveEntry>> {
    const map = new Map<string, LiveEntry>()
    const client = await this.tryClient()
    if (client !== null) {
      try {
        for (const view of await client.listServers())
          map.set(view.id, { view, config: view.config })
        return map
      }
      catch {
        // fall through to the file, which is still the best available truth
      }
    }
    const workspace = this.managedWorkspace()
    const read = readConfig(this.options.home, workspace)
    for (const entry of read.raw?.servers ?? [])
      map.set(entry.id, { view: foreignView(entry, workspace), config: entry })
    return map
  }

  private async createEntry(intent: EntryIntent, patch: ServerEntryPatch): Promise<ServerEntry | null> {
    if (intent.id !== this.options.defaultEntryId)
      return null
    const harnessHome = process.env.DSH_HOME ?? dshHome()
    // State dir and harness home are the plugin's own, not the defaults: an
    // override has to point the launcher at the same place everything else is.
    const dsh = await this.resolveDsh(harnessHome)
    const { port } = this.webServer()
    const generated = buildDshEntry({
      id: intent.id,
      port,
      profile: detectProfile(process.argv, process.env),
      dshHome: harnessHome,
      launch: dsh,
      launcherPath: dsh?.launcherPath ?? null,
      projectDir: this.projectDir(),
    })
    return { ...generated, ...patch }
  }

  /**
   * An entry written before the launcher existed still runs a clone's build
   * output directly. Point it at the stable launcher, or the fix would only
   * ever apply to freshly created entries — the plugin never rewrites an
   * existing entry's command.
   */
  private async dshCommandRepair(live: ServerEntry | null): Promise<{ command: string, args: string[] } | null> {
    if (live === null || !needsLauncherRepair(live))
      return null
    const harnessHome = process.env.DSH_HOME ?? dshHome()
    const dsh = await this.resolveDsh(harnessHome)
    // A row this plugin created carries `{ id }` as its snapshot; one it merely
    // adopted keeps the person's own command unless that command is a bare name.
    const owned = isCreatedEntry(this.snapshots()[live.id])
    return launcherRepair(live, dsh, { ownedCommand: owned, projectDir: this.projectDir() })
  }

  private async writeOwned(intent: EntryIntent): Promise<void> {
    const live = (await this.liveEntries()).get(intent.id) ?? null
    const snapshots = this.snapshots()
    if (snapshots[intent.id] === undefined) {
      snapshots[intent.id] = live === null ? { id: intent.id } : snapshotOwned(live.config)
      this.saveSnapshots(snapshots)
    }

    const patch = ownedPatch(intent, live?.config ?? null)
    const repair = intent.id === this.options.defaultEntryId ? await this.dshCommandRepair(live?.config ?? null) : null
    const client = await this.tryClient()
    if (client !== null) {
      if (live !== null) {
        await client.updateServer(intent.id, { ...patch, ...(repair ?? {}) })
        return
      }
      const entry = await this.createEntry(intent, patch)
      if (entry === null) {
        throw new HomeHostedError(
          `no server "${intent.id}" exists; create it first, then this plugin can adopt its autostart and conflict policy`,
          'ENTRY_MISSING',
        )
      }
      await client.createServer(entry)
      return
    }

    const workspace = this.managedWorkspace()
    const read = readConfig(this.options.home, workspace)
    if (read.error !== null)
      throw new HomeHostedError(read.error, 'CONFIG_UNREADABLE')
    let raw = read.raw ?? {}
    if (findEntry(raw, intent.id) !== null) {
      writeConfig(this.options.home, patchEntry(raw, intent.id, { ...patch, ...(repair ?? {}) }), this.writtenBy(), workspace)
      return
    }

    const entry = await this.createEntry(intent, patch)
    if (entry === null)
      throw new HomeHostedError(`no server "${intent.id}" exists in ${serversFile(this.options.home, workspace)}`, 'ENTRY_MISSING')

    // While a panel is running, an external write is a real change and a newly
    // added autostart entry would be started at once. Adding it disabled and
    // flipping autostart in a second write makes that a changed definition
    // instead, which only takes effect at that entry's next start.
    if (await this.panelRunning()) {
      writeConfig(this.options.home, upsertEntry(raw, { ...entry, autostart: false }), this.writtenBy(), workspace)
      raw = readConfig(this.options.home, workspace).raw ?? raw
      writeConfig(this.options.home, patchEntry(raw, intent.id, { autostart: intent.autostart }), this.writtenBy(), workspace)
      return
    }

    writeConfig(this.options.home, upsertEntry(raw, entry), this.writtenBy(), workspace)
  }

  private async panelRunning(): Promise<boolean> {
    const runtime = this.runtime()
    return runtime !== null && (pidAlive(runtime.pid) || await probePanel(runtime.url))
  }

  /**
   * The refusal a harness-entry mutation gets in Desktop, or null when the
   * surface can manage one. Desktop boots its own reserved profile, so there is
   * nothing for a server entry to start: `dsh --profile desktop` is refused by
   * the CLI, and dsh has no separate Desktop binary — Desktop *is* the web
   * surface, carried in Electron. A row this plugin wrote there could only ever
   * crash-loop. Server management is untouched.
   */
  private desktopEntryRefusal(): HomeHostedError | null {
    if (this.options.surface !== 'desktop')
      return null
    return new HomeHostedError(
      `the "${this.options.defaultEntryId}" entry is available for dsh web only, and this is the dsh Desktop client. `
      + 'Desktop starts its own profile, so it is never one of the panel\'s server entries; server management is unaffected.',
      'DESKTOP_ENTRY_UNSUPPORTED',
    )
  }

  private async applyIntents(intents: EntryIntent[]): Promise<ManagedEntryStatus[]> {
    for (const raw of intents) {
      if (!ENTRY_ID_PATTERN.test(raw.id))
        throw new HomeHostedError(`"${raw.id}" is not a valid server id`, 'INVALID_ID')
      // Only the harness entry is surface-bound; every other id is an ordinary
      // server, which Desktop manages like any other surface. A *paused* intent
      // is still a write of that entry, so it is refused here too: leaving it
      // through would put the crash-looping row the surface exists to prevent
      // into the panel.
      if (raw.id === this.options.defaultEntryId) {
        const refusal = this.desktopEntryRefusal()
        if (refusal !== null)
          throw refusal
      }
      const requested: unknown = raw.onPortConflict
      if (requested !== undefined && requested !== null && !isOnPortConflict(requested))
        throw new HomeHostedError(
          `"${String(requested)}" is not a port-conflict policy; use one of ${ON_PORT_CONFLICT_POLICIES.join(', ')}`,
          'INVALID_POLICY',
        )
      const fallback = defaultIntent(raw.id)
      const intent: EntryIntent = {
        id: raw.id,
        autostart: raw.autostart === true,
        onPortConflict: isOnPortConflict(requested) ? requested : fallback.onPortConflict,
        stopKillPortHolders: raw.stopKillPortHolders ?? fallback.stopKillPortHolders,
        persistent: raw.persistent ?? fallback.persistent,
      }
      await this.writeOwned(intent)
      const current = this.options.settings.get()
      const entries = current.entries.filter(entry => entry.id !== intent.id)
      entries.push(intent)
      this.options.settings.update({
        // The page's toggle reads this flag, so managing the harness has to record
        // itself; restoring or removing that entry clears it again. A paused intent
        // (`autostart: false`) is not management, or the toggle could never go off.
        ...(intent.id === this.options.defaultEntryId ? { manageDsh: intent.autostart } : {}),
        entries,
      })
    }
    return await this.entriesStatus()
  }

  /**
   * Stop managing an entry: restore what it was when we only adopted it, or
   * remove it when this plugin created it. Removing an entry the panel
   * supervises stops that process — which may be this session.
   */
  private async removeManagedEntry(id: string): Promise<ManagedEntryStatus[]> {
    if (id === this.options.defaultEntryId) {
      const refusal = this.desktopEntryRefusal()
      if (refusal !== null)
        throw refusal
    }
    const snapshots = this.snapshots()
    const snapshot = snapshots[id]
    const adopted = snapshot !== undefined && Object.keys(snapshot).some(key => key !== 'id')
    if (adopted)
      return await this.restoreEntry(id)

    // Deleting this entry stops the process running this session, and nothing
    // would start it again — so "stop managing" pauses it instead: the entry
    // stays, it is simply no longer started for us.
    if (id === this.selfEntryId())
      return await this.pauseManagedEntry(id)

    const client = await this.tryClient()
    if (client !== null) {
      try {
        await client.deleteServer(id)
      }
      catch (error) {
        // Already gone is the outcome we wanted.
        const missing = error instanceof PanelError && (error.status === 404 || error.code === 'UNKNOWN_SERVER')
        if (!missing)
          throw error
      }
    }
    else {
      const read = readConfig(this.options.home, this.managedWorkspace())
      if (read.error !== null || read.raw === null)
        throw new HomeHostedError(read.error ?? 'the config file is unreadable', 'CONFIG_UNREADABLE')
      writeConfig(this.options.home, removeConfigEntry(read.raw, id), this.writtenBy(), this.managedWorkspace())
    }
    delete snapshots[id]
    this.saveSnapshots(snapshots)
    const current = this.options.settings.get()
    this.options.settings.update({
      // Only the harness entry drives the page's manage toggle.
      ...(id === this.options.defaultEntryId ? { manageDsh: false } : {}),
      entries: current.entries.filter(entry => entry.id !== id),
    })
    return await this.entriesStatus()
  }

  /** Turn off the autostart intent for one entry, keeping the entry itself. */
  private async pauseManagedEntry(id: string): Promise<ManagedEntryStatus[]> {
    const intent = this.options.settings.intentFor(id)
    await this.applyIntents([{ ...intent, autostart: false }])
    const current = this.options.settings.get()
    this.options.settings.update({
      ...(id === this.options.defaultEntryId ? { manageDsh: false } : {}),
      entries: current.entries,
    })
    return await this.entriesStatus()
  }

  /**
   * Drive the panel's own UI through its CLI, and report what is installed.
   *
   * `ui-switch --asset` is preferred over a local zip for an official UI: the
   * panel's own CLI picks the release for its version, matches the asset name
   * and downloads it, so nothing here has to reimplement a GitHub lookup or
   * guess which release belongs to the running panel.
   */
  async uiManage(action: UiAction, options: { file?: string, asset?: string, repo?: string, tag?: string } = {}, target?: string): Promise<UiResult> {
    const home = target ?? this.options.home
    const cli = action === 'status' ? null : await this.cli()

    const runUi = async (args: string[]): Promise<{ code: number | null, output: string }> => {
      const launch = cli?.resolution.launch ?? null
      if (launch === null)
        throw new HomeHostedError(cli?.resolution.status.detail ?? 'no home-hosted CLI could be resolved', 'CLI_NOT_FOUND')
      const full = [...launch.args, ...args, '--home', home]
      const env = { ...process.env, HHOSTED_HOME: home }
      const result = this.options.execCli !== undefined
        ? await this.options.execCli(full, env)
        : await run(launch.program, full, { env, timeoutMs: 300_000 })
      // A CLI that never started has no stdout to show, so its spawn error is the
      // only thing that explains the failure.
      const output = [result.error, result.stdout, result.stderr].filter(part => typeof part === 'string' && part.trim().length > 0).join('\n').trim()
      return { code: result.code, output }
    }

    interface ActiveUi { name: string | null, version: string | null, repo: string | null, tag: string | null }
    const active = (): ActiveUi | null => {
      const meta = readJson<{ name?: string, version?: string | null, repo?: string, tag?: string }>(path.join(home, '.ui', 'ui.json'))
      return meta === null ? null : { name: meta.name ?? null, version: meta.version ?? null, repo: meta.repo ?? null, tag: meta.tag ?? null }
    }

    const releaseFlags = (): string[] => [
      ...(options.repo === undefined ? [] : ['--repo', options.repo]),
      ...(options.tag === undefined ? [] : ['--tag', options.tag]),
    ]

    switch (action) {
      case 'status': {
        const ui = active()
        return { ok: true, ui, detail: ui === null ? 'the panel is using its stock UI' : `${ui.name ?? 'a custom UI'}${ui.version === null ? '' : ` ${ui.version}`}` }
      }
      case 'update': {
        const result = await runUi(['ui-update', '--yes', ...releaseFlags()])
        return { ok: result.code === 0, detail: result.code === 0 ? 'the panel UI is up to date' : 'the update did not run', ui: active(), output: result.output }
      }
      case 'revert': {
        const result = await runUi(['ui-revert'])
        return { ok: result.code === 0, detail: result.code === 0 ? 'back to the stock UI' : 'the revert did not run', ui: active(), output: result.output }
      }
      case 'switch': {
        const file = options.file?.trim()
        const asset = options.asset?.trim()
        if (file === undefined || file.length === 0) {
          if (asset === undefined || asset.length === 0)
            throw new HomeHostedError('switching the UI needs an asset name or a local zip', 'UI_SOURCE_REQUIRED')
          const result = await runUi(['ui-switch', '--asset', asset, '--yes', ...releaseFlags()])
          return { ok: result.code === 0, detail: result.code === 0 ? `installed the ${asset} UI` : 'the switch did not run', ui: active(), output: result.output }
        }
        if (!fs.existsSync(file))
          throw new HomeHostedError(`no file at ${file}`, 'UI_FILE_MISSING')
        const result = await runUi(['ui-switch', '--file', file, '--yes'])
        return { ok: result.code === 0, detail: result.code === 0 ? 'the UI was replaced' : 'the switch did not run', ui: active(), output: result.output }
      }
      default:
        throw new HomeHostedError(`unknown ui action "${String(action)}"`, 'UNKNOWN_UI_ACTION')
    }
  }

  private async restoreEntry(id: string): Promise<ManagedEntryStatus[]> {
    if (id === this.options.defaultEntryId) {
      const refusal = this.desktopEntryRefusal()
      if (refusal !== null)
        throw refusal
    }
    const live = (await this.liveEntries()).get(id) ?? null
    if (live === null)
      throw new HomeHostedError(`no server "${id}" exists`, 'ENTRY_MISSING')
    const snapshots = this.snapshots()
    // A restore without a snapshot would write schema defaults over the person's
    // own autostart and conflict policy, silently and irreversibly.
    if (snapshots[id] === undefined)
      throw new HomeHostedError(`"${id}" was never adopted by this plugin, so there is nothing to restore; adopt it first`, 'NOT_ADOPTED')
    const patch = restorePatch(live.config, snapshots[id] ?? null)
    const client = await this.tryClient()
    if (client !== null)
      await client.updateServer(id, patch)
    else {
      const read = readConfig(this.options.home, this.managedWorkspace())
      if (read.error !== null || read.raw === null)
        throw new HomeHostedError(read.error ?? 'the config file is unreadable', 'CONFIG_UNREADABLE')
      writeConfig(this.options.home, patchEntry(read.raw, id, patch), this.writtenBy(), this.managedWorkspace())
    }
    delete snapshots[id]
    this.saveSnapshots(snapshots)
    const current = this.options.settings.get()
    this.options.settings.update({
      ...(id === this.options.defaultEntryId ? { manageDsh: false } : {}),
      entries: current.entries.filter(entry => entry.id !== id),
    })
    return await this.entriesStatus()
  }

  async entriesStatus(): Promise<ManagedEntryStatus[]> {
    const settings = this.options.settings.get()
    const live = await this.liveEntries()
    const snapshots = this.snapshots()
    const ids = new Set<string>([this.options.defaultEntryId, ...settings.entries.map(entry => entry.id)])
    return [...ids].map((id) => {
      const intent = this.options.settings.intentFor(id)
      const entry = live.get(id) ?? null
      return {
        intent,
        exists: entry !== null,
        managed: snapshots[id] !== undefined,
        drift: entry === null ? ['missing entry'] : ownedDrift(entry.config, intent),
        live: entry?.view ?? null,
        snapshot: snapshots[id] ?? null,
      }
    })
  }

  // -------------------------------------------------------------------------
  // Boot autostart
  // -------------------------------------------------------------------------

  /**
   * Everything account resolution reads.
   *
   * The state paths matter: they name the person the panel belongs to, so a root
   * process launched at boot (a system unit that names no `User=`) can still be
   * told whose panel it is running.
   */
  /** This process's environment, from the test seam when one is supplied. */
  private processEnv(): Readonly<Record<string, string | undefined>> {
    return this.options.env ?? process.env
  }

  private accountFacts(): Omit<AccountInput, 'warn'> {
    return {
      env: this.processEnv() as Record<string, string | undefined>,
      uid: this.options.uid,
      ownerPaths: [this.options.home, this.options.stateDir],
      passwd: this.options.passwd,
    }
  }

  /**
   * The ladder resolves the account per provider, and the spec below resolves it
   * for the entry's environment. Both are handed the *same* facts, so the `User=`
   * line and the `HOME=` line can never describe two different people.
   */
  private ladder(): BootLadderLike {
    if (this.options.createLadder !== undefined)
      return this.options.createLadder()
    return createBootLadder(this.accountFacts())
  }

  private async bootSpec(): Promise<BootSpec | null> {
    const { resolution, launcher } = await this.cli()
    const launch = resolution.launch
    if (launch === null)
      return null
    const runtime = this.runtime()
    // The account a system entry hands the panel to, resolved from the login that
    // elevated (or this process's own), never from `$USER`: under `sudo` the
    // environment says *root*, which is how a system unit came to run the panel as
    // root. A root answer travels as `root: true` so providers refuse to write it.
    const account = accountOf(this.accountFacts())
    const spec = buildHomeHostedBootSpec(
      {
        home: this.options.home,
        projectDir: process.env.HHOSTED_PROJECT ?? runtime?.projectDir ?? null,
        version: runtime?.version ?? null,
      },
      launch,
      {
        stateDir: this.options.stateDir,
        unitName: bootUnitName(this.options.stateDir),
        // `undefined` when no account was resolved: the entry then runs as this
        // process (or as root), and this process's own HOME is the right one. A
        // spec that merely repeats this environment stays byte-identical, so
        // reconcile does not rewrite the entry on every start.
        accountHome: account === null ? undefined : account.home,
        env: this.processEnv(),
      },
    )

    // The entry runs the stable launcher, not the pinned node_modules path: that
    // path carries a version and a peer hash, and moves on the next install.
    if (launcher !== null) {
      const cliArgs = spec.args.slice(launch.args.length)
      if (process.platform === 'win32') {
        spec.command = process.execPath
        spec.args = [launcher, ...cliArgs]
      }
      else {
        spec.command = launcher
        spec.args = cliArgs
      }
    }
    return spec
  }

  async bootStatus(mechanism?: BootMechanism): Promise<BootStatus> {
    const platform: BootStatus['platform'] = process.platform === 'linux'
      ? 'linux'
      : process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'win32' : 'other'
    const spec = await this.bootSpec()
    if (spec === null) {
      return {
        platform,
        mechanism: null,
        recommended: null,
        state: 'unsupported',
        bootCapable: false,
        privileged: false,
        unitPath: null,
        commands: [],
        detail: 'no home-hosted CLI is available, so no boot entry can be generated; install the plugin with its dependencies',
        candidates: [],
      }
    }
    const settings = this.options.settings.get()
    const requested = mechanism ?? (settings.autostart.mechanism === 'auto' ? undefined : settings.autostart.mechanism)
    return await this.ladder().status(spec, requested)
  }

  async installBoot(mechanism?: BootMechanism): Promise<{ result: BootInstallResult, status: BootStatus }> {
    const spec = await this.bootSpec()
    if (spec === null)
      throw new HomeHostedError((await this.cli()).resolution.status.detail, 'CLI_NOT_FOUND')

    // Read what the panel is doing *before* the install: this decides whether the
    // entry has to be started, and whether that start must stop anything first.
    const panel = await this.panelStatus()
    const before = await this.bootStatus(mechanism)
    const result = await this.ladder().install(spec, mechanism)
    if (result.ok)
      await this.retireLegacyBootEntry(spec, mechanism)
    const installed = mechanism ?? result.mechanism ?? null
    const handover = result.ok
      ? await this.bootHandoverPlan(spec, installed ?? undefined, panel, before.mechanism)
      : { detail: null, commands: [], stateDir: null, plan: null, display: [] }

    const detail = [result.detail, handover.detail].filter((line): line is string => line !== null).join('; ')
    const commands = [...result.commands, ...handover.commands]
    const current = this.options.settings.get().autostart
    this.options.settings.update({
      autostart: {
        // The preference follows the outcome for a real install, and the last
        // attempt is recorded either way so a failure is visible after a reload.
        enabled: result.ok ? true : current.enabled,
        mechanism: result.ok
          ? (mechanism ?? result.mechanism ?? current.mechanism)
          : current.mechanism,
        lastAttempt: {
          ok: result.ok,
          action: 'install',
          mechanism: result.mechanism ?? mechanism ?? null,
          detail,
          commands,
          at: Date.now(),
        },
      },
    })

    // Only now, with the intent already on disk: the helper stops the panel, and
    // this process may not survive to write anything after that.
    if (handover.plan !== null && handover.stateDir !== null) {
      const spawned = (this.options.spawnActivation ?? spawnActivation)(handover.stateDir, handover.plan)
      this.clientCache = null
      this.tokenProof = null
      return {
        result: {
          ...result,
          detail: `${detail}; ${spawned.detail}`,
          // A helper that never started leaves the panel up, so a person needs the
          // exact steps to do it by hand.
          commands: spawned.ok ? commands : [...commands, ...handover.display],
        },
        status: await this.bootStatus(mechanism),
      }
    }

    return {
      result: { ...result, detail, commands },
      status: await this.bootStatus(mechanism),
    }
  }

  /**
   * The hand-over this install needs, if any: the plan for a detached helper, or
   * just the note explaining why the panel is being left alone.
   *
   * An install alone proves nothing: the panel the plugin drove keeps running, so
   * nothing shows whether the entry would ever start one. Starting it is the only
   * way to know. Nothing is spawned here — the caller persists the intent first,
   * because the helper stops the panel and this process may not outlive it.
   *
   * When the mechanism cannot start anything (a `Run` value, a `.desktop` file the
   * session reads at login), nothing is stopped: leaving a working panel up beats
   * killing it for an entry that would not bring it back.
   */
  private async bootHandoverPlan(
    spec: BootSpec,
    mechanism: BootMechanism | undefined,
    panel: PanelStatus,
    previousMechanism: BootMechanism | null,
  ): Promise<{ detail: string | null, commands: string[], stateDir: string | null, plan: ActivationPlan | null, display: string[] }> {
    const activation = await this.ladder().activate(spec, mechanism, previousMechanism)
    if (activation === null) {
      return {
        detail: panel.reachable
          ? `${mechanism ?? 'this mechanism'} cannot start the panel itself, so it was left running rather than stopped with nothing to bring it back`
          : null,
        commands: [],
        stateDir: null,
        plan: null,
        display: [],
      }
    }

    if (!panel.reachable) {
      return {
        detail: 'no panel is answering, so the entry was not started now; it starts the panel at boot or login',
        commands: [],
        stateDir: null,
        plan: null,
        display: [],
      }
    }
    // A panel already running under this mechanism is where this is trying to
    // get to; stopping it would only interrupt a working panel.
    if (previousMechanism !== null && previousMechanism === mechanism) {
      return {
        detail: `the panel is already running under ${mechanism}, so it was left alone`,
        commands: [],
        stateDir: null,
        plan: null,
        display: [],
      }
    }

    const deps = await this.panelControlDeps()
    if (deps.launch === null)
      throw new HomeHostedError((await this.cli()).resolution.status.detail, 'CLI_NOT_FOUND')

    const retire = activation.retired.length > 0 ? `; retiring ${activation.retired.join(', ')}` : ''
    return {
      detail: `handing the panel to ${mechanism ?? 'the entry'} now; this page disconnects and comes back when it answers${retire}`,
      commands: [],
      stateDir: deps.stateDir,
      display: [...activation.display, ...activation.retireDisplay],
      plan: {
        commands: activation.commands,
        requires: activation.requires.commands,
        files: activation.requires.files,
        // The CLI's own `down`, never the mechanism's `restart`: home-hosted
        // refuses to start a second panel while `run.json` names a live pid, so
        // the old one has to be gone first or the entry just fails while the
        // orphan keeps the port.
        stop: [...deps.launch.args, 'down', '--home', deps.home],
        detach: activation.stop,
        oldPid: panel.pid,
        retire: activation.retire,
        logPath: activationLogPath(deps.stateDir),
      },
    }
  }

  async uninstallBoot(mechanism?: BootMechanism): Promise<{ result: BootInstallResult, status: BootStatus }> {
    const spec = await this.bootSpec()
    if (spec === null)
      throw new HomeHostedError((await this.cli()).resolution.status.detail, 'CLI_NOT_FOUND')
    const result = await this.ladder().uninstall(spec, mechanism)
    if (result.ok)
      await this.retireLegacyBootEntry(spec, mechanism)
    const current = this.options.settings.get().autostart
    this.options.settings.update({
      autostart: {
        ...current,
        enabled: result.ok ? false : current.enabled,
        lastAttempt: {
          ok: result.ok,
          action: 'uninstall',
          mechanism: result.mechanism ?? mechanism ?? null,
          detail: result.detail,
          commands: result.commands,
          at: Date.now(),
        },
      },
    })
    return { result, status: await this.bootStatus(mechanism) }
  }

  /**
   * Remove the pre-per-instance artifact once this state root has its own.
   *
   * An install that used to write `home-hosted` now writes `home-hosted-<hash>`,
   * and a machine left with both would autostart the panel twice — or keep
   * starting it from an entry the page no longer reports. Only an artifact
   * carrying this plugin's marker is touched, so somebody else's unit survives.
   */
  private async retireLegacyBootEntry(spec: BootSpec, mechanism?: BootMechanism): Promise<void> {
    if (spec.unitName === LEGACY_BOOT_UNIT_NAME)
      return
    const legacy = { ...spec, unitName: LEGACY_BOOT_UNIT_NAME }
    try {
      const status = await this.ladder().status(legacy, mechanism)
      if (status.unitPath === null || status.state === 'not-installed' || status.state === 'unsupported')
        return
      if (!fs.existsSync(status.unitPath))
        return
      await this.ladder().uninstall(legacy, status.mechanism ?? mechanism)
    }
    catch {
      // A legacy entry we cannot retire is reported by the boot status the page
      // reads; failing the install over it would be worse.
    }
  }

  // -------------------------------------------------------------------------
  // Panel lifecycle
  // -------------------------------------------------------------------------

  /** Out-of-the-box start: run the preferred CLI's `up`, which detaches itself. */
  async startPanelNow(): Promise<PanelControlResult> {
    const { resolution } = await this.cli()
    const deps = await this.panelControlDeps()
    if (deps.launch === null)
      throw new HomeHostedError(resolution.status.detail, 'CLI_NOT_FOUND')
    const runtime = this.runtime()
    if (runtime !== null && await probePanel(runtime.url)) {
      return { ok: true, detail: 'a panel is already answering', url: runtime.url, version: runtime.version }
    }
    this.applyPanelPort()
    const result = await startPanelProcess(deps)
    this.clientCache = null
    return result
  }

  /**
   * Stop the panel the plugin drives, and every server it supervises with it.
   *
   * Deliberately not a replacement for the takeover guard: stopping is safe to
   * lose (an `autostart` entry comes back), while replacing is not. If this
   * process is one of those servers the answer may never arrive, so the page
   * treats a dropped call as "the panel is stopping" rather than a failure.
   */
  async stopPanelNow(): Promise<PanelControlResult> {
    const { resolution } = await this.cli()
    const runtime = this.runtime()
    if (runtime === null || !await probePanel(runtime.url)) {
      return { ok: true, detail: 'no panel is answering, so there was nothing to stop' }
    }
    const deps = await this.panelControlDeps()
    if (deps.launch === null)
      throw new HomeHostedError(resolution.status.detail, 'CLI_NOT_FOUND')
    const result = await stopPanelProcess(deps)
    this.clientCache = null
    this.tokenProof = null
    return result
  }

  /**
   * Replace an answering panel with the preferred copy.
   *
   * That stops the servers the old panel supervises — this process included — so
   * the work is handed to a detached helper and the guard demands that this
   * session is an adopted, autostarting entry the new panel will bring back.
   */
  async takeoverPanel(force = false): Promise<PanelControlResult> {
    const { resolution } = await this.cli()
    const deps = await this.panelControlDeps()
    if (deps.launch === null)
      throw new HomeHostedError(resolution.status.detail, 'CLI_NOT_FOUND')

    const runtime = this.runtime()
    if (runtime === null || !(await probePanel(runtime.url)))
      return await this.startPanelNow()

    if (runtime.version !== null && resolution.status.version !== null && runtime.version === resolution.status.version) {
      return { ok: true, detail: `the answering panel is already ${runtime.version}`, url: runtime.url, version: runtime.version }
    }

    if (!force) {
      const id = this.selfEntryId()
      const live = id === null ? null : (await this.liveEntries()).get(id) ?? null
      if (id === null || live === null || live.config.autostart !== true) {
        throw new HomeHostedError(
          'replacing the panel stops every server it supervises, including this session, and nothing would start it again: '
          + 'adopt this entry with autostart first, or pass force',
          'TAKEOVER_UNSAFE',
        )
      }
    }

    return spawnTakeover(deps, runtime.pid)
  }

  /** Install the pinned range globally, so the `global` preference has a copy to run. */
  async installGlobalCli(): Promise<PanelControlResult & { output?: string }> {
    const result = await installGlobal(EXPECTED_RANGE)
    this.cliCache = null
    return { ok: result.ok, detail: result.detail, output: result.output }
  }

  /** Re-assert an entry that is already installed: a node or CLI upgrade moves the
   * paths a unit was written with, and the fix is to rewrite it.
   *
   * Never installs one that is not there. Installing is a deliberate act — it can
   * need root and it makes this machine start something at boot — so it happens on
   * an explicit click or an approved tool call, not as a side effect of startup.
   */
  async reconcile(): Promise<void> {
    // Desktop boots its own profile, so there is no harness entry to put back or
    // re-point. The panel's own autostart is a separate thing and still applies.
    if (this.options.surface === 'desktop') {
      await this.repairBootEntry()
      await this.migrateBootEntryName()
      return
    }
    // A managed entry that someone deleted (by mistake, from the panel or by hand)
    // stays "managed" in settings with nothing to manage, which is the state the
    // page reports as a missing entry. Recreate it — the toggle is the intent.
    await this.ensureManagedEntry()
    await this.repairManagedCommand()
    await this.repairBootEntry()
    await this.migrateBootEntryName()
  }

  /**
   * An upgrade from a release that named every artifact `home-hosted` leaves
   * that one behind while this state root now writes its own name. Once our own
   * artifact is in place, the old one is retired — otherwise the machine
   * autostarts the panel twice, or from an entry the page no longer reports.
   */
  private async migrateBootEntryName(): Promise<void> {
    if (!this.options.settings.get().autostart.enabled)
      return
    const spec = await this.bootSpec()
    if (spec === null || spec.unitName === LEGACY_BOOT_UNIT_NAME)
      return
    try {
      const own = await this.bootStatus()
      if (own.state !== 'enabled-running' && own.state !== 'enabled-failing' && own.state !== 'installed-disabled')
        return
      await this.retireLegacyBootEntry(spec, own.mechanism ?? undefined)
    }
    catch {
      // reported by the boot status the page reads
    }
  }

  /**
   * Put back a managed entry that no longer exists, while its intent still wants
   * autostart. A paused intent is a deliberate stop and is left alone.
   *
   * Called from startup `reconcile()` as well as the status read, because a person
   * who deletes the entry from the panel is looking at the page right then — not
   * at the next plugin start. A failed attempt is not repeated for a while, so a
   * config that cannot be written does not turn every poll into a write.
   */
  private async ensureManagedEntry(): Promise<void> {
    const { settings } = this.options
    const id = this.options.defaultEntryId
    if (this.options.surface === 'desktop')
      return
    if (!settings.get().manageDsh || !settings.intentFor(id).autostart)
      return
    // Claim the attempt before the first await, so two status calls racing each
    // other cannot both decide to create the same entry.
    const now = Date.now()
    if (now - this.entryRecoveryAt < ENTRY_RECOVERY_INTERVAL_MS)
      return
    this.entryRecoveryAt = now
    if ((await this.entriesStatus()).every(entry => entry.intent.id !== id || entry.exists))
      return
    try {
      await this.writeOwned({ ...settings.intentFor(id), autostart: true })
    }
    catch {
      // an unwritable config is reported by the status the page reads
    }
  }

  /**
   * Re-point a managed `dsh` row that runs the wrong dsh.
   *
   * A row created before the launcher existed, or by an older release that took
   * whatever PATH answered, keeps starting that copy — and no click would fix
   * it, because the plugin only writes the row when the toggle is applied. So
   * the drift is repaired where the entry's existence is already checked, under
   * the same throttle, and only for a row this plugin owns.
   */
  private async repairManagedCommand(): Promise<void> {
    const id = this.options.defaultEntryId
    if (this.options.surface === 'desktop')
      return
    if (!this.options.settings.get().manageDsh || !this.options.settings.intentFor(id).autostart)
      return
    const now = Date.now()
    // Its own throttle: the entry-recovery one is claimed by every status read,
    // so sharing it would mean this repair never gets a turn.
    if (now - this.commandRepairAt < ENTRY_RECOVERY_INTERVAL_MS)
      return
    const live = (await this.liveEntries()).get(id)?.config ?? null
    if (live === null || this.snapshots()[id] === undefined || !needsLauncherRepair(live))
      return
    const repair = await this.dshCommandRepair(live)
    if (repair === null)
      return
    this.commandRepairAt = now
    try {
      await this.writeOwned({ ...this.options.settings.intentFor(id), autostart: true })
    }
    catch {
      // reported by the status the page reads
    }
  }

  /** Re-assert the boot entry when the OS still has it but it stopped working. */
  private async repairBootEntry(): Promise<void> {
    if (!this.options.settings.get().autostart.enabled)
      return
    const status = await this.bootStatus()
    if (status.state !== 'enabled-failing' && status.state !== 'installed-disabled')
      return
    // Belt on top of the probe: a file-backed entry is only repaired when the file
    // is actually there, so a reporting slip can never turn startup into an install.
    const fileBacked = status.mechanism === 'systemd-user'
      || status.mechanism === 'systemd-system'
      || status.mechanism === 'xdg-autostart'
      || status.mechanism === 'launchd-agent'
      || status.mechanism === 'launchd-daemon'
    if (fileBacked && (status.unitPath === null || !fs.existsSync(status.unitPath)))
      return
    // `enabled-failing` is exactly what a system unit that runs the panel as root
    // looks like once a server refuses to run as root, so this repair now rewrites
    // it with the account resolved above. A *working* entry is deliberately not
    // touched: re-installing stops the panel and hands it to the entry, which is a
    // person's decision, not a startup side effect — and the status detail names
    // the wrong account so the page's install button is an informed choice.
    try {
      await this.installBoot()
    }
    catch {
      // a failed repair is reported by the status the page reads
    }
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  async status(refresh = false): Promise<HomeHostedStatus> {
    // Resolve the client first: enrolling a token changes which write path is
    // available, and the page should see the state after that, not before. A
    // failure here is not a failed read — the page polls this, and a mistyped
    // `homeHostedCommand` must degrade to the config file rather than blank it.
    let client: PanelClient | null = null
    let clientError: string | null = null
    try {
      client = await this.tryClient()
    }
    catch (error) {
      clientError = error instanceof Error ? error.message : String(error)
    }
    const panel = await this.panelStatus()
    const { resolution, launcher, launcherVersion } = await this.cli()
    const cliDetail = resolution.status.detail
    const panelVersion = this.runtime()?.version ?? null
    const cli = {
      ...resolution.status,
      launcherPath: launcher,
      launcherVersion,
      // A panel left running from an older install is the usual reason to see
      // two versions on this page; say so instead of leaving it ambiguous.
      detail: panelVersion !== null && resolution.status.version !== null && panelVersion !== resolution.status.version
        ? `${cliDetail}; the running panel is ${panelVersion}`
        : cliDetail,
    }
    let servers: ServerEntryView[] = []
    let lastError: string | null = null
    if (client !== null) {
      try {
        servers = await client.listServers(this.managedWorkspace())
      }
      catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }
    }
    else {
      if (panel.reachable)
        lastError = clientError ?? panel.detail
      // No client: the workspace's own file is still the best available truth,
      // and it is what the `source: 'file'` counts are read from.
      const read = this.fileServers(this.options.home, this.managedWorkspace())
      servers = read.servers
      if (read.error !== null)
        lastError ??= read.error
    }

    return {
      defaultEntryId: this.options.defaultEntryId,
      surface: this.options.surface ?? 'web',
      workspace: this.managedWorkspace(),
      workspaces: await this.workspaceSummaries(this.options.home, false).catch(() => []),
      legacyRoot: isLegacyRoot(this.options.home),
      panel,
      panelRoot: this.options.home,
      panelRootSource: this.options.panelHomeSource ?? 'instance',
      bootUnitName: bootUnitName(this.options.stateDir),
      instances: await this.instances(refresh),
      boot: await this.bootStatus(),
      // A deleted managed entry is put back here as well as at startup: whoever
      // deleted it is looking at the page that reports it missing.
      entries: await this.ensureManagedEntry()
        .then(async () => await this.repairManagedCommand())
        .then(async () => await this.entriesStatus()),
      servers,
      settings: this.options.settings.get(),
      cli,
      lastError,
    }
  }

  // -------------------------------------------------------------------------
  // Endpoint dispatch
  // -------------------------------------------------------------------------

  /**
   * Which workspace an endpoint call acts on. A caller may name any workspace the
   * panel serves; omitted means the one this plugin manages, which for another
   * panel is its default.
   */
  private callWorkspace(input: Record<string, unknown>, home: string, foreign: boolean): string {
    const named = typeof input.workspace === 'string' ? input.workspace.trim() : ''
    if (named.length > 0) {
      if (!isWorkspaceId(named))
        throw new HomeHostedError(`"${named}" is not a workspace id (expected ^[a-z0-9][a-z0-9_-]*$)`, 'INVALID_WORKSPACE')
      return named
    }
    return foreign ? defaultWorkspace(home) : this.managedWorkspace()
  }

  async call(endpoint: RpcEndpoint, payload: unknown): Promise<unknown> {
    const input = (payload ?? {}) as Record<string, unknown>
    // A target names a panel; an endpoint with no way to reach another one must
    // refuse it rather than quietly act somewhere else.
    if (typeof input.home === 'string' && input.home.trim().length > 0 && FOREIGN_MECHANISMS[endpoint] === undefined) {
      throw new HomeHostedError(
        `"${endpoint}" is about the panel this plugin manages and cannot be aimed at another one`,
        'INSTANCE_UNSUPPORTED',
      )
    }
    switch (endpoint) {
      case 'status':
        return await this.status(input.refresh === true)

      case 'settings.update': {
        const patch = (input.patch ?? {}) as Parameters<SettingsStore['update']>[0]
        this.options.settings.update(patch)
        return await this.status()
      }

      case 'panel.migrate':
        return await this.migrateRoot()

      case 'workspaces.list': {
        const target = await this.targetHome(input.home)
        return await this.workspaceSummaries(target.home, target.foreign)
      }

      case 'servers.list': {
        const target = await this.targetHome(input.home)
        const workspace = this.callWorkspace(input, target.home, target.foreign)
        if (!target.foreign) {
          // A panel that is not answering is still a readable config: the page's
          // degraded view must not turn into an empty list.
          const client = await this.tryClient()
          return client === null ? this.fileServers(target.home, workspace).servers : await client.listServers(workspace)
        }
        const via = this.mechanismFor('servers.list', input.via)
        // A read never mints a credential: it uses one this plugin already holds
        // for that panel, and otherwise reads the config file it can always read.
        if (via === 'api' || (input.via === undefined && await this.foreignTokenWorks(target.home)))
          return await (await this.foreignClient(target.home)).listServers(workspace)
        return this.listForeign(target.home, workspace)
      }

      case 'servers.get':
        return await (await this.requireClient()).getServer(String(input.id), this.callWorkspace(input, this.options.home, false))

      case 'servers.create': {
        const entry = input.entry as ServerEntry
        if (typeof entry?.id !== 'string' || !ENTRY_ID_PATTERN.test(entry.id))
          throw new HomeHostedError('a server entry needs an id matching ^[a-z0-9][a-z0-9_-]*$', 'INVALID_ID')
        const target = await this.targetHome(input.home)
        const workspace = this.callWorkspace(input, target.home, target.foreign)
        if (!target.foreign)
          return await (await this.requireClient()).createServer(entry, workspace)
        return this.mechanismFor('servers.create', input.via) === 'api'
          ? await (await this.foreignClient(target.home)).createServer(entry, workspace)
          : this.createForeign(target.home, entry, workspace)
      }

      case 'servers.update': {
        const target = await this.targetHome(input.home)
        const id = String(input.id)
        const patch = (input.patch ?? {}) as ServerEntryPatch
        const workspace = this.callWorkspace(input, target.home, target.foreign)
        if (!target.foreign)
          return await (await this.requireClient()).updateServer(id, patch, workspace)
        return this.mechanismFor('servers.update', input.via) === 'api'
          ? await (await this.foreignClient(target.home)).updateServer(id, patch, workspace)
          : this.updateForeign(target.home, id, patch, workspace)
      }

      case 'servers.delete': {
        const id = String(input.id)
        const target = await this.targetHome(input.home)
        const workspace = this.callWorkspace(input, target.home, target.foreign)
        if (target.foreign) {
          return this.mechanismFor('servers.delete', input.via) === 'api'
            ? await (await this.foreignClient(target.home)).deleteServer(id, workspace).then(() => ({ id, workspace, home: target.home, via: 'api' as const }))
            : this.deleteForeign(target.home, id, workspace)
        }
        if (id === this.selfEntryId()) {
          throw new HomeHostedError(
            `"${id}" is the entry this very process runs as, and deleting it stops this session; `
            + 'pause it (autostart off) or restore it instead',
            'SELF_ENTRY',
          )
        }
        await (await this.requireClient()).deleteServer(id, workspace)
        return { id, workspace }
      }

      case 'servers.start': {
        const target = await this.targetHome(input.home)
        const id = String(input.id)
        const workspace = this.callWorkspace(input, target.home, target.foreign)
        if (target.foreign) {
          if (this.mechanismFor('servers.start', input.via) === 'api') {
            await (await this.foreignClient(target.home)).startServer(id, workspace)
            return { home: target.home, workspace, id, action: 'start', via: 'api' }
          }
          return await this.lifecycleForeign(target.home, 'start', id, workspace)
        }
        await (await this.requireClient()).startServer(id, workspace)
        return await this.entriesStatus()
      }

      case 'servers.stop': {
        const target = await this.targetHome(input.home)
        const id = String(input.id)
        const workspace = this.callWorkspace(input, target.home, target.foreign)
        if (target.foreign) {
          if (this.mechanismFor('servers.stop', input.via) === 'api') {
            await (await this.foreignClient(target.home)).stopServer(id, workspace)
            return { home: target.home, workspace, id, action: 'stop', via: 'api' }
          }
          return await this.lifecycleForeign(target.home, 'stop', id, workspace)
        }
        await (await this.requireClient()).stopServer(id, workspace)
        return await this.entriesStatus()
      }

      case 'servers.restart': {
        const target = await this.targetHome(input.home)
        const id = String(input.id)
        const workspace = this.callWorkspace(input, target.home, target.foreign)
        if (target.foreign) {
          if (this.mechanismFor('servers.restart', input.via) === 'api') {
            await (await this.foreignClient(target.home)).restartServer(id, workspace)
            return { home: target.home, workspace, id, action: 'restart', via: 'api' }
          }
          return await this.lifecycleForeign(target.home, 'restart', id, workspace)
        }
        await (await this.requireClient()).restartServer(id, workspace)
        return await this.entriesStatus()
      }

      case 'servers.freePort':
        return await (await this.requireClient()).freePort(String(input.id), this.callWorkspace(input, this.options.home, false))

      case 'entries.apply': {
        const intents = Array.isArray(input.intents) ? input.intents as EntryIntent[] : []
        return await this.applyIntents(intents)
      }

      case 'entries.remove':
        return await this.removeManagedEntry(String(input.id))

      case 'entries.restore':
        return await this.restoreEntry(String(input.id))

      case 'ui.manage': {
        const target = await this.targetHome(input.home)
        if (target.foreign)
          this.mechanismFor('ui.manage', input.via)
        return await this.uiManage(
          input.action as UiAction,
          {
            file: typeof input.file === 'string' ? input.file : undefined,
            asset: typeof input.asset === 'string' ? input.asset : undefined,
            repo: typeof input.repo === 'string' ? input.repo : undefined,
            tag: typeof input.tag === 'string' ? input.tag : undefined,
          },
          target.foreign ? target.home : undefined,
        )
      }

      case 'boot.install':
        return await this.installBoot(input.mechanism as BootMechanism | undefined)

      case 'boot.uninstall':
        return await this.uninstallBoot(input.mechanism as BootMechanism | undefined)

      case 'boot.verify':
        return await this.bootStatus()

      case 'panel.start':
        return await this.startPanelNow()

      case 'panel.stop':
        return await this.stopPanelNow()

      case 'panel.takeover':
        return await this.takeoverPanel(input.force === true)

      case 'panel.reclaimToken':
        return await this.reclaimPanelToken()

      case 'cli.installGlobal':
        return await this.installGlobalCli()

      default:
        throw new HomeHostedError(`unknown endpoint "${String(endpoint)}"`, 'UNKNOWN_ENDPOINT')
    }
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    homeHosted: HomeHostedService
  }
}
