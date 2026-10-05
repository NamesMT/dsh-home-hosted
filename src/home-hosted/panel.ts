/**
 * The home-hosted HTTP API client.
 *
 * Every call carries the plugin's own API token; the panel verifies it from its
 * secrets file on each request. A write through this client is the safe path:
 * the config store records the bytes it wrote, so the panel's own file watcher
 * never treats the change as an external edit.
 */
import type { FreePortResult, ServerEntry, ServerEntryPatch, ServerEntryView } from '../shared/contracts.js'

/**
 * What `GET /api/servers*` answers with: a live *view*, which nests the entry
 * under `config` and names the workspace `workspaceId`.
 */
interface ApiServerView extends Omit<ServerEntryView, 'workspace'> {
  workspaceId?: string
}

/**
 * What `POST` and `PATCH /api/servers/:id` answer with: the stored entry itself,
 * flat — no `config` wrapper, no `workspaceId`, no live status.
 *
 * The two shapes are not one shape with a missing field; they are different
 * objects, and treating a flat config as a view yields `config: undefined` and a
 * status that never existed. `create`/`update` therefore build the view
 * themselves from the echoed entry.
 */
type ApiServerConfig = ServerEntry & { workspaceId?: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export class PanelError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number | null = null,
    /** The panel's own diagnostic, when it sent one. */
    readonly detail: unknown = undefined,
  ) {
    super(message)
    this.name = 'PanelError'
  }
}

export interface PanelClientOptions {
  baseUrl: string
  token: string
  timeoutMs?: number
  /** The workspace every call acts on unless it names another one. */
  workspace?: string
}

export class PanelClient {
  private readonly baseUrl: string
  private readonly token: string
  private readonly timeoutMs: number
  private readonly workspace: string | null

  constructor(options: PanelClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.token = options.token
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.workspace = options.workspace ?? null
  }

  /**
   * A server path for one workspace. Server ids are only unique inside a
   * workspace, so `?workspace=` is what selects which one is meant; omitting it
   * on a panel that predates workspaces changes nothing.
   */
  /**
   * The panel names a server's workspace `workspaceId`; the plugin's view calls it
   * `workspace`. One mapping, so a caller never has to know both spellings.
   */
  private view(raw: ApiServerView, workspace?: string | null): ServerEntryView {
    const { workspaceId, ...rest } = raw
    return { ...rest, workspace: workspaceId ?? workspace ?? this.workspace ?? '' }
  }

  /**
   * A `POST`/`PATCH` answer.
   *
   * The real panel answers the stored entry *flat* here — no `config` wrapper, no
   * `workspaceId`, no live status — while `GET` answers a view. Both are accepted:
   * a body that already carries a `config` object is a view, and anything else is
   * the entry itself. Reading a flat entry as a view is what made `created.config`
   * `undefined`, so the shape is decided here rather than assumed.
   *
   * A flat entry carries no live status, so it is reported as `unknown`: the panel
   * has not said. Callers that need one re-read the list.
   */
  private written(raw: ApiServerView | ApiServerConfig, workspace?: string | null): ServerEntryView {
    const record = raw as Record<string, unknown>
    if (isRecord(record.config))
      return this.view(raw as ApiServerView, workspace)

    const { workspaceId, id, ...config } = record as ApiServerConfig & Record<string, unknown>
    return {
      id: typeof id === 'string' ? id : '',
      workspace: typeof workspaceId === 'string' ? workspaceId : workspace ?? this.workspace ?? '',
      status: 'unknown',
      pid: null,
      url: null,
      config: config as ServerEntry,
    }
  }

  private ws(path: string, workspace?: string | null): string {
    const id = workspace ?? this.workspace
    if (id === null || id === undefined || id.length === 0)
      return path
    return `${path}${path.includes('?') ? '&' : '?'}workspace=${encodeURIComponent(id)}`
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${this.token}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    }
    catch (error) {
      throw new PanelError(
        error instanceof Error ? error.message : String(error),
        'PANEL_UNREACHABLE',
      )
    }

    const text = await response.text()
    let parsed: unknown = null
    try {
      parsed = text.length > 0 ? JSON.parse(text) : null
    }
    catch {
      throw new PanelError(`the panel answered ${response.status} with a non-JSON body`, 'PANEL_BAD_RESPONSE', response.status)
    }

    if (!response.ok) {
      const record = parsed as { message?: unknown, error?: unknown, code?: unknown, detail?: unknown } | null
      // The panel's error envelope is `{ message, code }` for a refusal and
      // `{ ok: false, error }` for a failed server action — losing the second
      // spelling would replace the reason a person needs with the status code.
      const message = typeof record?.message === 'string'
        ? record.message
        : typeof record?.error === 'string' ? record.error : `the panel answered ${response.status}`
      const code = typeof record?.code === 'string' ? record.code : 'PANEL_ERROR'
      throw new PanelError(message, code, response.status, record?.detail)
    }

    return parsed as T
  }

  async listServers(workspace?: string): Promise<ServerEntryView[]> {
    const answer = await this.request<{ servers: ApiServerView[] }>('GET', this.ws('/api/servers', workspace))
    return answer.servers.map(server => this.view(server, workspace))
  }

  async getServer(id: string, workspace?: string): Promise<ServerEntryView> {
    const answer = await this.request<{ server: ApiServerView }>('GET', this.ws(`/api/servers/${encodeURIComponent(id)}`, workspace))
    return this.view(answer.server, workspace)
  }

  async createServer(entry: ServerEntry, workspace?: string): Promise<ServerEntryView> {
    const answer = await this.request<{ server: ApiServerView | ApiServerConfig }>('POST', this.ws('/api/servers', workspace), entry)
    return this.written(answer.server, workspace)
  }

  async updateServer(id: string, patch: ServerEntryPatch, workspace?: string): Promise<ServerEntryView> {
    const answer = await this.request<{ server: ApiServerView | ApiServerConfig }>('PATCH', this.ws(`/api/servers/${encodeURIComponent(id)}`, workspace), patch)
    return this.written(answer.server, workspace)
  }

  async deleteServer(id: string, workspace?: string): Promise<void> {
    await this.request('DELETE', this.ws(`/api/servers/${encodeURIComponent(id)}`, workspace))
  }

  async startServer(id: string, workspace?: string): Promise<void> {
    await this.request('POST', this.ws(`/api/servers/${encodeURIComponent(id)}/start`, workspace))
  }

  async stopServer(id: string, workspace?: string): Promise<void> {
    await this.request('POST', this.ws(`/api/servers/${encodeURIComponent(id)}/stop`, workspace))
  }

  async restartServer(id: string, workspace?: string): Promise<void> {
    await this.request('POST', this.ws(`/api/servers/${encodeURIComponent(id)}/restart`, workspace))
  }

  /** The workspaces this panel serves, as its registry reports them. */
  async listWorkspaces(): Promise<{ id: string, label: string, serverCount: number, runningCount: number, crashedCount: number }[]> {
    const answer = await this.request<{ workspaces: Array<{ id: string, label: string, serverCount: number, runningCount: number, crashedCount: number }> }>('GET', '/api/workspaces')
    return answer.workspaces
  }

  /** The panel's own settings: `control` is the listener block a port change edits. */
  async settings(): Promise<{ control?: Record<string, unknown> }> {
    return await this.request<{ control?: Record<string, unknown> }>('GET', '/api/settings')
  }

  /**
   * Re-list the port's listeners and stop what is not the panel's own tree.
   *
   * The page reads `free`, `port` and `skipped`; `stopped` is what the panel
   * answers today. Declared as the shared contract so both halves agree on it.
   */
  async freePort(id: string, workspace?: string): Promise<FreePortResult> {
    return await this.request<FreePortResult>('POST', this.ws(`/api/servers/${encodeURIComponent(id)}/free-port`, workspace))
  }
}

/**
 * What a token probe measured: `ok` — the panel accepted it; `refused` — the
 * panel answered and rejected it; `unreachable` — the panel was not there to
 * ask, which is not the same as a refusal.
 */
export type TokenProbe = 'ok' | 'refused' | 'unreachable'

/**
 * Prove a token with a non-mutating `listServers()`, and say whether the panel
 * refused it or merely was not answering. A timeout or connection error must
 * never be reported as a stale token.
 */
export async function probeToken(baseUrl: string, token: string, timeoutMs = 5000): Promise<TokenProbe> {
  try {
    await new PanelClient({ baseUrl, token, timeoutMs }).listServers()
    return 'ok'
  }
  catch (error) {
    if (error instanceof PanelError && (error.code === 'AUTH_REQUIRED' || error.status === 401 || error.status === 403))
      return 'refused'
    return 'unreachable'
  }
}

/** Prove a token works, without needing any write permission. */
export async function verifyToken(baseUrl: string, token: string, timeoutMs = 5000): Promise<boolean> {
  return await probeToken(baseUrl, token, timeoutMs) === 'ok'
}
