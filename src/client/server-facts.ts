/**
 * Server facts in words. A panel entry carries numbers and objects; a person
 * reading a card wants `3 retries · 1s → ×2` or `HTTP <400 on /`, not the
 * serialized record those came from. Everything raw lives behind the card's
 * "Raw config" disclosure instead.
 *
 * Translator-injected and pure, like `status.ts`, so the wording is pinned by
 * a test without mounting anything.
 */
import type { TranslateFn } from './context.js'
import { EMPTY } from './format.js'

/** The panel's own probe interval; anything else is worth showing. */
const DEFAULT_INTERVAL_MS = 5000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Milliseconds in the unit a delay is actually read in: `1000` → `1s`. */
export function secondsLabel(ms: number): string {
  const seconds = ms / 1000
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`
}

/**
 * `HTTP <400 on /`, `port 6302` or `disabled`. The probe interval rides along
 * only when it is not the panel's default.
 */
export function healthLine(health: unknown, port: number | null, t: TranslateFn): string {
  if (!isRecord(health)) return EMPTY
  if (health.enabled !== true) return t('serversDisabled')

  const mode = stringField(health, 'mode')
  const http = isRecord(health.http) ? health.http : null
  let line: string
  if (mode === 'http' || (mode === null && http !== null)) {
    const path = (http === null ? null : stringField(http, 'path')) ?? '/'
    const status = http === null ? null : numberField(http, 'expectStatus')
    const below = http === null ? null : numberField(http, 'expectStatusBelow')
    line = status !== null
      ? t('serversHealthHttp', { status, path })
      : below !== null
        ? t('serversHealthHttpBelow', { status: below, path })
        : t('serversHealthHttpProbe', { path })
  }
  else if (port !== null) {
    line = t('serversHealthPort', { port })
  }
  else {
    line = t('serversHealthProbe')
  }

  const interval = numberField(health, 'intervalMs')
  return interval !== null && interval !== DEFAULT_INTERVAL_MS
    ? `${line} · ${t('serversHealthEvery', { seconds: secondsLabel(interval) })}`
    : line
}

/** `3 retries · 1s → ×2`, `disabled`, or a bare `enabled` when the numbers are gone. */
export function restartLine(restart: unknown, t: TranslateFn): string {
  if (!isRecord(restart)) return EMPTY
  if (restart.enabled === false) return t('serversDisabled')
  const retries = numberField(restart, 'maxRetries')
  const base = numberField(restart, 'baseDelayMs')
  const factor = numberField(restart, 'factor')
  if (retries === null || base === null || factor === null) return t('serversEnabled')
  return t('serversRestartSummary', { retries, base: secondsLabel(base), factor })
}
