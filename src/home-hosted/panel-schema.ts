/**
 * The config schema the pinned panel reads and writes.
 *
 * This plugin writes workspace config files directly whenever the panel does not answer, and a
 * file it **creates** has to carry a `meta.schema` stamp. Getting that number wrong is not
 * cosmetic: the panel refuses to boot a file stamped above what it understands, and — since
 * home-hosted 0.9.0 — also one carrying no stamp at all ("config schema 1 needs 1 migration"),
 * because an absent stamp reads as the *oldest* shape.
 *
 * Read from the pinned release's own shipped source rather than hand-copied, for the reason a
 * copied constant is always wrong eventually: 0.8.0 and 0.9.0 both call it `CONFIG_SCHEMA`, and
 * only one of them means 2. This is a **read**, not a reimplementation — nothing here lifts a
 * config, which stays the panel's own `migrate`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pinnedManifestPath } from './resolve.js'

let cached: { schema: number | null } | null = null

/** The pinned panel's `CONFIG_SCHEMA`, or null when it cannot be read. */
export function panelConfigSchema(): number | null {
  if (cached === null)
    cached = { schema: readConfigSchemaFrom(pinnedManifestPath()) }
  return cached.schema
}

/** Drop the memo, for a test that points the pinned manifest elsewhere. */
export function resetPanelConfigSchema(): void {
  cached = null
}

/**
 * `CONFIG_SCHEMA` as one package manifest's shipped sourcemap declares it.
 *
 * Null is "unknown", never a guess: a caller that cannot name the schema must not stamp one and
 * must not write a file the panel would refuse. Exported with the manifest as a parameter so a
 * test can prove this **reads** the release instead of returning a constant.
 */
export function readConfigSchemaFrom(manifestPath: string | null): number | null {
  if (manifestPath === null)
    return null
  for (const mapPath of publishedSourcemaps(path.dirname(manifestPath))) {
    let map: { sourcesContent?: Array<string | null> }
    try {
      map = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as { sourcesContent?: Array<string | null> }
    }
    catch {
      continue
    }
    for (const text of map.sourcesContent ?? []) {
      if (typeof text !== 'string' || !text.includes('export const CONFIG_SCHEMA'))
        continue
      const match = /export const CONFIG_SCHEMA = (\d+)/.exec(text)
      if (match !== null)
        return Number.parseInt(match[1]!, 10)
    }
  }
  return null
}

/**
 * Every sourcemap the pinned release publishes, `dist/cli.js.map` first.
 *
 * **Not one hard-coded path.** home-hosted 0.13.0 code-splits its CLI, so `CONFIG_SCHEMA` moved
 * out of `dist/cli.js.map` into `dist/chunks/parse-<hash>.js.map` — and the hash is not knowable
 * in advance. A fixed path therefore returned null, which this module treats as "unknown" and
 * refuses to stamp on, so every config file the plugin creates would have been written without a
 * stamp: the panel reads that as the *oldest* schema and refuses to boot it. Silent, and the
 * wrong direction to fail in.
 *
 * The entry bundle is read first so a chunk cannot win by directory order, and the caller stops
 * at the first declaration, so one answer is returned exactly as before.
 */
function publishedSourcemaps(packageRoot: string): string[] {
  const dist = path.join(packageRoot, 'dist')
  const entry = path.join(dist, 'cli.js.map')
  const found: string[] = []
  const walk = (dir: string): void => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    }
    catch {
      return
    }
    for (const item of entries) {
      const full = path.join(dir, item.name)
      if (item.isDirectory())
        walk(full)
      else if (item.name.endsWith('.js.map'))
        found.push(full)
    }
  }
  walk(dist)
  return found.sort((a, b) => (a === entry ? -1 : b === entry ? 1 : a.length - b.length))
}
