/**
 * The Cordis row configuration: operator overrides only. Everything a person
 * changes in the plugin's own page lives in `settings.json` under the plugin
 * state directory, so the two never fight over the same field.
 */
import z from '@deepseek-ai/schemastery'

export interface Config {
  /** Override the plugin state directory (defaults to `$DSH_HOME/dsh-home-hosted`). */
  stateDir?: string
  /** Override the home-hosted executable used in generated boot entries. */
  homeHostedCommand?: string
  /** The entry this plugin manages for the running harness. */
  defaultEntryId: string
  /**
   * Extra home-hosted state roots to report as other panels. Discovery already
   * knows the managed root, `$HHOSTED_HOME` and the `~/.home-hosted*` siblings;
   * a panel run from a project with its own `--home` is declared here.
   */
  instanceRoots: string[]
}

export const Config: z<Config> = z.object({
  stateDir: z.string().description('Plugin state directory; defaults to $DSH_HOME/dsh-home-hosted'),
  homeHostedCommand: z.string().description('home-hosted executable to put in a generated autostart entry'),
  defaultEntryId: z.string().default('dsh').description('Server entry id used for the running harness'),
  instanceRoots: z.array(z.string()).default([]).description('Other home-hosted state roots (--home) to report as other panels'),
})
