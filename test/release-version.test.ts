/**
 * The release gate, which decides whether a version may be dispatched.
 *
 * It is the last check before an irreversible action — a tag, a GitHub release and an npm
 * publish — and it had **no coverage at all**. This drives the real script as a child process
 * and reads its **exit code**, because every decision it makes is an exit code; asserting on
 * its output would pass while the code stayed 0.
 *
 * The version expectations are not hand-written. Each case was checked with `semver.valid()`
 * from the real library, and the two deliberate deviations are named below with their reason.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = path.join(root, 'scripts', 'check-release-version.mjs')
const manifestPath = path.join(root, 'package.json')
const original = fs.readFileSync(manifestPath, 'utf8')

afterEach(() => {
  fs.writeFileSync(manifestPath, original)
})

/** Run the gate as the workflow does, and report its exit code and stderr. */
function gate(version: string): { code: number, stderr: string } {
  try {
    execFileSync('node', [script, version], { cwd: root, encoding: 'utf8', stdio: 'pipe' })
    return { code: 0, stderr: '' }
  }
  catch (error) {
    const failure = error as { status?: number, stderr?: string }
    return { code: failure.status ?? -1, stderr: failure.stderr ?? '' }
  }
}

/** Pretend a release candidate asked from a different current version. */
function atCurrent(version: string): void {
  const manifest = JSON.parse(original) as Record<string, unknown>
  manifest.version = version
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

describe('the release gate refuses a version npm would', () => {
  it('exists where the workflow calls it, so a move cannot silently stop guarding', () => {
    const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'release.yml'), 'utf8')
    expect(workflow).toContain('scripts/check-release-version.mjs')
    expect(fs.existsSync(script)).toBe(true)
  })

  /**
   * Every case below was checked against the real `semver` library. `\d+` per component —
   * what the gate used — accepts all three rejected forms, so the typo passed here and failed
   * later at the publishing step, naming changelogen or npm instead of the input.
   */
  it('rejects a numeric component with a leading zero, which semver forbids', () => {
    for (const version of ['0.7.018', '0.07.4', '00.7.4', '01.2.3', '1.02.3', '1.2.03', '0.7.4-rc.01']) {
      const { code, stderr } = gate(version)
      expect(code, `${version} must be refused`).toBe(1)
      // The refusal must name the input, not blame a later step.
      expect(stderr).toContain('is not a version')
      expect(stderr).toContain(version)
    }
  })

  it('accepts every well-formed version semver accepts', () => {
    // From a **prerelease** current, so a prerelease of it is genuinely greater — a version may
    // not carry a leading zero, so `-rc.1` cannot be replaced by a numeric identifier here.
    // From `alpha`, which sorts below `rc`: `alpha < rc` alphabetically, so every one of these
    // is genuinely greater. Each pair was checked with `semver.compare`.
    atCurrent('0.1.0-alpha.1.2')
    for (const version of ['0.2.0', '0.1.1', '0.1.0-rc.1', '0.1.0-rc.2', '0.1.0-rc.10', '0.1.0', '1.0.0']) {
      expect(gate(version).code, `${version} must be accepted`).toBe(0)
    }
  })

  it('treats a form semver accepts as greater exactly when it is', () => {
    // Checked with the real library: none of these outranks a plain `0.1.0`.
    atCurrent('0.1.0')
    for (const version of ['0.1.0-rc.1', '0.1.0-0', '0.1.0-0a', '0.1.0-alpha.1.2'])
      expect(gate(version).code, `${version} is below 0.1.0`).toBe(1)
  })

  it('rejects the empty string and a trailing separator', () => {
    for (const version of ['', ' ', '1.2.3-', '1.2.3.4', 'x']) {
      expect(gate(version).code, `${JSON.stringify(version)} must be refused`).toBe(1)
    }
  })

  /**
   * **Deliberate deviation from `semver.valid()`**, which accepts both: changelogen writes
   * `package.json` from this string, and build metadata is not something a git tag round-trips
   * — `v1.2.3+meta` is not the tag npm would expect. Refused here on purpose, and this test is
   * what stops that from looking like the leading-zero bug.
   */
  it('refuses build metadata on purpose, unlike semver itself', () => {
    for (const version of ['1.2.3+meta', '0.7.4-rc.1+b'])
      expect(gate(version).code, `${version} must be refused here`).toBe(1)
  })
})

describe('the release gate refuses a version that is not greater', () => {
  it('refuses the current version and anything below it', () => {
    atCurrent('0.7.4')
    expect(gate('0.7.4').code).toBe(1)
    expect(gate('0.7.3').code).toBe(1)
    expect(gate('0.6.9').code).toBe(1)
    expect(gate('0.7.5').code).toBe(0)
    expect(gate('0.8.0').code).toBe(0)
  })

  it('orders prereleases numerically, not as text', () => {
    // `rc.10` sorts BELOW `rc.2` as a string, which refused a legitimate release. Compared
    // piece by piece, a numeric identifier is numeric — so rc.10 is greater.
    atCurrent('0.7.4-rc.2')
    expect(gate('0.7.4-rc.10').code, 'rc.10 is greater than rc.2').toBe(0)
    expect(gate('0.7.4-rc.1').code, 'rc.1 is below rc.2').toBe(1)
    // And the release outranks its own prerelease.
    expect(gate('0.7.4').code).toBe(0)
  })
})
