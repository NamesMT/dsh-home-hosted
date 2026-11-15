/**
 * Setting a new panel password from the page, without the API.
 *
 * A person can be locked out of their own panel with no session to change anything — the
 * first-run password's text gone after a restore, a password forgotten, a legacy home whose
 * shared `hh` is meant to be replaced. The panel's answer is its own CLI, but telling a Desktop
 * user to run `home-hosted set-password` is not an answer: the panel is started by this plugin,
 * on this machine, and there is no terminal in front of them.
 *
 * So the plugin runs it. `set-password` reads `HHOSTED_PASSWORD` for a non-interactive run and
 * writes only the secrets file (0600), which the panel's own output says a running panel picks
 * up immediately — no restart, and every existing browser session is signed out.
 *
 * Three properties this keeps deliberately:
 *
 * - **The new password is generated here**, not typed into a box on the page. It is 12
 *   characters from the same unambiguous alphabet the panel uses, so it cannot be a weak value a
 *   person regrets, and it is never stored by this plugin: the caller reads it once and shows it.
 * - **It never travels to an agent.** The password is the person's own credential; see
 *   `redactForAgent`.
 * - **A failure is reported, not swallowed.** The CLI's own message names what went wrong
 *   (a short password, an unreadable file), and that is what the page shows.
 */
import { randomBytes } from 'node:crypto'
import type { RunResult } from '../util/exec.js'

export type CliExecutor = (args: string[], env: Record<string, string | undefined>) => Promise<RunResult>

/**
 * The alphabet the panel's own generator uses: no `0`/`1`/`l`/`o`, so a password read off a
 * screen is not mistyped.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

/** 12 characters over 31 symbols is ~59 bits — the panel's own strength for a first-run secret. */
export function generatePassword(source: Buffer = randomBytes(12)): string {
  const chars = [...source].map(byte => ALPHABET[byte % ALPHABET.length])
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8)].map(group => group.join('')).join('-')
}

export interface ResetPasswordOptions {
  home: string
  exec: CliExecutor
}

export interface ResetPasswordResult {
  ok: boolean
  /** The new password, only when it was actually set. */
  password: string | null
  detail: string
}

/**
 * Set a new panel password, returning it exactly once.
 *
 * `--home` is passed explicitly rather than relying on `HHOSTED_HOME` alone: the panel this
 * plugin manages is a state root it chose, and a stray environment variable must not redirect a
 * credential write into another home.
 */
export async function resetPanelPassword(options: ResetPasswordOptions): Promise<ResetPasswordResult> {
  const password = generatePassword()
  const result = await options.exec(
    ['set-password', '--home', options.home],
    // The secret goes through the environment, never argv: argv is visible in a process list.
    { ...process.env, HHOSTED_HOME: options.home, HHOSTED_PASSWORD: password },
  )
  if (result.code !== 0) {
    const output = [result.stdout, result.stderr].filter(part => typeof part === 'string' && part.trim().length > 0).join('\n').trim()
    return {
      ok: false,
      password: null,
      detail: output.length > 0 ? output : `home-hosted set-password exited ${String(result.code)}`,
    }
  }
  return {
    ok: true,
    password,
    detail: 'a new password was set; the panel picks it up immediately, and every signed-in browser session was signed out',
  }
}
