import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface TempDir {
  path: string
  cleanup: () => void
}

/** A scratch directory outside the repo, removed when the test finishes. */
export function tempDir(prefix = 'dsh-home-hosted-'): TempDir {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
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
