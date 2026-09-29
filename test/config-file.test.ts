import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigLayoutError, findEntry, patchEntry, readConfig, readGlobalSettings, removeEntry, setControl, upsertEntry, writeConfig } from '../src/home-hosted/config-file.js'
import { globalSettingsFile, serversFile } from '../src/home-hosted/layout.js'
import { makeHhHome, makeLegacyHome } from './helpers/hh.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'
import { writeJsonFile } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

/** A 0.7 root: its entries live in `.hh/default/servers.config.json`. */
function home(): string {
  scratch = tempDir()
  return makeHhHome(scratch.path)
}

describe('config file fallback', () => {
  it('reports a missing file as creatable, not broken', () => {
    const dir = home()
    expect(readConfig(dir)).toEqual({ raw: null, exists: false, error: null })
  })

  it('reports an unreadable file instead of overwriting it', () => {
    const dir = home()
    writeJsonFile(serversFile(dir, 'default'), null)
    const result = readConfig(dir)
    expect(result.exists).toBe(true)
    expect(result.error).not.toBeNull()
  })

  it('upserts and patches while preserving unknown keys and other entries', () => {
    const dir = home()
    writeJsonFile(serversFile(dir, 'default'), {
      $schema: './servers.config.schema.json',
      meta: { writtenBy: '0.4.1', schema: 1 },
      defaults: { onPortConflict: 'block' },
      servers: [{ id: 'other', command: 'sleep', args: ['1'], custom: { keep: true } }],
    })

    const raw = readConfig(dir).raw!
    const added = upsertEntry(raw, { id: 'dsh', command: 'dsh', args: ['web'] })
    expect(added.servers).toHaveLength(2)
    expect(added.defaults).toEqual({ onPortConflict: 'block' })

    const patched = patchEntry(added, 'dsh', {
      autostart: true,
      onPortConflict: 'kill',
      stop: { killPortHolders: true },
    })
    const dsh = findEntry(patched, 'dsh')!
    expect(dsh.autostart).toBe(true)
    expect(dsh.onPortConflict).toBe('kill')
    expect(dsh.stop).toEqual({ killPortHolders: true })
    expect((patched.servers ?? []).find(entry => entry.id === 'other')?.custom).toEqual({ keep: true })

    const removed = removeEntry(patched, 'dsh')
    expect(removed.servers).toHaveLength(1)

    // A replacement keeps the entry's other keys.
    const replaced = upsertEntry(raw, { id: 'other', command: 'sleep', newKey: 1 })
    expect(replaced.servers?.[0]).toEqual({ id: 'other', command: 'sleep', newKey: 1 })

    expect(readConfig(dir).raw?.$schema).toBe('./servers.config.schema.json')
  })

  it('stamps meta on every write without dropping the schema the file carries', () => {
    const dir = home()
    writeConfig(dir, {
      meta: { writtenBy: '0.4.1', schema: 1 },
      servers: [],
    }, '0.6.1')
    const written = readConfig(dir).raw!
    expect(written.meta).toEqual({ writtenBy: '0.6.1', schema: 1 })
    expect(path.basename(serversFile(dir, 'default'))).toBe('servers.config.json')
    // The write landed in the workspace directory, never at the old root path.
    expect(fs.existsSync(path.join(dir, 'servers.config.json'))).toBe(false)
  })
})

describe('meta stamp', () => {
  it('records the writer without inventing a schema', () => {
    const root = home()
    writeJsonFile(serversFile(root, 'default'), { servers: [] })
    const read = readConfig(root)
    writeConfig(root, upsertEntry(read.raw ?? {}, { id: 'x', command: 'sleep' }))
    const written = JSON.parse(fs.readFileSync(serversFile(root, 'default'), 'utf8'))
    // An absent schema reads as the panel's current one; inventing `1` here
    // would become wrong the day the panel bumps its schema.
    expect(written.meta).toEqual({ writtenBy: 'dsh-home-hosted' })
  })

  it('keeps the schema a file already declared', () => {
    const root = home()
    writeJsonFile(serversFile(root, 'default'), { meta: { writtenBy: 'home-hosted', schema: 7 }, servers: [] })
    writeConfig(root, upsertEntry(readConfig(root).raw ?? {}, { id: 'x', command: 'sleep' }))
    const written = JSON.parse(fs.readFileSync(serversFile(root, 'default'), 'utf8'))
    expect(written.meta).toEqual({ writtenBy: 'dsh-home-hosted', schema: 7 })
  })
})

describe('the settings split', () => {
  it('patches `control` into .hh/settings.json and keeps every other global key', () => {
    const dir = home()
    writeJsonFile(globalSettingsFile(dir), {
      meta: { writtenBy: 'home-hosted', schema: 1 },
      control: { port: 3999, host: '127.0.0.1' },
      auth: { enabled: true },
      tls: { mode: 'auto' },
      host: { enabled: true },
      backups: { enabled: false },
    })

    setControl(dir, { port: 6311 }, 'dsh-home-hosted')

    const written = readGlobalSettings(dir).raw!
    expect(written.control).toEqual({ port: 6311, host: '127.0.0.1' })
    expect(written.auth).toEqual({ enabled: true })
    expect(written.tls).toEqual({ mode: 'auto' })
    expect(written.host).toEqual({ enabled: true })
    expect(written.backups).toEqual({ enabled: false })
    // The schema the file declared survives, and the writer is stamped.
    expect(written.meta).toEqual({ writtenBy: 'dsh-home-hosted', schema: 1 })
    // Nothing is written at the pre-0.7 root.
    expect(fs.existsSync(path.join(dir, 'settings.json'))).toBe(false)
  })

  it('never touches the settings file when a servers write lands', () => {
    const dir = home()
    writeJsonFile(globalSettingsFile(dir), { control: { port: 3999 } })
    const before = fs.readFileSync(globalSettingsFile(dir), 'utf8')

    writeConfig(dir, { servers: [{ id: 'dsh', command: 'dsh' }] })

    expect(fs.readFileSync(globalSettingsFile(dir), 'utf8')).toBe(before)
    expect(readGlobalSettings(dir).raw?.control).toEqual({ port: 3999 })
  })
})

describe('a pre-0.7 root', () => {
  function legacy(): string {
    scratch = tempDir()
    return makeLegacyHome(scratch.path, { servers: [{ id: 'old', command: 'sleep' }] })
  }

  it('reports the refusal on every read instead of parsing the old layout', () => {
    const dir = legacy()
    const read = readConfig(dir)
    expect(read.raw).toBeNull()
    expect(read.exists).toBe(false)
    expect(read.error).toContain('pre-0.7 layout')
    expect(read.error).toContain(`--home ${dir}`)

    const settings = readGlobalSettings(dir)
    expect(settings.raw).toBeNull()
    expect(settings.error).toBe(read.error)
  })

  it('throws ConfigLayoutError on every write, and creates nothing new', () => {
    const dir = legacy()
    const old = path.join(dir, 'servers.config.json')
    const before = fs.readFileSync(old, 'utf8')

    expect(() => writeConfig(dir, { servers: [] })).toThrow(ConfigLayoutError)
    expect(() => setControl(dir, { port: 6311 })).toThrow(ConfigLayoutError)

    // The old file is untouched, and no `.hh` was created beside it.
    expect(fs.readFileSync(old, 'utf8')).toBe(before)
    expect(fs.existsSync(path.join(dir, '.hh'))).toBe(false)
    expect(fs.existsSync(path.join(dir, 'settings.json'))).toBe(false)
  })

  it('is safe to write once the root carries a `.hh`', () => {
    const dir = legacy()
    makeHhHome(dir)
    const read = readConfig(dir)
    expect(read.error).toBeNull()
    writeConfig(dir, { servers: [{ id: 'dsh', command: 'dsh' }] })
    expect(findEntry(readConfig(dir).raw!, 'dsh')).toMatchObject({ command: 'dsh' })
  })
})
