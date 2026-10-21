/**
 * The migration repair, in both halves that carry it.
 *
 * Two things are pinned here, and they fail silently if they are not:
 *
 * - the **anchor** `^migrating ` really is what the pinned release's `migrate` prints, read from
 *   its own shipped source rather than restated, because a reworded line would otherwise just stop
 *   matching and the repair would never run again;
 * - the **generated launcher** actually lifts an old config and starts the panel, driven as the
 *   real artifact a boot entry executes.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import { MIGRATION_STEP_ANCHOR, MIGRATION_STEP_SOURCE, migrationNote, migrationSteps, migrationTransitions, repairPanelMigration } from '../src/home-hosted/panel-migrate.js'
import { buildLauncherSource, launcherPath, writeLauncher } from '../src/home-hosted/launcher.js'
import type { CliAnswer } from '../src/home-hosted/panel-migrate.js'
import { panelSchemaMapPath } from './helpers/panel-schema.js'
import { run } from '../src/util/exec.js'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

/** A PATH holding node alone: the repo's own `home-hosted` is on PATH under a lifecycle script. */
function isolatedPath(): Record<string, string> {
  return { PATH: path.dirname(process.execPath) }
}

function answer(stdout = '', stderr = '', code = 0): CliAnswer {
  return { code, stdout, stderr }
}

/** The pinned release's `migrate` module, from the shipped sourcemap. */
function pinnedMigrateSource(): string {
  const map = JSON.parse(fs.readFileSync(panelSchemaMapPath(), 'utf8')) as { sources: string[], sourcesContent: Array<string | null> }
  const index = map.sources.findIndex(source => /cli[\\/]migrate\.ts$/.test(source))
  const source = index === -1 ? null : map.sourcesContent[index]
  if (typeof source !== 'string')
    throw new Error(`the pinned panel's migrate module was not found in ${panelSchemaMapPath()}`)
  return source
}

describe('the migration anchor', () => {
  /**
   * The guard this file exists for. `MIGRATION_STEP_ANCHOR` is a copy of a line in another project's
   * command, and a bump that reworded it would leave the repair looking like "nothing pending" —
   * which reads as "the start failed for another reason" and is never reported anywhere.
   */
  it('matches the line the pinned release prints, read from its own source', () => {
    const source = pinnedMigrateSource()
    // The write that produces the header line, exactly as the release carries it.
    const at = source.indexOf("process.stdout.write(`migrating ")
    expect(at, 'the migrate module should still print a `migrating …` line').toBeGreaterThan(-1)
    const line = source.slice(at, source.indexOf('\n', at))
    // Rebuild the line the way interpolating it would read, then match the anchor against it.
    expect(line).toContain('config schema')
    const sample = 'migrating global settings: config schema 1 → 2'
    expect(sample).toMatch(MIGRATION_STEP_ANCHOR)
    // The line the release writes is the shape the sample stands for.
    expect(line.replace(/\\n$/, '')).toContain('config schema ${from} → ${plan.to}')
  })

  it('is anchored at column 0, so an indented step line is not mistaken for a file header', () => {
    const steps = 'migrating global settings: config schema 1 → 2\n  1. notifications: fold the singleton\n'
    expect(migrationSteps(answer(steps))).toEqual(['migrating global settings: config schema 1 → 2'])
    expect(migrationSteps(answer('  migrating a file: config schema 1 → 2'))).toEqual([])
  })

  it('reads nothing pending from the panel\'s own healthy answer', () => {
    // What 0.9.6 prints when every file is already current — and what a root with no state prints
    // on stderr with exit 1. Neither is a migration.
    expect(migrationSteps(answer('nothing was written (--dry-run)\n'))).toEqual([])
    expect(migrationSteps(answer('', 'error no home-hosted state to migrate\n', 1))).toEqual([])
  })

  it('names each distinct transition once, however many files carry it', () => {
    const steps = migrationSteps(answer([
      'migrating global settings: config schema 1 → 2',
      '  1. notifications: fold',
      'migrating workspace default servers: config schema 1 → 2',
      '  1. notifications: fold',
    ].join('\n')))
    expect(migrationTransitions(steps)).toEqual(['1 → 2'])
    expect(migrationNote(migrationTransitions(steps))).toContain('config schema 1 → 2')
    expect(migrationNote(migrationTransitions(steps))).toContain('.bak')
  })

  /**
   * The launcher carries the same pattern as interpolated source, and the two must not drift: the
   * script cannot import, so the only defence is that both are generated from one string.
   */
  it('hands the generated launcher the same pattern, not a second copy', () => {
    const source = buildLauncherSource({ stateDir: '/tmp/s', dshHome: '/tmp/d', resolvedEntry: '/tmp/e', minVersion: '0.9.0' })
    expect(source).toContain(`new RegExp(${JSON.stringify(MIGRATION_STEP_SOURCE)}, 'm')`)
    expect(new RegExp(MIGRATION_STEP_SOURCE, 'm').source).toBe(MIGRATION_STEP_ANCHOR.source)
  })
})

describe('repairPanelMigration', () => {
  it('applies nothing when the panel says nothing is pending', async () => {
    const calls: string[][] = []
    const repair = await repairPanelMigration(async (args) => {
      calls.push(args)
      return answer('nothing was written (--dry-run)\n')
    })
    expect(repair).toEqual({ note: null, failure: null })
    // Only the question: a healthy root is never written to.
    expect(calls).toEqual([['migrate', '--dry-run']])
  })

  it('lifts the config with the panel\'s own --yes when a plan is pending', async () => {
    const calls: string[][] = []
    const repair = await repairPanelMigration(async (args) => {
      calls.push(args)
      return args.includes('--dry-run')
        ? answer('migrating global settings: config schema 1 → 2\nnothing was written (--dry-run)\n')
        : answer('migrated global settings to schema 2\n')
    })
    expect(calls).toEqual([['migrate', '--dry-run'], ['migrate', '--yes']])
    expect(repair.failure).toBeNull()
    expect(repair.note).toContain('config schema 1 → 2')
  })

  it('reports a migration that refused instead of claiming it succeeded', async () => {
    const repair = await repairPanelMigration(async args => args.includes('--dry-run')
      ? answer('migrating global settings: config schema 3 → 2\n')
      : answer('', 'error written by a newer release (config schema 3)\n', 1))
    expect(repair.note).toBeNull()
    expect(repair.failure).toContain('written by a newer release')
  })
})

/**
 * The generated launcher, driven as the boot entry runs it.
 *
 * The CLI is a real script: it answers `migrate --dry-run` with a plan while its state file says
 * "old", applies it on `--yes`, and answers `up --foreground` with failure until the state is
 * current. That is the shape of the bug — a panel that refuses to start forever — without a real
 * panel, and it fails if any one of the three steps is missing.
 */
describe('the generated launcher lifts an old config at boot', () => {
  interface BootCase {
    state: string
    launcher: string
    home: string
    root: string
  }

  /** A CLI whose `up` fails until its state file says the config was migrated. */
  function bootCase(options: { migrateWorks?: boolean, executable?: boolean } = {}): BootCase {
    scratch = tempDir()
    const root = scratch.path
    const state = path.join(root, 'state')
    const home = path.join(root, 'home')
    // A real package layout, because the launcher reads a candidate's version from its manifest and
    // only a versioned candidate outranks the PATH tier.
    const pkg = path.join(root, 'pkg')
    const cli = path.join(pkg, 'cli.mjs')
    // The CLI's state: `schema` is lifted by migrate, `up` refuses to run until it is 2.
    const stateFile = path.join(root, 'cli-state.json')
    writeJsonFile(stateFile, { schema: 1 })
    writeJsonFile(path.join(pkg, 'package.json'), { name: 'fake-home-hosted', version: '0.9.6', bin: { 'home-hosted': 'cli.mjs' } })
    fs.writeFileSync(cli, [
      "import fs from 'node:fs'",
      "import path from 'node:path'",
      `const file = ${JSON.stringify(stateFile)}`,
      'const read = () => JSON.parse(fs.readFileSync(file, \'utf8\'))',
      'const write = value => fs.writeFileSync(file, JSON.stringify(value))',
      'const args = process.argv.slice(2)',
      "if (args[0] === 'migrate') {",
      "  if (args.includes('--dry-run')) {",
      "    if (read().schema < 2) console.log('migrating global settings: config schema 1 → 2\\n  1. notifications: fold')",
      "    else console.log('nothing was written (--dry-run)')",
      '    process.exit(0)',
      '  }',
      options.migrateWorks === false
        ? "  console.error('error the migration could not run'); process.exit(1)"
        : "  write({ schema: 2 }); console.log('migrated global settings to schema 2'); process.exit(0)",
      '}',
      "if (args[0] === 'down') {",
      "  if (read().schema < 2) { console.error('refusing to stop: config schema 1 needs 1 migration'); process.exit(1) }",
      '  process.exit(0)',
      '}',
      "if (args[0] === 'up') {",
      "  if (read().schema < 2) { console.error('refusing to start: config schema 1 needs 1 migration before this release can use it'); process.exit(1) }",
      "  fs.writeFileSync(path.join(path.dirname(file), 'panel.up'), String(read().schema)); process.exit(0)",
      '}',
      'process.exit(0)',
      '',
    ].join('\n'), 'utf8')
    // A plain executable (a shim, or a global bin with a shebang) is run directly, so the launcher
    // must not prefix its own path as an argument — the migrate call shares that invocation.
    const resolvedEntry = options.executable === true ? path.join(pkg, 'home-hosted') : cli
    if (options.executable === true) {
      fs.writeFileSync(resolvedEntry, `#!/usr/bin/env node\n${fs.readFileSync(cli, 'utf8')}`, 'utf8')
      fs.chmodSync(resolvedEntry, 0o755)
    }
    writeLauncher({ stateDir: state, dshHome: path.join(root, 'dsh'), resolvedEntry, resolvedVersion: '0.9.6', minVersion: '0.9.0' })
    return { state, launcher: launcherPath(state), home, root }
  }

  const boot = async (c: BootCase): Promise<{ code: number | null, stdout: string, stderr: string }> =>
    await run(c.launcher, ['up', '--foreground', '--home', c.home], { timeoutMs: 20_000, env: isolatedPath() })

  it('migrates, then starts the panel on a second attempt', async () => {
    const c = bootCase()
    const result = await boot(c)
    expect(result.code).toBe(0)
    // The panel only starts on a current schema, so `panel.up` proves the retry ran.
    expect(fs.readFileSync(path.join(c.root, 'panel.up'), 'utf8')).toBe('2')
    expect(result.stderr).toContain('lifting it with `home-hosted migrate --yes`')
  }, 30_000)

  /**
   * The entry can be a shim or a global bin rather than a `.mjs` this launcher runs through node.
   * Then the program *is* the entry, and repeating it as an argument ran `<cli> <cli> migrate …` —
   * every command a file named `migrate`. Driven, not asserted on the source string.
   */
  it('runs migrate the same way it runs the CLI, for an executable entry', async () => {
    const c = bootCase({ executable: true })
    const result = await boot(c)
    expect(result.code).toBe(0)
    expect(fs.readFileSync(path.join(c.root, 'panel.up'), 'utf8')).toBe('2')
    expect(result.stderr).toContain('lifting it with `home-hosted migrate --yes`')
  }, 30_000)

  it('leaves a healthy start alone', async () => {
    const c = bootCase()
    // A first run migrates and starts; a second has nothing pending.
    await boot(c)
    const again = await boot(c)
    expect(again.code).toBe(0)
    expect(again.stderr).not.toContain('lifting it')
  }, 30_000)

  it('reports a failed migration and keeps the start\'s own failure', async () => {
    const c = bootCase({ migrateWorks: false })
    const result = await boot(c)
    expect(result.code).not.toBe(0)
    expect(result.stderr).toContain('the migration did not succeed')
    // Nothing was retried into a start on a config that is still old.
    expect(fs.existsSync(path.join(c.root, 'panel.up'))).toBe(false)
  }, 30_000)

  it('does not run a migration for a command that is not the boot daemon', async () => {
    const c = bootCase()
    // `down` fails here too, and `--foreground` is what tells the two apart: a stop must never lift
    // a config, so the failure stands and nothing is written.
    const result = await run(c.launcher, ['down', '--home', c.home], { timeoutMs: 20_000, env: isolatedPath() })
    expect(result.code).not.toBe(0)
    expect(result.stderr).not.toContain('lifting it')
    expect(fs.readFileSync(path.join(c.root, 'cli-state.json'), 'utf8')).toContain('"schema": 1')
  }, 30_000)

  /**
   * A stop must not kill the process rewriting the person's config, and it must still reach the
   * panel once the retry is up. The launcher forwards a signal to whatever it is running; the
   * migration child is deliberately not that.
   */
  it('does not hand a stop signal to the migration it is running', async () => {
    const source = fs.readFileSync(bootCase().launcher, 'utf8')
    // The migration runs through `runQuiet`, which never sets `current` — the variable the signal
    // handler forwards to — so a stop cannot kill the process rewriting the person's config.
    expect(source).toContain('function runQuiet')
    expect(source).toMatch(/runQuiet\(program, \[\.\.\.prefix, 'migrate', '--yes'/)
    expect(source).not.toContain('spawnSync')
    const quiet = source.slice(source.indexOf('function runQuiet'), source.indexOf('function runQuiet') + 700)
    expect(quiet).not.toContain('current =')
  })

  /**
   * A stop that arrives *during* the migration must end the launcher, not be followed by the
   * retry: systemd has already given up on this unit, so a start now would leave a panel nobody
   * supervises — the orphaned-panel class this launcher exists to avoid.
   */
  it('does not start the panel after a stop arrived during the migration', () => {
    const source = fs.readFileSync(bootCase().launcher, 'utf8')
    expect(source).toMatch(/const repaired = await repairMigration\(/)
    expect(source).toMatch(/if \(repaired === null \|\| stopping\) exitWith\(first\)/)
  })
})

/**
 * A launcher that could not start anything must not report success.
 *
 * The promise-shaped child made this reachable: `exitWith` reads a null code with no signal as 0, so
 * a spawn `error` resolve had to carry a non-zero code itself. A boot entry that reports a clean exit
 * while nothing runs is the worst shape of this bug — `Restart=` would not even retry.
 */
describe('the generated launcher reports a start it could not perform', () => {
  it('exits non-zero when the CLI cannot be spawned, and says why', async () => {
    const dir = tempDir()
    try {
      // No script extension, so the launcher runs this file directly; mode 0600 makes that EACCES.
      const entry = path.join(dir.path, 'cli')
      fs.writeFileSync(entry, '#!/usr/bin/env node\n')
      fs.chmodSync(entry, 0o600)
      writeLauncher({ stateDir: path.join(dir.path, 'state'), dshHome: '/tmp/none', resolvedEntry: entry, minVersion: '0.9.0' })
      // An isolated PATH: the launcher's last resort is a `home-hosted` on PATH, and under a
      // lifecycle script the repo's own is there — it would legitimately win over this entry.
      const result = await run(launcherPath(path.join(dir.path, 'state')), ['up', '--foreground', '--home', path.join(dir.path, 'home')], { timeoutMs: 20_000, env: isolatedPath() })
      expect(result.code).not.toBe(0)
      expect(result.stderr).toContain('could not start')
      expect(result.stderr).toContain('EACCES')
    }
    finally {
      dir.cleanup()
    }
  }, 30_000)
})

/** A guard on the real artifact: the generated script must still be a runnable ESM file. */
describe('the generated launcher parses', () => {
  it('is valid ES module source', async () => {
    const dir = tempDir()
    try {
      writeLauncher({ stateDir: dir.path, dshHome: '/tmp/d', resolvedEntry: '/tmp/e', minVersion: '0.9.0' })
      const result = await run(process.execPath, ['--check', launcherPath(dir.path)], { timeoutMs: 20_000 })
      expect(result.stderr).toBe('')
      expect(result.code).toBe(0)
    }
    finally {
      dir.cleanup()
    }
  })
})
