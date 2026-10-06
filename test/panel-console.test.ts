import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { panelConsolePath, readPanelConsole } from '../src/home-hosted/panel-console.js'
import { hhDir } from '../src/home-hosted/layout.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

function home(): string {
  scratch = tempDir()
  return scratch.path
}

/** Write the console log the panel would have produced. */
function writeConsole(root: string, text: string, rotated?: string): void {
  const file = panelConsolePath(root)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
  if (rotated !== undefined)
    fs.writeFileSync(`${file}.1`, rotated)
}

describe('the panel console', () => {
  it('lives where the panel writes it, under the state root it resolved', () => {
    const root = home()
    expect(panelConsolePath(root)).toBe(path.join(hhDir(root), '.logs', 'home-hosted.log'))
  })

  it('reads a missing log as empty, which is not an error', () => {
    // A panel that has just started, or never started, has nothing to say. Reporting
    // that as a failure would make the one diagnostic that always works look broken.
    const root = home()
    expect(readPanelConsole(root, { lines: 20 })).toMatchObject({ path: panelConsolePath(root), lines: [], error: null })
  })

  it('returns the last lines, oldest first, without counting the trailing newline', () => {
    // `split('\n')` leaves the file's final newline as an empty element, so a naive
    // `slice(-n)` silently returns one fewer line than asked for.
    const root = home()
    writeConsole(root, 'one\ntwo\nthree\n')
    expect(readPanelConsole(root, { lines: 2 }).lines).toEqual(['two', 'three'])
    expect(readPanelConsole(root, { lines: 1 }).lines).toEqual(['three'])
  })

  /**
   * The block reader used to decode **each 64 KiB block on its own**, so a multi-byte
   * character straddling a boundary became two replacement characters — a non-ASCII log line
   * corrupted at every block mark, silently, because `toString('utf8')` substitutes U+FFFD
   * rather than throwing. The comment above the loop said a boundary "can land mid-line",
   * which is true and was the only case considered; mid-character is the other one.
   *
   * The file below is valid UTF-8: the same bytes read whole decode clean, and only the tail
   * reader used to corrupt them.
   */
  it('keeps a multi-byte character that straddles a block boundary', () => {
    const root = home()
    const block = 64 * 1024
    // Byte 25 starts a three-byte character; the first read begins at `len - block`, which is
    // placed one byte into it.
    const text = `${'x'.repeat(25)}日${'z'.repeat(block - 2)}\n`
    writeConsole(root, text)
    expect(Buffer.from(fs.readFileSync(panelConsolePath(root))).toString('utf8')).not.toContain('\uFFFD')

    const read = readPanelConsole(root, { lines: 1 })
    expect(read.lines.join('\n')).not.toContain('\uFFFD')
    expect(read.lines.join('\n')).toContain('日')
    // And the whole-file path agrees, so the two readers do not disagree on the count.
    expect(readPanelConsole(root, { lines: 0 }).lines.join('\n')).toContain('日')
  })

  /**
   * The **loop** grows, not the block — and the comment on `TAIL_BLOCK_BYTES` claimed the
   * opposite ("grows only when a request needs more lines than it held"), which was never true
   * of a `const`. Pinned by reading a request that one block cannot satisfy: a file with far
   * more bytes than blocks and almost no separators, where the loop must walk back to byte 0.
   */
  it('reads further back than one block when a request needs more lines than it holds', () => {
    const root = home()
    const block = 64 * 1024
    // Eight blocks of bytes, with its separators at the end: they cannot be reached without
    // reading well past the first block, which is what makes this pin the *loop*'s growth.
    writeConsole(root, `${'x'.repeat(block * 8)}\nshort-a\nshort-b\n`)
    expect(readPanelConsole(root, { lines: 2 }).lines).toEqual(['short-a', 'short-b'])
    // The long first line is reachable too, so the bound dropped nothing.
    expect(readPanelConsole(root, { lines: 3 }).lines[0]).toHaveLength(block * 8)
  })

  it('reads across a rotation, oldest first', () => {
    // One rotation is all the panel keeps (`rotateLog`), and the interesting part of a
    // crash is usually the end of the file that just rotated away.
    const root = home()
    writeConsole(root, 'current\n', 'rotated-1\nrotated-2\n')
    expect(readPanelConsole(root, { lines: 3 }).lines).toEqual(['rotated-1', 'rotated-2', 'current'])
    // Fewer lines than the rotated file holds still reads from the tail.
    expect(readPanelConsole(root, { lines: 2 }).lines).toEqual(['rotated-2', 'current'])
  })

  /**
   * An unterminated `.1` is what a panel killed mid-write leaves behind, and
   * concatenating the two files makes its last line and the live file's first line
   * **one** line. Joining the arrays invents a line break the log never had.
   *
   * Measured against the real panel's own `logs`, which joins the text:
   * `rot2-partial` + `live1` is one line, `rot2-partiallive1` — and asking for 2 lines
   * of `['live1','live2']` alone is one line short of the answer.
   */
  it('joins an unterminated rotated line to the live file\'s first, as concatenation would', () => {
    const root = home()
    writeConsole(root, 'live1\nlive2\n', 'rot1\nrot2-partial')
    expect(readPanelConsole(root, { lines: 2 }).lines).toEqual(['rot2-partiallive1', 'live2'])
    expect(readPanelConsole(root, { lines: 3 }).lines).toEqual(['rot1', 'rot2-partiallive1', 'live2'])
    expect(readPanelConsole(root, { lines: 0 }).lines).toEqual(['rot1', 'rot2-partiallive1', 'live2'])
    // A terminated `.1` is unaffected: the two files simply follow each other.
    const clean = home()
    writeConsole(clean, 'live1\n', 'rot1\n')
    expect(readPanelConsole(clean, { lines: 2 }).lines).toEqual(['rot1', 'live1'])
  })

  it('reads the whole log when asked for none in particular', () => {
    const root = home()
    writeConsole(root, 'a\nb\n', 'z\n')
    expect(readPanelConsole(root, { lines: 0 }).lines).toEqual(['z', 'a', 'b'])
  })

  /**
   * A line's length is unbounded — a stack trace, a JSON dump or a verbose error
   * line is one line and can be kilobytes — so a window sized per *line* silently
   * returns fewer lines than asked for. Verified against the previous
   * implementation: 500 lines of ~2 KB, `lines: 100` returned 50.
   *
   * The window must grow until the request is satisfied or the file start is
   * reached, which is what home-hosted's own `readTail` does for the same reason.
   */
  it('returns the requested count even when every line is long', () => {
    const root = home()
    const lines = Array.from({ length: 500 }, (_, i) => `line ${i} ${'x'.repeat(2000)}`)
    writeConsole(root, `${lines.join('\n')}\n`)

    for (const ask of [1, 10, 50, 100, 200, 500]) {
      const read = readPanelConsole(root, { lines: ask })
      expect(read.error).toBeNull()
      // The true tail, not just the right number of lines.
      expect(read.lines).toEqual(lines.slice(-ask))
    }
  })

  it('still returns exactly the tail when the file is larger than one window', () => {
    // 2 MB of long lines: far past any single 64 KiB block, so the read has to
    // walk backwards more than once.
    const root = home()
    const lines = Array.from({ length: 1000 }, (_, i) => `row ${i} ${'y'.repeat(2000)}`)
    writeConsole(root, `${lines.join('\n')}\n`)
    const read = readPanelConsole(root, { lines: 25 })
    expect(read.lines).toEqual(lines.slice(-25))
    expect(read.lines[0]).toContain('row 975')
  })

  /**
   * A short log has everything it has: not padded, and not an error. This is the
   * case that must keep working when the window grows to the file start.
   */
  it('returns everything a short log holds instead of padding or failing', () => {
    const root = home()
    writeConsole(root, 'only\nthree\nlines\n')
    // A count larger than the log returns the whole log…
    for (const ask of [3, 4, 50, 5000])
      expect(readPanelConsole(root, { lines: ask })).toMatchObject({ lines: ['only', 'three', 'lines'], error: null })
    // …and a smaller one returns exactly that many, from the tail.
    expect(readPanelConsole(root, { lines: 2 }).lines).toEqual(['three', 'lines'])
    expect(readPanelConsole(root, { lines: 1 }).lines).toEqual(['lines'])
  })

  it('keeps a single line longer than a whole block intact', () => {
    // One line, 200 KB: larger than the 64 KiB block, so no single read holds it.
    const root = home()
    const huge = `start ${'z'.repeat(200_000)} end`
    writeConsole(root, `before\n${huge}\n`)
    expect(readPanelConsole(root, { lines: 2 }).lines).toEqual(['before', huge])
    expect(readPanelConsole(root, { lines: 1 }).lines).toEqual([huge])
  })

  it('survives a log that is not valid UTF-8 without throwing', () => {
    // A child that writes raw bytes into the console redirection must not turn the
    // diagnostics read into a crash.
    const root = home()
    const file = panelConsolePath(root)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, Buffer.from([0x61, 0xff, 0xfe, 0x0a]))
    expect(() => readPanelConsole(root, { lines: 5 })).not.toThrow()
    expect(readPanelConsole(root, { lines: 5 }).lines.length).toBeGreaterThan(0)
  })

  it('reports an unreadable file instead of claiming the panel said nothing', () => {
    const root = home()
    const file = panelConsolePath(root)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    // A directory where the log should be: the read fails for a real reason, and
    // "no output" would be a lie.
    fs.mkdirSync(file)
    const result = readPanelConsole(root, { lines: 5 })
    expect(result.error).not.toBeNull()
    expect(result.lines).toEqual([])
  })
})
