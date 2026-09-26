import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  createTranslator,
  en,
  englishTranslator,
  interpolate,
  LOCALE_NS,
  resolveTranslator,
  zh,
} from '../../src/client/locales.js'

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

describe('resolveTranslator', () => {
  it('uses the bundled copy when no seat was injected', () => {
    expect(resolveTranslator(undefined)('panelTitle')).toBe(en.panelTitle)
  })

  it('replaces a key-echoing seat with the bundled copy', () => {
    // The framework `t` seat of a namespace it has no dictionary for.
    const rawSeat = (key: string) => key
    const t = resolveTranslator(rawSeat)
    expect(t('panelTitle')).toBe(en.panelTitle)
    expect(t('entriesManage', { id: 'dsh' })).toBe('Manage dsh')
  })

  it('keeps a real translation, including a non-English one', () => {
    const zhSeat = (key: string) => zh[key as keyof typeof zh]
    const t = resolveTranslator(zhSeat)
    expect(t('refresh')).toBe(zh.refresh)
    expect(t('tab')).toBe(zh.tab)
  })

  it('falls back when the seat throws or returns nothing', () => {
    expect(resolveTranslator(() => { throw new Error('boom') })('tab')).toBe(en.tab)
    expect(resolveTranslator(() => '')('tab')).toBe(en.tab)
  })

  it('interpolates the fallback', () => {
    expect(resolveTranslator(key => key)('panelReplace', { copy: 'global install' }))
      .toBe('Replace with global install')
  })
})

describe('locale key coverage', () => {
  it('defines every literal key the client tree renders', () => {
    const dir = 'src/client'
    const used = new Set<string>()
    for (const file of readdirSync(dir).filter(name => !name.startsWith('locales.'))) {
      const text = readFileSync(`${dir}/${file}`, 'utf8')
      for (const match of text.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g)) used.add(match[1]!)
    }
    expect([...used].filter(key => !(key in en))).toEqual([])
  })
})
