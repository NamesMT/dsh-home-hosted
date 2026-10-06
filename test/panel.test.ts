import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { PanelClient, PanelError, probeToken, verifyToken } from '../src/home-hosted/panel.js'
import { startStubPanel } from './helpers/stub-panel.js'
import type { StubPanel } from './helpers/stub-panel.js'

const panels: StubPanel[] = []
const extra: http.Server[] = []

afterEach(async () => {
  while (panels.length > 0)
    await panels.pop()!.stop()
  while (extra.length > 0) {
    const server = extra.pop()!
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

async function stub(options?: { token?: string, acceptAnyToken?: boolean }): Promise<StubPanel> {
  const panel = await startStubPanel(options)
  panels.push(panel)
  return panel
}

async function listenPlain(body: string, contentType = 'text/plain'): Promise<string> {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': contentType })
    response.end(body)
  })
  extra.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

describe('panel client', () => {
  it('reads, creates, patches, acts on and deletes entries', async () => {
    const panel = await stub({ token: 'secret' })
    const client = new PanelClient({ baseUrl: panel.url, token: 'secret' })

    expect(await client.listServers()).toEqual([])

    const created = await client.createServer({ id: 'dsh', command: 'dsh', args: ['web'] })
    expect(created.id).toBe('dsh')
    // POST and PATCH answer the stored entry *flat* — no `config` wrapper — while
    // GET answers a view. Reading a flat entry as a view left `config` undefined
    // and reported a status the panel never sent.
    expect(created.config).toBeDefined()
    expect(created.config.command).toBe('dsh')
    expect(created.config.args).toEqual(['web'])
    expect(created.status).toBe('unknown')
    expect(created.pid).toBeNull()

    const patched = await client.updateServer('dsh', { onPortConflict: 'kill', stop: { killPortHolders: true } })
    expect(patched.config).toBeDefined()
    expect(patched.config.onPortConflict).toBe('kill')
    expect(patched.config.stop).toEqual({ killPortHolders: true })
    // The id is the entry's, and the flat shape must not leak it into the config.
    expect(patched.id).toBe('dsh')
    expect((patched.config as Record<string, unknown>).id).toBeUndefined()

    await client.startServer('dsh')
    expect((await client.getServer('dsh')).status).toBe('running')
    await client.stopServer('dsh')
    expect((await client.getServer('dsh')).status).toBe('stopped')
    await client.restartServer('dsh')
    await client.freePort('dsh')

    await client.deleteServer('dsh')
    expect(await client.listServers()).toEqual([])

    // Every call after /healthz carried the bearer token.
    expect(panel.requests.filter(entry => entry.path !== '/healthz').every(entry => entry.authorized)).toBe(true)
  })

  it('maps an auth failure to AUTH_REQUIRED with its status', async () => {
    const panel = await stub({ token: 'secret' })
    const client = new PanelClient({ baseUrl: panel.url, token: 'wrong' })
    await expect(client.listServers()).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 })
  })

  it('maps an unknown entry to UNKNOWN_SERVER', async () => {
    const panel = await stub({ token: 'secret' })
    const client = new PanelClient({ baseUrl: panel.url, token: 'secret' })
    await expect(client.getServer('nope')).rejects.toMatchObject({ code: 'UNKNOWN_SERVER', status: 404 })
  })

  it('reports an unreachable panel as PANEL_UNREACHABLE', async () => {
    const client = new PanelClient({ baseUrl: 'http://127.0.0.1:1', token: 'secret', timeoutMs: 1000 })
    const error = await client.listServers().catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(PanelError)
    expect((error as PanelError).code).toBe('PANEL_UNREACHABLE')
  })

  it('refuses a non-JSON body instead of returning nonsense', async () => {
    const url = await listenPlain('<html>login</html>')
    const client = new PanelClient({ baseUrl: url, token: 'secret', timeoutMs: 2000 })
    await expect(client.listServers()).rejects.toMatchObject({ code: 'PANEL_BAD_RESPONSE', status: 200 })
  })

  it('keeps the panel\'s own reason when an action fails', async () => {
    // home-hosted answers a failed start/stop/restart with `{ ok: false, error }`
    // on a 409 (src/helpers/action-result.ts). Without the fallback the page shows
    // `the panel answered 409` and the reason a person needs is gone.
    const server = http.createServer((_request, response) => {
      response.writeHead(409, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ ok: false, error: 'server "gitea" is disabled' }))
    })
    extra.push(server)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address() as AddressInfo
    const client = new PanelClient({ baseUrl: `http://127.0.0.1:${address.port}`, token: 'secret', timeoutMs: 2000 })

    await expect(client.startServer('gitea')).rejects.toMatchObject({
      message: 'server "gitea" is disabled',
      status: 409,
    })
  })

  /**
   * The panel names a server's workspace `workspaceId`; the plugin's view calls it
   * `workspace`. A live panel is the only place that spelling shows up, so it is
   * pinned against a raw payload rather than through the stub.
   */
  it('maps the panel\'s workspaceId onto the view and sends the workspace', async () => {
    const seen: string[] = []
    let withWorkspaceId = true
    const server = http.createServer((request, response) => {
      seen.push(request.url ?? '')
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({
        servers: [{
          id: 'worker',
          ...(withWorkspaceId ? { workspaceId: 'alpha' } : {}),
          status: 'running',
          pid: 12,
          url: null,
          config: { id: 'worker', command: 'node' },
        }],
      }))
    })
    extra.push(server)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

    const client = new PanelClient({ baseUrl: url, token: 'secret', workspace: 'default' })
    const servers = await client.listServers('alpha')

    expect(servers[0]?.workspace).toBe('alpha')
    expect(servers[0]?.status).toBe('running')
    expect(seen[0]).toBe('/api/servers?workspace=alpha')

    // A payload with no workspace at all falls back to the client's own.
    withWorkspaceId = false
    const fallback = new PanelClient({ baseUrl: url, token: 'secret', workspace: 'alpha' })
    expect((await fallback.listServers())[0]?.workspace).toBe('alpha')
  })

  /**
   * A write answers the stored entry flat, and a read answers a view. The client
   * decides which it was given rather than assuming, so both raw bodies are pinned
   * here — one panel generation sends each, and a future one may send either.
   *
   * `serverSchema` rejects undeclared keys and declares no `config`, so a stored
   * entry can never be mistaken for a view: the presence of `config` is the whole
   * discriminator.
   */
  it('reads a flat stored entry and a nested view from the same write call', async () => {
    let flat = true
    const server = http.createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({
        server: flat
          // What `addServer`/`updateServer` return: the committed entry, flat.
          ? { id: 'worker', command: 'node', args: ['x.js'], port: 4000, autostart: true }
          // A view, for a panel that answers one: the same entry under `config`.
          : { id: 'worker', workspaceId: 'alpha', status: 'running', pid: 7, url: null, config: { id: 'worker', command: 'node' } },
      }))
    })
    extra.push(server)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

    const client = new PanelClient({ baseUrl: url, token: 'secret', workspace: 'default' })

    const stored = await client.updateServer('worker', { autostart: true })
    expect(stored.id).toBe('worker')
    expect(stored.config).toEqual({ command: 'node', args: ['x.js'], port: 4000, autostart: true })
    // The flat entry's own id is the view's id, not a field inside the config.
    expect((stored.config as Record<string, unknown>).id).toBeUndefined()
    // No live state was sent, so none is invented.
    expect(stored.status).toBe('unknown')
    expect(stored.pid).toBeNull()
    expect(stored.workspace).toBe('default')

    flat = false
    const view = await client.updateServer('worker', { autostart: true })
    expect(view.config).toEqual({ id: 'worker', command: 'node' })
    expect(view.status).toBe('running')
    expect(view.workspace).toBe('alpha')
  })
})

describe('token probes', () => {
  it('tells a refusal from a panel that never answered', async () => {
    const panel = await stub({ token: 'secret' })
    expect(await probeToken(panel.url, 'secret')).toBe('ok')
    expect(await probeToken(panel.url, 'wrong')).toBe('refused')
    // No listener on this port: a failure to ask is not a refusal.
    expect(await probeToken('http://127.0.0.1:1', 'secret', 1000)).toBe('unreachable')
  })

  it('keeps verifyToken boolean for the write path', async () => {
    const panel = await stub({ token: 'secret' })
    expect(await verifyToken(panel.url, 'secret')).toBe(true)
    expect(await verifyToken(panel.url, 'wrong')).toBe(false)
    expect(await verifyToken('http://127.0.0.1:1', 'secret', 1000)).toBe(false)
  })

  /**
   * Every call attaches `authorization: Bearer <token>`, and the request passes no
   * `redirect` option — so the runtime follows a 3xx **with credentials attached** unless
   * it strips them itself. Node's fetch (undici) strips `authorization` on a cross-origin
   * hop and keeps it same-origin. That is what stops a panel (or anything that can answer
   * for one) from redirecting this plugin's token to a host the user never named, and it
   * is a property of the runtime, not of anything here.
   *
   * Real loopback servers on two different ports, with the second recording what it
   * received: a stub cannot answer this, because the behaviour under test *is* the
   * transport's.
   */
  it('does not leak the panel token across a cross-origin redirect', async () => {
    let hits = 0
    let received: string | null | undefined
    const sink = http.createServer((request, response) => {
      hits += 1
      received = request.headers.authorization ?? null
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end('{"servers":[]}')
    })
    extra.push(sink)
    await new Promise<void>(resolve => sink.listen(0, '127.0.0.1', () => resolve()))
    const sinkPort = (sink.address() as AddressInfo).port

    const redirector = http.createServer((_request, response) => {
      response.writeHead(302, { location: `http://127.0.0.1:${sinkPort}/elsewhere` })
      response.end()
    })
    extra.push(redirector)
    await new Promise<void>(resolve => redirector.listen(0, '127.0.0.1', () => resolve()))
    const redirectorPort = (redirector.address() as AddressInfo).port

    const client = new PanelClient({ baseUrl: `http://127.0.0.1:${redirectorPort}`, token: 'secret-token' })
    await client.listServers()

    // Non-vacuous in both directions: the sink WAS reached (so the redirect was followed),
    // and it saw no credential. Without `hits`, a runtime that never followed the redirect
    // would also leave `received` null and this would pass while proving nothing.
    expect(hits).toBe(1)
    expect(received).toBe(null)
  })

  it('still sends the token on a same-origin redirect', async () => {
    let received: string | null | undefined
    const server = http.createServer((request, response) => {
      if (request.url === '/api/servers') {
        response.writeHead(302, { location: '/api/servers/moved' })
        response.end()
        return
      }
      received = request.headers.authorization ?? null
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end('{"servers":[]}')
    })
    extra.push(server)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
    const port = (server.address() as AddressInfo).port

    const client = new PanelClient({ baseUrl: `http://127.0.0.1:${port}`, token: 'secret-token' })
    await client.listServers()

    // Same origin: the plugin's own panel redirecting its own API path still authenticates.
    expect(received).toBe('Bearer secret-token')
  })
})
