import { describe, expect, it } from 'vitest'
import type { HomeHostedStatus, ManagedEntryStatus, ServerEntryView } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'
import { englishTranslator } from '../../src/client/locales.js'
import { serversRunning, statusSignals } from '../../src/client/status.js'

const t = englishTranslator

function status(overrides: Partial<HomeHostedStatus> = {}): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    panel: {
      home: '/home/mt/.home-hosted',
      reachable: true,
      url: 'http://127.0.0.1:3999',
      version: '0.6.1',
      pid: 4242,
      writeVia: 'api',
      token: 'enrolled',
      detail: 'using the stored panel token',
    },
    boot: {
      platform: 'linux',
      mechanism: 'systemd-user',
      recommended: 'systemd-user',
      state: 'enabled-running',
      bootCapable: true,
      privileged: true,
      unitPath: '/etc/systemd/user/home-hosted.service',
      commands: [],
      detail: 'UnitFileState=enabled',
      candidates: [],
    },
    entries: [],
    servers: [],
    settings: DEFAULT_SETTINGS,
    lastError: null,
    ...overrides,
  }
}

function entry(overrides: Partial<ManagedEntryStatus> = {}): ManagedEntryStatus {
  return {
    intent: { id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: false, persistent: false },
    exists: true,
    managed: true,
    drift: [],
    live: { id: 'dsh', status: 'running', pid: 99, url: null, config: { id: 'dsh' } },
    snapshot: null,
    ...overrides,
  }
}

function server(id: string, running: boolean): ServerEntryView {
  return {
    id,
    status: running ? 'running' : 'stopped',
    pid: running ? 7 : null,
    url: null,
    config: { id },
  }
}

function byKey(status_: HomeHostedStatus, key: string) {
  const signal = statusSignals(status_, t).find(candidate => candidate.key === key)
  if (signal === undefined) throw new Error(`no signal ${key}`)
  return signal
}

describe('panel signal', () => {
  it('reads answering, with its version and address', () => {
    expect(byKey(status(), 'panel')).toEqual({
      key: 'panel',
      tone: 'ok',
      name: 'Panel',
      state: 'answering',
      meta: '0.6.1',
      href: 'http://127.0.0.1:3999',
    })
  })

  it('falls back to the resolved home while nothing answers', () => {
    const signal = byKey(status({ panel: { ...status().panel, reachable: false } }), 'panel')
    expect(signal.tone).toBe('idle')
    expect(signal.state).toBe('not answering')
    expect(signal.meta).toBe('/home/mt/.home-hosted')
    expect(signal.href).toBeNull()
  })

  it('flags a panel the host could not reach at all', () => {
    const signal = byKey(status({ lastError: 'connect ECONNREFUSED', panel: { ...status().panel, reachable: false } }), 'panel')
    expect(signal.tone).toBe('bad')
  })
})

describe('autostart signal', () => {
  it('reads a running boot entry with its mechanism', () => {
    expect(byKey(status(), 'autostart')).toMatchObject({
      tone: 'ok',
      state: 'enabled, running',
      meta: 'systemd-user',
    })
  })

  it('warns when autostart was requested but nothing is installed', () => {
    const requested = status({
      boot: { ...status().boot, state: 'not-installed' },
      settings: { ...DEFAULT_SETTINGS, autostart: { enabled: true, mechanism: 'auto' } },
    })
    expect(byKey(requested, 'autostart')).toMatchObject({ tone: 'warn', state: 'not installed' })
  })

  it('stays idle when autostart is simply off', () => {
    const off = status({ boot: { ...status().boot, state: 'not-installed' } })
    expect(byKey(off, 'autostart').tone).toBe('idle')
  })

  it('separates installed-but-off from failing', () => {
    expect(byKey(status({ boot: { ...status().boot, state: 'installed-disabled' } }), 'autostart').tone).toBe('warn')
    expect(byKey(status({ boot: { ...status().boot, state: 'enabled-failing' } }), 'autostart').tone).toBe('bad')
  })

  it('shows no mechanism for automatic while none is installed', () => {
    const auto = status({
      boot: { ...status().boot, mechanism: null, state: 'not-installed' },
      settings: { ...DEFAULT_SETTINGS, autostart: { enabled: false, mechanism: 'auto' } },
    })
    expect(byKey(auto, 'autostart').meta).toBe('')
  })

  it('names the chosen mechanism once there is no installed one', () => {
    const chosen = status({
      boot: { ...status().boot, mechanism: null, state: 'not-installed' },
      settings: { ...DEFAULT_SETTINGS, autostart: { enabled: false, mechanism: 'launchd-agent' } },
    })
    expect(byKey(chosen, 'autostart').meta).toBe('launchd-agent')
  })
})

describe('entry signal', () => {
  it('reads an unmanaged entry the host still reports', () => {
    // `entriesStatus` always reports the harness entry; only the intent switch
    // says whether this plugin manages it.
    expect(byKey(status({ entries: [entry()] }), 'entry')).toMatchObject({
      tone: 'idle',
      name: 'dsh entry',
      state: 'not managed',
      meta: 'running · pid 99',
    })
  })

  it('names the entry the host manages, not a hardcoded dsh', () => {
    expect(byKey(status({ defaultEntryId: 'harness' }), 'entry').name).toBe('harness entry')
  })

  it('reads a managed, running entry with its pid', () => {
    const managed = status({
      entries: [entry()],
      settings: { ...DEFAULT_SETTINGS, manageDsh: true },
    })
    expect(byKey(managed, 'entry')).toMatchObject({
      tone: 'ok',
      state: 'managed',
      meta: 'running · pid 99',
    })
  })

  it('says nothing is running when there is no entry at all', () => {
    expect(byKey(status(), 'entry').meta).toBe('not running')
  })

  it('fails loudly when a managed entry is missing from the config', () => {
    const missing = status({
      entries: [entry({ exists: false, live: null })],
      settings: { ...DEFAULT_SETTINGS, manageDsh: true },
    })
    expect(byKey(missing, 'entry').tone).toBe('bad')
  })

  it('warns on drift and on a managed entry that is not running', () => {
    const settings = { ...DEFAULT_SETTINGS, manageDsh: true }
    expect(byKey(status({ entries: [entry({ drift: ['autostart'] })], settings }), 'entry').tone).toBe('warn')
    expect(byKey(status({ entries: [entry({ live: null })], settings }), 'entry')).toMatchObject({
      tone: 'warn',
      meta: 'not running',
    })
  })

  it('keeps quiet about a missing entry it does not manage', () => {
    expect(byKey(status({ entries: [entry({ exists: false, live: null })] }), 'entry').tone).toBe('idle')
  })
})

describe('serversRunning', () => {
  it('counts the running servers out of the reported ones', () => {
    expect(serversRunning([server('a', true), server('b', false), server('c', true)], t)).toBe('2 of 3 running')
    expect(serversRunning([], t)).toBe('0 of 0 running')
  })
})
