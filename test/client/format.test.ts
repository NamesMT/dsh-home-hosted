import { describe, expect, it } from 'vitest'
import { BOOT_STATE_KEYS, CLI_SOURCE_KEYS, dash, effectiveCandidates, EMPTY, formatCandidate, formatDrift, humanizeKey, isMutatingTool, TOKEN_KEYS, WRITE_VIA_KEYS } from '../../src/client/format.js'
import type { CliStatus } from '../../src/shared/contracts.js'
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

  it('covers every CLI source with the committed panel keys', () => {
    expect(CLI_SOURCE_KEYS).toEqual({
      config: 'panelCliConfig',
      dependency: 'panelCliDependency',
      path: 'panelCliPathSource',
      none: 'panelCliMissing',
    })
  })
})

describe('formatCandidate', () => {
  it('renders version and path together', () => {
    expect(formatCandidate({ source: 'dependency', path: '/app/node_modules/.bin/home-hosted', version: '0.6.1' }))
      .toBe('0.6.1 · /app/node_modules/.bin/home-hosted')
  })

  it('fills either half with the placeholder', () => {
    expect(formatCandidate({ source: 'path', path: null, version: '0.6.1' })).toBe(`0.6.1 · ${EMPTY}`)
    expect(formatCandidate({ source: 'path', path: '/usr/local/bin/home-hosted', version: null })).toBe(`${EMPTY} · /usr/local/bin/home-hosted`)
  })

  it('renders the placeholder for an absent candidate', () => {
    expect(formatCandidate(null)).toBe(EMPTY)
    expect(formatCandidate(undefined)).toBe(EMPTY)
  })
})

describe('effectiveCandidates', () => {
  const base: CliStatus = {
    source: 'dependency',
    path: '/app/node_modules/home-hosted/bin/home-hosted.mjs',
    version: '0.6.1',
    expectedRange: '^0.6.1',
    supported: true,
    detail: 'the pinned dependency (0.6.1)',
  }

  it('passes the host summaries through', () => {
    const dependency = { source: 'dependency' as const, path: '/dep', version: '0.6.1' }
    const global = { source: 'path' as const, path: '/usr/bin/home-hosted', version: '0.4.0' }
    expect(effectiveCandidates({ ...base, dependency, global })).toEqual({ dependency, global })
  })

  it('reconstructs the pinned candidate on a host without the summary fields', () => {
    expect(effectiveCandidates(base)).toEqual({
      dependency: { source: 'dependency', path: base.path, version: '0.6.1' },
      global: null,
    })
  })

  it('reconstructs the global candidate from a PATH source', () => {
    const cli: CliStatus = { ...base, source: 'path', path: '/usr/local/bin/home-hosted' }
    expect(effectiveCandidates(cli)).toEqual({
      dependency: null,
      global: { source: 'path', path: '/usr/local/bin/home-hosted', version: '0.6.1' },
    })
  })

  it('invents nothing for a config override or an unresolved path', () => {
    expect(effectiveCandidates({ ...base, source: 'config' })).toEqual({ dependency: null, global: null })
    expect(effectiveCandidates({ ...base, path: null })).toEqual({ dependency: null, global: null })
  })

  it('trusts an explicit summary over the reconstruction', () => {
    const global = { source: 'path' as const, path: '/usr/bin/home-hosted', version: '0.4.0' }
    const cli: CliStatus = { ...base, source: 'dependency', global }
    expect(effectiveCandidates(cli).global).toEqual(global)
  })
})
