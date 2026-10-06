// @vitest-environment happy-dom
/**
 * `PortField` keeps a text draft of a numeric value, so it is the other place a local
 * state could describe a context that moved on. It carries an explicit sync effect, and
 * this drives it through the real `PanelSection` — `PortField` is internal, so the prop
 * that reaches it (`settings.panel.port`) is the honest way in, rather than exporting a
 * component only a test wants.
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { englishTranslator as t } from '../../src/client/locales.js'
import { PanelSection } from '../../src/client/section-panel.js'
import type { HomeHostedStatus } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

function status(port: number | null): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    workspace: 'default',
    workspaces: [],
    panel: {
      home: '/home/mt/.home-hosted',
      reachable: false,
      url: null,
      version: null,
      pid: null,
      writeVia: 'file',
      token: 'unknown',
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
    settings: { ...DEFAULT_SETTINGS, panel: { port } },
    lastError: null,
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

function render(port: number | null): HTMLDivElement {
  const props = {
    t,
    status: status(port),
    run: async () => ({ ok: true, value: null }),
    updateSettings: () => {},
    busy: null,
    uiStyle: 'compact',
  }
  if (root === null) {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  }
  act(() => root!.render(<PanelSection {...props} />))
  return host!
}

const portInput = (el: HTMLElement): HTMLInputElement => el.querySelector('input[type="number"]') as HTMLInputElement

describe('the panel port field follows the value it describes', () => {
  it('shows the incoming value, not a draft left over from the previous one', () => {
    const host = render(3999)
    expect(portInput(host).value).toBe('3999')
    render(6001)
    expect(portInput(host).value, 'the field must follow the new value').toBe('6001')
  })

  it('shows empty when the port becomes null, rather than the old number', () => {
    const host = render(3999)
    render(null)
    expect(portInput(host).value).toBe('')
  })
})
