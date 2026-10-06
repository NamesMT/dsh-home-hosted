/**
 * The process seam's guarantees about the **text** it returns.
 *
 * `exec.ts` streams a child's output, and a pipe's chunks split on the pipe's boundaries
 * rather than on character ones — so decoding each chunk on its own turned a multi-byte
 * character straddling two of them into replacement characters. That output is what
 * `unknownCommand` classifies and what every error message is built from, so the corruption
 * was not cosmetic.
 *
 * These run real children: only a real pipe can produce the chunk boundary under test.
 */
import { describe, expect, it } from 'vitest'
import { run } from '../src/util/exec.js'

/** Writes one byte into a three-byte character, then flushes the rest as a second chunk. */
const SPLIT_SCRIPT = `
  const buf = Buffer.from('x'.repeat(65535) + '日' + 'y'.repeat(20), 'utf8')
  const at = buf.indexOf(Buffer.from('日')) + 1
  process.stdout.write(buf.subarray(0, at))
  setTimeout(() => { process.stdout.write(buf.subarray(at)); process.exit(0) }, 30)
`

describe('the process seam decodes its output as text', () => {
  it('keeps a multi-byte character split across two pipe chunks', async () => {
    const result = await run(process.execPath, ['-e', SPLIT_SCRIPT])
    expect(result.stdout).not.toContain('\uFFFD')
    expect(result.stdout).toContain('日')
    // The whole output, not a truncated prefix: nothing was lost at the boundary.
    expect(result.stdout.length).toBe(65535 + 1 + 20)
  })

  it('does the same for stderr', async () => {
    const result = await run(process.execPath, ['-e', `
      const buf = Buffer.from('x'.repeat(65535) + '日' + 'y'.repeat(20), 'utf8')
      const at = buf.indexOf(Buffer.from('日')) + 1
      process.stderr.write(buf.subarray(0, at))
      setTimeout(() => { process.stderr.write(buf.subarray(at)); process.exit(0) }, 30)
    `])
    expect(result.stderr).not.toContain('\uFFFD')
    expect(result.stderr).toContain('日')
  })

  it('still caps each stream at maxBytes', async () => {
    const result = await run(process.execPath, ['-e', 'process.stdout.write("z".repeat(500))'], { maxBytes: 100 })
    expect(result.stdout).toHaveLength(100)
  })
})
