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

/** A package-manager shim's real target, as the shim itself records it. */
const SHIM_TARGET = /^#\s*cmd-shim-target=(.+)$/m

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

/**
 * What a generated launcher does with the CLI it found.
 *
 * `spawnSync` alone is not enough: the boot entry's `KillMode=process` signals the
 * unit's main process — this launcher — and nothing else, so a signal must be handed
 * on or the panel is orphaned while the unit exits (and `Restart=always` then loops
 * on "already running"). Forwarding the signal and waiting for the child is what
 * makes the stop reach the panel; the exit code carries the child's outcome.
 */
const LAUNCH_CHILD = `function launchChild(program, argv, useShell) {
  const child = spawn(program, argv, { stdio: 'inherit', shell: useShell })
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGQUIT', 'SIGHUP'])
    process.on(signal, () => { try { child.kill(signal) } catch {} })
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
  child.on('error', (error) => {
    console.error('[dsh-home-hosted] could not start ' + program + ': ' + error.message)
    process.exit(1)
  })
}`

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
import { spawn } from 'node:child_process'

const DSH_HOME = ${JSON.stringify(options.dshHome)}
const RECORD = ${JSON.stringify(record)}
const MIN_VERSION = ${JSON.stringify(options.minVersion)}
const PLUGIN_ROOT = ${JSON.stringify(options.pluginRoot ?? null)}

${LAUNCH_CHILD}

/** A package-manager shim's real target, as the shim itself records it. */
const SHIM_TARGET = /^#\\s*cmd-shim-target=(.+)$/m

function readRecord() {
  try { return JSON.parse(fs.readFileSync(RECORD, 'utf8')) } catch { return null }
}

/**
 * The version of the package a CLI entry belongs to, following a package-manager
 * shim to the file it actually runs.
 *
 * A pnpm/npm shim is a shell script whose 'cmd-shim-target' comment names the real
 * entry — and it lives *inside* the plugin's own package, so walking up from the
 * shim reads this plugin's package.json and reports the plugin's version for the
 * CLI. That is not cosmetic: 'choose' sorts by version, so the plugin's own number
 * let a PATH fallback outrank the recorded pinned copy and boot a different
 * home-hosted than this plugin shipped.
 */
function versionOf(entry) {
  let target = entry
  try {
    if (fs.statSync(entry).isFile()) {
      const shimTarget = SHIM_TARGET.exec(fs.readFileSync(entry, 'utf8'))?.[1]?.trim()
      if (shimTarget !== undefined && shimTarget.length > 0) target = shimTarget
    }
  } catch {}
  let dir = path.dirname(target)
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

function collect(out, entry, tier) {
  if (typeof entry === 'string' && entry.length > 0 && fs.existsSync(entry)) out.push({ entry, tier })
}

function collectRoot(root, out, tier) {
  collect(out, path.join(root, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'), tier)
  const store = path.join(root, 'node_modules', '.pnpm')
  let names = []
  try { names = fs.readdirSync(store) } catch { return }
  for (const name of names) {
    if (name.startsWith('home-hosted@') || name.startsWith('dsh-home-hosted@'))
      collect(out, path.join(store, name, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'), tier)
  }
}

/**
 * Where a copy can come from, best first. A plain version sort let a copy of the
 * plugin's own version — read from the package-manager shim, or an unrelated
 * global install — outrank the copy the plugin actually pinned. A recorded pin is
 * an instruction; PATH is a hope.
 */
const TIER_RECORD = 0
const TIER_LOCAL = 1
const TIER_PATH = 2

function candidates() {
  const out = []
  const record = readRecord()
  if (record && typeof record.entry === 'string') collect(out, record.entry, TIER_RECORD)
  if (PLUGIN_ROOT !== null) collectRoot(PLUGIN_ROOT, out, TIER_LOCAL)
  try {
    for (const name of fs.readdirSync(path.join(DSH_HOME, 'profiles')))
      collectRoot(path.join(DSH_HOME, 'profiles', name), out, TIER_LOCAL)
  } catch {}
  collectRoot(path.join(DSH_HOME), out, TIER_LOCAL)
  // Last resort: a global install on the entry's own PATH.
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    if (dir.length === 0) continue
    collect(out, path.join(dir, 'home-hosted'), TIER_PATH)
    collect(out, path.join(dir, 'home-hosted.cmd'), TIER_PATH)
  }
  return out
}

/** The best copy within a tier: the highest version, first-found when equal. */
function bestOfTier(items) {
  const known = items.filter(item => item.version !== null)
  const pool = known.length === 0 ? items : known
  return [...pool].sort((a, b) => compare(b.version ?? '0.0.0', a.version ?? '0.0.0'))[0] ?? null
}

function choose() {
  const found = candidates().map(item => ({ ...item, version: versionOf(item.entry) }))
  const supported = found.filter(item => item.version !== null && compare(item.version, MIN_VERSION) >= 0)
  for (const tier of [TIER_RECORD, TIER_LOCAL, TIER_PATH]) {
    const best = bestOfTier(supported.filter(item => item.tier === tier))
    if (best !== null) return best.entry
  }
  // Nothing supported: a too-old copy still beats no panel at all.
  for (const tier of [TIER_RECORD, TIER_LOCAL, TIER_PATH]) {
    const best = bestOfTier(found.filter(item => item.tier === tier))
    if (best !== null) return best.entry
  }
  return null
}

const entry = choose()
if (entry === null) {
  console.error('[dsh-home-hosted] no home-hosted CLI found (looked in ' + DSH_HOME + ' and PATH). Reinstall the plugin with its dependencies, or set homeHostedCommand in the plugin row.')
  process.exit(1)
}

const args = process.argv.slice(2)
const isScript = /\\.(mjs|cjs|js)$/.test(entry)
if (isScript)
  launchChild(process.execPath, [entry, ...args], false)
else
  launchChild(entry, args, process.platform === 'win32' && /\\.(cmd|bat)$/i.test(entry))
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

/**
 * Run the launcher the way the boot entry will, and read the version it answers.
 *
 * `env` is only for tests that have to describe the PATH the entry would see; a
 * boot entry inherits a login PATH, never the one this process happens to have.
 */
export async function preflightLauncher(stateDir: string, timeoutMs = 10_000, env?: Record<string, string | undefined>): Promise<string | null> {
  const file = launcherPath(stateDir)
  if (!fs.existsSync(file))
    return null
  const result = process.platform === 'win32'
    ? await run(process.execPath, [file, '--version'], { timeoutMs, ...(env === undefined ? {} : { env }) })
    : await run(file, ['--version'], { timeoutMs, ...(env === undefined ? {} : { env }) })
  return parseVersion(result.stdout) ?? parseVersion(result.stderr)
}

/**
 * The file a package-manager shim actually runs, or null when `entry` is a real
 * entry rather than a shim. Read for the same reason the generated launcher reads
 * it: the shim sits inside the plugin's own package.
 */
function shimTargetOf(entry: string): string | null {
  try {
    if (!fs.statSync(entry).isFile())
      return null
    const target = SHIM_TARGET.exec(fs.readFileSync(entry, 'utf8'))?.[1]?.trim()
    return target !== undefined && target.length > 0 ? target : null
  }
  catch {
    return null
  }
}

/** The version a CLI entry belongs to, following a shim to what it really runs. */
export function versionOfEntry(entry: string): string | null {
  let target = entry
  const shimTarget = shimTargetOf(entry)
  if (shimTarget !== null) target = shimTarget
  let dir = path.dirname(target)
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

// ---------------------------------------------------------------------------
// The running harness's own launcher
// ---------------------------------------------------------------------------

export interface DshLauncherOptions {
  stateDir: string
  dshHome: string
  /** Where the dsh entry is right now; recorded as the fast path. */
  resolvedEntry: string | null
  /**
   * The image this plugin was installed on: the dsh a boot entry must keep
   * running. Recorded and checked before anything else, so a copy that merely
   * reports a higher version never wins the boot.
   */
  pinnedEntry?: string | null
  /**
   * Adopt `pinnedEntry` even when the record already pins something else. Set
   * only where the caller *is* the running image; a process booted through the
   * launcher must carry the pin it started under instead of replacing it.
   */
  repin?: boolean
  /** The extension the launcher must match: a `.cjs` entry gets a `.cjs` launcher. */
  entryExtension?: string | null
  /**
   * Install roots that are neither the harness home nor PATH — a clone, or a
   * project whose own `node_modules` carries dsh. Recorded and searched, so a
   * moved build is re-found on the next boot.
   */
  searchRoots?: string[] | null
}

export interface DshLauncherWrite {
  path: string
  changed: boolean
}

export interface DshLauncherRecord {
  entry: string | null
  /**
   * The running image, while it still exists. A path here is an instruction:
   * `choose()` runs this one and never sorts it against another copy.
   */
  pinned?: string | null
  /** When that image was last confirmed. */
  pinnedAt?: number | null
  /** Where that entry's install sat, kept across rewrites while it stays valid. */
  roots: string[]
  writtenAt: number
}

/** The recorded entry a boot entry baked in, for the launcher's fast path. */
export function dshLauncherRecordPath(stateDir: string): string {
  return path.join(launcherDir(stateDir), 'dsh-resolved.json')
}

/** `bin/dsh.mjs`, or `bin/dsh.cjs` when the recorded entry is CommonJS. */
export function dshLauncherPath(stateDir: string, entryExtension?: string | null): string {
  const extension = (entryExtension ?? '').toLowerCase() === '.cjs' ? '.cjs' : '.mjs'
  return path.join(launcherDir(stateDir), `dsh${extension}`)
}

export function readDshLauncherRecord(stateDir: string): DshLauncherRecord | null {
  return readJson<DshLauncherRecord>(dshLauncherRecordPath(stateDir))
}

/**
 * The dsh launcher's source.
 *
 * Like the home-hosted launcher, this exists because a clone's build output path
 * (or a versioned pnpm path) moves on the next install/rebuild: the boot entry
 * points at this stable script and the script re-finds dsh at every boot. A
 * `.cjs` entry gets a CommonJS launcher, so node loads it as one.
 */
export function buildDshLauncherSource(options: DshLauncherOptions): string {
  const esm = (options.entryExtension ?? '').toLowerCase() !== '.cjs'
  const prelude = esm
    ? `import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'`
    : `const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')
const { spawn } = require('node:child_process')`
  // A clone or a project install is re-found from the install roots that were
  // recorded with it, so a moved build needs no new boot entry.
  const searchRoots = [
    options.resolvedEntry === null ? null : dshSearchRoot(options.resolvedEntry),
    options.pinnedEntry === null || options.pinnedEntry === undefined ? null : dshSearchRoot(options.pinnedEntry),
    ...(options.searchRoots ?? []),
  ].filter((root): root is string => typeof root === 'string' && root.length > 0)

  return `#!/usr/bin/env node
// managed by dsh-home-hosted — rewritten on every plugin start; do not edit.
${prelude}

const DSH_HOME = ${JSON.stringify(options.dshHome)}
const RECORD = ${JSON.stringify(dshLauncherRecordPath(options.stateDir))}
const SEARCH_ROOTS = ${JSON.stringify([...new Set(searchRoots)])}
// The image this plugin was installed on, when the record had one to carry.
const PINNED = ${JSON.stringify(options.pinnedEntry ?? null)}

${LAUNCH_CHILD}

function readRecord() {
  try { return JSON.parse(fs.readFileSync(RECORD, 'utf8')) } catch { return null }
}

function isFile(file) {
  let stat = null
  try { stat = fs.statSync(file) } catch { return false }
  return stat.isFile()
}

// One identity per file: a recorded path and a candidate reached through a
// symlink must compare equal, or a macOS clone would look like a different copy.
function canon(file) {
  try { return fs.realpathSync(file) } catch { return file }
}

// Keep what can actually boot: a JavaScript entry, or a shim whose recorded
// target is one. A bare shim found on PATH is not a script, so requiring the
// extension would silently drop the last resort.
//
// Each candidate carries how it was found, which is what ordering uses:
//   TIER_REAL   a dsh by construction (a manifest, or node_modules/dsh)
//   TIER_PROBE  a root that merely offers a build file — any package may
//   TIER_PATH   a dsh executable found on PATH
const TIER_REAL = 2
const TIER_PROBE = 1
const TIER_PATH = 0

function collect(out, entry, source, tier) {
  const argument = typeof source === 'string' && source.length > 0 ? source : entry
  const file = typeof entry === 'string' && isFile(entry) ? canon(entry) : null
  if (file !== null && /\\.(?:mjs|cjs|js)$/.test(file)) {
    if (!out.has(file) || (out.get(file) ?? 0) < tier) out.set(file, tier)
    return
  }
  // Anything else is a shim: only its recorded target can boot, and a shim
  // without one is not a candidate at all (never a second pass over itself).
  if (typeof argument !== 'string' || !isFile(argument)) return
  let text = ''
  try { text = fs.readFileSync(argument, 'utf8') } catch { return }
  const marker = 'cmd-shim-target='
  const at = text.indexOf(marker)
  if (at === -1) return
  const target = text.slice(at + marker.length).split('\\n')[0].trim()
  if (target.length === 0) return
  const real = canon(target)
  if (!/\\.(?:mjs|cjs|js)$/.test(real)) return
  if (!out.has(real) || (out.get(real) ?? 0) < tier) out.set(real, tier)
}

function collectStore(root, out) {
  const store = path.join(root, 'node_modules', '.pnpm')
  let names = []
  try { names = fs.readdirSync(store) } catch { return }
  for (const name of names) {
    if (!name.startsWith('dsh@') && !name.startsWith('@deepseek-ai+dsh@')) continue
    collect(out, path.join(store, name, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), null, TIER_REAL)
    collect(out, path.join(store, name, 'node_modules', 'dsh', 'bin', 'dsh.js'), null, TIER_REAL)
  }
}

function collectRoot(root, out) {
  collect(out, path.join(root, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), null, TIER_REAL)
  collect(out, path.join(root, 'node_modules', 'dsh', 'bin', 'dsh.js'), null, TIER_REAL)
  collectStore(root, out)
  // A clone keeps its build output at its own root, not under node_modules.
  for (const entry of ['lib/bin.js', 'lib/bin.mjs', 'lib/bin.cjs', 'dist/bin.js'])
    collect(out, path.join(root, entry), null, TIER_PROBE)
}

function candidates(skipPath) {
  const out = new Map()
  const record = readRecord()
  if (record && typeof record.entry === 'string') collect(out, record.entry, record.entry, TIER_REAL)
  for (const root of [...(Array.isArray(record?.roots) ? record.roots : []), ...SEARCH_ROOTS]) collectRoot(root, out)
  collectRoot(DSH_HOME, out)
  let profiles = []
  try { profiles = fs.readdirSync(path.join(DSH_HOME, 'profiles')) } catch {}
  for (const name of profiles) collectRoot(path.join(DSH_HOME, 'profiles', name), out)
  // Last resort: a dsh on the entry's own PATH. It is no longer an equal
  // candidate: a copy found there is only booted when nothing else answers.
  if (skipPath) return out
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const shim = path.join(dir, 'dsh')
    collect(out, shim, shim, TIER_PATH)
    collect(out, path.join(dir, 'dsh.cmd'), path.join(dir, 'dsh.cmd'), TIER_PATH)
  }
  return out
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

function findPin(pin, found) {
  if (typeof pin !== 'string' || pin.length === 0) return null
  const real = canon(pin)
  return found.find(item => item.entry === real)?.entry ?? null
}

// A root that only offers a build file (lib/bin.js) is a guess: any package may
// have one. Those stay usable but never outrank a copy that is dsh by
// construction, or a dsh executable from PATH below them.
function bestOfTier(found, tier) {
  const at = found.filter(item => item.tier >= tier)
  const known = at.filter(item => item.version !== null)
  if (known.length > 0) {
    known.sort((a, b) => compare(b.version, a.version))
    return known[0].entry
  }
  return at[0]?.entry ?? null
}

// Choose the image this plugin was installed on, and only then fall back to a
// version sort: a higher version elsewhere is not an invitation to boot it.
function choose() {
  const record = readRecord()
  const pin = typeof record?.pinned === 'string' && record.pinned.length > 0 ? record.pinned : PINNED
  const found = [...candidates(true)].map(([entry, tier]) => ({ entry, tier, version: versionOf(entry) }))
  const pinned = findPin(pin, found)
  if (pinned !== null) return pinned
  // Real dsh installs first; a bare build-file guess only when nothing else
  // exists; PATH only when nothing local answered at all.
  return bestOfTier(found, TIER_REAL)
    ?? bestOfTier(found, TIER_PROBE)
    ?? bestOfTier([...candidates(false)].map(([entry, tier]) => ({ entry, tier, version: versionOf(entry) })), TIER_PATH)
}

const entry = choose()
if (entry === null) {
  console.error('[dsh-home-hosted] no dsh entry found for ' + DSH_HOME + ' (pinned path, recorded path, $DSH_HOME node_modules, profiles/*, PATH). Reinstall dsh, or restart: dsh web')
  process.exit(1)
}

const args = process.argv.slice(2)
if (/\\.(mjs|cjs|js)$/.test(entry))
  launchChild(process.execPath, [entry, ...args], false)
else
  launchChild(entry, args, process.platform === 'win32' && /\\.(cmd|bat)$/i.test(entry))
`
}

/** Write the launcher and record what `resolveDshLaunch` found. */
export function writeDshLauncher(options: DshLauncherOptions): DshLauncherWrite {
  const file = dshLauncherPath(options.stateDir, options.entryExtension)
  const previousRecord = readDshLauncherRecord(options.stateDir)
  // A pin is carried, never guessed. A caller that *is* the running image may
  // adopt a new one; everyone else keeps the existing pin while its file is
  // still a dsh entry. That is what stops a process booted through this
  // launcher from re-recording a weaker answer (its own `argv[1]` is the
  // launcher, so it resolves nothing local).
  const recordedPin = existingEntry(previousRecord?.pinned)
  const offered = existingEntry(options.pinnedEntry)
  const pinned = options.repin === true ? offered ?? recordedPin : recordedPin ?? offered
  const source = buildDshLauncherSource({
    ...options,
    pinnedEntry: pinned === null ? options.pinnedEntry ?? null : pinned,
  })
  const changed = (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null) !== source
  if (changed) {
    writeFileAtomic(file, source, 0o755)
    fs.chmodSync(file, 0o755)
  }
  // Roots are kept while they still look like a dsh install: they are what lets
  // a later boot re-find dsh after this install has moved. The pinned image's
  // own root is kept too, or a rewrite (a process booted through this launcher
  // resolves nothing local) would drop the pin's only candidate.
  const raw = [dshSearchRoot(options.resolvedEntry), dshSearchRoot(pinned), ...(options.searchRoots ?? []), ...(previousRecord?.roots ?? [])]
  const known = raw.filter((root): root is string => typeof root === 'string' && root.length > 0 && dshRootUsable(root))
  const roots = [...new Set(known)]
  writeJsonAtomic(dshLauncherRecordPath(options.stateDir), {
    entry: options.resolvedEntry,
    pinned,
    pinnedAt: pinned === null
      ? null
      : pinned === recordedPin ? previousRecord?.pinnedAt ?? Date.now() : Date.now(),
    roots,
    writtenAt: Date.now(),
  } satisfies DshLauncherRecord, 0o600)
  return { path: file, changed }
}

/** The canonical path of a file that is still there, or null. */
function existingEntry(file: string | null | undefined): string | null {
  if (typeof file !== 'string' || file.length === 0)
    return null
  if (!fs.existsSync(file))
    return null
  try {
    return fs.realpathSync(file)
  }
  catch {
    return null
  }
}

/** A dsh entry under one root: a flat install, or either pnpm store layout. */
export function dshCandidatesUnder(root: string): string[] {
  const out: string[] = []
  for (const entry of [
    path.join(root, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    path.join(root, 'node_modules', 'dsh', 'bin', 'dsh.js'),
  ]) {
    if (fs.existsSync(entry))
      out.push(entry)
  }
  const store = path.join(root, 'node_modules', '.pnpm')
  if (fs.existsSync(store)) {
    for (const name of fs.readdirSync(store)) {
      if (!name.startsWith('dsh@') && !name.startsWith('@deepseek-ai+dsh@'))
        continue
      for (const entry of [
        path.join(store, name, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
        path.join(store, name, 'node_modules', 'dsh', 'bin', 'dsh.js'),
      ]) {
        if (fs.existsSync(entry))
          out.push(entry)
      }
    }
  }
  return out
}

/**
 * The install root a dsh entry belongs to: the directory whose `node_modules`
 * carries it — a clone root, or the project that installed dsh. That root is
 * what a rebuilt or upgraded install keeps.
 */
export function dshSearchRoot(entry: string | null | undefined): string | null {
  if (typeof entry !== 'string' || entry.length === 0)
    return null
  const parts = entry.split(path.sep)
  // A pnpm store path nests a second node_modules: the real root is the one
  // above `node_modules/.pnpm`, never the store's own package directory.
  const store = parts.lastIndexOf('.pnpm')
  const modules = parts.lastIndexOf('node_modules')
  const root = store > 0 ? parts.lastIndexOf('node_modules', store) : modules
  if (root > 0)
    return parts.slice(0, root).join(path.sep)
  // No node_modules anywhere: a source checkout whose build sits at its own
  // root. Derive it the way the runtime does — the manifest that owns the
  // entry, else the parent of the build directory — or the two would disagree
  // about which install a remembered path belongs to.
  return ownerRoot(entry) ?? (parts.length > 2 ? parts.slice(0, -2).join(path.sep) : null)
}

/** The nearest ancestor whose manifest declares this entry as its bin. */
function ownerRoot(entry: string): string | null {
  let dir = path.dirname(entry)
  for (let hop = 0; hop < 4; hop += 1) {
    const manifestPath = path.join(dir, 'package.json')
    const manifest = readJson<{ bin?: string | Record<string, string> }>(manifestPath)
    if (manifest !== null) {
      const declared = typeof manifest.bin === 'string'
        ? manifest.bin
        : manifest.bin?.['dsh'] ?? Object.values(manifest.bin ?? {})[0]
      if (typeof declared === 'string' && path.resolve(path.dirname(manifestPath), declared) === entry)
        return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir)
      break
    dir = parent
  }
  return null
}

/** Whether a root still holds a dsh install, or the store one could land in. */
function dshRootUsable(root: string): boolean {
  return dshCandidatesUnder(root).length > 0
    || fs.existsSync(path.join(root, 'node_modules', '.pnpm'))
    // A clone's build output sits at its own root, not under node_modules.
    || ['lib/bin.js', 'lib/bin.mjs', 'lib/bin.cjs', 'dist/bin.js'].some(entry => fs.existsSync(path.join(root, entry)))
}

