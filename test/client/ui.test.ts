import { describe, expect, it } from 'vitest'
import { FailureNote, Link } from '../../src/client/ui.js'

/**
 * Called as plain functions (no DOM, no `happy-dom` dependency): the element
 * these primitives return is what matters — the anchor must be safe to open
 * and the failure note must carry the host's own text.
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

  it('falls back to the href as its text', () => {
    expect(elementOf(Link({ href: '/x' })).props.children).toBe('/x')
  })
})

describe('FailureNote', () => {
  it('is an alert carrying the title and detail', () => {
    const element = elementOf(FailureNote({ title: 'Last attempt: install failed', detail: 'exit 5' }))
    expect(element.props.role).toBe('alert')
    const [title, body] = element.props.children as unknown[]
    expect((title as { props: { children: string } }).props.children).toBe('Last attempt: install failed')
    expect((body as { props: { children: string } }).props.children).toBe('exit 5')
  })

  it('omits the body when the host gave no detail', () => {
    const element = elementOf(FailureNote({ title: 'failed', detail: '' }))
    const [, body] = element.props.children as unknown[]
    expect(body).toBeFalsy()
  })
})
