import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { findEntry, patchEntry, readConfig, removeEntry, upsertEntry, writeConfig } from '../src/home-hosted/config-file.js'
import { configFile } from '../src/util/paths.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'
import { writeJsonFile } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

function home(): string {
  scratch = tempDir()
  return scratch.path
}

describe('config file fallback', () => {
  it('reports a missing file as creatable, not broken', () => {
    const dir = home()
    expect(readConfig(dir)).toEqual({ raw: null, exists: false, error: null })
  })

  it('reports an unreadable file instead of overwriting it', () => {
    const dir = home()
    writeJsonFile(configFile(dir), null)
    const result = readConfig(dir)
    expect(result.exists).toBe(true)
    expect(result.error).not.toBeNull()
  })

  it('upserts and patches while preserving unknown keys and other entries', () => {
    const dir = home()
    writeJsonFile(configFile(dir), {
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
    expect(path.basename(configFile(dir))).toBe('servers.config.json')
  })
})

describe('meta stamp', () => {
  it('records the writer without inventing a schema', () => {
    const home = tempDir().path
    fs.writeFileSync(path.join(home, 'servers.config.json'), JSON.stringify({ servers: [] }), 'utf8')
    const read = readConfig(home)
    writeConfig(home, upsertEntry(read.raw ?? {}, { id: 'x', command: 'sleep' }))
    const written = JSON.parse(fs.readFileSync(path.join(home, 'servers.config.json'), 'utf8'))
    // An absent schema reads as the panel's current one; inventing `1` here
    // would become wrong the day the panel bumps its schema.
    expect(written.meta).toEqual({ writtenBy: 'dsh-home-hosted' })
  })

  it('keeps the schema a file already declared', () => {
    const home = tempDir().path
    fs.writeFileSync(path.join(home, 'servers.config.json'), JSON.stringify({ meta: { writtenBy: 'home-hosted', schema: 7 }, servers: [] }), 'utf8')
    writeConfig(home, upsertEntry(readConfig(home).raw ?? {}, { id: 'x', command: 'sleep' }))
    const written = JSON.parse(fs.readFileSync(path.join(home, 'servers.config.json'), 'utf8'))
    expect(written.meta).toEqual({ writtenBy: 'dsh-home-hosted', schema: 7 })
  })
})
