/**
 * The home-hosted HTTP API client.
 *
 * Every call carries the plugin's own API token; the panel verifies it from its
 * secrets file on each request. A write through this client is the safe path:
 * the config store records the bytes it wrote, so the panel's own file watcher
 * never treats the change as an external edit.
 */
import type { ServerEntry, ServerEntryPatch, ServerEntryView } from '../shared/contracts.js'

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
}

export class PanelClient {
  private readonly baseUrl: string
  private readonly token: string
  private readonly timeoutMs: number

  constructor(options: PanelClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.token = options.token
    this.timeoutMs = options.timeoutMs ?? 10_000
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
      const record = parsed as { message?: unknown, code?: unknown, detail?: unknown } | null
      const message = typeof record?.message === 'string' ? record.message : `the panel answered ${response.status}`
      const code = typeof record?.code === 'string' ? record.code : 'PANEL_ERROR'
      throw new PanelError(message, code, response.status, record?.detail)
    }

    return parsed as T
  }

  async listServers(): Promise<ServerEntryView[]> {
    const answer = await this.request<{ servers: ServerEntryView[] }>('GET', '/api/servers')
    return answer.servers
  }

  async getServer(id: string): Promise<ServerEntryView> {
    const answer = await this.request<{ server: ServerEntryView }>('GET', `/api/servers/${encodeURIComponent(id)}`)
    return answer.server
  }

  async createServer(entry: ServerEntry): Promise<ServerEntryView> {
    const answer = await this.request<{ server: ServerEntryView }>('POST', '/api/servers', entry)
    return answer.server
  }

  async updateServer(id: string, patch: ServerEntryPatch): Promise<ServerEntryView> {
    const answer = await this.request<{ server: ServerEntryView }>('PATCH', `/api/servers/${encodeURIComponent(id)}`, patch)
    return answer.server
  }

  async deleteServer(id: string): Promise<void> {
    await this.request('DELETE', `/api/servers/${encodeURIComponent(id)}`)
  }

  async startServer(id: string): Promise<void> {
    await this.request('POST', `/api/servers/${encodeURIComponent(id)}/start`)
  }

  async stopServer(id: string): Promise<void> {
    await this.request('POST', `/api/servers/${encodeURIComponent(id)}/stop`)
  }

  async restartServer(id: string): Promise<void> {
    await this.request('POST', `/api/servers/${encodeURIComponent(id)}/restart`)
  }

  /** Re-list the port's listeners and stop what is not the panel's own tree. */
  async freePort(id: string): Promise<{ stopped?: number[] }> {
    return await this.request<{ stopped?: number[] }>('POST', `/api/servers/${encodeURIComponent(id)}/free-port`)
  }
}

/** Prove a token works, without needing any write permission. */
export async function verifyToken(baseUrl: string, token: string, timeoutMs = 5000): Promise<boolean> {
  try {
    await new PanelClient({ baseUrl, token, timeoutMs }).listServers()
    return true
  }
  catch {
    return false
  }
}
