import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AgentsSection } from '../../src/client/section-agents.js'
import { PanelSection, reclaimNote } from '../../src/client/section-panel.js'
import { en, englishTranslator, zh } from '../../src/client/locales.js'
import type { SectionProps } from '../../src/client/props.js'
import type { HomeHostedStatus, TokenState } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

const PANEL_URL = 'http://127.0.0.1:3999'

/** `started` is what gives the panel a `url`: the process exists to enrol against. */
function status(token: TokenState, reachable: boolean, started: boolean, detail = ''): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    workspace: 'default',
    workspaces: [],
    panel: {
      home: '/home/mt/.home-hosted',
      reachable,
      url: started ? PANEL_URL : null,
      version: reachable ? '0.6.1' : null,
      pid: null,
      writeVia: 'none',
      token,
      detail,
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
  }
}

function props(status_: HomeHostedStatus, overrides: Partial<SectionProps> = {}): SectionProps {
  return {
    t: englishTranslator,
    status: status_,
    run: async () => ({ ok: true, value: null }),
    updateSettings: () => {},
    busy: null,
    uiStyle: 'compact',
    ...overrides,
  }
}

function panelMarkup(status_: HomeHostedStatus): string {
  return renderToStaticMarkup(createElement(PanelSection, props(status_)))
}

const STATE_KEYS: Record<'absent' | 'present' | 'stale', string> = {
  absent: en.panelTokenWarnAbsent,
  present: en.panelTokenWarnPresent,
  stale: en.panelTokenWarnStale,
}

/** React escapes apostrophes in static markup, so compare on the rendered text. */
const asMarkup = (text: string): string => text.replace(/'/g, '&#x27;')

describe('panel token warning', () => {
  for (const [token, text] of Object.entries(STATE_KEYS) as Array<['absent' | 'present' | 'stale', string]>) {
    it(`warns for a measured ${token} token, reachable or not`, () => {
      for (const reachable of [true, false]) {
        const markup = panelMarkup(status(token, reachable, true))
        expect(markup).toContain(en.panelTokenWarningTitle)
        expect(markup).toContain(asMarkup(text))
        expect(markup).toContain(en.panelTokenRegenerate)
      }
    })
  }

  it('names the token as the cause for each measured state', () => {
    expect(panelMarkup(status('absent', true, true))).toContain('no API token for the panel')
    expect(panelMarkup(status('present', true, true))).toContain('home-hosted holds an API token this plugin does not have')
    expect(panelMarkup(status('stale', true, true))).toContain('The panel refused this plugin')
  })

  // The user's case: the panel was started, has no usable token, and does not
  // answer — so the state was never measured and reads `unknown`.
  it('warns for an unknown token whose panel process was started', () => {
    const markup = panelMarkup(status('unknown', false, true, 'the panel process is alive but is not answering'))
    expect(markup).toContain(en.panelTokenWarningTitle)
    expect(markup).toContain(en.panelTokenWarnUnreachable)
    expect(markup).toContain(en.panelTokenRegenerate)
  })

  it('adds the start-the-panel line to a measured token while the panel is silent', () => {
    expect(panelMarkup(status('absent', false, true))).toContain(en.panelTokenWarnPanelDown)
  })

  it('does not repeat the start-the-panel line in the unmeasured branch', () => {
    const markup = panelMarkup(status('unknown', false, true))
    expect(markup).toContain('the panel may need starting')
    expect(markup).not.toContain(en.panelTokenWarnPanelDown)
  })

  it('keeps the extra line off a panel that is answering', () => {
    expect(panelMarkup(status('absent', true, true))).not.toContain(en.panelTokenWarnPanelDown)
  })

  it('stays silent for a healthy enrolled token', () => {
    const markup = panelMarkup(status('enrolled', true, true))
    expect(markup).not.toContain(en.panelTokenWarningTitle)
    expect(markup).not.toContain(en.panelTokenRegenerate)
  })

  it('stays silent for a panel that was never started', () => {
    // No `url` means no run.json: nothing could have been enrolled yet, so the
    // honest page is the panel signal plus the Start panel button.
    const markup = panelMarkup(status('unknown', false, false, 'no run.json: the panel is not running'))
    expect(markup).not.toContain(en.panelTokenWarningTitle)
    expect(markup).not.toContain(en.panelTokenRegenerate)
  })

  it('keeps the Chinese copy naming the token', () => {
    expect(zh.panelTokenRegenerate).toBe('重新生成令牌')
    expect(zh.panelTokenWarnAbsent).toContain('API 令牌')
    expect(zh.panelTokenWarnUnreachable).toContain('API 令牌')
  })
})

describe('reclaimNote', () => {
  it('carries the host detail when the panel answered and proved the token', () => {
    const detail = 'enrolled a fresh panel API token; the panel accepted it'
    const envelope = { ok: true as const, value: status('enrolled', true, true, detail) }
    expect(reclaimNote(envelope, englishTranslator)).toBe(detail)
  })

  it('surfaces the host detail when the silent panel could not prove it', () => {
    const detail = 'enrolled a fresh panel API token; the panel is not answering, so it could not be proved yet'
    const envelope = { ok: true as const, value: status('unknown', false, true, detail) }
    expect(reclaimNote(envelope, englishTranslator)).toBe(detail)
  })

  it('falls back to the fixed success line without a settled status', () => {
    expect(reclaimNote({ ok: true, value: null }, englishTranslator)).toBe(en.panelTokenRegenerated)
  })

  it('carries the host error on a refusal', () => {
    const envelope = { ok: false as const, error: { code: 'PANEL_UNAVAILABLE', message: 'start it first' } }
    expect(reclaimNote(envelope, englishTranslator)).toBe('The token was not replaced: start it first')
  })
})

interface ElementLike { props: Record<string, unknown> }

/** Recursively collect rendered elements whose `label` prop matches. */
function labelled(node: unknown, label: string): ElementLike[] {
  if (Array.isArray(node)) return node.flatMap(child => labelled(child, label))
  if (node === null || typeof node !== 'object') return []
  const element = node as { props?: Record<string, unknown> }
  if (element.props === undefined) return []
  const self = element.props.label === label ? [element as ElementLike] : []
  const children = element.props.children
  const nested = Array.isArray(children) ? children : [children]
  return self.concat(nested.flatMap(child => labelled(child, label)))
}

function agentsBlocks(status_: HomeHostedStatus, overrides: Partial<SectionProps> = {}): ElementLike[] {
  const element = AgentsSection(props(status_, overrides)) as unknown as { props: { children: unknown[] } }
  return element.props.children as ElementLike[]
}

describe('reclaim toggle', () => {
  it('sits in the Agents section, below the master switch and above its hint', () => {
    const blocks = agentsBlocks(status('enrolled', true, true))
    const master = blocks.findIndex(block => block.props.label === en.agentMaster)
    const reclaim = blocks.findIndex(block => labelled(block, en.reclaimAutoLabel).length === 1)
    const approval = blocks.findIndex(block => block.props.children === en.agentApproval)
    expect(master).toBeGreaterThanOrEqual(0)
    expect(reclaim).toBeGreaterThan(master)
    expect(approval).toBeGreaterThan(reclaim)
  })

  it('writes reclaimToken with default-on semantics', () => {
    let mutated: { reclaimToken?: boolean } | null = null
    const blocks = agentsBlocks(status('enrolled', true, true), {
      updateSettings: (mutate) => { mutated = mutate(DEFAULT_SETTINGS) as { reclaimToken?: boolean } },
    })
    const [control] = labelled(blocks, en.reclaimAutoLabel)
    expect(control!.props.checked).toBe(true)
    ;(control!.props.onChange as (checked: boolean) => void)(false)
    expect(mutated!.reclaimToken).toBe(false)
  })

  it('stays disabled while a settings write is in flight', () => {
    const [control] = labelled(
      agentsBlocks(status('enrolled', true, true), { busy: 'settings' }),
      en.reclaimAutoLabel,
    )
    expect(control!.props.disabled).toBe(true)
  })

  it('is gone from the Panel section', () => {
    expect(panelMarkup(status('enrolled', true, true))).not.toContain(en.reclaimAutoLabel)
  })
})
