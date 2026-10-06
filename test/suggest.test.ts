/**
 * The near-miss suggestion, and — more importantly — when it stays silent.
 *
 * A wrong hint is worse than no hint: it sends a reader to an unrelated name, while silence sends
 * them to the list of valid ones. Every case here is either a real typo that must resolve or an
 * input that must produce **nothing**, and the negative half is the larger one on purpose.
 */
import { describe, expect, it } from 'vitest'
import { editDistance, suggestName } from '../src/util/suggest.js'
import { RPC_ENDPOINT_NAMES } from '../src/shared/contracts.js'

describe('edit distance', () => {
  it('measures the edits a reader would make', () => {
    expect(editDistance('', '')).toBe(0)
    expect(editDistance('abc', 'abc')).toBe(0)
    expect(editDistance('', 'abc')).toBe(3)
    expect(editDistance('abc', '')).toBe(3)
    expect(editDistance('lst', 'list')).toBe(1) // one insertion
    expect(editDistance('list', 'lst')).toBe(1)
    expect(editDistance('stats', 'status')).toBe(1) // one insertion
    expect(editDistance('start', 'restart')).toBe(2) // two insertions at the front
    expect(editDistance('abc', 'xyz')).toBe(3)
    // Symmetric, which a one-row implementation gets wrong.
    expect(editDistance('kitten', 'sitting')).toBe(editDistance('sitting', 'kitten'))
  })
})

describe('a suggestion for the name probably meant', () => {
  it('resolves a real typo', () => {
    expect(suggestName('servers.lst', RPC_ENDPOINT_NAMES)).toBe('servers.list')
    expect(suggestName('servers.restartt', RPC_ENDPOINT_NAMES)).toBe('servers.restart')
    expect(suggestName('boot.instal', RPC_ENDPOINT_NAMES)).toBe('boot.install')
    expect(suggestName('panel.reclaimToke', RPC_ENDPOINT_NAMES)).toBe('panel.reclaimToken')
    expect(suggestName('workspaces.lst', RPC_ENDPOINT_NAMES)).toBe('workspaces.list')
    expect(suggestName('statuss', RPC_ENDPOINT_NAMES)).toBe('status')
    // Case and surrounding space are the reader's, not the name's.
    expect(suggestName('  SERVERS.LST ', RPC_ENDPOINT_NAMES)).toBe('servers.list')
  })

  /**
   * The negative half. `--no-open` is the case that broke a ratio-only bound: it scores 3 against
   * `--no-yes`, which passes a "half the shorter word" bound of 3 and names an unrelated flag.
   */
  it('stays silent on a short name that merely shares a prefix', () => {
    const options = ['--no-yes', '--no-open', '--port', '--no-autostart']
    expect(suggestName('--no-open', options), '--no-open is not --no-yes').toBeNull()
    // And the same pool still resolves a genuine near miss.
    expect(suggestName('--prt', options)).toBe('--port')
    expect(suggestName('--no-autostar', options)).toBe('--no-autostart')
  })

  it('stays silent on anything unrelated', () => {
    for (const given of ['nope', 'hello', 'xyz', 'aaa', 'aaaa', '', ' ', 'servers', 'status.list', 'zzz.zzz'])
      expect(suggestName(given, RPC_ENDPOINT_NAMES), given).toBeNull()
  })

  /**
   * A shared dotted prefix carries no information — `servers.` alone is 8 characters of the
   * distance, so an unrelated suffix cannot look close. These scored a match under an earlier
   * rule that measured only the suffix, which is why the plain full-name distance is the one
   * kept: over the real corpus it scores identically and needs no special case.
   */
  it('stays silent when only the dotted prefix matches', () => {
    for (const given of ['servers.zzz', 'panel.zzz', 'boot.zzz', 'entries.zzz', 'cli.zzz', 'ui.zzz'])
      expect(suggestName(given, RPC_ENDPOINT_NAMES), given).toBeNull()
  })

  it('never suggests the name it was given', () => {
    // "did you mean X?" for X is noise, and every valid name must be silent for itself.
    for (const name of RPC_ENDPOINT_NAMES)
      expect(suggestName(name, RPC_ENDPOINT_NAMES), name).toBeNull()
  })

  /**
   * The property that matters across the whole set, measured rather than sampled: deleting any
   * one character must resolve to the name it came from **or** stay silent — never name a
   * different endpoint.
   *
   * Four inputs are genuine ties (`servers.estart` and `boot.ninstall` are distance 1 from two
   * endpoints each), and this asserts they resolve to one of those two rather than to a third.
   */
  it('never names an unrelated endpoint, across every one-character typo', () => {
    let resolved = 0
    let silent = 0
    for (const name of RPC_ENDPOINT_NAMES) {
      for (let index = 0; index < name.length; index += 1) {
        const typo = name.slice(0, index) + name.slice(index + 1)
        if (typo.length === 0 || (RPC_ENDPOINT_NAMES as readonly string[]).includes(typo))
          continue
        const suggestion = suggestName(typo, RPC_ENDPOINT_NAMES)
        if (suggestion === name) {
          resolved += 1
          continue
        }
        silent += 1
        // Silent is acceptable; naming something else is not, unless the typo is
        // equidistant from both.
        if (suggestion !== null) {
          expect(
            editDistance(typo, suggestion),
            `${typo} resolved to ${suggestion} rather than ${name}`,
          ).toBe(editDistance(typo, name))
        }
      }
    }
    expect(resolved + silent).toBeGreaterThan(300)
    expect(resolved).toBeGreaterThan(silent)
  })
})
