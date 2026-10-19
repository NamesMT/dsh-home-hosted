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
 * A pre-0.7 root is refused: 0.8 no longer relocates one, so the refusal names the
 * release that still does.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { ServerEntry, ServerEntryPatch } from '../shared/contracts.js'
import { isRecord } from '../shared/contracts.js'
import { readJson, writeFileAtomic } from '../util/fsx.js'
import { DEFAULT_WORKSPACE, globalSettingsFile, migrationRefusal, serversFile } from './layout.js'
import { panelConfigSchema } from './panel-schema.js'

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
  /** The wire code a caller reports; the root's layout is a readable config problem, not a crash. */
  readonly code = 'CONFIG_UNREADABLE'
}

/** A patch the panel's own schema would reject, refused rather than written. */
export class ConfigPatchError extends Error {
  override name = 'ConfigPatchError'
  readonly code = 'INVALID_PATCH'
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
  if (!isRecord(raw))
    return { raw: null, exists: true, error: 'the workspace config file does not contain a JSON object' }
  if (!Array.isArray(raw.servers) && raw.servers !== undefined)
    return { raw: null, exists: true, error: 'the workspace config file has a servers field that is not an array' }
  // Every entry has to be an object: `findEntry` and `patchEntry` read `.id` off
  // them, so a `null` or a string in the list made those throw a raw TypeError —
  // a crash where the panel reports `servers[i]: …` and keeps the rest running.
  if (Array.isArray(raw.servers)) {
    const index = raw.servers.findIndex(entry => !isRecord(entry))
    if (index >= 0)
      return { raw: null, exists: true, error: `the workspace config file has an entry at servers[${index}] that is not an object` }
  }
  return { raw, exists: true, error: null }
}

/**
 * Write one workspace's entries back with home-hosted's own `meta` contract,
 * which records the release that wrote the file and the shape it wrote.
 *
 * A file that already declares a schema keeps it. One this write **creates** is stamped with
 * the pinned panel's own `CONFIG_SCHEMA`, because an absent schema does not mean "current":
 * every release reads it as the oldest shape, so 0.9.0 refuses to boot a file without a stamp
 * ("config schema 1 needs 1 migration"). Leaving it unstamped is what made a config this
 * plugin wrote before any panel ran unstartable. The number is read from the pinned release,
 * never hard-coded — a fixed `2` breaks again at the next bump, from the other side.
 *
 * A file that already exists **without** a stamp is refused rather than stamped: it may be a
 * pre-stamp config whose content still needs lifting, and stamping it would claim a migration
 * that never ran and lose what the step rewrites. `home-hosted migrate` is the only thing that
 * may lift a config, so the refusal names it.
 */
export function writeConfig(home: string, raw: RawConfig, writtenBy = 'dsh-home-hosted', workspace: string = DEFAULT_WORKSPACE): void {
  refuseUnmigrated(home)
  const file = serversFile(home, workspace)
  const next: RawConfig = { ...raw, meta: stampedMeta(raw.meta, writtenBy, `servers.config.json in ${path.dirname(file)}`, file) }
  writeFileAtomic(file, `${JSON.stringify(next, null, 2)}\n`)
}

/**
 * One file's `meta` after this plugin wrote it, or a refusal when the file carries a shape the
 * pinned panel cannot boot.
 *
 * A **new** file is stamped with the pinned panel's own `CONFIG_SCHEMA`, because an absent stamp
 * reads as the oldest shape rather than the current one.
 *
 * An **existing** file has to already declare exactly that schema. Anything else is a config the
 * panel refuses to start — below it needs `home-hosted migrate`, above it was written by a newer
 * release — so writing on regardless would keep this plugin editing a panel that cannot boot while
 * reporting success. Measured on 0.9.2: a schema-1 file answers "config schema 1 needs 1 migration"
 * and a schema-3 file "this release understands schema 2". Lifting or downgrading a config is the
 * panel's job, never this plugin's, so the refusal names the remedy for the direction it found.
 *
 * When the pinned release's own schema cannot be read, an existing stamp is left alone: this
 * plugin cannot judge it, and inventing a number would claim more than it knows.
 *
 * The stamp is read from the **file**, never from `existing`: a caller may hand in a fresh object
 * (an `upsertEntry({}, …)`), and judging by that would report a missing stamp for a file that
 * declares one — the refusal text then named the wrong problem, and a write could overwrite a shape
 * it never looked at. `existing` only carries `writtenBy` and any key the file does not have.
 */
/**
 * Why the panel would refuse to boot a file stamped `meta`, or null when it would accept it.
 *
 * One rule for both paths: a **write** refuses with it, and `status` reports it through `lastError`
 * so the page warns before a call is attempted — otherwise a root that needs `home-hosted migrate`
 * looks healthy until the first write fails, which is the worst moment to learn it.
 *
 * Deliberately *not* part of `readConfig`: discovery reads foreign panels too, and reporting one as
 * unreadable would hide every entry it holds. A read still serves what the file says; only acting on
 * it is refused.
 *
 * Null when the pinned release's schema cannot be read — this plugin cannot judge, and inventing a
 * comparison would claim more than it knows.
 */
export function schemaRefusal(meta: unknown, where: string, creating: boolean): string | null {
  const pinned = panelConfigSchema()
  if (pinned === null)
    return null
  const declared = isRecord(meta) && typeof meta.schema === 'number' ? meta.schema : null
  if (declared === null) {
    return creating
      ? null
      : `${where} carries no meta.schema, so its config shape is unknown; run \`home-hosted migrate\` before this plugin writes it`
  }
  if (declared === pinned)
    return null
  return declared < pinned
    ? `${where} is on config schema ${declared}, which home-hosted ${pinned} refuses to boot; run \`home-hosted migrate\` before this plugin writes it`
    : `${where} is on config schema ${declared}, written by a newer home-hosted than this plugin's ${pinned}; update home-hosted, or pin this plugin to the release that wrote it`
}

function stampedMeta(existing: unknown, writtenBy: string, where: string, file: string): Record<string, unknown> {
  const onDisk = fs.existsSync(file) ? readJson<Record<string, unknown>>(file) : null
  const diskMeta = isRecord(onDisk) && isRecord(onDisk.meta) ? onDisk.meta : {}
  const meta: Record<string, unknown> = { ...diskMeta, ...(isRecord(existing) ? existing : {}) }

  if (onDisk === null) {
    // A file this write creates: name the shape it is being written in.
    const pinned = panelConfigSchema()
    if (pinned !== null)
      meta.schema = pinned
  }
  else {
    const refusal = schemaRefusal(meta, where, false)
    if (refusal !== null)
      throw new ConfigLayoutError(refusal)
  }

  meta.writtenBy = writtenBy
  return meta
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
  if (!isRecord(raw))
    return { raw: null, exists: true, error: 'the panel settings file does not contain a JSON object' }
  if (raw.control !== undefined && !isRecord(raw.control))
    return { raw: null, exists: true, error: 'the panel settings file has a control field that is not an object' }
  return { raw, exists: true, error: null }
}

export function writeGlobalSettings(home: string, raw: GlobalSettings, writtenBy = 'dsh-home-hosted'): void {
  refuseUnmigrated(home)
  const file = globalSettingsFile(home)
  const meta = stampedMeta(raw.meta, writtenBy, 'settings.json in the panel state root', file)
  writeFileAtomic(file, `${JSON.stringify({ ...raw, meta }, null, 2)}\n`)
}

/**
 * Patch the panel's `control` block (its port, its bind), preserving every other
 * global key — `auth`, `tls`, `host` and `backups` live in the same file.
 */
export function setControl(home: string, patch: Record<string, unknown>, writtenBy = 'dsh-home-hosted'): void {
  const read = readGlobalSettings(home)
  if (read.error !== null)
    throw new ConfigLayoutError(read.error)
  // Through the same merge the panel's own `updateControl` uses, so a caller that
  // patches `auth` or `tls` does not reset the group's siblings. Today's only
  // caller writes `{ port }`, which merges the same either way — but an exported
  // helper should not be the one place a nested patch means something else.
  writeGlobalSettings(home, patchControl(read.raw ?? {}, patch), writtenBy)
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
export const SERVER_MERGE_KEYS = new Set(['restart', 'health', 'stop'])

/**
 * The control-block groups the panel merges (`CONTROL_MERGE_KEYS`).
 *
 * Both sets are **copies** of the panel's own, and `test/config-file` reads the
 * panel's from the pinned dependency and fails if they diverge. That guard exists
 * because the failure is silent and destructive: a group this list omits is
 * *replaced* by a partial patch, so a `{ resources: { maxRssBytes: 1 } }` written
 * through the file drops every sibling key — measured, not assumed. Upstream adding
 * a fourth server group would otherwise regress exactly the bug the comment above
 * describes having fixed, and nothing would say so.
 */
export const CONTROL_MERGE_KEYS = new Set(['auth', 'tls'])


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
    if (isRecord(value) && isRecord(merged[key])) {
      merged[key] = mergeGroup(merged[key], value)
      continue
    }
    merged[key] = value
  }
  return merged
}

/**
 * The refusal a patch that sets one of `mergeKeys` to `null` gets, or null when it is safe.
 *
 * One rule, both write paths: the panel's patch schema declares these groups `.optional()`
 * but not nullable, so its API answers 400. Writing the `null` through instead produced a
 * config the panel then *refused to boot from* (`servers[0] ("a"): restart must be an object
 * (was null)`) — a file this plugin wrote, that this plugin's own panel cannot start on.
 * `src/service.ts` refuses with `INVALID_PATCH` before choosing a path, so the answering API
 * and the fallback file give the same answer; both read the message from here.
 */
export function nullGroupRefusal(patch: Record<string, unknown>, mergeKeys: Set<string>): string | null {
  for (const key of mergeKeys) {
    if (patch[key] === null)
      return `${key} must be an object (was null): the panel refuses to boot a config that carries it`
  }
  return null
}

/**
 * Apply one patch onto a target, the way the panel's own `applyPatch` does.
 *
 * `undefined` is "not mentioned" and is skipped. `null` **removes** the key — at the top level
 * as well as inside a group, which is what the panel has meant since 0.7.18 (`fix(patch): an
 * explicit null cleared a key inside a group but not at the top level`) and what its API does
 * (`PATCH {port:null}` deletes `port` from the file). The nested branch here always deleted;
 * the top-level one wrote the `null` through, so one function meant two things and the panel
 * refused to boot the result — for `cwd` through `patchEntry`, and for `auth`/`tls` through
 * `patchControl`. `mergeKeys` names the groups that merge recursively instead of replacing.
 */
function applyPatchFields(target: Record<string, unknown>, patch: Record<string, unknown>, mergeKeys: Set<string>): Record<string, unknown> {
  const next = { ...target }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined)
      continue
    if (mergeKeys.has(key) && isRecord(value) && isRecord(next[key])) {
      next[key] = mergeGroup(next[key], value)
      continue
    }
    if (value === null) {
      delete next[key]
      continue
    }
    next[key] = value
  }
  return next
}

/**
 * Apply one entry patch, merging the nested groups the panel merges.
 *
 * Only the keys `patch` names are touched; everything else in the entry — and
 * every other entry in the file — is preserved.
 */
export function patchEntry(raw: RawConfig, id: string, patch: ServerEntryPatch): RawConfig {
  const refusal = nullGroupRefusal(patch as Record<string, unknown>, SERVER_MERGE_KEYS)
  if (refusal !== null)
    throw new ConfigPatchError(refusal)
  const servers = (raw.servers ?? []).map(entry =>
    entry.id === id
      ? applyPatchFields(entry as Record<string, unknown>, patch as Record<string, unknown>, SERVER_MERGE_KEYS) as ServerEntry
      : entry)
  return { ...raw, servers }
}

/**
 * Patch a settings file's `control` block, as a pure value.
 *
 * `auth` and `tls` merge the way the panel's `CONTROL_MERGE_KEYS` says, so a
 * patch naming one of them does not reset its siblings — and a `null` for either
 * is refused by the same rule the entry path applies.
 */
export function patchControl(raw: GlobalSettings, patch: Record<string, unknown>): GlobalSettings {
  const refusal = nullGroupRefusal(patch, CONTROL_MERGE_KEYS)
  if (refusal !== null)
    throw new ConfigPatchError(refusal)
  return { ...raw, control: applyPatchFields(raw.control ?? {}, patch, CONTROL_MERGE_KEYS) }
}

export function removeEntry(raw: RawConfig, id: string): RawConfig {
  return { ...raw, servers: (raw.servers ?? []).filter(entry => entry.id !== id) }
}
