/**
 * The first-run password reader.
 *
 * The panel generates a random password on a fresh home and prints it **once**, on the machine
 * that started it; its API answers `usingDefaultPassword: true` with `defaultPassword: null` on
 * purpose. This plugin starts the panel as a managed entry, so that printed line goes to a
 * console nobody is shown — this reader is what lets the page show it instead.
 *
 * The two states that must not be confused: `recorded` has the text, `unrecorded` does not (a
 * `global:secrets` restore keeps the hash, not always the text) and needs `account reset`.
 * Showing an empty box for the second would read as "your password is blank".
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { firstRunPassword } from '../src/home-hosted/first-run-password.js'
import { secretsFile } from '../src/home-hosted/layout.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

/** A panel root whose secrets file holds `record` (or no file at all for `null`). */
function homeWith(record: unknown): string {
  scratch = tempDir()
  const root = scratch.path
  if (record !== null) {
    const file = secretsFile(root)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, typeof record === 'string' ? record : JSON.stringify(record))
  }
  return root
}

describe('the first-run password', () => {
  it('reads the text while the generated password is still in use', () => {
    // The real record shape, captured from a live 0.13.0 panel.
    const root = homeWith({ password: { algo: 'scrypt', salt: 'x', hash: 'y', isDefault: true, initial: 'ab12-cd34-ef56' } })
    expect(firstRunPassword(root)).toEqual({ state: 'recorded', password: 'ab12-cd34-ef56' })
  })

  it('reports `unrecorded` when the text is gone, rather than a blank password', () => {
    // A restore of `global:secrets` carries the hash and the flag but not always the text.
    const root = homeWith({ password: { algo: 'scrypt', salt: 'x', hash: 'y', isDefault: true } })
    expect(firstRunPassword(root)).toEqual({ state: 'unrecorded' })
    // An empty string is the same case: never report a password nobody typed.
    const empty = homeWith({ password: { isDefault: true, initial: '' } })
    expect(firstRunPassword(empty)).toEqual({ state: 'unrecorded' })
  })

  it('reports `own` once the person has set their own, even if text is stored', () => {
    const root = homeWith({ password: { isDefault: false, initial: 'a-previous-one' } })
    expect(firstRunPassword(root)).toEqual({ state: 'own' })
  })

  it('is unknown for a root that never started or cannot be read', () => {
    // No secrets file at all: a panel that has not run yet.
    expect(firstRunPassword(homeWith(null))).toEqual({ state: 'unknown' })
    // A file with no password record.
    expect(firstRunPassword(homeWith({ apiToken: {} }))).toEqual({ state: 'unknown' })
    // Not JSON at all — must degrade, not throw: this runs while the page renders.
    expect(firstRunPassword(homeWith('{ not json'))).toEqual({ state: 'unknown' })
    // JSON that is not an object.
    expect(firstRunPassword(homeWith('null'))).toEqual({ state: 'unknown' })
  })

  it('never throws, whatever the file holds', () => {
    for (const record of [null, '{}', '[]', '"a string"', '{"password":null}', '{"password":[]}', '{"password":{"isDefault":"true"}}'])
      expect(() => firstRunPassword(homeWith(record))).not.toThrow()
  })
})
