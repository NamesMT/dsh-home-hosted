/**
 * Writing `servers.config.json` directly, for the case where the panel is not
 * running (no API to call, and nobody watching the file).
 *
 * When the panel *is* running this path is a fallback: its file watcher treats
 * an external edit as a real change, and a newly added `autostart` entry is
 * started at once. `addEntrySafely` therefore writes the entry disabled first
 * and only then flips `autostart`, which the watcher sees as a changed
 * definition — applied on that entry's next start, never started now.
 */
import fs from 'node:fs'
import type { ServerEntry, ServerEntryPatch } from '../shared/contracts.js'
import { readJson, writeFileAtomic } from '../util/fsx.js'
import { configFile } from '../util/paths.js'

export interface RawConfig {
  meta?: Record<string, unknown>
  servers?: ServerEntry[]
  [key: string]: unknown
}

export interface ConfigReadResult {
  raw: RawConfig | null
  exists: boolean
  error: string | null
}

export function readConfig(home: string): ConfigReadResult {
  const file = configFile(home)
  const raw = readJson<RawConfig>(file)
  if (raw === null) {
    // Distinguish "no file yet" from "unreadable", because only the first is safe to create.
    const exists = fs.existsSync(file)
    return { raw: null, exists, error: exists ? 'the config file could not be parsed' : null }
  }
  if (!Array.isArray(raw.servers) && raw.servers !== undefined)
    return { raw: null, exists: true, error: 'the config file has a servers field that is not an array' }
  return { raw, exists: true, error: null }
}

/**
 * Write the file back with home-hosted's own `meta` contract, which records the
 * release that wrote the file and the shape it wrote.
 *
 * `schema` is never invented here: a file that declared one keeps it, and one
 * that did not stays without it — home-hosted reads an absent schema as "the
 * current one", so stamping our own idea of the schema would one day fail its
 * own guard ("this release understands schema N") and stop the panel booting
 * from a file this plugin only patched.
 */
export function writeConfig(home: string, raw: RawConfig, writtenBy = 'dsh-home-hosted'): void {
  const meta = { ...(raw.meta ?? {}), writtenBy }
  const next: RawConfig = { ...raw, meta }
  writeFileAtomic(configFile(home), `${JSON.stringify(next, null, 2)}\n`)
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

/** Patch the panel's own `control` block (its port, its bind). */
export function patchControl(raw: RawConfig, patch: Record<string, unknown>): RawConfig {
  return { ...raw, control: { ...(raw.control ?? {}), ...patch } }
}

export function removeEntry(raw: RawConfig, id: string): RawConfig {
  return { ...raw, servers: (raw.servers ?? []).filter(entry => entry.id !== id) }
}
