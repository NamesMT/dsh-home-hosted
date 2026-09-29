/**
 * The two terminals of the ladder: a container (an OS boot entry would land
 * outside it, so the right answer is the container's own restart policy) and a
 * platform this plugin has no mechanism for.
 */

import type { BootCandidate } from '../shared/contracts.js'
import type { BootActionResult, BootProvider, BootProviderContext, BootProviderStatus, BootSpec } from './types.js'
import { readText } from '../util/fsx.js'
import { failed, existsOf } from './common.js'

const RESTART_POLICY = 'use the container restart policy instead: `docker run --restart unless-stopped`, or `restart: unless-stopped` in a compose file'

/** A human-readable description of the container we are inside, or null. */
export function detectContainer(ctx: BootProviderContext): string | null {
  if (existsOf(ctx, '/.dockerenv'))
    return 'Docker (/.dockerenv)'
  if (existsOf(ctx, '/run/.containerenv'))
    return 'Podman (/run/.containerenv)'
  if (ctx.env.container?.trim())
    return `container environment (container=${ctx.env.container.trim()})`
  const cgroup = existsOf(ctx, '/proc/1/cgroup') ? readText('/proc/1/cgroup') : null
  if (cgroup) {
    if (cgroup.includes('kubepods'))
      return 'Kubernetes (cgroup kubepods)'
    if (cgroup.includes('docker'))
      return 'Docker (cgroup docker)'
    if (cgroup.includes('lxc'))
      return 'LXC (cgroup lxc)'
    if (cgroup.includes('containerd'))
      return 'containerd (cgroup)'
  }
  return null
}

export function createContainerProvider(ctx: BootProviderContext): BootProvider {
  const mechanism = 'container' as const
  return {
    mechanism,

    async detect(): Promise<BootCandidate> {
      const container = detectContainer(ctx)
      return {
        mechanism,
        available: container !== null,
        bootCapable: false,
        privileged: false,
        reason: container === null
          ? 'this process does not look like it is inside a container'
          : `this process runs inside ${container}; an OS boot entry would live on the host, not here`,
      }
    },

    async status(): Promise<BootProviderStatus> {
      const container = detectContainer(ctx)
      return {
        state: 'unsupported',
        unitPath: null,
        detail: container === null
          ? 'no container detected'
          : `running inside ${container}; ${RESTART_POLICY}`,
        commands: [],
      }
    },

    async install(): Promise<BootActionResult> {
      const container = detectContainer(ctx)
      return failed(
        container === null
          ? `no container detected; ${RESTART_POLICY}`
          : `this process runs inside ${container}; an OS boot entry would be installed outside the container — ${RESTART_POLICY}`,
      )
    },

    async uninstall(): Promise<BootActionResult> {
      return failed('nothing to uninstall: this plugin installed no OS boot entry for a container; the container restart policy is what starts it')
    },

    async activate(): Promise<null> {
      return null
    },
  }
}

export function createUnsupportedProvider(platform: NodeJS.Platform): BootProvider {
  const mechanism = 'unsupported' as const
  const reason = `no boot mechanism is known for ${platform}`
  return {
    mechanism,

    async detect(): Promise<BootCandidate> {
      return { mechanism, available: true, bootCapable: false, privileged: false, reason }
    },

    async status(_spec: BootSpec): Promise<BootProviderStatus> {
      return { state: 'unsupported', unitPath: null, detail: reason, commands: [] }
    },

    async install(_spec: BootSpec): Promise<BootActionResult> {
      return failed(`this plugin has no boot mechanism for ${platform}; start home-hosted from your platform's own service manager`)
    },

    async uninstall(_spec: BootSpec): Promise<BootActionResult> {
      return failed(`this plugin has no boot mechanism for ${platform}, so it installed nothing to remove`)
    },

    async activate(): Promise<null> {
      return null
    },
  }
}
