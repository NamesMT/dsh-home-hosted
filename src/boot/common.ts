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
import type { BootAccount, BootActionResult, BootProviderContext, PasswdEntry } from './types.js'

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

/**
 * Parse a passwd-format file. Exported so a test can read a fixture: the only
 * alternative is asserting against whatever accounts the machine running the
 * suite happens to have, which is exactly the host dependency this module exists
 * to remove from unit generation.
 */
export function parsePasswd(text: string): PasswdEntry[] {
  return text
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

/**
 * Read the user database: a file read, never a subprocess.
 *
 * An empty result is a normal outcome, not a failure — macOS keeps local accounts
 * in Open Directory and its `/etc/passwd` holds system accounts only. Nothing here
 * depends on the lookup succeeding: a session name is used as itself, and the
 * database only supplies the home and confirms a uid.
 */
function readPasswd(): PasswdEntry[] {
  try {
    return parsePasswd(fs.readFileSync('/etc/passwd', 'utf8'))
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

/**
 * The home a row gives, falling back to the ambient one only when the row has none.
 *
 * They agree in the normal case. When they do not, the row is the one that is
 * actually that login's home — and the ambient one is the value that arrives as
 * root's under `sudo`.
 */
function accountFrom(row: PasswdEntry, ambientHome?: string): BootAccount {
  const home = row.home.length > 0 ? row.home : (ambientHome?.trim() || null)
  return { name: row.name, uid: row.uid, home, root: row.uid === 0, verified: true }
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
function ownerAccount(paths: readonly string[] | undefined, passwd: readonly PasswdEntry[]): BootAccount | null {
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
  /** The user database to resolve against; defaults to the real one. */
  passwd?: readonly PasswdEntry[]
  /** Where a refusal or a root-account fallback is said out loud. */
  warn?: (message: string) => void
}

/**
 * The account a boot entry must run as.
 *
 * `$USER` is right in the common case and wrong in exactly the case this exists
 * for: `sudo` and `pkexec` rewrite `USER`, `LOGNAME` and `HOME` to the *target*
 * account, so a panel started from a root shell or a root unit reads
 * `USER=root` — and so does `os.userInfo()`, which reports the euid.
 *
 * Two rules keep the answer usable, and both are about what systemd does with it:
 *
 * 1. **Prefer the database row for the uid over the name in the environment.**
 *    They agree in the normal case. When they do not, the row is the one that
 *    names a real login, and `User=<a name systemd cannot resolve>` is worse than
 *    no entry at all: systemd refuses to start it (`status=217/USER`) and
 *    `Restart=always` turns that into a crash-loop, which is exactly the
 *    unexplained failure this whole change exists to remove.
 * 2. **A uid this process has is the fact; `$UID` is a claim.** `$UID` is a shell
 *    variable rather than an exported one, so when it is present at all it was
 *    inherited, and it feeds the launchd domain (`gui/$UID`) as well as the owner
 *    lookups. It is consulted only when there is no uid to be had from the
 *    process itself.
 *
 * The order is therefore:
 *
 * 1. an elevating tool's `SUDO_UID`/`PKEXEC_UID` (an instruction, and the only
 *    place the invoking login survives) — but only while it resolves, so a stale
 *    value inherited from an ancestor cannot collapse the entry to root;
 * 2. this session's own login: its database row, else the row for this uid, else
 *    the name itself for a login the local database does not hold (macOS keeps
 *    accounts in Open Directory and its `/etc/passwd` has no user rows);
 * 3. the row for this uid;
 * 4. the owner of a state path — who the panel actually belongs to;
 * 5. and only then, honestly, root.
 *
 * A name that cannot be placed is reported with `verified: false`, so the writer
 * can warn instead of quietly installing a unit that will not start.
 */
export function accountOf(input: AccountInput): BootAccount | null {
  const passwd = input.passwd ?? readPasswd()
  const byUid = (uid: number | null): PasswdEntry | null => uid === null ? null : passwd.find(entry => entry.uid === uid) ?? null
  const byName = (name: string | null): PasswdEntry | null => name === null ? null : passwd.find(entry => entry.name === name) ?? null

  const elevatedUid = numberFrom(input.env.SUDO_UID) ?? numberFrom(input.env.PKEXEC_UID)
  const elevatedName = declaredName(input.env)
  if (elevatedUid !== null || elevatedName !== null) {
    const row = byUid(elevatedUid) ?? byName(elevatedName)
    if (row !== null)
      return accountFrom(row)
    // An elevating tool that named *both* a login and a nonzero uid has made an
    // explicit, consistent statement about an account the local database may not
    // hold — an LDAP or NIS login is a real account even though `/etc/passwd` has
    // no row for it. `$HOME` has already been rewritten to the target's, so it is
    // not this account's home and carrying `null` stops the entry inheriting it.
    if (elevatedUid !== null && elevatedUid !== 0 && elevatedName !== null)
      return { name: elevatedName, uid: elevatedUid, home: null, root: false, verified: false }
    // Anything less is not a statement about an account. Fall through rather than
    // let a stale `SUDO_UID` override a login this process can still name.
  }

  // This process's own uid. `$UID` is a claim and the process is the fact, so it
  // is only consulted when the platform gives no uid at all.
  const euid = input.uid === undefined ? (process.getuid?.() ?? null) : input.uid
  const ownUid = euid ?? numberFrom(input.env.UID)

  const session = sessionName(input.env)
  // systemd matches names case-sensitively, so `ROOT` is not root to it — but it is
  // also not a login, and writing it produces a 217/USER refusal.
  if (session !== null && session.toLowerCase() !== 'root') {
    const sessionRow = byName(session)
    if (sessionRow !== null)
      return accountFrom(sessionRow, input.env.HOME)
    // The name has no row. The uid's row is the better answer: it names a real
    // login, and a typo'd `$USER` would otherwise make `User=<typo>`.
    const uidRow = byUid(ownUid === 0 ? null : ownUid)
    if (uidRow !== null)
      return accountFrom(uidRow, input.env.HOME)
    return { name: session, uid: ownUid, home: input.env.HOME?.trim() || null, root: false, verified: false }
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
  if (ownUid === 0 || session?.toLowerCase() === 'root')
    return { name: 'root', uid: 0, home: input.env.HOME?.trim() || '/root', root: true, verified: true }
  return null
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
  return value !== null && value.toLowerCase() !== 'root' ? value : null
}

/**
 * A name a **system** entry may safely carry, or null.
 *
 * `User=root` is never a choice a panel made: root is the silent default of a root
 * process, and a unit that names it looks deliberate while it is the bug. So a
 * root account is refused here, loudly, and the caller omits the directive.
 *
 * A name that cannot be written is refused the same way. `User=`/`UserName` are
 * unquoted, so a name carrying a newline would end the field and let the rest of it
 * become another directive — and the environment this reads is one a caller can
 * set. No name is better than an injected one.
 */
export function bootUserName(ctx: AccountInput): string | null {
  const account = accountOf(ctx)
  if (account === null) {
    // No account is the same runtime outcome as root — the entry runs as root —
    // so it is refused just as loudly. The candidate reason says it too, but a
    // warning belongs at the point the decision is actually made.
    warnAccount(ctx, 'no account could be resolved for the entry, so a system unit would run the panel as root. Install it from the account that should own the panel, or set User= yourself.')
    return null
  }
  if (account.root) {
    warnAccount(ctx, 'the only account available is root; a system unit would run the panel as root. Install it from the account that should own the panel, or set User= yourself.')
    return null
  }
  if (!isUserName(account.name)) {
    warnAccount(ctx, `the account name ${JSON.stringify(account.name)} is not a usable user name, so no User= line was written`)
    return null
  }
  if (!account.verified) {
    // The name is writable but nothing here can place it: an LDAP or NIS login has
    // no `/etc/passwd` row, and a stale `$USER` names nobody at all. systemd cannot
    // resolve it either, and `User=<a name it cannot resolve>` makes the unit fail
    // with `status=217/USER` — which `Restart=always` turns into a crash-loop that
    // never mentions the account. Installing that is worse than installing nothing,
    // so the name is refused and the reason is said out loud; the page's install
    // button remains for anyone who knows the name is resolvable on that machine.
    warnAccount(ctx, `the account ${JSON.stringify(account.name)} could not be found in the user database, so no User= line was written: systemd would refuse to start the unit (status=217/USER). Set User= yourself if that account resolves through LDAP or NIS.`)
    return null
  }
  return account.name
}

/** The one definition of a writable account name; {@link assertUserName} enforces it in a payload. */
function isUserName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9._-]*$/.test(name)
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
