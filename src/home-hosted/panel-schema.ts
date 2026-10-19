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
  try {
    const mapPath = path.join(path.dirname(manifestPath), 'dist', 'cli.js.map')
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as { sourcesContent?: Array<string | null> }
    const source = map.sourcesContent?.find((text): text is string => typeof text === 'string' && text.includes('export const CONFIG_SCHEMA'))
    const match = source === undefined ? null : /export const CONFIG_SCHEMA = (\d+)/.exec(source)
    return match === null ? null : Number.parseInt(match[1]!, 10)
  }
  catch {
    return null
  }
}
