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
import type { BootMechanism, BootStatus, EntryIntent, HomeHostedStatus, ManagedEntryStatus, PanelControlResult, PanelStatus, RpcEndpoint, ServerEntry, ServerEntryPatch, ServerEntryView, UiAction, UiResult } from './shared/contracts.js'
import { isOnPortConflict, ON_PORT_CONFLICT_POLICIES } from './shared/contracts.js'
import type { BootSpec } from './boot/types.js'
import { createBootLadder } from './boot/index.js'
import { findEntry, patchControl, patchEntry, readConfig, removeEntry as removeConfigEntry, upsertEntry, writeConfig } from './home-hosted/config-file.js'
import { buildDshEntry, detectProfile, launcherRepair, needsLauncherRepair, resolveDshLaunch } from './home-hosted/dsh-entry.js'
import type { DshLaunch } from './home-hosted/dsh-entry.js'
import { defaultIntent, ownedDrift, ownedPatch, restorePatch, snapshotOwned } from './home-hosted/entries.js'
import { buildHomeHostedBootSpec, homeHostedEnv } from './home-hosted/launch.js'
import type { CliResolution } from './home-hosted/resolve.js'
import { compareVersions, EXPECTED_RANGE, MIN_KILL_VERSION, MIN_PERSISTENT_VERSION, MIN_SUPPORTED_VERSION, resolveCli } from './home-hosted/resolve.js'
import { preflightLauncher, writeLauncher } from './home-hosted/launcher.js'
import type { PanelControlDeps } from './home-hosted/panel-control.js'
import { installGlobal, spawnTakeover, startPanel as startPanelProcess } from './home-hosted/panel-control.js'
import { PanelClient, PanelError, probeToken, verifyToken } from './home-hosted/panel.js'
import { readRuntime, probePanel, pidAlive } from './home-hosted/runtime.js'
import { apiTokenEnrolled, ensureToken, readStoredToken, reclaimToken } from './home-hosted/token.js'
import type { SettingsStore } from './settings.js'
import { dshHome } from './util/paths.js'
import type { RunResult } from './util/exec.js'
import { run } from './util/exec.js'
import { readJson, writeJsonAtomic } from './util/fsx.js'

const ENTRY_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/

/** A token probe is an auxiliary fact, not a user action: never let it stall a poll. */
const TOKEN_PROBE_TIMEOUT_MS = 3000

/** How often a deleted managed entry may be put back from the status read. */
const ENTRY_RECOVERY_INTERVAL_MS = 30_000

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
}

export class HomeHostedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message)
    this.name = 'HomeHostedError'
  }
}

export interface HomeHostedServiceOptions {
  home: string
  stateDir: string
  homeHostedCommand?: string
  defaultEntryId: string
  settings: SettingsStore
  /** Test seam: run the home-hosted CLI without spawning it. */
  execCli?: (args: string[], env: Record<string, string | undefined>) => Promise<RunResult>
  /** Test seam: supply the boot ladder instead of probing the real OS. */
  createLadder?: () => BootLadderLike
  /** Test seam: resolve the running harness instead of reading this process. */
  resolveDsh?: (options: { dshHome: string, stateDir: string }) => Promise<DshLaunch | null>
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
  private readonly snapshotsFile: string

  constructor(ctx: Context, private readonly options: HomeHostedServiceOptions) {
    super(ctx, 'homeHosted')
    this.snapshotsFile = path.join(options.stateDir, 'snapshots.json')
  }

  private async resolveDsh(dshHome: string): Promise<DshLaunch | null> {
    return await (this.options.resolveDsh ?? (options => resolveDshLaunch(options)))({
      dshHome,
      stateDir: this.options.stateDir,
    })
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
  private writtenBy(): string {
    return this.runtime()?.version ?? 'dsh-home-hosted'
  }

  private webServer(): { port: number | null, host: string } {
    const service = this.ctx.get('webServer') as { port?: unknown, host?: unknown } | undefined
    const port = typeof service?.port === 'number' ? service.port : null
    const host = typeof service?.host === 'string' ? service.host : '127.0.0.1'
    return { port, host }
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
    return `${url.replace(/\/+$/, '')}/logs?server=${encodeURIComponent(this.options.defaultEntryId)}`
  }

  /** The port the panel's config holds, without touching a running panel. */
  private configuredPort(): number | null {
    const control = readConfig(this.options.home).raw?.control as { port?: unknown } | undefined
    return typeof control?.port === 'number' ? control.port : null
  }

  /** Write the chosen panel port into the state the panel boots from. */
  private applyPanelPort(): void {
    const port = this.options.settings.get().panel.port
    if (port === null || port === this.configuredPort())
      return
    const read = readConfig(this.options.home)
    if (read.error !== null)
      throw new HomeHostedError(read.error, 'CONFIG_UNREADABLE')
    writeConfig(this.options.home, patchControl(read.raw ?? {}, { port }), this.writtenBy())
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
              ? 'the panel refused this plugin\'s API token, so writes go straight to servers.config.json; regenerate the token'
              : token === 'present'
                ? 'the panel is answering, but home-hosted already holds an API token this plugin does not have'
                : token === 'absent'
                  ? 'the panel is answering but no API token is enrolled for it yet; writes go to servers.config.json until one is'
                  : 'the panel answered, but the plugin\'s token could not be checked')
        : (runtime === null
            ? 'no run.json: the panel is not running, so entries are written straight to servers.config.json'
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

    const client = new PanelClient({ baseUrl: runtime.url, token: ensured.token })
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

  private snapshots(): Record<string, ServerEntry> {
    return readJson<Record<string, ServerEntry>>(this.snapshotsFile) ?? {}
  }

  private saveSnapshots(snapshots: Record<string, ServerEntry>): void {
    writeJsonAtomic(this.snapshotsFile, snapshots, 0o600)
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
    const read = readConfig(this.options.home)
    for (const entry of read.raw?.servers ?? [])
      map.set(entry.id, { view: { id: entry.id, status: 'unknown', pid: null, url: null, config: entry }, config: entry })
    return map
  }

  private async createEntry(intent: EntryIntent, patch: ServerEntryPatch): Promise<ServerEntry | null> {
    if (intent.id !== this.options.defaultEntryId)
      return null
    const harnessHome = process.env.DSH_HOME ?? dshHome()
    // State dir and harness home are the plugin's own, not the defaults: an
    // override has to point the launcher at the same place everything else is.
    const dsh = await this.resolveDsh(harnessHome)
    const { port, host } = this.webServer()
    const generated = buildDshEntry({
      id: intent.id,
      port,
      host,
      profile: detectProfile(process.argv, process.env),
      dshHome: harnessHome,
      launch: dsh,
      launcherPath: dsh?.launcherPath ?? null,
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
    return launcherRepair(live, dsh)
  }

  private async writeOwned(intent: EntryIntent): Promise<void> {
    const live = (await this.liveEntries()).get(intent.id) ?? null
    const snapshots = this.snapshots()
    if (snapshots[intent.id] === undefined) {
      snapshots[intent.id] = live === null ? { id: intent.id } : snapshotOwned(live.config)
      this.saveSnapshots(snapshots)
    }

    const patch = ownedPatch(intent, live?.config ?? null, { persistent: await this.supportsPersistent() })
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

    const read = readConfig(this.options.home)
    if (read.error !== null)
      throw new HomeHostedError(read.error, 'CONFIG_UNREADABLE')
    let raw = read.raw ?? {}
    if (findEntry(raw, intent.id) !== null) {
      writeConfig(this.options.home, patchEntry(raw, intent.id, { ...patch, ...(repair ?? {}) }), this.writtenBy())
      return
    }

    const entry = await this.createEntry(intent, patch)
    if (entry === null)
      throw new HomeHostedError(`no server "${intent.id}" exists in ${this.options.home}/servers.config.json`, 'ENTRY_MISSING')

    // While a panel is running, an external write is a real change and a newly
    // added autostart entry would be started at once. Adding it disabled and
    // flipping autostart in a second write makes that a changed definition
    // instead, which only takes effect at that entry's next start.
    if (await this.panelRunning()) {
      writeConfig(this.options.home, upsertEntry(raw, { ...entry, autostart: false }), this.writtenBy())
      raw = readConfig(this.options.home).raw ?? raw
      writeConfig(this.options.home, patchEntry(raw, intent.id, { autostart: intent.autostart }), this.writtenBy())
      return
    }

    writeConfig(this.options.home, upsertEntry(raw, entry), this.writtenBy())
  }

  private async panelRunning(): Promise<boolean> {
    const runtime = this.runtime()
    return runtime !== null && (pidAlive(runtime.pid) || await probePanel(runtime.url))
  }

  /**
   * The version whose schema will parse what we write: the answering panel, or
   * the CLI that will parse it next. `kill` did not exist before 0.6.0, and an
   * older panel refuses to *boot* with it — so this is checked before any write.
   */
  private async configVersion(): Promise<string | null> {
    const runtime = this.runtime()
    if (runtime !== null && runtime.version !== null && (pidAlive(runtime.pid) || await probePanel(runtime.url)))
      return runtime.version
    const { resolution } = await this.cli()
    return resolution.status.version
  }

  /** Whether the panel whose schema parses our write knows `persistent`. */
  private async supportsPersistent(): Promise<boolean> {
    const version = await this.configVersion()
    return version !== null && compareVersions(version, MIN_PERSISTENT_VERSION) >= 0
  }

  private async assertPolicySupported(intent: EntryIntent): Promise<void> {
    if (intent.onPortConflict !== 'kill')
      return
    const version = await this.configVersion()
    if (version === null || compareVersions(version, MIN_KILL_VERSION) >= 0)
      return
    const { resolution } = await this.cli()
    throw new HomeHostedError(
      `the home-hosted that would parse this config is ${version}, which has no "kill" policy `
      + `(added in ${MIN_KILL_VERSION}); replace it with ${resolution.status.version ?? 'the pinned copy'} from this page, `
      + 'or set the entry\'s on-port-conflict policy to block',
      'KILL_UNSUPPORTED',
    )
  }

  private async applyIntents(intents: EntryIntent[]): Promise<ManagedEntryStatus[]> {
    for (const raw of intents) {
      if (!ENTRY_ID_PATTERN.test(raw.id))
        throw new HomeHostedError(`"${raw.id}" is not a valid server id`, 'INVALID_ID')
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
      await this.assertPolicySupported(intent)
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
      const read = readConfig(this.options.home)
      if (read.error !== null || read.raw === null)
        throw new HomeHostedError(read.error ?? 'the config file is unreadable', 'CONFIG_UNREADABLE')
      writeConfig(this.options.home, removeConfigEntry(read.raw, id), this.writtenBy())
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

  /** Drive the panel's own UI through its CLI, and report what is installed. */
  async uiManage(action: UiAction, file?: string): Promise<UiResult> {
    const cli = action === 'status' ? null : await this.cli()

    const runUi = async (args: string[]): Promise<{ code: number | null, output: string }> => {
      const launch = cli?.resolution.launch ?? null
      if (launch === null)
        throw new HomeHostedError(cli?.resolution.status.detail ?? 'no home-hosted CLI could be resolved', 'CLI_NOT_FOUND')
      const result = await run(launch.program, [...launch.args, ...args, '--home', this.options.home], {
        env: { ...process.env, HHOSTED_HOME: this.options.home },
        timeoutMs: 300_000,
      })
      // A CLI that never started has no stdout to show, so its spawn error is the
      // only thing that explains the failure.
      const output = [result.error, result.stdout, result.stderr].filter(part => typeof part === 'string' && part.trim().length > 0).join('\n').trim()
      return { code: result.code, output }
    }

    interface ActiveUi { name: string | null, version: string | null, repo: string | null, tag: string | null }
    const active = (): ActiveUi | null => {
      const meta = readJson<{ name?: string, version?: string | null, repo?: string, tag?: string }>(path.join(this.options.home, '.ui', 'ui.json'))
      return meta === null ? null : { name: meta.name ?? null, version: meta.version ?? null, repo: meta.repo ?? null, tag: meta.tag ?? null }
    }

    switch (action) {
      case 'status': {
        const ui = active()
        return { ok: true, ui, detail: ui === null ? 'the panel is using its stock UI' : `${ui.name ?? 'a custom UI'}${ui.version === null ? '' : ` ${ui.version}`}` }
      }
      case 'update': {
        const result = await runUi(['ui-update', '--yes'])
        return { ok: result.code === 0, detail: result.code === 0 ? 'the panel UI is up to date' : 'the update did not run', ui: active(), output: result.output }
      }
      case 'revert': {
        const result = await runUi(['ui-revert'])
        return { ok: result.code === 0, detail: result.code === 0 ? 'back to the stock UI' : 'the revert did not run', ui: active(), output: result.output }
      }
      case 'switch': {
        if (file === undefined || file.trim().length === 0)
          throw new HomeHostedError('switching the UI needs the zip to install', 'UI_FILE_REQUIRED')
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
      const read = readConfig(this.options.home)
      if (read.error !== null || read.raw === null)
        throw new HomeHostedError(read.error ?? 'the config file is unreadable', 'CONFIG_UNREADABLE')
      writeConfig(this.options.home, patchEntry(read.raw, id, patch), this.writtenBy())
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
    const persistent = await this.supportsPersistent()
    const ids = new Set<string>([this.options.defaultEntryId, ...settings.entries.map(entry => entry.id)])
    return [...ids].map((id) => {
      const intent = this.options.settings.intentFor(id)
      const entry = live.get(id) ?? null
      return {
        intent,
        exists: entry !== null,
        managed: snapshots[id] !== undefined,
        drift: entry === null ? ['missing entry'] : ownedDrift(entry.config, intent, { persistent }),
        live: entry?.view ?? null,
        snapshot: snapshots[id] ?? null,
      }
    })
  }

  // -------------------------------------------------------------------------
  // Boot autostart
  // -------------------------------------------------------------------------

  private ladder(): BootLadderLike {
    if (this.options.createLadder !== undefined)
      return this.options.createLadder()
    return createBootLadder({ env: process.env })
  }

  private async bootSpec(): Promise<BootSpec | null> {
    const { resolution, launcher } = await this.cli()
    const launch = resolution.launch
    if (launch === null)
      return null
    const runtime = this.runtime()
    const spec = buildHomeHostedBootSpec(
      {
        home: this.options.home,
        projectDir: process.env.HHOSTED_PROJECT ?? runtime?.projectDir ?? null,
        version: runtime?.version ?? null,
      },
      launch,
      { stateDir: this.options.stateDir },
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
    const result = await this.ladder().install(spec, mechanism)
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
          detail: result.detail,
          commands: result.commands,
          at: Date.now(),
        },
      },
    })
    return { result, status: await this.bootStatus(mechanism) }
  }

  async uninstallBoot(mechanism?: BootMechanism): Promise<{ result: BootInstallResult, status: BootStatus }> {
    const spec = await this.bootSpec()
    if (spec === null)
      throw new HomeHostedError((await this.cli()).resolution.status.detail, 'CLI_NOT_FOUND')
    const result = await this.ladder().uninstall(spec, mechanism)
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
    // A managed entry that someone deleted (by mistake, from the panel or by hand)
    // stays "managed" in settings with nothing to manage, which is the state the
    // page reports as a missing entry. Recreate it — the toggle is the intent.
    await this.ensureManagedEntry()
    await this.repairBootEntry()
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

  async status(): Promise<HomeHostedStatus> {
    // Resolve the client first: enrolling a token changes which write path is
    // available, and the page should see the state after that, not before.
    const client = await this.tryClient()
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
        servers = await client.listServers()
      }
      catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }
    }
    else if (panel.reachable) {
      lastError = panel.detail
    }

    return {
      defaultEntryId: this.options.defaultEntryId,
      panel,
      boot: await this.bootStatus(),
      // A deleted managed entry is put back here as well as at startup: whoever
      // deleted it is looking at the page that reports it missing.
      entries: await this.ensureManagedEntry().then(async () => await this.entriesStatus()),
      servers,
      settings: this.options.settings.get(),
      cli,
      lastError,
    }
  }

  // -------------------------------------------------------------------------
  // Endpoint dispatch
  // -------------------------------------------------------------------------

  async call(endpoint: RpcEndpoint, payload: unknown): Promise<unknown> {
    const input = (payload ?? {}) as Record<string, unknown>
    switch (endpoint) {
      case 'status':
        return await this.status()

      case 'settings.update': {
        const patch = (input.patch ?? {}) as Parameters<SettingsStore['update']>[0]
        this.options.settings.update(patch)
        return await this.status()
      }

      case 'servers.list':
        return await (await this.requireClient()).listServers()

      case 'servers.get':
        return await (await this.requireClient()).getServer(String(input.id))

      case 'servers.create': {
        const entry = input.entry as ServerEntry
        if (typeof entry?.id !== 'string' || !ENTRY_ID_PATTERN.test(entry.id))
          throw new HomeHostedError('a server entry needs an id matching ^[a-z0-9][a-z0-9_-]*$', 'INVALID_ID')
        return await (await this.requireClient()).createServer(entry)
      }

      case 'servers.update':
        return await (await this.requireClient()).updateServer(String(input.id), (input.patch ?? {}) as ServerEntryPatch)

      case 'servers.delete': {
        const id = String(input.id)
        if (id === this.selfEntryId()) {
          throw new HomeHostedError(
            `"${id}" is the entry this very process runs as, and deleting it stops this session; `
            + 'pause it (autostart off) or restore it instead',
            'SELF_ENTRY',
          )
        }
        await (await this.requireClient()).deleteServer(id)
        return { id }
      }

      case 'servers.start':
        await (await this.requireClient()).startServer(String(input.id))
        return await this.entriesStatus()

      case 'servers.stop':
        await (await this.requireClient()).stopServer(String(input.id))
        return await this.entriesStatus()

      case 'servers.restart':
        await (await this.requireClient()).restartServer(String(input.id))
        return await this.entriesStatus()

      case 'servers.freePort':
        return await (await this.requireClient()).freePort(String(input.id))

      case 'entries.apply': {
        const intents = Array.isArray(input.intents) ? input.intents as EntryIntent[] : []
        return await this.applyIntents(intents)
      }

      case 'entries.remove':
        return await this.removeManagedEntry(String(input.id))

      case 'entries.restore':
        return await this.restoreEntry(String(input.id))

      case 'ui.manage':
        return await this.uiManage(input.action as UiAction, typeof input.file === 'string' ? input.file : undefined)

      case 'boot.install':
        return await this.installBoot(input.mechanism as BootMechanism | undefined)

      case 'boot.uninstall':
        return await this.uninstallBoot(input.mechanism as BootMechanism | undefined)

      case 'boot.verify':
        return await this.bootStatus()

      case 'panel.start':
        return await this.startPanelNow()

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
