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
  register(ns: string, locale: string, dict: Record<string, string>): () => void
}

/** One `settings.section` registration option bag. */
export interface SlotRegisterOptions {
  name: string
  id: string
  order?: number
  label?: string | (() => string)
  locale?: string
  inject?: () => Record<string, unknown>
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
