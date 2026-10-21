// @vitest-environment happy-dom
/**
 * A give-up must not look like a deliberate stop.
 *
 * 0.9.4 stops an entry outright once its health-restart budget is spent and reports it `stopped`
 * with `stoppedByPanel: true`. The raw status chip rendered that identically to a server someone
 * switched off — a broken service presented as a choice. Driven through the real component, because
 * the failure was in the rendering, not in a helper.
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { englishTranslator as t } from '../../src/client/locales.js'
import type { SectionProps } from '../../src/client/props.js'
import { ServersSection } from '../../src/client/section-servers.js'
import type { HomeHostedStatus, ServerEntryView } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

function status(): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    workspace: 'default',
    workspaces: [{ id: 'default', label: 'default', servers: 1, running: 0, source: 'api' }],
    panel: {
      home: '/home/mt/.home-hosted',
      reachable: true,
      url: 'http://127.0.0.1:3999',
      version: '0.9.4',
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
  } satisfies HomeHostedStatus
}

function server(overrides: Partial<ServerEntryView> = {}): ServerEntryView {
  return {
    id: 'web',
    workspace: 'default',
    status: 'stopped',
    pid: null,
    url: null,
    config: { id: 'web', command: 'node', port: 8080 },
    ...overrides,
  }
}

let host: HTMLDivElement | null = null
let root: ReturnType<typeof createRoot> | null = null

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  host = null
  root = null
})

function mount(servers: ServerEntryView[]): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const props: SectionProps & { workspace: string, servers: ServerEntryView[], serversError: null } = {
    t,
    status: status(),
    run: async () => ({ ok: true, value: null }),
    updateSettings: () => {},
    busy: null,
    uiStyle: 'compact',
    workspace: 'default',
    servers,
    serversError: null,
  }
  act(() => root!.render(<ServersSection {...props} />))
  return host
}

describe('an entry the panel stopped', () => {
  it('says the panel stopped it, rather than showing a bare "stopped"', () => {
    const host = mount([server({ stoppedByPanel: true })])
    expect(host.textContent, 'the chip must name the panel as the cause').toContain('Stopped by the panel')
    // …and it must not read as an ordinary stop.
    expect(host.textContent).not.toMatch(/\bstopped\b(?!\s*by the panel)/i)
  })

  it('leaves a deliberate stop looking ordinary', () => {
    const host = mount([server()])
    expect(host.textContent).toContain('stopped')
    expect(host.textContent, 'a stop someone asked for is not the panel giving up').not.toContain('Stopped by the panel')
  })

  it('still shows a plain chip when an older panel sends no flag', () => {
    // The field is optional: a 0.9.2 panel never sends it, and must not be reported as a give-up.
    const host = mount([server({ stoppedByPanel: undefined })])
    expect(host.textContent).toContain('stopped')
    expect(host.textContent).not.toContain('Stopped by the panel')
  })
})
