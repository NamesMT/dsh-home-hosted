import { describe, expect, it } from 'vitest'
import { BOOT_STATE_KEYS, dash, EMPTY, formatDrift, humanizeKey, isMutatingTool, TOKEN_KEYS, WRITE_VIA_KEYS } from '../../src/client/format.js'
import { AGENT_TOOL_NAMES, MUTATING_AGENT_TOOLS } from '../../src/shared/contracts.js'

describe('dash', () => {
  it('renders scalars', () => {
    expect(dash('x')).toBe('x')
    expect(dash(0)).toBe('0')
  })

  it('renders the placeholder for absent or blank values', () => {
    expect(dash(null)).toBe(EMPTY)
    expect(dash(undefined)).toBe(EMPTY)
    expect(dash('')).toBe(EMPTY)
  })
})

describe('formatDrift', () => {
  it('joins drifted keys', () => {
    expect(formatDrift(['autostart', 'stop'])).toBe('autostart, stop')
  })

  it('renders the placeholder when there is no drift', () => {
    expect(formatDrift([])).toBe(EMPTY)
  })
})

describe('humanizeKey', () => {
  it('splits camelCase and underscores into sentence case', () => {
    expect(humanizeKey('stopKillPortHolders')).toBe('Stop kill port holders')
    expect(humanizeKey('on_portConflict')).toBe('On port conflict')
  })

  it('keeps an empty key verbatim', () => {
    expect(humanizeKey('')).toBe('')
  })
})

describe('isMutatingTool', () => {
  it('matches the contract list exactly', () => {
    for (const name of AGENT_TOOL_NAMES) {
      expect(isMutatingTool(name)).toBe(MUTATING_AGENT_TOOLS.includes(name))
    }
  })

  it('counts read-only tools as safe', () => {
    expect(isMutatingTool('status')).toBe(false)
    expect(isMutatingTool('servers_list')).toBe(false)
  })
})

describe('locale key tables', () => {
  it('covers every write path', () => {
    expect(Object.keys(WRITE_VIA_KEYS).sort()).toEqual(['api', 'file', 'none'])
  })

  it('covers every token state', () => {
    expect(Object.keys(TOKEN_KEYS).sort()).toEqual(['absent', 'enrolled', 'present', 'unknown'])
  })

  it('covers every boot state', () => {
    expect(Object.keys(BOOT_STATE_KEYS).sort())
      .toEqual(['enabled-failing', 'enabled-running', 'installed-disabled', 'not-installed', 'unsupported'])
  })
})
