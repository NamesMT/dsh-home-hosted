/**
 * The activation plan each mechanism hands the detached helper: the start steps
 * that prove an entry really starts the panel, the proof that guards them, and
 * the retirement a switch needs. Every call is faked; no OS entry is touched.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createLaunchdAgentProvider, createLaunchdDaemonProvider } from '../../src/boot/launchd.js'
import { createSystemdSystemProvider, createSystemdUserProvider } from '../../src/boot/systemd.js'
import { createWindowsRunProvider, createWindowsTaskProvider } from '../../src/boot/windows.js'
import { createXdgAutostartProvider } from '../../src/boot/xdg.js'
import { cleanup, ctxFor, fakeRun, spec, tempHome, winSpec } from './harness.js'

/**
 * A handler that answers `ActiveState` for the unit probe, so a start can be told
 * apart from a restart. Everything else succeeds.
 */
function activeUnit(active: boolean) {
  return (command: string, args: string[]) => {
    if (command === 'systemctl' && args.includes('show'))
      return { code: 0, stdout: `ActiveState=${active ? 'active' : 'inactive'}\n` }
    return { code: 0 }
  }
}

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
    // `Restart=always` is why the CLI's `down` alone loses the race on a switch,
    // and why it cannot be the page's Stop either: the unit brings the panel back.
    expect(await provider.stopCommands?.(spec())).toEqual({
      commands: [['systemctl', '--user', 'stop', 'home-hosted.service']],
      display: ['systemctl --user stop home-hosted.service'],
    })
  })

  it('retires a user unit without --now, so it cannot race the start', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    // Retirement only touches an artifact this plugin wrote, so the unit file has
    // to be there carrying the marker.
    const file = path.join(home, '.config', 'systemd', 'user', 'home-hosted.service')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, `# ${spec().marker}\n[Unit]\nDescription=x\n`, 'utf8')
    const retirement = await provider.retireCommands?.(spec())
    const flat = retirement?.commands.map(step => step.join(' ')) ?? []
    expect(flat.join('\n')).not.toContain('--now')
    expect(flat[0]).toBe('systemctl --user disable home-hosted.service')
    expect(flat.join('\n')).toContain('daemon-reload')
  })

  it('refuses to retire a unit of the same name that this plugin did not write', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const file = path.join(home, '.config', 'systemd', 'user', 'home-hosted.service')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    // `status()` reports a unit as installed from its name alone, so without the
    // marker check a switch would `disable` and delete somebody else's unit.
    fs.writeFileSync(file, '[Unit]\nDescription=somebody else\n', 'utf8')
    const retirement = await provider.retireCommands?.(spec())
    expect(retirement?.commands).toEqual([])
  })

  it('has nothing to retire when no unit file of ours exists at all', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    // The unit name can come from anywhere on systemd's search path; a name alone
    // is never proof that we may disable it.
    const retirement = await provider.retireCommands?.(spec())
    expect(retirement?.commands).toEqual([])
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
    const runner = fakeRun((command) => {
      if (command === 'launchctl')
        return { code: 0 }
      return { code: 0 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    expect(await provider.stopCommands?.(spec())).toEqual({
      commands: [['launchctl', 'kill', 'SIGTERM', 'gui/1000/dev.home-hosted.home-hosted']],
      display: ['launchctl kill SIGTERM gui/1000/dev.home-hosted.home-hosted'],
    })
  })

  it('offers no stop for a plist launchd has not loaded, so the CLI can stop it', async () => {
    // `status()` calls a written plist `enabled-running` even when launchd never
    // loaded it, and `kill` on an unknown label exits 113 — reporting a refusal
    // where the CLI's `down` would have worked.
    const runner = fakeRun((command, args) => {
      if (command === 'launchctl' && args[0] === 'print')
        return args[1] === 'gui/1000' ? { code: 0 } : { code: 113 }
      return { code: 0 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    expect(await provider.stopCommands?.(spec())).toBeNull()
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

  it('prints the agent\'s own unprivileged bootout, not the daemon form', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'launchctl' && args[0] === 'print')
        return args[1] === 'gui/1000' ? { code: 0 } : { code: 113 }
      return { code: 0 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const retirement = await provider.retireCommands?.(spec())
    // The display is what a person copies when the helper could not run, so it has
    // to be the command that actually runs: an agent's bootout needs no sudo and
    // names `gui/1000`, never `system/`.
    expect(retirement?.display.join('\n')).toContain('launchctl bootout gui/1000/dev.home-hosted.home-hosted')
    expect(retirement?.display.join('\n')).not.toContain('system/')
    expect(retirement?.display.join('\n')).not.toContain('sudo')
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

describe('the page\'s own panel start and stop', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  it('starts and stops the systemd user unit itself, never through the CLI', async () => {
    const runner = fakeRun(activeUnit(false))
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    // `Restart=always` turns a CLI `down` into a restart a few seconds later, and a
    // CLI `up` starts a panel the unit does not supervise. Both actions have to be
    // the unit's own, or the page reports a state the machine is not in.
    expect((await provider.stopCommands?.(spec()))?.commands)
      .toEqual([['systemctl', '--user', 'stop', 'home-hosted.service']])
    // Not running, so `start` — a `restart` here would be a needless stop of a
    // healthy panel when the `/healthz` probe merely timed out.
    expect((await provider.startCommands?.(spec()))?.commands)
      .toEqual([['systemctl', '--user', 'start', 'home-hosted.service']])
  })

  it('restarts an active unit, because `start` is a no-op on the panel a slow probe hid', async () => {
    const runner = fakeRun(activeUnit(true))
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    // The panel answers nothing within the probe's 2 s but is still active: only a
    // restart recovers it, and only the unit's own state can tell that apart from
    // "stopped", so the verb is chosen from `ActiveState`.
    expect((await provider.startCommands?.(spec()))?.commands)
      .toEqual([['systemctl', '--user', 'restart', 'home-hosted.service']])
  })

  it('elevates a system unit\'s start and stop with sudo -n, and not when already root', async () => {
    const runner = fakeRun(activeUnit(false))
    const elevated = createSystemdSystemProvider(ctxFor({
      home,
      run: runner.run,
      sudo: async () => true,
      exists: file => file === '/run/systemd/system',
    }))
    expect((await elevated.stopCommands?.(spec()))?.commands).toEqual([['sudo', '-n', 'systemctl', 'stop', 'home-hosted.service']])
    // The display is what a person runs when the call could not elevate itself.
    expect((await elevated.startCommands?.(spec()))?.display).toEqual(['sudo systemctl start home-hosted.service'])

    // As root there is nothing to elevate — asserted for the start too, or putting
    // `sudo -n` back into the root start would still pass.
    const rootRunner = fakeRun(activeUnit(true))
    const root = createSystemdSystemProvider(ctxFor({ home, run: rootRunner.run, isRoot: true, exists: file => file === '/run/systemd/system' }))
    expect((await root.stopCommands?.(spec()))?.commands).toEqual([['systemctl', 'stop', 'home-hosted.service']])
    expect((await root.startCommands?.(spec()))?.commands).toEqual([['systemctl', 'restart', 'home-hosted.service']])
  })

  it('refuses to command a unit systemd loaded from a file we did not write', async () => {
    // `status()` proves a unit exists, not who wrote it, and `home-hosted` is the
    // name a machine-default install uses. `FragmentPath` is what systemd actually
    // loaded, so it catches a distro unit found elsewhere on the search path too.
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('show'))
        return { code: 0, stdout: 'FragmentPath=/etc/systemd/system/home-hosted.service\nActiveState=active\n' }
      return { code: 0 }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    expect(await provider.stopCommands?.(spec())).toBeNull()
    expect(await provider.startCommands?.(spec())).toBeNull()
  })

  it('has no start for a launchd job launchd does not have loaded', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'launchctl' && args[0] === 'print')
        return args[1] === 'gui/1000' ? { code: 0 } : { code: 113 }
      return { code: 0 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    // `kickstart` on an unloaded label fails; claiming a start would be a fiction,
    // so the caller falls back to the CLI.
    expect(await provider.startCommands?.(spec())).toBeNull()
  })

  it('kickstarts a loaded launchd job with -k, so a wedged job is restarted', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    // Plain `kickstart` leaves a running job alone, and `KeepAlive` means a wedged
    // job is still running — so without `-k` the Start button could not recover the
    // panel. The activation plan uses `-k` for the same reason.
    expect((await provider.startCommands?.(spec()))?.commands)
      .toEqual([['launchctl', 'kickstart', '-k', 'gui/1000/dev.home-hosted.home-hosted']])
  })

  it('starts a scheduled task and leaves stopping it to the CLI, which is graceful', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createWindowsTaskProvider(ctxFor({ home, run: runner.run, platform: 'win32' }))
    expect((await provider.startCommands?.(winSpec()))?.commands).toEqual([['schtasks.exe', '/Run', '/TN', 'home-hosted']])
    // `schtasks /End` kills the tree instead of asking the panel to shut down, so
    // the servers it supervises would be killed without their stop policy running.
    expect(await provider.stopCommands?.(winSpec())).toBeNull()
  })

  it('claims neither action for mechanisms the session reads at login', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    // A `.desktop` file and a `Run` value are read by the session at login: nothing
    // there can be told to start or stop anything, so they offer no method at all —
    // `?? null` is the ladder's own reading of the absent method.
    const xdg = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))
    expect(await xdg.startCommands?.(spec()) ?? null).toBeNull()
    expect(await xdg.stopCommands?.(spec()) ?? null).toBeNull()
    const run = createWindowsRunProvider(ctxFor({ home, run: runner.run, platform: 'win32' }))
    expect(await run.startCommands?.(winSpec()) ?? null).toBeNull()
    expect(await run.stopCommands?.(winSpec()) ?? null).toBeNull()
  })
})
