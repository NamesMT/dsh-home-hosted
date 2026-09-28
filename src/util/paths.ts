/**
 * Where things live. The harness home comes from `$DSH_HOME`; home-hosted's
 * state comes from `$HHOSTED_HOME`. Neither is ever hard-coded into a file this
 * plugin writes — the resolved value is written into generated units instead.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

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
 * panel root means two plugins editing one `servers.config.json` and one boot
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
  // The machine-wide panel is only this instance's to adopt when this instance
  // is the machine's own harness home, or when it has run before (its settings
  // are there). A home created fresh — a scratch `DSH_HOME`, a test project —
  // never reaches over and drives the panel some other install owns.
  const legacy = path.join(homeDir, '.home-hosted')
  if (isEstablishedInstance(state, homeDir) && hasLivePanel(legacy))
    return { home: legacy, source: 'legacy' }
  return { home: path.join(state, 'panel'), source: 'instance' }
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
 * Whether a root holds a panel somebody is running. A `run.json` alone is not
 * proof — it survives a crash — so it only counts while its pid is alive.
 */
function hasLivePanel(home: string): boolean {
  try {
    if (fs.statSync(path.join(home, 'servers.config.json')).isFile())
      return true
  }
  catch {
    // no config; a runtime with a live pid still counts below
  }
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(home, 'run.json'), 'utf8')) as { pid?: unknown }
    if (typeof raw.pid !== 'number')
      return false
    process.kill(raw.pid, 0)
    return true
  }
  catch {
    return false
  }
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

/** home-hosted's own tokens file, written by the panel at startup. */
export function runtimeFile(home: string): string {
  return path.join(home, 'run.json')
}

/** home-hosted's secrets file (0600): proves whether an API token is enrolled. */
export function secretsFile(home: string): string {
  return path.join(home, '.control-secrets.json')
}

export function configFile(home: string): string {
  return path.join(home, 'servers.config.json')
}
