import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EntriesSection } from '../../src/client/section-entries.js'
import { statusSignals } from '../../src/client/status.js'
import { en, englishTranslator } from '../../src/client/locales.js'
import type { SectionProps } from '../../src/client/props.js'
import type { HomeHostedStatus, ManagedEntryStatus } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

/** The host's entry status, which is all this section reads beyond `surface`. */
const entryStatus: ManagedEntryStatus = {
  intent: { id: 'dsh', autostart: true, onPortConflict: 'kill', stopKillPortHolders: true, persistent: true },
  exists: true,
  managed: false,
  drift: [],
  live: null,
  snapshot: null,
}

function status(surface: 'web' | 'desktop', manageDsh = true): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    surface,
    workspace: 'default',
    workspaces: [],
    panel: {
      home: '/home/mt/.home-hosted',
      reachable: true,
      url: 'http://127.0.0.1:3999',
      version: '0.7.2',
      pid: 1,
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
    entries: [entryStatus],
    servers: [],
    settings: { ...DEFAULT_SETTINGS, manageDsh },
    lastError: null,
  }
}

function props(status_: HomeHostedStatus): SectionProps {
  return {
    t: englishTranslator,
    status: status_,
    run: async () => ({ ok: true, value: null }),
    updateSettings: () => {},
    busy: null,
    uiStyle: 'detailed',
  }
}

const markup = (status_: HomeHostedStatus): string =>
  renderToStaticMarkup(createElement(EntriesSection, props(status_)))

/** React escapes apostrophes in static markup, so compare on the rendered text. */
const asMarkup = (text: string): string => text.replace(/'/g, '&#x27;')

describe('the entries section on Desktop', () => {
  it('says the harness entry is web only, instead of offering a toggle', () => {
    const html = markup(status('desktop'))
    expect(html).toContain(asMarkup(en.entriesManageDesktop.replace('{id}', 'dsh')))
    // The note that promises a handover must not appear where it cannot happen.
    expect(html).not.toContain(en.entriesManageNote.replace('{id}', 'dsh'))
    expect(html).toContain('disabled')
  })

  it('never renders a checked toggle, even when a stored intent says managed', () => {
    // A settings file carried over from web must not show a switch that lies.
    const html = markup(status('desktop', true))
    expect(html).not.toContain('aria-checked="true"')
    expect(html).toContain('aria-checked="false"')
  })

  it('keeps the web behaviour, note and toggle included', () => {
    const html = markup(status('web'))
    expect(html).toContain(asMarkup(en.entriesManageNote.replace('{id}', 'dsh')))
    expect(html).not.toContain(asMarkup(en.entriesManageDesktop.replace('{id}', 'dsh')))
    expect(html).toContain('aria-checked="true"')
  })

  it('reports the entry signal as web only, not as an unmanaged entry', () => {
    const signals = statusSignals(status('desktop'), englishTranslator)
    const entry = signals.find(signal => signal.key === 'entry')
    expect(entry?.state).toBe(en.stateWebOnly)
    expect(entry?.tone).toBe('idle')
  })
})
