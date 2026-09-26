/**
 * The plugin's own credential for the home-hosted panel.
 *
 * home-hosted keeps only the token's hash, so a token this plugin did not
 * create can never be recovered from disk. When none is enrolled, the plugin
 * mints one and hands it to `home-hosted set-token` through `HHOSTED_TOKEN`,
 * which stores the hash and prints nothing; when the panel refuses the stored
 * one, `reclaimToken` clears the old hash and enrols a fresh token the same way.
 * The plaintext lives 0600 under the plugin state directory and is never logged,
 * rendered, or sent to the browser.
 */
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import type { RunResult } from '../util/exec.js'
import { readJson, readText, removeFile, writeFileAtomic } from '../util/fsx.js'
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

export interface ReclaimTokenOptions {
  home: string
  stateDir: string
  exec: CliExecutor
}

export interface ReclaimTokenResult {
  token: string | null
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

/**
 * One in-flight token operation per state directory, so two callers cannot race.
 *
 * Two concurrent callers used to mint two tokens: both `set-token` calls land, and
 * the loser's token is the one stored on disk while the panel keeps the winner's
 * hash — after which the plugin can never authenticate, and never re-enrols,
 * because home-hosted already holds an API token. Every operation on one state
 * directory therefore runs after the previous one has settled.
 */
const queue = new Map<string, Promise<unknown>>()

function serialised<T>(stateDir: string, work: () => Promise<T>): Promise<T> {
  const key = path.resolve(stateDir)
  const previous = queue.get(key) ?? Promise.resolve()
  // Run even when the previous operation rejected: that failure is its caller's.
  const next = previous.then(work, work)
  const settled = next.then(() => undefined, () => undefined)
  queue.set(key, settled)
  void settled.then(() => {
    if (queue.get(key) === settled) queue.delete(key)
  })
  return next
}

export async function ensureToken(options: EnsureTokenOptions): Promise<EnsureTokenResult> {
  return await serialised(options.stateDir, async () => await enrollToken(options))
}

/**
 * Replace the panel's API token with a fresh one.
 *
 * home-hosted keeps only the token's hash, so a token this plugin does not hold
 * cannot be recovered: the old hash is cleared first (without that, `set-token`
 * refuses to overwrite a token home-hosted already has), a fresh token is minted
 * and enrolled through the same `HHOSTED_TOKEN` path `ensureToken` uses, and only
 * then is the plaintext stored 0600. A failure before the new enrolment leaves
 * the previous stored token untouched; a failure after the clear removes it,
 * because home-hosted no longer accepts it.
 */
export async function reclaimToken(options: ReclaimTokenOptions): Promise<ReclaimTokenResult> {
  return await serialised(options.stateDir, async () => await enrollFreshToken(options))
}

interface CliAttempt {
  result?: RunResult
  failure?: string
}

/** Run one CLI step, turning both a non-zero exit and a spawn throw into text. */
async function runCli(exec: CliExecutor, args: string[], env: Record<string, string | undefined>): Promise<CliAttempt> {
  try {
    const result = await exec(args, env)
    if (result.code !== 0) {
      return {
        failure: result.error?.trim() || result.stderr.trim() || result.stdout.trim() || `exit ${String(result.code)}`,
      }
    }
    return { result }
  }
  catch (error) {
    return { failure: error instanceof Error ? error.message : String(error) }
  }
}

/** Mint a token when none is enrolled. */
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
  const enrolled = await runCli(options.exec, ['--home', options.home, 'set-token'], { HHOSTED_TOKEN: token })
  if (enrolled.result === undefined) {
    return {
      token: null,
      enrolled: false,
      detail: `could not enrol an API token: ${enrolled.failure ?? 'the CLI did not answer'}`,
    }
  }

  storeToken(options.stateDir, token)
  return { token, enrolled: true, detail: 'enrolled a new panel API token' }
}

async function enrollFreshToken(options: ReclaimTokenOptions): Promise<ReclaimTokenResult> {
  const cleared = await runCli(options.exec, ['--home', options.home, 'set-token', '--clear'], {})
  if (cleared.result === undefined) {
    return {
      token: null,
      detail: `could not clear the old API token: ${cleared.failure ?? 'the CLI did not answer'}`,
    }
  }

  const token = generateToken()
  const enrolled = await runCli(options.exec, ['--home', options.home, 'set-token'], { HHOSTED_TOKEN: token })
  if (enrolled.result === undefined) {
    // The old hash is gone and no new one landed, so the stored plaintext can
    // never authenticate again; drop it rather than leave a token that lies.
    removeFile(storedTokenPath(options.stateDir))
    return {
      token: null,
      detail: `the old API token was cleared, but a new one could not be enrolled: `
        + `${enrolled.failure ?? 'the CLI did not answer'}; retrying is safe`,
    }
  }

  storeToken(options.stateDir, token)
  return { token, detail: 'enrolled a fresh panel API token' }
}
