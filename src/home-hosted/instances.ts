/**
 * Which home-hosted panels exist on this machine.
 *
 * `home-hosted` is not one panel per machine: a person can install it per
 * project, or run several panels from one install with different `--home`
 * roots. This plugin drives exactly one of them — the root it resolved — so
 * discovery exists to name the others, to keep every action on the panel this
 * plugin owns, and to tell the agent that the machine has more than one.
 *
 * Discovery is bounded on purpose: the roots the plugin already knows (the
 * managed one, `$HHOSTED_HOME`, the operator's declared ones) and the
 * `~/.home-hosted*` siblings. A `--home` somewhere else on the disk is not
 * found by scanning for it; it is declared through `instanceRoots`.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import type { InstanceSource, InstanceView } from '../shared/contracts.js'
import { expandHome } from '../util/paths.js'
import { readConfig } from './config-file.js'
import { defaultWorkspace, isHhRoot, isLegacyRoot, runFile } from './layout.js'
import { pidAlive, readRuntime } from './runtime.js'

export interface InstanceDiscoveryOptions {
  /** The state root this plugin drives. */
  managedHome: string
  /** Extra roots an operator declared in the plugin row. */
  extraRoots?: readonly string[]
  /** Test seam: this process's `$HHOSTED_HOME`. */
  envHome?: string | null
  /** Test seam: `HHOSTED_SERVER_ID`, or null when the panel does not supervise us. */
  hostingEntryId?: string | null
  /** Test seam: the user's home directory. */
  homeDir?: string
  /** Test seam: directory listing. */
  listDir?: (dir: string) => string[] | null
  /** Test seam: whether a pid is alive. */
  alive?: (pid: number) => boolean
}

/** A sibling state root of the default one, e.g. `~/.home-hosted-staging`. */
const SIBLING_PATTERN = /^\.home-hosted(?:[._-].*)?$/

/** A path as one identity: `~` expanded, symlinks resolved (macOS `/var`). */
export function canonicalPath(value: string): string {
  const resolved = path.resolve(expandHome(value))
  try {
    return fs.realpathSync.native(resolved)
  }
  catch {
    return resolved
  }
}

function defaultListDir(dir: string): string[] | null {
  try {
    return fs.readdirSync(dir)
  }
  catch {
    return null
  }
}

/** A directory that holds a panel's state: a 0.7 `.hh`, a pre-0.7 root, or a runtime it wrote. */
function isStateRoot(home: string): boolean {
  try {
    if (!fs.statSync(home).isDirectory())
      return false
  }
  catch {
    return false
  }
  if (isHhRoot(home) || isLegacyRoot(home))
    return true
  return fs.existsSync(runFile(home))
}

function viewOf(candidate: { home: string, source: InstanceSource }, managed: string, envHome: string | null, hosting: boolean, alive: (pid: number) => boolean): InstanceView {
  const runtime = readRuntime(candidate.home)
  // Another panel's entries are counted in the workspace it would default to;
  // its own managed workspace is not knowable from here.
  const read = readConfig(candidate.home, defaultWorkspace(candidate.home))
  return {
    home: candidate.home,
    managed: candidate.home === managed,
    hosting: hosting && candidate.home === envHome,
    url: runtime?.url ?? null,
    port: runtime?.port ?? null,
    pid: runtime?.pid ?? null,
    version: runtime?.version ?? null,
    // A `run.json` names the process that wrote it; a recycled pid is not worth
    // chasing here, because a stale one only mislabels a panel nobody acts on.
    running: runtime !== null && alive(runtime.pid),
    projectDir: runtime?.projectDir ?? null,
    servers: read.error === null ? (read.raw?.servers ?? []).length : null,
    source: candidate.source,
  }
}

/** Every panel found, the managed one first and the rest by state root. */
export function discoverInstances(options: InstanceDiscoveryOptions): InstanceView[] {
  const managed = canonicalPath(options.managedHome)
  const listDir = options.listDir ?? defaultListDir
  const alive = options.alive ?? pidAlive
  const envRaw = options.envHome?.trim()
  const envHome = envRaw !== undefined && envRaw.length > 0 ? canonicalPath(envRaw) : null
  const hostingEntryId = options.hostingEntryId?.trim() ?? ''

  const candidates: Array<{ home: string, source: InstanceSource }> = [{ home: managed, source: 'managed' }]
  if (envHome !== null)
    candidates.push({ home: envHome, source: 'env' })
  for (const root of options.extraRoots ?? []) {
    if (root.trim().length > 0)
      candidates.push({ home: canonicalPath(root), source: 'configured' })
  }
  const homeDir = options.homeDir ?? os.homedir()
  for (const name of listDir(homeDir) ?? []) {
    if (SIBLING_PATTERN.test(name))
      candidates.push({ home: canonicalPath(path.join(homeDir, name)), source: 'sibling' })
  }

  const seen = new Set<string>()
  const views: InstanceView[] = []
  for (const candidate of candidates) {
    if (seen.has(candidate.home))
      continue
    seen.add(candidate.home)
    // The managed root is listed even before its first start — it is the panel
    // the plugin drives. Any other candidate must hold a panel's state to count.
    if (candidate.source !== 'managed' && !isStateRoot(candidate.home))
      continue
    views.push(viewOf(candidate, managed, envHome, hostingEntryId.length > 0, alive))
  }
  views.sort((left, right) => (left.managed === right.managed ? left.home.localeCompare(right.home) : left.managed ? -1 : 1))
  return views
}

/**
 * One line naming a panel, for a prompt note or a refusal. A root whose
 * `run.json` is gone has no runtime to report — home-hosted drops a stale one —
 * so it is never called "stopped".
 */
export function describeInstance(instance: InstanceView): string {
  if (instance.url === null)
    return `${instance.home} (no runtime)`
  return `${instance.home} (${instance.url}${instance.running ? '' : ', stopped'})`
}

/**
 * The note the agent is given when the machine holds more than one panel.
 *
 * `null` for a single panel: the plugin's preference is only worth stating when
 * there is something to prefer it over.
 */
export function instancesNoticeText(instances: readonly InstanceView[]): string | null {
  const managed = instances.find(instance => instance.managed)
  const others = instances.filter(instance => !instance.managed)
  if (managed === undefined || others.length === 0)
    return null
  return [
    `home-hosted: ${instances.length} panels were found on this machine, and this plugin manages only ${describeInstance(managed)}.`,
    `Other panels: ${others.map(describeInstance).join('; ')}.`,
    'Act on the managed panel unless the user names another; a home_hosted_* call takes "instance" to name one.',
    'Naming another panel is allowed for methods that can reach it: the plugin asks the user how, then edits that panel\'s config file, runs the CLI against its state root, or — only if they choose it — mints a token for that panel and uses its API.',
  ].join(' ')
}
