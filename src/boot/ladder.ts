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
  BootActivation,
  BootLadder,
  BootLadderOptions,
  BootProvider,
  BootProviderContext,
  BootProviderStatus,
  BootRetirement,
  BootSpec,
  BootStart,
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
    const usable = (mechanism: string): boolean => mechanism !== 'container' && mechanism !== 'unsupported'
    // Inside a container no OS entry starts anything, so the honest advice is the
    // restart policy — ahead of anything else that merely looks available.
    if (available.includes('container'))
      return 'container'
    // A boot-capable mechanism that needs a password prompt is offered, but it is
    // not the *recommendation*: automatic should mean zero manual steps.
    const readyBoot = available.find(mechanism => usable(mechanism)
      && byMechanism.get(mechanism)?.bootCapable === true
      && byMechanism.get(mechanism)?.privileged === true)
    if (readyBoot)
      return readyBoot
    const ready = available.find(mechanism => usable(mechanism) && byMechanism.get(mechanism)?.privileged === true)
    if (ready)
      return ready
    const bootCapable = available.find(mechanism => usable(mechanism) && byMechanism.get(mechanism)?.bootCapable === true)
    if (bootCapable)
      return bootCapable
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

  async function safeActivate(provider: BootProvider, spec: BootSpec): Promise<BootStart | null> {
    if (provider.activate === undefined)
      return null
    try {
      return await provider.activate(spec)
    }
    catch {
      return null
    }
  }

  async function safeRetirement(provider: BootProvider, spec: BootSpec): Promise<BootRetirement | null> {
    if (provider.retireCommands === undefined)
      return null
    try {
      return await provider.retireCommands(spec)
    }
    catch {
      return null
    }
  }

  async function safeStop(provider: BootProvider, spec: BootSpec): Promise<string[][]> {
    if (provider.stopCommands === undefined)
      return []
    try {
      return await provider.stopCommands(spec)
    }
    catch {
      return []
    }
  }

  /** Every mechanism the OS currently has an entry for, whatever it is doing. */
  async function installedMechanisms(spec: BootSpec): Promise<BootProvider[]> {
    const probes = await Promise.all(providers.map(async provider => [provider, await safeStatus(provider, spec)] as const))
    return probes.filter(([, status]) => isInstalledState(status.state)).map(([provider]) => provider)
  }

  /**
   * Which mechanism a call means. An install may fall back to the
   * recommendation; every other call means one the OS actually has an entry
   * for, because uninstalling or starting a mechanism that was never installed
   * cannot succeed and must not be invented.
   */
  function pick(status: BootStatus, mechanism?: BootMechanism): BootProvider | undefined {
    return pickOf(mechanism ?? status.mechanism)
  }

  function pickOf(mechanism: BootMechanism | null | undefined): BootProvider | undefined {
    return mechanism === null || mechanism === undefined
      ? undefined
      : providers.find(provider => provider.mechanism === mechanism)
  }

  return {
    providers,

    detect: detectAll,

    status: buildStatus,

    async install(spec: BootSpec, mechanism?: BootMechanism) {
      const before = await buildStatus(spec, mechanism)
      const target = pickOf(mechanism ?? before.mechanism ?? before.recommended)
      if (!target) {
        return {
          ...failed(`no boot mechanism is available on ${platform}`),
          mechanism: null,
          status: before,
        }
      }

      // Retiring the mechanism we came from is *not* done here: its entry is the
      // one currently running the panel (and often this plugin), so removing it
      // first would stop everything before the new entry was told to start.
      // `activate()` carries that retirement, for the caller that stops the panel.
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
      const target = pick(before, mechanism)
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

    /**
     * The start steps for the installed mechanism, plus the retirement of every
     * other entry on this machine.
     *
     * A switch is the whole reason this exists: the old entry has to go, and it
     * can only go after the panel is down — retiring it first would stop the
     * panel, and the plugin with it, before the new entry was ever told to
     * start. So both halves are handed to one caller that runs them in order,
     * detached. Nothing is stopped here.
     */
    async activate(spec: BootSpec, mechanism?: BootMechanism): Promise<BootActivation | null> {
      const status = await buildStatus(spec, mechanism)
      const target = pick(status, mechanism)
      if (!target)
        return null
      const start = await safeActivate(target, spec)
      if (start === null)
        return null

      const others = (await installedMechanisms(spec))
        .filter(provider => provider.mechanism !== target.mechanism)
      const retirements = await Promise.all(others.map(async provider => [provider, await safeRetirement(provider, spec)] as const))
      const usable = retirements.filter((pair): pair is [BootProvider, BootRetirement] => pair[1] !== null)

      // The mechanism we are leaving has to stop the panel itself: its own
      // restart policy would bring the panel back the moment the CLI's `down`
      // returns, racing the entry that is about to start one.
      const supervised = status.mechanism !== null
        ? providers.find(provider => provider.mechanism === status.mechanism)
        : others.find(provider => provider.mechanism !== target.mechanism)
      const stop = supervised === undefined ? [] : await safeStop(supervised, spec)

      return {
        ...start,
        stop,
        // A mechanism whose entry cannot be removed without stopping the panel is
        // left alone here: one stale entry is better than a panel nothing starts.
        retire: usable.flatMap(([, retirement]) => retirement.commands),
        retired: usable.map(([provider]) => provider.mechanism),
        retireDisplay: usable.flatMap(([, retirement]) => retirement.display),
      }
    },
  }
}
