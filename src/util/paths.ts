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

/** DeepSeek Harness home: `$DSH_HOME`, else `~/.dsh`. */
export function dshHome(): string {
  const configured = process.env.DSH_HOME?.trim()
  return configured ? path.resolve(expandHome(configured)) : path.join(os.homedir(), '.dsh')
}

/** home-hosted state root: `$HHOSTED_HOME`, else `~/.home-hosted`. */
export function homeHostedHome(): string {
  const configured = process.env.HHOSTED_HOME?.trim()
  return configured ? path.resolve(expandHome(configured)) : path.join(os.homedir(), '.home-hosted')
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
    return { home: path.resolve(expandHome(configured)), source: 'env' }
  if (hasPanelState(path.join(homeDir, '.home-hosted')))
    return { home: path.join(homeDir, '.home-hosted'), source: 'legacy' }
  return { home: path.join(path.resolve(expandHome(stateDir)), 'panel'), source: 'instance' }
}

/** Whether a root already holds a panel, as opposed to merely existing. */
function hasPanelState(home: string): boolean {
  return ['servers.config.json', 'run.json'].some(file => {
    try {
      return fs.statSync(path.join(home, file)).isFile()
    }
    catch {
      return false
    }
  })
}

/**
 * The boot artifact one state root owns: the default keeps the historical name,
 * and every other instance gets its own, so two plugins cannot overwrite one
 * unit or delete the other's entry.
 */
export function bootUnitName(stateDir: string): string {
  if (isDefaultStateDir(stateDir))
    return 'home-hosted'
  return `home-hosted-${crypto.createHash('sha256').update(path.resolve(stateDir)).digest('hex').slice(0, 8)}`
}

function isDefaultStateDir(stateDir: string): boolean {
  const bare = stateDir?.trim()
  return bare === undefined || bare.length === 0 || path.resolve(expandHome(bare)) === path.join(dshHome(), 'dsh-home-hosted')
}

/** Where this plugin keeps its own durable state (settings, snapshots, token). */
export function pluginStateDir(override?: string): string {
  const configured = override?.trim()
  if (configured)
    return path.resolve(expandHome(configured))
  return path.join(dshHome(), 'dsh-home-hosted')
}

/** home-hosted's own tokens file, written by the panel at startup. */
export function runtimeFile(home = homeHostedHome()): string {
  return path.join(home, 'run.json')
}

/** home-hosted's secrets file (0600): proves whether an API token is enrolled. */
export function secretsFile(home = homeHostedHome()): string {
  return path.join(home, '.control-secrets.json')
}

export function configFile(home = homeHostedHome()): string {
  return path.join(home, 'servers.config.json')
}
