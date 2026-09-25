/**
 * The server entry that represents the running harness.
 *
 * An existing entry is never rewritten: this plugin only owns `autostart`,
 * `onPortConflict` and `stop.killPortHolders`. A generated entry (only used when
 * there is none) mirrors how this process was actually launched where that is
 * knowable, and otherwise falls back to the `dsh web` app arguments.
 */
import path from 'node:path'
import process from 'node:process'
import type { ServerEntry } from '../shared/contracts.js'
import type { CliLaunch } from './launch.js'
import { resolveShimmedCli, which } from './launch.js'

export interface DshFacts {
  id: string
  port: number | null
  host: string
  profile: string | null
  dshHome: string
  launch: CliLaunch | null
}

/** Where the running harness's own CLI entry is, if we can tell. */
export async function resolveDshLaunch(): Promise<CliLaunch | null> {
  const fromArgv = process.argv[1]
  if (typeof fromArgv === 'string' && /\.[cm]?js$/.test(fromArgv) && path.isAbsolute(fromArgv))
    return { program: process.execPath, args: [fromArgv], cliEntry: fromArgv, shimPath: null, source: 'entry' }
  const found = await which('dsh')
  return found === null ? null : resolveShimmedCli(found, process.execPath)
}

export function buildDshEntry(facts: DshFacts): ServerEntry {
  const launch = facts.launch
  const entryArgs = launch?.args ?? []
  const profile = facts.profile === null || facts.profile === undefined ? 'web' : facts.profile

  const appArgs: string[] = []
  if (facts.port !== null) {
    appArgs.push(
      '--port', '{port}',
      '--host', '{host}',
      '--no-open',
      '--trusted-host', `localhost:{port}`,
    )
    if (facts.host === '0.0.0.0')
      appArgs.push('--trusted-host', '{lanIp}:{port}')
  }

  const launcherArgs = profile === 'web' ? ['web'] : ['--profile', profile]
  const args = [...entryArgs, ...launcherArgs, ...appArgs]

  return {
    id: facts.id,
    label: 'DSH web',
    enabled: true,
    autostart: true,
    command: launch?.program ?? 'dsh',
    args,
    bind: facts.host === '0.0.0.0' ? 'lan' : 'local',
    port: facts.port,
    cwd: process.cwd(),
    env: {},
    dataEnvs: { DSH_HOME: facts.dshHome },
    onPortConflict: 'kill',
    stop: { killPortHolders: true },
    health: {
      enabled: true,
      mode: 'http',
      http: { path: '/', method: 'GET', expectStatusBelow: 400, expectBody: '' },
    },
  }
}
