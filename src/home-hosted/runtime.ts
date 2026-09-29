/**
 * Facts about the running home-hosted panel, read from the `run.json` it writes
 * at startup. Its token field is deliberately never read: the plugin
 * authenticates with its own enrolled API token instead.
 */
import http from 'node:http'
import https from 'node:https'
import process from 'node:process'
import { readJson } from '../util/fsx.js'
import { runFile } from './layout.js'

export interface PanelRuntime {
  version: string
  pid: number
  url: string
  probeUrl?: string
  protocol?: string
  port: number
  bindHost?: string
  projectDir?: string
  dataRoot?: string
  configPath?: string
  logFile?: string
}

export function readRuntime(home: string): PanelRuntime | null {
  const raw = readJson<Record<string, unknown>>(runFile(home))
  if (raw === null)
    return null
  const url = typeof raw.url === 'string' ? raw.url : null
  const pid = typeof raw.pid === 'number' ? raw.pid : null
  if (url === null || pid === null)
    return null
  return {
    version: typeof raw.version === 'string' ? raw.version : 'unknown',
    pid,
    url: url.replace(/\/+$/, ''),
    probeUrl: typeof raw.probeUrl === 'string' ? raw.probeUrl : undefined,
    protocol: typeof raw.protocol === 'string' ? raw.protocol : undefined,
    port: typeof raw.port === 'number' ? raw.port : 0,
    bindHost: typeof raw.bindHost === 'string' ? raw.bindHost : undefined,
    projectDir: typeof raw.projectDir === 'string' ? raw.projectDir : undefined,
    dataRoot: typeof raw.dataRoot === 'string' ? raw.dataRoot : undefined,
    configPath: typeof raw.configPath === 'string' ? raw.configPath : undefined,
    logFile: typeof raw.logFile === 'string' ? raw.logFile : undefined,
  }
}

export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  }
  catch {
    return false
  }
}

/**
 * Ask the panel's public health route whether it is answering. Uses the raw
 * http/https modules so a self-signed TLS pair answers too.
 */
export async function probePanel(url: string, timeoutMs = 2000): Promise<boolean> {
  const target = `${url.replace(/\/+$/, '')}/healthz`
  return await new Promise<boolean>((resolve) => {
    let settled = false
    const done = (value: boolean): void => {
      if (settled)
        return
      settled = true
      resolve(value)
    }

    let parsed: URL
    try {
      parsed = new URL(target)
    }
    catch {
      done(false)
      return
    }

    const transport = parsed.protocol === 'https:' ? https : http
    const request = transport.get(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        timeout: timeoutMs,
        rejectUnauthorized: false,
      },
      (response) => {
        response.resume()
        done(typeof response.statusCode === 'number')
      },
    )
    request.on('timeout', () => {
      request.destroy()
      done(false)
    })
    request.on('error', () => done(false))
  })
}
