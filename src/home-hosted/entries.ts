/**
 * What this plugin decides about a server entry, and how that intent maps onto
 * the entry: only the keys in `OWNED_ENTRY_KEYS` are ever written, so a person's
 * own command, args, env, health block and everything else survive untouched.
 */
import type { EntryIntent, OnPortConflict, ServerEntry, ServerEntryPatch } from '../shared/contracts.js'

export const DEFAULT_ON_PORT_CONFLICT: OnPortConflict = 'kill'

export function defaultIntent(id: string): EntryIntent {
  return {
    id,
    autostart: true,
    onPortConflict: DEFAULT_ON_PORT_CONFLICT,
    stopKillPortHolders: true,
  }
}

/** The owned keys as a patch, preserving any sibling keys inside `stop`. */
export function ownedPatch(intent: EntryIntent, live?: ServerEntry | null): ServerEntryPatch {
  const stop = (live?.stop ?? {}) as Record<string, unknown>
  return {
    autostart: intent.autostart,
    onPortConflict: intent.onPortConflict,
    stop: { ...stop, killPortHolders: intent.stopKillPortHolders },
  }
}

/** Owned keys whose live value differs from the intent. */
export function ownedDrift(live: ServerEntry | null, intent: EntryIntent): string[] {
  if (live === null)
    return ['missing entry']
  const drift: string[] = []
  if (live.autostart !== intent.autostart)
    drift.push('autostart')
  if (live.onPortConflict !== intent.onPortConflict)
    drift.push('onPortConflict')
  const killPortHolders = (live.stop as Record<string, unknown> | undefined)?.killPortHolders
  if (killPortHolders !== intent.stopKillPortHolders)
    drift.push('stop.killPortHolders')
  return drift
}

/** Only the owned keys, as they were before this plugin touched the entry. */
export function snapshotOwned(live: ServerEntry): ServerEntry {
  const snapshot: ServerEntry = { id: live.id }
  if (live.autostart !== undefined)
    snapshot.autostart = live.autostart
  if (live.onPortConflict !== undefined)
    snapshot.onPortConflict = live.onPortConflict
  if (typeof live.stop === 'object' && live.stop !== null) {
    const killPortHolders = (live.stop as Record<string, unknown>).killPortHolders
    if (typeof killPortHolders === 'boolean')
      snapshot.stop = { killPortHolders }
  }
  return snapshot
}

/**
 * Restore an entry to what it was before adoption. A key the snapshot does not
 * carry was inherited from the panel's defaults, and a PATCH cannot delete a
 * key, so it is restored to that schema default instead.
 */
export function restorePatch(live: ServerEntry, snapshot: ServerEntry | null): ServerEntryPatch {
  const stop = (live.stop ?? {}) as Record<string, unknown>
  const previous = (snapshot?.stop ?? {}) as Record<string, unknown>
  return {
    autostart: snapshot?.autostart ?? false,
    onPortConflict: snapshot?.onPortConflict ?? 'block',
    stop: {
      ...stop,
      killPortHolders: typeof previous.killPortHolders === 'boolean' ? previous.killPortHolders : false,
    },
  }
}
