/**
 * Writing a panel's files directly, for the case where its API cannot be used
 * (nobody is running, or its token was refused).
 *
 * On home-hosted 0.7 the state is two files, not one:
 *
 * - `.hh/<workspace>/servers.config.json` — the entries (`$schema`, `meta`, `servers`);
 * - `.hh/settings.json` — the panel's own `control` block (its port, its bind).
 *
 * When the panel *is* running this path is a fallback: its file watcher treats an
 * external edit as a real change, and a newly added `autostart` entry is started
 * at once. The managed add therefore writes the entry disabled first and only
 * then flips `autostart`, which the watcher sees as a changed definition —
 * applied on that entry's next start, never started now.
 *
 * A pre-0.7 root is refused: starting the panel once relocates it.
 */
import fs from 'node:fs'
import type { ServerEntry, ServerEntryPatch } from '../shared/contracts.js'
import { readJson, writeFileAtomic } from '../util/fsx.js'
import { DEFAULT_WORKSPACE, globalSettingsFile, migrationRefusal, serversFile } from './layout.js'

export interface RawConfig {
  meta?: Record<string, unknown>
  servers?: ServerEntry[]
  [key: string]: unknown
}

export interface GlobalSettings {
  meta?: Record<string, unknown>
  control?: Record<string, unknown>
  [key: string]: unknown
}

export interface ConfigReadResult {
  raw: RawConfig | null
  exists: boolean
  error: string | null
}

export interface SettingsReadResult {
  raw: GlobalSettings | null
  exists: boolean
  error: string | null
}

/** A write that cannot land where it was asked to: a root still on the old layout. */
export class ConfigLayoutError extends Error {
  override name = 'ConfigLayoutError'
}

/** One workspace's entries. A not-yet-migrated root is reported, never parsed. */
export function readConfig(home: string, workspace: string = DEFAULT_WORKSPACE): ConfigReadResult {
  const refusal = migrationRefusal(home)
  if (refusal !== null)
    return { raw: null, exists: false, error: refusal }
  const file = serversFile(home, workspace)
  const raw = readJson<RawConfig>(file)
  if (raw === null) {
    // Distinguish "no file yet" from "unreadable", because only the first is safe to create.
    const exists = fs.existsSync(file)
    return { raw: null, exists, error: exists ? 'the workspace config file could not be parsed' : null }
  }
  // A JSON *array* parses fine and then reads as "no servers", which is the one
  // way a malformed file gets past this guard and is still written back: spreading
  // it into the object form it should have been turns `[{…}]` into `{"0":{…}}`.
  // The panel refuses a non-object servers file outright, so this does too.
  if (!isRecordValue(raw))
    return { raw: null, exists: true, error: 'the workspace config file does not contain a JSON object' }
  if (!Array.isArray(raw.servers) && raw.servers !== undefined)
    return { raw: null, exists: true, error: 'the workspace config file has a servers field that is not an array' }
  // Every entry has to be an object: `findEntry` and `patchEntry` read `.id` off
  // them, so a `null` or a string in the list made those throw a raw TypeError —
  // a crash where the panel reports `servers[i]: …` and keeps the rest running.
  if (Array.isArray(raw.servers)) {
    const index = raw.servers.findIndex(entry => !isRecordValue(entry))
    if (index >= 0)
      return { raw: null, exists: true, error: `the workspace config file has an entry at servers[${index}] that is not an object` }
  }
  return { raw, exists: true, error: null }
}

/**
 * Write one workspace's entries back with home-hosted's own `meta` contract,
 * which records the release that wrote the file and the shape it wrote.
 *
 * `schema` is never invented here: a file that declared one keeps it, and one
 * that did not stays without it — home-hosted reads an absent schema as "the
 * current one", so stamping our own idea of the schema would one day fail its
 * own guard ("this release understands schema N") and stop the panel booting
 * from a file this plugin only patched.
 */
export function writeConfig(home: string, raw: RawConfig, writtenBy = 'dsh-home-hosted', workspace: string = DEFAULT_WORKSPACE): void {
  refuseUnmigrated(home)
  const meta = { ...(raw.meta ?? {}), writtenBy }
  const next: RawConfig = { ...raw, meta }
  writeFileAtomic(serversFile(home, workspace), `${JSON.stringify(next, null, 2)}\n`)
}

/** The panel's own settings file, where 0.7 keeps `control` (listener, auth, TLS). */
export function readGlobalSettings(home: string): SettingsReadResult {
  const refusal = migrationRefusal(home)
  if (refusal !== null)
    return { raw: null, exists: false, error: refusal }
  const file = globalSettingsFile(home)
  const raw = readJson<GlobalSettings>(file)
  if (raw === null) {
    const exists = fs.existsSync(file)
    return { raw: null, exists, error: exists ? 'the panel settings file could not be parsed' : null }
  }
  // Same rule as the servers file: a JSON array parses and would be spread into
  // the object form on the next write, so it is refused rather than reshaped.
  if (!isRecordValue(raw))
    return { raw: null, exists: true, error: 'the panel settings file does not contain a JSON object' }
  if (raw.control !== undefined && !isRecordValue(raw.control))
    return { raw: null, exists: true, error: 'the panel settings file has a control field that is not an object' }
  return { raw, exists: true, error: null }
}

export function writeGlobalSettings(home: string, raw: GlobalSettings, writtenBy = 'dsh-home-hosted'): void {
  refuseUnmigrated(home)
  const meta = { ...(raw.meta ?? {}), writtenBy }
  writeFileAtomic(globalSettingsFile(home), `${JSON.stringify({ ...raw, meta }, null, 2)}\n`)
}

/**
 * Patch the panel's `control` block (its port, its bind), preserving every other
 * global key — `auth`, `tls`, `host` and `backups` live in the same file.
 */
export function setControl(home: string, patch: Record<string, unknown>, writtenBy = 'dsh-home-hosted'): void {
  const read = readGlobalSettings(home)
  if (read.error !== null)
    throw new ConfigLayoutError(read.error)
  writeGlobalSettings(home, { ...(read.raw ?? {}), control: { ...(read.raw?.control ?? {}), ...patch } }, writtenBy)
}

function refuseUnmigrated(home: string): void {
  const refusal = migrationRefusal(home)
  if (refusal !== null)
    throw new ConfigLayoutError(refusal)
}

export function findEntry(raw: RawConfig, id: string): ServerEntry | null {
  return (raw.servers ?? []).find(entry => entry.id === id) ?? null
}

/** Insert or replace one entry, preserving every other key in the file. */
export function upsertEntry(raw: RawConfig, entry: ServerEntry): RawConfig {
  const servers = [...(raw.servers ?? [])]
  const index = servers.findIndex(candidate => candidate.id === entry.id)
  if (index >= 0)
    servers[index] = entry
  else
    servers.push(entry)
  return { ...raw, servers }
}

/**
 * Nested groups a patch **merges into** rather than replaces.
 *
 * The same three the panel's own `SERVER_MERGE_KEYS` names
 * (`src/config/patch.ts`), and they are not a detail: `servers.update` reaches
 * the config file whenever the panel is not answering or the token is refused,
 * so a file write that replaced `restart` would silently drop every sibling key
 * a partial patch never mentioned. `{ restart: { maxRetries: 1 } }` through the
 * API keeps `baseDelayMs`, `factor` and the rest; through the file it used to
 * wipe them, and the entry fell back to the panel's defaults.
 */
const SERVER_MERGE_KEYS = new Set(['restart', 'health', 'stop'])

/** The control-block groups the panel merges (`CONTROL_MERGE_KEYS`). */
const CONTROL_MERGE_KEYS = new Set(['auth', 'tls'])

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Merge one nested group recursively — `health.http` is a group of its own.
 * An explicit `null` removes a key, which is how a schema-optional field is
 * cleared; an explicit `undefined` means "not mentioned" and is skipped.
 *
 * Mirrors `mergeGroup` in the panel's `src/config/patch.ts`, because a patch
 * must mean the same thing whichever path carried it.
 */
function mergeGroup(target: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...target }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined)
      continue
    if (value === null) {
      delete merged[key]
      continue
    }
    if (isRecordValue(value) && isRecordValue(merged[key])) {
      merged[key] = mergeGroup(merged[key], value)
      continue
    }
    merged[key] = value
  }
  return merged
}

/**
 * Apply one entry patch, merging the nested groups the panel merges.
 *
 * Only the keys `patch` names are touched; everything else in the entry — and
 * every other entry in the file — is preserved.
 */
export function patchEntry(raw: RawConfig, id: string, patch: ServerEntryPatch): RawConfig {
  const servers = (raw.servers ?? []).map((entry) => {
    if (entry.id !== id)
      return entry
    const merged: ServerEntry = { ...entry }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined)
        continue
      if (SERVER_MERGE_KEYS.has(key) && isRecordValue(value) && isRecordValue(merged[key]))
        (merged as Record<string, unknown>)[key] = mergeGroup(merged[key] as Record<string, unknown>, value)
      else
        (merged as Record<string, unknown>)[key] = value
    }
    return merged
  })
  return { ...raw, servers }
}

/**
 * Patch a settings file's `control` block, as a pure value.
 *
 * `auth` and `tls` merge the way the panel's `CONTROL_MERGE_KEYS` says, so a
 * patch naming one of them does not reset its siblings.
 */
export function patchControl(raw: GlobalSettings, patch: Record<string, unknown>): GlobalSettings {
  const control = { ...(raw.control ?? {}) }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined)
      continue
    if (CONTROL_MERGE_KEYS.has(key) && isRecordValue(value) && isRecordValue(control[key]))
      control[key] = mergeGroup(control[key] as Record<string, unknown>, value)
    else
      control[key] = value
  }
  return { ...raw, control }
}

export function removeEntry(raw: RawConfig, id: string): RawConfig {
  return { ...raw, servers: (raw.servers ?? []).filter(entry => entry.id !== id) }
}
