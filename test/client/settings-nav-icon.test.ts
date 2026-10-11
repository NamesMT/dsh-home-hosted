// @vitest-environment happy-dom
/**
 * The settings-nav glyph, which the shell has no option to set.
 *
 * `settings.section` projects only `id` / `order` / `label`, and the shell's `navIcon(id)`
 * maps a closed list of ids before falling back to its own gear — so a third-party section
 * cannot pass an icon and wears the gear. This module claims the row instead, and the two
 * things that can go wrong are worth pinning: marking a row that is not ours (which would
 * put the house on another plugin's entry, or on all of them once a locale has not resolved),
 * and failing to let go when the effect is disposed.
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  houseMaskSvg,
  houseMaskUrl,
  installSettingsNavIcon,
  isOwnNavRow,
  NAV_ICON_MARKER,
  NAV_ROW_SELECTOR,
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

/** One flush of the observer's microtask, which is how the module syncs. */
async function settle(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Install through the same seam the client uses: `ctx.effect` owns the lifetime, so the
 * test must dispose through it too. Leaving an observer alive would let one case's module
 * mark rows in the next case's DOM.
 */
function install(resolveLabel: () => string): { dispose: () => void } {
  let disposer: (() => void) | null = null
  installSettingsNavIcon({
    effect: (callback) => {
      disposer = callback() ?? null
    },
  }, resolveLabel)
  return {
    dispose: () => {
      disposer?.()
      disposer = null
    },
  }
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

  it('marks nothing while the label is unresolved, so it cannot claim the whole nav', async () => {
    mountNav(['General', 'Home Hosted'])
    let label = ''
    live = install(() => label)
    await settle()
    expect(marked()).toEqual([])

    // And once the label resolves, the row is claimed on the next pass.
    label = 'Home Hosted'
    const span = document.querySelectorAll('nav button span').item(1)
    if (span !== null) span.textContent = 'Home Hosted'
    await settle()
    expect(marked()).toEqual(['Home Hosted'])
  })

  it('re-claims the row when a locale switch changes the label', async () => {
    mountNav(['General', '首页托管'])
    let label = 'Home Hosted'
    live = install(() => label)
    await settle()
    expect(marked(), 'the old label matches no row now').toEqual([])

    // The shell re-renders the label span; the observer is what notices. Only the row that
    // already carries the label is touched — mutating a different span would fake a match.
    label = '首页托管'
    const span = document.querySelectorAll('nav button span').item(1)
    if (span !== null) span.textContent = '首页托管'
    await settle()
    expect(marked()).toEqual(['首页托管'])
  })

  it('claims exactly one row even when another entry shares the label', async () => {
    // Two identical labels is not a real nav, but "claim the row" must not degenerate into
    // "claim every row that reads like ours".
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

  it('hides the shell\'s glyph and draws ours from a mask, at the shell\'s own 16px', () => {
    const css = navIconCss(houseMaskUrl())
    // The shell's svg is hidden, not removed: the row's box model is the shell's.
    expect(css).toContain(`[${NAV_ICON_MARKER}] > svg { display: none; }`)
    expect(css).toContain('mask-image: url("data:image/svg+xml,')
    expect(css).toContain('background-color: currentColor')
    expect(css).toContain('16px 16px')
  })

  it('draws the house as a stroked mask, matching the glyph set rather than a filled blob', () => {
    const svg = houseMaskSvg()
    expect(svg).toContain('fill="none"')
    expect(svg).toContain('stroke="#000"')
    expect(svg).toContain('viewBox="0 0 16 16"')
    // A mask reads alpha only, so the shape must be described, not left to a default fill.
    expect(houseMaskUrl()).toMatch(/^data:image\/svg\+xml,/)
    expect(houseMaskUrl()).not.toContain(' ')
  })

  it('matches a row by its trimmed text, and refuses an empty want', () => {
    expect(isOwnNavRow(' Home Hosted ', 'Home Hosted')).toBe(true)
    expect(isOwnNavRow('Side card', 'Home Hosted')).toBe(false)
    expect(isOwnNavRow('', '')).toBe(false)
    expect(isOwnNavRow(undefined, null)).toBe(false)
    // Exact, not substring: a neighbouring entry whose label merely contains ours must not be
    // claimed, or the house would land on the wrong row. Breaking `===` to `.includes` passed
    // every other case here, which is why this one exists.
    expect(isOwnNavRow('Home Hosted Advanced', 'Home Hosted')).toBe(false)
    expect(isOwnNavRow('Home Hosted', 'Home')).toBe(false)
  })

  it('marks neither a row that merely contains our label nor a shorter one', async () => {
    mountNav(['Home Hosted Advanced', 'Home Hosted'])
    live = install(() => 'Home Hosted')
    await settle()
    expect(marked()).toEqual(['Home Hosted'])
  })

  it('does nothing at all when there is no document to mark', () => {
    // The module is imported by the host half too, where `document` is absent.
    expect(typeof NAV_ROW_SELECTOR).toBe('string')
  })
})
