// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClientContext, SlotRegisterOptions, TranslateFn } from '../../src/client/context.js'
import { apply, inject } from '../../src/client/index.js'
import { en } from '../../src/client/locales.js'

interface Recorded {
  options: SlotRegisterOptions
  component: unknown
}

/**
 * A slot registry that models **which slots the host declares**.
 *
 * `inject` runs its callback only for a declared key, because that callback is what the plugin
 * registers *into*: a fake that answered every key made `settings.section.icon` look present on
 * a host that has no such slot, so the stand-in path could never be exercised. `declared`
 * defaults to the pre-0.2.2 shape (no icon slot); pass it to model a 0.2.2 host.
 */
function makeSlots(recorded: Recorded[], throwOnRegister = false, declared: readonly string[] = ['settings.section']) {
  const callbacks = new Map<string, () => unknown>()
  return {
    callbacks,
    register(options: SlotRegisterOptions, component: unknown): () => void {
      if (throwOnRegister) throw new Error('registration refused')
      recorded.push({ options, component })
      return () => {}
    },
    inject(key: string, callback: () => unknown): () => void {
      if (!declared.includes(key)) return () => {}
      callbacks.set(key, callback)
      callback()
      return () => {}
    },
  }
}

function makeCtx(services: Record<string, unknown>, options: { effectThrows?: boolean } = {}): ClientContext {
  return {
    get: (name: string) => services[name],
    effect: (body: () => void | (() => void), _label?: string) => {
      if (options.effectThrows === true) throw new Error('effect refused')
      const dispose = body()
      return typeof dispose === 'function' ? dispose : () => {}
    },
  }
}

/** A locale service whose `register` records the one bilingual call. */
function makeLocale(bound: (key: string) => string = key => key) {
  const registrations: Array<{ ns: string, dicts: { en: Record<string, string>, zh: Record<string, string> } }> = []
  return {
    registrations,
    service: {
      bind: () => bound,
      register: (ns: string, dicts: { en: Record<string, string>, zh: Record<string, string> }) => {
        registrations.push({ ns, dicts })
        return () => {}
      },
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('apply', () => {
  it('registers one settings.section with the frozen slot spec', () => {
    const recorded: Recorded[] = []
    const { registrations, service } = makeLocale()
    const ctx = makeCtx({ slots: makeSlots(recorded), locale: service })

    apply(ctx)

    // One typed call registers every shipped locale.
    expect(registrations).toHaveLength(1)
    expect(registrations[0]?.ns).toBe('homeHosted')
    expect(registrations[0]?.dicts.en.tab).toBe(en.tab)
    expect(registrations[0]?.dicts.zh.tab).toBe('Home Hosted')

    expect(recorded).toHaveLength(1)
    const { options, component } = recorded[0]!
    expect(options.name).toBe('settings.section')
    expect(options.id).toBe('home-hosted')
    expect(options.order).toBe(60)
    expect(options.locale).toBe('homeHosted')
    expect(typeof options.label).toBe('function')
    // The label is a thunk resolved through the namespace-bound translator.
    expect((options.label as () => string)()).toBe('tab')
    expect(typeof (options.inject?.().t as TranslateFn)).toBe('function')
    expect(typeof component).toBe('function')
  })

  it('declares slots and locale as required services', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('injects its own translator, so copy never depends on the locale service', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const recorded: Recorded[] = []
    // No locale service at all: the supported deployment the page must survive.
    apply(makeCtx({ slots: makeSlots(recorded) }))

    expect(recorded).toHaveLength(1)
    const options = recorded[0]!.options
    const injected = options.inject?.() ?? {}
    const t = injected.t as TranslateFn
    expect(typeof t).toBe('function')
    expect(t('panelTitle')).toBe(en.panelTitle)
    expect(t('bootStateNotInstalled')).toBe(en.bootStateNotInstalled)
    expect((options.label as () => string)()).toBe(en.tab)
  })

  it('warns when the locale service is missing but still registers the section', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const recorded: Recorded[] = []
    apply(makeCtx({ slots: makeSlots(recorded) }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('locale service is unavailable'))
    expect(recorded).toHaveLength(1)
  })

  it('warns and skips when the slots service is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => apply(makeCtx({}))).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })

  it('never throws when a registration is refused', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const recorded: Recorded[] = []
    expect(() => apply(makeCtx({ slots: makeSlots(recorded, true), locale: makeLocale().service }))).not.toThrow()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('registering the settings section failed'), expect.anything())
  })

  it('never throws when the effect rail is unavailable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const recorded: Recorded[] = []
    expect(() => apply(makeCtx({ slots: makeSlots(recorded) }, { effectThrows: true }))).not.toThrow()
    expect(recorded).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
  })

  it('never throws for a hostile context', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ctx: ClientContext = { get: () => { throw new Error('nope') } }
    expect(() => apply(ctx)).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })

  it('keeps going when the locale dictionary registration throws', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const recorded: Recorded[] = []
    const ctx = makeCtx({
      slots: makeSlots(recorded),
      locale: {
        bind: () => (key: string) => key,
        register: () => { throw new Error('already registered') },
      },
    })
    expect(() => apply(ctx)).not.toThrow()
    expect(recorded).toHaveLength(1)
  })
})

/**
 * The nav glyph, on both host shapes.
 *
 * dsh 0.2.2 moved the settings-nav gear *inside* a `.navIcon` span and added a
 * `settings.section.icon` list (rendered as `{ size, active }`, scoped by the section id, with
 * the gear as the fallback). The plugin's stand-in hides `button > svg` and paints a mask, so on
 * 0.2.2 it hid nothing and the row showed the host's gear beside our house — the duplicated icon
 * a user sees. The slot is therefore the detection: register the glyph where the host offers the
 * seat, and keep the stand-in only for hosts that never declare it.
 */
describe('the settings-nav glyph on the host slot', () => {
  const stylesheet = (): Element | null => document.querySelector('style[data-plugin-css="dsh-home-hosted/settings-nav-icon"]')

  /** A nav row for this plugin, shaped like the shell's (icon span + label span). */
  function mountRow(label: string): void {
    document.body.innerHTML = `<div role="dialog"><nav><button type="button"><span><svg data-gear="1"></svg></span><span>${label}</span></button></nav></div>`
  }

  afterEach(() => {
    document.body.innerHTML = ''
    // The stylesheet goes in `<head>`, which `body.innerHTML = ''` does not touch: a leftover
    // tag from an earlier `apply` made the "no stand-in" assertion fail for the wrong reason.
    for (const tag of Array.from(document.querySelectorAll('style[data-plugin-css]'))) tag.remove()
  })

  it('registers the glyph in the slot on a host that offers it, and paints no second one', () => {
    // Earlier tests in this file call `apply` too, and each may leave a stylesheet in `<head>`.
    // The assertion below is about *this* run, so start from a clean head rather than relying on
    // every other test to clean up after itself.
    for (const tag of Array.from(document.querySelectorAll('style[data-plugin-css]'))) tag.remove()
    const recorded: Recorded[] = []
    const ctx = makeCtx({
      slots: makeSlots(recorded, false, ['settings.section', 'settings.section.icon']),
      locale: makeLocale().service,
    })

    apply(ctx)

    const icon = recorded.find(entry => entry.options.name === 'settings.section.icon')
    expect(icon, 'a 0.2.2 host must receive the glyph through the slot').toBeDefined()
    // Same id, so the host renders it only on our own row.
    expect(icon?.options.id).toBe('home-hosted')
    expect(typeof icon?.component).toBe('function')
    // And the stand-in is absent: its stylesheet is what paints the duplicate.
    expect(stylesheet()).toBeNull()
  })

  it('falls back to the stand-in on a host that has no icon slot', () => {
    for (const tag of Array.from(document.querySelectorAll('style[data-plugin-css]'))) tag.remove()
    const recorded: Recorded[] = []
    const ctx = makeCtx({ slots: makeSlots(recorded), locale: makeLocale().service })

    apply(ctx)

    expect(recorded.some(entry => entry.options.name === 'settings.section.icon')).toBe(false)
    expect(stylesheet(), 'a pre-0.2.2 host still needs the stand-in').not.toBeNull()
  })

  it('drops the stand-in when the icon slot arrives after it', () => {
    for (const tag of Array.from(document.querySelectorAll('style[data-plugin-css]'))) tag.remove()
    // The settings shell can mount after this effect: the slot shows up later, and the
    // stand-in must not survive it or the row ends up with both glyphs.
    const recorded: Recorded[] = []
    const late: string[] = []
    const callbacks = new Map<string, () => unknown>()
    const slots = {
      register(options: SlotRegisterOptions, component: unknown): () => void {
        recorded.push({ options, component })
        return () => {}
      },
      inject(key: string, callback: () => unknown): () => void {
        // Declared late: modelled by recording the callback and running it on `arrive`.
        if (key === 'settings.section.icon') {
          late.push(key)
          callbacks.set(key, callback)
          return () => {}
        }
        callbacks.set(key, callback)
        callback()
        return () => {}
      },
    }
    const ctx = makeCtx({ slots, locale: makeLocale().service })

    apply(ctx)
    expect(stylesheet(), 'the stand-in is up before the slot arrives').not.toBeNull()

    callbacks.get('settings.section.icon')?.()

    expect(recorded.some(entry => entry.options.name === 'settings.section.icon')).toBe(true)
    expect(stylesheet(), 'the stand-in must be removed once the host paints the glyph').toBeNull()
  })
})
