/**
 * The panel's own console output, read straight from disk.
 *
 * This is the one diagnostic that works when nothing else does: `up` redirects the
 * daemon's stdout and stderr into `<root>/.hh/.logs/home-hosted.log`, and a panel
 * that is running but misbehaving is exactly when its API is unreachable and its
 * token is hardest to come by. So it is a file read — no session, no API token,
 * no CLI, and no dependence on the panel answering.
 *
 * The path here mirrors home-hosted's own `daemonLogPath` rather than importing it:
 * this plugin supports panels of several releases, and only the layout is a
 * contract, not that helper's location.
 */
import fs from 'node:fs'
import path from 'node:path'
import { hhDir } from './layout.js'

/** Where a panel under `home` writes its console. */
export function panelConsolePath(home: string): string {
  return path.join(hhDir(home), '.logs', 'home-hosted.log')
}

export interface PanelConsoleRead {
  /** The live log's path, so a person can read the rest of it themselves. */
  path: string
  /** Oldest first. */
  lines: string[]
  /** A real read failure; a missing log is not one. */
  error: string | null
}

/**
 * The last `lines` lines of the panel console, oldest first.
 *
 * `lines <= 0` means the whole log. One rotation is read too (`<log>.1`, which the
 * panel writes with `rotateLog`), because the end of the file that just rotated
 * away is usually where a crash is.
 */
export function readPanelConsole(home: string, options: { lines?: number } = {}): PanelConsoleRead {
  const file = panelConsolePath(home)
  const limit = options.lines ?? 50

  // A counted request reads only as much of the tail as it needs, growing the window
  // when lines are long — rather than loading a 5 MB console to show 20 lines of it.
  const current: ReadResult = limit > 0 ? readTail(file, limit) : readWhole(file)
  if (current.error !== null)
    return { path: file, lines: [], error: current.error }

  if (limit <= 0) {
    const rotated = readWhole(`${file}.1`)
    // A rotated file that cannot be read is not a failure: the live log answered.
    return { path: file, lines: joinRotation(rotated, current.lines), error: null }
  }

  // `limit + 1` separators, because the file's own trailing newline terminates no line —
  // the same test the panel's `logs` makes. Counting *lines* instead would stop short
  // when `.1` is unterminated, since its last line merges into this file's first and
  // the answer then holds one fewer line than asked for.
  if (current.newlines >= limit + 1)
    return { path: file, lines: current.lines.slice(-limit), error: null }

  // The live log is short of the request, so the rotated one supplies the rest.
  const rotated = readWhole(`${file}.1`)
  return { path: file, lines: joinRotation(rotated, current.lines).slice(-limit), error: null }
}

/**
 * The two files' lines as concatenating them would join them.
 *
 * `.1`'s last line is unterminated whenever the panel was killed mid-write, and
 * concatenating the files makes that line and the current file's first line **one**
 * line. Joining the arrays instead keeps them apart and invents a line break the log
 * never had — measured against the real panel's own `logs`, which joins the text and
 * returns `rot2-partiallive1` where the array join returned two lines.
 */
function joinRotation(rotated: ReadResult, current: string[]): string[] {
  if (!rotated.unterminated || rotated.lines.length === 0 || current.length === 0)
    return [...rotated.lines, ...current]
  return [...rotated.lines.slice(0, -1), `${rotated.lines[rotated.lines.length - 1]}${current[0]}`, ...current.slice(1)]
}

interface ReadResult {
  lines: string[]
  /** Separators seen, so a caller can tell whether it holds `limit` *complete* lines. */
  newlines: number
  /** True when the file does not end in a newline, so its last line is partial. */
  unterminated: boolean
  error: string | null
}

/** `fs.readFileSync` decodes as UTF-8 and replaces invalid bytes, so raw output is safe. */
function readWhole(file: string): ReadResult {
  if (!fs.existsSync(file))
    return { lines: [], newlines: 0, unterminated: false, error: null }
  try {
    // Read the bytes, count the separators on them, and decode once — the same order the block
    // reader uses, so the two agree on the count and neither can split a character.
    const bytes = fs.readFileSync(file)
    const text = bytes.toString('utf8')
    return { lines: splitLines(text), newlines: countNewlines(bytes), unterminated: text.length > 0 && !text.endsWith('\n'), error: null }
  }
  catch (error) {
    return { lines: [], newlines: 0, unterminated: false, error: message(error) }
  }
}

/**
 * One backward read's size, fixed.
 *
 * The comment here used to say it "grows only when a request needs more lines than it held",
 * which was never true of this constant — it is a `const`, assigned once, and read only inside
 * the loop's `Math.max`. What grows is the **loop**: it keeps taking another block backwards
 * until it has `limit + 1` separators or reaches byte 0, so a request for more lines than one
 * block holds still succeeds. Measured: a 3-line request over an 8 MB, three-newline console
 * returns 3 lines, having read back to the start.
 */
const TAIL_BLOCK_BYTES = 64 * 1024

/** Line separators in one block, counted in place rather than by splitting it. */
/**
 * `0x0A` bytes in a block.
 *
 * Counted on the bytes, not on decoded text: a newline cannot occur inside a multi-byte UTF-8
 * sequence, so the answer is identical — and it lets the caller count a block **without**
 * decoding it, which is what keeps a character split across two blocks from being decoded as
 * two replacement characters.
 */
function countNewlines(block: Uint8Array): number {
  let count = 0
  for (let index = 0; index < block.length; index += 1) {
    if (block[index] === 10)
      count += 1
  }
  return count
}

/**
 * The last `limit` lines, read backwards from the end of the file.
 *
 * The window **grows** rather than being sized once from `limit`: a line's length is
 * unbounded — a stack trace, a JSON dump or a verbose error is one line and can be
 * kilobytes — so "one block per requested line" silently returns fewer lines than
 * asked for. Measured against the previous implementation, on 500 lines of ~2 KB,
 * `lines: 100` returned 50.
 *
 * The loop stops as soon as `limit` complete lines are present or the file start is
 * reached, so a bounded request never reads an unbounded file. Home-hosted's own
 * `readTail` (`src/helpers/daemon-log.ts`) grows for the same reason.
 *
 * `lines <= 0` means the whole log: `readWhole` handles that, and this is only
 * reached with a positive limit.
 */
function readTail(file: string, limit: number): ReadResult {
  if (!fs.existsSync(file))
    return { lines: [], newlines: 0, unterminated: false, error: null }
  let fd: number
  try {
    fd = fs.openSync(file, 'r')
  }
  catch (error) {
    return { lines: [], newlines: 0, unterminated: false, error: message(error) }
  }
  try {
    const size = fs.fstatSync(fd).size
    if (size === 0)
      return { lines: [], newlines: 0, unterminated: false, error: null }

    let end = size
    let text = ''
    // Counted as blocks arrive rather than re-splitting the whole accumulated string on
    // every pass: that made the loop quadratic in the number of blocks, and a capped
    // request on a 96 MB console spent most of its time in the condition.
    let newlines = 0
    const blocks: Buffer[] = []
    // `limit + 1` separators, because a file's own trailing newline terminates no line.
    while (end > 0 && newlines < limit + 1) {
      const start = Math.max(0, end - TAIL_BLOCK_BYTES)
      const length = end - start
      const buffer = Buffer.alloc(length)
      fs.readSync(fd, buffer, 0, length, start)
      // Counted on the **bytes**: `0x0A` cannot occur inside a multi-byte sequence, so this is
      // the same number as counting the decoded text — and it avoids a decode per block.
      newlines += countNewlines(buffer)
      blocks.unshift(buffer)
      end = start
    }

    // Decoded **once**, over the assembled bytes. Decoding each block on its own split any
    // multi-byte character that straddled a boundary into two replacement characters — a
    // non-ASCII log line became corrupt exactly at every 64 KiB mark. The comment above used to
    // say a boundary "can land mid-line", which is true and was the only case considered;
    // mid-character is the other one, and it is silent because `toString` substitutes U+FFFD
    // rather than throwing. Concatenating costs nothing extra here: the loop already kept the
    // whole window as a string.
    text = Buffer.concat(blocks).toString('utf8')

    // A block boundary can land mid-line; the loop only exits once `limit + 1`
    // separators are present, so at least `limit` complete lines follow the
    // fragment and the trailing `slice(-limit)` can never reach it.
    return { lines: splitLines(text).slice(-limit), newlines, unterminated: false, error: null }
  }
  catch (error) {
    return { lines: [], newlines: 0, unterminated: false, error: message(error) }
  }
  finally {
    fs.closeSync(fd)
  }
}

/**
 * Split on the trailing newline rather than after it: a log file ends with one, so
 * a plain `split('\n')` leaves an empty last element and quietly returns one fewer
 * line than asked for. Home-hosted's own `readLogLines` makes the same correction.
 */
function splitLines(text: string): string[] {
  const lines = text.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '')
    lines.pop()
  return lines
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
