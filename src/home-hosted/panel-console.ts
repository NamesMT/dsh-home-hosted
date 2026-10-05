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

  // Only the tail matters when a count was asked for, so a 5 MB log is not read
  // into memory to show 20 lines of it.
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

/**
 * The last `limit` lines, read from the end of the file rather than the start.
 *
 * `lines <= 0` reads everything: `readWhole` handles the whole-log case, and this
 * is only reached with a positive limit.
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
    // A 64 KiB window per requested line is generous for a console and bounded, so a
    // single very long line still fits without ever reading a whole huge file.
    const window = Math.min(size, Math.max(64 * 1024, limit * 1024))
    const start = size - window
    const buffer = Buffer.alloc(window)
    fs.readSync(fd, buffer, 0, window, start)
    const text = buffer.toString('utf8')
    const lines = splitLines(start > 0 ? text.slice(Math.max(0, text.indexOf('\n') + 1)) : text)
    return { lines, error: null }
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
