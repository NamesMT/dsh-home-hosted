import { describe, expect, it } from 'vitest'
import { createTranslator, en, englishTranslator, interpolate, LOCALE_NS, zh } from '../../src/client/locales.js'

describe('dictionaries', () => {
  it('keeps English and Chinese in step', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
  })

  it('uses a stable namespace', () => {
    expect(LOCALE_NS).toBe('homeHosted')
  })
})

describe('interpolate', () => {
  it('substitutes named placeholders', () => {
    expect(interpolate('{name} · asks approval', { name: 'servers_start' }))
      .toBe('servers_start · asks approval')
  })

  it('leaves an unknown placeholder verbatim', () => {
    expect(interpolate('{name}', {})).toBe('{name}')
  })

  it('returns the text unchanged without params', () => {
    expect(interpolate('{name}')).toBe('{name}')
  })
})

describe('translators', () => {
  it('falls back to English when no locale service is bound', () => {
    expect(englishTranslator('tab')).toBe(en.tab)
    expect(createTranslator(undefined)('bootRecheck')).toBe(en.bootRecheck)
  })

  it('returns the key itself for an unknown entry', () => {
    expect(englishTranslator('nope')).toBe('nope')
  })

  it('binds the service namespace and honours a live switch', () => {
    let active = 'en'
    const service = {
      bind: () => (key: string) => (active === 'en' ? en[key as keyof typeof en] : zh[key as keyof typeof zh]) ?? key,
      register: () => () => {},
    }
    const t = createTranslator(service)
    expect(t('tab')).toBe(en.tab)
    active = 'zh'
    expect(t('refresh')).toBe(zh.refresh)
  })

  it('falls back to English when binding throws', () => {
    const service = {
      bind: () => { throw new Error('no locale face') },
      register: () => () => {},
    }
    expect(createTranslator(service)('tab')).toBe(en.tab)
  })
})
