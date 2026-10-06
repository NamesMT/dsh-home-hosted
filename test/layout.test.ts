import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_WORKSPACE,
  defaultWorkspace,
  globalSettingsFile,
  hhDir,
  isHhRoot,
  isLegacyRoot,
  migrationRefusal,
  readWorkspaces,
  runFile,
  secretsFile,
  serversFile,
  workspaceDir,
  workspaceLogsDir,
  workspaceSecretsFile,
  workspaceSettingsFile,
  workspaceStateDir,
  workspacesFile,
} from '../src/home-hosted/layout.js'
import { makeHhHome, makeLegacyHome } from './helpers/hh.js'
import { tempDir, writeJsonFile } from './helpers/temp.js'
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

describe('the 0.7 layout', () => {
  it('derives every path from the root and the workspace', () => {
    const root = home()
    expect(hhDir(root)).toBe(path.join(root, '.hh'))
    expect(globalSettingsFile(root)).toBe(path.join(root, '.hh', 'settings.json'))
    expect(workspacesFile(root)).toBe(path.join(root, '.hh', 'workspaces.json'))
    expect(secretsFile(root)).toBe(path.join(root, '.hh', '.control-secrets.json'))
    expect(runFile(root)).toBe(path.join(root, '.hh', 'run.json'))

    expect(workspaceDir(root, 'alpha')).toBe(path.join(root, '.hh', 'alpha'))
    expect(serversFile(root, 'alpha')).toBe(path.join(root, '.hh', 'alpha', 'servers.config.json'))
    expect(workspaceSettingsFile(root, 'alpha')).toBe(path.join(root, '.hh', 'alpha', 'settings.json'))
    expect(workspaceSecretsFile(root, 'alpha')).toBe(path.join(root, '.hh', 'alpha', '.secrets.json'))
    expect(workspaceLogsDir(root, 'alpha')).toBe(path.join(root, '.hh', 'alpha', '.logs'))
    expect(workspaceStateDir(root, 'alpha')).toBe(path.join(root, '.hh', 'alpha', '.state'))

    expect(DEFAULT_WORKSPACE).toBe('default')
    expect(serversFile(root, DEFAULT_WORKSPACE)).not.toBe(serversFile(root, 'alpha'))
  })
})

describe('the workspace registry', () => {
  it('reports a missing registry as empty, not broken', () => {
    expect(readWorkspaces(home())).toEqual({ workspaces: [], error: null })
  })

  /**
   * A registry id becomes a **path segment** — `workspaceDir` joins it under `.hh/` — and
   * `readWorkspaces` accepted any non-empty string. `defaultWorkspace` then returned it, so a
   * `workspaces.json` naming `../../etc` sent `serversFile` outside the state root, and the
   * foreign-panel write path (`createForeign`/`updateForeign`/`deleteForeign`) writes through
   * exactly that. The panel's own schema is `^[a-z0-9][a-z0-9_-]*$` (the same
   * `WORKSPACE_ID_PATTERN` this repo uses), so a registry carrying anything else is not one
   * the panel would ever have written.
   */
  /**
   * The single point where a workspace id becomes a path. Guarding the *entry points* alone
   * leaves a gap whenever a new one appears — a foreign panel's id comes from a file on disk,
   * not from `callWorkspace` — so the builder refuses too, and both agree.
   */
  it('refuses to turn an invalid workspace id into a path at all', () => {
    const root = home()
    for (const id of ['..', '../x', 'a/b', 'UPPER', '', 'a b']) {
      expect(() => workspaceDir(root, id), `${JSON.stringify(id)} must be refused`).toThrow(/must match/)
      expect(() => serversFile(root, id)).toThrow(/must match/)
    }
    for (const id of ['default', 'my-ws_2'])
      expect(workspaceDir(root, id)).toBe(path.join(root, '.hh', id))
  })

  it('refuses a registry id that could escape the state root', () => {
    for (const id of ['../../../../tmp/escaped', '..', '.', 'a/../b', 'a/b', 'UPPER', '-lead', 'a b', 'a.b']) {
      const root = makeHhHome(home(), { workspaces: [{ id, label: id }] })
      const read = readWorkspaces(root)
      // `error` is `string | null`, and a bug that lets the id through yields `null` — so
      // assert the shape first, or a failure prints "expected object, got object".
      expect(typeof read.error, `${JSON.stringify(id)} must be refused`).toBe('string')
      expect(read.error).toMatch(/not a valid workspace id/)
      expect(read.workspaces).toEqual([])
      // And nothing downstream can name a path outside the root.
      expect(defaultWorkspace(root)).toBe(DEFAULT_WORKSPACE)
      expect(serversFile(root, defaultWorkspace(root)).startsWith(path.join(root, '.hh'))).toBe(true)
    }
  })

  it('still accepts every id shape the panel itself writes', () => {
    for (const id of ['default', 'a', 'my-ws', 'my_ws', 'ws2', 'a1-b2_c3']) {
      const root = makeHhHome(home(), { workspaces: [{ id, label: id }] })
      expect(readWorkspaces(root), `${JSON.stringify(id)} must be accepted`).toEqual({ workspaces: [{ id, label: id }], error: null })
      expect(defaultWorkspace(root)).toBe(id)
    }
  })

  it('reads an empty list as not-started-yet', () => {
    const root = makeHhHome(home(), { workspaces: [] })
    expect(readWorkspaces(root)).toEqual({ workspaces: [], error: null })
  })

  it('reports an unreadable registry instead of pretending it is empty', () => {
    const root = makeHhHome(home())
    fs.writeFileSync(workspacesFile(root), '{ not json', 'utf8')
    const read = readWorkspaces(root)
    expect(read.workspaces).toEqual([])
    expect(read.error).toContain('workspaces.json could not be parsed')
  })

  it('reports a file with no workspaces list', () => {
    const root = makeHhHome(home())
    writeJsonFile(workspacesFile(root), { something: 'else' })
    expect(readWorkspaces(root)).toMatchObject({ workspaces: [], error: expect.stringContaining('has no workspaces list') })
  })

  it('reports an entry without an id', () => {
    const root = makeHhHome(home())
    writeJsonFile(workspacesFile(root), { workspaces: [{ id: 'ok' }, { label: 'no id' }] })
    const read = readWorkspaces(root)
    expect(read.workspaces).toEqual([])
    expect(read.error).toContain('has an entry without an id')
  })

  it('falls an absent label back to the id', () => {
    const root = makeHhHome(home())
    writeJsonFile(workspacesFile(root), { workspaces: [{ id: 'alpha' }, { id: 'beta', label: 'Beta' }] })
    expect(readWorkspaces(root)).toEqual({
      workspaces: [{ id: 'alpha', label: 'alpha' }, { id: 'beta', label: 'Beta' }],
      error: null,
    })
  })
})

describe('the default workspace', () => {
  it('is `default` before any registry exists', () => {
    expect(defaultWorkspace(home())).toBe('default')
  })

  it('prefers the entry literally named `default`, wherever it sits', () => {
    const root = makeHhHome(home(), { workspaces: ['alpha', 'default', 'beta'] })
    expect(defaultWorkspace(root)).toBe('default')
  })

  it('falls back to the first workspace when none is called `default`', () => {
    const root = makeHhHome(home(), { workspaces: ['alpha', 'beta'] })
    expect(defaultWorkspace(root)).toBe('alpha')
  })

  it('is `default` when the list is empty', () => {
    const root = makeHhHome(home(), { workspaces: [] })
    expect(defaultWorkspace(root)).toBe('default')
  })
})

describe('recognising a root', () => {
  it('calls a `.hh` root current, never legacy', () => {
    const root = makeHhHome(home(), { workspaces: ['default'] })
    expect(isHhRoot(root)).toBe(true)
    expect(isLegacyRoot(root)).toBe(false)
    expect(migrationRefusal(root)).toBeNull()
  })

  it('counts global settings as a started 0.7 root, and a bare `.hh` as neither', () => {
    // `.hh/settings.json` alone is a started root; `workspaces.json` may follow.
    const started = makeHhHome(home(), { workspaces: null, settings: { control: { port: 3999 } } })
    expect(isHhRoot(started)).toBe(true)

    // A `.hh` directory that holds only a runtime has not been started on 0.7 yet.
    const runtimeOnly = home()
    fs.mkdirSync(path.join(runtimeOnly, '.hh'), { recursive: true })
    fs.writeFileSync(path.join(runtimeOnly, '.hh', 'run.json'), '{}\n', 'utf8')
    expect(isHhRoot(runtimeOnly)).toBe(false)
    expect(isLegacyRoot(runtimeOnly)).toBe(false)
    expect(migrationRefusal(runtimeOnly)).toBeNull()
  })

  it('calls a top-level pre-0.7 root legacy', () => {
    const root = makeLegacyHome(home(), { servers: [] })
    expect(isHhRoot(root)).toBe(false)
    expect(isLegacyRoot(root)).toBe(true)
  })

  it('recognises any of the pre-0.7 state files', () => {
    for (const name of ['servers.config.json', '.control-secrets.json', 'run.json', '.state']) {
      const root = home()
      if (name === '.state')
        fs.mkdirSync(path.join(root, '.state'), { recursive: true })
      else
        fs.writeFileSync(path.join(root, name), '{}\n', 'utf8')
      expect(isLegacyRoot(root), name).toBe(true)
    }
  })

  it('never calls a directory with only unrelated files a root', () => {
    const root = home()
    fs.mkdirSync(path.join(root, '.logs'), { recursive: true })
    expect(isHhRoot(root)).toBe(false)
    expect(isLegacyRoot(root)).toBe(false)
    expect(migrationRefusal(root)).toBeNull()
  })

  it('prefers `.hh` over any leftover top-level file', () => {
    const root = makeLegacyHome(home(), { servers: [] })
    makeHhHome(root)
    expect(isHhRoot(root)).toBe(true)
    expect(isLegacyRoot(root)).toBe(false)
    expect(migrationRefusal(root)).toBeNull()
  })
})

describe('the migration refusal', () => {
  it('names the root, the fix, and the non-interactive CLI', () => {
    const root = makeLegacyHome(home(), { servers: [] })
    const refusal = migrationRefusal(root)
    expect(refusal).toContain(root)
    expect(refusal).toContain('pre-0.7 layout')
    expect(refusal).toContain('Start the panel once on home-hosted 0.7')
    expect(refusal).toContain('.hh')
    expect(refusal).toContain(`home-hosted migrate --yes --home ${root}`)
  })

  it('is null for a root that has already moved', () => {
    const root = makeHhHome(home(), { workspaces: ['default'] })
    expect(migrationRefusal(root)).toBeNull()
  })

  it('refuses a bare top-level leftover, even one that is not adoptable', () => {
    const root = home()
    fs.writeFileSync(path.join(root, '.control-secrets.json'), '{}\n', 'utf8')
    expect(isLegacyRoot(root)).toBe(true)
    expect(migrationRefusal(root)).not.toBeNull()
  })
})
