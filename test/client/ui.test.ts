import { describe, expect, it } from 'vitest'
import { Chip, Details, FailureNote, Link, Option, Section, Spec, Switch } from '../../src/client/ui.js'

/**
 * Called as plain functions (no DOM, no `happy-dom` dependency): the element
 * these primitives return is what matters — the anchor must be safe to open,
 * the failure note must carry the host's own text, and the controls that carry
 * state must expose that state to assistive technology.
 */
function elementOf(node: unknown): { type: unknown, props: Record<string, unknown> } {
  return node as { type: unknown, props: Record<string, unknown> }
}

describe('Link', () => {
  it('opens in a new tab with a safe rel', () => {
    const element = elementOf(Link({ href: 'http://127.0.0.1:6301' }))
    expect(element.type).toBe('a')
    expect(element.props.href).toBe('http://127.0.0.1:6301')
    expect(element.props.target).toBe('_blank')
    expect(element.props.rel).toBe('noreferrer noopener')
  })

  it('falls back to the href as its text, keeping the icon decoration separate', () => {
    const children = elementOf(Link({ href: '/x' })).props.children as unknown[]
    expect(children[0]).toBe('/x')
    expect(elementOf(children[1]).props['aria-hidden']).toBe('true')
  })
})

describe('FailureNote', () => {
  it('is an alert carrying the title and detail', () => {
    const element = elementOf(FailureNote({ title: 'Last attempt: install failed', detail: 'exit 5' }))
    expect(element.props.role).toBe('alert')
    const body = elementOf((element.props.children as unknown[])[1])
    const [title, detail] = body.props.children as unknown[]
    expect(elementOf(title).props.children).toBe('Last attempt: install failed')
    expect(elementOf(detail).props.children).toBe('exit 5')
  })

  it('omits the body when the host gave no detail', () => {
    const element = elementOf(FailureNote({ title: 'failed', detail: '' }))
    const body = elementOf((element.props.children as unknown[])[1])
    const [, detail] = body.props.children as unknown[]
    expect(detail).toBeFalsy()
  })
})

describe('Section', () => {
  it('titles itself and wraps its children in the body block', () => {
    const element = elementOf(Section({ title: 'Panel', children: 'x' }))
    expect(element.type).toBe('section')
    const [head, body] = element.props.children as unknown[]
    expect(elementOf(head).type).toBe('header')
    expect(elementOf(body).props.children).toBe('x')
  })

  it('parks a group action on the title rule', () => {
    const action = Chip({ children: '2 of 3 running' })
    const element = elementOf(Section({ title: 'Servers', action, children: null }))
    const [head] = element.props.children as unknown[]
    const parts = elementOf(head).props.children as unknown[]
    expect(elementOf(parts[3]).props.children).toBe(action)
  })
})

describe('Spec', () => {
  it('keeps a label and its value in one row', () => {
    const element = elementOf(Spec({ label: 'PID', children: '2583318' }))
    const [label, value] = element.props.children as unknown[]
    expect(elementOf(label).props.children).toBe('PID')
    expect(elementOf(value).props.children).toBe('2583318')
  })
})

describe('Details', () => {
  it('is a disclosure, closed by default', () => {
    const element = elementOf(Details({ label: 'Details', children: 'x' }))
    expect(element.type).toBe('details')
    expect(element.props.open).toBeUndefined()
    const [summary, body] = element.props.children as unknown[]
    expect(elementOf(summary).type).toBe('summary')
    expect(elementOf(body).props.children).toBe('x')
  })

  it('carries the detailed style\'s default-open as the `open` attribute', () => {
    expect(elementOf(Details({ label: 'Details', open: true, children: 'x' })).props.open).toBe(true)
    // `false` must mean "absent", not the attribute `open="false"`: React only
    // touches props that changed, so a manual toggle survives the re-renders
    // the page's poll causes.
    expect(elementOf(Details({ label: 'Details', open: false, children: 'x' })).props.open).toBeUndefined()
  })
})

describe('Switch', () => {
  it('exposes its state as a switch, not as a checkbox', () => {
    const element = elementOf(Switch({ label: 'Manage dsh', checked: true, onChange: () => {} }))
    expect(element.type).toBe('button')
    expect(element.props.role).toBe('switch')
    expect(element.props['aria-checked']).toBe(true)
  })

  it('carries the disabled state onto the control', () => {
    const element = elementOf(Switch({ label: 'Manage dsh', checked: false, disabled: true, onChange: () => {} }))
    expect(element.props.disabled).toBe(true)
  })
})

describe('Chip', () => {
  it('defaults to the idle tone', () => {
    expect(elementOf(Chip({ children: 'stopped' })).props['data-tone']).toBe('idle')
  })

  it('carries the tone it was given', () => {
    expect(elementOf(Chip({ tone: 'ok', children: 'running' })).props['data-tone']).toBe('ok')
  })
})

describe('Option', () => {
  it('marks a refused choice so the row cannot be picked', () => {
    const element = elementOf(Option({ label: 'Global install', checked: false, disabled: true, onChange: () => {} }))
    expect(element.props['data-disabled']).toBe(true)
    const [input] = element.props.children as unknown[]
    expect(elementOf(input).props.disabled).toBe(true)
  })
})
