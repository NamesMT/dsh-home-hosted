/**
 * Structural mirrors of the client services this page consumes. The runtime
 * owns the real implementation; every read here is optional so a missing
 * service degrades the page instead of breaking the settings dialog.
 */

/** Translate function bound to this plugin's namespace. */
export interface TranslateFn {
  (key: string, params?: Record<string, unknown>): string
}

/** Locale registry face (`@deepseek-ai/dsh-client-locale`). */
export interface LocaleService {
  bind(ns: string): TranslateFn
  /** Single-locale form. */
  register(ns: string, locale: string, dict: Record<string, string>): () => void
  /** Typed bilingual form: every shipped locale in one call. */
  register(ns: string, dicts: { en: Record<string, string>, zh: Record<string, string> }): () => void
}

/**
 * One slot registration option bag.
 *
 * `settings.section` takes `id`/`order`/`label` and **no icon** — dsh 0.2.2 puts the glyph in a
 * separate `settings.section.icon` list scoped by the same id, so a section that wants its own
 * mark registers there as well. Before 0.2.2 there was no such slot and every third-party
 * section wore the shell's gear; `settings-nav-icon.ts` covers those hosts.
 */
export interface SlotRegisterOptions {
  name: string
  id: string
  order?: number
  label?: string | (() => string)
  locale?: string
  inject?: () => Record<string, unknown>
}

/**
 * What the host hands a `settings.section.icon` contribution.
 *
 * `renderSlot(…, { size: 16, active }, { only: row.id })` in the shell's SettingsRoot: the
 * glyph is told its pixel size and whether its section is the open one.
 */
export interface SlotIconProps {
  size?: number
  active?: boolean
}

/** Client slot registry face (`@deepseek-ai/dsh-client-ui-slots`). */
export interface SlotsService {
  register(options: SlotRegisterOptions, component: unknown): () => void
  /** Run `callback` for each declaration lifetime of `key`; no-op while undeclared. */
  inject(key: string, callback: () => () => void): () => void
}

/** The slice of the client cordis context this plugin touches. */
export interface ClientContext {
  get?(name: string): unknown
  effect?(fn: () => void | (() => void), label?: string): () => void
  [name: string]: unknown
}
