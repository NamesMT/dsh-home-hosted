/**
 * The plugin's own settings, kept in a 0600 JSON file under its state directory.
 *
 * These are the things a person toggles; the Cordis row config stays for
 * operator overrides only, so neither surface can silently overwrite the other.
 */
import { AGENT_TOOL_NAMES, DEFAULT_SETTINGS, isOnPortConflict } from './shared/contracts.js'
import type { AgentToolName, EntryIntent, PluginSettings, SettingsPatch } from './shared/contracts.js'
import { isBootMechanismName, isRecord, SETTINGS_VERSION } from './shared/contracts.js'
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
    // Absent means a stored intent from before persistence existed: it wants it.
    persistent: typeof value?.persistent === 'boolean' ? value.persistent : base.persistent,
    // Only a policy the panel's own schema parses may reach the config it boots from.
    onPortConflict: isOnPortConflict(value?.onPortConflict) ? value.onPortConflict : base.onPortConflict,
    stopKillPortHolders: typeof value?.stopKillPortHolders === 'boolean' ? value.stopKillPortHolders : base.stopKillPortHolders,
  }
}

/**
 * Tools that were split apart before 0.2.0 and merged since. An allowlist
 * written by an older release lists the old names, and an unknown name is
 * dropped — which would silently turn every tool off on upgrade.
 */
const LEGACY_TOOL_NAMES: Record<string, string> = {
  servers_start: 'servers_lifecycle',
  servers_stop: 'servers_lifecycle',
  servers_restart: 'servers_lifecycle',
  servers_create: 'servers_edit',
  servers_update: 'servers_edit',
  servers_delete: 'servers_edit',
  autostart_install: 'autostart_manage',
  autostart_uninstall: 'autostart_manage',
}

/** The pair an older release wrote when nobody had chosen anything. */
function isLegacyDefaultAllowlist(names: readonly string[]): boolean {
  return names.length === 2 && names.includes('status') && names.includes('servers_list')
}

/**
 * The release that merged the split tools and introduced `manageDsh`. The
 * migration bound is that release, never the current `SETTINGS_VERSION`: bumping
 * the stamp for an unrelated field must not re-run a "nobody chose" reading over
 * a file that already speaks the current shape.
 */
const PRE_MERGE_SETTINGS_VERSION = 2

/** `auto` is this file's own value; the mechanisms themselves come from the shared list. */
function isBootMechanism(value: unknown): value is PluginSettings['autostart']['mechanism'] {
  return value === 'auto' || isBootMechanismName(value)
}

/**
 * `lastAttempt` narrowed for the page: a record with the shape it can render.
 *
 * Delegates the "is it an object" half to the shared predicate rather than repeating it —
 * the name and the narrowed type are what this wrapper is for.
 */
function isBootAttempt(value: unknown): value is NonNullable<PluginSettings['autostart']['lastAttempt']> {
  return isRecord(value)
}


function normalize(raw: Partial<PluginSettings> | null, fallbackEntryId: string): PluginSettings {
  const entries = Array.isArray(raw?.entries)
    ? raw.entries.map(intent => normalizeIntent(intent, fallbackEntryId))
    : []
  const declared = Array.isArray(raw?.agentTools?.allow) ? raw.agentTools.allow : null
  // Only a file written before the version stamp needs translating: the release
  // that wrote it named tools this one merged, and dropping those names silently
  // would turn every tool off on upgrade.
  const legacyFile = (typeof raw?.version === 'number' ? raw.version : 1) < PRE_MERGE_SETTINGS_VERSION
  const migrated = declared === null
    ? null
    : [...new Set(declared.map(name => (legacyFile ? LEGACY_TOOL_NAMES[name] ?? name : name)).filter(knownTool))] as AgentToolName[]
  // In a legacy file the old default pair is not a choice, it is what that
  // release wrote for "unset".
  const choseNothing = legacyFile && declared !== null && migrated !== null && isLegacyDefaultAllowlist(declared)
  const allow = migrated === null || choseNothing ? [...DEFAULT_SETTINGS.agentTools.allow] : migrated
  // Only a real attempt is kept. `lastAttempt?: BootAttempt` means *absent or an
  // object*, and spreading anything else through broke that: a file (or an RPC patch)
  // carrying an explicit `null` — which is what a cleared optional looks like once it
  // has been written back — reached the page as `null`, and `bootAttemptView` reads
  // `.ok` off it, so the Boot section crashed on render. A non-object is treated as
  // "no attempt kept", which is what the field means.
  const attempt = raw?.autostart?.lastAttempt
  return {
    version: SETTINGS_VERSION,
    autostart: {
      enabled: raw?.autostart?.enabled === true,
      mechanism: isBootMechanism(raw?.autostart?.mechanism) ? raw.autostart.mechanism : 'auto',
      ...(isBootAttempt(attempt) ? { lastAttempt: attempt } : {}),
    },
    // A pre-0.2.0 file expressed management only by holding an intent for the
    // harness entry; the page's toggle needs the flag it never had.
    manageDsh: raw?.manageDsh === true
      || (legacyFile && entries.some(entry => entry.id === fallbackEntryId)),
    entries,
    panel: {
      // An integer in range, or nothing: the panel's schema rejects anything else,
      // and a value it cannot parse stops it booting at all.
      port: typeof raw?.panel?.port === 'number' && Number.isInteger(raw.panel.port) && raw.panel.port >= 1 && raw.panel.port <= 65535
        ? raw.panel.port
        : null,
    },
    authNotice: raw?.authNotice === undefined ? DEFAULT_SETTINGS.authNotice : raw.authNotice === true,
    // Absent means on: a stale token is a fault to repair, not a setting to opt into.
    reclaimToken: raw?.reclaimToken === undefined ? DEFAULT_SETTINGS.reclaimToken : raw.reclaimToken === true,
    // Absent means on: a plugin that owns one panel should say so by default.
    instancesNotice: raw?.instancesNotice === undefined ? DEFAULT_SETTINGS.instancesNotice : raw.instancesNotice === true,
    uiStyle: raw?.uiStyle === 'compact' ? 'compact' : 'detailed',
    agentTools: {
      // Absent means the default (on), and so does the pair the previous
      // release wrote for it; any other explicit false stays false.
      enabled: choseNothing || raw?.agentTools?.enabled === undefined
        ? DEFAULT_SETTINGS.agentTools.enabled
        : raw.agentTools.enabled === true,
      // Absent means every tool; an explicit empty list means none of them.
      allow,
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
      // A patch is not a legacy file: the migration belongs to reading one.
      version: SETTINGS_VERSION,
      autostart: { ...this.current.autostart, ...(patch.autostart ?? {}) },
      manageDsh: patch.manageDsh ?? this.current.manageDsh,
      entries: patch.entries ?? this.current.entries,
      panel: { ...this.current.panel, ...(patch.panel ?? {}) },
      authNotice: patch.authNotice ?? this.current.authNotice,
      reclaimToken: patch.reclaimToken ?? this.current.reclaimToken,
      instancesNotice: patch.instancesNotice ?? this.current.instancesNotice,
      uiStyle: patch.uiStyle ?? this.current.uiStyle,
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
