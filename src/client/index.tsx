/**
 * Client half of dsh-home-hosted: one Settings page driven by `POST /api/home-hosted`.
 *
 * Everything here is defensive on purpose — a client module that throws while
 * booting breaks the settings dialog for every plugin, so a missing service or
 * a throwing registration only logs and skips.
 */
import type { ClientContext, LocaleService, SlotIconProps, SlotsService } from './context.js'
import { IconHouse } from './icons.js'
import { createTranslator, en, LOCALE_NS, zh } from './locales.js'
import { HomeHostedPage } from './page.js'
import { installSettingsNavIcon, NAV_ICON_SIZE } from './settings-nav-icon.js'

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

    /**
     * The nav glyph, one of two ways depending on the host.
     *
     * dsh 0.2.2 wraps every nav glyph and adds a `settings.section.icon` list, scoped by the
     * same id, rendered as `{ size, active }` with the shell's gear as the *fallback*. So on
     * those hosts the glyph belongs in the slot.
     *
     * Before 0.2.2 there was no slot and the gear was the row's own child, so this plugin
     * claimed its row and masked the gear with `settings-nav-icon.ts`. That stand-in hides
     * `button > svg` — and on 0.2.2 the gear moved *inside* a `.navIcon` span, so the selector
     * stopped reaching it and the row showed **both** the host's gear and our house. Registering
     * the slot while leaving the stand-in up has the same effect from the other side, which is
     * the duplicate a user sees.
     *
     * The slot is the detection. It can also arrive *after* this effect runs, when the settings
     * shell mounts later, so arriving stops the stand-in rather than both being present.
     */
    let stopStandIn: (() => void) | undefined
    let hostPaintsIcon = false
    runEffect(ctx, () => {
      let dispose = (): void => {}
      try {
        dispose = slots.inject('settings.section.icon', () => {
          hostPaintsIcon = true
          // The host owns the glyph now; the stand-in would paint a second one beside it.
          stopStandIn?.()
          stopStandIn = undefined
          try {
            return slots.register({
              name: 'settings.section.icon',
              id: 'home-hosted',
              order: 60,
            }, (props: SlotIconProps = {}) => <IconHouse size={props.size ?? NAV_ICON_SIZE} />)
          }
          catch (caught) {
            warn('registering the settings nav icon failed', caught)
            return () => {}
          }
        })
      }
      catch (caught) {
        warn('injecting into settings.section.icon failed', caught)
      }
      return () => {
        try {
          dispose()
        }
        catch (caught) {
          warn('disposing the settings nav icon failed', caught)
        }
      }
    }, 'dsh-home-hosted: settings nav icon')

    // A host without the slot falls back to the stand-in. Same label thunk as the section
    // registration, so a locale switch re-claims the row.
    if (!hostPaintsIcon) stopStandIn = installSettingsNavIcon(ctx, () => t('tab'))
  }
  catch (caught) {
    warn('client bootstrap failed', caught)
  }
}
