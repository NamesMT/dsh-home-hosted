import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SettingsStore } from '../src/settings.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

function store(): SettingsStore {
  scratch = tempDir()
  return new SettingsStore(path.join(scratch.path, 'settings.json'), 'dsh')
}

describe('settings store', () => {
  it('starts with autostart off and read-only agent tools', () => {
    const s = store()
    expect(s.get()).toEqual({
      autostart: { enabled: false, mechanism: 'auto' },
      entries: [],
      agentTools: { enabled: false, allow: ['status', 'servers_list'] },
    })
  })

  it('materialises a default intent for an entry it has never seen', () => {
    const s = store()
    expect(s.intentFor('anything')).toEqual({
      id: 'anything',
      autostart: true,
      onPortConflict: 'kill',
      stopKillPortHolders: true,
    })
  })

  it('merges a partial patch and persists it 0600', () => {
    const s = store()
    s.update({ autostart: { enabled: true, mechanism: 'systemd-user' } })
    expect(s.get().autostart).toEqual({ enabled: true, mechanism: 'systemd-user' })

    s.update({ agentTools: { enabled: true, allow: ['status', 'servers_start'] } })
    s.update({ entries: [{ id: 'dsh', autostart: false, onPortConflict: 'block', stopKillPortHolders: false }] })

    const file = path.join(path.dirname(s.file), 'settings.json')
    expect(fs.statSync(file).mode & 0o777).toBe(0o600)
    const reloaded = new SettingsStore(file, 'dsh')
    expect(reloaded.get().autostart.enabled).toBe(true)
    expect(reloaded.get().agentTools.allow).toEqual(['status', 'servers_start'])
    expect(reloaded.intentFor('dsh')).toEqual({ id: 'dsh', autostart: false, onPortConflict: 'block', stopKillPortHolders: false })
    expect(reloaded.intentFor('other')).toEqual({ id: 'other', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true })
  })

  it('drops unknown tool names and notifies listeners', () => {
    const s = store()
    const seen: string[][] = []
    const off = s.onChange(next => seen.push([...next.agentTools.allow]))
    s.update({ agentTools: { enabled: true, allow: ['status', 'not_a_tool' as never] } })
    expect(s.get().agentTools.allow).toEqual(['status'])
    expect(seen).toHaveLength(1)
    off()
    s.update({ agentTools: { enabled: false, allow: ['status'] } })
    expect(seen).toHaveLength(1)
  })
})
