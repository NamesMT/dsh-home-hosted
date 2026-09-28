/**
 * Telling the agent which home-hosted panels exist.
 *
 * A plugin that owns one panel must not look like the only one on the machine.
 * When discovery finds more than one, the inventory is contributed as dynamic
 * runtime context (`ctx.systemPrompt.context`), so every model step knows the
 * managed panel, the others, and that this plugin cannot write to them.
 *
 * The contribution reads the service's cached inventory: assembly happens
 * before a model step and must never block on the disk.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { InstanceView } from '../shared/contracts.js'
import { instancesNoticeText } from './instances.js'

/** The subset of `ctx.systemPrompt` this uses; absent on a host without it. */
export interface SystemPromptLike {
  context: (contribution: {
    name: string
    order: number
    text: string | ((context: unknown) => string)
  }) => () => void
}

export interface InstancesNoticeDeps {
  /** The inventory the plugin already measured; never a disk read at assembly. */
  instances: () => readonly InstanceView[]
  /** The `instancesNotice` setting, read per assembly. */
  enabled: () => boolean
}

/**
 * After the first-party runtime contexts (sandbox 110, approval 115,
 * subagent delegation 120) and before anything a repository owns.
 */
export const INSTANCES_CONTEXT_ORDER = 130

/** The exact text one assembly contributes, or `''` for nothing. */
export function instancesContextText(instances: readonly InstanceView[], enabled: boolean): string {
  return enabled ? instancesNoticeText(instances) ?? '' : ''
}

export function registerInstancesNotice(ctx: Context, deps: InstancesNoticeDeps): void {
  ctx.inject(['systemPrompt'], (scoped) => {
    const prompt = (scoped as unknown as { systemPrompt?: SystemPromptLike }).systemPrompt
    if (typeof prompt?.context !== 'function')
      return
    scoped.effect(() => prompt.context({
      name: 'dsh-home-hosted:instances',
      order: INSTANCES_CONTEXT_ORDER,
      text: () => instancesContextText(deps.instances(), deps.enabled()),
    }), 'dsh-home-hosted: instance notice')
  })
}
