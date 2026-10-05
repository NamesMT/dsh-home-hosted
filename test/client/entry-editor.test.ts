/**
 * The entry editor is the *human* consumer of the panel's server schema — the third
 * one, after `src/tools.ts` (the model) and the panel's own UI. It renders a
 * deliberate subset, and this file is what keeps that subset a decision instead of
 * an accident.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EDITOR_FIELDS, EMPTY_DRAFT, EntryEditor, OUT_OF_SCOPE_FIELDS } from '../../src/client/entry-editor.js'
import { englishTranslator } from '../../src/client/locales.js'
import { panelEntryFields } from '../helpers/panel-schema.js'

/**
 * Where the panel UI's *source* lives, when this checkout happens to have it.
 *
 * Resolved, not hard-coded: `HHOSTED_PANEL_SOURCE` wins, and otherwise the
 * conventional sibling directory of this package is tried. The earlier version named
 * one absolute path on one machine, which meant the assertions below ran nowhere else.
 */
function panelEditorSource(): string | null {
  const override = process.env.HHOSTED_PANEL_SOURCE
  // An explicit override is authoritative, including when it points nowhere: that is
  // how a person (or this file's own test) asks for the absent case.
  if (override !== undefined && override.length > 0)
    return fs.existsSync(override) ? override : null
  // Otherwise the conventional sibling directory of this package, computed from this
  // file rather than hard-coded to one machine's home directory.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const sibling = path.resolve(here, '..', '..', '..', 'home-hosted', 'uis', 'stock', 'src', 'components', 'server', 'ServerConfigEditor.vue')
  return fs.existsSync(sibling) ? sibling : null
}

/**
 * Decided at **module load**, because `runIf`/`skipIf` are evaluated at collection
 * time — before any `beforeAll` runs — so a flag set in a hook could never work.
 */
const PANEL_SOURCE = panelEditorSource()

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
describe('the three consumers of the panel entry surface', () => {
  /**
   * This assertion needs the panel UI's **source**, which only a checkout that also
   * has that repository can offer: the pinned dependency ships a compiled bundle, and
   * the bundle carries the *schema* but not the form controls — grepping it would pass
   * even if the panel had no control at all, which is worse than no test.
   *
   * So it **skips loudly** rather than returning early. An early `return` inside a test
   * is reported by vitest as a pass, so the suite would claim to have checked something
   * it never ran (the same shape as the six upstream tests this replaced); `skipIf` is
   * evaluated at collection time and reports `skipped`, which is the truth.
   */
  it.skipIf(PANEL_SOURCE === null)('can set every field this editor leaves out', () => {
    const panelUi = fs.readFileSync(PANEL_SOURCE!, 'utf8')
    for (const field of OUT_OF_SCOPE_FIELDS)
      expect(panelUi, `the panel UI should be able to set ${field}`).toContain(field)
  })

  /**
   * The half that **always** runs, so CI still verifies the decision rather than
   * skipping everything: the fields this editor does not render must all be accepted
   * by the panel (read from the pinned dependency), and the ones it claims are out of
   * scope must be a subset of that — never invented, never overlapping what is
   * rendered.
   */
  it('keeps its out-of-scope list inside what the panel actually accepts', () => {
    const panel = panelEntryFields()
    for (const field of OUT_OF_SCOPE_FIELDS)
      expect(panel, `"${field}" is declared out of scope but the panel does not accept it`).toContain(field)
    // And no field is both rendered here and declared out of scope.
    for (const field of EDITOR_FIELDS)
      expect(OUT_OF_SCOPE_FIELDS as readonly string[]).not.toContain(field)
  })
})
