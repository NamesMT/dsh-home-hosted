/**
 * Where things live. The harness home comes from `$DSH_HOME`; home-hosted's
 * state comes from `$HHOSTED_HOME`. Neither is ever hard-coded into a file this
 * plugin writes — the resolved value is written into generated units instead.
 */
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
