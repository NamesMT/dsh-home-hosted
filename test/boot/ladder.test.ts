import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBootLadder } from '../../src/boot/ladder.js'
import type { FakeHandler } from './harness.js'
import { cleanup, fakeRun, spec, tempHome } from './harness.js'

/** A machine with a working systemd user manager and linger on. */
function systemdHandler(): FakeHandler {
  return (command, args) => {
    if (command === 'systemctl') {
      if (args.includes('is-system-running'))
        return { code: 0, stdout: 'running\n' }
      if (args.includes('is-enabled'))
        return { code: 4, stderr: 'Unit could not be found.\n' }
      return { code: 0, stdout: '' }
    }
    if (command === 'loginctl')
      return { code: 0, stdout: 'Linger=yes\n' }
    return { code: 0 }
  }
}

/** A machine with no user manager at all. */
function noSystemdHandler(): FakeHandler {
  return (command, args) => {
    if (command === 'systemctl' && args.includes('is-system-running'))
      return { code: 1, stderr: 'Failed to connect to user scope bus\n' }
    if (command === 'systemctl' && args.includes('is-enabled'))
      return { code: 4, stderr: 'Unit could not be found.\n' }
    if (command === 'loginctl')
      return { code: 0, stdout: 'Linger=no\n' }
    return { code: 0 }
  }
}

describe('ladder selection', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  it('orders the providers per platform', () => {
    const linux = createBootLadder({ platform: 'linux', home, run: fakeRun().run, exists: () => false })
    expect(linux.providers.map(provider => provider.mechanism)).toEqual([
      'systemd-user',
      'systemd-system',
      'xdg-autostart',
      'container',
      'unsupported',
    ])
    const darwin = createBootLadder({ platform: 'darwin', home, run: fakeRun().run, exists: () => false })
    expect(darwin.providers.map(provider => provider.mechanism)).toEqual(['launchd-agent', 'launchd-daemon', 'unsupported'])
    const win = createBootLadder({ platform: 'win32', home, run: fakeRun().run, exists: () => false })
    expect(win.providers.map(provider => provider.mechanism)).toEqual(['windows-run', 'windows-task', 'unsupported'])
  })

  it('recommends systemd-user on Linux when linger is on', async () => {
    const runner = fakeRun(systemdHandler())
    const ladder = createBootLadder({
      platform: 'linux',
      home,
      env: { USER: 'mt', UID: '1000' },
      run: runner.run,
      sudo: async () => false,
      exists: file => file === '/run/systemd/system',
    })
    const detected = await ladder.detect()
    expect(detected.platform).toBe('linux')
    const status = await ladder.status(spec())
    expect(status.recommended).toBe('systemd-user')
    expect(status.mechanism).toBeNull()
    expect(status.state).toBe('not-installed')
    expect(status.bootCapable).toBe(true)
    const systemdUser = status.candidates.find(candidate => candidate.mechanism === 'systemd-user')
    expect(systemdUser?.available).toBe(true)
    expect(systemdUser?.bootCapable).toBe(true)
  })

  it('falls back to xdg-autostart without systemd', async () => {
    const runner = fakeRun(noSystemdHandler())
    const ladder = createBootLadder({
      platform: 'linux',
      home,
      env: { USER: 'mt', UID: '1000' },
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
    const status = await ladder.status(spec())
    expect(status.recommended).toBe('xdg-autostart')
    expect(status.bootCapable).toBe(false)
    expect(status.candidates.find(candidate => candidate.mechanism === 'systemd-user')?.available).toBe(false)
    expect(status.candidates.find(candidate => candidate.mechanism === 'systemd-system')?.available).toBe(false)
  })

  it('keeps mechanism null and describes the recommendation when nothing is installed', async () => {
    // The real host: no user bus, but sudo is available, so a system unit is the boot-capable pick.
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-system-running'))
        return { code: 1, stderr: 'Failed to connect to user scope bus' }
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 1, stderr: 'Failed to get unit file state for home-hosted.service: No such file or directory' }
      if (command === 'systemctl')
        return { code: 1, stderr: 'Failed to connect to user scope bus', stdout: '' }
      if (command === 'loginctl')
        return { code: 1, stderr: 'Failed to connect to user scope bus' }
      return { code: 1 }
    })
    const ladder = createBootLadder({
      platform: 'linux',
      home,
      env: { USER: 'mt', UID: '1000' },
      run: runner.run,
      sudo: async () => true,
      exists: file => file === '/run/systemd/system',
    })
    const status = await ladder.status(spec())
    expect(status.mechanism).toBeNull()
    expect(status.state).toBe('not-installed')
    expect(status.recommended).toBe('systemd-system')
    expect(status.bootCapable).toBe(true)
    expect(status.privileged).toBe(true)
    expect(status.unitPath).toBe('/etc/systemd/system/home-hosted.service')
  })

  it('refuses to install inside a container and points at the restart policy', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-system-running'))
        return { code: 1, stderr: 'Failed to connect to user scope bus\n' }
      return { code: 4 }
    })
    const ladder = createBootLadder({
      platform: 'linux',
      home,
      env: { USER: 'mt', UID: '1000' },
      run: runner.run,
      sudo: async () => false,
      exists: file => file === '/.dockerenv',
    })
    const status = await ladder.status(spec())
    expect(status.recommended).toBe('container')
    expect(status.state).toBe('unsupported')
    expect(status.detail).toMatch(/restart policy/)

    const installed = await ladder.install(spec())
    expect(installed.ok).toBe(false)
    expect(installed.mechanism).toBeNull()
    expect(installed.detail).toMatch(/restart policy/)
  })

  it('recommends a LaunchAgent on darwin', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'launchctl' && args[0] === 'print')
        return { code: args[1] === 'gui/1000' ? 0 : 113 }
      return { code: 0 }
    })
    const ladder = createBootLadder({
      platform: 'darwin',
      home,
      env: { USER: 'mt', UID: '1000' },
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
    const status = await ladder.status(spec())
    expect(status.platform).toBe('darwin')
    expect(status.recommended).toBe('launchd-agent')
    expect(status.bootCapable).toBe(false)
  })

  it('recommends the Run key on win32', async () => {
    const runner = fakeRun(() => ({ code: 1 }))
    const ladder = createBootLadder({
      platform: 'win32',
      home,
      env: { USER: 'mt', LOCALAPPDATA: path.join(home, 'AppData', 'Local') },
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
    const status = await ladder.status(spec())
    expect(status.platform).toBe('win32')
    expect(status.recommended).toBe('windows-run')
    expect(status.state).toBe('not-installed')
  })

  it('reports an unknown platform as unsupported', async () => {
    const runner = fakeRun()
    const ladder = createBootLadder({ platform: 'freebsd', home, run: runner.run, exists: () => false })
    const status = await ladder.status(spec())
    expect(status.platform).toBe('other')
    expect(status.recommended).toBe('unsupported')
    expect(status.state).toBe('unsupported')
    const installed = await ladder.install(spec())
    expect(installed.ok).toBe(false)
    expect(installed.detail).toMatch(/no boot mechanism/)
  })
})

describe('ladder install and uninstall', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  function ladderFor(home: string) {
    const runner = fakeRun(noSystemdHandler())
    return {
      runner,
      ladder: createBootLadder({
        platform: 'linux',
        home,
        env: { USER: 'mt', UID: '1000' },
        run: runner.run,
        sudo: async () => false,
        exists: () => false,
      }),
    }
  }

  it('installs the recommended mechanism and reports it in the status', async () => {
    const { ladder } = ladderFor(home)
    const result = await ladder.install(spec())
    expect(result.ok).toBe(true)
    expect(result.mechanism).toBe('xdg-autostart')
    expect(result.status.mechanism).toBe('xdg-autostart')
    expect(result.status.state).toBe('enabled-running')
    expect(fs.existsSync(path.join(home, '.config', 'autostart', 'home-hosted.desktop'))).toBe(true)

    const uninstalled = await ladder.uninstall(spec())
    expect(uninstalled.ok).toBe(true)
    expect(uninstalled.status.mechanism).toBeNull()
    expect(uninstalled.status.state).toBe('not-installed')
    expect(fs.existsSync(path.join(home, '.config', 'autostart', 'home-hosted.desktop'))).toBe(false)
  })

  it('honours an explicit mechanism', async () => {
    const { ladder } = ladderFor(home)
    const result = await ladder.install(spec(), 'xdg-autostart')
    expect(result.mechanism).toBe('xdg-autostart')
    const status = await ladder.status(spec(), 'xdg-autostart')
    expect(status.state).toBe('enabled-running')
    expect(status.mechanism).toBe('xdg-autostart')
  })

  it('reports nothing to uninstall when no mechanism is installed', async () => {
    const { ladder } = ladderFor(home)
    const result = await ladder.uninstall(spec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(false)
    expect(result.detail).toMatch(/nothing to uninstall/)
  })
})
