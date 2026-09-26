import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { apiTokenEnrolled, ensureToken, readStoredToken, storeToken, storedTokenPath } from '../src/home-hosted/token.js'
import { secretsFile } from '../src/util/paths.js'
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
