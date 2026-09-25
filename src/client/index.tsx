/**
 * Client half of dsh-home-hosted: one Settings page driven by `POST /api/home-hosted`.
 *
 * Everything here is defensive on purpose — a client module that throws while
 * booting breaks the settings dialog for every plugin, so a missing service or
 * a throwing registration only logs and skips.
 */
import type { ClientContext, LocaleService, SlotsService } from './context.js'
import { createTranslator, en, LOCALE_NS, zh } from './locales.js'
import { HomeHostedPage } from './page.js'

/**
 * Slots owns the registration and locale backs the copy. Cordis scopes
 * service access to declared dependencies, so `locale` must be declared even
 * though the page keeps its bundled dictionaries as the fallback.
 */
export const inject: string[] = ['slots', 'locale']

const PREFIX = '[dsh-home-hosted]'

function warn(message: string, cause?: unknown): void {
  if (cause === undefined) console.warn(`${PREFIX} ${message}`)
  else console.warn(`${PREFIX} ${message}`, cause)
}

/** Read a service through the safe accessor first, the direct member second. */
function readService<T>(ctx: ClientContext, name: string): T | undefined {
  try {
    const viaGet = ctx.get?.(name)
    if (viaGet !== undefined && viaGet !== null) return viaGet as T
  }
  catch {
    // Fall through to the direct member.
  }
  try {
    const direct = ctx[name]
    if (direct !== undefined && direct !== null) return direct as T
  }
  catch {
    // The service is unavailable.
  }
  return undefined
}

/** Run an effect through cordis when available; a missing `effect` still runs the body. */
function runEffect(ctx: ClientContext, body: () => void | (() => void), label: string): void {
  if (typeof ctx.effect === 'function') {
    try {
      ctx.effect(body, label)
      return
    }
    catch (caught) {
      warn(`registering the effect "${label}" failed`, caught)
      return
    }
  }
  try {
    body()
  }
  catch (caught) {
    warn(`the effect "${label}" failed`, caught)
  }
}

export function apply(ctx: ClientContext): void {
  try {
    const locale = readService<LocaleService>(ctx, 'locale')
    const t = createTranslator(locale)
    if (locale === undefined) {
      warn('the locale service is unavailable; the page keeps its bundled English copy')
    }
    else {
      runEffect(ctx, () => {
        const disposers: Array<() => void> = []
        try {
          // One typed call registers every shipped locale under the namespace.
          disposers.push(locale.register(LOCALE_NS, { en, zh }))
        }
        catch (caught) {
          warn('registering the dictionaries failed', caught)
        }
        return () => {
          for (const dispose of disposers) {
            try {
              dispose()
            }
            catch (caught) {
              warn('disposing a dictionary failed', caught)
            }
          }
        }
      }, 'dsh-home-hosted: dictionaries')
    }

    const slots = readService<SlotsService>(ctx, 'slots')
    if (slots === undefined) {
      warn('the slots service is unavailable; the settings section was not registered')
      return
    }

    runEffect(ctx, () => {
      try {
        return slots.inject('settings.section', () => {
          try {
            return slots.register({
              name: 'settings.section',
              id: 'home-hosted',
              order: 60,
              label: () => t('tab'),
              locale: LOCALE_NS,
              // The inject face is spread AFTER the standard kit, so our own
              // translator wins over the framework `t` seat: the page never
              // depends on the locale plugin for its copy.
              inject: () => ({ t }),
            }, HomeHostedPage)
          }
          catch (caught) {
            warn('registering the settings section failed', caught)
            return () => {}
          }
        })
      }
      catch (caught) {
        warn('injecting into settings.section failed', caught)
        return () => {}
      }
    }, 'dsh-home-hosted: settings section')
  }
  catch (caught) {
    warn('client bootstrap failed', caught)
  }
}
