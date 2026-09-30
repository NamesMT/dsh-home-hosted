/**
 * The `alive()` both generated helpers carry, executed rather than grepped.
 *
 * `panel-control.ts` builds these helpers as source strings, so the honest test is
 * to evaluate the function that ends up in the artifact. What matters: signal 0
 * with `EPERM` means the pid exists and is simply not ours to signal. Reading it as
 * "gone" would skip the SIGTERM→SIGKILL escalation and let the helper start a
 * second panel over a live one.
 */
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { buildActivationSource, buildTakeoverSource } from '../src/home-hosted/panel-control.js'
import type { ActivationPlan, PanelControlDeps } from '../src/home-hosted/panel-control.js'

const PLAN: ActivationPlan = {
  commands: [['true']],
  requires: [],
  files: [],
  stop: ['true'],
  detach: [],
  oldPid: 4242,
  retire: [],
  logPath: '/tmp/panel-activate.log',
}

const DEPS = {
  stateDir: '/tmp/hh-state',
  home: '/tmp/hh-home',
  launch: null,
  env: {},
  platform: 'linux',
} as unknown as PanelControlDeps

/** Evaluate the generated `alive()` with a `process.kill` that behaves as told. */
function alive(source: string, kill: (pid: number) => void): (pid: unknown) => boolean {
  const start = source.indexOf('function alive(pid)')
  expect(start).toBeGreaterThan(-1)
  const body = source.slice(start, source.indexOf('\n}', start) + 2)
  return vm.runInNewContext(`(() => { ${body}; return alive })()`, { process: { kill } }) as (pid: unknown) => boolean
}

function throws(code: string): () => never {
  return () => {
    const error: NodeJS.ErrnoException = new Error(code)
    error.code = code
    throw error
  }
}

describe('the generated helpers\' pid probe', () => {
  const sources: Array<[string, string]> = [
    ['activation', buildActivationSource(PLAN)],
    ['takeover', buildTakeoverSource(DEPS, 4242)],
  ]

  for (const [name, source] of sources) {
    it(`${name}: a signalling pid is alive`, () => {
      expect(alive(source, () => {}) (1234)).toBe(true)
    })

    it(`${name}: EPERM is alive — the pid exists, it is not ours to signal`, () => {
      expect(alive(source, throws('EPERM')) (1)).toBe(true)
    })

    it(`${name}: ESRCH is dead`, () => {
      expect(alive(source, throws('ESRCH')) (4242)).toBe(false)
    })

    it(`${name}: a non-numeric pid is dead, without probing`, () => {
      let probed = false
      const fn = alive(source, () => { probed = true })
      expect(fn('nope')).toBe(false)
      expect(probed).toBe(false)
    })
  }
})
