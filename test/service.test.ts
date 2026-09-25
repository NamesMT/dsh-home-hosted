import { Context } from '@deepseek-ai/cordis'
import fs from 'node:fs'
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

async function harness(options: { panel?: StubPanel } = {}): Promise<Harness> {
  scratch = tempDir()
  const home = path.join(scratch.path, 'home')
  const state = path.join(scratch.path, 'state')
  fs.mkdirSync(home, { recursive: true })
  fs.mkdirSync(state, { recursive: true })

  // A deterministic CLI path: a .mjs file is run through node, so no `which` probe.
  const fakeCli = path.join(scratch.path, 'home-hosted.mjs')
  fs.writeFileSync(fakeCli, '#!/usr/bin/env node\n', 'utf8')

  if (options.panel !== undefined)
    writeJsonFile(runtimeFile(home), { version: '0.6.1', pid: process.pid, url: options.panel.url, port: 1234 })

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
    expect(status.entries[0]?.drift).toEqual(['autostart', 'onPortConflict', 'stop.killPortHolders'])

    const entries = await service.call('entries.apply', {
      intents: [{ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true }],
      adopt: true,
    }) as Array<{ drift: string[] }>

    expect(entries[0]?.drift).toEqual([])
    expect(settings.intentFor('dsh')).toEqual({ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true })

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

    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true }], adopt: true })
    await service.call('entries.apply', { intents: [{ id: 'dsh', autostart: false, onPortConflict: 'kill', stopKillPortHolders: true }] })
    expect(panel.servers[0]!.config.autostart).toBe(false)
    // A pause never issues a start/stop action.
    expect(panel.requests.some(entry => entry.path.endsWith('/stop') || entry.path.endsWith('/start'))).toBe(false)

    await service.call('entries.restore', { id: 'dsh' })
    expect(panel.servers[0]!.config.onPortConflict).toBe('warn')
    expect(settings.get().entries).toEqual([])
    expect(settings.intentFor('dsh').onPortConflict).toBe('kill')
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
})
