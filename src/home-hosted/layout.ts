/**
 * Where a panel keeps its state on home-hosted 0.7+.
 *
 * Everything lives under `<root>/.hh`: the global files at the top, one directory
 * per workspace. The plugin targets 0.7 and never reads a pre-0.7 root — but it
 * still *recognises* one (`isLegacyRoot`) so an install is not lost before its
 * first 0.7 start, and so a write can say what to do instead of corrupting it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_WORKSPACE, isRecord, isWorkspaceId } from '../shared/contracts.js'

export { DEFAULT_WORKSPACE }

export const HH_DIR = '.hh'

export function hhDir(home: string): string {
  return path.join(home, HH_DIR)
}

export function globalSettingsFile(home: string): string {
  return path.join(hhDir(home), 'settings.json')
}

export function workspacesFile(home: string): string {
  return path.join(hhDir(home), 'workspaces.json')
}

/** The panel-wide secrets (password hash, API token hash), 0600. */
export function secretsFile(home: string): string {
  return path.join(hhDir(home), '.control-secrets.json')
}

/** The live daemon's identity: pid, url, token. */
export function runFile(home: string): string {
  return path.join(hhDir(home), 'run.json')
}

/**
 * One workspace's directory under the state root.
 *
 * The id is asserted here because this is the **single** place it becomes a path segment, and
 * that is what makes the two entry points agree: `callWorkspace` validates an id arriving over
 * the RPC, while a foreign panel's id arrives from a `workspaces.json` read off disk. Guarding
 * only the first left the second able to name `../../etc`. The panel's own schema is
 * `^[a-z0-9][a-z0-9_-]*$`, so nothing legitimate is refused.
 */
export function workspaceDir(home: string, workspace: string): string {
  if (!isWorkspaceId(workspace))
    throw new Error(`workspace id ${JSON.stringify(workspace)} must match ^[a-z0-9][a-z0-9_-]*$`)
  return path.join(hhDir(home), workspace)
}

export function serversFile(home: string, workspace: string): string {
  return path.join(workspaceDir(home, workspace), 'servers.config.json')
}

export function workspaceSettingsFile(home: string, workspace: string): string {
  return path.join(workspaceDir(home, workspace), 'settings.json')
}

export function workspaceSecretsFile(home: string, workspace: string): string {
  return path.join(workspaceDir(home, workspace), '.secrets.json')
}

export function workspaceLogsDir(home: string, workspace: string): string {
  return path.join(workspaceDir(home, workspace), '.logs')
}

export function workspaceStateDir(home: string, workspace: string): string {
  return path.join(workspaceDir(home, workspace), '.state')
}

export interface WorkspaceEntry {
  id: string
  label: string
}

export interface WorkspacesRead {
  workspaces: WorkspaceEntry[]
  error: string | null
}


/** The registry `.hh/workspaces.json` holds; an empty list is "not started yet". */
export function readWorkspaces(home: string): WorkspacesRead {
  const file = workspacesFile(home)
  if (!fs.existsSync(file))
    return { workspaces: [], error: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  }
  catch {
    return { workspaces: [], error: `${path.relative(home, file)} could not be parsed` }
  }
  const list = isRecord(parsed) && Array.isArray(parsed.workspaces) ? parsed.workspaces : null
  if (list === null)
    return { workspaces: [], error: `${path.relative(home, file)} has no workspaces list` }
  const workspaces: WorkspaceEntry[] = []
  for (const entry of list) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id.length === 0)
      return { workspaces: [], error: `${path.relative(home, file)} has an entry without an id` }
    // An id becomes a **path segment** (`workspaceDir` joins it under `.hh/`), so it has to be
    // the shape the panel itself writes — a registry is a file on disk, and one edited by hand
    // or written by something else could otherwise name `../../etc` and send a later write
    // outside the state root.
    if (!isWorkspaceId(entry.id))
      return { workspaces: [], error: `${path.relative(home, file)} has an id that is not a valid workspace id (${JSON.stringify(entry.id)})` }
    workspaces.push({ id: entry.id, label: typeof entry.label === 'string' && entry.label.length > 0 ? entry.label : entry.id })
  }
  return { workspaces, error: null }
}

/** The workspace to act on when the caller names none: `default` when it exists. */
export function defaultWorkspace(home: string): string {
  const { workspaces } = readWorkspaces(home)
  return workspaces.find(entry => entry.id === DEFAULT_WORKSPACE)?.id ?? workspaces[0]?.id ?? DEFAULT_WORKSPACE
}

/** Whether the root has been started on 0.7: it has a registry or panel settings. */
export function isHhRoot(home: string): boolean {
  return fs.existsSync(workspacesFile(home)) || fs.existsSync(globalSettingsFile(home))
}

/** A pre-0.7 root: state at the top level and no `.hh` yet. Detection only. */
export function isLegacyRoot(home: string): boolean {
  if (isHhRoot(home))
    return false
  return ['servers.config.json', '.control-secrets.json', 'run.json', '.state']
    .some(name => fs.existsSync(path.join(home, name)))
}

/**
 * The refusal a write to a not-yet-migrated root gets, or null when it is safe.
 * Starting the panel once on 0.7 relocates the root; `home-hosted migrate` does
 * the same with a report and needs no terminal.
 */
export function migrationRefusal(home: string): string | null {
  if (!isLegacyRoot(home))
    return null
  return `${home} still uses the pre-0.7 layout (state at the top level). Start the panel once on home-hosted 0.7 — it moves everything into .hh — or run \`home-hosted migrate --yes --home ${home}\`.`
}
