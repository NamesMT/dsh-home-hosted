import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_BASE, parseResponse, rpc, rpcSettingsUpdate, STATUS_POLL_MS } from '../../src/client/api.js'
import { RPC_PATH, RPC_VERSION } from '../../src/shared/contracts.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

function jsonResponse(
  body: unknown,
  init: { ok?: boolean, status?: number, statusText?: string } = {},
): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: async () => body,
  } as unknown as Response
}

function fetchReturning(response: Response) {
  return vi.fn(async () => response)
}

describe('parseResponse', () => {
  it('unwraps a successful envelope', () => {
    expect(parseResponse({ v: RPC_VERSION, endpoint: 'status', result: { ok: true, value: { n: 1 } } }))
      .toEqual({ ok: true, value: { n: 1 } })
  })

  it('keeps code, message and detail of a failure', () => {
    expect(parseResponse({
      v: RPC_VERSION,
      endpoint: 'status',
      result: { ok: false, error: { code: 'enoent', message: 'missing', detail: { path: '/x' } } },
    })).toEqual({ ok: false, error: { code: 'enoent', message: 'missing', detail: { path: '/x' } } })
  })

  it('does not add a detail key when the host sent none', () => {
    const parsed = parseResponse({
      v: RPC_VERSION,
      endpoint: 'status',
      result: { ok: false, error: { code: 'e', message: 'm' } },
    })
    expect(parsed).toEqual({ ok: false, error: { code: 'e', message: 'm' } })
  })

  it('reports a message-less failure instead of crashing', () => {
    const parsed = parseResponse({ v: RPC_VERSION, result: { ok: false, error: {} } })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error.code).toBe('error')
  })

  it('rejects a non-object body', () => {
    const parsed = parseResponse('nope')
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error.code).toBe('bad-response')
  })

  it('reports a protocol version mismatch', () => {
    const parsed = parseResponse({ v: RPC_VERSION + 1, result: { ok: true, value: 1 } })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error.code).toBe('version-mismatch')
  })

  it('rejects a body without a result', () => {
    const parsed = parseResponse({ v: RPC_VERSION })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error.code).toBe('bad-response')
  })

  it('rejects a success without a value', () => {
    const parsed = parseResponse({ v: RPC_VERSION, result: { ok: true } })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error.code).toBe('bad-response')
  })
})

describe('rpc', () => {
  it('posts the frozen request shape to /api/home-hosted with the session cookie', async () => {
    const fetchMock = fetchReturning(jsonResponse({ v: RPC_VERSION, result: { ok: true, value: 1 } }))
    await rpc('status', {}, { fetch: fetchMock as unknown as typeof fetch })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${API_BASE}${RPC_PATH}`)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('same-origin')
    expect(JSON.parse(String(init.body))).toEqual({ v: RPC_VERSION, endpoint: 'status', payload: {} })
  })

  it('turns a non-2xx answer into an http failure', async () => {
    const fetchMock = fetchReturning(jsonResponse(null, { ok: false, status: 403, statusText: 'Forbidden' }))
    const result = await rpc('status', {}, { fetch: fetchMock as unknown as typeof fetch })
    expect(result).toEqual({ ok: false, error: { code: 'http', message: 'HTTP 403 Forbidden' } })
  })

  it('turns a rejected fetch into a network failure', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('offline') })
    const result = await rpc('status', {}, { fetch: fetchMock as unknown as typeof fetch })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('network')
      expect(result.error.message).toBe('offline')
    }
  })

  it('turns invalid JSON into a bad-json failure', async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => { throw new SyntaxError('unexpected token') },
    } as unknown as Response
    const result = await rpc('status', {}, { fetch: fetchReturning(response) as unknown as typeof fetch })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('bad-json')
  })

  it('surfaces an in-band failure unchanged', async () => {
    const fetchMock = fetchReturning(jsonResponse({
      v: RPC_VERSION,
      endpoint: 'status',
      result: { ok: false, error: { code: 'panel-down', message: 'no panel' } },
    }))
    const result = await rpc('status', {}, { fetch: fetchMock as unknown as typeof fetch })
    expect(result).toEqual({ ok: false, error: { code: 'panel-down', message: 'no panel' } })
  })

  it('fails in-band when no fetch implementation exists', async () => {
    vi.stubGlobal('fetch', undefined)
    const result = await rpc('status', {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('no-fetch')
  })
})

describe('rpcSettingsUpdate', () => {
  it('sends only the changed subtree under settings.update', async () => {
    const fetchMock = fetchReturning(jsonResponse({ v: RPC_VERSION, result: { ok: true, value: null } }))
    const result = await rpcSettingsUpdate({ autostart: { enabled: true } }, {
      fetch: fetchMock as unknown as typeof fetch,
    })
    expect(result.ok).toBe(true)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      v: RPC_VERSION,
      endpoint: 'settings.update',
      payload: { patch: { autostart: { enabled: true } } },
    })
  })

  it('exposes a 5s poll cadence', () => {
    expect(STATUS_POLL_MS).toBe(5000)
  })
})
