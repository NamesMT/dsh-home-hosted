import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pidAlive } from '../src/home-hosted/runtime.js'

/**
 * Signal 0 only *probes*: it reports whether the pid exists without delivering
 * anything, so `EPERM` means "it is there and is not ours to signal". Reading that
 * as dead would make a panel owned by another account look stopped — and the page
 * would then offer to start a second one over it.
 *
 * home-hosted's own runtime probe treats `EPERM` the same way (`helpers/daemon.ts`).
 */
describe('pid liveness', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const throwing = (code: string): void => {
    vi.spyOn(process, 'kill').mockImplementation(() => {
      const error: NodeJS.ErrnoException = new Error(code)
      error.code = code
      throw error
    })
  }

  it('counts a live pid as alive', () => {
    vi.spyOn(process, 'kill').mockImplementation(() => true)
    expect(pidAlive(1234)).toBe(true)
  })

  it('counts EPERM as alive: the pid exists, it is just not ours to signal', () => {
    throwing('EPERM')
    expect(pidAlive(1)).toBe(true)
  })

  it('counts ESRCH as dead', () => {
    throwing('ESRCH')
    expect(pidAlive(4242)).toBe(false)
  })
})
