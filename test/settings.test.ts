import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SettingsStore } from '../src/settings.js'
import { tempDir, writeJsonFile } from './helpers/temp.js'
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
  it('starts with autostart off, every tool on, and the pinned CLI', () => {
    const s = store()
    expect(s.get()).toEqual({
      version: 3,
      autostart: { enabled: false, mechanism: 'auto' },
      manageDsh: false,
      entries: [],
      panel: { port: null },
      authNotice: true,
      reclaimToken: true,
      instancesNotice: true,
      uiStyle: 'detailed',
      agentTools: { enabled: true, allow: ['status', 'servers_list', 'servers_lifecycle', 'servers_edit', 'autostart_manage', 'ui_manage'] },
      cli: { prefer: 'pinned' },
    })
  })

  it('defaults the panel notice on, and persists an explicit off', () => {
    const s = store()
    expect(s.get().instancesNotice).toBe(true)

    s.update({ instancesNotice: false })
    expect(new SettingsStore(s.file, 'dsh').get().instancesNotice).toBe(false)
    // A settings write that leaves it out keeps the choice.
    s.update({ autostart: { enabled: true } })
    expect(s.get().instancesNotice).toBe(false)
  })

  it('does not re-read a current-version allowlist as "nobody chose"', () => {
    // The pair the pre-0.2.0 release wrote for "unset" is also a legitimate
    // choice, and only a file older than that release may be read that way.
    scratch = tempDir()
    const file = path.join(scratch.path, 'settings.json')
    writeJsonFile(file, {
      version: 2,
      agentTools: { enabled: true, allow: ['status', 'servers_list'] },
    })
    const s = new SettingsStore(file, 'dsh')
    expect(s.get().agentTools.allow).toEqual(['status', 'servers_list'])
    expect(s.get().instancesNotice).toBe(true)
  })

  it('defaults the token reclaim on, and persists an explicit off', () => {
    const s = store()
    expect(s.get().reclaimToken).toBe(true)

    s.update({ reclaimToken: false })
    expect(s.get().reclaimToken).toBe(false)
    expect(new SettingsStore(s.file, 'dsh').get().reclaimToken).toBe(false)

    // A settings write that leaves it out keeps the choice.
    s.update({ autostart: { enabled: true } })
    expect(s.get().reclaimToken).toBe(false)

    s.update({ reclaimToken: true })
    expect(new SettingsStore(s.file, 'dsh').get().reclaimToken).toBe(true)
  })

  it('materialises a default intent for an entry it has never seen', () => {
    const s = store()
    // POSIX recognises a detached restart of its own entry, so it follows; only
    // Windows needs the blunt policy.
    expect(s.intentFor('anything')).toEqual({
      id: 'anything',
      autostart: true,
      onPortConflict: process.platform === 'win32' ? 'kill' : 'follow',
      stopKillPortHolders: true,
      persistent: true,
    })
  })

  it('merges a partial patch and persists it 0600', () => {
    const s = store()
    s.update({ autostart: { enabled: true, mechanism: 'systemd-user' } })
    expect(s.get().autostart).toEqual({ enabled: true, mechanism: 'systemd-user' })

    s.update({ agentTools: { enabled: true, allow: ['status', 'servers_lifecycle'] } })
    s.update({ entries: [{ id: 'dsh', autostart: false, onPortConflict: 'block', stopKillPortHolders: false, persistent: false }] })

    const file = path.join(path.dirname(s.file), 'settings.json')
    expect(fs.statSync(file).mode & 0o777).toBe(0o600)
    const reloaded = new SettingsStore(file, 'dsh')
    expect(reloaded.get().autostart.enabled).toBe(true)
    expect(reloaded.get().agentTools.allow).toEqual(['status', 'servers_lifecycle'])
    expect(reloaded.intentFor('dsh')).toEqual({ id: 'dsh', autostart: false, onPortConflict: 'block', stopKillPortHolders: false, persistent: false })
    expect(reloaded.intentFor('other')).toEqual({ id: 'other', autostart: true, onPortConflict: process.platform === 'win32' ? 'kill' : 'follow', stopKillPortHolders: true, persistent: true })
  })

  it('defaults to the pinned CLI and keeps a chosen preference', () => {
    const s = store()
    expect(s.get().cli).toEqual({ prefer: 'pinned' })
    s.update({ cli: { prefer: 'global' } })
    expect(s.get().cli).toEqual({ prefer: 'global' })
    // A settings write that leaves cli out keeps the choice.
    s.update({ autostart: { enabled: true } })
    expect(s.get().cli).toEqual({ prefer: 'global' })
    expect(new SettingsStore(s.file, 'dsh').get().cli).toEqual({ prefer: 'global' })
  })

  it('keeps an explicitly empty tool list empty instead of turning every tool back on', () => {
    const s = store()
    s.update({ agentTools: { enabled: true, allow: [] } })
    expect(s.get().agentTools.allow).toEqual([])
    expect(new SettingsStore(s.file, 'dsh').get().agentTools.allow).toEqual([])
  })

  it('never keeps a panel port the panel itself could not parse', () => {
    const s = store()
    s.update({ panel: { port: 3999.5 } })
    expect(s.get().panel.port).toBeNull()
    s.update({ panel: { port: 65536 } })
    expect(s.get().panel.port).toBeNull()
    s.update({ panel: { port: 3999 } })
    expect(s.get().panel.port).toBe(3999)
  })

  it('drops an unknown port-conflict policy instead of writing it into the panel config', () => {
    const s = store()
    s.update({ entries: [{ id: 'dsh', autostart: true, onPortConflict: 'explode' as never, stopKillPortHolders: true, persistent: true }] })
    expect(s.intentFor('dsh').onPortConflict).toBe(process.platform === 'win32' ? 'kill' : 'follow')
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

describe('upgrading an older settings file', () => {
  it('renames tools an older release split apart', () => {
    scratch = tempDir()
    writeJsonFile(path.join(scratch.path, 'settings.json'), {
      agentTools: { enabled: true, allow: ['status', 'servers_start', 'servers_delete', 'autostart_install'] },
    })
    const store = new SettingsStore(path.join(scratch.path, 'settings.json'), 'dsh')
    expect(store.get().agentTools.allow).toEqual(['status', 'servers_lifecycle', 'servers_edit', 'autostart_manage'])
  })

  it('treats the old default pair as "nobody chose anything"', () => {
    scratch = tempDir()
    writeJsonFile(path.join(scratch.path, 'settings.json'), {
      agentTools: { enabled: false, allow: ['status', 'servers_list'] },
    })
    const store = new SettingsStore(path.join(scratch.path, 'settings.json'), 'dsh')
    // The old default wrote this pair itself, so it must not look like a choice.
    expect(store.get().agentTools.enabled).toBe(true)
    expect(store.get().agentTools.allow).toHaveLength(6)
  })

  it('keeps a real selection as it was made', () => {
    scratch = tempDir()
    writeJsonFile(path.join(scratch.path, 'settings.json'), {
      agentTools: { enabled: false, allow: ['status'] },
    })
    const store = new SettingsStore(path.join(scratch.path, 'settings.json'), 'dsh')
    expect(store.get().agentTools.enabled).toBe(false)
    expect(store.get().agentTools.allow).toEqual(['status'])
  })
})

describe('upgrading the management flag', () => {
  it('reads a legacy file that holds the harness entry as managed', () => {
    scratch = tempDir()
    writeJsonFile(path.join(scratch.path, 'settings.json'), {
      entries: [{ id: 'dsh', autostart: true, onPortConflict: 'follow', stopKillPortHolders: true, persistent: true }],
    })
    expect(new SettingsStore(path.join(scratch.path, 'settings.json'), 'dsh').get().manageDsh).toBe(true)
  })

  it('does not invent management for an entry that is not the harness', () => {
    scratch = tempDir()
    writeJsonFile(path.join(scratch.path, 'settings.json'), {
      entries: [{ id: 'other', autostart: true, onPortConflict: 'follow', stopKillPortHolders: true, persistent: true }],
    })
    expect(new SettingsStore(path.join(scratch.path, 'settings.json'), 'dsh').get().manageDsh).toBe(false)
  })

  it('honours the flag once the file carries a version', () => {
    scratch = tempDir()
    writeJsonFile(path.join(scratch.path, 'settings.json'), {
      version: 2,
      manageDsh: false,
      entries: [{ id: 'dsh', autostart: true, onPortConflict: 'follow', stopKillPortHolders: true, persistent: true }],
    })
    expect(new SettingsStore(path.join(scratch.path, 'settings.json'), 'dsh').get().manageDsh).toBe(false)
  })
})
