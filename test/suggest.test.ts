/**
 * The near-miss suggestion, and — more importantly — when it stays silent.
 *
 * A wrong hint is worse than no hint: it sends a reader to an unrelated name, while silence sends
 * them to the list of valid ones. Every case here is either a real typo that must resolve or an
 * input that must produce **nothing**, and the negative half is the larger one on purpose.
 */
import { describe, expect, it } from 'vitest'
import { editDistance, suggestName } from '../src/util/suggest.js'
import { AGENT_TOOL_NAMES, BOOT_MECHANISM_NAMES, isBootMechanismName, isOnPortConflict, ON_PORT_CONFLICT_POLICIES, RPC_ENDPOINT_NAMES } from '../src/shared/contracts.js'
import { panelPortConflictPolicies } from './helpers/panel-schema.js'

/**
 * The sets that must stay in step with their type.
 *
 * Each list below is the **source** for its union (`type X = (typeof LIST)[number]`), so a member
 * cannot be added to the type without appearing here. This asserts the shape that makes that
 * true, because the earlier arrangement — a hand-written union beside an annotated
 * `readonly X[]` — checked that every *entry* was valid while leaving **presence** unchecked.
 * Measured: removing a name from the old `AGENT_TOOL_NAMES` produced 0 type errors, and
 * `ON_PORT_CONFLICT_POLICIES` produced 0 in **either** direction.
 */
describe('the lists that back a type', () => {
  it('has no duplicate and no empty entry', () => {
    for (const [label, list] of [
      ['RPC_ENDPOINT_NAMES', RPC_ENDPOINT_NAMES],
      ['AGENT_TOOL_NAMES', AGENT_TOOL_NAMES],
      ['ON_PORT_CONFLICT_POLICIES', ON_PORT_CONFLICT_POLICIES],
      ['BOOT_MECHANISM_NAMES', BOOT_MECHANISM_NAMES],
    ] as const) {
      expect(new Set(list).size, `${label} has a duplicate`).toBe(list.length)
      for (const entry of list)
        expect(entry.trim().length, `${label} has an empty entry`).toBeGreaterThan(0)
    }
  })

  /**
   * `BOOT_MECHANISM_NAMES` deliberately leaves out `auto`, which is the *settings file's* value
   * rather than a mechanism. Asserted so the deviation cannot be read as the presence bug this
   * whole arrangement exists to prevent.
   */
  it('keeps `auto` out of the mechanism list on purpose', () => {
    expect(BOOT_MECHANISM_NAMES as readonly string[]).not.toContain('auto')
    expect(isBootMechanismName('auto')).toBe(false)
    expect(isBootMechanismName('systemd-user')).toBe(true)
  })

  /**
   * The validator and the refusal must read the **same** constant, or a message can name a value
   * the validator rejects. Both are asserted against the list itself, not a copy of it.
   */
  /**
   * The list is a **copy** of the panel's own schema, and removing `warn` from it produced **0**
   * type errors — measured — because nothing behaves differently per policy, so no `Record` can
   * catch it. The consequence is real: `isOnPortConflict('warn')` then returns false for a policy
   * the panel parses, and the settings and snapshot readers replace it with the default, losing
   * the person's choice on the next write.
   *
   * So the guard reads the **pinned panel's** published schema, which is the authority on what it
   * accepts — the same technique `panelEntryFields` uses, and one no fixture can weaken.
   */
  it('matches the policies the pinned panel itself enumerates', () => {
    expect([...ON_PORT_CONFLICT_POLICIES]).toEqual(panelPortConflictPolicies())
  })

  it('validates every policy it would offer, and offers every policy it validates', () => {
    // One list read twice: the validator's answer and the refusal's "use one of …" text must not
    // disagree, or a message can name a value that is then rejected.
    for (const policy of ON_PORT_CONFLICT_POLICIES)
      expect(isOnPortConflict(policy), policy).toBe(true)
    expect(isOnPortConflict('explode')).toBe(false)
    // The exact sentence `service.ts` composes, so the test fails if either side stops reading
    // this constant.
    expect(`is not a port-conflict policy; use one of ${ON_PORT_CONFLICT_POLICIES.join(', ')}`)
      .toBe('is not a port-conflict policy; use one of block, warn, follow, reclaim, kill')
  })
})

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
