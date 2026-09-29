import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { bootUnitName, resolveHomeHostedHome } from '../src/util/paths.js'
import { makeHhHome } from './helpers/hh.js'
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

  it('resolves a configured path against the home, never the cwd', () => {
    const { state, home } = roots()
    // A relative value must mean the same thing however the process was started.
    expect(resolveHomeHostedHome(state, { HHOSTED_HOME: 'hh' }, home).home).toBe(path.join(home, 'hh'))
    expect(resolveHomeHostedHome(state, { HHOSTED_HOME: '~/hh' }, home).home).toBe(path.join(home, 'hh'))
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

  it('never adopts the machine-wide panel for a home that has not run this plugin', () => {
    const { state, home } = roots()
    const legacy = path.join(home, '.home-hosted')
    writeJsonFile(path.join(legacy, 'servers.config.json'), { servers: [] })
    // A scratch `DSH_HOME` or a test project: its own root, not somebody else's
    // panel — reaching over would edit a config this instance was never given.
    expect(resolveHomeHostedHome(state, {}, home)).toEqual({ home: path.join(state, 'panel'), source: 'instance' })

    // A home that already uses its own root never trades it for the machine one.
    fs.mkdirSync(path.join(state, 'panel'), { recursive: true })
    writeJsonFile(path.join(state, 'settings.json'), { version: 1 })
    expect(resolveHomeHostedHome(state, {}, home)).toEqual({ home: path.join(state, 'panel'), source: 'instance' })

    // Only a home with no root of its own, that has run before, adopts it.
    fs.rmSync(path.join(state, 'panel'), { recursive: true, force: true })
    expect(resolveHomeHostedHome(state, {}, home)).toEqual({ home: legacy, source: 'legacy' })

    // An install whose state dir is the machine default adopts it either way.
    const machine = path.join(home, '.dsh', 'dsh-home-hosted')
    expect(resolveHomeHostedHome(machine, {}, home)).toEqual({ home: legacy, source: 'legacy' })
  })

  it('adopts a machine-wide panel that is really there, not a directory that merely exists', () => {
    const { state, home } = roots()
    const legacy = path.join(home, '.home-hosted')
    // A 0.7 root counts through its registry or global settings, not a bare dir.
    makeHhHome(legacy, { workspaces: ['default'] })
    // Established by its own settings, so the machine-wide panel is its to keep.
    writeJsonFile(path.join(state, 'settings.json'), { version: 1 })
    expect(resolveHomeHostedHome(state, {}, home)).toEqual({ home: legacy, source: 'legacy' })

    // A pre-0.7 root with a real servers config is a panel too.
    fs.rmSync(path.join(legacy, '.hh'), { recursive: true, force: true })
    writeJsonFile(path.join(legacy, 'servers.config.json'), { servers: [] })
    expect(resolveHomeHostedHome(state, {}, home).source).toBe('legacy')

    // A `run.json` alone survives a crash, so a dead pid is not a panel.
    fs.rmSync(path.join(legacy, 'servers.config.json'))
    const dead = spawnSync(process.execPath, ['-e', '']).pid
    writeJsonFile(path.join(legacy, 'run.json'), { pid: dead })
    expect(resolveHomeHostedHome(state, {}, home).source).toBe('instance')

    // The same file with a live pid is a panel somebody is running.
    writeJsonFile(path.join(legacy, 'run.json'), { pid: process.pid })
    expect(resolveHomeHostedHome(state, {}, home).source).toBe('legacy')

    // A directory that merely exists is never adopted, and a bare top-level
    // leftover is not either: `isLegacyRoot` still lists it so migration runs,
    // but the adoption rule deliberately wants a config or a live runtime.
    fs.rmSync(path.join(legacy, 'run.json'))
    fs.mkdirSync(path.join(legacy, '.logs'), { recursive: true })
    expect(resolveHomeHostedHome(state, {}, home).source).toBe('instance')
    writeJsonFile(path.join(legacy, '.control-secrets.json'), { version: 2 })
    expect(resolveHomeHostedHome(state, {}, home).source).toBe('instance')
  })
})

describe('the boot artifact one state root owns', () => {
  it('keeps the historical name only for the machine-wide default', () => {
    const machineDefault = path.join(os.homedir(), '.dsh', 'dsh-home-hosted')
    expect(bootUnitName(machineDefault)).toBe('home-hosted')
    expect(bootUnitName(undefined as unknown as string)).toBe('home-hosted')
  })

  it('never gives two differently-homed installs the same artifact', () => {
    // The reported collision: each install's state dir is the default for *its*
    // own `$DSH_HOME`, so keying on the running process's env would name both
    // `home-hosted` and let one overwrite the other.
    const first = path.join(os.homedir(), '.dsh-a', 'dsh-home-hosted')
    const second = path.join(os.homedir(), '.dsh-b', 'dsh-home-hosted')
    expect(bootUnitName(first)).toMatch(/^home-hosted-[0-9a-f]{8}$/)
    expect(bootUnitName(second)).toMatch(/^home-hosted-[0-9a-f]{8}$/)
    expect(bootUnitName(first)).not.toBe(bootUnitName(second))
    expect(bootUnitName(first)).toBe(bootUnitName(first))
  })
})
