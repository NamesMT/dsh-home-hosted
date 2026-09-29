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
  if (!Array.isArray(raw.servers) && raw.servers !== undefined)
    return { raw: null, exists: true, error: 'the workspace config file has a servers field that is not an array' }
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
  if (raw.control !== undefined && (typeof raw.control !== 'object' || raw.control === null || Array.isArray(raw.control)))
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

export function patchEntry(raw: RawConfig, id: string, patch: ServerEntryPatch): RawConfig {
  const servers = (raw.servers ?? []).map((entry) => {
    if (entry.id !== id)
      return entry
    const merged: ServerEntry = { ...entry, ...patch }
    if (patch.stop !== undefined && typeof entry.stop === 'object' && entry.stop !== null)
      merged.stop = { ...entry.stop, ...patch.stop }
    return merged
  })
  return { ...raw, servers }
}

/** Patch a settings file's `control` block, as a pure value. */
export function patchControl(raw: GlobalSettings, patch: Record<string, unknown>): GlobalSettings {
  return { ...raw, control: { ...(raw.control ?? {}), ...patch } }
}

export function removeEntry(raw: RawConfig, id: string): RawConfig {
  return { ...raw, servers: (raw.servers ?? []).filter(entry => entry.id !== id) }
}
