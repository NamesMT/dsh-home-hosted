/**
 * The plugin's own credential for the home-hosted panel.
 *
 * home-hosted keeps only the token's hash, so a token this plugin did not
 * create can never be recovered from disk. When none is enrolled, the plugin
 * mints one and hands it to `home-hosted set-token` through `HHOSTED_TOKEN`,
 * which stores the hash and prints nothing. The plaintext lives 0600 under the
 * plugin state directory and is never logged, rendered, or sent to the browser.
 */
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import type { RunResult } from '../util/exec.js'
import { readJson, readText, writeFileAtomic } from '../util/fsx.js'
import { secretsFile } from '../util/paths.js'

export type CliExecutor = (args: string[], env: Record<string, string | undefined>) => Promise<RunResult>

export interface EnsureTokenOptions {
  home: string
  stateDir: string
  exec: CliExecutor
}

export interface EnsureTokenResult {
  token: string | null
  /** True when this call created the token. */
  enrolled: boolean
  detail: string
}

export function storedTokenPath(stateDir: string): string {
  return path.join(stateDir, 'panel-token')
}

export function readStoredToken(stateDir: string): string | null {
  const text = readText(storedTokenPath(stateDir))?.trim()
  return text !== undefined && text.length > 0 ? text : null
}

export function storeToken(stateDir: string, token: string): void {
  writeFileAtomic(storedTokenPath(stateDir), `${token}\n`, 0o600)
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Whether home-hosted already holds an API token (only its hash is on disk). */
export function apiTokenEnrolled(home: string): boolean {
  const secrets = readJson<{ apiToken?: unknown }>(secretsFile(home))
  return secrets !== null && secrets.apiToken !== null && secrets.apiToken !== undefined
}

/** One in-flight enrolment per state directory, so two callers cannot race. */
const inFlight = new Map<string, Promise<EnsureTokenResult>>()

export async function ensureToken(options: EnsureTokenOptions): Promise<EnsureTokenResult> {
  const key = path.resolve(options.stateDir)
  const pending = inFlight.get(key)
  if (pending !== undefined)
    return await pending
  const attempt = enrollToken(options)
  inFlight.set(key, attempt)
  try {
    return await attempt
  }
  finally {
    inFlight.delete(key)
  }
}

/**
 * Mint a token when none is enrolled.
 *
 * Two concurrent callers used to mint two tokens: both `set-token` calls land, and
 * the loser's token is the one stored on disk while the panel keeps the winner's
 * hash — after which the plugin can never authenticate, and never re-enrols,
 * because home-hosted already holds an API token. `ensureToken` serialises them.
 */
async function enrollToken(options: EnsureTokenOptions): Promise<EnsureTokenResult> {
  const stored = readStoredToken(options.stateDir)
  if (stored !== null)
    return { token: stored, enrolled: false, detail: 'using the stored panel token' }

  if (apiTokenEnrolled(options.home)) {
    return {
      token: null,
      enrolled: false,
      detail: 'home-hosted already has an API token, and this plugin does not have it; '
        + 'run `home-hosted set-token --generate` and store that token, or clear it and re-enable',
    }
  }

  const token = generateToken()
  const result = await options.exec(['--home', options.home, 'set-token'], { HHOSTED_TOKEN: token })
  if (result.code !== 0) {
    return {
      token: null,
      enrolled: false,
      detail: `could not enrol an API token: ${result.stderr.trim() || result.stdout.trim() || `exit ${String(result.code)}`}`,
    }
  }

  storeToken(options.stateDir, token)
  return { token, enrolled: true, detail: 'enrolled a new panel API token' }
}
