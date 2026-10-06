/**
 * The panel's own `serverSchema`, read from the pinned dependency.
 *
 * Shared by the two parity guards (`test/tools` for the model's field list,
 * `test/client/entry-editor` for the editor's scope) so there is one reader and one
 * idea of where the schema lives — a second one would drift.
 *
 * The path is resolved from this file rather than the process's cwd: a relative
 * `node_modules/...` read works when vitest is started from the repo root and fails
 * from anywhere else, which is a portability trap rather than a real signal.
 *
 * The dependency ships `dist/cli.js.map` with `sourcesContent`, so this is the
 * *published* schema of the version actually pinned — never a hand-copied list, which
 * is the bug both guards exist to prevent.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Absolute path to the pinned panel's sourcemap. */
export function panelSchemaMapPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  // test/helpers → the package root is two levels up.
  return path.resolve(here, '..', '..', 'node_modules', 'home-hosted', 'dist', 'cli.js.map')
}

/** Every field name the panel's `serverSchema` declares, in source order. */
export function panelEntryFields(): string[] {
  const map = JSON.parse(fs.readFileSync(panelSchemaMapPath(), 'utf8')) as { sourcesContent: string[] }
  const source = map.sourcesContent.find(text => text?.includes('export const serverSchema'))
  if (source === undefined)
    throw new Error(`the pinned panel's schema was not found in ${panelSchemaMapPath()}`)
  const start = source.indexOf('export const serverSchema = type({')
  const block = source.slice(start, source.indexOf(".onUndeclaredKey('reject')", start))
  const fields = [...block.matchAll(/^ {2}([a-zA-Z]+):/gm)].map(match => match[1]!)
  // A regex that matched nothing would make every caller's assertion vacuous.
  if (fields.length <= 20)
    throw new Error(`expected the panel's server schema, found ${fields.length} fields`)
  return fields
}

/**
 * The port-conflict policies the pinned panel's own schema enumerates.
 *
 * `ON_PORT_CONFLICT_POLICIES` is a **copy** of this list, and the panel's schema is the authority
 * on what it accepts. A member missing from our copy is not cosmetic: `isOnPortConflict` then
 * returns false for a policy the panel parses, and the settings and snapshot readers silently
 * replace it with the default — the person's choice is lost on the next write.
 *
 * This is the guard a `Record<OnPortConflict, …>` would give, without inventing a per-policy
 * behaviour that does not exist: measured, removing `warn` from the list produced **0** type
 * errors, because nothing behaves differently per policy.
 */
export function panelPortConflictPolicies(): string[] {
  const map = JSON.parse(fs.readFileSync(panelSchemaMapPath(), 'utf8')) as { sourcesContent: string[] }
  const source = map.sourcesContent.find(text => text?.includes('onPortConflictSchema = type.enumerated'))
  if (source === undefined)
    throw new Error(`the pinned panel's policy enum was not found in ${panelSchemaMapPath()}`)
  const at = source.indexOf('onPortConflictSchema = type.enumerated')
  // `indexOf` returns **-1** when the line ends the file, and `slice(at, -1)` then silently
  // drops the last character — measured: it happened to keep every policy here because the
  // dropped character was the closing paren, not a value. `\r\n` line endings make the same
  // search miss. Normalize and refuse to slice on a boundary that was not found, so the failure
  // is loud instead of a quiet truncation.
  const normalized = source.replace(/\r\n/g, '\n')
  const at2 = normalized.indexOf('onPortConflictSchema = type.enumerated')
  const end = normalized.indexOf('\n', at2)
  if (end === -1)
    throw new Error('the policy enum line has no ending newline, so it cannot be sliced safely')
  const line = normalized.slice(at2, end)
  const policies = [...line.matchAll(/'([a-z]+)'/g)].map(match => match[1]!)
  // A regex that matched nothing would make the caller's assertion vacuous.
  if (policies.length < 5)
    throw new Error(`expected the panel's port-conflict policies, found ${policies.length}`)
  return policies
}

/**
 * A `new Set([...])` literal from the pinned panel's own source, as data.
 *
 * The plugin **copies** the panel's merge-key sets, and a missing member is not a
 * cosmetic difference: a nested group a patch merges into is otherwise *replaced*, so
 * a partial write silently drops every sibling key. Reading the panel's own source
 * keeps the copy honest without importing it (upstream exports only `dist/cli.js`).
 */
export function panelMergeKeys(name: 'SERVER_MERGE_KEYS' | 'CONTROL_MERGE_KEYS'): string[] {
  const map = JSON.parse(fs.readFileSync(panelSchemaMapPath(), 'utf8')) as { sourcesContent: string[] }
  const source = map.sourcesContent.find(text => text?.includes(`export const ${name} = new Set`))
  if (source === undefined)
    throw new Error(`the pinned panel does not declare ${name}; its patch module may have moved`)
  const match = new RegExp(`export const ${name} = new Set\\(\\[([^\\]]*)\\]`).exec(source)
  if (match === null)
    throw new Error(`could not read ${name} from the pinned panel's source`)
  const keys = match[1]!.split(',').map(part => part.trim().replace(/^'|'$/g, '')).filter(part => part.length > 0)
  if (keys.length === 0)
    throw new Error(`${name} read as empty, which would make a parity assertion vacuous`)
  return keys
}
