/**
 * What this plugin decides about a server entry, and how that intent maps onto
 * the entry: only the keys in `OWNED_ENTRY_KEYS` are ever written, so a person's
 * own command, args, env, health block and everything else survive untouched.
 */
import type { EntryIntent, OnPortConflict, ServerEntry, ServerEntryPatch } from '../shared/contracts.js'
import { isOnPortConflict } from '../shared/contracts.js'

/**
 * A detached restart of dsh is recognisable by its own marker/argv on POSIX, so
 * `follow` adopts it without killing anything. Windows cannot read another
 * process's environment and a `.cmd` shim hides the argv, so only `kill`
 * reliably reclaims the port there.
 */
export function defaultOnPortConflict(platform: NodeJS.Platform = process.platform): OnPortConflict {
  return platform === 'win32' ? 'kill' : 'follow'
}

export function defaultIntent(id: string, platform: NodeJS.Platform = process.platform): EntryIntent {
  return {
    id,
    autostart: true,
    onPortConflict: defaultOnPortConflict(platform),
    stopKillPortHolders: true,
    persistent: true,
  }
}

/** The owned keys as a patch, preserving any sibling keys inside `stop`. */
export function ownedPatch(intent: EntryIntent, live?: ServerEntry | null): ServerEntryPatch {
  const stop = (live?.stop ?? {}) as Record<string, unknown>
  return {
    autostart: intent.autostart,
    onPortConflict: intent.onPortConflict,
    persistent: intent.persistent,
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
  if ((live.persistent ?? false) !== intent.persistent)
    drift.push('persistent')
  const killPortHolders = (live.stop as Record<string, unknown> | undefined)?.killPortHolders
  if (killPortHolders !== intent.stopKillPortHolders)
    drift.push('stop.killPortHolders')
  return drift
}

/**
 * Only the owned keys, as they were before this plugin touched the entry.
 *
 * A key the entry left out is recorded as the panel's schema default rather than
 * omitted: `{ id }` alone is what marks an entry this plugin created, so an
 * adopted entry with nothing explicit has to be distinguishable from it — or
 * "stop managing" deletes a server the person wrote.
 */
export function snapshotOwned(live: ServerEntry): ServerEntry {
  const killPortHolders = (live.stop as Record<string, unknown> | undefined)?.killPortHolders
  return {
    id: live.id,
    autostart: typeof live.autostart === 'boolean' ? live.autostart : false,
    onPortConflict: isOnPortConflict(live.onPortConflict) ? live.onPortConflict : 'block',
    persistent: live.persistent === true,
    stop: { killPortHolders: typeof killPortHolders === 'boolean' ? killPortHolders : false },
  }
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
    persistent: snapshot?.persistent === true,
    stop: {
      ...stop,
      killPortHolders: typeof previous.killPortHolders === 'boolean' ? previous.killPortHolders : false,
    },
  }
}
