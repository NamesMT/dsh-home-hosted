/**
 * The settings-nav glyph for this section.
 *
 * The settings shell picks nav glyphs from a **closed list of section ids** and falls back
 * to its own gear for anything else, and a `settings.section` registration has no icon to
 * pass — the slot projects only `id` / `order` / `label`, and its owner props carry nothing
 * but `close`. So every third-party section wears the gear. Measured against the installed
 * `dsh-client-ui-settings-general` (and its newest alpha, which is unchanged): `navIcon(id)`
 * tests `account`, `models`, `agent-presets`, `plugins`, `archived-sessions`, then returns
 * `IconSettingsOutlineMedium`.
 *
 * This claims our own row once the dialog is mounted and swaps that gear for the house, so
 * the nav entry reads as the same thing as the page it opens. Three plugins in this profile
 * solve it the same way; delete this module the day `settings.section` grows an `icon` field.
 *
 * Scope, deliberately narrow:
 *
 * - only the row whose visible text equals this section's current label is marked, and an
 *   empty label matches nothing (a locale that has not resolved must not mark the whole nav);
 * - the marker and the injected stylesheet belong to one effect, so they go away with it;
 * - a locale switch re-claims the row through the observer, so the label and glyph never
 *   disagree.
 */
import { HOUSE_PATH } from './icons.js'

/** Marks the one nav row this plugin owns. */
export const NAV_ICON_MARKER = 'data-dsh-home-hosted-nav-icon'

/** The dialog's nav rows: the shell renders each section as a `<button>` inside its `<nav>`. */
export const NAV_ROW_SELECTOR = '[role="dialog"] nav button'

/** The shell renders every nav glyph at this size. */
export const NAV_ICON_SIZE = 16

/**
 * The house as a standalone mask SVG.
 *
 * Painted pure black on purpose: a mask reads alpha only, and the visible colour comes from
 * the element's `background-color: currentColor`. Stroked rather than filled because the
 * glyph set is stroked, so the mask has to describe the same shape the outline draws —
 * `fill="none"` with a round-capped stroke is what makes it match.
 */
export function houseMaskSvg(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" '
    + 'stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">'
    + `<path d="${HOUSE_PATH}"/>`
    + '</svg>'
}

/** The mask URL for the house (encoded at runtime, never hand-escaped). */
export function houseMaskUrl(svg: string = houseMaskSvg()): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Whether a nav row is this plugin's own.
 *
 * Pure, and the only decision this feature makes: the row whose visible text is the label
 * the shell is currently projecting.
 */
export function isOwnNavRow(rowText: string | null | undefined, wantedLabel: string | null | undefined): boolean {
  const wanted = String(wantedLabel ?? '').trim()
  if (wanted.length === 0) return false
  return String(rowText ?? '').trim() === wanted
}

/** Stylesheet for the marked row: hide the shell's gear, draw the house. */
export function navIconCss(maskUrl: string): string {
  return [
    `[${NAV_ICON_MARKER}] > svg { display: none; }`,
    `[${NAV_ICON_MARKER}]::before {`,
    `  content: '';`,
    `  flex: none;`,
    `  width: ${NAV_ICON_SIZE}px;`,
    `  height: ${NAV_ICON_SIZE}px;`,
    `  background-color: currentColor;`,
    `  -webkit-mask-image: url("${maskUrl}");`,
    `  mask-image: url("${maskUrl}");`,
    `  -webkit-mask-repeat: no-repeat;`,
    `  mask-repeat: no-repeat;`,
    `  -webkit-mask-position: center;`,
    `  mask-position: center;`,
    `  -webkit-mask-size: ${NAV_ICON_SIZE}px ${NAV_ICON_SIZE}px;`,
    `  mask-size: ${NAV_ICON_SIZE}px ${NAV_ICON_SIZE}px;`,
    `}`,
  ].join('\n')
}

/** The slice of the client context this needs; `effect` is optional like the rest of it. */
export interface NavIconContext {
  effect?(callback: () => void | (() => void), label?: string): void
}

/**
 * Install the nav glyph.
 *
 * @param ctx - client context, for effect ownership.
 * @param resolveLabel - this section's current label (the same thunk the registration
 *   passes), re-read on every sync so a locale switch is picked up without re-registering.
 */
export function installSettingsNavIcon(ctx: NavIconContext, resolveLabel: () => string): void {
  if (typeof document === 'undefined') return

  const body = (): (() => void) => {
    const tag = document.createElement('style')
    tag.setAttribute('data-plugin', 'dsh-home-hosted')
    tag.setAttribute('data-plugin-css', 'dsh-home-hosted/settings-nav-icon')
    tag.textContent = navIconCss(houseMaskUrl())
    document.head.append(tag)

    let disposed = false
    let scheduled = false

    const sync = (): void => {
      scheduled = false
      if (disposed) return
      const wanted = resolveLabel()
      const rows = document.querySelectorAll(NAV_ROW_SELECTOR)
      // Exactly one row, because this section has exactly one: taking the first match keeps a
      // duplicated label elsewhere in the nav from being decorated as ours too.
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

    // Coalesce a burst of mutations into one sync, and land it in a microtask so the row
    // never paints the gear first.
    const schedule = (): void => {
      if (scheduled || disposed) return
      scheduled = true
      queueMicrotask(sync)
    }

    sync()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    return () => {
      disposed = true
      observer.disconnect()
      const marked = document.querySelectorAll(`[${NAV_ICON_MARKER}]`)
      for (let index = 0; index < marked.length; index += 1) marked.item(index)?.removeAttribute(NAV_ICON_MARKER)
      tag.remove()
    }
  }

  if (typeof ctx.effect === 'function') ctx.effect(body, 'dsh-home-hosted: settings nav icon')
  else body()
}
