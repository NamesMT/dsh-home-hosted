/**
 * Small filesystem helpers. Every write is atomic (temp file + rename) so a
 * reader never sees half a file, and secret-bearing files are created 0600.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, 'utf8')
  }
  catch {
    return null
  }
}

/**
 * A hand-editable state file, decoded the way the editors that write one save it.
 *
 * Every file here is JSON, and `JSON.parse` refuses a **byte-order mark**: PowerShell's
 * `Set-Content -Encoding UTF8` (5.1) and `Out-File`/`>` (UTF-16LE) prepend one, and Notepad
 * writes one for a "UTF-8 with BOM" save. The refusal names an invisible character, so the
 * person is told their JSON is broken when it is not.
 *
 * Mirrors the panel's own `decodeStateFile` (`helpers/config-text.ts` in the pinned release):
 * the two read the same files, and a reader that refuses what the panel accepts reports a
 * healthy config as unparseable.
 *
 * Read as a `Buffer`, never with `'utf8'`: a `'utf8'` read has already lost the bytes that
 * tell UTF-16 apart. Not silent coercion — a BOM is not content.
 */
export function decodeStateFile(bytes: Buffer): string {
  if (bytes.length >= 2) {
    if (bytes[0] === 0xFF && bytes[1] === 0xFE)
      return stripBom(bytes.subarray(2).toString('utf16le'))
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
      // UTF-16BE: swap into LE, the only order Node decodes.
      const swapped = Buffer.from(bytes.subarray(2))
      swapped.swap16()
      return stripBom(swapped.toString('utf16le'))
    }
  }
  return stripBom(bytes.toString('utf8'))
}

/** A UTF-8 BOM is three bytes; Node decodes it to the one `\uFEFF` character. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
}

/** {@link decodeStateFile} for a path, or null when it cannot be read. */
export function readStateFile(file: string): string | null {
  try {
    return decodeStateFile(fs.readFileSync(file))
  }
  catch {
    return null
  }
}

export function readJson<T>(file: string): T | null {
  const text = readStateFile(file)
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
