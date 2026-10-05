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
