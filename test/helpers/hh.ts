/**
 * Fixtures for the 0.7 state layout.
 *
 * Every path under a panel root is derived in one place (`src/home-hosted/layout.ts`),
 * so tests build `.hh` fixtures through the same helpers rather than repeating the
 * joins. `makeHhHome` writes a 0.7 root; `makeLegacyHome` writes the pre-0.7 one the
 * migration refuses.
 */
import fs from 'node:fs'
import path from 'node:path'
import { globalSettingsFile, hhDir, runFile, secretsFile, serversFile, workspaceSettingsFile, workspacesFile } from '../../src/home-hosted/layout.js'
import { writeJsonFile } from './temp.js'

export interface HhWorkspaceInput {
  id: string
  label?: string
}

export interface HhHomeOptions {
  /**
   * The registry to write. A bare id gets its id as the label. Defaults to a
   * single `default` workspace; `null` writes no registry at all, which is how a
   * root looks before its first start (`isHhRoot` then needs `.hh/settings.json`).
   */
  workspaces?: Array<string | HhWorkspaceInput> | null
  /** `.hh/settings.json`, verbatim (listener/auth/TLS/host/backups). */
  settings?: Record<string, unknown>
  /** `.hh/run.json`: the live daemon's identity. */
  running?: { pid?: number, url?: string, version?: string, port?: number, projectDir?: string } & Record<string, unknown>
  /** `.hh/.control-secrets.json`: the panel-wide credential hashes. */
  secrets?: Record<string, unknown>
  /** `servers.config.json` per workspace, verbatim (`{ servers: [...] }` and friends). */
  servers?: Record<string, Record<string, unknown>>
  /** A workspace's own `settings.json`. */
  workspaceSettings?: Record<string, Record<string, unknown>>
}

/** A 0.7 root: everything under `.hh/.`, one directory per workspace. */
export function makeHhHome(home: string, options: HhHomeOptions = {}): string {
  fs.mkdirSync(hhDir(home), { recursive: true })
  const registry = options.workspaces === undefined ? ['default'] : options.workspaces
  if (registry !== null) {
    writeJsonFile(workspacesFile(home), {
      workspaces: registry.map(entry => typeof entry === 'string'
        ? { id: entry, label: entry }
        : { id: entry.id, label: entry.label ?? entry.id }),
    })
  }
  if (options.settings !== undefined)
    writeJsonFile(globalSettingsFile(home), options.settings)
  if (options.secrets !== undefined)
    writeJsonFile(secretsFile(home), options.secrets)
  if (options.running !== undefined)
    writeJsonFile(runFile(home), { port: options.running.port ?? null, url: options.running.url ?? null, ...options.running })
  for (const [workspace, raw] of Object.entries(options.servers ?? {}))
    writeJsonFile(serversFile(home, workspace), { servers: [], ...raw })
  for (const [workspace, raw] of Object.entries(options.workspaceSettings ?? {}))
    writeJsonFile(workspaceSettingsFile(home, workspace), raw)
  return home
}

export interface LegacyHomeOptions {
  /** Top-level `servers.config.json`; omitted means that file is absent. */
  servers?: unknown[]
  /** Top-level `run.json`. */
  running?: Record<string, unknown>
  /** Top-level `.control-secrets.json`. */
  secrets?: Record<string, unknown>
}

/** A pre-0.7 root: state at the top level and no `.hh`. Never migrated by a test. */
export function makeLegacyHome(home: string, options: LegacyHomeOptions = {}): string {
  fs.mkdirSync(home, { recursive: true })
  if (options.servers !== undefined)
    writeJsonFile(path.join(home, 'servers.config.json'), { servers: options.servers })
  if (options.running !== undefined)
    writeJsonFile(path.join(home, 'run.json'), options.running)
  if (options.secrets !== undefined)
    writeJsonFile(path.join(home, '.control-secrets.json'), options.secrets)
  return home
}
