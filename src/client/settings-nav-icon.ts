/**
 * The settings-nav glyph for this section.
 *
 * The shell resolves nav glyphs from a closed list of section ids and falls back to its own
 * gear for everything else, and `settings.section` projects only `id`/`order`/`label` — so
 * every third-party section wears the gear. This marks our own row and masks the house in
 * place of it. Delete this module the day the slot grows an `icon` field.
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
    `[${NAV_ICON_MARKER}] > svg { display: none; }`,
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
 */
export function installSettingsNavIcon(ctx: NavIconContext, resolveLabel: () => string): void {
  if (typeof document === 'undefined') return

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

  if (typeof ctx.effect === 'function') ctx.effect(body, 'dsh-home-hosted: settings nav icon')
  else body()
}
