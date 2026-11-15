import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EntriesSection } from '../../src/client/section-entries.js'
import { statusSignals } from '../../src/client/status.js'
import { en, englishTranslator } from '../../src/client/locales.js'
import { sectionProps as props } from '../helpers/section-props.js'
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

function status(surface: 'web' | 'desktop', manageDsh = true, platform: 'linux' | 'win32' = 'linux'): HomeHostedStatus {
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
      platform,
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

/**
 * The Windows `kill`-policy warning describes a *managed* entry.
 *
 * On Desktop the harness entry is never managed — the switch is forced off and the
 * web-only note already says why — so the sentence warns about a state the person
 * cannot reach. It stays on Windows web, where the handover really happens.
 */
describe('the Windows kill-policy warning', () => {
  it('is not shown on Desktop, where the entry is never managed', () => {
    const html = markup(status('desktop', true, 'win32'))
    expect(html).not.toContain(asMarkup(en.entriesManageWinWarning.replace('{id}', 'dsh')))
    // The web-only explanation is what the person should read instead.
    expect(html).toContain(asMarkup(en.entriesManageDesktop.replace('{id}', 'dsh')))
  })

  it('is still shown on Windows web, where the entry is handed over', () => {
    const html = markup(status('web', true, 'win32'))
    expect(html).toContain(asMarkup(en.entriesManageWinWarning.replace('{id}', 'dsh')))
  })

  it('is not shown off Windows', () => {
    const html = markup(status('web', true, 'linux'))
    expect(html).not.toContain(asMarkup(en.entriesManageWinWarning.replace('{id}', 'dsh')))
  })
})
