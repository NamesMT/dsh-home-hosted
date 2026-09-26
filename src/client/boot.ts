/**
 * Pure helpers for the autostart install/uninstall flow. A refused action is
 * *not* an RPC error: it answers a successful envelope whose payload carries
 * `result.ok === false`, so the UI has to look inside the value.
 */
import type { BootAttempt } from '../shared/contracts.js'

export interface BootFailure {
  detail: string
  commands: string[]
}

export interface BootAttemptView extends BootFailure {
  ok: boolean
  action: BootAttempt['action']
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
