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

  it('reads across a rotation, oldest first', () => {
    // One rotation is all the panel keeps (`rotateLog`), and the interesting part of a
    // crash is usually the end of the file that just rotated away.
    const root = home()
    writeConsole(root, 'current\n', 'rotated-1\nrotated-2\n')
    expect(readPanelConsole(root, { lines: 3 }).lines).toEqual(['rotated-1', 'rotated-2', 'current'])
    // Fewer lines than the rotated file holds still reads from the tail.
    expect(readPanelConsole(root, { lines: 2 }).lines).toEqual(['rotated-2', 'current'])
  })

  it('reads the whole log when asked for none in particular', () => {
    const root = home()
    writeConsole(root, 'a\nb\n', 'z\n')
    expect(readPanelConsole(root, { lines: 0 }).lines).toEqual(['z', 'a', 'b'])
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
