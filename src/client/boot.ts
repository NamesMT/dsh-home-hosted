/**
 * Pure helpers for the autostart install/uninstall flow. A refused action is
 * *not* an RPC error: it answers a successful envelope whose payload carries
 * `result.ok === false`, so the UI has to look inside the value.
 */
import type { BootAttempt, BootCandidate, BootMechanism, BootState } from '../shared/contracts.js'

export interface BootFailure {
  detail: string
  commands: string[]
}

export interface BootAttemptView extends BootFailure {
  ok: boolean
  action: BootAttempt['action']
}

/** A refusal answered in this turn, together with the live status it answered. */
export interface FreshBootAttempt extends BootAttemptView {
  ok: false
  state: BootState
  mechanism: BootMechanism | null
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

/** Pull a refusal out of a `boot.install` / `boot.uninstall` result payload. */
export function bootRefusal(value: unknown): BootFailure | null {
  if (typeof value !== 'object' || value === null) return null
  const result = (value as { result?: unknown }).result
  if (typeof result !== 'object' || result === null) return null
  const { ok, detail, commands } = result as { ok?: unknown, detail?: unknown, commands?: unknown }
  if (ok !== false) return null
  return {
    detail: typeof detail === 'string' ? detail : '',
    commands: stringList(commands),
  }
}

/** Normalise the persisted last attempt for rendering; null when the host kept none. */
export function bootAttemptView(attempt: BootAttempt | undefined): BootAttemptView | null {
  if (attempt === undefined) return null
  return {
    ok: attempt.ok === true,
    action: attempt.action === 'uninstall' ? 'uninstall' : 'install',
    detail: typeof attempt.detail === 'string' ? attempt.detail : '',
    commands: stringList(attempt.commands),
  }
}

/** Boot states in which a boot entry exists, whatever it is doing right now. */
const INSTALLED_STATES: readonly BootState[] = ['enabled-running', 'enabled-failing', 'installed-disabled']

/**
 * Dropdown choices: `auto`, then every available mechanism. The `unsupported`
 * placeholder is hidden unless it is the only thing this platform offers. The
 * currently selected value always stays selectable.
 */
export function bootMechanisms(
  candidates: readonly BootCandidate[],
  selected: 'auto' | BootMechanism,
): Array<'auto' | BootMechanism> {
  const available = candidates.filter(candidate => candidate.available).map(candidate => candidate.mechanism)
  const supported = available.filter(mechanism => mechanism !== 'unsupported')
  const mechanisms: Array<'auto' | BootMechanism> = ['auto', ...(supported.length > 0 ? supported : available)]
  if (!mechanisms.includes(selected)) mechanisms.push(selected)
  return mechanisms
}

/** The installed mechanism differs from the selected one: the action is a switch. */
export function isSwitchingMechanism(
  installed: BootMechanism | null,
  selected: 'auto' | BootMechanism,
): boolean {
  return installed !== null && installed !== selected
}

/**
 * A persisted failure the live state contradicts is history, not news: a
 * failed install once a boot entry exists, or a failed uninstall once none
 * does.
 */
export function isStaleAttempt(view: BootAttemptView | null, state: BootState): boolean {
  if (view === null || view.ok) return false
  if (view.action === 'install') return INSTALLED_STATES.includes(state)
  return state === 'not-installed'
}

/**
 * Which attempt note the section shows. A fresh refusal is news only while the
 * live status still matches the one it answered: someone who ran the printed
 * commands and pressed Re-check has a new status, and the old note goes with it.
 * A persisted refusal the live state contradicts is history, not news.
 */
export function visibleBootAttempt(
  fresh: FreshBootAttempt | null,
  persisted: BootAttemptView | null,
  state: BootState,
  mechanism: BootMechanism | null,
): BootAttemptView | null {
  if (fresh !== null && fresh.state === state && fresh.mechanism === mechanism) return fresh
  return isStaleAttempt(persisted, state) ? null : persisted
}
