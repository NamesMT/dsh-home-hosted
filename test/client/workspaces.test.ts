import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  EMPTY_DRAFT,
  createBodyFromDraft,
  draftFromEntry,
  parseArgs,
  parsePort,
  patchFromDraft,
} from '../../src/client/entry-editor.js'
import { en, englishTranslator } from '../../src/client/locales.js'
import type { SectionProps } from '../../src/client/props.js'
import {
  createPayload,
  deletePayload,
  lifecyclePayload,
  ServersSection,
  updatePayload,
} from '../../src/client/section-servers.js'
import { WorkspacesSection } from '../../src/client/section-workspaces.js'
import type { HomeHostedStatus, ManagedEntryStatus, ServerEntryView, WorkspaceSummary } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

const t = englishTranslator

const workspaces: WorkspaceSummary[] = [
  { id: 'default', label: 'default', servers: 2, running: 1, source: 'api' },
  { id: 'edge', label: 'edge', servers: 1, running: 0, source: 'file' },
]

function status(overrides: Partial<HomeHostedStatus> = {}): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    workspace: 'default',
    workspaces,
    panel: {
      home: '/home/mt/.home-hosted',
      reachable: true,
      url: 'http://127.0.0.1:3999',
      version: '0.7.1',
      pid: 42,
      writeVia: 'api',
      token: 'enrolled',
      detail: '',
    },
    boot: {
      platform: 'linux',
      mechanism: null,
      recommended: null,
      state: 'not-installed',
      bootCapable: true,
      privileged: false,
      unitPath: null,
      commands: [],
      detail: '',
      candidates: [],
    },
    entries: [],
    servers: [],
    settings: DEFAULT_SETTINGS,
    lastError: null,
    ...overrides,
  }
}

function props(status_: HomeHostedStatus, overrides: Partial<SectionProps> = {}): SectionProps {
  return {
    t,
    status: status_,
    run: async () => ({ ok: true, value: null }),
    updateSettings: () => {},
    busy: null,
    uiStyle: 'detailed',
    ...overrides,
  }
}

function server(id: string, workspace: string, running = true): ServerEntryView {
  return {
    id,
    workspace,
    status: running ? 'running' : 'stopped',
    pid: running ? 7 : null,
    url: null,
    config: { id, command: 'node', port: 8080 },
  }
}

function entry(intent: ManagedEntryStatus['intent']): ManagedEntryStatus {
  return { intent, exists: true, managed: true, drift: [], live: null, snapshot: null }
}

describe('the workspace picker', () => {
  it('lists every workspace with its counts and marks the managed one', () => {
    const markup = renderToStaticMarkup(createElement(WorkspacesSection, {
      ...props(status()),
      viewing: 'default',
      onView: () => {},
    }))
    expect(markup).toContain('default')
    expect(markup).toContain('edge')
    expect(markup).toContain(en.workspacesManagedTag)
    expect(markup).toContain(t('workspacesCounts', { servers: 2, running: 1 }))
    // The managed workspace is marked, never chosen: it is the panel's default.
    expect(markup).not.toContain('Workspace the plugin manages')
  })

  it('says a file-sourced list is not live state', () => {
    const markup = renderToStaticMarkup(createElement(WorkspacesSection, {
      ...props(status()),
      viewing: 'edge',
      onView: () => {},
    }))
    expect(markup).toContain(en.workspacesDegraded)
    expect(markup).toContain(t('workspacesCountsFile', { servers: 1 }))
    // The file source never claims a live running count.
    expect(markup).not.toContain(t('workspacesCounts', { servers: 1, running: 0 }))
  })

  it('offers the migration only for a pre-0.7 root', () => {
    const legacy = renderToStaticMarkup(createElement(WorkspacesSection, {
      ...props(status({ legacyRoot: true })),
      viewing: 'default',
      onView: () => {},
    }))
    expect(legacy).toContain(en.workspaceLegacyTitle)
    expect(legacy).toContain(en.workspaceMigrate)

    const current = renderToStaticMarkup(createElement(WorkspacesSection, {
      ...props(status()),
      viewing: 'default',
      onView: () => {},
    }))
    expect(current).not.toContain(en.workspaceMigrate)
  })
})

describe('the servers section follows the viewed workspace', () => {
  it('names the workspace its entries were read from', () => {
    const markup = renderToStaticMarkup(createElement(ServersSection, {
      ...props(status()),
      workspace: 'edge',
      servers: [server('web', 'edge')],
      serversError: null,
    }))
    expect(markup).toContain(en.serversWorkspace)
    expect(markup).toContain('edge')
    expect(markup).toContain('web')
  })

  it('keeps the managed entry badge off a same-named entry in another workspace', () => {
    const managed = status({
      entries: [entry({ id: 'web', persistent: true, autostart: true, onPortConflict: 'block', stopKillPortHolders: false })],
    })
    const onManaged = renderToStaticMarkup(createElement(ServersSection, {
      ...props(managed),
      workspace: 'default',
      servers: [server('web', 'default')],
      serversError: null,
    }))
    expect(onManaged).toContain(en.serversPersistent)

    const onOther = renderToStaticMarkup(createElement(ServersSection, {
      ...props(managed),
      workspace: 'edge',
      servers: [server('web', 'edge')],
      serversError: null,
    }))
    expect(onOther).not.toContain(en.serversPersistent)
  })

  it('surfaces the list failure instead of an empty page', () => {
    const markup = renderToStaticMarkup(createElement(ServersSection, {
      ...props(status()),
      workspace: 'edge',
      servers: [],
      serversError: { code: 'PANEL_UNAVAILABLE', message: 'no panel is running' },
    }))
    expect(markup).toContain('PANEL_UNAVAILABLE')
    expect(markup).toContain('no panel is running')
  })
})

describe('every servers call carries its workspace', () => {
  it('builds the payload with the workspace beside the id', () => {
    expect(lifecyclePayload('edge', 'web')).toEqual({ workspace: 'edge', id: 'web' })
    expect(deletePayload('edge', 'web')).toEqual({ workspace: 'edge', id: 'web' })
    expect(createPayload('edge', { id: 'web', command: 'node' })).toEqual({
      workspace: 'edge',
      entry: { id: 'web', command: 'node' },
    })
    expect(updatePayload('edge', 'web', { port: 9090 })).toEqual({
      workspace: 'edge',
      id: 'web',
      patch: { port: 9090 },
    })
  })

  it('routes every `servers.*` rpc call in the section through one of them', () => {
    const source = readFileSync('src/client/section-servers.tsx', 'utf8')
    const calls = [...source.matchAll(/rpc\('servers\.[A-Za-z]+',\s*([^)]*)/g)]
    expect(calls.length).toBeGreaterThanOrEqual(7)
    // The first argument is the workspace the section was handed, never a
    // literal or the managed workspace the status snapshot carries.
    for (const call of calls) expect(call[1]).toContain('Payload(workspace')
  })

  it('lists the picked workspace rather than the status snapshot', () => {
    const source = readFileSync('src/client/page.tsx', 'utf8')
    expect(source).toMatch(/rpc\('servers\.list',\s*\{\s*workspace\s*\}\)/)
  })
})

describe('the entry editor', () => {
  it('creates only what the person decided', () => {
    expect(createBodyFromDraft({ ...EMPTY_DRAFT, id: 'web', command: 'node' }))
      .toEqual({ id: 'web', command: 'node' })
    expect(createBodyFromDraft({
      ...EMPTY_DRAFT,
      id: 'web',
      command: 'node',
      args: 'server.js\n--port\n8080',
      port: '8080',
      autostart: 'on',
      onPortConflict: 'reclaim',
    })).toEqual({
      id: 'web',
      command: 'node',
      args: ['server.js', '--port', '8080'],
      port: 8080,
      autostart: true,
      onPortConflict: 'reclaim',
    })
  })

  it('refuses an unusable create body', () => {
    expect(createBodyFromDraft({ ...EMPTY_DRAFT, id: 'Web', command: 'node' })).toBeNull()
    expect(createBodyFromDraft({ ...EMPTY_DRAFT, id: 'web', command: '  ' })).toBeNull()
  })

  it('sends only the fields an edit changed', () => {
    const stored = { id: 'web', command: 'node', args: ['server.js'], port: 8080, autostart: true }
    const draft = draftFromEntry(stored)
    expect(patchFromDraft(stored, draft)).toBeNull()
    expect(patchFromDraft(stored, { ...draft, port: '9090' })).toEqual({ port: 9090 })
    // An empty port clears it; the panel's patch schema carries `null`.
    expect(patchFromDraft(stored, { ...draft, port: '' })).toEqual({ port: null })
    expect(patchFromDraft(stored, { ...draft, args: '' })).toEqual({ args: [] })
  })

  it('reads ports and arguments tolerantly', () => {
    expect(parsePort('')).toBeNull()
    expect(parsePort('8080')).toBe(8080)
    expect(parsePort('0')).toBe('invalid')
    expect(parsePort('70000')).toBe('invalid')
    expect(parsePort('80.5')).toBe('invalid')
    expect(parseArgs(' a \n\nb\n')).toEqual(['a', 'b'])
  })
})
