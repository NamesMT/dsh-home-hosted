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
import type { BootMechanism, BootStatus, EntryIntent, HomeHostedStatus, ManagedEntryStatus, PanelControlResult, PanelStatus, RpcEndpoint, ServerEntry, ServerEntryPatch, ServerEntryView } from './shared/contracts.js'
import type { BootSpec } from './boot/types.js'
import { createBootLadder } from './boot/index.js'
import { findEntry, patchEntry, readConfig, upsertEntry, writeConfig } from './home-hosted/config-file.js'
import { buildDshEntry, detectProfile, resolveDshLaunch } from './home-hosted/dsh-entry.js'
import { ownedDrift, ownedPatch, restorePatch, snapshotOwned } from './home-hosted/entries.js'
import { buildHomeHostedBootSpec, homeHostedEnv } from './home-hosted/launch.js'
import type { CliResolution } from './home-hosted/resolve.js'
import { compareVersions, EXPECTED_RANGE, MIN_KILL_VERSION, MIN_SUPPORTED_VERSION, resolveCli } from './home-hosted/resolve.js'
import { preflightLauncher, writeLauncher } from './home-hosted/launcher.js'
import type { PanelControlDeps } from './home-hosted/panel-control.js'
import { installGlobal, spawnTakeover, startPanel as startPanelProcess } from './home-hosted/panel-control.js'
import { PanelClient, verifyToken } from './home-hosted/panel.js'
import { readRuntime, probePanel, pidAlive } from './home-hosted/runtime.js'
import { apiTokenEnrolled, ensureToken, readStoredToken } from './home-hosted/token.js'
import type { SettingsStore } from './settings.js'
import { dshHome } from './util/paths.js'
import type { RunResult } from './util/exec.js'
import { run } from './util/exec.js'
import { readJson, writeJsonAtomic } from './util/fsx.js'

const ENTRY_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/

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
  private tokenDetail = ''
  private readonly snapshotsFile: string

  constructor(ctx: Context, private readonly options: HomeHostedServiceOptions) {
    super(ctx, 'homeHosted')
    this.snapshotsFile = path.join(options.stateDir, 'snapshots.json')
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

  async panelStatus(): Promise<PanelStatus> {
    const runtime = this.runtime()
    const stored = readStoredToken(this.options.stateDir)
    const enrolledOnDisk = apiTokenEnrolled(this.options.home)
    const reachable = runtime !== null && (pidAlive(runtime.pid) || await probePanel(runtime.url))
    const answered = runtime !== null && await probePanel(runtime.url)

    const token: PanelStatus['token'] = stored !== null ? 'enrolled' : (enrolledOnDisk ? 'present' : 'absent')
    const writeVia: PanelStatus['writeVia'] = answered && stored !== null ? 'api' : 'file'

    return {
      home: this.options.home,
      reachable: answered,
      url: runtime?.url ?? null,
      version: runtime?.version ?? null,
      pid: runtime?.pid ?? null,
      writeVia,
      token,
      detail: answered
        ? (stored !== null
            ? (this.tokenDetail || 'the panel is answering and this plugin holds a token')
            : (enrolledOnDisk
                ? 'the panel is answering, but home-hosted already holds an API token this plugin does not have'
                : 'the panel is answering; a token will be enrolled on the first write'))
        : (runtime === null
            ? 'no run.json: the panel is not running, so entries are written straight to servers.config.json'
            : reachable ? 'the panel process is alive but is not answering' : 'the panel is not running'),
    }
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

  private async createEntry(intent: EntryIntent, patch: ServerEntryPatch, live: ServerEntry | null): Promise<ServerEntry | null> {
    if (intent.id !== this.options.defaultEntryId)
      return null
    const dsh = await resolveDshLaunch()
    const { port, host } = this.webServer()
    const generated = buildDshEntry({
      id: intent.id,
      port,
      host,
      profile: detectProfile(process.argv, process.env),
      dshHome: process.env.DSH_HOME ?? dshHome(),
      launch: dsh,
    })
    return { ...(live ?? generated), ...generated, ...patch }
  }

  private async writeOwned(intent: EntryIntent): Promise<void> {
    const live = (await this.liveEntries()).get(intent.id) ?? null
    const snapshots = this.snapshots()
    if (snapshots[intent.id] === undefined) {
      snapshots[intent.id] = live === null ? { id: intent.id } : snapshotOwned(live.config)
      this.saveSnapshots(snapshots)
    }

    const patch = ownedPatch(intent, live?.config ?? null)
    const client = await this.tryClient()
    if (client !== null) {
      if (live !== null) {
        await client.updateServer(intent.id, patch)
        return
      }
      const entry = await this.createEntry(intent, patch, null)
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
      writeConfig(this.options.home, patchEntry(raw, intent.id, patch), this.writtenBy())
      return
    }

    const entry = await this.createEntry(intent, patch, null)
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
      const intent: EntryIntent = {
        id: raw.id,
        autostart: raw.autostart === true,
        onPortConflict: raw.onPortConflict ?? 'kill',
        stopKillPortHolders: raw.stopKillPortHolders !== false,
      }
      await this.assertPolicySupported(intent)
      await this.writeOwned(intent)
      const current = this.options.settings.get()
      const entries = current.entries.filter(entry => entry.id !== intent.id)
      entries.push(intent)
      this.options.settings.update({ entries })
    }
    return await this.entriesStatus()
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
    this.options.settings.update({ entries: current.entries.filter(entry => entry.id !== id) })
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
    if (result.ok) {
      this.options.settings.update({
        autostart: {
          enabled: true,
          mechanism: mechanism ?? result.mechanism ?? this.options.settings.get().autostart.mechanism,
        },
      })
    }
    return { result, status: await this.bootStatus(mechanism) }
  }

  async uninstallBoot(mechanism?: BootMechanism): Promise<{ result: BootInstallResult, status: BootStatus }> {
    const spec = await this.bootSpec()
    if (spec === null)
      throw new HomeHostedError((await this.cli()).resolution.status.detail, 'CLI_NOT_FOUND')
    const result = await this.ladder().uninstall(spec, mechanism)
    if (result.ok)
      this.options.settings.update({ autostart: { ...this.options.settings.get().autostart, enabled: false } })
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
      panel,
      boot: await this.bootStatus(),
      entries: await this.entriesStatus(),
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

      case 'entries.restore':
        return await this.restoreEntry(String(input.id))

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
