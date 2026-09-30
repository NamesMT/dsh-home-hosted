/**
 * The activation plan each mechanism hands the detached helper: the start steps
 * that prove an entry really starts the panel, the proof that guards them, and
 * the retirement a switch needs. Every call is faked; no OS entry is touched.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import path from 'node:path'
import { createLaunchdAgentProvider, createLaunchdDaemonProvider } from '../../src/boot/launchd.js'
import { createSystemdSystemProvider, createSystemdUserProvider } from '../../src/boot/systemd.js'
import { createWindowsRunProvider, createWindowsTaskProvider } from '../../src/boot/windows.js'
import { createXdgAutostartProvider } from '../../src/boot/xdg.js'
import { cleanup, ctxFor, fakeRun, spec, tempHome, winSpec } from './harness.js'

describe('systemd activation', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  it('proves the user unit is installed and enabled, never that it is already active', async () => {
    const runner = fakeRun(() => ({ code: 0, stdout: 'active\n' }))
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const plan = await provider.activate?.(spec())
    expect(plan).not.toBeNull()
    expect(plan?.commands).toEqual([['systemctl', '--user', 'restart', 'home-hosted.service']])
    // The proof runs before anything is stopped, never after.
    expect(plan?.requires.commands).toEqual([['systemctl', '--user', 'is-enabled', 'home-hosted.service']])
    // `enable --now` started the unit while the panel still holds `run.json`, and
    // home-hosted refuses a second panel, so the unit is activating/failed at the
    // one moment this plan runs. `is-active` would refuse every handover.
    expect(plan?.requires.commands.flat().join(' ')).not.toContain('is-active')
    // The entry's own file is the other proof that it is really installed.
    expect(plan?.requires.files).toEqual([path.join(home, '.config', 'systemd', 'user', 'home-hosted.service')])
    expect(plan?.display.join('\n')).toContain('systemctl --user restart home-hosted.service')
  })

  it('goes through sudo -n for a system unit when this process is not root', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createSystemdSystemProvider(ctxFor({
      home,
      run: runner.run,
      sudo: async () => true,
      exists: file => file === '/run/systemd/system',
    }))
    const plan = await provider.activate?.(spec())
    expect(plan?.commands).toEqual([['sudo', '-n', 'systemctl', 'restart', 'home-hosted.service']])
    expect(plan?.requires.commands).toEqual([['sudo', '-n', 'systemctl', 'is-enabled', 'home-hosted.service']])
    expect(plan?.requires.files).toEqual(['/etc/systemd/system/home-hosted.service'])
  })

  it('runs systemctl directly when it is already root, never through sudo', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createSystemdSystemProvider(ctxFor({
      home,
      run: runner.run,
      isRoot: true,
      exists: file => file === '/run/systemd/system',
    }))
    const plan = await provider.activate?.(spec())
    expect(plan?.commands).toEqual([['systemctl', 'restart', 'home-hosted.service']])
    expect(plan?.requires.commands.flat().join(' ')).not.toContain('sudo')
  })

  it('stops the panel the unit supervises, without disabling the unit', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    // `Restart=always` is why the CLI's `down` alone loses the race on a switch.
    expect(await provider.stopCommands?.(spec())).toEqual([['systemctl', '--user', 'stop', 'home-hosted.service']])
  })

  it('retires a user unit without --now, so it cannot race the start', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const retirement = await provider.retireCommands?.(spec())
    const flat = retirement?.commands.map(step => step.join(' ')) ?? []
    expect(flat.join('\n')).not.toContain('--now')
    expect(flat[0]).toBe('systemctl --user disable home-hosted.service')
    expect(flat.join('\n')).toContain('daemon-reload')
  })
})

describe('xdg activation', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  it('has no way to start the panel, so it says so instead of pretending', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))
    expect(await provider.activate?.(spec())).toBeNull()
  })

  it('retires its own file', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))
    const retirement = await provider.retireCommands?.(spec())
    expect(retirement?.commands[0]?.join(' ')).toContain('rm -f')
    expect(retirement?.commands[0]?.join(' ')).toContain('autostart/home-hosted.desktop')
  })
})

describe('launchd activation', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  it('loads then kickstarts an unloaded agent', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'launchctl' && args[0] === 'print')
        return args[1] === 'gui/1000' ? { code: 0 } : { code: 113 }
      return { code: 0 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const plan = await provider.activate?.(spec())
    expect(plan?.commands).toEqual([
      ['launchctl', 'bootstrap', 'gui/1000', `${home}/Library/LaunchAgents/dev.home-hosted.home-hosted.plist`],
      ['launchctl', 'kickstart', '-k', 'gui/1000/dev.home-hosted.home-hosted'],
    ])
    // The plist has to exist before launchctl is asked to load it.
    expect(plan?.requires.files).toEqual([`${home}/Library/LaunchAgents/dev.home-hosted.home-hosted.plist`])
  })

  it('skips the load when the label is already booted', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'launchctl' && args[0] === 'print' && args[1] === 'gui/1000/dev.home-hosted.home-hosted')
        return { code: 0 }
      if (command === 'launchctl' && args[0] === 'print')
        return args[1] === 'gui/1000' ? { code: 0 } : { code: 113 }
      return { code: 0 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const plan = await provider.activate?.(spec())
    expect(plan?.commands).toEqual([['launchctl', 'kickstart', '-k', 'gui/1000/dev.home-hosted.home-hosted']])
  })

  it('kills the job under the previous entry, so KeepAlive cannot revive it', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'launchctl' && args[0] === 'print')
        return args[1] === 'gui/1000' ? { code: 0 } : { code: 113 }
      return { code: 0 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    expect(await provider.stopCommands?.(spec()))
      .toEqual([['launchctl', 'kill', 'SIGTERM', 'gui/1000/dev.home-hosted.home-hosted']])
  })

  it('boots out a daemon through sudo -n, never a bare launchctl', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createLaunchdDaemonProvider(ctxFor({
      home,
      run: runner.run,
      platform: 'darwin',
      sudo: async () => true,
    }))
    const retirement = await provider.retireCommands?.(spec())
    expect(retirement?.commands.flat().join(' ')).toContain('sudo -n launchctl bootout system/dev.home-hosted.home-hosted')
  })
})

describe('windows activation', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  it('has no way to run a Run-key value now, and does not pretend otherwise', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createWindowsRunProvider(ctxFor({ home, run: runner.run, platform: 'win32' }))
    expect(await provider.activate?.(winSpec())).toBeNull()
  })

  it('runs a scheduled task once the query proves it is registered', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'powershell.exe' && args.includes('Register-ScheduledTask'))
        return { code: 0, stdout: 'Register-ScheduledTask\n' }
      return { code: 0 }
    })
    const provider = createWindowsTaskProvider(ctxFor({ home, run: runner.run, platform: 'win32' }))
    const plan = await provider.activate?.(winSpec())
    expect(plan?.commands).toEqual([['schtasks.exe', '/Run', '/TN', 'home-hosted']])
    expect(plan?.requires.commands).toEqual([['schtasks.exe', '/Query', '/TN', 'home-hosted']])
  })

  it('retires the Run value and its marker together', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createWindowsRunProvider(ctxFor({ home, run: runner.run, platform: 'win32' }))
    const retirement = await provider.retireCommands?.(winSpec())
    const flat = retirement?.commands.map(step => step.join(' ')) ?? []
    expect(flat[0]).toContain('reg.exe delete')
    expect(flat[0]).toContain('CurrentVersion\\Run')
    expect(flat[1]).toContain('Software\\home-hosted')
  })
})
