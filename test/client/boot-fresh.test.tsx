// @vitest-environment happy-dom
/**
 * `BootSection` keeps a "fresh attempt" in local state, so it is the third place a
 * stored value could describe a context that moved on. `visibleBootAttempt` already
 * gates it on the live `state`/`mechanism`; this drives the real component to show that
 * gate is actually applied, rather than trusting the helper's shape.
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { englishTranslator as t } from '../../src/client/locales.js'
import { BootSection } from '../../src/client/section-boot.js'
import type { HomeHostedStatus } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

function status(state: HomeHostedStatus['boot']['state'], mechanism: HomeHostedStatus['boot']['mechanism'], recorded: HomeHostedStatus['boot']['mechanism'] = mechanism): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    workspace: 'default',
    workspaces: [],
    panel: { home: '/h', reachable: true, url: 'http://p', version: '1', pid: 1, writeVia: 'api', token: 'enrolled', detail: '' },
    boot: {
      platform: 'linux', mechanism, recommended: 'systemd-system', state,
      bootCapable: true, privileged: false, unitPath: null, commands: [], detail: '',
      candidates: [],
    },
    entries: [], servers: [], lastError: null,
    settings: {
      ...DEFAULT_SETTINGS,
      autostart: { ...DEFAULT_SETTINGS.autostart, mechanism: mechanism ?? 'auto', lastAttempt: { ok: false, action: 'install', mechanism: recorded, detail: 'the mechanism refused', commands: [], at: 1 } },
    },
  } as unknown as HomeHostedStatus
}

let host: HTMLDivElement | null = null
let root: ReturnType<typeof createRoot> | null = null

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  host = null
  root = null
})

function render(state: HomeHostedStatus['boot']['state'], mechanism: HomeHostedStatus['boot']['mechanism'], recorded: HomeHostedStatus['boot']['mechanism'] = mechanism): HTMLDivElement {
  const props = { t, status: status(state, mechanism, recorded), run: async () => ({ ok: true, value: null }), updateSettings: () => {}, busy: null, uiStyle: 'detailed' }
  if (root === null) {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  }
  act(() => root!.render(<BootSection {...props} />))
  return host!
}

/**
 * The mechanism options *are* internal names — `systemd-system`, `xdg-autostart` — because
 * that is what the setting stores. The host already sends a sentence explaining each one
 * (`BootCandidate.reason`) and the page was dropping it, so the reader had to know what the
 * identifier meant. This drives the real component, because the interesting part is the
 * rendering, not a helper's return value.
 */
describe('the mechanism a person picked explains itself', () => {
  function withCandidates(selected: string): HomeHostedStatus {
    const base = status('enabled-running', 'systemd-system')
    base.boot.candidates = [
      { mechanism: 'systemd-system', available: true, bootCapable: true, privileged: false, reason: 'systemd is not the init system here (no /run/systemd/system)' },
      { mechanism: 'launchd-agent', available: false, bootCapable: false, privileged: false, reason: 'launchd is macOS-only' },
    ]
    base.settings.autostart.mechanism = selected as never
    return base
  }

  function mount(next: HomeHostedStatus): HTMLDivElement {
    const props = { t, status: next, run: async () => ({ ok: true, value: null }), updateSettings: () => {}, busy: null, uiStyle: 'detailed' }
    if (root === null) {
      host = document.createElement('div')
      document.body.append(host)
      root = createRoot(host)
    }
    act(() => root!.render(<BootSection {...props} />))
    return host!
  }

  it('shows the host\'s own explanation for the selected mechanism', () => {
    const text = mount(withCandidates('systemd-system')).textContent ?? ''
    // The raw identifier is still there (it is the stored value), and now so is the why.
    expect(text).toContain('systemd-system')
    expect(text).toContain('systemd is not the init system here')
  })

  /**
   * The second rendering of the same name. `boot.mechanism` is the mechanism that is
   * *installed*, which is a different one while a switch is pending — and the `Details`
   * block named it without saying anything about it. Both places now read the same
   * `reasonFor`, so they cannot drift into describing the mechanism differently.
   */
  it('explains the installed mechanism too, which can differ from the selected one', () => {
    const next = withCandidates('systemd-system')
    next.boot.mechanism = 'launchd-agent'
    next.boot.candidates = [
      { mechanism: 'systemd-system', available: true, bootCapable: true, privileged: false, reason: 'systemd is not the init system here (no /run/systemd/system)' },
      { mechanism: 'launchd-agent', available: true, bootCapable: false, privileged: true, reason: 'launchd-agent loads at login, not at boot' },
    ]
    const text = mount(next).textContent ?? ''
    // The installed one is described in the Details block...
    expect(text).toContain('launchd-agent loads at login, not at boot')
    // ...and the selected one under the picker, which is what the switch is about.
    expect(text).toContain('systemd is not the init system here')
  })

  it('explains `auto` too, which has no candidate behind it', () => {
    const text = mount(withCandidates('auto')).textContent ?? ''
    expect(text).toContain('what this machine can actually use')
  })

  it('stays silent rather than inventing a reason the host did not give', () => {
    const next = withCandidates('launchd-daemon')
    next.boot.candidates = []
    const text = mount(next).textContent ?? ''
    expect(text).not.toContain('what this machine can actually use')
  })
})

describe('a persisted boot attempt is not shown against a state it does not describe', () => {
  it('shows a failed attempt while it still matches the live mechanism', () => {
    const host = render('not-installed', 'systemd-system')
    console.log('TEXT:', JSON.stringify((host.textContent ?? '').slice(0, 400)))
    expect(host.textContent).toContain('the mechanism refused')
  })

  /**
   * `isStaleAttempt` is the rule: an attempt recorded for another mechanism describes
   * something that is no longer installed, so it must not be shown as the current one.
   */
  it('drops an attempt recorded for a mechanism that is no longer the live one', () => {
    const host = render('failed', 'systemd-system')
    // The live mechanism changes under the same mounted section.
    render('not-installed', 'xdg-autostart', 'systemd-system')
    console.log('AFTER_SWITCH shows old detail:', host.textContent?.includes('the mechanism refused'))
    expect(host.textContent, 'the stale attempt must not be shown').not.toContain('the mechanism refused')
  })
})
