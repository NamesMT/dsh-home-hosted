/**
 * Which dsh surface this process runs in.
 *
 * `profileContext` is registered by dsh's own profile boot, and its `name` is
 * what dsh's shipped composition keys its Desktop rows on
 * (`ctx.get('profileContext')?.name !== 'desktop'`). Reading that same field is
 * what keeps this in step with dsh rather than guessing from an env var.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { DshSurface } from '../shared/contracts.js'

/** The slice of dsh's `profileContext` this plugin reads. */
interface ProfileContextFace {
  name?: unknown
}

/**
 * `desktop` only when the profile really is Electron's; every other surface —
 * including a host too old to register the service — is the web one this plugin
 * was built for.
 */
export function readSurface(ctx: Context): DshSurface {
  try {
    const profile = ctx.get('profileContext') as ProfileContextFace | undefined
    return profile?.name === 'desktop' ? 'desktop' : 'web'
  }
  catch {
    return 'web'
  }
}
