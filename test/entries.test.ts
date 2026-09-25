import { describe, expect, it } from 'vitest'
import type { EntryIntent, ServerEntry } from '../src/shared/contracts.js'
import { ownedDrift, ownedPatch, restorePatch, snapshotOwned, defaultIntent } from '../src/home-hosted/entries.js'

const intent: EntryIntent = { id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true }

describe('owned entry keys', () => {
  it('writes only the owned keys and keeps sibling stop fields', () => {
    const live: ServerEntry = {
      id: 'dsh',
      command: 'dsh',
      args: ['web'],
      onPortConflict: 'block',
      autostart: false,
      stop: { signal: 'SIGINT', graceMs: 9000 },
      env: { KEEP: 'me' },
    }
    const patch = ownedPatch(intent, live)
    expect(patch).toEqual({
      autostart: true,
      onPortConflict: 'kill',
      stop: { signal: 'SIGINT', graceMs: 9000, killPortHolders: true },
    })
    expect(patch.command).toBeUndefined()
    expect(patch.args).toBeUndefined()
    expect(patch.env).toBeUndefined()
  })

  it('reports drift per owned key', () => {
    const live: ServerEntry = { id: 'dsh', autostart: false, onPortConflict: 'block', stop: { killPortHolders: false } }
    expect(ownedDrift(live, intent)).toEqual(['autostart', 'onPortConflict', 'stop.killPortHolders'])
    expect(ownedDrift({ id: 'dsh', ...ownedPatch(intent, null) }, intent)).toEqual([])
    expect(ownedDrift(null, intent)).toEqual(['missing entry'])
  })

  it('snapshots only what the plugin owns, and restores absence to defaults', () => {
    const live: ServerEntry = { id: 'dsh', command: 'dsh', autostart: true, onPortConflict: 'reclaim', stop: { graceMs: 1, killPortHolders: true } }
    const snapshot = snapshotOwned(live)
    expect(snapshot).toEqual({ id: 'dsh', autostart: true, onPortConflict: 'reclaim', stop: { killPortHolders: true } })

    const restore = restorePatch({ id: 'dsh', stop: { killPortHolders: true, graceMs: 1 } }, snapshot)
    expect(restore).toEqual({ autostart: true, onPortConflict: 'reclaim', stop: { killPortHolders: true, graceMs: 1 } })

    const unrestore = restorePatch({ id: 'dsh' }, { id: 'dsh' })
    expect(unrestore).toEqual({ autostart: false, onPortConflict: 'block', stop: { killPortHolders: false } })
  })

  it('defaults to kill plus killPortHolders, the two that make a reclaim reliable', () => {
    expect(defaultIntent('dsh')).toEqual({ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true })
  })
})
