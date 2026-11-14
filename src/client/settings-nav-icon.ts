/**
 * The settings-nav glyph for hosts **without** a `settings.section.icon` slot.
 *
 * Before dsh 0.2.2 the shell resolved nav glyphs from a closed list of section ids and fell back
 * to its own gear for everything else, while `settings.section` projected only
 * `id`/`order`/`label` — so every third-party section wore the gear. This marks our own row and
 * masks the house in place of it.
 *
 * **0.2.2 has the seat**: a `settings.section.icon` list, scoped by the same id, rendered as
 * `{ size, active }` over a gear fallback. Two things changed with it and both broke this
 * stand-in, which is why callers now use it only when the slot is absent
 * (`index.tsx`): the gear moved *inside* a `.navIcon` span, so `button > svg` no longer matches
 * and nothing is hidden — leaving the host's gear **beside** our house, the duplicate a user
 * reports. Registering the slot while this is still up produces the same pair from the other
 * side, so arriving must also stop this module.
 *
 * Delete this module the day the oldest supported host declares the icon slot.
 */
import { HOUSE_PATH } from './icons.js'

/** Marks the one nav row this plugin owns. */
export const NAV_ICON_MARKER = 'data-dsh-home-hosted-nav-icon'

/** The dialog's nav rows: the shell renders each section as a `<button>` inside its `<nav>`. */
export const NAV_ROW_SELECTOR = '[role="dialog"] nav button'

/** The size the shell draws every nav glyph at. */
export const NAV_ICON_SIZE = 16

/** The house as a mask SVG: alpha only, so the colour comes from `background-color`. */
export function houseMaskSvg(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" '
    + 'stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">'
    + `<path d="${HOUSE_PATH}"/>`
    + '</svg>'
}

export function houseMaskUrl(): string {
  return `data:image/svg+xml,${encodeURIComponent(houseMaskSvg())}`
}

/** Whether a row is ours: exact text, and an unresolved (empty) label matches nothing. */
export function isOwnNavRow(rowText: string | null | undefined, wantedLabel: string | null | undefined): boolean {
  const wanted = String(wantedLabel ?? '').trim()
  if (wanted.length === 0) return false
  return String(rowText ?? '').trim() === wanted
}

/** Hide the shell's gear on the marked row; draw the house in its place. */
export function navIconCss(maskUrl: string): string {
  return [
    // A **descendant** svg, not a child: 0.2.2 nests the glyph inside a `.navIcon` span, and a
    // `>` here hides nothing there — which is what let the host's gear sit beside the mask. The
    // row holds an icon and a label span and nothing else, so a descendant match cannot hit
    // anything but the glyph, and it keeps this module correct even when it is used on a host
    // that did grow the seat (an `inject` that throws leaves no way to tell).
    `[${NAV_ICON_MARKER}] svg { display: none; }`,
    `[${NAV_ICON_MARKER}]::before {`,
    `  content: '';`,
    `  flex: none;`,
    `  width: ${NAV_ICON_SIZE}px;`,
    `  height: ${NAV_ICON_SIZE}px;`,
    `  background-color: currentColor;`,
    // Longhands: the `mask` shorthand cannot carry the `-webkit-` twin.
    `  -webkit-mask-image: url("${maskUrl}");`,
    `  -webkit-mask-repeat: no-repeat;`,
    `  -webkit-mask-position: center;`,
    `  -webkit-mask-size: ${NAV_ICON_SIZE}px ${NAV_ICON_SIZE}px;`,
    `  mask-image: url("${maskUrl}");`,
    `  mask-repeat: no-repeat;`,
    `  mask-position: center;`,
    `  mask-size: ${NAV_ICON_SIZE}px ${NAV_ICON_SIZE}px;`,
    `}`,
  ].join('\n')
}

/** The slice of the client context this needs; `effect` is optional like the rest of it. */
export interface NavIconContext {
  effect?(callback: () => void | (() => void), label?: string): void
}

/**
 * Mark this section's nav row.
 *
 * @param resolveLabel - the same thunk the section registration passes, re-read on every
 *   sync so a locale switch re-claims the row.
 * @returns a stopper that removes the marker and the stylesheet. The effect's own disposal
 *   does the same, so calling it is safe before or after that, and safe to repeat. The caller
 *   needs it when a host turns out to paint nav glyphs itself *after* this went in: leaving the
 *   stand-in up paints a second glyph beside the host's, which is the duplication this whole
 *   module exists to avoid.
 */
export function installSettingsNavIcon(ctx: NavIconContext, resolveLabel: () => string): () => void {
  if (typeof document === 'undefined') return () => {}

  const body = (): () => void => {
    const tag = document.createElement('style')
    tag.setAttribute('data-plugin-css', 'dsh-home-hosted/settings-nav-icon')
    tag.textContent = navIconCss(houseMaskUrl())
    document.head.append(tag)

    // Exactly one row, because this section has exactly one: the first match wins, so a
    // duplicated label elsewhere cannot be decorated as ours.
    const sync = (): void => {
      const wanted = resolveLabel()
      const rows = document.querySelectorAll(NAV_ROW_SELECTOR)
      let owner: Element | null = null
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows.item(index)
        if (row === null) continue
        if (owner === null && isOwnNavRow(row.textContent, wanted))
          owner = row
        else
          row.removeAttribute(NAV_ICON_MARKER)
      }
      owner?.setAttribute(NAV_ICON_MARKER, '')
    }

    // Attribute writes are not observed, so this cannot recurse.
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    return () => {
      observer.disconnect()
      const marked = document.querySelectorAll(`[${NAV_ICON_MARKER}]`)
      for (let index = 0; index < marked.length; index += 1) marked.item(index)?.removeAttribute(NAV_ICON_MARKER)
      tag.remove()
    }
  }

  let stop = (): void => {}
  if (typeof ctx.effect === 'function')
    ctx.effect(() => { stop = body() }, 'dsh-home-hosted: settings nav icon')
  else
    stop = body()
  return () => stop()
}
