/**
 * The browser half's one entry point.
 *
 * The route is registered on DeepSeek Harness's shared `/api` channel, so the
 * physical carrier has already applied the Host/Origin fence and browser
 * authentication before this handler runs: only the local operator reaches it.
 * Domain failures travel inside the envelope, protocol failures as HTTP status.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { RpcEndpoint, RpcRequest } from './shared/contracts.js'
import { RPC_PATH, RPC_VERSION } from './shared/contracts.js'
import type { HomeHostedService } from './service.js'
import { HomeHostedError } from './service.js'

interface FetchRoute {
  path: string
  methods: readonly string[]
  requestBody: 'buffered' | 'streaming'
  fetch: (request: Request) => Promise<Response>
}

interface ConnectionLike {
  fetch: { register: (route: FetchRoute) => () => unknown }
}

interface ConnectionHost {
  connection: ConnectionLike
}

interface LoggerLike {
  warn?: (message: string) => void
}

function answer(endpoint: RpcEndpoint | string, result: unknown): Response {
  return Response.json({ v: RPC_VERSION, endpoint, result })
}

export function registerRpc(ctx: Context, service: HomeHostedService): void {
  ctx.inject(['connection'], (scoped) => {
    const connection = (scoped as unknown as ConnectionHost).connection
    if (connection?.fetch?.register === undefined)
      return

    scoped.effect(() => {
      let dispose: () => unknown
      try {
        dispose = connection.fetch.register({
          // The exact-route registry is keyed by the full request path, so the
          // `/api` prefix belongs here; the page composes the same URL from
          // API_BASE + RPC_PATH.
          path: `/api${RPC_PATH}`,
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: async (request: Request) => {
            let body: RpcRequest
            try {
              body = await request.json() as RpcRequest
            }
            catch {
              return Response.json({ error: 'the request body is not JSON' }, { status: 400 })
            }

            if (body === null || typeof body !== 'object' || body.v !== RPC_VERSION) {
              return Response.json(
                { error: `this page and the host disagree on the protocol version (expected ${String(RPC_VERSION)})` },
                { status: 409 },
              )
            }

            try {
              const value = await service.call(body.endpoint, body.payload)
              return answer(body.endpoint, { ok: true, value })
            }
            catch (error) {
              const code = error instanceof HomeHostedError ? error.code : 'INTERNAL'
              const message = error instanceof Error ? error.message : String(error)
              const detail = (error as { detail?: unknown } | null)?.detail
              return answer(body.endpoint, { ok: false, error: { code, message, ...(detail === undefined ? {} : { detail }) } })
            }
          },
        })
      }
      catch (error) {
        // A registration the carrier refuses would otherwise look like a page
        // that silently 404s; say so where an operator can see it.
        const logger = (scoped as unknown as { logger?: LoggerLike }).logger
        logger?.warn?.(`[dsh-home-hosted] could not register ${RPC_PATH}: ${error instanceof Error ? error.message : String(error)}`)
        return () => {}
      }

      return () => {
        // A disposer that rejects would otherwise surface as an unhandled
        // rejection, which ends the process on Node 24.
        void Promise.resolve(dispose()).catch(() => {})
      }
    }, 'dsh-home-hosted: rpc route')
  })
}
