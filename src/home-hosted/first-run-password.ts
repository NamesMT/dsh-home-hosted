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
 * **It mirrors the panel's `initialPassword` getter exactly, including its legacy branch.**
 * That matters and was got wrong once: a home from before 0.12 still holds a hash of the
 * shared `hh` password with **no `initial` text**, so a reader that only looks for the text
 * reports "unrecorded, nobody can read it back" for a password that is `hh` and perfectly
 * recoverable. Measured on a real pre-0.12 root: the panel's `status` prints `password hh`
 * while a text-only reader says nothing can be recovered. The branch is therefore a
 * verification against that one constant, never a guess.
 *
 * Three states, because they need different advice:
 *
 * - `recorded` — the text is on disk (a generated password, or the legacy `hh`); show it.
 * - `unrecorded` — a generated password is in use but its text is gone and it is not the
 *   legacy default. A restore of `global:secrets` does this: it carries the hash and the
 *   flag, not always the text. Nothing can read it back, so the only way in is a reset.
 * - `own` — a password the person set. Nothing to report.
 */
import { scryptSync, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import { secretsFile } from './layout.js'

/** What the first-run password is, as this machine can report it. */
export type FirstRunPassword =
  | { state: 'recorded', password: string }
  | { state: 'unrecorded' }
  | { state: 'own' }
  /** The file is missing or unreadable — a panel that never started, or a foreign root. */
  | { state: 'unknown' }

/**
 * The pre-0.12 boot password every install shared, as `src/config/secrets.ts` declares it.
 *
 * A copy, because the plugin runs against several panel releases and this constant belongs to
 * the panel's internals. It is only ever used to *verify* a stored hash, never to create one,
 * so a release that drops it makes this branch miss (returning `unrecorded`) rather than
 * authenticating with a value the panel no longer accepts.
 */
const LEGACY_DEFAULT_PASSWORD = 'hh'

/** The fields this needs from the panel's `PasswordRecord`. */
interface SecretRecord {
  algo?: unknown
  salt?: unknown
  hash?: unknown
  keylen?: unknown
  cost?: unknown
  isDefault?: unknown
  initial?: unknown
}

/**
 * Does `password` hash to this record? The panel's `verifyPassword`, and nothing more.
 *
 * `cost` is an object (`{ N, r, p }`), not a number: passing it through unchanged is what makes
 * a real record verify. Normalising first because the panel does — a non-ASCII password hashes
 * by its NFKC form.
 */
function verifies(password: string, record: SecretRecord): boolean {
  if (record.algo !== 'scrypt')
    return false
  if (typeof record.salt !== 'string' || typeof record.hash !== 'string' || typeof record.keylen !== 'number')
    return false
  if (record.cost === null || typeof record.cost !== 'object')
    return false
  try {
    const expected = Buffer.from(record.hash, 'base64')
    const actual = scryptSync(password.normalize('NFKC'), Buffer.from(record.salt, 'base64'), record.keylen, { ...(record.cost as object) })
    // A length mismatch would make `timingSafeEqual` throw, which is why it is checked first.
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }
  catch {
    return false
  }
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
  // The panel's own order: the stored text first, then the legacy constant, verified.
  if (typeof initial === 'string' && initial.length > 0)
    return { state: 'recorded', password: initial }
  if (verifies(LEGACY_DEFAULT_PASSWORD, password))
    return { state: 'recorded', password: LEGACY_DEFAULT_PASSWORD }
  return { state: 'unrecorded' }
}
