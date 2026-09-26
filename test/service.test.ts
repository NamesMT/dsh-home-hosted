import { Context } from '@deepseek-ai/cordis'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { BootStatus } from '../src/shared/contracts.js'
import { readConfig } from '../src/home-hosted/config-file.js'
import { HomeHostedService } from '../src/service.js'
import type { BootLadderLike, BootInstallResult } from '../src/service.js'
import { SettingsStore } from '../src/settings.js'
import { configFile, runtimeFile } from '../src/util/paths.js'
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

async function harness(options: { panel?: StubPanel, panelVersion?: string, cli?: string } = {}): Promise<Harness> {
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

  const cliCalls: Harness['cliCalls'] = []
  const settings = new SettingsStore(path.join(state, 'settings.json'), 'dsh')
  const service = new HomeHostedService(new Context(), {
    home,
    stateDir: state,
    homeHostedCommand: fakeCli,
    defaultEntryId: 'dsh',
    settings,
    createLadder: () => ladder,
    execCli: async (args, env): Promise<RunResult> => {
      cliCalls.push({ args, env })
      writeJsonFile(path.join(home, '.control-secrets.json'), { version: 2, apiToken: { hint: 'abcd', hash: 'x' } })
      return { command: fakeCli, args, code: 0, signal: null, stdout: '', stderr: '', timedOut: false, error: null }
    },
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
    const { service, state } = await harness()
    const status = await service.status()
    expect(status.panel.reachable).toBe(false)
    expect(status.panel.writeVia).toBe('file')
    expect(status.panel.token).toBe('absent')
    expect(status.boot.state).toBe('enabled-running')
    expect(status.entries.map(entry => entry.intent.id)).toEqual(['dsh'])
    expect(status.entries[0]?.drift).toEqual(['missing entry'])
    expect(fs.existsSync(path.join(state, 'settings.json'))).toBe(false)
  })

  it('enrols a token through the CLI and adopts an existing entry over the API', async () => {
    const panel = await withPanel()
    const { service, settings, cliCalls } = await harness({ panel })

    panel.servers.push({
      id: 'dsh',
      status: 'running',
      pid: 4242,
      config: { id: 'dsh', command: 'dsh', args: ['web'], onPortConflict: 'block', autostart: false, stop: { graceMs: 1000 } },
    })

    const status = await service.status()
    expect(status.panel.reachable).toBe(true)
    expect(status.panel.writeVia).toBe('api')
    // This panel predates the persistence support, so that key is not tracked here.
    expect(status.entries[0]?.drift).toEqual(['autostart', 'onPortConflict', 'stop.killPortHolders'])

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
    expect(live.command).toBe('dsh')
    expect(live.args).toEqual(['web'])

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
})

describe('config compatibility', () => {
  it('refuses to write a kill policy the answering panel cannot parse', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel, panelVersion: '0.5.0' })
    await expect(service.call('entries.apply', {
      intents: [{ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true }],
    })).rejects.toMatchObject({ code: 'KILL_UNSUPPORTED' })
    // Nothing was written to the panel.
    expect(panel.servers).toHaveLength(0)
  })

  it('allows it once the panel is new enough', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel, panelVersion: '0.6.1' })
    const entries = await service.call('entries.apply', {
      intents: [{ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true }],
    }) as Array<{ intent: { id: string } }>
    expect(entries[0]?.intent.id).toBe('dsh')
    expect(panel.servers[0]?.config.onPortConflict).toBe('kill')
  })

  it('allows a policy that needs nothing from the panel', async () => {
    const panel = await withPanel()
    const { service } = await harness({ panel, panelVersion: '0.5.0' })
    await service.call('entries.apply', {
      intents: [{ id: 'dsh', autostart: true, onPortConflict: 'reclaim', stopKillPortHolders: false }],
    })
    expect(panel.servers[0]?.config.onPortConflict).toBe('reclaim')
  })
})

describe('persistence needs the release that has it', () => {
  it('keeps the key when the panel is new enough', async () => {
    const panel = await withPanel()
    const { service, settings } = await harness({ panel, panelVersion: '0.6.3' })
    panel.servers.push({ id: 'other', status: 'stopped', pid: null, config: { id: 'other', command: 'sleep' } })

    await service.call('entries.apply', { intents: [{ id: 'other', autostart: true }] })

    expect(settings.intentFor('other').persistent).toBe(true)
    expect(panel.servers[0]?.config.persistent).toBe(true)
  })

  it('drops the key instead of writing one an older panel cannot parse', async () => {
    const panel = await withPanel()
    const { service, settings } = await harness({ panel, panelVersion: '0.6.1' })
    panel.servers.push({ id: 'other', status: 'stopped', pid: null, config: { id: 'other', command: 'sleep' } })

    await service.call('entries.apply', { intents: [{ id: 'other', autostart: true }] })

    expect(settings.intentFor('other').persistent).toBe(true)
    expect(panel.servers[0]?.config.persistent).toBeUndefined()
    // Not writing the key is not drift, or every entry would report one here.
    const reported = (await service.status()).entries.find(entry => entry.intent.id === 'other')
    expect(reported?.drift).toEqual([])
  })
})
