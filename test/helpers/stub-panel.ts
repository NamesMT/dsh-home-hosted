/**
 * A stand-in for the home-hosted panel: the real routes and envelope, a real
 * HTTP listener on an ephemeral loopback port (never a fixed one), and a
 * request log so a test can assert what was actually sent.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'

export interface StubServerRecord {
  id: string
  status?: string
  pid?: number | null
  url?: string | null
  config: Record<string, unknown>
}

export interface RecordedRequest {
  method: string
  path: string
  body: unknown
  authorized: boolean
}

export interface StubPanel {
  url: string
  /** The one token the panel accepts; assignable so a test can rotate it. */
  token: string
  servers: StubServerRecord[]
  requests: RecordedRequest[]
  stop: () => Promise<void>
}

function view(record: StubServerRecord) {
  return {
    id: record.id,
    status: record.status ?? 'stopped',
    pid: record.pid ?? null,
    url: record.url ?? null,
    config: record.config,
  }
}

export async function startStubPanel(options: { token?: string, acceptAnyToken?: boolean } = {}): Promise<StubPanel> {
  // A holder, not a local: a test rotates the token on the returned object and
  // the listener starts accepting the new one without a restart.
  const state = { token: options.token ?? 'stub-panel-token' }
  const acceptAny = options.acceptAnyToken === true
  const servers: StubServerRecord[] = []
  const requests: RecordedRequest[] = []

  const server = http.createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', chunk => chunks.push(chunk as Buffer))
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      let body: unknown
      try {
        body = raw.length > 0 ? JSON.parse(raw) : undefined
      }
      catch {
        body = raw
      }

      const authorization = request.headers.authorization ?? ''
      const authorized = acceptAny ? authorization.startsWith('Bearer ') : authorization === `Bearer ${state.token}`
      const path = request.url ?? '/'
      const method = request.method ?? 'GET'
      requests.push({ method, path, body, authorized })

      const send = (status: number, value: unknown): void => {
        response.writeHead(status, { 'content-type': 'application/json' })
        response.end(JSON.stringify(value))
      }

      if (path === '/healthz') {
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.end('ok')
        return
      }

      if (!authorized) {
        send(401, { message: 'authentication required', code: 'AUTH_REQUIRED' })
        return
      }

      const idMatch = /^\/api\/servers\/([^/]+)(?:\/(start|stop|restart|free-port))?$/.exec(path)

      if (path === '/api/servers' && method === 'GET') {
        send(200, { servers: servers.map(view) })
        return
      }

      if (path === '/api/servers' && method === 'POST') {
        const entry = body as Record<string, unknown>
        const record: StubServerRecord = { id: String(entry.id), config: entry }
        servers.push(record)
        send(201, { server: view(record) })
        return
      }

      if (idMatch !== null) {
        const id = decodeURIComponent(idMatch[1] ?? '')
        const action = idMatch[2]
        const found = servers.find(entry => entry.id === id)

        if (action === undefined && method === 'GET') {
          if (found === undefined) {
            send(404, { message: `unknown server "${id}"`, code: 'UNKNOWN_SERVER' })
            return
          }
          send(200, { server: view(found) })
          return
        }

        if (action === undefined && method === 'PATCH') {
          if (found === undefined) {
            send(404, { message: `unknown server "${id}"`, code: 'UNKNOWN_SERVER' })
            return
          }
          const patch = body as Record<string, unknown>
          const next: Record<string, unknown> = { ...found.config, ...patch }
          if (typeof patch.stop === 'object' && patch.stop !== null && typeof found.config.stop === 'object' && found.config.stop !== null)
            next.stop = { ...(found.config.stop as object), ...(patch.stop as object) }
          found.config = next
          send(200, { server: view(found) })
          return
        }

        if (action === undefined && method === 'DELETE') {
          const index = servers.findIndex(entry => entry.id === id)
          if (index >= 0)
            servers.splice(index, 1)
          send(200, { ok: true })
          return
        }

        if (action !== undefined && method === 'POST') {
          if (found === undefined) {
            send(404, { message: `unknown server "${id}"`, code: 'UNKNOWN_SERVER' })
            return
          }
          if (action === 'start' || action === 'restart')
            found.status = 'running'
          if (action === 'stop')
            found.status = 'stopped'
          send(200, action === 'free-port' ? { stopped: [] } : { ok: true })
          return
        }
      }

      send(404, { message: 'not found', code: 'NOT_FOUND' })
    })
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${address.port}`,
    get token() { return state.token },
    set token(value: string) { state.token = value },
    servers,
    requests,
    stop: async () => await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error)
          reject(error)
        else resolve()
      })
    }),
  }
}
