import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { apiTokenEnrolled, ensureToken, readStoredToken, reclaimToken, storeToken, storedTokenPath, tokenSlot } from '../src/home-hosted/token.js'
import { secretsFile } from '../src/home-hosted/layout.js'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'
import type { RunResult } from '../src/util/exec.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

function dirs(): { home: string, state: string } {
  scratch = tempDir()
  const state = path.join(scratch.path, 'state')
  fs.mkdirSync(state, { recursive: true })
  return { home: scratch.path, state }
}

function ok(): RunResult {
  return { command: 'home-hosted', args: [], code: 0, signal: null, stdout: '', stderr: '', timedOut: false, error: null }
}

describe('panel API token', () => {
  it('mints one, hands it to the CLI through the environment, and stores it 0600', async () => {
    const { home, state } = dirs()
    const calls: Array<{ args: string[], env: Record<string, string | undefined> }> = []
    const result = await ensureToken({
      home,
      stateDir: state,
      exec: async (args, env) => {
        calls.push({ args, env })
        writeJsonFile(secretsFile(home), { version: 2, apiToken: { hint: 'abcd', hash: 'x' } })
        return ok()
      },
    })

    expect(result.enrolled).toBe(true)
    expect(result.token).not.toBeNull()
    expect(calls).toHaveLength(1)
    expect(calls[0]?.args).toEqual(['--home', home, 'set-token'])
    expect(calls[0]?.env.HHOSTED_TOKEN).toBe(result.token)
    expect(readStoredToken(state)).toBe(result.token)
    expect(fs.statSync(storedTokenPath(state)).mode & 0o777).toBe(0o600)
  })

  it('reuses a stored token without touching the CLI', async () => {
    const { home, state } = dirs()
    storeToken(state, 'stored-token')
    let called = false
    const result = await ensureToken({
      home,
      stateDir: state,
      exec: async () => {
        called = true
        return ok()
      },
    })
    expect(result).toMatchObject({ token: 'stored-token', enrolled: false })
    expect(called).toBe(false)
  })

  it('never rotates a token home-hosted already holds', async () => {
    const { home, state } = dirs()
    writeJsonFile(secretsFile(home), { version: 2, apiToken: { hint: 'abcd', hash: 'x' } })
    let called = false
    const result = await ensureToken({
      home,
      stateDir: state,
      exec: async () => {
        called = true
        return ok()
      },
    })
    expect(result.token).toBeNull()
    expect(result.detail).toContain('already has an API token')
    expect(called).toBe(false)
    expect(apiTokenEnrolled(home)).toBe(true)
  })

  it('mints one token when two calls race, so neither can invalidate the other', async () => {
    const { home, state } = dirs()
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const minted: string[] = []
    const exec = async (_args: string[], env: Record<string, string | undefined>): Promise<RunResult> => {
      minted.push(env.HHOSTED_TOKEN ?? '')
      await gate
      writeJsonFile(secretsFile(home), { version: 2, apiToken: { hint: 'abcd', hash: 'x' } })
      return ok()
    }

    const first = ensureToken({ home, stateDir: state, exec })
    const second = ensureToken({ home, stateDir: state, exec })
    release()
    const [a, b] = await Promise.all([first, second])

    expect(minted).toHaveLength(1)
    expect(a.token).toBe(b.token)
    expect(readStoredToken(state)).toBe(a.token)
  })

  it('reports a failing CLI instead of pretending it worked', async () => {
    const { home, state } = dirs()
    const result = await ensureToken({
      home,
      stateDir: state,
      exec: async () => ({ ...ok(), code: 1, stderr: 'boom' }),
    })
    expect(result.token).toBeNull()
    expect(result.detail).toContain('boom')
    expect(readStoredToken(state)).toBeNull()
  })
})

describe('reclaiming a refused panel token', () => {
  it('replaces the old hash in one write, and stores the fresh token 0600', async () => {
    const { home, state } = dirs()
    storeToken(state, 'old-token')
    const calls: Array<{ args: string[], env: Record<string, string | undefined> }> = []
    const result = await reclaimToken({
      home,
      stateDir: state,
      exec: async (args, env) => {
        calls.push({ args, env })
        return ok()
      },
    })

    expect(result.token).not.toBeNull()
    expect(result.token).not.toBe('old-token')
    // One write: `set-token` replaces whatever hash is there, and a clear first
    // would leave a window with no token at all.
    expect(calls.map(call => call.args)).toEqual([['--home', home, 'set-token']])
    expect(calls[0]?.env.HHOSTED_TOKEN).toBe(result.token)
    expect(readStoredToken(state)).toBe(result.token)
    expect(fs.statSync(storedTokenPath(state)).mode & 0o777).toBe(0o600)
  })

  it('keeps the old token when the CLI refuses, so nothing is half-written', async () => {
    const { home, state } = dirs()
    storeToken(state, 'old-token')
    let called = 0
    const result = await reclaimToken({
      home,
      stateDir: state,
      exec: async () => {
        called += 1
        return { ...ok(), code: 1, stderr: 'set-token refused' }
      },
    })

    expect(result.token).toBeNull()
    expect(result.detail).toContain('set-token refused')
    expect(called).toBe(1)
    // Nothing was replaced, so the stored plaintext is still the panel's.
    expect(readStoredToken(state)).toBe('old-token')
  })

  it('reports a CLI that cannot run at all, without touching the stored token', async () => {
    const { home, state } = dirs()
    storeToken(state, 'old-token')
    const result = await reclaimToken({
      home,
      stateDir: state,
      exec: async () => { throw new Error('no home-hosted CLI is available') },
    })

    expect(result.token).toBeNull()
    expect(result.detail).toContain('no home-hosted CLI is available')
    expect(readStoredToken(state)).toBe('old-token')
  })

  it('never interleaves two reclaims, so the last enrolment is the stored token', async () => {
    const { home, state } = dirs()
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const order: string[] = []
    const exec = async (_args: string[], env: Record<string, string | undefined>): Promise<RunResult> => {
      order.push(env.HHOSTED_TOKEN === undefined ? 'clear' : 'set')
      await gate
      return ok()
    }

    const first = reclaimToken({ home, stateDir: state, exec })
    const second = reclaimToken({ home, stateDir: state, exec })
    // Let the first operation reach its write before either can finish.
    await new Promise(resolve => setTimeout(resolve, 0))
    release()
    await Promise.all([first, second])

    expect(order).toEqual(['set', 'set'])
    expect(readStoredToken(state)).not.toBeNull()
  })
})

describe('per-panel token slots', () => {
  it('keeps one panel\'s credential out of another\'s file', () => {
    const scratch = tempDir()
    const managed = storedTokenPath(scratch.path)
    const other = storedTokenPath(scratch.path, tokenSlot('/srv/other'))

    expect(other).not.toBe(managed)
    expect(other).toContain('panel-tokens')
    storeToken(scratch.path, 'managed-token')
    storeToken(scratch.path, 'other-token', tokenSlot('/srv/other'))

    expect(readStoredToken(scratch.path)).toBe('managed-token')
    expect(readStoredToken(scratch.path, tokenSlot('/srv/other'))).toBe('other-token')
    // Two roots never share a slot, and a slot is stable for one root.
    expect(tokenSlot('/srv/other')).not.toBe(tokenSlot('/srv/another'))
    expect(tokenSlot('/srv/other/')).toBe(tokenSlot('/srv/other'))
    scratch.cleanup()
  })
})
