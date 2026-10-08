import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { controlNoteFor, PanelSection, stopNoteFor } from '../../src/client/section-panel.js'
import { en, englishTranslator } from '../../src/client/locales.js'
import { sectionProps } from '../helpers/section-props.js'
import type { Envelope, HomeHostedStatus } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

function status(reachable: boolean, extra: Partial<HomeHostedStatus> = {}): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    workspace: 'default',
    workspaces: [],
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
  // The stop-panel section is the compact row list.
  return renderToStaticMarkup(createElement(PanelSection, sectionProps(status_, { uiStyle: 'compact' })))
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
    // Stopping the panel this session runs under kills the connection, so the call cannot
    // answer — claiming a failure there would be false.
    //
    // The codes are the ones that can actually arrive, not a convenience: `rpc()` catches its
    // own fetch rejection and returns `failure('network', …)` — it never throws — so `network`
    // is what a dropped transport produces. `client` comes from `page.tsx`'s `run()` catch,
    // when the call throws instead of returning an envelope. The test used only `client`,
    // which is why an unreachable branch passed for the real path.
    for (const code of ['network', 'no-fetch', 'client'])
      expect(stopNoteFor(failed(code, 'Failed to fetch'), englishTranslator), code).toBe(en.panelStopping)
  })

  it('still reports a real refusal, and the codes it must not treat as dropped', () => {
    // An `http` failure is the panel answering badly, and `error` is its own refusal: both are
    // failures and neither may be swallowed as "in progress".
    for (const code of ['error', 'http', 'bad-response', 'bad-json']) {
      const note = stopNoteFor(failed(code, 'the panel did not stop'), englishTranslator)
      expect(note, code).toContain('did not stop')
    }
  })

  it('reports a refusal the host actually sent', () => {
    const note = stopNoteFor(failed('error', 'the panel did not stop: exit 1'), englishTranslator)
    expect(note).toContain('did not stop')
    expect(note).toContain('exit 1')
  })
})

describe('the start-panel and replace-panel notes', () => {
  const ok = (value: unknown): Envelope<unknown> => ({ ok: true, value })
  const failed = (code: string, message: string): Envelope<unknown> => ({ ok: false, error: { code, message } })

  it('surfaces a refusal that rode a successful envelope', () => {
    // The host answers `{ ok: false, detail }` inside a successful envelope: a CLI
    // that exited non-zero, or a helper that never spawned. Reading only
    // `envelope.ok` made the button return in silence.
    const note = controlNoteFor(ok({ ok: false, detail: 'the CLI exited 1' }), englishTranslator, 'start')
    expect(note).toContain('did not start')
    expect(note).toContain('the CLI exited 1')
  })

  it('names the replace action when a takeover was refused', () => {
    const note = controlNoteFor(ok({ ok: false, detail: 'could not start the helper' }), englishTranslator, 'replace')
    expect(note).toContain('was not replaced')
    expect(note).toContain('could not start the helper')
  })

  it('surfaces a transport-level failure too', () => {
    expect(controlNoteFor(failed('error', 'the CLI could not be run'), englishTranslator, 'start'))
      .toContain('the CLI could not be run')
  })

  it('says nothing when the start succeeded', () => {
    expect(controlNoteFor(ok({ ok: true, detail: 'a panel is already answering' }), englishTranslator, 'start'))
      .toBe('a panel is already answering')
    expect(controlNoteFor(ok({ ok: true }), englishTranslator, 'start')).toBeNull()
  })
})

describe('the stop-panel button', () => {
  it('offers a stop only while a panel is answering', () => {
    expect(panelMarkup(status(true))).toContain(en.panelStop)
    expect(panelMarkup(status(false))).not.toContain(en.panelStop)
  })

  it('asks before stopping, naming what stops with it — non-persistent entries only', () => {
    // The dialog only appears after the button, so the static markup proves the
    // button is offered and its warning text exists for the confirm step.
    expect(en.panelStopBody).toContain('non-persistent')
    expect(en.panelStopBody).toContain('Persistent entries keep running')
    // The claim this replaced — "this session included, so the page disconnects" —
    // was false for a managed entry: `defaultIntent` writes `persistent: true`, and
    // home-hosted's `down`/`stop-all` deliberately leave a persistent entry alone.
    // Measured: a persistent HTTP entry still answered 200 after the panel was down.
    expect(en.panelStopBody).not.toContain('this session included')
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
