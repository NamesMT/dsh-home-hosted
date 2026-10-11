// @vitest-environment happy-dom
/**
 * The settings-nav glyph. The two failures worth pinning are marking a row that is not ours
 * (which would put the house on a neighbour) and failing to let go when the effect is disposed.
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  houseMaskSvg,
  houseMaskUrl,
  installSettingsNavIcon,
  isOwnNavRow,
  NAV_ICON_MARKER,
  navIconCss,
} from '../../src/client/settings-nav-icon.js'

/** The shell's nav: a dialog with a nav of `<button>`s, each an icon + a label span. */
function mountNav(labels: string[]): void {
  document.body.innerHTML = `<div role="dialog"><nav>${
    labels.map(label => `<button type="button"><svg data-gear="1"></svg><span>${label}</span></button>`).join('')
  }</nav></div>`
}

/** Rows carrying our marker, by their visible text. */
function marked(): string[] {
  const rows = document.querySelectorAll(`[${NAV_ICON_MARKER}]`)
  const out: string[] = []
  for (let index = 0; index < rows.length; index += 1) out.push((rows.item(index)?.textContent ?? '').trim())
  return out
}

/** The module syncs from a MutationObserver callback, which happy-dom delivers as a task. */
const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

/** Install through the seam the client uses, so the test can dispose the same way. */
function install(resolveLabel: () => string): { dispose: () => void } {
  let disposer: (() => void) | null = null
  installSettingsNavIcon({ effect: (callback) => { disposer = callback() ?? null } }, resolveLabel)
  return { dispose: () => { disposer?.(); disposer = null } }
}

/** Retype a nav label, as the shell does on a locale switch. */
function relabel(index: number, text: string): void {
  const span = document.querySelectorAll('nav button span').item(index)
  if (span !== null) span.textContent = text
}

let live: { dispose: () => void } | null = null

afterEach(() => {
  live?.dispose()
  live = null
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

describe('the settings-nav glyph', () => {
  it('marks only this section\'s row, never a neighbour', async () => {
    mountNav(['General', 'Home Hosted', 'Side card'])
    live = install(() => 'Home Hosted')
    await settle()
    expect(marked()).toEqual(['Home Hosted'])
  })

  it('marks neither a row that merely contains our label nor a shorter one', async () => {
    mountNav(['Home Hosted Advanced', 'Home Hosted'])
    live = install(() => 'Home Hosted')
    await settle()
    expect(marked()).toEqual(['Home Hosted'])
  })

  it('marks nothing while the label is unresolved, then claims the row once it resolves', async () => {
    mountNav(['General', 'Home Hosted'])
    let label = ''
    live = install(() => label)
    await settle()
    expect(marked()).toEqual([])

    label = 'Home Hosted'
    relabel(1, 'Home Hosted')
    await settle()
    expect(marked()).toEqual(['Home Hosted'])
  })

  it('re-claims the row when a locale switch changes the label', async () => {
    mountNav(['General', '首页托管'])
    let label = 'Home Hosted'
    live = install(() => label)
    await settle()
    expect(marked(), 'the old label matches no row now').toEqual([])

    label = '首页托管'
    relabel(1, '首页托管')
    await settle()
    expect(marked()).toEqual(['首页托管'])
  })

  it('claims exactly one row even when another entry shares the label', async () => {
    mountNav(['Home Hosted', 'Home Hosted'])
    live = install(() => 'Home Hosted')
    await settle()
    expect(marked()).toEqual(['Home Hosted'])
  })

  it('leaves no marker and no stylesheet behind when the effect is disposed', async () => {
    mountNav(['Home Hosted'])
    live = install(() => 'Home Hosted')
    await settle()
    expect(document.querySelectorAll('[data-plugin-css="dsh-home-hosted/settings-nav-icon"]').length).toBe(1)

    live.dispose()
    live = null
    expect(marked()).toEqual([])
    expect(document.querySelectorAll('[data-plugin-css="dsh-home-hosted/settings-nav-icon"]').length).toBe(0)
  })

  it('cannot re-mark a row after disposal', async () => {
    mountNav(['Home Hosted'])
    const instance = install(() => 'Home Hosted')
    await settle()
    instance.dispose()
    relabel(0, 'Home Hosted')
    await settle()
    expect(marked()).toEqual([])
  })

  it('does nothing when there is no document to mark', () => {
    // The module is bundled into the host half too, where `document` is absent.
    const scope = globalThis as { document?: Document }
    const saved = scope.document
    delete scope.document
    try {
      expect(() => { installSettingsNavIcon({}, () => 'Home Hosted') }).not.toThrow()
    }
    finally {
      scope.document = saved
    }
  })

  it('hides the shell\'s glyph and draws ours from a mask, at the shell\'s own 16px', () => {
    const css = navIconCss(houseMaskUrl())
    // Hidden, not removed: the row's box model stays the shell's.
    expect(css).toContain(`[${NAV_ICON_MARKER}] > svg { display: none; }`)
    expect(css).toContain('mask-image: url("data:image/svg+xml,')
    expect(css).toContain('-webkit-mask-image:')
    expect(css).toContain('background-color: currentColor')
    expect(css).toContain('16px 16px')
  })

  it('draws the house as a stroked mask, not a filled blob', () => {
    const svg = houseMaskSvg()
    expect(svg).toContain('fill="none"')
    expect(svg).toContain('stroke="#000"')
    expect(svg).toContain('viewBox="0 0 16 16"')
    // A mask reads alpha only, so the shape has to be described rather than default-filled.
    expect(houseMaskUrl()).toMatch(/^data:image\/svg\+xml,/)
    expect(houseMaskUrl()).not.toContain(' ')
  })

  it('matches on trimmed text, exactly, and refuses an empty want', () => {
    expect(isOwnNavRow(' Home Hosted ', 'Home Hosted')).toBe(true)
    expect(isOwnNavRow('Side card', 'Home Hosted')).toBe(false)
    // Substring matching passed every other case here and would decorate a neighbour.
    expect(isOwnNavRow('Home Hosted Advanced', 'Home Hosted')).toBe(false)
    expect(isOwnNavRow('', '')).toBe(false)
    expect(isOwnNavRow(undefined, null)).toBe(false)
  })
})
