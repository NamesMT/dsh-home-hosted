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
import { registerInstancesNotice } from './home-hosted/instances-notice.js'
import { registerAuthNotice } from './home-hosted/web-notice.js'
import { SettingsStore } from './settings.js'
import { registerAgentTools } from './tools.js'
import { ensureDir } from './util/fsx.js'
import { pluginStateDir, resolveHomeHostedHome } from './util/paths.js'

export const name = 'dsh-home-hosted'

export { Config }

export const inject: string[] = []

export function apply(ctx: Context, config?: ConfigShape): void {
  const resolved: ConfigShape = {
    stateDir: config?.stateDir,
    homeHostedCommand: config?.homeHostedCommand,
    defaultEntryId: config?.defaultEntryId ?? 'dsh',
    instanceRoots: config?.instanceRoots ?? [],
  }

  const stateDir = pluginStateDir(resolved.stateDir)
  ensureDir(stateDir, 0o700)

  // Per state root, not per machine: a second dsh install must not adopt, edit
  // or autostart the first one's panel. The page reports which root this is.
  const panel = resolveHomeHostedHome(stateDir)

  const settings = new SettingsStore(path.join(stateDir, 'settings.json'), resolved.defaultEntryId)
  const service = new HomeHostedService(ctx, {
    home: panel.home,
    panelHomeSource: panel.source,
    stateDir,
    homeHostedCommand: resolved.homeHostedCommand,
    defaultEntryId: resolved.defaultEntryId,
    instanceRoots: resolved.instanceRoots,
    settings,
  })

  registerRpc(ctx, service)
  registerAgentTools(ctx, service, settings)
  // Read per assembly, so the setting takes effect without re-registering —
  // and re-measured there, so a panel started while this dsh runs is noticed
  // even when nobody has the settings page open.
  registerInstancesNotice(ctx, {
    instances: () => service.instancesNow(),
    enabled: () => settings.get().instancesNotice,
  })
  // Read per 401, so the setting takes effect without re-installing the wrapper.
  registerAuthNotice(ctx, () => (settings.get().authNotice ? service.panelLogUrl() : null))

  // Measure the panel inventory once now: the first model step should already
  // know whether this machine has more than one panel.
  void service.instances().catch(() => {
    // a discovery failure only means an empty inventory
  })

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
