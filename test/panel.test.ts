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

    const patched = await client.updateServer('dsh', { onPortConflict: 'kill', stop: { killPortHolders: true } })
    expect(patched.config.onPortConflict).toBe('kill')
    expect(patched.config.stop).toEqual({ killPortHolders: true })

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
