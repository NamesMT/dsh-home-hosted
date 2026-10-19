/**
 * The release gate: the last check before a tag, a GitHub release and an npm publish. It drives
 * the real script as a child process and reads its **exit code**, because every decision it makes
 * is an exit code.
 *
 * Every case runs in a scratch repo, because the gate reads two inputs — `package.json` *and* the
 * pending commits in git history. An earlier version of this file rewrote only the manifest, so
 * its expectations silently depended on the checkout: it passed on CI's shallow clone (no history,
 * no pending breaking commit) and failed on the release workflow's `fetch-depth: 0` clone, where
 * this repo's own `!` commits were pending and the gate refused every patch.
 *
 * The version expectations were checked against the real `semver` library, and the two deliberate
 * deviations are named below with their reason.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = path.join(repoRoot, 'scripts', 'check-release-version.mjs')

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

function git(dir: string, args: string[]): void {
  execFileSync('git', ['-c', 'user.email=test@example.com', '-c', 'user.name=test', ...args], { cwd: dir, stdio: 'pipe' })
}

interface GateRepo {
  /** Move the version *and* the tag: the gate reads both, so they have to agree. */
  atCurrent: (version: string) => void
  /** Land a commit after the tag, so it counts as pending. */
  commit: (subject: string, body?: string) => void
  gate: (version: string) => { code: number, stderr: string }
}

/** A scratch repo holding the real gate script, at `current`, with nothing pending. */
function repo(current = '0.7.7'): GateRepo {
  // A test may build more than one fixture, so drop the previous rather than leak it.
  scratch?.cleanup()
  scratch = tempDir()
  const dir = scratch.path
  const gateScript = path.join(dir, 'scripts', 'check-release-version.mjs')
  fs.mkdirSync(path.dirname(gateScript), { recursive: true })
  fs.copyFileSync(script, gateScript)
  // The script resolves its root from its own path, so its `package.json` is this one.
  const writeVersion = (version: string): void =>
    writeJsonFile(path.join(dir, 'package.json'), { name: 'release-gate-fixture', version })

  writeVersion(current)
  git(dir, ['init', '-q'])
  git(dir, ['add', '-A'])
  git(dir, ['commit', '-q', '-m', 'chore: fixture'])
  git(dir, ['tag', `v${current}`])
  let tag = `v${current}`

  return {
    atCurrent: (version) => {
      writeVersion(version)
      // One tag only: a stale one left behind would join the range the gate inspects.
      git(dir, ['tag', '-d', tag])
      tag = `v${version}`
      git(dir, ['tag', tag])
    },
    commit: (subject, body) => {
      git(dir, ['commit', '-q', '--allow-empty', '-m', subject, ...(body === undefined ? [] : ['-m', body])])
    },
    gate: (version) => {
      // `spawnSync`, not `execFileSync`: a successful run still writes its warning to stderr,
      // and the throwing shape only hands back stderr on failure.
      const result = spawnSync('node', [gateScript, version], { cwd: dir, encoding: 'utf8' })
      return { code: result.status ?? -1, stderr: result.stderr ?? '' }
    },
  }
}

describe('the release gate refuses a version npm would', () => {
  it('exists where the workflow calls it, so a move cannot silently stop guarding', () => {
    const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8')
    expect(workflow).toContain('scripts/check-release-version.mjs')
    expect(fs.existsSync(script)).toBe(true)
  })

  /**
   * Every case below was checked against the real `semver` library. `\d+` per component —
   * what the gate used — accepts all three rejected forms, so the typo passed here and failed
   * later at the publishing step, naming changelogen or npm instead of the input.
   */
  it('rejects a numeric component with a leading zero, which semver forbids', () => {
    const { gate } = repo()
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
    const fixture = repo()
    fixture.atCurrent('0.1.0-alpha.1.2')
    for (const version of ['0.2.0', '0.1.1', '0.1.0-rc.1', '0.1.0-rc.2', '0.1.0-rc.10', '0.1.0', '1.0.0']) {
      expect(fixture.gate(version).code, `${version} must be accepted`).toBe(0)
    }
  })

  it('treats a form semver accepts as greater exactly when it is', () => {
    // Checked with the real library: none of these outranks a plain `0.1.0`.
    const fixture = repo()
    fixture.atCurrent('0.1.0')
    for (const version of ['0.1.0-rc.1', '0.1.0-0', '0.1.0-0a', '0.1.0-alpha.1.2'])
      expect(fixture.gate(version).code, `${version} is below 0.1.0`).toBe(1)
  })

  it('rejects the empty string and a trailing separator', () => {
    const { gate } = repo()
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
    const { gate } = repo()
    for (const version of ['1.2.3+meta', '0.7.4-rc.1+b'])
      expect(gate(version).code, `${version} must be refused here`).toBe(1)
  })
})

describe('the release gate refuses a version that is not greater', () => {
  it('refuses the current version and anything below it', () => {
    const fixture = repo()
    fixture.atCurrent('0.7.4')
    expect(fixture.gate('0.7.4').code).toBe(1)
    expect(fixture.gate('0.7.3').code).toBe(1)
    expect(fixture.gate('0.6.9').code).toBe(1)
    expect(fixture.gate('0.7.5').code).toBe(0)
    expect(fixture.gate('0.8.0').code).toBe(0)
  })

  it('orders prereleases numerically, not as text', () => {
    // `rc.10` sorts BELOW `rc.2` as a string, which refused a legitimate release. Compared
    // piece by piece, a numeric identifier is numeric — so rc.10 is greater.
    const fixture = repo()
    fixture.atCurrent('0.7.4-rc.2')
    expect(fixture.gate('0.7.4-rc.10').code, 'rc.10 is greater than rc.2').toBe(0)
    expect(fixture.gate('0.7.4-rc.1').code, 'rc.1 is below rc.2').toBe(1)
    // And the release outranks its own prerelease.
    expect(fixture.gate('0.7.4').code).toBe(0)
  })
})

/**
 * Below 1.0 the **minor** is the breaking channel. This rule had no coverage at all until a real
 * release was refused by it.
 */
describe('the release gate keeps the channel and the commits in agreement', () => {
  it('refuses a patch while a breaking commit is pending, and takes the minor instead', () => {
    for (const [subject, body] of [
      ['refactor!: delete the guards nothing can reach', undefined],
      ['fix(config): narrow the patch', 'BREAKING CHANGE: the entry moves.'],
    ] as const) {
      const fixture = repo('0.7.7')
      fixture.commit(subject, body)
      const refused = fixture.gate('0.7.8')
      expect(refused.code, `${subject}: 0.7.8 is a patch over a breaking commit`).toBe(1)
      expect(refused.stderr).toContain('is a patch')
      expect(refused.stderr).toContain(subject)
      // The same commits are exactly what a minor is for.
      expect(fixture.gate('0.8.0').code, `${subject}: 0.8.0 is the breaking channel`).toBe(0)
    }
  })

  it('allows a minor with no breaking commit, but says it is the feature channel', () => {
    // Not an error: a 0.Y.0 is how a feature release with a compatibility note ships here.
    const fixture = repo('0.7.7')
    fixture.commit('feat: an addition that breaks nothing')
    const { code, stderr } = fixture.gate('0.8.0')
    expect(code).toBe(0)
    expect(stderr).toContain('feature channel')
    // And a patch over the same commits is fine, because none of them break anything.
    expect(fixture.gate('0.7.8').code).toBe(0)
  })

  it('ignores a commit that merely mentions breaking in prose', () => {
    const fixture = repo('0.7.7')
    fixture.commit('docs: note that BREAKING CHANGE: is the footer format')
    expect(fixture.gate('0.7.8').code, 'a body line is only a marker at the start of a line').toBe(0)
  })

  /**
   * Every case above lands **one** commit, which is how an off-by-one survived here: `git log`
   * terminates each record with a newline, so a subject after the first arrives with a leading
   * `\n` and the anchored `^[a-z]+…!:` matched only commit one. A pending `!` behind any newer
   * commit was therefore invisible, and the gate accepted a patch over a breaking change —
   * observed on this repo's own `feat(deps)!:` three commits back.
   */
  it('sees a breaking commit that is not the most recent one', () => {
    const fixture = repo('0.7.7')
    fixture.commit('feat(deps)!: a breaking change, then two harmless commits')
    fixture.commit('docs: record it')
    fixture.commit('fix: a later, unrelated fix')

    const refused = fixture.gate('0.7.8')
    expect(refused.code, 'the breaking commit is still pending, so a patch must be refused').toBe(1)
    expect(refused.stderr).toContain('feat(deps)!: a breaking change')
    expect(fixture.gate('0.8.0').code).toBe(0)
  })
})
