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
import type { BootActionResult, BootProviderContext } from './types.js'

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

export function currentUser(ctx: BootProviderContext): string | null {
  const value = ctx.env.USER?.trim() || ctx.env.LOGNAME?.trim() || ctx.env.USERNAME?.trim()
  if (value)
    return value
  try {
    return os.userInfo().username
  }
  catch {
    return null
  }
}

/** The invoking user's name, so a root-level entry can drop to it. */
export function userNameOf(ctx: BootProviderContext): string | null {
  const configured = ctx.env.USER?.trim() ?? ctx.env.USERNAME?.trim()
  if (configured !== undefined && configured.length > 0)
    return configured
  try {
    return os.userInfo().username
  }
  catch {
    return null
  }
}

export function uidOf(ctx: BootProviderContext): string | null {
  const configured = ctx.env.UID?.trim()
  if (configured)
    return configured
  const uid = process.getuid?.()
  return uid === undefined ? null : String(uid)
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
