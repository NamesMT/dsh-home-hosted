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

/** Absolute path to the pinned panel's published `dist` directory. */
export function panelDistPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  // test/helpers → the package root is two levels up.
  return path.resolve(here, '..', '..', 'node_modules', 'home-hosted', 'dist')
}

/**
 * Every sourcemap the pinned panel publishes, outermost first.
 *
 * **Not one hard-coded file.** 0.13.0 code-splits the CLI, so the schemas this file reads moved
 * out of `dist/cli.js.map` into a content-hashed chunk (`dist/chunks/contracts-<hash>.js.map`).
 * A fixed path therefore reported "the panel's schema was not found" — an error that looks
 * like an upstream schema change and is really a build-layout change. Discovering the maps
 * keeps the readers honest across a re-split, and the hash is exactly what makes the file name
 * unknowable in advance.
 */
export function panelSchemaMaps(): string[] {
  const root = panelDistPath()
  const found: string[] = []
  const walk = (dir: string): void => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    }
    catch {
      return
    }
    // `cli.js.map` first: it is the entry bundle, and a chunk that also carries a name must not
    // silently win when both exist.
    const maps = entries.filter(entry => entry.isFile() && entry.name.endsWith('.js.map')).map(entry => path.join(dir, entry.name)).sort((a, b) => a.length - b.length)
    found.push(...maps)
    for (const entry of entries) {
      if (entry.isDirectory())
        walk(path.join(dir, entry.name))
    }
  }
  walk(root)
  return found
}

/** The published source that declares something `matches`, or null when none does. */
export function panelSourceContaining(matches: (text: string) => boolean): { source: string, file: string } | null {
  for (const file of panelSchemaMaps()) {
    let map: { sourcesContent?: Array<string | null> }
    try {
      map = JSON.parse(fs.readFileSync(file, 'utf8')) as { sourcesContent?: Array<string | null> }
    }
    catch {
      continue
    }
    for (const text of map.sourcesContent ?? []) {
      if (typeof text === 'string' && matches(text))
        return { source: text, file }
    }
  }
  return null
}

/** Every field name the panel's `serverSchema` declares, in source order. */
export function panelEntryFields(): string[] {
  const found = panelSourceContaining(text => text.includes('export const serverSchema'))
  if (found === null)
    throw new Error(`the pinned panel's schema was not found in any sourcemap under ${panelDistPath()}`)
  const source = found.source
  /**
   * 0.13.0 builds its schemas on first use (`lazy(() => type({…}))`), so the declaration is no
   * longer `= type({`. Anchoring on the old spelling matched nothing and reported "found 0
   * fields" — a build-shape change wearing the costume of an upstream schema change. Both
   * spellings are accepted so a future release may move either way without silently emptying
   * the list; a miss still throws, and the count guard below it is what proves the read is real.
   */
  const declarations = ['export const serverSchema = lazy(() => type({', 'export const serverSchema = type({']
  const start = declarations.map(declaration => source.indexOf(declaration)).find(at => at !== -1)
  if (start === undefined)
    throw new Error(`the pinned panel\'s serverSchema declaration was not found in ${found.file}`)
  // The declaration ends at its own `onUndeclaredKey('reject')`, which sits *inside* the
  // `lazy(() => …)` wrapper in 0.13. A bare `}))` fallback would have matched an inner
  // `type(` call and cut the field list to a third of itself — which is exactly what it did
  // before this comment: 9 fields instead of 30, and the count guard is what caught it.
  const end = source.indexOf(".onUndeclaredKey('reject')", start)
  if (end === -1)
    throw new Error(`the pinned panel\'s serverSchema has no onUndeclaredKey marker in ${found.file}`)
  const block = source.slice(start, end)
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
  const found = panelSourceContaining(text => text.includes('onPortConflictSchema = lazy(() => type.enumerated') || text.includes('onPortConflictSchema = type.enumerated'))
  if (found === null)
    throw new Error(`the pinned panel's policy enum was not found in any sourcemap under ${panelDistPath()}`)
  const source = found.source
  const at = source.indexOf('onPortConflictSchema = type.enumerated')
  // `indexOf` returns **-1** when the line ends the file, and `slice(at, -1)` then silently
  // drops the last character — measured: it happened to keep every policy here because the
  // dropped character was the closing paren, not a value. `\r\n` line endings make the same
  // search miss. Normalize and refuse to slice on a boundary that was not found, so the failure
  // is loud instead of a quiet truncation.
  const normalized = source.replace(/\r\n/g, '\n')
  // 0.13.0 wraps every schema in `lazy(() => …)`, so the declaration is
  // `onPortConflictSchema = lazy(() => type.enumerated(…)`. Both spellings are accepted; the
  // values are what this reads, and the count guard below catches a mis-slice.
  const anchors = ['onPortConflictSchema = lazy(() => type.enumerated', 'onPortConflictSchema = type.enumerated']
  const anchor = anchors.find(candidate => normalized.includes(candidate))
  if (anchor === undefined)
    throw new Error(`the pinned panel's policy enum moved; none of ${anchors.length} spellings matched`)
  const at2 = normalized.indexOf(anchor)
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
 * The panel's `editableFields` — what its **patch** schema (`serverPatchSchema`) declares.
 *
 * Distinct from `serverSchema`, and the distinction has already cost one bug: upstream fixed
 * `applyPatch` to delete on `null` and extended the *control* patch schema, while
 * `editableFields.label` stayed `'string?'`, so the clear could not be sent at all (0.7.21).
 * Reading this block is what lets a guard notice a field becoming nullable.
 */
function panelEditableFieldsSource(): string {
  // 0.13.0 turned `editableFields` from a `const … = {…} as const` object into a **function**
  // (`function editableFields() { return {…} }`), so it is built only when a patch schema is.
  // Both spellings are accepted: anchoring on the old one alone matched nothing, and the error
  // it produced — "the patch schema was not found" — reads like an upstream schema change
  // rather than the build-shape change it is.
  const found = panelSourceContaining(text => text.includes('const editableFields = {') || text.includes('function editableFields()'))
  if (found === null)
    throw new Error(`the pinned panel's patch schema was not found in any sourcemap under ${panelDistPath()}`)
  return found.source
}

/**
 * Every field of the panel's patch schema that accepts an explicit `null`, read from the pinned
 * release rather than hand-listed.
 *
 * A field is nullable when the schema named on its line resolves to one that admits `null` —
 * `type('string | null')`, `x.or(type('null'))`, or the `portSchema` union. This is the guard the
 * old hardcoded `['bootstrap', 'port']` could not be: it was true at 0.7.20 and silently false at
 * 0.7.21, when `label` joined the set. A null the panel rejects is a 400, and one our file
 * fallback is allowed to carry but the panel is not is a config the panel refuses to boot.
 */
export function panelNullablePatchFields(): string[] {
  const source = panelEditableFieldsSource()
  const declarations = ['const editableFields = {', 'function editableFields() {', 'function editableFields() {\n  return {']
  const start = declarations.map(declaration => source.indexOf(declaration)).filter(at => at !== -1)[0]
  if (start === undefined)
    throw new Error('the pinned panel\'s editableFields declaration was not found')
  // The block ends at `} as const` in the object form and at `\n  }` in the function form.
  const ends = ['} as const', '\n  }'].map(end => source.indexOf(end, start)).filter(at => at !== -1)
  if (ends.length === 0)
    throw new Error('the pinned panel\'s editableFields has no ending marker')
  const block = source.slice(start, Math.min(...ends))
  // The object form indents its fields two spaces (`const editableFields = {`), the 0.13.0
  // function form indents them four (inside `return {`). Anchoring on exactly two matched
  // nothing and the emptiness guard reported it rather than a vacuous pass.
  const lines = [...block.matchAll(/^ {2,6}([a-zA-Z]+):\s*(\w+)/gm)]
  const nullable = lines
    .filter(([, , schema]) => {
      if (schema === undefined)
        return false
      if (schema.endsWith('OrNullSchema'))
        return true
      // A schema declared as a union containing `null`, e.g. `portSchema`.
      const declaration = new RegExp(`const ${schema} = [^\\n]*`).exec(source)
      return declaration !== null && /\|\s*null|\.or\(type\('null'\)\)/.test(declaration[0])
    })
    .map(([, field]) => field!)
  if (nullable.length === 0)
    throw new Error('read no nullable patch fields, which would make the parity assertion vacuous')
  return nullable
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
  const found = panelSourceContaining(text => text.includes(`export const ${name} = new Set`))
  if (found === null)
    throw new Error(`the pinned panel does not declare ${name}; its patch module may have moved`)
  const source = found.source
  const match = new RegExp(`export const ${name} = new Set\\(\\[([^\\]]*)\\]`).exec(source)
  if (match === null)
    throw new Error(`could not read ${name} from the pinned panel's source`)
  const keys = match[1]!.split(',').map(part => part.trim().replace(/^'|'$/g, '')).filter(part => part.length > 0)
  if (keys.length === 0)
    throw new Error(`${name} read as empty, which would make a parity assertion vacuous`)
  return keys
}
