import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface TempDir {
  path: string
  cleanup: () => void
}

/** A scratch directory outside the repo, removed when the test finishes. */
export function tempDir(prefix = 'dsh-home-hosted-'): TempDir {
  const created = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  // Canonicalised: on macOS `os.tmpdir()` is reached as `/var/...` while the
  // product resolves it to `/private/var/...`, and a test comparing the two
  // would fail on a path that is really the same file.
  const dir = fs.realpathSync(created)
  return {
    path: dir,
    cleanup: () => {
      fs.rmSync(dir, { recursive: true, force: true })
    },
  }
}

export function writeJsonFile(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}
