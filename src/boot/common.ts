/**
 * Shared pieces of the boot ladder: where each mechanism's artifact lives, how
 * ownership of an existing artifact is proven before it is touched, and how a
 * probe's answers collapse into one `BootState`. No process is started here.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readText, writeFileAtomic } from '../util/fsx.js'
import type { BootState } from '../shared/contracts.js'
import type { BootAccount, BootActionResult, BootProviderContext } from './types.js'

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Existence check through the injected seam, so a probe is testable without touching the host. */
export function existsOf(ctx: BootProviderContext, file: string): boolean {
  return ctx.exists ? ctx.exists(file) : fs.existsSync(file)
}

export function posixJoin(...parts: string[]): string {
  return path.posix.join(...parts)
}

/** `$XDG_CONFIG_HOME`, else `~/.config`. */
export function configHome(ctx: BootProviderContext): string {
  const xdg = ctx.env.XDG_CONFIG_HOME?.trim()
  return xdg ? path.posix.resolve(xdg) : posixJoin(ctx.home, '.config')
}

/** `%LOCALAPPDATA%`, else `~\AppData\Local`. */
export function localAppData(ctx: BootProviderContext): string {
  const value = ctx.env.LOCALAPPDATA?.trim()
  return value ? value : path.join(ctx.home, 'AppData', 'Local')
}

/** A writable scratch directory, used to stage a unit before `sudo install`. */
export function tempDir(ctx: BootProviderContext): string {
  const value = ctx.env.TMPDIR?.trim() || ctx.env.TEMP?.trim() || ctx.env.TMP?.trim()
  return value || os.tmpdir()
}

// ---------------------------------------------------------------------------
// The invoking account
// ---------------------------------------------------------------------------

/** One `/etc/passwd` row. Read directly: every platform this plugin targets has one, and it needs no subprocess. */
interface PasswdEntry {
  name: string
  uid: number
  home: string
}

function readPasswd(): PasswdEntry[] {
  try {
    return fs.readFileSync('/etc/passwd', 'utf8')
      .split('\n')
      .map((line) => {
        const fields = line.split(':')
        const uid = Number.parseInt(fields[2] ?? '', 10)
        return fields.length < 6 || !Number.isFinite(uid) || (fields[0] ?? '').length === 0
          ? null
          : { name: fields[0] ?? '', uid, home: fields[5] ?? '' }
      })
      .filter((entry): entry is PasswdEntry => entry !== null)
  }
  catch {
    return []
  }
}

/** A numeric env value, or null when it is absent or not a plain number. */
function numberFrom(value: string | undefined): number | null {
  const text = value?.trim()
  if (text === undefined || text.length === 0)
    return null
  return /^\d+$/.test(text) ? Number.parseInt(text, 10) : null
}

function accountFrom(row: PasswdEntry): BootAccount {
  return { name: row.name, uid: row.uid, home: row.home.length > 0 ? row.home : null, root: row.uid === 0 }
}

/** `SUDO_USER`/`PKEXEC_USER`: what an elevating tool says it elevated. */
function declaredName(env: Record<string, string | undefined>): string | null {
  const value = env.SUDO_USER?.trim() || env.PKEXEC_USER?.trim()
  return value !== undefined && value.length > 0 ? value : null
}

/** `LOGNAME`, else `USER`: this process's own login, when nothing elevated it. */
function sessionName(env: Record<string, string | undefined>): string | null {
  const value = env.LOGNAME?.trim() || env.USER?.trim() || env.USERNAME?.trim()
  return value !== undefined && value.length > 0 ? value : null
}

/** The owner of the first of `paths` that exists and is not root, as an account. */
function ownerAccount(paths: readonly string[] | undefined, passwd: PasswdEntry[]): BootAccount | null {
  for (const path of paths ?? []) {
    try {
      const uid = fs.statSync(path).uid
      if (uid === 0)
        continue
      const row = passwd.find(entry => entry.uid === uid)
      if (row !== undefined)
        return accountFrom(row)
    }
    catch {
      // an unreadable path is just not an answer
    }
  }
  return null
}

/** What resolving an account needs; {@link BootProviderContext} satisfies it. */
export interface AccountInput {
  env: Record<string, string | undefined>
  /** This process's own uid; defaults to `process.getuid()`. */
  uid?: number | null
  /** Paths whose owner names the person a root process's panel belongs to. */
  ownerPaths?: readonly string[]
  /** Where a refusal or a root-account fallback is said out loud. */
  warn?: (message: string) => void
}

/**
 * The account a boot entry must run as.
 *
 * `$USER` is right in the common case and wrong in exactly the case this exists
 * for: `sudo` and `pkexec` rewrite `USER`, `LOGNAME` and `HOME` to the *target*
 * account, so a panel started from a root shell or a root unit reads
 * `USER=root` — and so does `os.userInfo()`, which reports the euid. The source
 * therefore depends on who this process is:
 *
 * 1. an elevating tool left `SUDO_UID`/`PKEXEC_UID`: that login is an
 *    instruction, and the only place the invoking user survives;
 * 2. otherwise the environment is this session's own, so a non-root `LOGNAME`
 *    names it. `root` is skipped on purpose: a root environment saying `root` is
 *    the silent default, not a choice, and a unit must never inherit it;
 * 3. otherwise the user database row for this uid (`$UID`, else the euid);
 * 4. otherwise the owner of a state path — who the panel actually belongs to;
 * 5. and only then, honestly, root.
 *
 * `User=root` is never a choice a panel made, so the answer carries `root: true`
 * for the writers to refuse rather than write it as if it were deliberate.
 */
export function accountOf(input: AccountInput): BootAccount | null {
  const passwd = readPasswd()
  const byUid = (uid: number | null): PasswdEntry | null => uid === null ? null : passwd.find(entry => entry.uid === uid) ?? null
  const byName = (name: string | null): PasswdEntry | null => name === null ? null : passwd.find(entry => entry.name === name) ?? null

  const elevatedUid = numberFrom(input.env.SUDO_UID) ?? numberFrom(input.env.PKEXEC_UID)
  const elevatedName = declaredName(input.env)
  if (elevatedUid !== null || elevatedName !== null) {
    const row = byUid(elevatedUid) ?? byName(elevatedName)
    if (row !== null)
      return accountFrom(row)
    // A login the user database does not hold (LDAP, a container): the uid the
    // tool left is the fact that matters, and `$HOME` has already been rewritten
    // to the target's, so it is not a home to repeat.
    return elevatedName === null ? null : { name: elevatedName, uid: elevatedUid, home: null, root: elevatedUid === 0 }
  }

  const ownUid = numberFrom(input.env.UID) ?? (input.uid === undefined ? (process.getuid?.() ?? null) : input.uid)
  const session = sessionName(input.env)
  if (session !== null && session !== 'root') {
    const row = byName(session)
    return { name: session, uid: ownUid ?? row?.uid ?? null, home: input.env.HOME?.trim() || row?.home || null, root: false }
  }

  // The root row is deliberately not consulted here: `uid 0` always has one, so
  // accepting it would short-circuit the state-owner fallback below — which is the
  // only answer a root process has for "whose panel is this?". Root is the *last*
  // resort, after the panel's own files have been asked.
  const ownRow = ownUid === 0 ? null : byUid(ownUid)
  if (ownRow !== null)
    return accountFrom(ownRow)

  const owner = ownerAccount(input.ownerPaths, passwd)
  if (owner !== null)
    return owner

  // Nothing named a person. A root process's panel runs as root whether or not a
  // unit says so, so report that and let every writer refuse to dress it up.
  if (ownUid === 0 || session === 'root')
    return { name: 'root', uid: 0, home: input.env.HOME?.trim() || '/root', root: true }
  return session === null ? null : { name: session, uid: ownUid, home: input.env.HOME?.trim() || null, root: false }
}

/**
 * The account a *login-scoped* mechanism belongs to.
 *
 * The systemd user manager and the desktop session are the invoking user's, so
 * the environment that started this process is the right answer here — unlike a
 * system unit, which outlives that environment entirely. A root account is never
 * offered: it is not a login this plugin can put an entry in.
 */
export function currentUser(ctx: AccountInput): string | null {
  const account = accountOf(ctx)
  if (account !== null && !account.root)
    return account.name
  const value = sessionName(ctx.env)
  return value !== null && value !== 'root' ? value : null
}

/**
 * A name a **system** entry may safely carry, or null.
 *
 * `User=root` is never a choice a panel made: root is the silent default of a root
 * process, and a unit that names it looks deliberate while it is the bug. So a
 * root account is refused here, loudly, and the caller omits the directive.
 */
export function bootUserName(ctx: AccountInput): string | null {
  const account = accountOf(ctx)
  if (account === null)
    return null
  if (account.root) {
    warnAccount(ctx, 'the only account available is root; a system unit would run the panel as root. Install it from the account that should own the panel, or set User= yourself.')
    return null
  }
  return account.name
}

function warnAccount(ctx: AccountInput, message: string): void {
  try {
    (ctx.warn ?? ((line: string) => console.warn(`[dsh-home-hosted] ${line}`)))(message)
  }
  catch {
    // a diagnostic is never worth failing a boot entry over
  }
}

/** The numeric uid this process runs as, as text, for a launchd domain. */
export function uidOf(ctx: BootProviderContext): string | null {
  const configured = numberFrom(ctx.env.UID)
  if (configured !== null)
    return String(configured)
  const uid = ctx.uid === undefined ? (process.getuid?.() ?? null) : ctx.uid
  return uid === null ? null : String(uid)
}

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

export interface FileOwnership {
  exists: boolean
  owned: boolean
  text: string | null
  reason: string | null
}

/**
 * An artifact belongs to this plugin only when it carries the marker. A file
 * we cannot read is treated as foreign: we must never overwrite or delete a
 * unit somebody else wrote.
 */
export function inspectOwned(file: string, marker: string): FileOwnership {
  if (!fs.existsSync(file))
    return { exists: false, owned: false, text: null, reason: null }
  const text = readText(file)
  if (text === null)
    return { exists: true, owned: false, text: null, reason: `${file} exists but is unreadable, so it cannot be proven to be ours` }
  if (!text.includes(marker))
    return { exists: true, owned: false, text, reason: `${file} exists and does not carry this plugin's marker (${marker}); refusing to touch an artifact we did not write` }
  return { exists: true, owned: true, text, reason: null }
}

/** Write our artifact if the bytes differ; never overwrite a foreign one. */
export function writeOwned(file: string, marker: string, content: string, mode = 0o644): { changed: boolean, refusal: string | null } {
  const own = inspectOwned(file, marker)
  if (own.exists && !own.owned)
    return { changed: false, refusal: own.reason }
  if (own.exists && own.text === content)
    return { changed: false, refusal: null }
  writeFileAtomic(file, content, mode)
  return { changed: true, refusal: null }
}

/** Delete our artifact only; a missing file is already the desired state. */
export function removeOwned(file: string, marker: string): { removed: boolean, refusal: string | null } {
  const own = inspectOwned(file, marker)
  if (!own.exists)
    return { removed: false, refusal: null }
  if (!own.owned)
    return { removed: false, refusal: own.reason }
  try {
    fs.rmSync(file, { force: true })
    return { removed: true, refusal: null }
  }
  catch (error) {
    return { removed: false, refusal: `could not delete ${file}: ${errorMessage(error)}` }
  }
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export function failed(detail: string, extra: Partial<BootActionResult> = {}): BootActionResult {
  return { ok: false, changed: false, detail, commands: [], needsPrivilege: false, ...extra }
}

/** Installed + enabled + last run failed is `enabled-failing`; never a guessed success. */
export function bootState(installed: boolean, enabled: boolean, failing: boolean): BootState {
  if (!installed)
    return 'not-installed'
  if (!enabled)
    return 'installed-disabled'
  return failing ? 'enabled-failing' : 'enabled-running'
}

export function isInstalledState(state: BootState): boolean {
  return state === 'installed-disabled' || state === 'enabled-running' || state === 'enabled-failing'
}
