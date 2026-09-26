import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { authNoticeBody, registerAuthNotice, STOCK_UNAUTHORIZED } from '../src/home-hosted/web-notice.js'

interface Res {
  end: (...args: unknown[]) => unknown
  writableEnded?: boolean
}

/** A browser auth whose 401 writer behaves like the in-box one. */
function fakeConnection(writes: unknown[] = []): { browserAuth: { writeUnauthorized: (req: unknown, res: unknown) => void } } {
  return {
    browserAuth: {
      writeUnauthorized: (req: unknown, res: unknown) => {
        const response = res as Res
        // Mirrors the in-box writer: a HEAD response carries no body.
        response.end((req as { method?: string } | undefined)?.method === 'HEAD' ? undefined : `${STOCK_UNAUTHORIZED}\n`)
        writes.push('stock')
      },
    },
  }
}

function fakeCtx(connection: unknown): { ctx: Context, effects: number } {
  const effects = { count: 0 }
  const scoped = {
    get: (name: string) => (name === 'connection' ? connection : undefined),
    effect(body: () => unknown) {
      body()
      effects.count += 1
    },
  }
  const ctx = {
    inject: (_deps: string[], callback: (value: unknown) => void) => callback(scoped),
  }
  return { ctx: ctx as unknown as Context, effects: effects.count }
}

describe('the sign-in notice', () => {
  it('leaves dsh\'s own text alone without a log page to point at', () => {
    expect(authNoticeBody(null)).toBe(`${STOCK_UNAUTHORIZED}\n`)
  })

  it('adds where the tokenised URL is when the panel is known', () => {
    const body = authNoticeBody('http://127.0.0.1:6301/logs?server=dsh')
    expect(body.startsWith(`${STOCK_UNAUTHORIZED}\n`)).toBe(true)
    expect(body).toContain('http://127.0.0.1:6301/logs?server=dsh')
    expect(body).toContain('authentication plugin')
  })

  it('rewrites the 401 body the in-box auth writes', () => {
    const connection = fakeConnection()
    const { ctx } = fakeCtx(connection)
    registerAuthNotice(ctx, () => 'http://127.0.0.1:6301/logs?server=dsh')

    let written = ''
    const res: Res = { end: (chunk?: unknown) => { written = String(chunk ?? ''); return res } }
    connection.browserAuth.writeUnauthorized({}, res)
    expect(written).toContain('http://127.0.0.1:6301/logs?server=dsh')
  })

  it('reads the setting per response, so turning it off restores the stock text', () => {
    const connection = fakeConnection()
    const { ctx } = fakeCtx(connection)
    let notice = true
    registerAuthNotice(ctx, () => (notice ? 'http://127.0.0.1:6301/logs?server=dsh' : null))

    let written = ''
    const res: Res = { end: (chunk?: unknown) => { written = String(chunk ?? ''); return res } }
    notice = false
    connection.browserAuth.writeUnauthorized({}, res)
    expect(written).toBe(`${STOCK_UNAUTHORIZED}\n`)
  })

  it('leaves a response that already ended to the original writer', () => {
    const connection = fakeConnection()
    const { ctx } = fakeCtx(connection)
    registerAuthNotice(ctx, () => 'http://127.0.0.1:6301/logs?server=dsh')

    let written = ''
    connection.browserAuth.writeUnauthorized({}, {
      end: (chunk?: unknown) => { written = String(chunk ?? ''); return undefined },
      writableEnded: true,
    })
    // Not wrapped: the body stays exactly what the in-box auth would write.
    expect(written).toBe(`${STOCK_UNAUTHORIZED}\n`)
  })

  it('passes a HEAD response\'s empty body through', () => {
    const connection = fakeConnection()
    const { ctx } = fakeCtx(connection)
    registerAuthNotice(ctx, () => 'http://127.0.0.1:6301/logs?server=dsh')

    const seen: unknown[] = []
    connection.browserAuth.writeUnauthorized({ method: 'HEAD' }, {
      end: (chunk?: unknown) => { seen.push(chunk); return undefined },
    })
    expect(seen).toEqual([undefined])
  })

  it('fails soft when the connection plugin is not shaped as expected', () => {
    for (const connection of [undefined, {}, { browserAuth: {} }, { browserAuth: { writeUnauthorized: 'nope' } }]) {
      const { ctx } = fakeCtx(connection)
      expect(() => registerAuthNotice(ctx, () => 'http://x/logs?server=dsh')).not.toThrow()
    }
  })
})

describe('living beside an authentication plugin', () => {
  it('leaves a customized page alone, even when it quotes the stock line', () => {
    const connection = fakeConnection()
    const custom = `<html><body><h1>Sign in</h1><p>${STOCK_UNAUTHORIZED}</p></body></html>`
    const auth = connection.browserAuth as unknown as { writeUnauthorized: (req: unknown, res: unknown) => void }
    // Another plugin's page is already the writer when we install over it.
    auth.writeUnauthorized = (_req: unknown, response: unknown) => {
      (response as { end: (value: string) => void }).end(custom)
    }

    const { ctx } = fakeCtx(connection)
    registerAuthNotice(ctx, () => 'http://127.0.0.1:6301/logs?server=dsh')

    let written = ''
    auth.writeUnauthorized({}, { end: (chunk?: unknown) => { written = String(chunk ?? ''); return undefined } })
    expect(written).toBe(custom)
  })

  it('passes a page another plugin wrote straight through', () => {
    const connection = fakeConnection()
    const { ctx } = fakeCtx(connection)
    registerAuthNotice(ctx, () => 'http://127.0.0.1:6301/logs?server=dsh')

    const written: string[] = []
    connection.browserAuth.writeUnauthorized({}, {
      end: (chunk?: unknown) => { written.push(String(chunk ?? '')); return undefined },
    })
    // Simulate the other plugin's writer: it replaces writeUnauthorized after us.
    const page = '<html>their login page</html>'
    connection.browserAuth.writeUnauthorized = (_req: unknown, res: unknown) => {
      (res as { end: (value: string) => void }).end(page)
    }
    connection.browserAuth.writeUnauthorized({}, { end: (chunk?: unknown) => { written.push(String(chunk ?? '')); return undefined } })
    expect(written[written.length - 1]).toBe(page)
  })

  it('never throws when the response refuses the wrapper', () => {
    const connection = fakeConnection()
    const { ctx } = fakeCtx(connection)
    registerAuthNotice(ctx, () => 'http://127.0.0.1:6301/logs?server=dsh')

    let written = ''
    const res: Record<string, unknown> = {
      end: (chunk?: unknown) => { written = String(chunk ?? ''); return undefined },
      once: () => undefined,
    }
    Object.defineProperty(res, 'end', { value: res.end, writable: false, configurable: false })

    expect(() => connection.browserAuth.writeUnauthorized({}, res)).not.toThrow()
    // The original writer still ran, with dsh's own text.
    expect(written).toBe(`${STOCK_UNAUTHORIZED}\n`)
  })

  it('still adds the notice when the writer ends asynchronously', async () => {
    const connection = fakeConnection()
    const { ctx } = fakeCtx(connection)
    registerAuthNotice(ctx, () => 'http://127.0.0.1:6301/logs?server=dsh')

    let written = ''
    const res = {
      end: (chunk?: unknown) => { written = String(chunk ?? ''); return undefined },
      once: () => undefined,
    }
    const auth = connection.browserAuth as unknown as { writeUnauthorized: (req: unknown, res: unknown) => void }
    auth.writeUnauthorized = (_req: unknown, response: unknown) => {
      setTimeout(() => (response as { end: (value: string) => void }).end(`${STOCK_UNAUTHORIZED}\n`), 5)
    }
    // Install over the async writer, then let it fire.
    registerAuthNotice(ctx, () => 'http://127.0.0.1:6301/logs?server=dsh')
    auth.writeUnauthorized({}, res)
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(written).toContain('http://127.0.0.1:6301/logs?server=dsh')
  })

  it('keeps the stock body when the log URL lookup throws', () => {
    const connection = fakeConnection()
    const { ctx } = fakeCtx(connection)
    registerAuthNotice(ctx, () => { throw new Error('no run.json') })

    let written = ''
    expect(() => connection.browserAuth.writeUnauthorized({}, {
      end: (chunk?: unknown) => { written = String(chunk ?? ''); return undefined },
      once: () => undefined,
    })).not.toThrow()
    expect(written).toBe(`${STOCK_UNAUTHORIZED}\n`)
  })
})
