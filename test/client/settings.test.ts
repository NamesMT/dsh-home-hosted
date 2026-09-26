import { describe, expect, it } from 'vitest'
import type { EntryIntent, PluginSettings } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'
import { diffObject, diffSettings, toggleAllowed } from '../../src/client/settings.js'

const intent: EntryIntent = {
  id: 'alpha',
  autostart: true,
  onPortConflict: 'follow',
  stopKillPortHolders: false,
  persistent: false,
}

function settings(overrides: Partial<PluginSettings> = {}): PluginSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...overrides,
    autostart: { ...DEFAULT_SETTINGS.autostart, ...overrides.autostart },
    agentTools: { ...DEFAULT_SETTINGS.agentTools, ...overrides.agentTools },
    entries: overrides.entries ?? [],
  }
}

describe('diffObject', () => {
  it('keeps only changed primitives', () => {
    expect(diffObject({ a: 1, b: 'x' }, { a: 1, b: 'y' })).toEqual({ b: 'y' })
  })

  it('descends into plain objects but replaces arrays wholesale', () => {
    expect(diffObject(
      { nested: { keep: 1, change: 1 }, list: [1, 2] },
      { nested: { keep: 1, change: 2 }, list: [1, 2, 3] },
    )).toEqual({ nested: { change: 2 }, list: [1, 2, 3] })
  })

  it('drops a subtree when nothing inside it changed', () => {
    expect(diffObject({ nested: { a: 1 } }, { nested: { a: 1 } })).toEqual({})
  })
})

describe('diffSettings', () => {
  it('returns nothing when the snapshot did not change', () => {
    const base = settings()
    expect(diffSettings(base, settings())).toEqual({})
  })

  it('sends only the toggled autostart field', () => {
    const base = settings()
    const next = settings({ autostart: { enabled: true, mechanism: 'auto' } })
    expect(diffSettings(base, next)).toEqual({ autostart: { enabled: true } })
  })

  it('sends only the changed mechanism', () => {
    const base = settings({ autostart: { enabled: true, mechanism: 'auto' } })
    const next = settings({ autostart: { enabled: true, mechanism: 'systemd-user' } })
    expect(diffSettings(base, next)).toEqual({ autostart: { mechanism: 'systemd-user' } })
  })

  it('replaces the whole allow array when one tool changes', () => {
    const base = settings({ agentTools: { enabled: true, allow: ['status', 'servers_list'] } })
    const next = settings({ agentTools: { enabled: true, allow: ['status', 'servers_list', 'servers_lifecycle'] } })
    expect(diffSettings(base, next)).toEqual({
      agentTools: { allow: ['status', 'servers_list', 'servers_lifecycle'] },
    })
  })

  it('sends one intent when an entry changes', () => {
    const base = settings({ entries: [intent] })
    const next = settings({ entries: [{ ...intent, autostart: false }] })
    expect(diffSettings(base, next)).toEqual({ entries: [{ ...intent, autostart: false }] })
  })

  it('sends only the changed CLI preference', () => {
    const base = settings()
    const next = settings({ cli: { prefer: 'global' } })
    expect(diffSettings(base, next)).toEqual({ cli: { prefer: 'global' } })
  })

  it('sends the page style on its own', () => {
    expect(diffSettings(settings(), settings({ uiStyle: 'compact' }))).toEqual({ uiStyle: 'compact' })
  })

  it('sends nothing when the CLI preference is unchanged', () => {
    expect(diffSettings(settings({ cli: { prefer: 'global' } }), settings({ cli: { prefer: 'global' } })))
      .toEqual({})
  })

  it('sends the manage-dsh toggle on its own', () => {
    expect(diffSettings(settings(), settings({ manageDsh: true }))).toEqual({ manageDsh: true })
  })

  it('sends the panel port on its own', () => {
    expect(diffSettings(settings(), settings({ panel: { port: 3999 } }))).toEqual({ panel: { port: 3999 } })
  })

  it('sends an explicit null port when the field is cleared', () => {
    expect(diffSettings(settings({ panel: { port: 3999 } }), settings({ panel: { port: null } })))
      .toEqual({ panel: { port: null } })
  })
})

describe('toggleAllowed', () => {
  it('adds a tool and keeps AGENT_TOOL_NAMES order', () => {
    expect(toggleAllowed(['servers_list', 'status'], 'servers_lifecycle', true))
      .toEqual(['status', 'servers_list', 'servers_lifecycle'])
  })

  it('removes a tool', () => {
    expect(toggleAllowed(['status', 'servers_list'], 'status', false)).toEqual(['servers_list'])
  })

  it('is idempotent', () => {
    expect(toggleAllowed(['status'], 'status', true)).toEqual(['status'])
    expect(toggleAllowed(['status'], 'status', false)).toEqual([])
  })
})
