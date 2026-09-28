import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { bootUnitName, pluginStateDir, resolveHomeHostedHome } from '../src/util/paths.js'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

/** A state root and a user home, both inside one temp dir. */
function roots(): { state: string, home: string } {
  scratch = tempDir()
  return { state: path.join(scratch.path, 'dsh-home-hosted'), home: path.join(scratch.path, 'user') }
}

describe('which panel root one plugin instance drives', () => {
  it('takes an explicit HHOSTED_HOME as an instruction', () => {
    const { state, home } = roots()
    const chosen = resolveHomeHostedHome(state, { HHOSTED_HOME: path.join(scratch!.path, 'elsewhere') }, home)
    expect(chosen).toEqual({ home: path.join(scratch!.path, 'elsewhere'), source: 'env' })
  })

  it('gives this instance its own root when this machine has no panel yet', () => {
    const { state, home } = roots()
    expect(resolveHomeHostedHome(state, {}, home)).toEqual({
      home: path.join(state, 'panel'),
      source: 'instance',
    })
    // A second dsh install, a second state root: never the same panel.
    const other = path.join(scratch!.path, 'other-state')
    expect(resolveHomeHostedHome(other, {}, home).home).not.toBe(path.join(state, 'panel'))
  })

  it('adopts an existing ~/.home-hosted panel instead of abandoning it', () => {
    const { state, home } = roots()
    const legacy = path.join(home, '.home-hosted')
    writeJsonFile(path.join(legacy, 'servers.config.json'), { servers: [] })
    expect(resolveHomeHostedHome(state, {}, home)).toEqual({ home: legacy, source: 'legacy' })
    // An empty directory is not a panel: a fresh install still gets its own.
    fs.rmSync(legacy, { recursive: true, force: true })
    fs.mkdirSync(legacy, { recursive: true })
    expect(resolveHomeHostedHome(state, {}, home).source).toBe('instance')
  })
})

describe('the boot artifact one state root owns', () => {
  it('keeps the historical name for the default state root', () => {
    expect(bootUnitName(pluginStateDir())).toBe('home-hosted')
    expect(bootUnitName(undefined as unknown as string)).toBe('home-hosted')
  })

  it('names a distinct artifact per state root, deterministically', () => {
    const first = bootUnitName('/home/me/.dsh-a/dsh-home-hosted')
    const second = bootUnitName('/home/me/.dsh-b/dsh-home-hosted')
    expect(first).not.toBe(second)
    expect(first).toBe(bootUnitName('/home/me/.dsh-a/dsh-home-hosted'))
    expect(first).toMatch(/^home-hosted-[0-9a-f]{8}$/)
  })
})
