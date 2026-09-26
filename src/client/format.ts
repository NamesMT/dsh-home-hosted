/** Pure display helpers: no React, no locale state, easy to unit test. */
import type { AgentToolName, BootState, CliCandidate, CliSource, CliStatus, TokenState } from '../shared/contracts.js'
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

/** Locale key for each agent tool's display label. */
export const AGENT_TOOL_KEYS: Record<AgentToolName, string> = {
  status: 'agentToolStatus',
  servers_list: 'agentToolServersList',
  servers_lifecycle: 'agentToolServersLifecycle',
  servers_edit: 'agentToolServersEdit',
  autostart_manage: 'agentToolAutostartManage',
  ui_manage: 'agentToolUiManage',
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

/** Locale key for where the CLI in use came from (shared with the panel rows). */
export const CLI_SOURCE_KEYS: Record<CliSource, string> = {
  config: 'panelCliConfig',
  dependency: 'panelCliDependency',
  path: 'panelCliPathSource',
  none: 'panelCliMissing',
}

/** `0.6.1 · /usr/local/bin/home-hosted`, with a placeholder for either half. */
export function formatCandidate(candidate: CliCandidate | null | undefined): string {
  if (candidate === null || candidate === undefined) return EMPTY
  return `${dash(candidate.version)} · ${dash(candidate.path)}`
}

/**
 * A path too long for its column, shortened from the middle: the first two
 * segments say where it lives, the last two name the file. A resolved pnpm path
 * is ~140 characters of hashes, and an ellipsis at the end of one leaves the
 * reader with nothing; the whole path stays in the row's title.
 */
export function shortenPath(full: string, max = 52): string {
  if (full.length <= max) return full
  const separator = full.includes('\\') ? '\\' : '/'
  const segments = full.split(/[\\/]/).filter(part => part.length > 0)
  if (segments.length < 4) return full
  // A drive letter is a segment, but it is not a place.
  const head = /^[A-Za-z]:$/.test(segments[0] ?? '') ? 3 : 2
  if (segments.length <= head) return full
  const root = /^[\\/]/.test(full) ? separator : ''
  const short = `${root}${segments.slice(0, head).join(separator)}${separator}…${separator}${segments.slice(-2).join(separator)}`
  return short.length < full.length ? short : full
}

/**
 * Candidate summaries for the two preferences. A host older than the
 * `dependency`/`global` fields still reports which copy it resolved, so the
 * in-use candidate is reconstructed from `source`/`path`/`version` instead of
 * leaving both choices disabled.
 */
export function effectiveCandidates(cli: CliStatus): {
  dependency: CliCandidate | null
  global: CliCandidate | null
} {
  const fromSource = (source: CliCandidate['source']): CliCandidate | null =>
    cli.source === source && cli.path !== null
      ? { source, path: cli.path, version: cli.version }
      : null
  return {
    dependency: cli.dependency ?? fromSource('dependency'),
    global: cli.global ?? fromSource('path'),
  }
}
