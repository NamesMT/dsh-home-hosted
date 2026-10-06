/**
 * The `SectionProps` a section needs to render at all.
 *
 * Shared for the same reason `panel-schema.ts` is: the page's props are one interface, and a
 * copy per file is a rule stated N times. Two of the client tests had byte-identical copies and a
 * third differed only in `uiStyle`, which is exactly the shape that drifts by accident — a new
 * required prop fails typecheck, but the *defaults* (translator, no-op runner, `uiStyle`) would
 * diverge silently and make two tests assert against different pages.
 *
 * `uiStyle` is a parameter rather than a constant because it is a real choice per test: `compact`
 * is the row list, `detailed` unfolds and enriches.
 */
import type { SectionProps } from '../../src/client/props.js'
import type { HomeHostedStatus } from '../../src/shared/contracts.js'
import { englishTranslator } from '../../src/client/locales.js'

export function sectionProps(
  status: HomeHostedStatus,
  overrides: Partial<SectionProps> = {},
): SectionProps {
  return {
    t: englishTranslator,
    status,
    // A section's mutations are the caller's business; a test that cares replaces these.
    run: async () => ({ ok: true, value: null }),
    updateSettings: () => {},
    busy: null,
    uiStyle: 'detailed',
    ...overrides,
  }
}
