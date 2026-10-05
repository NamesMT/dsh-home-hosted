/**
 * The entry editor is the *human* consumer of the panel's server schema — the third
 * one, after `src/tools.ts` (the model) and the panel's own UI. It renders a
 * deliberate subset, and this file is what keeps that subset a decision instead of
 * an accident.
 */
import fs from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EDITOR_FIELDS, EMPTY_DRAFT, EntryEditor, OUT_OF_SCOPE_FIELDS } from '../../src/client/entry-editor.js'
import { englishTranslator } from '../../src/client/locales.js'

/**
 * The panel's real `serverSchema`, read from the pinned dependency's sourcemap —
 * never a hand-copied list, because a hand-copied list is the bug this guards.
 */
function panelEntryFields(): string[] {
  const map = JSON.parse(
    fs.readFileSync('node_modules/home-hosted/dist/cli.js.map', 'utf8'),
  ) as { sourcesContent: string[] }
  const source = map.sourcesContent.find(text => text?.includes('export const serverSchema'))
  expect(source, 'the pinned dependency should ship the schema this test reads').toBeDefined()
  const start = source!.indexOf('export const serverSchema = type({')
  const block = source!.slice(start, source!.indexOf(".onUndeclaredKey('reject')", start))
  const fields = [...block.matchAll(/^ {2}([a-zA-Z]+):/gm)].map(match => match[1]!)
  // A regex that matched nothing would make every assertion below vacuous.
  expect(fields.length).toBeGreaterThan(20)
  return fields
}

describe('the entry editor\'s field scope', () => {
  it('accounts for every field the panel accepts, as rendered or explicitly out of scope', () => {
    const panel = panelEntryFields()
    const accounted = [...EDITOR_FIELDS, ...OUT_OF_SCOPE_FIELDS]
    // Nothing the panel accepts is unaccounted for — this is the assertion that fails
    // when the panel grows a field and the editor is not updated to say what it is.
    for (const field of panel)
      expect(accounted, `"${field}" is accepted by the panel and neither rendered nor declared out of scope`).toContain(field)
    // And no field is claimed twice, or invented.
    expect(new Set(accounted).size, 'a field is listed twice or not accepted by the panel').toBe(accounted.length)
    expect([...accounted].sort()).toEqual([...panel].sort())
  })

  it('renders exactly the fields the draft can carry', () => {
    // `EntryDraft` is what the form holds; a field the draft cannot carry cannot be
    // rendered, and one it carries but does not render would be silently dropped.
    expect([...EDITOR_FIELDS].sort()).toEqual([
      'args', 'autostart', 'command', 'cwd', 'id', 'label', 'onPortConflict', 'port',
    ])
  })

  /**
   * Rendered, not read: a list can claim eight fields while the component shows
   * seven, which is exactly how a field becomes unreachable without anyone noticing.
   * `EntryDraft` is what the form holds, so the fields it carries and the fields on
   * screen must be the same set.
   */
  it('actually renders a control for every field it declares, and no others', () => {
    const markup = renderToStaticMarkup(createElement(EntryEditor, {
      t: englishTranslator,
      title: 'Add a server',
      initial: EMPTY_DRAFT,
      submitLabel: 'Create',
      busy: false,
      lockId: false,
      onSubmit: () => {},
      onCancel: () => {},
    }))
    const labels = [...markup.matchAll(/class="hh-field-label">([^<]*)</g)].map(match => match[1]!)
    // The English labels, in render order, for the eight declared fields.
    expect(labels).toEqual([
      englishTranslator('fieldId'),
      englishTranslator('fieldCommand'),
      englishTranslator('fieldArgs'),
      englishTranslator('fieldCwd'),
      englishTranslator('fieldLabel'),
      englishTranslator('fieldPort'),
      englishTranslator('fieldAutostart'),
      englishTranslator('fieldOnPortConflict'),
    ])
    expect(labels).toHaveLength(EDITOR_FIELDS.length)
    // And the hint points at where the rest are edited, rather than implying this
    // form is the whole surface.
    expect(markup).toContain(englishTranslator('serversEditorHint'))
    expect(englishTranslator('serversEditorHint')).toContain('panel link')
  })
})

/**
 * The *other* consumers of the panel's entry surface, so the three are auditable in
 * one place. `src/tools.ts` carries its own parity test (`test/tools`); this records
 * what each one is for, so a future field can be classified instead of guessed at.
 */
describe("the three consumers of the panel entry surface", () => {
  it('gives each consumer a different, stated job', () => {
    // The model: every field, so a prompt can set anything (test/tools asserts parity).
    // The panel UI: every field, and it is the one linked to from this page.
    // This editor: the common fields, with the rest explicitly out of scope.
    const panelUiPath = '/home/mt/mine/home-hosted/uis/stock/src/components/server/ServerConfigEditor.vue'
    // Skip when the sibling checkout is absent: CI checks this package alone, and a
    // test that hard-depends on another checkout would fail there for no good reason.
    // (This package's own panel UI is a compiled bundle, so it cannot be read.)
    if (!fs.existsSync(panelUiPath))
      return
    const panelUi = fs.readFileSync(panelUiPath, 'utf8')
    for (const field of OUT_OF_SCOPE_FIELDS)
      expect(panelUi, `the panel UI should be able to set ${field}`).toContain(field)
  })
})
