#!/usr/bin/env node
/** Validates the version a release workflow was dispatched with. */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const requested = (process.argv[2] ?? '').trim()
const { version: current } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

/**
 * The semver grammar, as the registry enforces it.
 *
 * `\d+` per component accepted `0.7.018`, which semver forbids (a numeric identifier may not
 * carry a leading zero) and npm rejects — so the typo passed this gate and would have failed
 * later *at the publishing step*, blaming changelogen or npm instead of the input. Verified
 * against the real `semver` library rather than from the specification: every case in
 * `test/release-version.test.ts` was checked with `semver.valid()`.
 *
 * Build metadata is refused deliberately: changelogen writes `package.json` from this string,
 * and `1.2.3+meta` is a version npm accepts but that no git tag round-trips.
 */
const CORE = '(?:0|[1-9]\\d*)'
const PRERELEASE = `(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)`
const VERSION = new RegExp(`^${CORE}\\.${CORE}\\.${CORE}(?:-${PRERELEASE}(?:\\.${PRERELEASE})*)?$`)

if (!VERSION.test(requested)) {
  console.error(`[release] "${requested}" is not a version — expected 1.2.3 or 1.2.3-rc.1`)
  process.exit(1)
}

/**
 * Semver precedence, matching the `semver` library.
 *
 * The prerelease tail was compared as a **string**, so `0.7.4-rc.10` sorted *below*
 * `0.7.4-rc.2` and a legitimate release was refused with "is not greater than the current".
 * Identifiers compare piece by piece, numerically where both are numeric — and a numeric
 * identifier sorts below an alphanumeric one.
 */
function compare(left, right) {
  const split = (value) => {
    const [core, pre = ''] = value.split('-', 2)
    return { parts: core.split('.').map(Number), pre: pre.length > 0 ? pre.split('.') : [] }
  }
  const a = split(left)
  const b = split(right)
  for (let index = 0; index < 3; index += 1) {
    if ((a.parts[index] ?? 0) !== (b.parts[index] ?? 0))
      return (a.parts[index] ?? 0) > (b.parts[index] ?? 0) ? 1 : -1
  }
  if (a.pre.length === 0 || b.pre.length === 0) {
    if (a.pre.length === b.pre.length)
      return 0
    return a.pre.length === 0 ? 1 : -1
  }
  for (let index = 0; index < Math.max(a.pre.length, b.pre.length); index += 1) {
    const one = a.pre[index]
    const two = b.pre[index]
    if (one === undefined)
      return -1
    if (two === undefined)
      return 1
    if (one === two)
      continue
    const oneNum = /^\d+$/.test(one) ? Number(one) : null
    const twoNum = /^\d+$/.test(two) ? Number(two) : null
    if (oneNum !== null && twoNum !== null)
      return oneNum < twoNum ? -1 : 1
    if (oneNum !== null)
      return -1
    if (twoNum !== null)
      return 1
    return one < two ? -1 : 1
  }
  return 0
}

if (compare(requested, current) <= 0) {
  console.error(`[release] "${requested}" is not greater than the current ${current}`)
  process.exit(1)
}

/**
 * Below 1.0 the *minor* is the breaking channel, so the channel has to agree with the
 * commits being shipped: a patch carrying a `!`/`BREAKING CHANGE` publishes a breaking
 * change as a fix, and a minor with none is the usual sign that a patch was meant.
 * Returns the subjects of the breaking commits since the last tag.
 */
function breakingCommits() {
  let range = 'HEAD'
  try {
    const lastTag = execFileSync('git', ['describe', '--tags', '--abbrev=0'], { cwd: root, encoding: 'utf8' }).trim()
    if (lastTag.length > 0)
      range = `${lastTag}..HEAD`
  }
  catch {
    // No tag yet: every commit counts as pending.
  }

  let log = ''
  try {
    log = execFileSync('git', ['log', range, '--format=%s%x00%b%x01'], { cwd: root, encoding: 'utf8' })
  }
  catch {
    return []
  }

  const subjects = []
  for (const entry of log.split('\x01')) {
    const [subject = '', body = ''] = entry.split('\x00')
    if (subject.trim().length === 0)
      continue
    if (/^[a-z]+(?:\([^)]*\))?!:/.test(subject) || /^BREAKING[ -]CHANGE:/m.test(body))
      subjects.push(subject.trim())
  }
  return subjects
}

const [requestedMajor, requestedMinor] = requested.split('-')[0].split('.').map(Number)
const [currentMajor, currentMinor] = current.split('-')[0].split('.').map(Number)
const breaking = breakingCommits()
const isPatch = requestedMajor === currentMajor && requestedMinor === currentMinor

if (isPatch && breaking.length > 0) {
  console.error(`[release] "${requested}" is a patch, but ${breaking.length} breaking commit(s) are pending:`)
  for (const subject of breaking)
    console.error(`[release]   ${subject}`)
  console.error('[release] below 1.0 the minor is the breaking channel — dispatch a 0.Y.0 release instead')
  process.exit(1)
}

if (!isPatch && requestedMajor === 0 && breaking.length === 0) {
  // Not an error: a 0.Y.0 is how a feature release with a compatibility note ships here.
  console.warn(`[release] "${requested}" is a minor and no commit carries a breaking marker; that is the feature channel — a patch is only for fixes`)
}

console.log(`[release] ${current} -> ${requested}`)
