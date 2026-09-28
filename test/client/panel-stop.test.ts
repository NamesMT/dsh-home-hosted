import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PanelSection, stopNoteFor } from '../../src/client/section-panel.js'
import { en, englishTranslator } from '../../src/client/locales.js'
import type { SectionProps } from '../../src/client/props.js'
import type { Envelope, HomeHostedStatus } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

function status(reachable: boolean, extra: Partial<HomeHostedStatus> = {}): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    panel: {
      home: '/home/mt/.dsh/dsh-home-hosted/panel',
      reachable,
      url: reachable ? 'http://127.0.0.1:3999' : null,
      version: reachable ? '0.6.7' : null,
      pid: reachable ? 42 : null,
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
    ...extra,
  }
}

function panelMarkup(status_: HomeHostedStatus): string {
  const props: SectionProps = {
    t: englishTranslator,
    status: status_,
    run: async () => ({ ok: true, value: null }),
    updateSettings: () => {},
    busy: null,
    uiStyle: 'compact',
  }
  return renderToStaticMarkup(createElement(PanelSection, props))
}

describe('the stop-panel note', () => {
  const ok = (value: unknown): Envelope<unknown> => ({ ok: true, value })
  const failed = (code: string, message: string): Envelope<unknown> => ({ ok: false, error: { code, message } })

  it('shows the host\'s own detail when it has one', () => {
    expect(stopNoteFor(ok({ detail: 'the panel stopped; the servers it supervised stopped with it' }), englishTranslator))
      .toContain('servers it supervised stopped')
  })

  it('still says the panel stopped when the host gave no detail', () => {
    expect(stopNoteFor(ok(null), englishTranslator)).toBe(en.panelStopped)
  })

  it('treats a dropped connection as in-progress, not as a failure', () => {
    // Stopping the panel this session runs under kills the connection, so the
    // call cannot answer — claiming a failure there would be false.
    expect(stopNoteFor(failed('client', 'Failed to fetch'), englishTranslator)).toBe(en.panelStopping)
  })

  it('reports a refusal the host actually sent', () => {
    const note = stopNoteFor(failed('error', 'the panel did not stop: exit 1'), englishTranslator)
    expect(note).toContain('did not stop')
    expect(note).toContain('exit 1')
  })
})

describe('the stop-panel button', () => {
  it('offers a stop only while a panel is answering', () => {
    expect(panelMarkup(status(true))).toContain(en.panelStop)
    expect(panelMarkup(status(false))).not.toContain(en.panelStop)
  })

  it('asks before stopping, naming what stops with it', () => {
    // The dialog only appears after the button, so the static markup proves the
    // button is offered and its warning text exists for the confirm step.
    expect(en.panelStopBody).toContain('every server it supervises')
    expect(en.panelStopBody).toContain('this session included')
  })
})

describe('the panel root this instance drives', () => {
  it('names the root and the boot artifact it owns', () => {
    const markup = panelMarkup(status(true, { panelRoot: '/home/mt/.dsh/dsh-home-hosted/panel', bootUnitName: 'home-hosted-1a2b3c4d', panelRootSource: 'instance' }))
    expect(markup).toContain(en.panelHome)
    expect(markup).toContain('home-hosted-1a2b3c4d')
    expect(markup).not.toContain(en.panelRootLegacy)
  })

  it('says when a legacy panel was adopted instead of an instance root', () => {
    const markup = panelMarkup(status(true, { panelRoot: '/home/mt/.home-hosted', panelRootSource: 'legacy' }))
    expect(markup).toContain(en.panelRootLegacy)
  })
})
