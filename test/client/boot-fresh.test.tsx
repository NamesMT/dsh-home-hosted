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
