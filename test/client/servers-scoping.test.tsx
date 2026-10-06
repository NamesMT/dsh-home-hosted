// @vitest-environment happy-dom
/**
 * The state-scoping fix, driven through the real component rather than by calling the
 * resolver it uses.
 *
 * `test/client/workspaces` proves `scopedSelection` answers `null` for a foreign
 * workspace, but that is the *helper*: it does not show that the section applies it to
 * all three selections (`editing`, `deleting`, `freeing`/`freeNote`). The wiring is what
 * a person experiences, so this mounts the section, clicks, and reads the screen.
 *
 * happy-dom plus `react-dom/client` is the whole harness — no provider stack, no
 * testing-library, and the section takes plain props.
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { englishTranslator as t } from '../../src/client/locales.js'
import type { SectionProps } from '../../src/client/props.js'
import { ServersSection } from '../../src/client/section-servers.js'
import type { HomeHostedStatus, ServerEntryView, WorkspaceSummary } from '../../src/shared/contracts.js'
import { DEFAULT_SETTINGS } from '../../src/shared/contracts.js'

const workspaces: WorkspaceSummary[] = [
  { id: 'default', label: 'default', servers: 1, running: 1, source: 'api' },
  { id: 'edge', label: 'edge', servers: 1, running: 1, source: 'api' },
]

function status(): HomeHostedStatus {
  return {
    defaultEntryId: 'dsh',
    workspace: 'default',
    workspaces,
    panel: {
      home: '/home/mt/.home-hosted',
      reachable: true,
      url: 'http://127.0.0.1:3999',
      version: '0.7.1',
      pid: 42,
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
  }
}

/** The same id in both workspaces, which is the case the invariant has to survive. */
function server(workspace: string, command: string): ServerEntryView {
  return {
    id: 'web',
    workspace,
    status: 'running',
    pid: 7,
    url: null,
    config: { id: 'web', command, port: 8080 },
  }
}

let host: HTMLDivElement | null = null
let root: ReturnType<typeof createRoot> | null = null

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  host = null
  root = null
})

/** Mount the section and return the element, so a test can read and click it. */
function mount(workspace: string, servers: ServerEntryView[]): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const sectionProps: SectionProps & { workspace: string, servers: ServerEntryView[], serversError: null } = {
    t,
    status: status(),
    run: async () => ({ ok: true, value: null }),
    updateSettings: () => {},
    busy: null,
    uiStyle: 'compact',
    workspace,
    servers,
    serversError: null,
  }
  act(() => root!.render(<ServersSection {...sectionProps} />))
  return host
}

/** Re-render the same root with a new context — a workspace switch, not a remount. */
function switchTo(workspace: string, servers: ServerEntryView[]): void {
  act(() => root!.render(
    <ServersSection
      t={t}
      status={status()}
      run={async () => ({ ok: true, value: null })}
      updateSettings={() => {}}
      busy={null}
      uiStyle="compact"
      workspace={workspace}
      servers={servers}
      serversError={null}
    />,
  ))
}

/** The button whose label starts with the given text. */
function button(el: HTMLElement, label: string): HTMLButtonElement {
  const match = [...el.querySelectorAll('button')].find(node => (node.textContent ?? '').startsWith(label))
  if (match === undefined)
    throw new Error(`no button starting with ${JSON.stringify(label)}; saw ${[...el.querySelectorAll('button')].map(node => node.textContent).join(' | ')}`)
  return match as HTMLButtonElement
}

describe('a selection made in one workspace is inert in another (driven)', () => {
  it('closes the editor when the workspace switches, even when the id matches', () => {
    const host = mount('default', [server('default', 'node-default')])
    act(() => button(host, t('serversEdit')).click())
    // Open, and holding workspace A's values.
    expect(host.querySelector('input[value="node-default"]'), 'the editor should be open').not.toBeNull()

    switchTo('edge', [server('edge', 'node-edge')])
    // The same id exists here, but the editor must not carry A's server into B.
    expect(host.querySelector('input[value="node-default"]'), 'A\'s draft must not survive the switch').toBeNull()
    expect(host.querySelector('input[value="node-edge"]')).toBeNull()
    expect(host.textContent).not.toContain(t('serversEditTitle', { id: 'web' }))
  })

  it('closes the delete confirmation when the workspace switches', () => {
    const host = mount('default', [server('default', 'node-default')])
    act(() => button(host, t('serversDelete')).click())
    expect(host.textContent, 'the confirmation should be open').toContain(t('serversDeleteTitle', { id: 'web' }))

    switchTo('edge', [server('edge', 'node-edge')])
    expect(host.textContent, 'A\'s delete confirmation must not survive').not.toContain(t('serversDeleteTitle', { id: 'web' }))
  })

  /**
   * The free-port flow is the one the display could not have guarded: its note is a
   * sentence about a *port*, with no id to compare against the list.
   */
  it('drops the free-port note when the workspace switches', async () => {
    const host = mount('default', [server('default', 'node-default')])
    act(() => button(host, t('serversFreePort')).click())
    // The confirmation is shown; confirm it, which is what writes the note.
    await act(async () => {
      button(host, t('serversFreePortGo')).click()
    })
    // The host answered `ok` with no value, so the note reads "still held".
    expect(host.textContent, 'the note should be showing').toContain(t('serversPortHeld', { port: 8080 }))

    switchTo('edge', [server('edge', 'node-edge')])
    expect(host.textContent, 'A\'s port note must not survive the switch').not.toContain(t('serversPortHeld', { port: 8080 }))
    expect(host.textContent).not.toContain(t('serversPortSkipped'))
  })

  /**
   * The control: the same clicks in the *same* workspace keep their state, so the
   * assertions above are about the switch and not about the editor closing for some
   * unrelated reason.
   */
  it('keeps the editor open across an unrelated re-render in the same workspace', () => {
    const host = mount('default', [server('default', 'node-default')])
    act(() => button(host, t('serversEdit')).click())
    expect(host.querySelector('input[value="node-default"]')).not.toBeNull()

    switchTo('default', [server('default', 'node-default')])
    expect(host.querySelector('input[value="node-default"]'), 'the editor should still be open').not.toBeNull()
  })
})
