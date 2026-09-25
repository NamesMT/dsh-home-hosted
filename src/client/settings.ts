/**
 * Settings patch diffing. `settings.update` receives only the keys the user
 * actually changed, so a save never round-trips untouched live state back to
 * the host (which would freeze values that are still inheriting defaults).
 */
import type { AgentToolName, EntryIntent, PluginSettings } from '../shared/contracts.js'
import { AGENT_TOOL_NAMES } from '../shared/contracts.js'

/** Deep partial of the plugin settings; only changed subtrees may appear. */
export interface SettingsPatch {
  autostart?: Partial<PluginSettings['autostart']>
  entries?: EntryIntent[]
  agentTools?: Partial<PluginSettings['agentTools']>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  // Arrays (and anything non-primitive) compare by value: they are replaced
  // wholesale by the host, never merged.
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  }
  catch {
    return false
  }
}

/** Keep only the keys of `next` whose value differs from `base`, descending into plain objects. */
export function diffObject<T extends Record<string, unknown>>(
  base: Partial<T>,
  next: Partial<T>,
): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(next)) {
    const before = (base as Record<string, unknown>)[key]
    const after = (next as Record<string, unknown>)[key]
    if (isPlainObject(before) && isPlainObject(after)) {
      const child = diffObject(before, after)
      if (Object.keys(child).length > 0) out[key] = child
    }
    else if (!valuesEqual(before, after)) {
      out[key] = after
    }
  }
  return out as Partial<T>
}

/** Diff two plugin settings snapshots down to the changed subtree. */
export function diffSettings(base: PluginSettings, next: PluginSettings): SettingsPatch {
  return diffObject(
    base as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>,
  ) as SettingsPatch
}

/** Add or remove one tool from the allow list, keeping {@link AGENT_TOOL_NAMES} order. */
export function toggleAllowed(
  allow: readonly AgentToolName[],
  name: AgentToolName,
  enabled: boolean,
): AgentToolName[] {
  const set = new Set(allow)
  if (enabled) set.add(name)
  else set.delete(name)
  return AGENT_TOOL_NAMES.filter(candidate => set.has(candidate))
}
