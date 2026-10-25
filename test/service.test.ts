import { Context } from '@deepseek-ai/cordis'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BootMechanism, BootStatus, HomeHostedStatus, InstanceView, ServerEntryView, WorkspaceSummary } from '../src/shared/contracts.js'
import { findEntry, readConfig } from '../src/home-hosted/config-file.js'
import { panelConfigSchema } from '../src/home-hosted/panel-schema.js'
import { DEFAULT_WORKSPACE, globalSettingsFile, hhDir, installedUiRecordFile, runFile, secretsFile, serversFile } from '../src/home-hosted/layout.js'
import { readStoredToken, storeToken, tokenSlot } from '../src/home-hosted/token.js'
import { panelConsolePath } from '../src/home-hosted/panel-console.js'
import { EXPECTED_RANGE } from '../src/home-hosted/resolve.js'
import { readLauncherRecord } from '../src/home-hosted/launcher.js'
import { canonicalPath } from '../src/home-hosted/instances.js'
import { HomeHostedService } from '../src/service.js'
import type { DshLaunch } from '../src/home-hosted/dsh-entry.js'
import type { BootLadderLike, BootInstallResult } from '../src/service.js'
import { takeoverHelperPath } from '../src/home-hosted/panel-control.js'
import type { ActivationPlan } from '../src/home-hosted/panel-control.js'
import type { BootActivation, BootSpec } from '../src/boot/types.js'
import type { PanelControlResult } from '../src/shared/contracts.js'
import { SettingsStore } from '../src/settings.js'
import { bootUnitName } from '../src/util/paths.js'
import type { RunResult } from '../src/util/exec.js'
import { makeHhHome } from './helpers/hh.js'
import { startStubPanel } from './helpers/stub-panel.js'
import type { StubPanel } from './helpers/stub-panel.js'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

/**
 * The default workspace's config in a root. Almost every case here uses the
 * plugin's managed workspace, which defaults to `default`.
 */
const configFile = (root: string): string => serversFile(root, DEFAULT_WORKSPACE)

const bootStatus: BootStatus = {
  platform: 'linux',
  mechanism: 'systemd-user',
  recommended: 'systemd-user',
  state: 'enabled-running',
  bootCapable: true,
  privileged: true,
  unitPath: '/home/tester/.config/systemd/user/home-hosted.service',
  commands: [],
  detail: 'stub ladder',
  candidates: [],
}

const ladder: BootLadderLike = {
  status: async () => bootStatus,
  install: async (): Promise<BootInstallResult> => ({ ok: true, changed: true, detail: 'installed', commands: [], needsPrivilege: false, mechanism: 'systemd-user', status: bootStatus }),
  uninstall: async (): Promise<BootInstallResult> => ({ ok: true, changed: true, detail: 'removed', commands: [], needsPrivilege: false, mechanism: null, status: bootStatus }),
    activate: async () => null,
    control: async () => null,
}

let scratch: TempDir | null = null
const panels: StubPanel[] = []
const savedServerId = process.env.HHOSTED_SERVER_ID

afterEach(async () => {
  // A test that moved the clock for the cache window restores it here, so a later test is not
  // running in a frozen `Date.now()`.
  vi.useRealTimers()
  while (panels.length > 0)
    await panels.pop()!.stop()
  scratch?.cleanup()
  scratch = null
  if (savedServerId === undefined)
    delete process.env.HHOSTED_SERVER_ID
  else
    process.env.HHOSTED_SERVER_ID = savedServerId
})

interface Harness {
  home: string
  state: string
  service: HomeHostedService
  settings: SettingsStore
  cliCalls: Array<{ args: string[], env: Record<string, string | undefined> }>
}

async function harness(options: {
  panel?: StubPanel
  panelVersion?: string
  cli?: string
  /** Called with each plaintext the CLI is handed, as a real `set-token` would
   *  enrol its hash: the stub panel then accepts that token. */
  onEnroll?: (token: string) => void
  /** Replaces the default CLI seam; `null` runs the resolved CLI for real. */
  execCli?: ((args: string[], env: Record<string, string | undefined>) => Promise<RunResult>) | null
  /** Replaces the running-harness probe, so a clone can be expressed from a test. */
  resolveDsh?: (options: { dshHome: string, stateDir: string }) => Promise<DshLaunch | null>
  /** Names of extra panels to create under the scratch dir and declare. */
  otherPanels?: string[]
  /** Replaces the boot ladder, for tests about what was written or retired. */
  ladder?: BootLadderLike
  /** Replaces an autostart entry's own start/stop step, so no service manager runs. */
  execControl?: (argv: string[]) => Promise<RunResult>
  /** How long a mechanism's start/stop is watched for; a short window keeps the suite fast. */
  controlWaitMs?: number
  /** Replaces the detached hand-over helper, so no process is spawned. */
  spawnActivation?: (stateDir: string, plan: ActivationPlan) => PanelControlResult
  /** The project the managed row belongs to; defaults to this process's cwd. */
  projectDir?: string
  /** The dsh surface this process runs in; defaults to `web`. */
  surface?: 'web' | 'desktop'
  /** Replaces the launcher preflight, which otherwise spawns the real CLI. */
  preflight?: (stateDir: string) => Promise<string | null>
  /** Replaces the global install, which otherwise spawns a package manager. */
  installGlobal?: (range: string) => Promise<{ ok: boolean, detail: string, output: string }>
} = {}): Promise<Harness> {
  scratch = tempDir()
  const home = path.join(scratch.path, 'home')
  const state = path.join(scratch.path, 'state')
  // The managed root is a 0.7 one: `.hh` with the `default` workspace registered.
  makeHhHome(home, { workspaces: ['default'] })
  fs.mkdirSync(state, { recursive: true })

  // A deterministic CLI path: a .mjs file is run through node, so no `which` probe.
  const fakeCli = options.cli ?? path.join(scratch.path, 'home-hosted.mjs')
  if (options.cli === undefined)
    fs.writeFileSync(fakeCli, '#!/usr/bin/env node\n', 'utf8')

  if (options.panel !== undefined)
    writeJsonFile(runFile(home), { version: options.panelVersion ?? '0.6.1', pid: process.pid, url: options.panel.url, port: 1234 })

  const otherPanels = (options.otherPanels ?? []).map((name) => {
    const dir = path.join(scratch!.path, name)
    makeHhHome(dir, {
      workspaces: ['default'],
      servers: { default: { meta: { writtenBy: '0.6.6', schema: panelConfigSchema()! }, servers: [{ id: 'web' }] } },
    })
    return dir
  })

  const cliCalls: Harness['cliCalls'] = []
  const settings = new SettingsStore(path.join(state, 'settings.json'), 'dsh')
  const service = new HomeHostedService(new Context(), {
    home,
    stateDir: state,
    homeHostedCommand: fakeCli,
    defaultEntryId: 'dsh',
    instanceRoots: otherPanels,
    surface: options.surface,
    // Pinned: the machine's own `$HHOSTED_HOME` and home directory must not
    // leak into a test.
    envHome: null,
    homeDir: scratch.path,
    settings,
    createLadder: () => options.ladder ?? ladder,
    execControl: options.execControl,
    controlWaitMs: options.controlWaitMs,
    // Stubbed, exactly as `execCli` is: the real preflight spawns the CLI and loads the
    // whole panel graph to print a version. `launcherVersion: null` is the honest default
    // here — no launcher was run — and the warning path has its own test.
    preflight: options.preflight ?? (async () => null),
    installGlobal: options.installGlobal,
    spawnActivation: options.spawnActivation ?? (() => ({ ok: true, detail: 'handed over' })),
    resolveDsh: options.resolveDsh,
    projectDir: options.projectDir,
    execCli: options.execCli === null ? undefined : options.execCli ?? (async (args, env): Promise<RunResult> => {
      cliCalls.push({ args, env })
      if (env.HHOSTED_TOKEN === undefined)
        writeJsonFile(secretsFile(home), { version: 2 })
      else
        writeJsonFile(secretsFile(home), { version: 2, apiToken: { hint: 'abcd', hash: 'x' } })
      if (env.HHOSTED_TOKEN !== undefined)
        options.onEnroll?.(env.HHOSTED_TOKEN)
      return { command: fakeCli, args, code: 0, signal: null, stdout: '', stderr: '', timedOut: false, error: null }
    }),
  })

  return { home, state, service, settings, cliCalls }
}

async function withPanel(harnessOptions: { acceptAnyToken?: boolean } = {}): Promise<StubPanel> {
  const panel = await startStubPanel({ acceptAnyToken: harnessOptions.acceptAnyToken ?? true })
  panels.push(panel)
  return panel
}

/**
 * The launcher preflight, which spawns the real CLI — that loads the whole panel graph
 * (~500 ms) to print a version — so it is stubbed for the suite and asserted here.
 *
 * The cost was paid on every `status()`, because a fresh service per test always misses the
 * 60 s cache; the page polls `status()` every 5 s and hits the same cache, so production
 * pays it once a minute. Measured: `test/service.test.ts` 26.4 s -> 4.1 s.
 */
/**
 * The `cli()` cache, whose window is a **promise about a count** — and was asserted nowhere.
 *
 * `writtenAt` in the launcher record is rewritten on every recomputation, so counting distinct
 * values counts how often `cli()` actually resolved. A test that only checked the *result* is
 * valid would pass with the cache removed entirely.
 */
describe('the cli cache', () => {
  /** Distinct `writtenAt` values are recomputations; a cache hit writes nothing new. */
  const stamps = (state: string): number[] => {
    const record = readLauncherRecord(state)
    return record === null ? [] : [record.writtenAt]
  }

  it('resolves once for repeated reads, and stops reusing it once the window passes', async () => {
    const { service, state } = await harness()
    // The first read resolves and writes the record.
    await service.status()
    const first = readLauncherRecord(state)
    expect(first, 'the first read must resolve and record').not.toBeNull()

    // Within the window: no new write, so the recorded stamp is unchanged.
    await service.status()
    await service.status()
    expect(readLauncherRecord(state)).toEqual(first)

    // Past the window: a new write, so the stamp moves. The clock is moved, not slept on —
    // a real 60 s wait would make this file 12x slower for the same assertion.
    vi.setSystemTime(Date.now() + 60_001)
    await service.status()
    const later = readLauncherRecord(state)
    expect(later).not.toBeNull()
    expect(later!.writtenAt, 'the window must expire, or a reinstall is never seen').toBeGreaterThan(first!.writtenAt)
  })

  it('drops the cache when a global install lands, so the new copy is seen at once', async () => {
    const installs: string[] = []
    const { service, state } = await harness({
      installGlobal: async (range) => {
        installs.push(range)
        return { ok: true, detail: 'installed', output: '' }
      },
    })
    await service.status()
    const first = readLauncherRecord(state)
    expect(first, 'the first read must resolve and record').not.toBeNull()

    await service.installGlobalCli()
    expect(installs, 'the seam must be the one that ran').toEqual([EXPECTED_RANGE])

    // Within the 60 s window, so only the explicit drop can make this move. Without it the
    // person installs the `global` copy and the page keeps reporting the old answer.
    await service.status()
    const after = readLauncherRecord(state)
    expect(after, 'the read after installing must also record').not.toBeNull()
    expect(
      after!.writtenAt,
      `installing globally must drop the cache; got the same record twice: ${JSON.stringify(after)}`,
    ).toBeGreaterThan(first!.writtenAt)
  })

  it('re-resolves when the preference changes, because the cache is keyed on it', async () => {
    const { service, state, settings } = await harness()
    await service.status()
    const first = readLauncherRecord(state)
    expect(first, 'the first read must resolve and record').not.toBeNull()

    // A `>=` assertion would pass even when the cache wrongly serves the old answer, so this
    // asserts the stamp **moved**. Checked while writing it, by printing both records: a
    // `prefer` change alone does not change which entry resolves in this fixture, which is why
    // the timestamp is the evidence and the entry path is not.
    settings.update({ cli: { prefer: 'global' } })
    await service.status()
    const after = readLauncherRecord(state)
    expect(after, 'the second read must also record').not.toBeNull()
    expect(
      after!.writtenAt,
      `a preference change must invalidate the cache; got the same record twice: ${JSON.stringify(after)}`,
    ).toBeGreaterThan(first!.writtenAt)
  })
})

/** The panel inventory's cache, whose window is likewise a promise about a count. */
describe('the instances cache', () => {
  it('serves the panel inventory from cache inside the window, and re-reads past it', async () => {
    // The inventory is read by every status poll and by the prompt provider at every assembly,
    // so "cached for a short while" is a promise about a **count of disk scans** — and a new
    // panel root appearing must still be seen once the window passes, or a panel someone just
    // started would never show up.
    const { service, home } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')
    const roots = (list: InstanceView[]): string[] => list.map(instance => instance.home).sort()
    expect(roots(await service.instances()), 'the declared panel is listed to begin with').toContain(canonicalPath(other))

    // It disappears from disk. Nothing tells the service, so only a re-scan can notice — which
    // is what makes this a count of scans rather than of results.
    fs.rmSync(other, { recursive: true, force: true })

    // Inside the window: the cached list still names it.
    expect(roots(await service.instances()), 'inside the window the cache is served').toContain(canonicalPath(other))

    // Past the window: re-read, so the gone root is gone. Moving the clock rather than sleeping
    // keeps the suite fast; `afterEach` restores real timers.
    vi.setSystemTime(Date.now() + 10_001)
    expect(roots(await service.instances()), 'past the window the disk is re-read').not.toContain(canonicalPath(other))
  })

})

describe('the launcher preflight', () => {
  it('reports the version the launcher answered, and nothing when it could not answer', async () => {
    // `cli` is optional in the DTO (an older panel may not carry it), so assert it is there
    // before reading through it.
    const answered = await harness({ preflight: async () => '0.7.3' })
    expect((await answered.service.status()).cli?.launcherVersion).toBe('0.7.3')

    // `null` is what the page turns into "the launcher did not answer" — the case a person
    // whose boot entry is broken needs to see.
    const refused = await harness({ preflight: async () => null })
    const status = await refused.service.status()
    expect(status.cli?.launcherVersion).toBeNull()
    expect(status.cli?.launcherPath).not.toBeNull()
  })
})

describe('home-hosted service', () => {
  it('reports a stopped panel and a missing entry without pretending otherwise', async () => {
    const { service, state, home } = await harness()
    const status = await service.status()
    // The page must be able to say which root and artifact this instance owns.
    expect(status.panelRoot).toBe(home)
    expect(status.panelRootSource).toBe('instance')
    expect(status.bootUnitName).toBe(bootUnitName(state))
    expect(status.panel.reachable).toBe(false)
    expect(status.panel.writeVia).toBe('file')
    // No panel answered, so the token was never measured: unknown, not absent.
    expect(status.panel.token).toBe('unknown')
    expect(status.panel.tokenVerified).toBe(false)
    expect(status.boot.state).toBe('enabled-running')
    expect(status.entries.map(entry => entry.intent.id)).toEqual(['dsh'])
    expect(status.entries[0]?.drift).toEqual(['missing entry'])
    expect(fs.existsSync(path.join(state, 'settings.json'))).toBe(false)
  })

  it('reports every panel it knows about, the managed one first', async () => {
    const { service, home } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')

    const status = await service.status()
    expect(status.instances?.map(instance => [instance.home, instance.managed, instance.servers])).toEqual([
      [home, true, 0],
      [other, false, 1],
    ])
    expect(status.instances?.[0]?.source).toBe('managed')
    expect(status.instances?.[1]?.source).toBe('configured')
  })

  it('re-measures a stale inventory, and reuses one that is still fresh', async () => {
    const { service, home } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')
    // A declared root without state is not a panel yet; giving it one is what a
    // first start looks like from here. A 0.7 root is its whole `.hh`.
    fs.rmSync(hhDir(other), { recursive: true, force: true })
    expect((await service.instances()).map(instance => instance.home)).toEqual([home])

    makeHhHome(other, {
      workspaces: ['default'],
      servers: { default: { meta: { writtenBy: '0.6.6', schema: panelConfigSchema()! }, servers: [] } },
    })
    // Inside the cache window nothing is re-read, so the prompt provider cannot
    // turn a fresh measure into a per-step disk scan.
    expect(service.instancesNow().map(instance => instance.home)).toEqual([home])

    // Expired: the synchronous path a prompt provider takes re-measures in place,
    // so a panel started while this dsh runs reaches the next model step.
    vi.useFakeTimers()
    try {
      vi.setSystemTime(Date.now() + 11_000)
      expect(service.instancesNow().map(instance => instance.home)).toEqual([home, other])
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('edits another panel through its config file, leaving this panel alone', async () => {
    const { service, home } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')

    const created = await service.call('servers.create', {
      entry: { id: 'notes', command: 'sleep', autostart: true },
      home: other,
    }) as { id: string, status: string }
    expect(created).toMatchObject({ id: 'notes', status: 'unknown' })
    // The two-phase add leaves the entry in place with the autostart it asked for.
    expect(findEntry(readConfig(other).raw!, 'notes')).toMatchObject({ command: 'sleep', autostart: true })
    // The panel this plugin manages was not touched.
    expect(fs.existsSync(configFile(home))).toBe(false)

    await service.call('servers.update', { id: 'notes', patch: { port: 6001 }, home: other })
    expect(findEntry(readConfig(other).raw!, 'notes')).toMatchObject({ port: 6001 })

    await service.call('servers.delete', { id: 'notes', home: other })
    expect(findEntry(readConfig(other).raw!, 'notes')).toBeNull()
  })

  it('starts, stops and restarts another panel through its own CLI', async () => {
    const { service, home, cliCalls } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')

    const started = await service.call('servers.start', { id: 'web', home: other })
    expect(started).toMatchObject({ id: 'web', action: 'start', via: 'cli', home: other })
    // The CLI is told which workspace too: a server id is only unique inside one.
    expect(cliCalls[0]?.args).toEqual(['start', 'web', '--workspace', 'default', '--home', other])
    expect(cliCalls[0]?.env.HHOSTED_HOME).toBe(other)

    // A restart is ONE command: the entry is never down for a caller to observe,
    // and a failure leaves it as it was.
    const restarted = await service.call('servers.restart', { id: 'web', home: other })
    expect(restarted).toMatchObject({ id: 'web', action: 'restart', via: 'cli' })
    expect(cliCalls.slice(1).map(call => call.args)).toEqual([
      ['restart', 'web', '--workspace', 'default', '--home', other],
    ])
  })

  /**
   * Every supported panel knows `restart <id>`, so there is no fallback to prove:
   * a refusal is reported, never retried as a different command. The stop-then-start
   * pair it used to degrade to could leave the entry **down** when the start did not
   * follow, and only an out-of-support panel could ever have needed it.
   */
  it('reports a failed restart instead of retrying it as stop+start', async () => {
    const calls: string[][] = []
    const { service, home } = await harness({
      otherPanels: ['other-panel'],
      execCli: async (args): Promise<RunResult> => {
        calls.push(args)
        if (args[0] === 'restart')
          return { command: 'hh', args, code: 1, signal: null, stdout: '', stderr: 'unknown entry "web"', timedOut: false, error: null }
        return { command: 'hh', args, code: 0, signal: null, stdout: '', stderr: '', timedOut: false, error: null }
      },
    })
    const other = path.join(path.dirname(home), 'other-panel')

    await expect(service.call('servers.restart', { id: 'web', home: other }))
      .rejects.toMatchObject({ code: 'CLI_FAILED', message: expect.stringContaining('unknown entry') })
    // One command, and the entry was never stopped.
    expect(calls.map(call => call[0])).toEqual(['restart'])
  })

  it('rejects a panel it does not report, and refuses a target on an endpoint that has none', async () => {
    const { service, home } = await harness({ otherPanels: ['other-panel'] })
    await expect(service.call('servers.delete', { id: 'x', home: '/nowhere' }))
      .rejects.toMatchObject({ code: 'INSTANCE_UNKNOWN' })
    await expect(service.call('boot.verify', { home: path.join(path.dirname(home), 'other-panel') } as never))
      .rejects.toMatchObject({ code: 'INSTANCE_UNSUPPORTED' })
    // The console read is about the panel this plugin manages, like the boot entry:
    // it reads *this* root's log, so aiming it elsewhere must refuse rather than
    // silently answer about the managed panel.
    await expect(service.call('panel.console', { home: path.join(path.dirname(home), 'other-panel') } as never))
      .rejects.toMatchObject({ code: 'INSTANCE_UNSUPPORTED' })
  })

  it('reads the managed panel\'s console, and reports a missing one as empty', async () => {
    const { service, home } = await harness()
    // Nothing has started here, so there is no console yet — an empty read, not a
    // failure: reporting that as an error would make the one diagnostic that always
    // works look broken.
    const absent = await service.call('panel.console', {}) as { path: string, lines: string[], error: string | null }
    expect(absent.error).toBeNull()
    expect(absent.lines).toEqual([])
    expect(absent.path).toBe(panelConsolePath(home))

    // A console that exists is read back, oldest first.
    fs.mkdirSync(path.dirname(absent.path), { recursive: true })
    fs.writeFileSync(absent.path, 'first\nsecond\nthird\n')
    const read = await service.call('panel.console', { lines: 2 }) as { lines: string[] }
    expect(read.lines).toEqual(['second', 'third'])
  })

  it('caps an absurd line count instead of reading a whole disk', async () => {
    const { service, home } = await harness()
    const file = panelConsolePath(home)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, `${Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')}\n`)
    // The cap bounds the request; the answer is still the whole (short) log.
    const all = await service.call('panel.console', { lines: 1e9 }) as { lines: string[] }
    expect(all.lines).toHaveLength(20)
    // A negative count means "the whole log", the same as `lines: 0`.
    const negative = await service.call('panel.console', { lines: -5 }) as { lines: string[] }
    expect(negative.lines).toHaveLength(20)
  })

  it('keeps a foreign entry found by its id, and refuses an impossible write', async () => {
    const { service, home } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')

    // A patch never renames: the entry stays where it was found.
    await service.call('servers.update', { id: 'web', patch: { id: 'renamed', port: 6002 }, home: other })
    expect(findEntry(readConfig(other).raw!, 'web')).toMatchObject({ id: 'web', port: 6002 })
    expect(findEntry(readConfig(other).raw!, 'renamed')).toBeNull()

    await expect(service.call('servers.create', { entry: { id: 'web', command: 'sleep' }, home: other }))
      .rejects.toMatchObject({ code: 'DUPLICATE_SERVER' })
    await expect(service.call('servers.delete', { id: 'missing', home: other }))
      .rejects.toMatchObject({ code: 'UNKNOWN_SERVER' })
    await expect(service.call('servers.list', { home: '/tmp' }))
      .rejects.toMatchObject({ code: 'INSTANCE_UNKNOWN' })
    await expect(service.call('servers.list', { home: 42 } as never))
      .rejects.toMatchObject({ code: 'INSTANCE_INVALID' })

    // A config that is not there is refused, never created from a list call.
    fs.rmSync(configFile(other))
    await expect(service.call('servers.list', { home: other }))
      .rejects.toMatchObject({ code: 'CONFIG_UNREADABLE' })
    expect(fs.existsSync(configFile(other))).toBe(false)
  })

  it('mints a token and drives another panel through its own API', async () => {
    const panel = await withPanel()
    const { service, home, cliCalls } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')
    // A running panel at that state root: its run.json names the listener.
    writeJsonFile(runFile(other), { version: '0.6.6', pid: process.pid, url: panel.url, port: 1234 })
    panel.servers.push({ id: 'web', status: 'running', pid: 7, config: { id: 'web', command: 'sleep' } })

    const listed = await service.call('servers.list', { home: other, via: 'api' }) as ServerEntryView[]
    expect(listed.map(entry => [entry.id, entry.status])).toEqual([['web', 'running']])
    // The token was enrolled through the CLI against that state root, and kept
    // under its own slot, not the managed panel's.
    expect(cliCalls[0]?.args).toEqual(['--home', other, 'set-token'])
    expect(readStoredToken(path.join(path.dirname(home), 'state'), tokenSlot(other))).not.toBeNull()
    expect(fs.existsSync(path.join(path.dirname(home), 'state', 'panel-token'))).toBe(false)
  })

  it('reads another panel through a token it already holds, minting nothing', async () => {
    const panel = await startStubPanel({ token: 'foreign-stub-token' })
    panels.push(panel)
    const { service, home, cliCalls } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')
    writeJsonFile(runFile(other), { version: '0.6.6', pid: process.pid, url: panel.url, port: 1234 })
    panel.servers.push({ id: 'web', status: 'running', pid: 7, config: { id: 'web', command: 'sleep' } })
    storeToken(path.join(path.dirname(home), 'state'), 'foreign-stub-token', tokenSlot(other))

    // No mechanism named: a read uses what it holds rather than minting one.
    const listed = await service.call('servers.list', { home: other }) as ServerEntryView[]
    expect(listed.map(entry => [entry.id, entry.status])).toEqual([['web', 'running']])
    expect(cliCalls).toHaveLength(0)
  })

  it('refuses an API target with no running panel, and an unknown mechanism', async () => {
    const { service, home } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')
    await expect(service.call('servers.list', { home: other, via: 'api' }))
      .rejects.toMatchObject({ code: 'PANEL_UNAVAILABLE' })
    await expect(service.call('servers.list', { home: other, via: 'telepathy' } as never))
      .rejects.toMatchObject({ code: 'MECHANISM_UNSUPPORTED' })
    // ui.manage has no API mechanism at all.
    await expect(service.call('ui.manage', { action: 'status', home: other, via: 'api' } as never))
      .rejects.toMatchObject({ code: 'MECHANISM_UNSUPPORTED' })
  })

  it('reads another panel from its config, with no live status', async () => {
    const { service, home } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')
    const listed = await service.call('servers.list', { home: other }) as ServerEntryView[]
    expect(listed).toEqual([{ id: 'web', workspace: 'default', status: 'unknown', pid: null, url: null, config: { id: 'web' } }])
  })

  it('enrols a token through the CLI and adopts an existing entry over the API', async () => {
    const panel = await withPanel()
    const { service, settings, cliCalls } = await harness({ panel })
    const state = path.join(scratch!.path, 'state')

    panel.servers.push({
      id: 'dsh',
      status: 'running',
      pid: 4242,
      config: { id: 'dsh', command: 'dsh', args: ['web'], onPortConflict: 'block', autostart: false, stop: { graceMs: 1000 } },
    })

    const status = await service.status()
    expect(status.panel.reachable).toBe(true)
    expect(status.panel.writeVia).toBe('api')
    expect(status.entries[0]?.drift).toEqual(['autostart', 'onPortConflict', 'persistent', 'stop.killPortHolders'])

    const entries = await service.call('entries.apply', {
      intents: [{ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true }],
      adopt: true,
    }) as Array<{ drift: string[] }>

    expect(entries[0]?.drift).toEqual([])
    // The caller asked for `kill` explicitly, so that is what it keeps. The
    // intent still asks for persistence, but this panel is older than the
    // support, so the write carries no such key and no drift is reported.
    expect(settings.intentFor('dsh')).toEqual({
      id: 'dsh',
      autostart: true,
      onPortConflict: 'kill',
      stopKillPortHolders: true,
      persistent: true,
    })

    // Only the owned keys were sent, and the person's own fields survived.
    const live = panel.servers[0]!.config
    expect(live.onPortConflict).toBe('kill')
    expect(live.autostart).toBe(true)
    expect(live.stop).toEqual({ graceMs: 1000, killPortHolders: true })
    // The row named a bare `dsh`; the resolve pins it to the image this
    // harness runs, so a later PATH change cannot redirect the boot.
    expect(live.command).toBe(process.execPath)
    expect(live.args).toEqual([path.join(state, 'bin', 'dsh.mjs'), 'web'])

    // The token was minted once, through the CLI, and never sent to the browser.
    expect(cliCalls).toHaveLength(1)
    expect(cliCalls[0]?.args).toEqual(['--home', path.join(scratch!.path, 'home'), 'set-token'])
  })

  it('detects drift after someone edits the entry by hand', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    panel.servers.push({ id: 'dsh', config: { id: 'dsh', onPortConflict: 'kill', autostart: true, stop: { killPortHolders: true } } })
    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true }] })

    panel.servers[0]!.config.onPortConflict = 'block'
    const status = await service.status()
    expect(status.entries[0]?.drift).toEqual(['onPortConflict'])
  })

  it('pauses without stopping anything, and restores the entry it adopted', async () => {
    const panel = await withPanel()
    const { service, settings } = await harness({ panel })
    panel.servers.push({ id: 'dsh', config: { id: 'dsh', command: 'dsh', autostart: false, onPortConflict: 'warn' } })

    const policy = process.platform === 'win32' ? 'kill' : 'follow'
    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true, onPortConflict: policy, stopKillPortHolders: true }], adopt: true })
    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: false, onPortConflict: policy, stopKillPortHolders: true }] })
    expect(panel.servers[0]!.config.autostart).toBe(false)
    // A pause never issues a start/stop action.
    expect(panel.requests.some(entry => entry.path.endsWith('/stop') || entry.path.endsWith('/start'))).toBe(false)

    await service.call('entries.restore', { id: 'dsh' })
    expect(panel.servers[0]!.config.onPortConflict).toBe('warn')
    expect(settings.get().entries).toEqual([])
    expect(settings.intentFor('dsh').onPortConflict).toBe(process.platform === 'win32' ? 'kill' : 'follow')
  })

  it('refuses to restore an entry it never adopted, instead of writing schema defaults over it', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    panel.servers.push({ id: 'dsh', config: { id: 'dsh', command: 'dsh', autostart: true, onPortConflict: 'follow', stop: { killPortHolders: true } } })

    await expect(service.call('entries.restore', { id: 'dsh' })).rejects.toMatchObject({ code: 'NOT_ADOPTED' })
    // Nothing was written: the person's own policy is still exactly as it was.
    expect(panel.servers[0]!.config).toMatchObject({ autostart: true, onPortConflict: 'follow', stop: { killPortHolders: true } })
    expect(panel.requests.some(entry => entry.method === 'PATCH')).toBe(false)
  })

  it('refuses to delete the entry this process runs as, and allows any other', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    panel.servers.push({ id: 'dsh', config: { id: 'dsh' } })
    panel.servers.push({ id: 'other', config: { id: 'other', command: 'sleep' } })

    process.env.HHOSTED_SERVER_ID = 'dsh'
    await expect(service.call('servers.delete', { id: 'dsh' })).rejects.toMatchObject({ code: 'SELF_ENTRY' })

    await service.call('servers.delete', { id: 'other' })
    expect(panel.servers.map(entry => entry.id)).toEqual(['dsh'])
  })

  it('starts and stops a server through the panel', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    panel.servers.push({ id: 'other', config: { id: 'other', command: 'sleep' } })

    await service.call('servers.start', { id: 'other' })
    expect(panel.servers[0]!.status).toBe('running')
    await service.call('servers.stop', { id: 'other' })
    expect(panel.servers[0]!.status).toBe('stopped')
    // The answer is the panel's own `freePortResultSchema` shape. This used to assert
    // `{ stopped: [] }`, a field no release sends, so the test pinned a fiction.
    expect(await service.call('servers.freePort', { id: 'other' })).toMatchObject({ free: true, skipped: [] })
  })

  it('falls back to an atomic config write when the panel is not running', async () => {
    const { service, home } = await harness()
    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true }] })

    const written = readConfig(home).raw!
    const entry = (written.servers ?? []).find(candidate => candidate.id === 'dsh')!
    expect(entry.onPortConflict).toBe('kill')
    expect(entry.autostart).toBe(true)
    expect(entry.stop).toMatchObject({ killPortHolders: true })
    expect(written.meta?.writtenBy).toBeDefined()
    expect(configFile(home).endsWith('servers.config.json')).toBe(true)
  })

  /**
   * A mechanism name that is not one is refused by name, not passed through.
   *
   * The dispatch cast `input.mechanism as BootMechanism`, so a mistyped `systemd_user` reached
   * the ladder, found no provider for it, and came back as **"no boot mechanism is available on
   * linux"** — false (mechanisms are plainly available) and silent about the actual mistake.
   * The refusal names the value and what would be accepted instead.
   */
  it('refuses a mechanism that is not one, and says which are', async () => {
    for (const bad of ['systemd_user', 'restart', 'zebra', 'auto']) {
      const { service } = await harness()
      await expect(service.call('boot.install', { mechanism: bad }), bad)
        .rejects.toMatchObject({ code: 'INVALID_MECHANISM', message: expect.stringContaining(JSON.stringify(bad)) })
      // And the message lists the real ones, including the exact value the caller nearly meant.
      await expect(service.call('boot.install', { mechanism: bad })).rejects.toThrow(/systemd-user/)
    }
  })

  it('still accepts a real mechanism and an omitted one', async () => {
    const { service } = await harness()
    // Omitted is "let the host choose" and stays valid.
    await expect(service.call('boot.install', {})).resolves.toBeDefined()
    // And a named one is not refused for being named.
    await expect(service.call('boot.install', { mechanism: 'systemd-user' })).resolves.toBeDefined()
  })

  it('toggles agent tools through settings.update and reflects boot installs', async () => {
    const { service, settings } = await harness()
    await service.call('settings.update', { patch: { agentTools: { enabled: true, allow: ['status'] } } })
    expect(settings.get().agentTools).toMatchObject({ enabled: true, allow: ['status'] })

    const installed = await service.call('boot.install', {}) as { result: { ok: boolean } }
    expect(installed.result.ok).toBe(true)
    expect(settings.get().autostart.enabled).toBe(true)

    await service.call('boot.uninstall', {})
    expect(settings.get().autostart.enabled).toBe(false)
  })

  it('rejects an unknown endpoint and an invalid entry id', async () => {
    const { service } = await harness()
    await expect(service.call('nope' as never, {})).rejects.toMatchObject({ code: 'UNKNOWN_ENDPOINT' })
    // And a near miss names the endpoint probably meant, so a reader does not have to consult
    // the source. `nope` is far from everything, so it stays silent — a wrong hint would be
    // worse than none.
    await expect(service.call('servers.lst' as never, {}))
      .rejects.toThrow(/unknown endpoint "servers\.lst"; did you mean "servers\.list"\?/)
    await expect(service.call('nope' as never, {})).rejects.toThrow(/^unknown endpoint "nope"$/)
    await expect(service.call('entries.apply', { intents: [{ id: 'BAD ID', autostart: true }] })).rejects.toMatchObject({ code: 'INVALID_ID' })
  })

  it('refuses a conflict policy the panel could not parse, before writing anything', async () => {
    const { service, home } = await harness()
    await expect(service.call('entries.apply', {
      intents: [{ id: 'dsh', autostart: true, onPortConflict: 'explode' }],
    })).rejects.toMatchObject({ code: 'INVALID_POLICY' })
    expect(readConfig(home).raw).toBeNull()
  })

  /**
   * The same patch must fail the same way whichever path would carry it. The
   * panel's schema declares these three groups optional but not nullable, so its
   * API answers 400; the file path used to write the `null` straight through and
   * produce a config the panel then refuses to boot from.
   */
  it('refuses a null patch group before choosing a write path', async () => {
    const { service, home } = await harness()
    for (const key of ['restart', 'health', 'stop']) {
      await expect(service.call('servers.update', {
        id: 'web',
        patch: { [key]: null },
      })).rejects.toMatchObject({ code: 'INVALID_PATCH' })
    }
    // Refused before anything was written.
    expect(readConfig(home).raw).toBeNull()
  })

  it('records that the harness is managed, and clears it only for the harness entry', async () => {
    const panel = await withPanel()
    const { service, settings } = await harness({ panel })
    // This test removes the harness entry, which is refused while this process is
    // the one it names.
    delete process.env.HHOSTED_SERVER_ID
    panel.servers.push({ id: 'other', config: { id: 'other', command: 'sleep' } })

    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true }] })
    expect(settings.get().manageDsh).toBe(true)

    // Another entry's lifecycle must not clear the harness flag.
    await service.call('entries.apply', { intents: [{ id: 'other', autostart: true }] })
    await service.call('entries.remove', { id: 'other' })
    expect(settings.get().manageDsh).toBe(true)

    await service.call('entries.remove', { id: 'dsh' })
    expect(settings.get().manageDsh).toBe(false)
  })

  it('restores an adopted entry that inherited the owned keys, instead of deleting it', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    // The person's own entry: no explicit autostart/onPortConflict/stop at all.
    panel.servers.push({ id: 'other', config: { id: 'other', command: 'sleep' } })

    await service.call('entries.apply', { intents: [{ id: 'other', autostart: true }] })
    await service.call('entries.remove', { id: 'other' })

    expect(panel.servers.some(entry => entry.id === 'other')).toBe(true)
    expect(panel.requests.some(entry => entry.method === 'DELETE')).toBe(false)
    expect(panel.servers[0]!.config).toMatchObject({ autostart: false, onPortConflict: 'block' })
  })

  it('pauses the entry this process runs as when this plugin created it', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    // No pre-existing entry: the plugin creates it, so there is nothing of the
    // person's to restore and deleting it would end this very session.
    process.env.HHOSTED_SERVER_ID = 'dsh'
    try {
      await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true }] })
      expect(panel.servers.map(entry => entry.id)).toEqual(['dsh'])

      await service.call('entries.remove', { id: 'dsh' })

      expect(panel.requests.some(request => request.method === 'DELETE')).toBe(false)
      expect(panel.servers[0]?.config.autostart).toBe(false)
    }
    finally {
      delete process.env.HHOSTED_SERVER_ID
    }
  })

  it('restores an entry this plugin merely adopted instead of removing it', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    panel.servers.push({
      id: 'other',
      status: 'stopped',
      pid: null,
      config: { id: 'other', command: 'sleep', args: ['1'], autostart: false, onPortConflict: 'block' },
    })
    await service.call('entries.apply', { intents: [{ id: 'other', autostart: true, onPortConflict: 'follow', stopKillPortHolders: true }] })
    expect(panel.servers[0]?.config.onPortConflict).toBe('follow')

    await service.call('entries.remove', { id: 'other' })

    expect(panel.requests.some(request => request.method === 'DELETE')).toBe(false)
    expect(panel.servers[0]?.config.autostart).toBe(false)
    expect(panel.servers[0]?.config.onPortConflict).toBe('block')
  })
})

describe('the dsh Desktop client', () => {
  it('reports the surface, and still manages ordinary servers', async () => {
    const panel = await withPanel()
    const { service, home } = await harness({ panel, surface: 'desktop' })
    writeJsonFile(serversFile(home, DEFAULT_WORKSPACE), {
      meta: { writtenBy: '0.6.6', schema: panelConfigSchema()! },
      servers: [{ id: 'gitea', command: 'gitea', autostart: true }],
    })

    const status = await service.status()
    expect(status.surface).toBe('desktop')
    // The harness entry is reported, but never as something this surface manages.
    expect(status.entries.map(entry => entry.intent.id)).toEqual(['dsh'])
    expect(status.entries[0]?.managed).toBe(false)

    // Server management is the point of the plugin and is untouched by Desktop.
    const created = await service.call('servers.create', {
      workspace: DEFAULT_WORKSPACE,
      entry: { id: 'jellyfin', command: 'jellyfin', autostart: true },
    }) as { id: string }
    expect(created.id).toBe('jellyfin')
  })

  it('refuses to manage the harness entry, and says the entry is web only', async () => {
    const { service, settings } = await harness({ surface: 'desktop' })

    await expect(service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true }] }))
      .rejects.toMatchObject({ code: 'DESKTOP_ENTRY_UNSUPPORTED' })
    await expect(service.call('entries.remove', { id: 'dsh' }))
      .rejects.toMatchObject({ code: 'DESKTOP_ENTRY_UNSUPPORTED' })

    // Nothing was recorded, so the page cannot show a toggle that lied.
    expect(settings.get().manageDsh).toBe(false)
  })

  it('refuses a paused harness intent too, so Desktop never writes the entry at all', async () => {
    const panel = await withPanel()
    const { service, settings } = await harness({ panel, surface: 'desktop' })
    settings.update({ manageDsh: true, entries: [{ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true, persistent: true }] })

    // Turning the toggle off is still a write of the harness entry: paused is not
    // the same as absent, and a row written here could only crash-loop.
    await expect(service.call('entries.apply', { intents: [{ id: 'dsh', autostart: false }] }))
      .rejects.toMatchObject({ code: 'DESKTOP_ENTRY_UNSUPPORTED' })
    await expect(service.call('entries.remove', { id: 'dsh' }))
      .rejects.toMatchObject({ code: 'DESKTOP_ENTRY_UNSUPPORTED' })

    expect(panel.servers.some(server => server.id === 'dsh')).toBe(false)
    expect(panel.requests.some(request => request.method === 'POST' || request.method === 'PATCH')).toBe(false)
    expect(settings.get().manageDsh).toBe(true)
  })

  it('leaves an ordinary entry alone, so only the harness entry is surface-bound', async () => {
    const panel = await withPanel()
    const { service, settings } = await harness({ panel, surface: 'desktop' })
    await service.call('servers.create', {
      workspace: DEFAULT_WORKSPACE,
      entry: { id: 'gitea', command: 'gitea', autostart: false, onPortConflict: 'block' },
    })

    await service.call('entries.apply', { intents: [{ id: 'gitea', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true }] })

    expect(settings.intentFor('gitea').autostart).toBe(true)
    expect(panel.servers.find(server => server.id === 'gitea')?.config.onPortConflict).toBe('kill')
  })

  it('never puts a deleted harness entry back, because Desktop starts its own profile', async () => {
    const panel = await withPanel()
    const { service, settings } = await harness({ panel, surface: 'desktop' })
    settings.update({ manageDsh: true, entries: [{ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true, persistent: true }] })

    await service.reconcile()
    await service.status()

    // The intent survives, but no create call was ever made: `dsh --profile
    // desktop` is refused by the CLI, so a row here could only crash-loop.
    expect(panel.requests.some(request => request.method === 'POST')).toBe(false)
  })
})

describe('panel lifecycle from the page', () => {
  it('writes the chosen panel port into .hh/settings.json before starting it', async () => {
    const { home, service, settings } = await harness()
    writeJsonFile(globalSettingsFile(home), {
      meta: { writtenBy: 'x', schema: panelConfigSchema()! },
      control: { port: 3999, host: '127.0.0.1' },
    })
    settings.update({ panel: { port: 6311 } })

    await service.startPanelNow()

    const written = JSON.parse(fs.readFileSync(globalSettingsFile(home), 'utf8'))
    expect(written.control.port).toBe(6311)
    // Everything else in the file survives the write.
    expect(written.control.host).toBe('127.0.0.1')
    // The plugin records that it wrote the file, and keeps the schema the file
    // already declared.
    expect(written.meta).toEqual({ writtenBy: 'dsh-home-hosted', schema: panelConfigSchema() })
    // The listener never lives in a workspace's servers config.
    expect(fs.existsSync(configFile(home))).toBe(false)
  })

  it('leaves the port alone when the setting is empty', async () => {
    const { home, service } = await harness()
    writeJsonFile(globalSettingsFile(home), { control: { port: 3999 } })
    await service.startPanelNow()
    expect(JSON.parse(fs.readFileSync(globalSettingsFile(home), 'utf8')).control.port).toBe(3999)
  })

  it('never writes a port the panel itself could not parse', async () => {
    const { home, service, settings } = await harness()
    writeJsonFile(globalSettingsFile(home), { control: { port: 3999 } })
    settings.update({ panel: { port: 3999.5 } })
    await service.startPanelNow()
    expect(JSON.parse(fs.readFileSync(globalSettingsFile(home), 'utf8')).control.port).toBe(3999)
  })

  /**
   * The UI record is read from the root the panel writes it in.
   *
   * `uiManage('status')` had no test at all, and the path it read was one directory above
   * `.hh` — a missing file is a legitimate answer there ("no custom UI"), so a custom UI
   * reported as the stock one with nothing failing. Driven through the service rather than
   * asserted on the path, because the path helper being right says nothing about which
   * function the service calls.
   */
  it('reports the UI an installed one through the record the panel actually wrote', async () => {
    const { home, service } = await harness()
    writeJsonFile(installedUiRecordFile(home), { name: 'noc-console', version: '1.2.3', repo: 'acme/console', tag: 'v1.2.3' })
    const result = await service.uiManage('status')
    expect(result.ui).toEqual({ name: 'noc-console', version: '1.2.3', repo: 'acme/console', tag: 'v1.2.3' })
    expect(result.detail).toContain('noc-console')
  })

  it('says the stock UI is in use when no record exists', async () => {
    const { service } = await harness()
    const result = await service.uiManage('status')
    expect(result.ui).toBeNull()
    expect(result.detail).toBe('the panel is using its stock UI')
  })

  it('says why a panel CLI could not be run instead of only that it failed', async () => {
    // A directory exists but cannot be executed, which is how a broken CLI looks.
    const { service } = await harness({ cli: os.tmpdir(), execCli: null })
    const result = await service.uiManage('update')
    expect(result.ok).toBe(false)
    expect(result.output ?? '').not.toBe('')
  })

  it('installs an official UI through ui-switch --asset, not a downloaded zip', async () => {
    const { service, cliCalls } = await harness()
    const result = await service.uiManage('switch', { asset: 'noc-console' })
    expect(result.ok).toBe(true)
    // The panel's own CLI does the release lookup, matching and download; the
    // plugin only names the asset.
    expect(cliCalls.at(-1)?.args.slice(1)).toEqual(['ui-switch', '--asset', 'noc-console', '--yes', '--home', expect.any(String)])
    expect(result.detail).toContain('noc-console')
  })

  it('forwards a repo and tag so an asset outside the default release can be used', async () => {
    const { service, cliCalls } = await harness()
    await service.uiManage('switch', { asset: 'noc-console', repo: 'acme/console', tag: 'v2.1.0' })
    expect(cliCalls.at(-1)?.args.slice(1)).toEqual([
      'ui-switch', '--asset', 'noc-console', '--yes',
      '--repo', 'acme/console', '--tag', 'v2.1.0',
      '--home', expect.any(String),
    ])
  })

  it('still installs a local zip, and refuses a source that names neither', async () => {
    // Inside this test's own scratch dir, never a fixed name in the shared tmpdir:
    // a leftover `/tmp/ui.zip` owned by another user turned this into EACCES, which
    // is a property of the machine rather than of the code under test.
    const { service, cliCalls, home } = await harness()
    const file = path.join(home, 'ui.zip')
    fs.writeFileSync(file, 'zip')
    const result = await service.uiManage('switch', { file })
    expect(result.ok).toBe(true)
    expect(cliCalls.at(-1)?.args.slice(1)).toEqual(['ui-switch', '--file', file, '--yes', '--home', expect.any(String)])

    await expect(service.uiManage('switch', {}))
      .rejects.toMatchObject({ code: 'UI_SOURCE_REQUIRED' })
    await expect(service.uiManage('switch', { file: path.join(home, 'nope.zip') }))
      .rejects.toMatchObject({ code: 'UI_FILE_MISSING' })
  })

  it('starts nothing when a panel already answers', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    const result = await service.startPanelNow() as { ok: boolean, detail: string }
    expect(result.ok).toBe(true)
    expect(result.detail).toContain('already answering')
  })

  it('refuses to replace a panel when no adopted entry would start one again', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    // The stub panel answers and its version differs from the CLI's, but no `dsh`
    // entry is adopted with autostart — so nothing would bring a panel back.
    await expect(service.takeoverPanel()).rejects.toMatchObject({ code: 'TAKEOVER_UNSAFE' })
  })

  /**
   * The guard asks about the *managed entry*, not about who spawned this process.
   *
   * It used to require `selfEntryId()`, so a panel started by anything other than itself — a
   * hand-run `up`, a distro unit, another supervisor — refused every replacement with
   * `TAKEOVER_UNSAFE`. That is precisely the case the button exists for: two copies disagreeing.
   */
  it('replaces a panel it did not spawn, as long as the adopted entry has autostart', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    // Adopted with autostart, and this process is *not* one of the panel's servers:
    // the panel answers, so its own server list is what `liveEntries()` reads.
    panel.servers.push({ id: 'dsh', config: { id: 'dsh', command: 'dsh', autostart: true, persistent: true } })
    delete process.env.HHOSTED_SERVER_ID

    const result = await service.takeoverPanel()
    expect(result.ok).toBe(true)
    expect(result.detail).toMatch(/replacing the panel/i)
  })

  it('still refuses when this session runs as a non-persistent entry of that panel', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    panel.servers.push({ id: 'dsh', config: { id: 'dsh', autostart: true, persistent: false } })
    process.env.HHOSTED_SERVER_ID = 'dsh'
    // `down` stops every non-persistent entry, so this session would not survive to
    // see the swap finish — a different question from "is an entry adopted".
    await expect(service.takeoverPanel()).rejects.toMatchObject({ code: 'TAKEOVER_UNSAFE' })
  })

  it('reports no takeover when nothing is answering', async () => {
    const { service } = await harness()
    const result = await service.takeoverPanel() as { ok: boolean, detail: string }
    // Without a panel the call degrades to a start, and the fake CLI answers nothing.
    expect(result.ok).toBe(true)
  })

  it('stops the answering panel through the CLI down command', async () => {
    const panel = await withPanel()
    const { home, service, cliCalls } = await harness({ panel })
    const result = await service.stopPanelNow()
    expect(result.ok).toBe(true)
    expect(result.detail).toContain('stopped')
    const down = cliCalls.find(call => call.args.includes('down'))
    expect(down).toBeDefined()
    // The panel it stops is the managed root, not whatever the default is.
    expect(down!.args).toEqual(expect.arrayContaining(['down', '--home', home]))
  })

  it('reports nothing to stop when no panel is answering', async () => {
    const { service, cliCalls } = await harness()
    const result = await service.stopPanelNow()
    expect(result.ok).toBe(true)
    expect(result.detail).toContain('nothing to stop')
    // Nothing answered, so no CLI was asked to stop one.
    expect(cliCalls.some(call => call.args.includes('down'))).toBe(false)
  })

  it('refuses to stop a panel when there is no CLI that could stop it', async () => {
    const panel = await withPanel()
    // A CLI that is not there resolves to nothing, so stopping cannot even start.
    const { service } = await harness({ panel, cli: path.join(os.tmpdir(), 'dsh-home-hosted-no-such-cli.mjs') })
    await expect(service.stopPanelNow()).rejects.toMatchObject({ code: 'CLI_NOT_FOUND' })
  })
})

/**
 * The bug this suite exists for: a panel supervised by an installed autostart
 * entry cannot be stopped through the CLI.
 *
 * `Restart=always`/`KeepAlive` read the CLI's `down` as an unexpected death and
 * start the panel again a few seconds later, so "Stop the panel" came back on its
 * own — a stop the page reported and the machine did not honour. The reverse is
 * the same rule: a CLI `up` starts a panel outside the entry, which the entry can
 * then neither stop nor observe. So both actions go through the mechanism that
 * supervises the panel when one is installed, and through the CLI only when
 * nothing is.
 */
describe('panel start and stop go through the installed entry', () => {
  /** A ladder reporting `mechanism` installed, whose control steps are recorded. */
  function entryLadder(mechanism: BootMechanism | null, steps: { start: string[][], stop: string[][] }) {
    const installed = mechanism !== null
    const status: BootStatus = {
      ...bootStatus,
      mechanism,
      state: installed ? 'enabled-running' : 'not-installed',
    }
    return {
      status: async () => status,
      install: async (): Promise<BootInstallResult> => ({ ok: true, changed: true, detail: 'installed', commands: [], needsPrivilege: false, mechanism, status }),
      uninstall: async (): Promise<BootInstallResult> => ({ ok: true, changed: true, detail: 'removed', commands: [], needsPrivilege: false, mechanism: null, status }),
      activate: async () => null,
      control: async (_spec: BootSpec, action: 'start' | 'stop') => mechanism === null
        ? null
        : { mechanism, commands: action === 'start' ? steps.start : steps.stop, display: [] },
    } satisfies BootLadderLike
  }

  const unitSteps = {
    start: [['systemctl', '--user', 'start', 'home-hosted.service']],
    stop: [['systemctl', '--user', 'stop', 'home-hosted.service']],
  }

  /**
   * A replacement is the same rule as `panel.start`/`panel.stop`: whoever supervises the panel
   * may change its state.
   *
   * The helper used to stop and start through the CLI whatever was installed, so under a unit
   * with `Restart=always` the `down` read as an unexpected death and the panel came back behind
   * the swap — leaving the unit reporting a run that never started the process now answering.
   * That is the `enabled, failing` state, and it outlives every later start.
   */
  it('replaces a supervised panel through its entry, never through the CLI', async () => {
    const panel = await withPanel()
    const { service, state } = await harness({
      panel,
      ladder: entryLadder('systemd-user', {
        start: [['systemctl', '--user', 'start', 'home-hosted.service']],
        stop: [['systemctl', '--user', 'stop', 'home-hosted.service']],
      }),
    })
    panel.servers.push({ id: 'dsh', config: { id: 'dsh', command: 'dsh', autostart: true, persistent: true } })

    const result = await service.takeoverPanel()
    expect(result.ok).toBe(true)
    // The detail names the mechanism, so the page says what actually happened.
    expect(result.detail).toContain('systemd-user')

    // The generated helper is what runs after this process may be gone: it must carry the
    // entry's own stop and start, and no CLI `down` that the unit would revive.
    const source = fs.readFileSync(takeoverHelperPath(state), 'utf8')
    expect(source).toContain('systemctl')
    expect(source).toContain('home-hosted.service')
    expect(source).toContain('ENTRY_STOP')
    expect(source).toContain('ENTRY_START')
  })

  it('stops a supervised panel through systemctl, never the CLI down that the unit would undo', async () => {
    const panel = await withPanel()
    const ran: string[][] = []
    const { home, service, cliCalls } = await harness({
      panel,
      ladder: entryLadder('systemd-user', unitSteps),
      // A stopped panel clears its own `run.json` on the way out, which is what
      // makes the wait below see it gone rather than answer from a stale record.
      execControl: async (argv) => {
        ran.push(argv)
        fs.rmSync(runFile(home), { force: true })
        return { command: argv[0]!, args: argv.slice(1), code: 0, signal: null, stdout: '', stderr: '', timedOut: false, error: null }
      },
      controlWaitMs: 500,
    })
    const result = await service.stopPanelNow()

    expect(result.ok).toBe(true)
    expect(result.detail).toContain('systemd-user')
    // The heart of it: `systemctl stop`, and no CLI `down` at all. A `down` here is
    // what `Restart=always` immediately reverses.
    expect(ran).toEqual(unitSteps.stop)
    expect(cliCalls.some(call => call.args.includes('down'))).toBe(false)
  })

  it('starts a supervised panel through systemctl, never the CLI up that would run beside the unit', async () => {
    const ran: string[][] = []
    const { service, cliCalls } = await harness({
      ladder: entryLadder('systemd-user', unitSteps),
      execControl: async (argv) => {
        ran.push(argv)
        return { command: argv[0]!, args: argv.slice(1), code: 0, signal: null, stdout: '', stderr: '', timedOut: false, error: null }
      },
      controlWaitMs: 50,
    })
    const result = await service.startPanelNow()

    expect(ran).toEqual(unitSteps.start)
    // It really was asked to start; the window is short, so the answer is a
    // truthful "did not answer" rather than a claim the panel is up.
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('systemd-user')
    expect(cliCalls.some(call => call.args.includes('up'))).toBe(false)
  })

  it('still uses the CLI when no entry is installed, which is the only supervisor then', async () => {
    const panel = await withPanel()
    const ran: string[][] = []
    const { service, cliCalls } = await harness({
      panel,
      ladder: entryLadder(null, unitSteps),
      execControl: async (argv) => {
        ran.push(argv)
        return { command: argv[0]!, args: argv.slice(1), code: 0, signal: null, stdout: '', stderr: '', timedOut: false, error: null }
      },
      controlWaitMs: 50,
    })
    await service.stopPanelNow()

    expect(ran).toEqual([])
    expect(cliCalls.some(call => call.args.includes('down'))).toBe(true)
  })

  it('runs the entry\'s start step even when a wedged panel blocks every other path', async () => {
    // `/healthz` not answering is the only condition for the Start button, and a
    // wedged panel is still *active* to systemd — which is why the step is
    // `restart` (see `test/boot/activate.test.ts`). What this pins is the service
    // side: with `run.json` naming a pid that answers nothing, the entry's step
    // still runs and the CLI is never used.
    const ran: string[][] = []
    // No stub panel: a `run.json` whose url nothing listens on is the Start-button
    // state — up to systemd, unreachable to the page.
    const { home, service, cliCalls } = await harness({
      ladder: entryLadder('systemd-user', { start: [['systemctl', '--user', 'restart', 'home-hosted.service']], stop: unitSteps.stop }),
      execControl: async (argv) => {
        ran.push(argv)
        return { command: argv[0]!, args: argv.slice(1), code: 0, signal: null, stdout: '', stderr: '', timedOut: false, error: null }
      },
      controlWaitMs: 50,
    })
    writeJsonFile(runFile(home), { version: '0.6.1', pid: process.pid, url: 'http://127.0.0.1:1', port: 1 })
    const result = await service.startPanelNow()
    expect(ran).toEqual([['systemctl', '--user', 'restart', 'home-hosted.service']])
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('systemd-user')
    expect(cliCalls.some(call => call.args.includes('up'))).toBe(false)
  })

  it('does not claim a stop the entry did not deliver', async () => {
    // A `systemctl stop` that exits 0 but leaves the panel answering means the
    // panel is not under that unit (a CLI-started one), so the CLI's `down` is what
    // answers instead — and the detail must be the CLI's, not the entry's.
    const panel = await withPanel()
    const { service, cliCalls } = await harness({
      panel,
      ladder: entryLadder('systemd-user', unitSteps),
      execControl: async (argv) => ({
        command: argv[0]!, args: argv.slice(1), code: 0, signal: null, stdout: '', stderr: '', timedOut: false, error: null,
      }),
      controlWaitMs: 50,
    })
    const result = await service.stopPanelNow()
    // The stub panel keeps answering (the fake `systemctl` stopped nothing), so the
    // entry's stop did not deliver: the CLI down is what answers, and the detail is
    // the CLI's, not the entry's.
    expect(cliCalls.some(call => call.args.includes('down'))).toBe(true)
    expect(result.ok).toBe(true)
    expect(result.detail).not.toContain('systemd-user')
  })

  it('falls back to the CLI when the ladder cannot even answer, rather than failing', async () => {
    // A provider that throws is a broken probe, not a refusal: the panel is still
    // there to be stopped, and losing the stop over it would be worse.
    const panel = await withPanel()
    const { service, cliCalls } = await harness({
      panel,
      ladder: {
        ...entryLadder('systemd-user', unitSteps),
        control: async () => {
          throw new Error('the provider blew up')
        },
      },
      controlWaitMs: 50,
    })
    const result = await service.stopPanelNow()
    expect(cliCalls.some(call => call.args.includes('down'))).toBe(true)
    expect(result.ok).toBe(true)
  })

  it('commands the mechanism the page reported, not another installed one', async () => {
    // The page reads `boot.mechanism`; acting on a different installed entry would
    // start a second panel beside the real one while naming the wrong entry.
    const panel = await withPanel()
    const asked: Array<BootMechanism | null | undefined> = []
    const ladder = entryLadder('systemd-user', unitSteps)
    const { service, settings } = await harness({
      panel,
      // The settings pin the system entry, so `control` must be asked for that one
      // rather than the first installed mechanism.
      ladder: {
        ...ladder,
        control: async (_spec: BootSpec, action: 'start' | 'stop', mechanism?: BootMechanism | null) => {
          asked.push(mechanism ?? null)
          return { mechanism: 'systemd-system', commands: action === 'stop' ? unitSteps.stop : unitSteps.start, display: [] }
        },
      },
      execControl: async (argv) => ({ command: argv[0]!, args: argv.slice(1), code: 0, signal: null, stdout: '', stderr: '', timedOut: false, error: null }),
      controlWaitMs: 50,
    })
    settings.update({ autostart: { mechanism: 'systemd-system' } })
    await service.stopPanelNow()
    expect(asked).toEqual(['systemd-system'])
  })

  it('reports the entry\'s refusal instead of claiming the panel stopped', async () => {
    const panel = await withPanel()
    const { service } = await harness({
      panel,
      ladder: entryLadder('systemd-system', unitSteps),
      execControl: async (argv) => ({
        command: argv[0]!,
        args: argv.slice(1),
        code: 1,
        signal: null,
        stdout: '',
        stderr: 'Failed to stop home-hosted.service: Access denied',
        timedOut: false,
        error: null,
      }),
      controlWaitMs: 50,
    })
    const result = await service.stopPanelNow()

    expect(result.ok).toBe(false)
    expect(result.detail).toContain('Access denied')
    expect(result.detail).toContain('systemd-system')
  })
})

describe('retiring the pre-per-instance boot artifact', () => {
  /** A ladder where a marker-owned legacy `home-hosted` entry already exists. */
  function recordingLadder(dir: string): { ladder: BootLadderLike, written: string[], retired: string[] } {
    const written: string[] = []
    const retired: string[] = []
    const legacyFile = path.join(dir, 'home-hosted.service')
    fs.writeFileSync(legacyFile, '# managed by dsh-home-hosted\n', 'utf8')
    const stateFor = (unitName: string, state: BootStatus['state'], unitPath: string | null): BootStatus => ({
      platform: 'linux',
      mechanism: 'systemd-user',
      recommended: 'systemd-user',
      state,
      bootCapable: true,
      privileged: true,
      unitPath,
      commands: [],
      detail: '',
      candidates: [],
    })
    return {
      written,
      retired,
      ladder: {
        status: async spec => spec.unitName === 'home-hosted'
          ? stateFor(spec.unitName, 'enabled-running', legacyFile)
          : stateFor(spec.unitName, 'not-installed', null),
        install: async (spec): Promise<BootInstallResult> => {
          written.push(spec.unitName)
          return { ok: true, changed: true, detail: 'installed', commands: [], needsPrivilege: false, mechanism: 'systemd-user', status: stateFor(spec.unitName, 'enabled-running', legacyFile) }
        },
        uninstall: async (spec): Promise<BootInstallResult> => {
          retired.push(spec.unitName)
          return { ok: true, changed: true, detail: 'removed', commands: [], needsPrivilege: false, mechanism: 'systemd-user', status: stateFor(spec.unitName, 'not-installed', null) }
        },
        activate: async () => null,
        control: async () => null,
      },
    }
  }

  it('writes its own artifact and retires the old one', async () => {
    const dir = tempDir()
    const { ladder: custom, written, retired } = recordingLadder(dir.path)
    const { service, state } = await harness({ ladder: custom })
    const expected = bootUnitName(state)
    expect(expected).not.toBe('home-hosted')

    await service.installBoot('systemd-user')

    expect(written).toEqual([expected])
    // Otherwise the machine autostarts the panel twice, from two artifacts.
    expect(retired).toEqual(['home-hosted'])
    dir.cleanup()
  })

  it('leaves the old artifact alone when the install did not succeed', async () => {
    const dir = tempDir()
    const { ladder: custom, retired } = recordingLadder(dir.path)
    custom.install = async (): Promise<BootInstallResult> => ({
      ok: false,
      changed: false,
      detail: 'nope',
      commands: [],
      needsPrivilege: false,
      mechanism: null,
      status: { platform: 'linux', mechanism: null, recommended: null, state: 'not-installed', bootCapable: true, privileged: false, unitPath: null, commands: [], detail: '', candidates: [] },
    })
    const { service } = await harness({ ladder: custom })
    await service.installBoot('systemd-user')
    expect(retired).toEqual([])
    dir.cleanup()
  })

  it('retires the old artifact when the mechanism reports no file path', async () => {
    // The Windows providers report a registry key (not a path) or null. Requiring
    // `existsSync` on that always bailed, so the pre-per-instance entry could never
    // retire there and the machine started the panel twice at logon.
    const dir = tempDir()
    const { ladder: custom, retired } = recordingLadder(dir.path)
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    custom.status = async spec => spec.unitName === 'home-hosted'
      ? { ...bootStatus, platform: 'win32', mechanism: 'windows-run', state: 'enabled-running', unitPath: key }
      : { ...bootStatus, platform: 'win32', mechanism: 'windows-run', state: 'not-installed', unitPath: null }
    const { service } = await harness({ ladder: custom })

    await service.installBoot('windows-run')

    expect(retired).toEqual(['home-hosted'])
    dir.cleanup()
  })

  it('still refuses to retire when a real file path is gone', async () => {
    // The file check is the belt on top of the provider's own ownership proof: an
    // absolute path that is not there means there is nothing of ours to remove.
    const dir = tempDir()
    const { ladder: custom, retired } = recordingLadder(dir.path)
    custom.status = async spec => spec.unitName === 'home-hosted'
      ? { ...bootStatus, state: 'enabled-running', unitPath: path.join(dir.path, 'gone.service') }
      : { ...bootStatus, state: 'not-installed', unitPath: null }
    const { service } = await harness({ ladder: custom })

    await service.installBoot('systemd-user')

    expect(retired).toEqual([])
    dir.cleanup()
  })
})

describe('handing the panel to the entry that was just installed', () => {
  const plan: BootActivation = {
    commands: [['systemctl', '--user', 'restart', 'home-hosted.service']],
    requires: { commands: [], files: [] },
    display: ['systemctl --user restart home-hosted.service'],
    stop: [['systemctl', '--user', 'stop', 'home-hosted.service']],
    retire: [['rm', '-f', '/x.desktop']],
    retired: ['xdg-autostart'],
    retireDisplay: ['rm -f /x.desktop'],
  }

  /**
   * A ladder whose entry is *not* installed yet, which is the state a switch or
   * a first enable starts from: reporting it installed would read as "already
   * running under it" and skip exactly the path under test.
   */
  const freshStatus: BootStatus = { ...bootStatus, mechanism: null, state: 'not-installed', unitPath: null }

  function activatingLadder(activation: BootActivation | null): BootLadderLike {
    return {
      status: async () => freshStatus,
      install: async (): Promise<BootInstallResult> => ({ ok: true, changed: true, detail: 'installed', commands: [], needsPrivilege: false, mechanism: 'systemd-user', status: bootStatus }),
      uninstall: async (): Promise<BootInstallResult> => ({ ok: true, changed: true, detail: 'removed', commands: [], needsPrivilege: false, mechanism: null, status: bootStatus }),
      activate: async () => activation,
      control: async () => null,
    }
  }

  it('hands a running panel to the entry, in a helper that outlives this process', async () => {
    const calls: Array<{ stateDir: string, plan: ActivationPlan }> = []
    const { service } = await harness({
      panel: await withPanel(),
      ladder: activatingLadder(plan),
      spawnActivation: (stateDir, handed) => {
        calls.push({ stateDir, plan: handed })
        return { ok: true, detail: 'starting the panel through its autostart entry now' }
      },
    })

    const { result } = await service.installBoot('systemd-user')

    expect(calls).toHaveLength(1)
    // The stop always precedes the start: home-hosted refuses a second panel while
    // run.json names a live pid, so the old one has to be gone first.
    expect(calls[0]?.plan).toMatchObject({
      commands: [['systemctl', '--user', 'restart', 'home-hosted.service']],
      retire: [['rm', '-f', '/x.desktop']],
    })
    expect(calls[0]?.plan.stop.join(' ')).toContain('down')
    expect(result.detail).toContain('retiring xdg-autostart')
  })

  it('stops the panel through the CLI first, naming the pid to wait on', async () => {
    let handed: ActivationPlan | null = null
    const { service } = await harness({
      panel: await withPanel(),
      ladder: activatingLadder({ ...plan, commands: [['launchctl', 'kickstart', '-k', 'gui/1000/x']] }),
      spawnActivation: (_stateDir, value) => {
        handed = value
        return { ok: true, detail: 'handed over' }
      },
    })

    await service.installBoot('systemd-user')
    expect(handed).not.toBeNull()
    expect(handed!.stop.join(' ')).toContain('down')
    expect(handed!.stop.join(' ')).toContain('--home')
    expect(handed!.oldPid).toBe(process.pid)
  })

  it('leaves a running panel alone when the mechanism has no start command', async () => {
    let spawned = 0
    const { service } = await harness({
      panel: await withPanel(),
      ladder: activatingLadder(null),
      spawnActivation: () => {
        spawned += 1
        return { ok: true, detail: 'handed over' }
      },
    })

    const { result } = await service.installBoot('xdg-autostart')
    // Killing a panel nothing would start again is worse than leaving it up.
    expect(spawned).toBe(0)
    expect(result.detail).toMatch(/cannot start the panel itself/)
  })

  it('does not hand over when no panel is answering', async () => {
    let spawned = 0
    const { service } = await harness({
      ladder: activatingLadder(plan),
      spawnActivation: () => {
        spawned += 1
        return { ok: true, detail: 'handed over' }
      },
    })

    const { result } = await service.installBoot('systemd-user')
    expect(spawned).toBe(0)
    expect(result.detail).toMatch(/not started now/)
  })

  it('never hands over after a failed install', async () => {
    const ladder = activatingLadder(plan)
    ladder.install = async (): Promise<BootInstallResult> => ({ ok: false, changed: false, detail: 'refused', commands: [], needsPrivilege: false, mechanism: null, status: bootStatus })
    let spawned = 0
    const { service } = await harness({
      panel: await withPanel(),
      ladder,
      spawnActivation: () => {
        spawned += 1
        return { ok: true, detail: 'handed over' }
      },
    })

    const { result } = await service.installBoot('systemd-user')
    expect(spawned).toBe(0)
    expect(result.ok).toBe(false)
    expect(result.detail).toBe('refused')
  })

  it('reports the exact commands when the handover could not be spawned', async () => {
    const { service } = await harness({
      panel: await withPanel(),
      ladder: activatingLadder(plan),
      spawnActivation: () => ({ ok: false, detail: 'could not start the autostart helper: EPERM' }),
    })

    const { result } = await service.installBoot('systemd-user')
    // The panel is still up; a person needs the commands to do it by hand.
    expect(result.detail).toMatch(/EPERM/)
    // The helper never ran, so the panel is up and the steps are printed instead.
    expect(result.commands).toContain('systemctl --user restart home-hosted.service')
  })
})




describe('panel token verification', () => {
  it('measures a token the panel refuses as stale, and says how it was measured', async () => {
    const panel = await withPanel({ acceptAnyToken: false })
    const { service, state } = await harness({ panel })
    storeToken(state, 'not-the-panel-token')

    const status = await service.status()
    expect(status.panel.reachable).toBe(true)
    expect(status.panel.token).toBe('stale')
    expect(status.panel.tokenVerified).toBe(true)
    // A refused token is not a write path, however present it is on disk.
    expect(status.panel.writeVia).toBe('file')
    expect(status.panel.detail).toContain('refused')
    // The panel was actually asked, with the token this plugin holds.
    const attempts = panel.requests.filter(request => request.path === '/api/servers')
    expect(attempts.length).toBeGreaterThan(0)
    expect(attempts.every(attempt => !attempt.authorized)).toBe(true)
  })

  it('reports absent without claiming a verification when no token exists yet', async () => {
    const panel = await withPanel()
    const { service } = await harness({
      panel,
      execCli: async (args): Promise<RunResult> => ({
        command: 'home-hosted', args, code: 1, signal: null, stdout: '', stderr: 'no api token support', timedOut: false, error: null,
      }),
    })

    const status = await service.status()
    expect(status.panel.reachable).toBe(true)
    expect(status.panel.token).toBe('absent')
    expect(status.panel.tokenVerified).toBe(false)
    expect(status.panel.writeVia).toBe('file')
  })

  it('reports present, unverified, when home-hosted holds a token this plugin does not have', async () => {
    const panel = await withPanel()
    const { home, service } = await harness({ panel })
    writeJsonFile(secretsFile(home), { version: 2, apiToken: { hint: 'ffff', hash: 'foreign' } })

    const status = await service.status()
    expect(status.panel.reachable).toBe(true)
    expect(status.panel.token).toBe('present')
    expect(status.panel.tokenVerified).toBe(false)
  })
})

describe('reclaiming the panel token', () => {
  it('replaces a refused token and writes through the API afterwards', async () => {
    const panel = await withPanel({ acceptAnyToken: false })
    const { home, state, service, cliCalls } = await harness({ panel, onEnroll: token => { panel.token = token } })
    storeToken(state, 'old-refused-token')

    const before = await service.status()
    expect(before.panel.token).toBe('stale')

    const after = await service.call('panel.reclaimToken', {}) as HomeHostedStatus
    expect(after.panel.token).toBe('enrolled')
    expect(after.panel.tokenVerified).toBe(true)
    expect(after.panel.writeVia).toBe('api')

    const minted = readStoredToken(state)
    expect(minted).not.toBeNull()
    expect(minted).not.toBe('old-refused-token')
    // One write replaces the hash the panel refuses.
    expect(cliCalls.map(call => call.args)).toEqual([['--home', home, 'set-token']])
    expect(cliCalls[0]?.env.HHOSTED_TOKEN).toBe(minted)

    // The panel refused the old token and now accepts the new one: a real write lands.
    expect(panel.requests.some(request => request.path === '/api/servers' && !request.authorized)).toBe(true)
    panel.servers.push({ id: 'other', config: { id: 'other', command: 'sleep' } })
    await service.call('servers.start', { id: 'other' })
    expect(panel.servers[0]?.status).toBe('running')
  })

  it('clears a foreign token home-hosted already holds, and ends with a working one', async () => {
    const panel = await withPanel({ acceptAnyToken: false })
    const { home, state, service, cliCalls } = await harness({ panel, onEnroll: token => { panel.token = token } })
    // home-hosted holds a hash this plugin never had, and the stored plaintext is stale.
    writeJsonFile(secretsFile(home), { version: 2, apiToken: { hint: 'ffff', hash: 'foreign' } })
    storeToken(state, 'stale-token')

    expect((await service.status()).panel.token).toBe('stale')

    const status = await service.call('panel.reclaimToken', {}) as HomeHostedStatus
    expect(cliCalls[0]?.args).toEqual(['--home', home, 'set-token'])
    expect(status.panel.token).toBe('enrolled')
    expect(status.panel.tokenVerified).toBe(true)
    expect(status.panel.writeVia).toBe('api')
  })

  it('reports a CLI that cannot clear the old token, and leaves it in place', async () => {
    const panel = await withPanel({ acceptAnyToken: false })
    const { state, service } = await harness({
      panel,
      execCli: async (args): Promise<RunResult> => ({
        command: 'home-hosted', args, code: 1, signal: null, stdout: '', stderr: 'set-token refused', timedOut: false, error: null,
      }),
    })
    storeToken(state, 'stale-token')

    await expect(service.call('panel.reclaimToken', {})).rejects.toMatchObject({
      code: 'TOKEN_RECLAIM_FAILED',
      message: expect.stringContaining('set-token refused'),
    })
    expect(readStoredToken(state)).toBe('stale-token')
  })

  it('says the stored token was kept when the enrolment fails', async () => {
    const panel = await withPanel({ acceptAnyToken: false })
    const { state, service } = await harness({
      panel,
      execCli: async (args): Promise<RunResult> => ({
        command: 'home-hosted', args, code: 2, signal: null, stdout: '', stderr: 'mint failed', timedOut: false, error: null,
      }),
    })
    storeToken(state, 'stale-token')

    await expect(service.call('panel.reclaimToken', {})).rejects.toMatchObject({
      code: 'TOKEN_RECLAIM_FAILED',
      message: expect.stringContaining('the previously stored token was kept'),
    })
    expect(readStoredToken(state)).toBe('stale-token')
  })

  it('refuses to regenerate when the panel was never started, without running the CLI', async () => {
    const { service, state, cliCalls } = await harness()
    storeToken(state, 'stale-token')

    await expect(service.call('panel.reclaimToken', {})).rejects.toMatchObject({ code: 'PANEL_UNAVAILABLE' })
    expect(cliCalls).toHaveLength(0)
    expect(readStoredToken(state)).toBe('stale-token')
  })

  it('regenerates against a panel that was started but is not answering', async () => {
    // The reason a person cannot reach the panel is often the token itself, so a
    // panel that is up but silent must not make the repair impossible.
    const { home, service, state, cliCalls } = await harness()
    writeJsonFile(runFile(home), { version: '0.6.1', pid: 9_999_999, url: 'http://127.0.0.1:1', port: 1 })
    storeToken(state, 'stale-token')

    const status = await service.call('panel.reclaimToken', {}) as HomeHostedStatus

    expect(cliCalls.length).toBeGreaterThan(0)
    expect(readStoredToken(state)).not.toBe('stale-token')
    expect(readStoredToken(state)).not.toBeNull()
    // Enrolled, and honest about the fact it could not be proved yet.
    expect(status.panel.detail).toContain('not answering')
  })

  it('persists the reclaimToken switch through settings.update', async () => {
    const { service, settings, state } = await harness()
    expect(settings.get().reclaimToken).toBe(true)

    await service.call('settings.update', { patch: { reclaimToken: false } })
    expect(settings.get().reclaimToken).toBe(false)
    expect(new SettingsStore(path.join(state, 'settings.json'), 'dsh').get().reclaimToken).toBe(false)
  })
})

describe('an entry that boots a clone directly', () => {
  const cloneLaunch = (launcherPath: string | null, cliEntry: string): DshLaunch => ({
    program: process.execPath,
    args: [cliEntry],
    cliEntry,
    shimPath: null,
    source: 'entry',
    launcherPath,
  })

  it('re-points the stored entry at the launcher when it is managed again', async () => {
    const panel = await withPanel()
    const { service } = await harness({
      panel,
      resolveDsh: async () => cloneLaunch('/state/bin/dsh.mjs', '/opt/dsh-clone/lib/bin.js'),
    })
    panel.servers.push({
      id: 'dsh',
      config: { id: 'dsh', command: process.execPath, args: ['/opt/dsh-clone/lib/bin.js', 'web', '--port', '3080'], autostart: true, onPortConflict: 'follow', stop: { killPortHolders: true } },
    })

    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true, onPortConflict: 'follow', stopKillPortHolders: true }] })

    expect(panel.servers[0]!.config.command).toBe(process.execPath)
    expect(panel.servers[0]!.config.args).toEqual(['/state/bin/dsh.mjs', 'web', '--port', '3080'])
  })

  it('re-points a managed row that runs a global dsh at the project own copy', async () => {
    // The reported shape: cwd is the project, and the row still runs the global
    // shim. The project declares its own dsh, so that is what the row must run.
    const projectDir = tempDir()
    const project = path.join(projectDir.path, 'proj')
    const entry = path.join(project, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    fs.mkdirSync(path.dirname(entry), { recursive: true })
    fs.writeFileSync(entry, 'console.log("local dsh")\n', 'utf8')
    const bin = path.join(project, 'node_modules', '.bin')
    fs.mkdirSync(bin, { recursive: true })
    fs.writeFileSync(path.join(bin, 'dsh'), `#!/bin/sh\n# cmd-shim-target=${entry}\nexec node "${entry}" "$@"\n`, 'utf8')
    fs.chmodSync(path.join(bin, 'dsh'), 0o755)

    const panel = await withPanel()
    const { home, state, service, settings } = await harness({
      panel,
      projectDir: project,
      resolveDsh: async () => cloneLaunch('/state/bin/dsh.mjs', entry),
    })
    panel.servers.push({
      id: 'dsh',
      config: { id: 'dsh', command: '/Users/destiny/.local/bin/dsh', args: ['web', '--port', '3080'], autostart: true, onPortConflict: 'follow', stop: { killPortHolders: true } },
    })
    settings.update({
      manageDsh: true,
      entries: [{ id: 'dsh', autostart: true, onPortConflict: 'follow', stopKillPortHolders: true, persistent: true }],
    })
    // `{ id }` alone is the marker for a row this plugin created, whose command
    // is therefore the plugin's to set.
    writeJsonFile(path.join(state, 'snapshots.json'), { dsh: { id: 'dsh' } })
    expect(home).toBeTruthy()

    // The page's own status read heals it, so no click is needed.
    await service.status()

    const live = panel.servers[0]!.config
    expect(live.command).toBe('dsh')
    expect(live.args).toEqual(['web', '--port', '3080'])
    projectDir.cleanup()
  })

  it('pins an entry that named a bare dsh, so PATH stops deciding it', async () => {
    const panel = await withPanel()
    const { service } = await harness({
      panel,
      resolveDsh: async () => cloneLaunch(null, '/opt/dsh-clone/lib/bin.js'),
    })
    panel.servers.push({
      id: 'dsh',
      config: { id: 'dsh', command: 'dsh', args: ['web'], autostart: true, onPortConflict: 'follow', stop: { killPortHolders: true } },
    })

    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true, onPortConflict: 'follow', stopKillPortHolders: true }] })

    // `dsh` is whatever PATH answers next boot; the resolved image is what
    // actually runs this harness, so the row is pinned to it.
    expect(panel.servers[0]!.config.command).toBe(process.execPath)
    expect(panel.servers[0]!.config.args).toEqual(['/opt/dsh-clone/lib/bin.js', 'web'])
  })
})

describe('a managed entry someone deleted', () => {
  const deleted = {
    manageDsh: true,
    entries: [{ id: 'dsh', autostart: true, onPortConflict: 'follow' as const, stopKillPortHolders: true, persistent: true }],
  }

  it('is put back on the next reconcile while the toggle is on', async () => {
    const { home, service, settings } = await harness()
    expect(readConfig(home).raw?.servers ?? []).toHaveLength(0)
    settings.update(deleted)

    await service.reconcile()

    expect((readConfig(home).raw?.servers ?? []).map(entry => entry.id)).toEqual(['dsh'])
  })

  it('is put back by the status read, without waiting for a restart', async () => {
    // Whoever deleted it is looking at the page that reports it missing.
    const panel = await withPanel()
    const { service, settings } = await harness({ panel, onEnroll: token => { panel.token = token } })
    settings.update(deleted)

    const status = await service.status()

    expect(status.entries.find(entry => entry.intent.id === 'dsh')?.exists).toBe(true)
    expect(panel.servers.map(entry => entry.id)).toEqual(['dsh'])
  })

  it('does not turn a failing recovery into a write on every poll', async () => {
    // The panel keeps refusing to add the entry: three polls must not be three
    // CREATE attempts, or every status read would hammer the panel.
    const panel = await startStubPanel({ acceptAnyToken: true, failCreate: true })
    panels.push(panel)
    const { service, settings } = await harness({ panel })
    settings.update(deleted)

    await service.status()
    await service.status()
    await service.status()

    const creates = panel.requests.filter(entry => entry.method === 'POST' && entry.path === '/api/servers')
    expect(creates).toHaveLength(1)
  })

  it('is put back through the panel API when the panel answers and the token works', async () => {
    // The live case: a working panel and token, so the recreation must be an API
    // write rather than a config-file one.
    const panel = await withPanel()
    const { service, settings } = await harness({ panel, onEnroll: token => { panel.token = token } })
    settings.update(deleted)

    await service.reconcile()

    expect(panel.servers.map(entry => entry.id)).toEqual(['dsh'])
    expect(panel.requests.some(entry => entry.method === 'POST' && entry.path === '/api/servers')).toBe(true)
  })

  it('stays deleted while the toggle is off', async () => {
    const { home, service, settings } = await harness()
    settings.update({ ...deleted, manageDsh: false })

    await service.reconcile()

    expect(readConfig(home).raw?.servers ?? []).toHaveLength(0)
  })

  it('stays deleted when the intent was paused, even though the toggle is on', async () => {
    const { home, service, settings } = await harness()
    settings.update({ ...deleted, entries: [{ ...deleted.entries[0]!, autostart: false }] })

    await service.reconcile()

    expect(readConfig(home).raw?.servers ?? []).toHaveLength(0)
  })

  it('is left alone while it still exists', async () => {
    const panel = await withPanel()
    const { service, settings } = await harness({ panel })
    panel.servers.push({ id: 'dsh', config: { id: 'dsh', command: 'dsh', args: ['web'], autostart: true, onPortConflict: 'follow', stop: { killPortHolders: true } } })
    settings.update(deleted)

    const before = panel.requests.length
    await service.reconcile()

    expect(panel.requests.slice(before).some(entry => entry.method !== 'GET')).toBe(false)
  })

  it('clears the toggle when the intent is applied with autostart off', async () => {
    const panel = await withPanel()
    const { service, settings } = await harness({ panel })

    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true, onPortConflict: 'follow', stopKillPortHolders: true }] })
    expect(settings.get().manageDsh).toBe(true)

    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: false, onPortConflict: 'follow', stopKillPortHolders: true }] })
    expect(settings.get().manageDsh).toBe(false)
  })
})

describe('the managed workspace', () => {
  it('writes the managed entry into the panel\'s default workspace', async () => {
    const { home, service } = await harness()
    makeHhHome(home, { workspaces: ['default', 'alpha'] })

    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true }] })

    expect(findEntry(readConfig(home, 'default').raw!, 'dsh')).toMatchObject({ onPortConflict: 'kill' })
    // Another workspace is not the plugin's to reconcile into.
    expect(fs.existsSync(serversFile(home, 'alpha'))).toBe(false)
    expect((await service.status()).workspace).toBe('default')
  })

  it('carries the named workspace into a panel API call, defaulting to `default`', async () => {
    const panel = await withPanel()
    const { home, service } = await harness({ panel, onEnroll: token => { panel.token = token } })
    makeHhHome(home, { workspaces: ['default', 'alpha'] })

    await service.call('servers.create', { entry: { id: 'notes', command: 'sleep' } })
    expect(panel.requests.find(request => request.method === 'POST' && request.path === '/api/servers')?.workspace).toBe('default')

    // A call that names another workspace acts there, and only there.
    await service.call('servers.create', { workspace: 'alpha', entry: { id: 'alpha-notes', command: 'sleep' } })
    const posts = panel.requests.filter(request => request.method === 'POST' && request.path === '/api/servers')
    expect(posts.at(-1)?.workspace).toBe('alpha')
    expect(panel.servers.find(entry => entry.id === 'notes')?.workspace).toBe('default')
    expect(panel.servers.find(entry => entry.id === 'alpha-notes')?.workspace).toBe('alpha')
  })

  it('names a workspace the panel would reject, instead of deriving a path from it', async () => {
    const { service } = await harness()
    await expect(service.call('servers.list', { workspace: '../escape' }))
      .rejects.toMatchObject({ code: 'INVALID_WORKSPACE' })
  })
})

describe('the panel\'s workspace inventory', () => {
  it('counts each workspace from its config files when nothing answers', async () => {
    const { home, service } = await harness()
    makeHhHome(home, {
      workspaces: ['default', 'alpha'],
      servers: { alpha: { servers: [{ id: 'a' }, { id: 'b' }] } },
    })

    const listed = await service.call('workspaces.list', {}) as WorkspaceSummary[]
    expect(listed.map(entry => [entry.id, entry.servers, entry.source])).toEqual([
      ['default', 0, 'file'],
      ['alpha', 2, 'file'],
    ])
  })

  it('takes live counts from a running panel', async () => {
    const panel = await withPanel()
    const { home, service } = await harness({ panel, onEnroll: token => { panel.token = token } })
    makeHhHome(home, { workspaces: ['default'] })
    panel.servers.push({ id: 'web', status: 'running', config: { id: 'web', command: 'sleep' } })

    const listed = await service.call('workspaces.list', {}) as WorkspaceSummary[]
    expect(listed.find(entry => entry.id === 'default')).toMatchObject({ servers: 1, running: 1, source: 'api' })
  })
})

describe('a root still on the pre-0.7 layout', () => {
  it('is reported, and refuses a managed write until it is migrated', async () => {
    const { home, service } = await harness()
    fs.rmSync(hhDir(home), { recursive: true, force: true })
    writeJsonFile(path.join(home, 'servers.config.json'), { servers: [] })

    const status = await service.status()
    expect(status.legacyRoot).toBe(true)

    await expect(service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true }] }))
      .rejects.toMatchObject({ code: 'CONFIG_UNREADABLE' })
    // Nothing was created at the new paths, and the old config is untouched.
    expect(fs.existsSync(hhDir(home))).toBe(false)
    expect(fs.existsSync(serversFile(home, 'default'))).toBe(false)
  })

  it('names the only remedy a pre-0.7 root has left', async () => {
    const { home, service, cliCalls } = await harness()
    fs.rmSync(hhDir(home), { recursive: true, force: true })
    writeJsonFile(path.join(home, 'servers.config.json'), { servers: [] })

    const status = await service.status()
    expect(status.legacyRoot).toBe(true)
    // 0.8 refuses to relocate, so the refusal has to name the release that can.
    expect(status.lastError).toContain('latest 0.7.x')
    expect(cliCalls).toHaveLength(0)
  })

  /**
   * The page must warn before a write is refused, not after: a root the panel cannot boot looked
   * healthy until the first call failed, which is the worst moment to learn it needs `migrate`.
   */
  it('reports a config stamped below the pinned schema from a read, naming migrate', async () => {
    const { home, service } = await harness()
    writeJsonFile(serversFile(home, DEFAULT_WORKSPACE), {
      meta: { writtenBy: '0.8.0', schema: panelConfigSchema()! - 1 },
      servers: [{ id: 'gitea', command: 'gitea' }],
    })

    const status = await service.status()
    expect(status.lastError).toContain('home-hosted migrate')
    // The entries are still listed: the file is readable, it is only un-bootable.
    expect(status.servers.map(server => server.id)).toContain('gitea')
  })

  it('says nothing about a config stamped the way the pinned panel reads', async () => {
    const { home, service } = await harness()
    writeJsonFile(serversFile(home, DEFAULT_WORKSPACE), {
      meta: { writtenBy: '0.9.2', schema: panelConfigSchema()! },
      servers: [{ id: 'gitea', command: 'gitea' }],
    })
    const status = await service.status()
    expect(status.lastError).toBeNull()
  })
})

describe('entry snapshots across workspaces', () => {
  it('reads a pre-workspace flat file as the `default` workspace', async () => {
    const { home, service, state } = await harness()
    writeJsonFile(serversFile(home, DEFAULT_WORKSPACE), {
      meta: { writtenBy: '0.6.6', schema: panelConfigSchema()! },
      servers: [{ id: 'dsh', command: 'sleep', autostart: false, onPortConflict: 'warn' }],
    })
    writeJsonFile(path.join(state, 'snapshots.json'), {
      dsh: { id: 'dsh', autostart: true, onPortConflict: 'kill', stop: { killPortHolders: true } },
    })

    await service.call('entries.restore', { id: 'dsh' })

    expect(findEntry(readConfig(home, DEFAULT_WORKSPACE).raw!, 'dsh')).toMatchObject({
      autostart: true,
      onPortConflict: 'kill',
      stop: { killPortHolders: true },
    })
  })

  it('ignores a v2 file that belongs to another workspace', async () => {
    const { home, service, state } = await harness()
    writeJsonFile(serversFile(home, DEFAULT_WORKSPACE), { meta: { writtenBy: '0.6.6', schema: panelConfigSchema()! }, servers: [{ id: 'dsh', command: 'sleep' }] })
    writeJsonFile(path.join(state, 'snapshots.json'), {
      version: 2,
      workspace: 'alpha',
      entries: { dsh: { id: 'dsh', autostart: true } },
    })

    // The snapshot is another workspace's: restoring would rewrite an entry this
    // plugin never adopted here.
    await expect(service.call('entries.restore', { id: 'dsh' })).rejects.toMatchObject({ code: 'NOT_ADOPTED' })
  })

  it('reads a v2 file for the managed workspace, and saves v2', async () => {
    const { home, service, state } = await harness()
    writeJsonFile(serversFile(home, DEFAULT_WORKSPACE), {
      meta: { writtenBy: '0.6.6', schema: panelConfigSchema()! },
      servers: [{ id: 'dsh', command: 'sleep', autostart: false, onPortConflict: 'warn' }],
    })
    writeJsonFile(path.join(state, 'snapshots.json'), {
      version: 2,
      workspace: DEFAULT_WORKSPACE,
      entries: { dsh: { id: 'dsh', autostart: true, onPortConflict: 'kill' } },
    })

    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true, onPortConflict: 'follow', stopKillPortHolders: true }] })

    const written = JSON.parse(fs.readFileSync(path.join(state, 'snapshots.json'), 'utf8'))
    expect(written).toMatchObject({ version: 2, workspace: DEFAULT_WORKSPACE })
    expect(written.entries.dsh).toMatchObject({ id: 'dsh' })
  })
})
