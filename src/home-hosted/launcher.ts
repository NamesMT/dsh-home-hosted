/**
 * A stable launcher for the pinned CLI.
 *
 * A dependency resolves to a pnpm path that carries the version and the peer
 * hash (`…/.pnpm/home-hosted@0.6.1_zod@4.6.5/node_modules/home-hosted/…`), which
 * moves on the next install and disappears when the profile is rebuilt. A boot
 * entry that baked that path in would fail at exactly the moment it exists for.
 *
 * So the plugin generates one small script in its own state directory and points
 * the boot entry at *that*. At boot the launcher finds the pinned copy again
 * (recorded path → profile node_modules, flat or pnpm) and falls back to PATH,
 * which is why the entry survives plugin upgrades and profile reinstalls.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { run } from '../util/exec.js'
import { readJson, writeFileAtomic, writeJsonAtomic } from '../util/fsx.js'
import { compareVersions, parseVersion } from './resolve.js'

export interface LauncherOptions {
  stateDir: string
  dshHome: string
  /** Where the pinned copy is right now; recorded as the fast path. */
  resolvedEntry: string | null
  /** The pinned copy's version, recorded for diagnostics. */
  resolvedVersion?: string | null
  /** The plugin's own package root, as a search hint. */
  pluginRoot?: string | null
  minVersion: string
  marker?: string
}

export interface LauncherWrite {
  path: string
  changed: boolean
}

interface LauncherRecord {
  entry: string | null
  version: string | null
  pluginRoot: string | null
  writtenAt: number
}

export function launcherDir(stateDir: string): string {
  return path.join(stateDir, 'bin')
}

export function launcherPath(stateDir: string): string {
  return path.join(launcherDir(stateDir), 'home-hosted.mjs')
}

export function launcherRecordPath(stateDir: string): string {
  return path.join(launcherDir(stateDir), 'resolved.json')
}

export function readLauncherRecord(stateDir: string): LauncherRecord | null {
  return readJson<LauncherRecord>(launcherRecordPath(stateDir))
}

/** The generated script's source; exported so a test can inspect it. */
export function buildLauncherSource(options: LauncherOptions): string {
  const marker = options.marker ?? 'managed by dsh-home-hosted'
  const record = launcherRecordPath(options.stateDir)
  return `#!/usr/bin/env node
// ${marker} — rewritten on every plugin start; do not edit.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const DSH_HOME = ${JSON.stringify(options.dshHome)}
const RECORD = ${JSON.stringify(record)}
const MIN_VERSION = ${JSON.stringify(options.minVersion)}
const PLUGIN_ROOT = ${JSON.stringify(options.pluginRoot ?? null)}

function readRecord() {
  try { return JSON.parse(fs.readFileSync(RECORD, 'utf8')) } catch { return null }
}

function versionOf(entry) {
  let dir = path.dirname(entry)
  for (let hop = 0; hop < 4; hop += 1) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
      if (typeof manifest.version === 'string') return manifest.version
    } catch {}
    dir = path.dirname(dir)
  }
  return null
}

function compare(a, b) {
  const split = value => {
    const [core, pre = null] = String(value).split('-', 2)
    return { parts: core.split('.').map(part => Number.parseInt(part, 10) || 0), pre }
  }
  const left = split(a); const right = split(b)
  for (let i = 0; i < 3; i += 1) {
    const diff = (left.parts[i] ?? 0) - (right.parts[i] ?? 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  if (left.pre === right.pre) return 0
  if (left.pre === null) return 1
  if (right.pre === null) return -1
  return left.pre < right.pre ? -1 : 1
}

function collect(out, entry) {
  if (typeof entry === 'string' && entry.length > 0 && fs.existsSync(entry)) out.push(entry)
}

function collectRoot(root, out) {
  collect(out, path.join(root, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'))
  const store = path.join(root, 'node_modules', '.pnpm')
  let names = []
  try { names = fs.readdirSync(store) } catch { return }
  for (const name of names) {
    if (name.startsWith('home-hosted@') || name.startsWith('dsh-home-hosted@'))
      collect(out, path.join(store, name, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'))
  }
}

function candidates() {
  const out = []
  const record = readRecord()
  if (record && typeof record.entry === 'string') collect(out, record.entry)
  if (PLUGIN_ROOT !== null) collectRoot(PLUGIN_ROOT, out)
  try {
    for (const name of fs.readdirSync(path.join(DSH_HOME, 'profiles')))
      collectRoot(path.join(DSH_HOME, 'profiles', name), out)
  } catch {}
  collectRoot(path.join(DSH_HOME), out)
  // Last resort: a global install on the entry's own PATH.
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    if (dir.length === 0) continue
    collect(out, path.join(dir, 'home-hosted'))
    collect(out, path.join(dir, 'home-hosted.cmd'))
  }
  return out
}

function choose() {
  const found = candidates().map(entry => ({ entry, version: versionOf(entry) }))
  const supported = found.filter(item => item.version !== null && compare(item.version, MIN_VERSION) >= 0)
  supported.sort((a, b) => compare(b.version, a.version))
  return (supported[0] ?? found[0] ?? null)?.entry ?? null
}

const entry = choose()
if (entry === null) {
  console.error('[dsh-home-hosted] no home-hosted CLI found (looked in ' + DSH_HOME + ' and PATH). Reinstall the plugin with its dependencies, or set homeHostedCommand in the plugin row.')
  process.exit(1)
}

const args = process.argv.slice(2)
const isScript = /\\.(mjs|cjs|js)$/.test(entry)
const result = isScript
  ? spawnSync(process.execPath, [entry, ...args], { stdio: 'inherit' })
  : spawnSync(entry, args, { stdio: 'inherit', shell: process.platform === 'win32' && /\\.(cmd|bat)$/i.test(entry) })
process.exit(typeof result.status === 'number' ? result.status : 1)
`
}

export function writeLauncher(options: LauncherOptions): LauncherWrite {
  const file = launcherPath(options.stateDir)
  const source = buildLauncherSource(options)
  const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
  const changed = previous !== source
  if (changed) {
    writeFileAtomic(file, source, 0o755)
    fs.chmodSync(file, 0o755)
  }
  writeJsonAtomic(launcherRecordPath(options.stateDir), {
    entry: options.resolvedEntry,
    version: options.resolvedVersion ?? null,
    pluginRoot: options.pluginRoot ?? null,
    writtenAt: Date.now(),
  } satisfies LauncherRecord, 0o600)
  return { path: file, changed }
}

/** Run the launcher the way the boot entry will, and read the version it answers. */
export async function preflightLauncher(stateDir: string, timeoutMs = 10_000): Promise<string | null> {
  const file = launcherPath(stateDir)
  if (!fs.existsSync(file))
    return null
  const result = process.platform === 'win32'
    ? await run(process.execPath, [file, '--version'], { timeoutMs })
    : await run(file, ['--version'], { timeoutMs })
  return parseVersion(result.stdout) ?? parseVersion(result.stderr)
}

/** The version a CLI entry belongs to, read from the nearest package.json. */
export function versionOfEntry(entry: string): string | null {
  let dir = path.dirname(entry)
  for (let hop = 0; hop < 4; hop += 1) {
    const manifest = readJson<{ version?: string }>(path.join(dir, 'package.json'))
    if (typeof manifest?.version === 'string')
      return manifest.version
    dir = path.dirname(dir)
  }
  return null
}

/** Candidate entries under one root: a flat install, or a pnpm store. */
export function candidatesUnder(root: string): string[] {
  const out: string[] = []
  const direct = path.join(root, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs')
  if (fs.existsSync(direct))
    out.push(direct)
  const store = path.join(root, 'node_modules', '.pnpm')
  if (fs.existsSync(store)) {
    for (const name of fs.readdirSync(store)) {
      if (!name.startsWith('home-hosted@') && !name.startsWith('dsh-home-hosted@'))
        continue
      const entry = path.join(store, name, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs')
      if (fs.existsSync(entry))
        out.push(entry)
    }
  }
  return out
}

/** Highest satisfying candidate among explicit roots; exported for tests. */
export function findCandidate(roots: string[], minVersion: string): string | null {
  const found = roots.flatMap(root => candidatesUnder(root).map(entry => ({ entry, version: versionOfEntry(entry) })))
  const supported = found.filter(item => item.version !== null && compareVersions(item.version, minVersion) >= 0)
  supported.sort((a, b) => compareVersions(b.version ?? '0.0.0', a.version ?? '0.0.0'))
  return (supported[0] ?? found[0] ?? null)?.entry ?? null
}
