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
  const current = limit > 0 ? readTail(file, limit) : readWhole(file)
  if (current.error !== null)
    return { path: file, lines: [], error: current.error }

  if (limit <= 0) {
    const rotated = readWhole(`${file}.1`)
    // A rotated file that cannot be read is not a failure: the live log answered.
    return { path: file, lines: [...rotated.lines, ...current.lines], error: null }
  }

  if (current.lines.length >= limit)
    return { path: file, lines: current.lines.slice(-limit), error: null }

  // The live log is shorter than the request, so the rotated one supplies the rest.
  const rotated = readWhole(`${file}.1`)
  return { path: file, lines: [...rotated.lines, ...current.lines].slice(-limit), error: null }
}

interface ReadResult {
  lines: string[]
  error: string | null
}

/** `fs.readFileSync` decodes as UTF-8 and replaces invalid bytes, so raw output is safe. */
function readWhole(file: string): ReadResult {
  if (!fs.existsSync(file))
    return { lines: [], error: null }
  try {
    return { lines: splitLines(fs.readFileSync(file, 'utf8')), error: null }
  }
  catch (error) {
    return { lines: [], error: message(error) }
  }
}

/** One backward read's size. Grows only when a request needs more lines than it held. */
const TAIL_BLOCK_BYTES = 64 * 1024

/** Line separators in one block, counted in place rather than by splitting it. */
function countNewlines(text: string): number {
  let count = 0
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10)
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
    return { lines: [], error: null }
  let fd: number
  try {
    fd = fs.openSync(file, 'r')
  }
  catch (error) {
    return { lines: [], error: message(error) }
  }
  try {
    const size = fs.fstatSync(fd).size
    if (size === 0)
      return { lines: [], error: null }

    let end = size
    let text = ''
    // Counted as blocks arrive rather than re-splitting the whole accumulated string on
    // every pass: that made the loop quadratic in the number of blocks, and a capped
    // request on a 96 MB console spent most of its time in the condition.
    let newlines = 0
    // `limit + 1` separators, because a file's own trailing newline terminates no line.
    while (end > 0 && newlines < limit + 1) {
      const start = Math.max(0, end - TAIL_BLOCK_BYTES)
      const length = end - start
      const buffer = Buffer.alloc(length)
      fs.readSync(fd, buffer, 0, length, start)
      const block = buffer.toString('utf8')
      newlines += countNewlines(block)
      text = block + text
      end = start
    }

    // A block boundary can land mid-line; the loop only exits once `limit + 1`
    // separators are present, so at least `limit` complete lines follow the
    // fragment and the trailing `slice(-limit)` can never reach it.
    return { lines: splitLines(text).slice(-limit), error: null }
  }
  catch (error) {
    return { lines: [], error: message(error) }
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
