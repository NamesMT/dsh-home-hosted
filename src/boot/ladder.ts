/**
 * The boot ladder: which mechanisms exist on this platform, which one is
 * installed, and which one this process should use. Everything platform
 * specific is inside a provider's `detect()`/`status()`/`install()` — this file
 * only orders them and never runs at import time.
 */
import os from 'node:os'
import process from 'node:process'
import type { BootCandidate, BootMechanism, BootStatus } from '../shared/contracts.js'
import { run as execRun, sudoAvailable } from '../util/exec.js'
import type {
  BootActionResult,
  BootLadder,
  BootLadderOptions,
  BootProvider,
  BootProviderContext,
  BootProviderStatus,
  BootSpec,
} from './types.js'
import { errorMessage, failed, isInstalledState } from './common.js'
import { createSystemdSystemProvider, createSystemdUserProvider } from './systemd.js'
import { createLaunchdAgentProvider, createLaunchdDaemonProvider } from './launchd.js'
import { createXdgAutostartProvider } from './xdg.js'
import { createWindowsRunProvider, createWindowsTaskProvider } from './windows.js'
import { createContainerProvider, createUnsupportedProvider } from './fallback.js'

function platformKind(platform: NodeJS.Platform): BootStatus['platform'] {
  if (platform === 'linux' || platform === 'darwin' || platform === 'win32')
    return platform
  return 'other'
}

/** Ordered by preference within a platform; the terminal providers come last. */
export function bootProviders(
  ctx: BootProviderContext,
  platform: NodeJS.Platform = ctx.platform,
): BootProvider[] {
  const container = createContainerProvider(ctx)
  const unsupported = createUnsupportedProvider(platform)
  switch (platform) {
    case 'linux':
      return [createSystemdUserProvider(ctx), createSystemdSystemProvider(ctx), createXdgAutostartProvider(ctx), container, unsupported]
    case 'darwin':
      return [createLaunchdAgentProvider(ctx), createLaunchdDaemonProvider(ctx), unsupported]
    case 'win32':
      return [createWindowsRunProvider(ctx), createWindowsTaskProvider(ctx), unsupported]
    default:
      return [container, unsupported]
  }
}

export function createBootLadder(options: BootLadderOptions = {}): BootLadder {
  const platform = options.platform ?? process.platform
  const isRoot = process.getuid?.() === 0
  const ctx: BootProviderContext = {
    platform,
    home: options.home ?? os.homedir(),
    env: options.env ?? process.env,
    run: options.run ?? execRun,
    sudo: options.sudo ?? (async () => (isRoot ? true : await sudoAvailable())),
    isRoot,
    exists: options.exists,
  }
  const providers = bootProviders(ctx, platform)
  const kind = platformKind(platform)

  async function detectAll(): Promise<{ platform: BootStatus['platform'], candidates: BootCandidate[] }> {
    const candidates = await Promise.all(providers.map(async (provider) => {
      try {
        return await provider.detect()
      }
      catch (error) {
        return {
          mechanism: provider.mechanism,
          available: false,
          bootCapable: false,
          privileged: false,
          reason: `detection failed: ${errorMessage(error)}`,
        } satisfies BootCandidate
      }
    }))
    return { platform: kind, candidates }
  }

  async function safeStatus(provider: BootProvider, spec: BootSpec): Promise<BootProviderStatus> {
    try {
      return await provider.status(spec)
    }
    catch (error) {
      return { state: 'not-installed', unitPath: null, detail: errorMessage(error), commands: [] }
    }
  }

  function recommend(candidates: BootCandidate[]): BootMechanism | null {
    const byMechanism = new Map(candidates.map(candidate => [candidate.mechanism, candidate]))
    const available = providers
      .map(provider => provider.mechanism)
      .filter(mechanism => byMechanism.get(mechanism)?.available === true)
    const bootCapable = available.find(mechanism => mechanism !== 'container' && byMechanism.get(mechanism)?.bootCapable === true)
    if (bootCapable)
      return bootCapable
    // Inside a container no OS entry starts anything, so the honest advice is the restart policy.
    if (available.includes('container'))
      return 'container'
    return available.find(mechanism => mechanism !== 'unsupported')
      ?? available[0]
      ?? null
  }

  async function buildStatus(spec: BootSpec, mechanism?: BootMechanism): Promise<BootStatus> {
    const { candidates } = await detectAll()
    const byMechanism = new Map(candidates.map(candidate => [candidate.mechanism, candidate]))
    const statuses = new Map<BootMechanism, BootProviderStatus>()
    for (const [provider, status] of await Promise.all(providers.map(async provider => [provider, await safeStatus(provider, spec)] as const)))
      statuses.set(provider.mechanism, status)

    const explicit = mechanism ? providers.find(provider => provider.mechanism === mechanism) : undefined
    const installedProvider = providers.find((provider) => {
      const status = statuses.get(provider.mechanism)
      return status !== undefined && isInstalledState(status.state)
    })
    const recommended = recommend(candidates)
    const target = explicit
      ?? installedProvider
      ?? (recommended ? providers.find(provider => provider.mechanism === recommended) : undefined)

    const explicitStatus = explicit ? statuses.get(explicit.mechanism) : undefined
    const installedMechanism = explicit && explicitStatus && isInstalledState(explicitStatus.state)
      ? explicit.mechanism
      : installedProvider?.mechanism ?? null

    const common = { platform: kind, mechanism: installedMechanism, recommended, candidates }
    if (!target) {
      return {
        ...common,
        state: 'unsupported',
        bootCapable: false,
        privileged: false,
        unitPath: null,
        commands: [],
        detail: `no boot mechanism is available on ${platform}`,
      }
    }

    const status = statuses.get(target.mechanism)
    const candidate = byMechanism.get(target.mechanism)
    const alsoInstalled = providers
      .filter(provider => provider.mechanism !== target.mechanism && isInstalledState(statuses.get(provider.mechanism)?.state ?? 'unsupported'))
      .map(provider => provider.mechanism)
    return {
      ...common,
      state: status?.state ?? 'unsupported',
      bootCapable: candidate?.bootCapable ?? false,
      privileged: candidate?.privileged ?? false,
      unitPath: status?.unitPath ?? null,
      commands: status?.commands ?? [],
      detail: `${status?.detail ?? 'no detail'}${alsoInstalled.length ? `; also installed: ${alsoInstalled.join(', ')}` : ''}`,
    }
  }

  async function safeInstall(provider: BootProvider, spec: BootSpec): Promise<BootActionResult> {
    try {
      return await provider.install(spec)
    }
    catch (error) {
      return failed(errorMessage(error))
    }
  }

  async function safeUninstall(provider: BootProvider, spec: BootSpec): Promise<BootActionResult> {
    try {
      return await provider.uninstall(spec)
    }
    catch (error) {
      return failed(errorMessage(error))
    }
  }

  return {
    providers,

    detect: detectAll,

    status: buildStatus,

    async install(spec: BootSpec, mechanism?: BootMechanism) {
      const before = await buildStatus(spec, mechanism)
      const chosen = mechanism ?? before.mechanism ?? before.recommended
      const target = chosen ? providers.find(provider => provider.mechanism === chosen) : undefined
      if (!target) {
        return {
          ...failed(`no boot mechanism is available on ${platform}`),
          mechanism: null,
          status: before,
        }
      }
      const result = await safeInstall(target, spec)
      const status = await buildStatus(spec, mechanism)
      return {
        ...result,
        mechanism: result.ok ? target.mechanism : status.mechanism,
        status,
      }
    },

    async uninstall(spec: BootSpec, mechanism?: BootMechanism) {
      const before = await buildStatus(spec, mechanism)
      const chosen = mechanism ?? before.mechanism
      const target = chosen ? providers.find(provider => provider.mechanism === chosen) : undefined
      if (!target) {
        return {
          ok: true,
          changed: false,
          detail: 'no OS boot entry is installed for this plugin, so there is nothing to uninstall',
          commands: [],
          needsPrivilege: false,
          status: before,
        }
      }
      const result = await safeUninstall(target, spec)
      const status = await buildStatus(spec, mechanism)
      return { ...result, status }
    },
  }
}
