/**
 * Where things live. The harness home comes from `$DSH_HOME`; home-hosted's
 * state comes from `$HHOSTED_HOME`. Neither is ever hard-coded into a file this
 * plugin writes — the resolved value is written into generated units instead.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { isHhRoot, runFile } from '../home-hosted/layout.js'

export function expandHome(value: string): string {
  if (value === '~')
    return os.homedir()
  if (value.startsWith('~/') || value.startsWith('~\\'))
    return path.join(os.homedir(), value.slice(2))
  return value
}

/** A configured path, resolved against one home — never against the cwd. */
function resolveUnder(value: string, homeDir: string): string {
  if (value === '~')
    return path.resolve(homeDir)
  if (value.startsWith('~/') || value.startsWith('~\\'))
    return path.resolve(path.join(homeDir, value.slice(2)))
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(homeDir, value)
}

/** DeepSeek Harness home: `$DSH_HOME`, else `~/.dsh`. */
export function dshHome(): string {
  const configured = process.env.DSH_HOME?.trim()
  return configured ? path.resolve(expandHome(configured)) : path.join(os.homedir(), '.dsh')
}

/**
 * The panel root one plugin instance drives.
 *
 * Two dsh installs share `~/.dsh` far more often than they should, and a shared
 * panel root means two plugins editing one workspace config and one boot
 * entry. So each instance normally gets its own root beside its own state.
 *
 * An explicit `$HHOSTED_HOME` is an instruction and always wins. So is a panel
 * already living at the machine-wide default: an upgrade must never point a
 * running panel somewhere else, or it would look like every server vanished.
 */
export function resolveHomeHostedHome(
  stateDir: string,
  env: NodeJS.ProcessEnv = process.env,
  homeDir: string = os.homedir(),
): { home: string, source: 'env' | 'legacy' | 'instance' } {
  const configured = env.HHOSTED_HOME?.trim()
  if (configured)
    return { home: resolveUnder(configured, homeDir), source: 'env' }
  const state = resolveUnder(stateDir, homeDir)
  const own = path.join(state, 'panel')
  // Once this instance has a root of its own, it stays there: a root it has
  // already used is never traded for the machine-wide one.
  if (fs.existsSync(own))
    return { home: own, source: 'instance' }
  // The machine-wide panel is only this instance's to adopt when this instance
  // is the machine's own harness home, or when it has run before (its settings
  // are there). A home created fresh — a scratch `DSH_HOME`, a test project —
  // never reaches over and drives the panel some other install owns.
  const legacy = path.join(homeDir, '.home-hosted')
  if (isEstablishedInstance(state, homeDir) && hasLivePanel(legacy))
    return { home: legacy, source: 'legacy' }
  return { home: own, source: 'instance' }
}

/** Whether this state dir is the machine's own install, or one that has run before. */
function isEstablishedInstance(stateDir: string, homeDir: string): boolean {
  if (stateDir === path.join(homeDir, '.dsh', 'dsh-home-hosted'))
    return true
  try {
    return fs.statSync(path.join(stateDir, 'settings.json')).isFile()
  }
  catch {
    return false
  }
}

/**
 * Whether a root holds a panel this instance may adopt: a 0.7 `.hh`, a pre-0.7
 * root with an actual servers config, or a `run.json` whose pid is still alive.
 *
 * A `run.json` alone is not proof — a killed panel leaves one behind — so it only
 * counts while its process answers. The same goes for the other top-level
 * leftovers (`.control-secrets.json`, `.state`): they are not a panel.
 */
function hasLivePanel(home: string): boolean {
  if (isHhRoot(home) || fs.existsSync(path.join(home, 'servers.config.json')))
    return true
  for (const file of [runFile(home), path.join(home, 'run.json')]) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as { pid?: unknown }
      if (typeof raw.pid !== 'number')
        continue
      process.kill(raw.pid, 0)
      return true
    }
    catch {
      // no runtime here; try the next one
    }
  }
  return false
}

/**
 * The boot artifact one state root owns. Only the machine-wide default keeps the
 * historical name: keying on the running process's own `$DSH_HOME` would give
 * two differently-homed installs the same name, which is the collision this
 * naming exists to prevent.
 */
export function bootUnitName(stateDir: string): string {
  if (isMachineDefaultStateDir(stateDir))
    return 'home-hosted'
  const key = path.resolve(expandHome(stateDir?.trim() ?? ''))
  return `home-hosted-${crypto.createHash('sha256').update(key).digest('hex').slice(0, 8)}`
}

function isMachineDefaultStateDir(stateDir: string): boolean {
  const bare = stateDir?.trim()
  if (bare === undefined || bare.length === 0)
    return true
  return path.resolve(expandHome(bare)) === path.join(os.homedir(), '.dsh', 'dsh-home-hosted')
}

/** Where this plugin keeps its own durable state (settings, snapshots, token). */
export function pluginStateDir(override?: string): string {
  const configured = override?.trim()
  if (configured)
    return path.resolve(expandHome(configured))
  return path.join(dshHome(), 'dsh-home-hosted')
}

