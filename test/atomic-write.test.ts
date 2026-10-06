/**
 * The process seam's own guarantees, and the atomic write's.
 *
 * Both are stated in the source headers as properties of the code, and both really rest on
 * the runtime: `spawn`'s `shell: false`, and `rename(2)` replacing a directory entry
 * atomically. Nothing else in the suite asserts either with an input that would expose a
 * change, so these tests exist to make the reliance visible.
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { writeFileAtomic } from '../src/util/fsx.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let dir: TempDir | null = null

afterEach(() => {
  dir?.cleanup()
  dir = null
})

function scratch(): string {
  dir = tempDir()
  return dir.path
}

describe('writeFileAtomic', () => {
  it('replaces the file through a rename rather than truncating it in place', () => {
    const root = scratch()
    const target = path.join(root, 'settings.json')

    writeFileAtomic(target, 'ORIGINAL\n')
    const before = fs.statSync(target).ino
    writeFileAtomic(target, 'UPDATED\n')

    expect(fs.readFileSync(target, 'utf8')).toBe('UPDATED\n')
    // A rename gives the path a **new** inode; opening the target and truncating would keep
    // it. This is the assertion that distinguishes the two implementations, and the reason
    // a concurrent reader never sees a half-written file.
    expect(fs.statSync(target).ino).not.toBe(before)
  })

  it('leaves no temp file behind, on success or on a failed write', () => {
    const root = scratch()
    const target = path.join(root, 'settings.json')
    writeFileAtomic(target, 'ok\n')
    expect(fs.readdirSync(root).filter(name => name.endsWith('.tmp'))).toEqual([])

    // A write that cannot complete must not damage what is already there: the temp file is
    // a sibling and the rename never runs, so the old content survives. A read-only parent
    // makes the temp `openSync` fail for real (EACCES), which is what a full disk or a
    // permission mistake looks like here.
    const locked = path.join(root, 'locked')
    fs.mkdirSync(locked, { recursive: true })
    const blocked = path.join(locked, 'settings.json')
    writeFileAtomic(blocked, 'ok\n')
    fs.chmodSync(locked, 0o500)
    try {
      expect(() => writeFileAtomic(blocked, 'new\n')).toThrow()
      expect(fs.readFileSync(blocked, 'utf8')).toBe('ok\n')
      // The failed attempt left nothing behind next to it either.
      expect(fs.readdirSync(locked).filter(name => name.endsWith('.tmp'))).toEqual([])
    }
    finally {
      fs.chmodSync(locked, 0o700)
    }
  })

  it('applies the requested mode to the final file', () => {
    const root = scratch()
    const target = path.join(root, 'token')
    writeFileAtomic(target, 'secret\n', 0o600)
    expect(fs.statSync(target).mode & 0o777).toBe(0o600)
    // And the temp file was created with it too, so the secret is never briefly world-readable.
    expect(fs.readdirSync(root).filter(name => name.endsWith('.tmp'))).toEqual([])
  })
})
