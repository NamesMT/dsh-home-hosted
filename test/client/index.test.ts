import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClientContext, SlotRegisterOptions } from '../../src/client/context.js'
import { apply, inject } from '../../src/client/index.js'

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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('apply', () => {
  it('registers one settings.section with the frozen slot spec', () => {
    const recorded: Recorded[] = []
    const registered: Array<[string, string]> = []
    const ctx = makeCtx({
      slots: makeSlots(recorded),
      locale: {
        bind: () => (key: string) => key,
        register: (ns: string, locale: string) => {
          registered.push([ns, locale])
          return () => {}
        },
      },
    })

    apply(ctx)

    expect(registered).toEqual([['homeHosted', 'en'], ['homeHosted', 'zh']])
    expect(recorded).toHaveLength(1)
    const { options, component } = recorded[0]!
    expect(options.name).toBe('settings.section')
    expect(options.id).toBe('home-hosted')
    expect(options.order).toBe(60)
    expect(options.locale).toBe('homeHosted')
    expect(typeof options.label).toBe('function')
    // The label is a thunk resolved through the namespace-bound translator.
    expect((options.label as () => string)()).toBe('tab')
    expect(options.inject?.()).toEqual({})
    expect(typeof component).toBe('function')
  })

  it('exports slots as its required service', () => {
    expect(inject).toEqual(['slots'])
  })

  it('warns and skips when the slots service is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => apply(makeCtx({}))).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })

  it('never throws when a registration is refused', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const recorded: Recorded[] = []
    expect(() => apply(makeCtx({ slots: makeSlots(recorded, true) }))).not.toThrow()
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
