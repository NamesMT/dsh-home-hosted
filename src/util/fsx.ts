/**
 * Small filesystem helpers. Every write is atomic (temp file + rename) so a
 * reader never sees half a file, and secret-bearing files are created 0600.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export function fileExists(file: string): boolean {
  try {
    return fs.statSync(file).isFile()
  }
  catch {
    return false
  }
}

export function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, 'utf8')
  }
  catch {
    return null
  }
}

export function readJson<T>(file: string): T | null {
  const text = readText(file)
  if (text === null)
    return null
  try {
    return JSON.parse(text) as T
  }
  catch {
    return null
  }
}

export function ensureDir(dir: string, mode = 0o700): void {
  fs.mkdirSync(dir, { recursive: true, mode })
}

/** Write a file through a sibling temp file, then rename it into place. */
export function writeFileAtomic(file: string, data: string, mode?: number): void {
  ensureDir(path.dirname(file))
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`)
  const fd = fs.openSync(temp, 'w', mode ?? 0o644)
  try {
    fs.writeFileSync(fd, data, 'utf8')
    fs.fsyncSync(fd)
  }
  finally {
    fs.closeSync(fd)
  }
  if (mode !== undefined)
    fs.chmodSync(temp, mode)
  fs.renameSync(temp, file)
}

export function writeJsonAtomic(file: string, value: unknown, mode?: number): void {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`, mode)
}

/** Best-effort removal; a missing file is not an error. */
export function removeFile(file: string): void {
  try {
    fs.rmSync(file, { force: true })
  }
  catch {
    // ignored: the caller only cares that it is gone, and reconciliation reports the rest
  }
}
