/** Pure display helpers: no React, no locale state, easy to unit test. */
import type { AgentToolName, BootState, TokenState } from '../shared/contracts.js'
import { MUTATING_AGENT_TOOLS } from '../shared/contracts.js'

/** Placeholder for an absent value. */
export const EMPTY = '—'

/** Render a scalar, or {@link EMPTY} when it is absent or blank. */
export function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY
  const text = String(value)
  return text.length > 0 ? text : EMPTY
}

/** Render an owned-key drift list. */
export function formatDrift(drift: readonly string[]): string {
  return drift.length > 0 ? drift.join(', ') : EMPTY
}

/** `stopKillPortHolders` → `Stop kill port holders`. */
export function humanizeKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  if (words.length === 0) return key
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Whether a tool changes state (and therefore asks for approval). */
export function isMutatingTool(name: AgentToolName): boolean {
  return MUTATING_AGENT_TOOLS.includes(name)
}

/** Locale key for a write path. */
export const WRITE_VIA_KEYS: Record<'api' | 'file' | 'none', string> = {
  api: 'writeViaApi',
  file: 'writeViaFile',
  none: 'writeViaNone',
}

/** Locale key for a token state. */
export const TOKEN_KEYS: Record<TokenState, string> = {
  enrolled: 'tokenEnrolled',
  present: 'tokenPresent',
  absent: 'tokenAbsent',
  unknown: 'tokenUnknown',
}

/** Locale key for a boot state. */
export const BOOT_STATE_KEYS: Record<BootState, string> = {
  'not-installed': 'bootStateNotInstalled',
  'installed-disabled': 'bootStateInstalledDisabled',
  'enabled-running': 'bootStateEnabledRunning',
  'enabled-failing': 'bootStateEnabledFailing',
  'unsupported': 'bootStateUnsupported',
}
