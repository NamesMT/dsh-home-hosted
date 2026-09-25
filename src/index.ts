/**
 * `dsh-home-hosted` — boot autostart for the home-hosted panel, and home-hosted
 * server management, from inside DeepSeek Harness.
 *
 * The plugin supplies no server entries of its own: everything it manages is
 * declared by the person using the page, and nothing here knows a blessed id
 * beyond the one it is told to treat as the running harness.
 */
import type { Context } from '@deepseek-ai/cordis'
import path from 'node:path'
import { Config } from './config.js'
import type { Config as ConfigShape } from './config.js'
import { registerRpc } from './rpc.js'
import { HomeHostedService } from './service.js'
import { SettingsStore } from './settings.js'
import { registerAgentTools } from './tools.js'
import { ensureDir } from './util/fsx.js'
import { homeHostedHome, pluginStateDir } from './util/paths.js'

export const name = 'dsh-home-hosted'

export { Config }

export const inject: string[] = []

export function apply(ctx: Context, config?: ConfigShape): void {
  const resolved: ConfigShape = {
    stateDir: config?.stateDir,
    homeHostedCommand: config?.homeHostedCommand,
    defaultEntryId: config?.defaultEntryId ?? 'dsh',
  }

  const stateDir = pluginStateDir(resolved.stateDir)
  ensureDir(stateDir, 0o700)

  const settings = new SettingsStore(path.join(stateDir, 'settings.json'), resolved.defaultEntryId)
  const service = new HomeHostedService(ctx, {
    home: homeHostedHome(),
    stateDir,
    homeHostedCommand: resolved.homeHostedCommand,
    defaultEntryId: resolved.defaultEntryId,
    settings,
  })

  registerRpc(ctx, service)
  registerAgentTools(ctx, service, settings)

  // Re-assert an enabled boot entry shortly after startup: a node or CLI upgrade
  // moves the paths a unit was written with, and the fix is to rewrite it.
  ctx.effect(() => {
    const timer = setTimeout(() => {
      void service.reconcile().catch(() => {
        // the page reads the resulting status; a failed repair is not a startup failure
      })
    }, 5000)
    return () => clearTimeout(timer)
  }, 'dsh-home-hosted: startup reconcile')
}
