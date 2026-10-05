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
})
