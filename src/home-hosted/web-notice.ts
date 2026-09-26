import type { Context } from '@deepseek-ai/cordis'

/**
 * dsh web answers an unauthenticated browser with a plain-text 401 line written
 * by the in-box connection plugin. That text is not configurable and no event
 * covers it, so a home-hosted deployment — which is where this session's log,
 * and with it the tokenised URL, actually lives — appends where to look.
 *
 * It reaches one internal field, `connection.browserAuth.writeUnauthorized`, and
 * fails soft: if that shape is ever gone, dsh's own text is left untouched.
 */
export const STOCK_UNAUTHORIZED = 'dsh web authentication required; reopen the URL printed by dsh web.'

/** The 401 body: dsh's own line, plus where this deployment's log page is. */
export function authNoticeBody(logUrl: string | null): string {
  if (logUrl === null)
    return `${STOCK_UNAUTHORIZED}\n`
  return `${STOCK_UNAUTHORIZED}\nhome-hosted: the URL with its token is in the dsh log at ${logUrl}. An authentication plugin can sign you in seamlessly instead.\n`
}

interface AuthLike {
  writeUnauthorized?: unknown
}

/**
 * Wrap the auth object's 401 writer so the body carries the notice.
 * @returns the disposer that puts the original back.
 */
function wrap(auth: { writeUnauthorized: (req: unknown, res: unknown) => void }, logUrlOf: () => string | null): () => void {
  const original = auth.writeUnauthorized.bind(auth)
  auth.writeUnauthorized = (req, res) => {
    const response = res as {
      end?: (...args: unknown[]) => unknown
      once?: (event: string, listener: () => void) => unknown
      writableEnded?: boolean
    }
    const end = response.end
    if (typeof end !== 'function' || response.writableEnded === true) {
      original(req, res)
      return
    }

    let restored = false
    const restore = (): void => {
      if (restored) return
      restored = true
      try {
        response.end = end
      }
      catch {
        // a response that refuses the assignment keeps the original writer
      }
    }

    try {
      response.end = (...args: unknown[]) => {
        restore()
        const [chunk, ...rest] = args
        let body = chunk
        // Only the untouched stock line is ours to rewrite; an authentication
        // plugin's own page (or the same sentence inside longer text) is left alone.
        if (typeof chunk === 'string' && chunk.trim() === STOCK_UNAUTHORIZED) {
          try {
            body = authNoticeBody(logUrlOf())
          }
          catch {
            body = chunk
          }
        }
        return end.call(response, body, ...rest)
      }
    }
    catch {
      original(req, res)
      return
    }

    // A writer that ends later still gets the notice; one that never ends must
    // not leave our wrapper on the response.
    try {
      response.once?.('finish', restore)
      response.once?.('close', restore)
    }
    catch {
      // events are best-effort tidiness, never a reason to lose the 401
    }
    original(req, res)
  }
  return () => {
    auth.writeUnauthorized = original
  }
}

/**
 * Install the notice once the connection service is up. `logUrlOf` is read per
 * 401, so turning the setting off takes effect without re-installing anything.
 */
export function registerAuthNotice(ctx: Context, logUrlOf: () => string | null): void {
  ctx.inject(['connection'], (scoped) => {
    scoped.effect(() => {
      const connection = scoped.get('connection') as { browserAuth?: AuthLike } | undefined
      const auth = connection?.browserAuth
      if (typeof auth?.writeUnauthorized !== 'function')
        return () => {}
      return wrap(auth as { writeUnauthorized: (req: unknown, res: unknown) => void }, logUrlOf)
    }, 'dsh-home-hosted: sign-in notice')
  })
}
