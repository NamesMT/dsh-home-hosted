import { describe, expect, it } from 'vitest'
import type { TranslateFn } from '../../src/client/context.js'
import { EMPTY } from '../../src/client/format.js'
import { healthLine, restartLine, secondsLabel } from '../../src/client/server-facts.js'

/** A translator that fills the template and shows which key was asked for. */
const t: TranslateFn = (key, params) => {
  const values = Object.entries(params ?? {}).map(([name, value]) => `${name}=${String(value)}`).join(',')
  return values.length > 0 ? `${key}(${values})` : key
}

describe('secondsLabel', () => {
  it('drops the decimals a whole second does not need', () => {
    expect(secondsLabel(1000)).toBe('1s')
    expect(secondsLabel(5000)).toBe('5s')
  })

  it('keeps one decimal for a part second', () => {
    expect(secondsLabel(1500)).toBe('1.5s')
  })
})

describe('healthLine', () => {
  it('renders a port probe with the entry port', () => {
    expect(healthLine({ enabled: true, mode: 'port', intervalMs: 5000 }, 6302, t))
      .toBe('serversHealthPort(port=6302)')
  })

  it('renders an HTTP probe with its status bound and path', () => {
    expect(healthLine({
      enabled: true,
      mode: 'http',
      http: { path: '/health', method: 'GET', expectStatusBelow: 400 },
      intervalMs: 5000,
    }, 6302, t)).toBe('serversHealthHttpBelow(status=400,path=/health)')
  })

  it('prefers an exact expected status over the below bound', () => {
    expect(healthLine({
      enabled: true,
      mode: 'http',
      http: { path: '/', expectStatus: 200, expectStatusBelow: 400 },
    }, null, t)).toBe('serversHealthHttp(status=200,path=/)')
  })

  it('appends the interval only when it moved off the default', () => {
    expect(healthLine({ enabled: true, mode: 'port', intervalMs: 5000 }, 6302, t))
      .not.toContain('serversHealthEvery')
    expect(healthLine({ enabled: true, mode: 'port', intervalMs: 15000 }, 6302, t))
      .toBe('serversHealthPort(port=6302) · serversHealthEvery(seconds=15s)')
  })

  it('reports a disabled probe without leaking its settings', () => {
    expect(healthLine({ enabled: false, mode: 'http', http: { path: '/' } }, 6302, t))
      .toBe('serversDisabled')
  })

  it('falls back rather than printing a record', () => {
    expect(healthLine(undefined, 6302, t)).toBe(EMPTY)
    expect(healthLine({ enabled: true }, null, t)).toBe('serversHealthProbe')
  })
})

describe('restartLine', () => {
  it('renders the retry budget in words', () => {
    expect(restartLine({
      enabled: true,
      maxRetries: 3,
      baseDelayMs: 1000,
      factor: 2,
      maxDelayMs: 30000,
      resetAfterMs: 60000,
    }, t)).toBe('serversRestartSummary(retries=3,base=1s,factor=2)')
  })

  it('never prints the fields it does not name', () => {
    const line = restartLine({ enabled: true, maxRetries: 3, baseDelayMs: 1000, factor: 2, maxDelayMs: 30000 }, t)
    expect(line).not.toContain('30000')
    expect(line).not.toContain('maxDelayMs')
  })

  it('reports a disabled policy plainly', () => {
    expect(restartLine({ enabled: false, maxRetries: 3, baseDelayMs: 1000, factor: 2 }, t))
      .toBe('serversDisabled')
  })

  it('degrades to a bare enabled when the numbers are gone', () => {
    expect(restartLine({ enabled: true }, t)).toBe('serversEnabled')
    expect(restartLine(undefined, t)).toBe(EMPTY)
  })
})
