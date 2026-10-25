/**
 * Lifting the managed panel's config to the schema the pinned release reads.
 *
 * home-hosted refuses to boot a config stamped below its `CONFIG_SCHEMA`, and only the panel's own
 * `migrate` may lift one. An upgrade that raises the schema therefore leaves a managed root unable
 * to start — and the panel supervises the dsh that serves this page, so after a reboot there is no
 * page to click: the boot entry fails, `Restart=always` loops, and nothing ever heals it.
 *
 * So a start that failed is followed by one question — `migrate --dry-run` — and, only when the
 * panel itself says a migration is pending, by `migrate --yes` and one retry. That is the whole
 * rule, and it lives here once: the page's start path calls {@link repairPanelMigration}, and the
 * generated launcher carries the same policy as a self-contained fragment (it cannot import, so
 * `MIGRATION_STEP_SOURCE` is interpolated into it, and `test/panel-migrate` pins the anchor against
 * the pinned release's own `migrate` module).
 *
 * **Nothing here implements a migration step, and nothing ever may.** A copy of upstream's steps
 * would fork its semantics exactly where a fork is silent — a schema-2 stamp over an old
 * `notifications.telegram` block reads as an unrecognized key and the person's notifications go
 * quietly off. The panel's own command keeps the `.bak`, validates its output, and refuses a file
 * it cannot lift.
 *
 * The decision is the panel's **answer**, never its failure text. Branching on `refusing to start:
 * config schema 1 needs 1 migration` would be a branch on wording, and a reworded refusal would
 * silently disable the repair; a failed start for any other reason must also be left alone.
 */
import type { RunResult } from '../util/exec.js'

/** What one CLI call answered; only these fields are read. */
export type CliAnswer = Pick<RunResult, 'code' | 'stdout' | 'stderr'>

/**
 * One CLI call, given the words of the command (`['migrate', '--dry-run']`).
 *
 * The caller closes over its own state root and project, so a migration can never be aimed at a
 * different root than the start it is repairing.
 */
export type MigrationCli = (words: string[]) => Promise<CliAnswer>

/**
 * A step line `migrate --dry-run` prints for one file, anchored at column 0.
 *
 * Byte-identical from 0.9.0 through 0.10.3 (`src/cli/migrate.ts`:
 * ``process.stdout.write(`migrating ${target.label}: config schema ${from} → ${plan.to}\n`)``).
 * The step lines under it are indented, so only this header line matches.
 */
export const MIGRATION_STEP_ANCHOR = /^migrating .+: config schema \d+ → \d+$/m

/** That pattern's source, interpolated into the generated launcher. */
export const MIGRATION_STEP_SOURCE = MIGRATION_STEP_ANCHOR.source

/** Both streams as one text: the plan goes to stdout, a refusal to stderr. */
export function cliText(answer: CliAnswer): string {
  return [answer.stdout, answer.stderr].filter(part => typeof part === 'string' && part.trim().length > 0).join('\n').trim()
}

/**
 * The `migrating …` lines in one `migrate --dry-run` output, in the order printed.
 *
 * Scanned **untrimmed**: the anchor's `^` is what rejects an indented step line, and trimming the
 * whole text first would strip the leading spaces of the first line and let one through. Every
 * stream is scanned, because the plan is written to stdout while a refusal goes to stderr.
 */
export function migrationSteps(answer: CliAnswer): string[] {
  const text = [answer.stdout, answer.stderr].join('\n')
  return text.split('\n').filter(line => MIGRATION_STEP_ANCHOR.test(line))
}

/** The distinct `config schema A → B` transitions those steps name, for a report. */
export function migrationTransitions(steps: string[]): string[] {
  const jumps = steps
    .map(step => /config schema (\d+) → (\d+)/.exec(step))
    .filter((match): match is RegExpExecArray => match !== null)
    .map(match => `${match[1]} → ${match[2]}`)
  return [...new Set(jumps)]
}

/**
 * What a person is told after a repair.
 *
 * The `.bak` is part of it: `migrate` rewrites the notifications shape, so saying a backup exists
 * is what makes the automatic path reviewable instead of mysterious.
 */
export function migrationNote(transitions: string[]): string {
  const from = transitions.length === 0 ? 'the config schema' : `config schema ${transitions.join(', ')}`
  return `${from} made this panel refuse to start, so it was lifted with \`home-hosted migrate --yes\` (a .bak sits beside each rewritten file)`
}

/** What {@link repairPanelMigration} found. */
export interface MigrationRepair {
  /** What was lifted and where the backups are; null when nothing was pending. */
  note: string | null
  /**
   * The panel's own words when a migration *was* pending but could not be applied — its refusal
   * names the remedy (`install that release`, an unreadable file), which the caller surfaces.
   */
  failure: string | null
}

/**
 * Check, apply, and report — the one implementation of the repair.
 *
 * `run` carries the state root, so a migration is aimed at exactly the root the start was.
 */
export async function repairPanelMigration(run: MigrationCli): Promise<MigrationRepair> {
  const plan = await run(['migrate', '--dry-run'])
  const steps = migrationSteps(plan)
  // Nothing pending — or no answer at all (a root with no state yet): the start's own failure
  // stands, and it already carries the panel's own explanation.
  if (steps.length === 0)
    return { note: null, failure: null }

  const applied = await run(['migrate', '--yes'])
  if (applied.code !== 0)
    return { note: null, failure: cliText(applied) || `home-hosted migrate exited ${String(applied.code)}` }
  return { note: migrationNote(migrationTransitions(steps)), failure: null }
}
