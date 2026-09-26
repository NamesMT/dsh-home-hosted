import { Context } from '@deepseek-ai/cordis'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { BootStatus } from '../src/shared/contracts.js'
import type { BootSpec } from '../src/boot/types.js'
import { HomeHostedService } from '../src/service.js'
import type { BootInstallResult, BootLadderLike } from '../src/service.js'
import { SettingsStore } from '../src/settings.js'
import { launcherPath } from '../src/home-hosted/launcher.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

function statusWith(overrides: Partial<BootStatus>): BootStatus {
  return {
    platform: 'linux',
    mechanism: 'systemd-user',
    recommended: 'systemd-user',
    state: 'not-installed',
    bootCapable: false,
    privileged: false,
    unitPath: null,
    commands: [],
    detail: 'stub',
    candidates: [],
    ...overrides,
  }
}

interface Harness {
  service: HomeHostedService
  installs: number[]
  unitPath: string
  state: string
  fakeCli: string
  specs: BootSpec[]
  settings: SettingsStore
}

/**
 * `make` receives the path a file-backed entry would live at; the file is only
 * written when `unitFile: true`, so a test can describe "reported installed, but
 * nothing on disk".
 */
function harness(make: (unitPath: string) => BootStatus, options: { unitFile?: boolean, enabled?: boolean, installFails?: boolean } = {}): Harness {
  scratch = tempDir()
  const home = path.join(scratch.path, 'home')
  const state = path.join(scratch.path, 'state')
  fs.mkdirSync(home, { recursive: true })
  fs.mkdirSync(state, { recursive: true })

  const fakeCli = path.join(scratch.path, 'home-hosted.mjs')
  fs.writeFileSync(fakeCli, '#!/usr/bin/env node\n', 'utf8')

  const unitPath = path.join(scratch.path, 'home-hosted.service')
  if (options.unitFile === true)
    fs.writeFileSync(unitPath, 'unit', 'utf8')
  const status = make(unitPath)

  const installs: number[] = []
  const specs: BootSpec[] = []
  const ladder: BootLadderLike = {
    status: async () => status,
    install: async (spec: BootSpec): Promise<BootInstallResult> => {
      installs.push(Date.now())
      specs.push(spec)
      if (options.installFails === true) {
        return { ok: false, changed: false, detail: 'launchd refused to load the agent', commands: ['sudo launchctl bootstrap system /x.plist'], needsPrivilege: true, status }
      }
      return { ok: true, changed: true, detail: 'repaired', commands: [], needsPrivilege: false, mechanism: 'systemd-user', status }
    },
    uninstall: async (): Promise<BootInstallResult> => ({ ok: true, changed: true, detail: 'removed', commands: [], needsPrivilege: false, status }),
  }

  const settings = new SettingsStore(path.join(state, 'settings.json'), 'dsh')
  settings.update({ autostart: { enabled: options.enabled ?? true, mechanism: 'auto' } })
  const service = new HomeHostedService(new Context(), {
    home,
    stateDir: state,
    homeHostedCommand: fakeCli,
    defaultEntryId: 'dsh',
    settings,
    createLadder: () => ladder,
  })

  return { service, installs, unitPath, state, fakeCli, specs, settings }
}

describe('startup reconcile', () => {
  it('does nothing while autostart is off', async () => {
    const { service, installs } = harness(unit => statusWith({ state: 'enabled-failing', unitPath: unit }), { enabled: false, unitFile: true })
    await service.reconcile()
    expect(installs).toHaveLength(0)
  })

  it('never installs an entry that is not there', async () => {
    const { service, installs } = harness(unit => statusWith({ state: 'not-installed', mechanism: null, unitPath: unit }))
    await service.reconcile()
    expect(installs).toHaveLength(0)
  })

  it('refuses to trust a state that claims an installed unit with no file', async () => {
    const { service, installs } = harness(unit => statusWith({ state: 'installed-disabled', mechanism: 'systemd-user', unitPath: unit }))
    await service.reconcile()
    expect(installs).toHaveLength(0)
  })

  it('repairs an installed entry that stopped working', async () => {
    const { service, installs } = harness(unit => statusWith({ state: 'enabled-failing', mechanism: 'systemd-user', unitPath: unit }), { unitFile: true })
    await service.reconcile()
    expect(installs).toHaveLength(1)
  })

  it('leaves a healthy entry alone', async () => {
    const { service, installs } = harness(unit => statusWith({ state: 'enabled-running', mechanism: 'systemd-user', unitPath: unit }), { unitFile: true })
    await service.reconcile()
    expect(installs).toHaveLength(0)
  })
})

describe('boot entry target', () => {
  it('runs the stable launcher instead of the moving dependency path', async () => {
    const { service, specs, state, fakeCli } = harness(unit => statusWith({ state: 'not-installed', mechanism: null, unitPath: unit }))
    await service.installBoot()

    const spec = specs[0]
    expect(spec).toBeDefined()
    const launcher = launcherPath(state)

    if (process.platform === 'win32') {
      expect(spec!.command).toBe(process.execPath)
      expect(spec!.args[0]).toBe(launcher)
    }
    else {
      expect(spec!.command).toBe(launcher)
    }
    // The pinned/configured CLI entry is not baked into the entry, so a moved
    // node_modules path cannot break boot.
    expect(spec!.args).not.toContain(fakeCli)
    expect(spec!.args).toEqual(expect.arrayContaining(['up', '--foreground']))
  })
})

describe('boot attempts', () => {
  it('records a failed install so the page can explain it after a reload', async () => {
    const { service, settings } = harness(unit => statusWith({ state: 'not-installed', mechanism: null, unitPath: unit }), { installFails: true, enabled: false })
    const answer = await service.installBoot() as { result: { ok: boolean, commands: string[] } }
    expect(answer.result.ok).toBe(false)

    const attempt = settings.get().autostart.lastAttempt
    expect(attempt).toMatchObject({ ok: false, action: 'install' })
    expect(attempt?.detail).toContain('launchd refused')
    expect(attempt?.commands).toEqual(['sudo launchctl bootstrap system /x.plist'])
    // A failure must not claim the feature is on.
    expect(settings.get().autostart.enabled).toBe(false)
    // And it survives a reload of the store.
    expect(new SettingsStore(settings.file, 'dsh').get().autostart.lastAttempt?.ok).toBe(false)
  })

  it('records a successful install and turns the preference on', async () => {
    const { service, settings } = harness(unit => statusWith({ state: 'not-installed', mechanism: null, unitPath: unit }))
    await service.installBoot()
    expect(settings.get().autostart.enabled).toBe(true)
    expect(settings.get().autostart.lastAttempt).toMatchObject({ ok: true, action: 'install' })
  })
})
