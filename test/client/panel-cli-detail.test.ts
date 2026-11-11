/**
 * The page has to say *why* a CLI was chosen, not only which one.
 *
 * `CliStatus.detail` is the plugin's own sentence about how it resolved the CLI, and it is
 * the only place a refused candidate is named: on Windows, `where hh` answers
 * `C:\Windows\hh.exe` (the HTML Help viewer), which is skipped before it is probed and
 * reported here. Every hint on this page names a case the page anticipated, so a *rejection*
 * it did not anticipate had nowhere to appear — the reason a fallback happened was computed
 * and then dropped. This is the assertion that the sentence reaches a reader.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PanelSection } from '../../src/client/section-panel.js'
import { sectionProps } from '../helpers/section-props.js'
import type { CliStatus, HomeHostedStatus } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

const CLI: CliStatus = {
  source: 'dependency',
  path: '/opt/dsh-home-hosted/node_modules/home-hosted/bin/home-hosted.mjs',
  version: '0.11.0',
  expectedRange: '^0.11.0',
  supported: true,
  prefer: 'pinned',
  dependency: null,
  global: null,
  detail: 'the pinned dependency (0.11.0)',
}

function status(cli: CliStatus): HomeHostedStatus {
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
      detail: '',
    },
    boot: {
      platform: 'win32',
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
    cli,
  }
}

function panelMarkup(cli: CliStatus): string {
  // `detailed` opens the details block the CLI facts live in.
  return renderToStaticMarkup(createElement(PanelSection, sectionProps(status(cli), { uiStyle: 'detailed' })))
}

describe('the CLI detail on the panel page', () => {
  it('renders the host detail the status carries', () => {
    const detail = 'on PATH: C:\\Windows\\hh.exe is in the Windows system directory, where a package manager never installs'
    expect(panelMarkup({ ...CLI, detail })).toContain('C:\\Windows\\hh.exe is in the Windows system directory')
  })

  it('renders nothing extra when the host has no detail', () => {
    // The negative half: an empty sentence must not become an empty `<p>` on the page.
    expect(panelMarkup({ ...CLI, detail: '' })).not.toContain('undefined')
  })
})
