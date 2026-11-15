/**
 * Setting a new panel password from the page.
 *
 * This is the locked-out recovery path, so the properties that matter are the ones a failure
 * would defeat: the value must not be predictable, must not appear in a process list, and a
 * refused run must be reported rather than silently looking like success.
 */
import { describe, expect, it } from 'vitest'
import { generatePassword, resetPanelPassword } from '../src/home-hosted/panel-password.js'
import type { RunResult } from '../src/util/exec.js'

/** A CLI that records what it was asked and answers `code`. */
function fakeCli(code = 0, stdout = '', stderr = '') {
  const calls: Array<{ args: string[], env: Record<string, string | undefined> }> = []
  const exec = async (args: string[], env: Record<string, string | undefined>): Promise<RunResult> => {
    calls.push({ args, env })
    return { code, stdout, stderr, error: null } as unknown as RunResult
  }
  return { calls, exec }
}

describe('the generated password', () => {
  it('matches the panel\'s own alphabet and shape', () => {
    // 4-4-4 over an alphabet with no 0/1/l/o, so it can be read off a screen and retyped.
    for (let index = 0; index < 20; index += 1)
      expect(generatePassword()).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{4}-[abcdefghjkmnpqrstuvwxyz23456789]{4}-[abcdefghjkmnpqrstuvwxyz23456789]{4}$/)
  })

  it('does not repeat itself', () => {
    const seen = new Set(Array.from({ length: 50 }, () => generatePassword()))
    expect(seen.size).toBe(50)
  })

  it('is derived from the bytes it is given, so a weak source cannot be assumed away', () => {
    // All-zero bytes map to the first symbol of the alphabet: the mapping is total, not sparse.
    expect(generatePassword(Buffer.alloc(12))).toBe('aaaa-aaaa-aaaa')
  })
})

describe('resetting the panel password', () => {
  it('runs the panel\'s own set-password and returns the value once', async () => {
    const cli = fakeCli()
    const result = await resetPanelPassword({ home: '/roots/panel', exec: cli.exec })
    expect(result.ok).toBe(true)
    expect(cli.calls).toHaveLength(1)
    // `set-password` — the command the pinned release actually has. `account reset` does not
    // exist there, which is why the page may never tell a person to run one.
    expect(cli.calls[0]!.args.slice(0, 1)).toEqual(['set-password'])
    expect(cli.calls[0]!.args).toContain('--home')
    expect(cli.calls[0]!.args).toContain('/roots/panel')
    // The secret goes through the environment, never argv: argv is visible in a process list.
    expect(cli.calls[0]!.env.HHOSTED_PASSWORD).toBe(result.password)
    expect(cli.calls[0]!.args.join(' ')).not.toContain(result.password!)
  })

  it('reports the CLI\'s own refusal instead of claiming success', async () => {
    const cli = fakeCli(1, '', 'the password is too short')
    const result = await resetPanelPassword({ home: '/h', exec: cli.exec })
    expect(result.ok).toBe(false)
    // No password is handed back for a run that did not set one, or the page would show a value
    // that does not work.
    expect(result.password).toBeNull()
    expect(result.detail).toContain('too short')
  })

  it('says which command failed when the CLI answers nothing at all', async () => {
    const cli = fakeCli(127)
    const result = await resetPanelPassword({ home: '/h', exec: cli.exec })
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('set-password')
    expect(result.detail).toContain('127')
  })
})
