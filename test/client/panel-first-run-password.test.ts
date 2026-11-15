/**
 * The panel's first-run password, on the page.
 *
 * home-hosted generates a random password on a fresh home and prints it **once**, on the machine
 * that started the panel. Its API answers `usingDefaultPassword: true` with `defaultPassword:
 * null` deliberately. On Desktop this plugin *is* the machine that started the panel, and that
 * printed line goes into a console nobody is shown — so without this the person meets a login
 * screen they cannot pass. The field comes from the secrets file, so it works while the panel is
 * refusing every request.
 *
 * The `unrecorded` case is the one that must not render as an empty box: a restored backup keeps
 * the hash without the text, so the way back is `account reset`, not a blank password.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PanelSection } from '../../src/client/section-panel.js'
import { en } from '../../src/client/locales.js'
import { sectionProps } from '../helpers/section-props.js'
import type { FirstRunPasswordView, HomeHostedStatus } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

function status(firstRunPassword?: FirstRunPasswordView): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    workspace: 'default',
    workspaces: [],
    panel: {
      home: '/home/mt/.dsh/dsh-home-hosted/panel',
      reachable: false,
      url: null,
      version: null,
      pid: null,
      writeVia: 'file',
      token: 'unknown',
      ...(firstRunPassword === undefined ? {} : { firstRunPassword }),
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
  }
}

const markup = (status_: HomeHostedStatus): string =>
  renderToStaticMarkup(createElement(PanelSection, sectionProps(status_)))

/** React escapes apostrophes and the arrow, so compare on the rendered text. */
const asMarkup = (text: string): string => text.replace(/'/g, '&#x27;')

describe('the first-run password on the page', () => {
  it('shows the generated password, with the advice to change it', () => {
    const html = markup(status({ state: 'recorded', password: 'ab12-cd34-ef56' }))
    expect(html).toContain('ab12-cd34-ef56')
    expect(html).toContain(asMarkup(en.panelFirstRunPasswordTitle))
    expect(html).toContain(asMarkup(en.panelFirstRunPasswordChange))
  })

  it('says the text is unrecoverable and names the remedy, instead of a blank box', () => {
    const html = markup(status({ state: 'unrecorded' }))
    expect(html).toContain(asMarkup(en.panelFirstRunPasswordLost))
    // The remedy is a command, not a field the person could fill in.
    expect(html).toContain('account reset')
    expect(html).not.toContain(asMarkup(en.panelFirstRunPasswordBody))
  })

  it('renders nothing when the panel is on the person\'s own password', () => {
    // The usual case: `firstRunPassword` is absent, so the section says nothing about it.
    const html = markup(status())
    expect(html).not.toContain(asMarkup(en.panelFirstRunPasswordTitle))
    expect(html).not.toContain('account reset')
  })
})
