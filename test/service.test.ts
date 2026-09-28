import { Context } from '@deepseek-ai/cordis'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BootStatus, HomeHostedStatus, ServerEntryView } from '../src/shared/contracts.js'
import { findEntry, readConfig } from '../src/home-hosted/config-file.js'
import { readStoredToken, storeToken, tokenSlot } from '../src/home-hosted/token.js'
import { HomeHostedService } from '../src/service.js'
import type { DshLaunch } from '../src/home-hosted/dsh-entry.js'
import type { BootLadderLike, BootInstallResult } from '../src/service.js'
import { SettingsStore } from '../src/settings.js'
import { bootUnitName, configFile, runtimeFile, secretsFile } from '../src/util/paths.js'
import type { RunResult } from '../src/util/exec.js'
import { startStubPanel } from './helpers/stub-panel.js'
import type { StubPanel } from './helpers/stub-panel.js'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

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
}

let scratch: TempDir | null = null
const panels: StubPanel[] = []
const savedServerId = process.env.HHOSTED_SERVER_ID

afterEach(async () => {
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
  /** Replaces the default CLI seam when a test needs a failing CLI. */
  execCli?: (args: string[], env: Record<string, string | undefined>) => Promise<RunResult>
  /** Replaces the running-harness probe, so a clone can be expressed from a test. */
  resolveDsh?: (options: { dshHome: string, stateDir: string }) => Promise<DshLaunch | null>
  /** Names of extra panels to create under the scratch dir and declare. */
  otherPanels?: string[]
  /** Replaces the boot ladder, for tests about what was written or retired. */
  ladder?: BootLadderLike
} = {}): Promise<Harness> {
  scratch = tempDir()
  const home = path.join(scratch.path, 'home')
  const state = path.join(scratch.path, 'state')
  fs.mkdirSync(home, { recursive: true })
  fs.mkdirSync(state, { recursive: true })

  // A deterministic CLI path: a .mjs file is run through node, so no `which` probe.
  const fakeCli = options.cli ?? path.join(scratch.path, 'home-hosted.mjs')
  if (options.cli === undefined)
    fs.writeFileSync(fakeCli, '#!/usr/bin/env node\n', 'utf8')

  if (options.panel !== undefined)
    writeJsonFile(runtimeFile(home), { version: options.panelVersion ?? '0.6.1', pid: process.pid, url: options.panel.url, port: 1234 })

  const otherPanels = (options.otherPanels ?? []).map((name) => {
    const dir = path.join(scratch!.path, name)
    writeJsonFile(configFile(dir), { meta: { writtenBy: '0.6.6' }, servers: [{ id: 'web' }] })
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
    // Pinned: the machine's own `$HHOSTED_HOME` and home directory must not
    // leak into a test.
    envHome: null,
    homeDir: scratch.path,
    settings,
    createLadder: () => options.ladder ?? ladder,
    resolveDsh: options.resolveDsh,
    execCli: options.execCli ?? (async (args, env): Promise<RunResult> => {
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
    // first start looks like from here.
    fs.rmSync(configFile(other))
    expect((await service.instances()).map(instance => instance.home)).toEqual([home])

    writeJsonFile(configFile(other), { meta: { writtenBy: '0.6.6' }, servers: [] })
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

  it('starts and stops another panel through its own CLI', async () => {
    const { service, home, cliCalls } = await harness({ otherPanels: ['other-panel'] })
    const other = path.join(path.dirname(home), 'other-panel')

    const started = await service.call('servers.start', { id: 'web', home: other })
    expect(started).toMatchObject({ id: 'web', action: 'start', via: 'cli', home: other })
    expect(cliCalls[0]?.args).toEqual(['start', 'web', '--home', other])
    expect(cliCalls[0]?.env.HHOSTED_HOME).toBe(other)

    // The CLI has no server restart: it is a stop followed by a start.
    await service.call('servers.restart', { id: 'web', home: other })
    expect(cliCalls.slice(1).map(call => call.args)).toEqual([
      ['stop', 'web', '--home', other],
      ['start', 'web', '--home', other],
    ])
  })

  it('rejects a panel it does not report, and refuses a target on an endpoint that has none', async () => {
    const { service, home } = await harness({ otherPanels: ['other-panel'] })
    await expect(service.call('servers.delete', { id: 'x', home: '/nowhere' }))
      .rejects.toMatchObject({ code: 'INSTANCE_UNKNOWN' })
    await expect(service.call('boot.verify', { home: path.join(path.dirname(home), 'other-panel') } as never))
      .rejects.toMatchObject({ code: 'INSTANCE_UNSUPPORTED' })
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
    writeJsonFile(runtimeFile(other), { version: '0.6.6', pid: process.pid, url: panel.url, port: 1234 })
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
    writeJsonFile(runtimeFile(other), { version: '0.6.6', pid: process.pid, url: panel.url, port: 1234 })
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
    expect(listed).toEqual([{ id: 'web', status: 'unknown', pid: null, url: null, config: { id: 'web' } }])
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
    expect(await service.call('servers.freePort', { id: 'other' })).toEqual({ stopped: [] })
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
    await expect(service.call('entries.apply', { intents: [{ id: 'BAD ID', autostart: true }] })).rejects.toMatchObject({ code: 'INVALID_ID' })
  })

  it('refuses a conflict policy the panel could not parse, before writing anything', async () => {
    const { service, home } = await harness()
    await expect(service.call('entries.apply', {
      intents: [{ id: 'dsh', autostart: true, onPortConflict: 'explode' }],
    })).rejects.toMatchObject({ code: 'INVALID_POLICY' })
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

describe('panel lifecycle from the page', () => {
  it('writes the chosen panel port into the state before starting it', async () => {
    const { home, service, settings } = await harness()
    fs.writeFileSync(path.join(home, 'servers.config.json'), JSON.stringify({ meta: { writtenBy: 'x', schema: 1 }, control: { port: 3999, host: '127.0.0.1' }, servers: [] }), 'utf8')
    settings.update({ panel: { port: 6311 } })

    await service.startPanelNow()

    const written = JSON.parse(fs.readFileSync(path.join(home, 'servers.config.json'), 'utf8'))
    expect(written.control.port).toBe(6311)
    // Everything else in the file survives the write.
    expect(written.control.host).toBe('127.0.0.1')
    // The plugin records that it wrote the file, and keeps the schema the file
    // already declared.
    expect(written.meta).toEqual({ writtenBy: 'dsh-home-hosted', schema: 1 })
  })

  it('leaves the port alone when the setting is empty', async () => {
    const { home, service } = await harness()
    fs.writeFileSync(path.join(home, 'servers.config.json'), JSON.stringify({ control: { port: 3999 }, servers: [] }), 'utf8')
    await service.startPanelNow()
    expect(JSON.parse(fs.readFileSync(path.join(home, 'servers.config.json'), 'utf8')).control.port).toBe(3999)
  })

  it('never writes a port the panel itself could not parse', async () => {
    const { home, service, settings } = await harness()
    fs.writeFileSync(path.join(home, 'servers.config.json'), JSON.stringify({ control: { port: 3999 }, servers: [] }), 'utf8')
    settings.update({ panel: { port: 3999.5 } })
    await service.startPanelNow()
    expect(JSON.parse(fs.readFileSync(path.join(home, 'servers.config.json'), 'utf8')).control.port).toBe(3999)
  })

  it('says why a panel CLI could not be run instead of only that it failed', async () => {
    // A directory exists but cannot be executed, which is how a broken CLI looks.
    const { service } = await harness({ cli: os.tmpdir() })
    const result = await service.uiManage('update')
    expect(result.ok).toBe(false)
    expect(result.output ?? '').not.toBe('')
  })

  it('starts nothing when a panel already answers', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    const result = await service.startPanelNow() as { ok: boolean, detail: string }
    expect(result.ok).toBe(true)
    expect(result.detail).toContain('already answering')
  })

  it('refuses to replace a panel that would not bring this session back', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel })
    // The stub panel answers, its version differs from the CLI's, and no adopted
    // autostart entry exists for this process — so a takeover must be refused.
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
    writeJsonFile(runtimeFile(home), { version: '0.6.1', pid: 9_999_999, url: 'http://127.0.0.1:1', port: 1 })
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
