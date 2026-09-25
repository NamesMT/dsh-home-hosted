import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClientContext, SlotRegisterOptions, TranslateFn } from '../../src/client/context.js'
import { apply, inject } from '../../src/client/index.js'
import { en } from '../../src/client/locales.js'

interface Recorded {
  options: SlotRegisterOptions
  component: unknown
}

function makeSlots(recorded: Recorded[], throwOnRegister = false) {
  return {
    register(options: SlotRegisterOptions, component: unknown): () => void {
      if (throwOnRegister) throw new Error('registration refused')
      recorded.push({ options, component })
      return () => {}
    },
    inject(_key: string, callback: () => () => void): () => void {
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
