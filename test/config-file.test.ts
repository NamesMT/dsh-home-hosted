import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigLayoutError, CONTROL_MERGE_KEYS, findEntry, patchControl, patchEntry, readConfig, readGlobalSettings, removeEntry, SERVER_MERGE_KEYS, setControl, upsertEntry, writeConfig } from '../src/home-hosted/config-file.js'
import { globalSettingsFile, serversFile } from '../src/home-hosted/layout.js'
import { makeHhHome, makeLegacyHome } from './helpers/hh.js'
import { panelMergeKeys } from './helpers/panel-schema.js'
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

  /**
   * A file that parses but is not a config object reads as "no servers", and that
   * is the dangerous direction: the next write spreads it into the object form it
   * should have had, turning `[{…}]` into `{"0":{…}}` and losing the shape on
   * disk. The panel refuses a non-object servers file outright
   * (`parseServersFile`: "the servers config must contain a JSON object"), so this
   * refuses it too rather than reshaping it.
   */
  it('refuses a servers file that is not a JSON object, rather than reshaping it', () => {
    const dir = home()
    const file = serversFile(dir, 'default')
    fs.mkdirSync(path.dirname(file), { recursive: true })

    fs.writeFileSync(file, '[{"id":"keepme","command":"x"}]')
    const array = readConfig(dir)
    expect(array.exists).toBe(true)
    expect(array.raw).toBeNull()
    expect(array.error).toMatch(/does not contain a JSON object/)
    // And the file it refused is untouched.
    expect(fs.readFileSync(file, 'utf8')).toBe('[{"id":"keepme","command":"x"}]')

    // A plain object with no `servers` key is a legitimate empty config.
    fs.writeFileSync(file, '{"meta":{"writtenBy":"x"}}')
    expect(readConfig(dir).error).toBeNull()
  })

  /**
   * `findEntry` and `patchEntry` read `.id` off every entry, so a `null` or a
   * string in the list threw a raw `TypeError` — a crash where the panel reports
   * `servers[i]: …` and keeps the rest of the file running.
   */
  it('refuses an entry that is not an object instead of crashing on it', () => {
    const dir = home()
    const file = serversFile(dir, 'default')
    fs.mkdirSync(path.dirname(file), { recursive: true })

    for (const bad of ['{"servers":[null]}', '{"servers":["oops"]}', '{"servers":[42]}']) {
      fs.writeFileSync(file, bad)
      const result = readConfig(dir)
      expect(result.raw).toBeNull()
      expect(result.error).toMatch(/servers\[0\] that is not an object/)
    }

    // A well-formed list is still read, and the helpers work on it.
    fs.writeFileSync(file, '{"servers":[{"id":"ok","command":"x"}]}')
    const good = readConfig(dir)
    expect(good.error).toBeNull()
    expect(findEntry(good.raw!, 'ok')?.command).toBe('x')
    expect(patchEntry(good.raw!, 'ok', { autostart: true }).servers).toEqual([{ id: 'ok', command: 'x', autostart: true }])
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

  /**
   * A patch must mean the same thing whichever path carried it. `servers.update`
   * reaches this file whenever the panel is not answering or its token was
   * refused, while the same call goes through the API when it answers — and the
   * panel merges the nested groups (`SERVER_MERGE_KEYS` in its `config/patch.ts`).
   * Replacing them here silently dropped every sibling a partial patch never
   * mentioned, so a one-key edit reset the rest of the block to schema defaults.
   *
   * The expected values are what the real panel answers for the same patch
   * (verified against home-hosted 0.7.7 on a live loopback panel).
   */
  it('merges nested groups the way the panel\'s API does, instead of replacing them', () => {
    const dir = home()
    writeJsonFile(serversFile(dir, 'default'), {
      servers: [{
        id: 'worker',
        command: 'node',
        restart: { enabled: true, maxRetries: 9, baseDelayMs: 7500, factor: 3, maxDelayMs: 120000, resetAfterMs: 90000 },
        health: {
          enabled: true,
          mode: 'http',
          intervalMs: 12000,
          timeoutMs: 4000,
          unhealthyThreshold: 7,
          http: { path: '/healthz', method: 'HEAD', expectStatusBelow: 500 },
        },
        stop: { signal: 'SIGINT', graceMs: 9000, killGroup: false, killPortHolders: false },
      }],
    })

    const patched = patchEntry(readConfig(dir).raw!, 'worker', {
      restart: { maxRetries: 1 },
      health: { timeoutMs: 999, http: { path: '/readyz' } },
      stop: { killPortHolders: true },
    })
    const worker = findEntry(patched, 'worker')!

    // The named keys changed…
    expect(worker.restart).toMatchObject({ maxRetries: 1 })
    expect(worker.health).toMatchObject({ timeoutMs: 999 })
    expect(worker.stop).toMatchObject({ killPortHolders: true })
    // …and every sibling the patch never mentioned is still there. These are the
    // values the panel's API keeps for the same patch.
    expect(worker.restart).toEqual({ enabled: true, maxRetries: 1, baseDelayMs: 7500, factor: 3, maxDelayMs: 120000, resetAfterMs: 90000 })
    expect(worker.health).toEqual({
      enabled: true,
      mode: 'http',
      intervalMs: 12000,
      timeoutMs: 999,
      unhealthyThreshold: 7,
      http: { path: '/readyz', method: 'HEAD', expectStatusBelow: 500 },
    })
    expect(worker.stop).toEqual({ signal: 'SIGINT', graceMs: 9000, killGroup: false, killPortHolders: true })
  })

  /**
   * The panel's patch schema declares `restart`/`health`/`stop` `.optional()` but
   * not nullable, so the API answers 400 for `{ restart: null }`. Writing it here
   * instead produced a config the panel then *refused to boot from*:
   * `servers[0] ("a"): restart must be an object (was null)` — a file this plugin
   * wrote, that this plugin's own panel cannot start on. A `null` nested inside a
   * group stays allowed: that is how an optional key is cleared.
   */
  it('refuses a null group, which the panel answers 400 for and cannot boot on', () => {
    const dir = home()
    writeJsonFile(serversFile(dir, 'default'), {
      servers: [{ id: 'a', command: 'x', restart: { maxRetries: 9 }, health: { timeoutMs: 4000 }, stop: { graceMs: 9000 } }],
    })
    const raw = readConfig(dir).raw!

    for (const key of ['restart', 'health', 'stop'] as const) {
      expect(() => patchEntry(raw, 'a', { [key]: null })).toThrow(/must be an object \(was null\)/)
    }

    // A null *inside* a group is the documented way to clear one optional key.
    const nested = patchEntry(raw, 'a', { restart: { maxRetries: null } })
    expect(findEntry(nested, 'a')?.restart).toEqual({})
    expect(findEntry(nested, 'a')?.health).toEqual({ timeoutMs: 4000 })
  })

  it('merges a control patch and removes a key an explicit null clears', () => {
    const dir = home()
    const raw = { control: { port: 4000, auth: { enabled: true, sessionTtlMs: 90000 }, tls: { enabled: false } } }
    // `auth`/`tls` are the panel's CONTROL_MERGE_KEYS.
    const merged = patchControl(raw, { auth: { enabled: false }, tls: { enabled: true } })
    expect(merged.control).toEqual({ port: 4000, auth: { enabled: false, sessionTtlMs: 90000 }, tls: { enabled: true } })
    // An explicit null removes the key rather than writing null into the config.
    const cleared = patchControl(raw, { auth: { sessionTtlMs: null } })
    expect((cleared.control?.auth as Record<string, unknown>)).toEqual({ enabled: true })
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
      control: { port: 3999, host: '127.0.0.1', auth: { enabled: true, sessionTtlMs: 90000 } },
      auth: { enabled: true },
      tls: { mode: 'auto' },
      host: { enabled: true },
      backups: { enabled: false },
    })

    setControl(dir, { port: 6311 }, 'dsh-home-hosted')

    const written = readGlobalSettings(dir).raw!
    expect(written.control).toEqual({ port: 6311, host: '127.0.0.1', auth: { enabled: true, sessionTtlMs: 90000 } })
    expect(written.auth).toEqual({ enabled: true })
    expect(written.tls).toEqual({ mode: 'auto' })
    expect(written.host).toEqual({ enabled: true })
    expect(written.backups).toEqual({ enabled: false })
    // The schema the file declared survives, and the writer is stamped.
    expect(written.meta).toEqual({ writtenBy: 'dsh-home-hosted', schema: 1 })

    // A nested control group merges the way the panel's own `updateControl` does,
    // so patching one key of `auth` keeps its siblings. The fixture carries a
    // second key for exactly that reason: with only `enabled`, replacing and
    // merging look identical.
    setControl(dir, { auth: { enabled: false } }, 'dsh-home-hosted')
    expect(readGlobalSettings(dir).raw?.control).toEqual({
      port: 6311,
      host: '127.0.0.1',
      auth: { enabled: false, sessionTtlMs: 90000 },
    })

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

/**
 * The merge-key sets are **copies** of the panel's own (`src/config/patch.ts`), and
 * this reads the panel's from the pinned dependency so the two cannot drift silently.
 *
 * The failure a missing key causes is quiet and destructive, not cosmetic: a nested
 * group the list omits is *replaced* by a partial patch, so writing
 * `{ resources: { maxRssBytes: 1 } }` through the file drops every sibling key. That is
 * the exact bug the comment above `SERVER_MERGE_KEYS` describes having fixed once.
 */
describe('the merge-key copies follow the panel\'s own', () => {
  it('mirrors every server group the panel merges', () => {
    expect([...SERVER_MERGE_KEYS].sort()).toEqual(panelMergeKeys('SERVER_MERGE_KEYS').sort())
  })

  it('mirrors every control group the panel merges', () => {
    expect([...CONTROL_MERGE_KEYS].sort()).toEqual(panelMergeKeys('CONTROL_MERGE_KEYS').sort())
  })

  /**
   * And the consequence, asserted rather than described: a group that *is* mirrored
   * keeps its sibling keys, while one that is not loses them. If the set above ever
   * falls behind the panel, the patch path silently becomes the second case.
   */
  it('keeps sibling keys of a mirrored group and would lose them otherwise', () => {
    for (const key of SERVER_MERGE_KEYS) {
      const next = patchEntry({ servers: [{ id: 'web', command: 'node', [key]: { keep: 1, change: 1 } }] } as never, 'web', { [key]: { change: 2 } } as never)
      const entry = (next.servers as Array<Record<string, unknown>>)[0]!
      expect(entry[key], `${key} should merge, not replace`).toEqual({ keep: 1, change: 2 })
    }
    // The counter-example: an unmirrored group is replaced, which is what a missing
    // key would silently turn every group into.
    const replaced = patchEntry({ servers: [{ id: 'web', command: 'node', resources: { keep: 1, change: 1 } }] } as never, 'web', { resources: { change: 2 } } as never)
    const entry = (replaced.servers as Array<Record<string, unknown>>)[0]!
    expect(entry.resources).toEqual({ change: 2 })
  })
})
