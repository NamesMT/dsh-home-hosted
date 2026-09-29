import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AgentsSection } from '../../src/client/section-agents.js'
import { PanelSection } from '../../src/client/section-panel.js'
import { en, englishTranslator } from '../../src/client/locales.js'
import type { SectionProps } from '../../src/client/props.js'
import type { HomeHostedStatus, InstanceView } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

const managed: InstanceView = {
  home: '/home/mt/.home-hosted',
  managed: true,
  hosting: true,
  url: 'http://127.0.0.1:5555',
  port: 5555,
  pid: 12,
  version: '0.6.6',
  running: true,
  projectDir: '/srv/app',
  servers: 2,
  source: 'managed',
}

const other: InstanceView = {
  home: '/srv/other/.home-hosted',
  managed: false,
  hosting: false,
  url: null,
  port: null,
  pid: null,
  version: null,
  running: false,
  projectDir: null,
  servers: 1,
  source: 'configured',
}

function status(instances: InstanceView[] | undefined): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    workspace: 'default',
    workspaces: [],
    panel: {
      home: managed.home,
      reachable: true,
      url: managed.url,
      version: managed.version,
      pid: managed.pid,
      writeVia: 'api',
      token: 'enrolled',
      detail: '',
    },
    instances,
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

describe('panel inventory on the page', () => {
  it('lists the panels only when there is more than one', () => {
    const one = renderToStaticMarkup(createElement(PanelSection, props(status([managed]))))
    expect(one).not.toContain('/srv/other/.home-hosted')

    const two = renderToStaticMarkup(createElement(PanelSection, props(status([managed, other]))))
    expect(two).toContain(en.panelInstances.replace('{count}', '2'))
    expect(two).toContain('/srv/other/.home-hosted')
    expect(two).toContain(en.panelInstanceOther)
    expect(two).toContain(en.panelInstanceHosts)
    expect(two).toContain(en.panelInstancesHint)
  })

  it('renders an older host that reports no inventory', () => {
    const markup = renderToStaticMarkup(createElement(PanelSection, props(status(undefined))))
    expect(markup).not.toContain(en.panelInstanceManaged)
  })
})

describe('the agent notice toggle', () => {
  it('shows the setting and its explanation', () => {
    const markup = renderToStaticMarkup(createElement(AgentsSection, props(status([managed, other]))))
    expect(markup).toContain(en.instancesNoticeLabel)
    // The apostrophe is escaped in the markup, so match the stable fragment.
    expect(markup).toContain('Adds the panel inventory to the agent')
  })
})
