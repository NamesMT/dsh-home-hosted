/**
 * The panel's first-run password, read from the root's own secrets file.
 *
 * A fresh home-hosted home does **not** ship a guessable default: `up` generates a random
 * password, prints it once, and stores the text in `.hh/.control-secrets.json` (0600) so
 * `home-hosted status` can keep reporting it until one is set. That is the whole design —
 * and on Desktop it breaks, because this plugin starts the panel as a managed entry and the
 * one printed line goes into a console file nobody is shown. A person then meets a login
 * screen they cannot pass.
 *
 * The panel's own API cannot help: `GET /api/auth/session` answers
 * `usingDefaultPassword: true` with `defaultPassword: null` **deliberately** ("shown on the
 * machine that started the panel, never over the API"). So this reads the machine-local file,
 * the same way the panel's own `status` command does, rather than widening the API.
 *
 * Three states, because two of them need different advice:
 *
 * - `recorded` — the text is on disk; show it.
 * - `unrecorded` — the password is still the generated one but its **text is gone**, which a
 *   restore of `global:secrets` does (it carries the hash and the flag, not always the text).
 *   Nobody can read it back; the panel's remedy is `account reset`, and showing a blank field
 *   would be a lie.
 * - `own` — a password the person set. Nothing to report.
 */
import fs from 'node:fs'
import { secretsFile } from './layout.js'

/** What the first-run password is, as this machine can report it. */
export type FirstRunPassword =
  | { state: 'recorded', password: string }
  | { state: 'unrecorded' }
  | { state: 'own' }
  /** The file is missing or unreadable — a panel that never started, or a foreign root. */
  | { state: 'unknown' }

/** The field the panel keeps the plaintext in, while it is still the generated password. */
interface SecretRecord {
  isDefault?: unknown
  initial?: unknown
}

/**
 * Read the panel's password state without ever throwing.
 *
 * Called while the page renders and after every panel start, so a malformed or half-written
 * file degrades to `unknown` rather than taking the section down.
 */
export function firstRunPassword(home: string): FirstRunPassword {
  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(secretsFile(home), 'utf8'))
  }
  catch {
    return { state: 'unknown' }
  }
  // `password` is the panel-wide record; a home with no password at all has no such key, which
  // is a panel that has never started rather than one waiting on a first-run secret.
  if (raw === null || typeof raw !== 'object')
    return { state: 'unknown' }
  const record = (raw as { password?: unknown }).password
  if (record === null || typeof record !== 'object')
    return { state: 'unknown' }
  const password = record as SecretRecord
  // Only while the generated password is still the one in use. Once a person sets their own,
  // `isDefault` goes false and any stored text is history, not something to show.
  if (password.isDefault !== true)
    return { state: 'own' }
  const initial = password.initial
  // An empty or absent text is the restored-from-backup case, not a blank password.
  if (typeof initial !== 'string' || initial.length === 0)
    return { state: 'unrecorded' }
  return { state: 'recorded', password: initial }
}
