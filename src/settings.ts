/**
 * The plugin's own settings, kept in a 0600 JSON file under its state directory.
 *
 * These are the things a person toggles; the Cordis row config stays for
 * operator overrides only, so neither surface can silently overwrite the other.
 */
import { AGENT_TOOL_NAMES, DEFAULT_SETTINGS } from './shared/contracts.js'
import type { AgentToolName, EntryIntent, PluginSettings, SettingsPatch } from './shared/contracts.js'
import { readJson, writeJsonAtomic } from './util/fsx.js'
import { defaultIntent } from './home-hosted/entries.js'

function knownTool(value: unknown): value is AgentToolName {
  return typeof value === 'string' && (AGENT_TOOL_NAMES as readonly string[]).includes(value)
}

function normalizeIntent(value: Partial<EntryIntent> | null | undefined, fallbackId: string): EntryIntent {
  const base = defaultIntent(typeof value?.id === 'string' && value.id.length > 0 ? value.id : fallbackId)
  return {
    id: base.id,
    autostart: typeof value?.autostart === 'boolean' ? value.autostart : base.autostart,
    onPortConflict: value?.onPortConflict ?? base.onPortConflict,
    stopKillPortHolders: typeof value?.stopKillPortHolders === 'boolean' ? value.stopKillPortHolders : base.stopKillPortHolders,
  }
}

function normalize(raw: Partial<PluginSettings> | null, fallbackEntryId: string): PluginSettings {
  const entries = Array.isArray(raw?.entries)
    ? raw.entries.map(intent => normalizeIntent(intent, fallbackEntryId))
    : []
  const allow = Array.isArray(raw?.agentTools?.allow) ? raw.agentTools.allow.filter(knownTool) : DEFAULT_SETTINGS.agentTools.allow
  const attempt = raw?.autostart?.lastAttempt
  return {
    autostart: {
      enabled: raw?.autostart?.enabled === true,
      mechanism: raw?.autostart?.mechanism ?? 'auto',
      ...(attempt === undefined ? {} : { lastAttempt: attempt }),
    },
    entries,
    agentTools: {
      enabled: raw?.agentTools?.enabled === true,
      allow: allow.length > 0 ? allow : [...DEFAULT_SETTINGS.agentTools.allow],
    },
    cli: {
      prefer: raw?.cli?.prefer === 'global' ? 'global' : 'pinned',
    },
  }
}

export class SettingsStore {
  private current: PluginSettings
  private readonly listeners = new Set<(settings: PluginSettings) => void>()

  constructor(
    readonly file: string,
    private readonly fallbackEntryId: string,
  ) {
    this.current = normalize(readJson<Partial<PluginSettings>>(file), fallbackEntryId)
  }

  get(): PluginSettings {
    return this.current
  }

  /** The intent for an entry, materialising the default when it has none yet. */
  intentFor(id: string): EntryIntent {
    return this.current.entries.find(entry => entry.id === id) ?? defaultIntent(id)
  }

  update(patch: SettingsPatch): PluginSettings {
    const next = normalize({
      autostart: { ...this.current.autostart, ...(patch.autostart ?? {}) },
      entries: patch.entries ?? this.current.entries,
      agentTools: { ...this.current.agentTools, ...(patch.agentTools ?? {}) },
      cli: { ...this.current.cli, ...(patch.cli ?? {}) },
    }, this.fallbackEntryId)
    this.current = next
    writeJsonAtomic(this.file, next, 0o600)
    for (const listener of this.listeners)
      listener(next)
    return next
  }

  onChange(listener: (settings: PluginSettings) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
