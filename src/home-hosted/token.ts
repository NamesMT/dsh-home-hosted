/**
 * The plugin's own credential for the home-hosted panel.
 *
 * home-hosted keeps only the token's hash, so a token this plugin did not
 * create can never be recovered from disk. When none is enrolled, the plugin
 * mints one and hands it to `home-hosted set-token` through `HHOSTED_TOKEN`,
 * which stores the hash and prints nothing; when the panel refuses the stored
 * one, `reclaimToken` replaces it with a fresh token the same way.
 * The plaintext lives 0600 under the plugin state directory and is never logged,
 * rendered, or sent to the browser.
 */
import { createHash, randomBytes } from 'node:crypto'
import path from 'node:path'
import type { RunResult } from '../util/exec.js'
import { readJson, readText, writeFileAtomic } from '../util/fsx.js'
import { secretsFile } from '../util/paths.js'

export type CliExecutor = (args: string[], env: Record<string, string | undefined>) => Promise<RunResult>

export interface EnsureTokenOptions {
  home: string
  stateDir: string
  exec: CliExecutor
  /** Which panel this credential is for; omitted is the panel the plugin manages. */
  slot?: string
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
  slot?: string
}

export interface ReclaimTokenResult {
  token: string | null
  detail: string
}

/** A stable, unguessable file name for one state root's credential. */
export function tokenSlot(home: string): string {
  return createHash('sha256').update(path.resolve(home)).digest('hex').slice(0, 16)
}

export function storedTokenPath(stateDir: string, slot?: string): string {
  return slot === undefined
    ? path.join(stateDir, 'panel-token')
    : path.join(stateDir, 'panel-tokens', `${slot}.token`)
}

export function readStoredToken(stateDir: string, slot?: string): string | null {
  const text = readText(storedTokenPath(stateDir, slot))?.trim()
  return text !== undefined && text.length > 0 ? text : null
}

export function storeToken(stateDir: string, token: string, slot?: string): void {
  writeFileAtomic(storedTokenPath(stateDir, slot), `${token}\n`, 0o600)
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

function serialised<T>(stateDir: string, slot: string | undefined, work: () => Promise<T>): Promise<T> {
  const key = `${path.resolve(stateDir)}\u0000${slot ?? ''}`
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
  return await serialised(options.stateDir, options.slot, async () => await enrollToken(options))
}

/**
 * Replace the panel's API token with a fresh one.
 *
 * home-hosted keeps only the token's hash, so a token this plugin does not hold
 * cannot be recovered: a fresh token is minted, enrolled through the same
 * `HHOSTED_TOKEN` path `ensureToken` uses — one write, since `set-token` replaces
 * whatever hash is there — and only then is the plaintext stored 0600. The
 * attempted write carries no risk to the stored token: a failure replaced
 * nothing, so the previous plaintext is kept.
 */
export async function reclaimToken(options: ReclaimTokenOptions): Promise<ReclaimTokenResult> {
  return await serialised(options.stateDir, options.slot, async () => await enrollFreshToken(options))
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
  const stored = readStoredToken(options.stateDir, options.slot)
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

  storeToken(options.stateDir, token, options.slot)
  return { token, enrolled: true, detail: 'enrolled a new panel API token' }
}

async function enrollFreshToken(options: ReclaimTokenOptions): Promise<ReclaimTokenResult> {
  // One write, not a clear-then-set pair: `set-token` replaces whatever hash is
  // there (proved against the real CLI), and clearing first would leave a window
  // in which the panel has no token at all.
  const token = generateToken()
  const enrolled = await runCli(options.exec, ['--home', options.home, 'set-token'], { HHOSTED_TOKEN: token })
  if (enrolled.result === undefined) {
    // Nothing was replaced, so the stored token is still the panel's and is left
    // alone: dropping it would throw away a credential that may still work.
    return {
      token: null,
      detail: `could not enrol a fresh API token: ${enrolled.failure ?? 'the CLI did not answer'}; `
        + 'the previously stored token was kept',
    }
  }

  storeToken(options.stateDir, token, options.slot)
  return { token, detail: 'enrolled a fresh panel API token' }
}
