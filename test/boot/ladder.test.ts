import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBootLadder } from '../../src/boot/ladder.js'
import type { FakeHandler } from './harness.js'
import { cleanup, fakeRun, spec, tempHome, TEST_PASSWD, winSpec } from './harness.js'

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
    expect(win.providers.map(provider => provider.mechanism)).toEqual(['windows-run', 'windows-task', 'windows-boot', 'unsupported'])
  })

  it('recommends systemd-user on Linux when linger is on', async () => {
    const runner = fakeRun(systemdHandler())
    const ladder = createBootLadder({
      platform: 'linux',
      home,
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
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
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
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
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
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

  /**
   * Container detection through the `container=` environment marker — the branch that IS
   * part of the `ctx` seam, and the one a runtime without a marker file relies on.
   *
   * The cgroup branch cannot be driven from a test at all: it calls `readText` from
   * `util/fsx` on the literal path `/proc/1/cgroup`, and neither the path nor the reader is
   * injectable, so a test would read this machine's real cgroup. That is worth knowing —
   * the branch is reachable only on a host whose cgroup v1 path happens to mention one of
   * four substrings, against the real reading a Docker container reports (`0::/`).
   *
   * Both directions here: the marker makes a container, and its absence does not.
   */
  it('reads the container environment marker, and only when it is set', async () => {
    const withEnv = (container?: string) => createBootLadder({
      platform: 'linux',
      home,
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000', ...(container === undefined ? {} : { container }) },
      uid: 1000,
      run: fakeRun(() => ({ code: 4 })).run,
      sudo: async () => false,
      // No marker files: the env branch is the one under test.
      exists: () => false,
    })

    for (const marker of ['docker', 'podman', '  lxc  ', 'kubepods']) {
      const status = await withEnv(marker).status(spec())
      expect(status.recommended, `container=${marker} should read as a container`).toBe('container')
      expect(status.detail).toMatch(/restart policy/)
    }

    // Absent, and the whitespace-only value that must not count as a container.
    for (const marker of [undefined, '', '   ']) {
      const status = await withEnv(marker).status(spec())
      expect(status.recommended, `container=${JSON.stringify(marker)} is not a container`).not.toBe('container')
    }
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
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
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
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      // A non-root process with no passwordless sudo: the state the LaunchAgent
      // recommendation exists for, and not a fact about the machine running this.
      uid: 1000,
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
      passwd: TEST_PASSWD,
      env: { USER: 'tester', LOCALAPPDATA: path.join(home, 'AppData', 'Local') },
      uid: 1000,
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
        passwd: TEST_PASSWD,
        env: { USER: 'tester', UID: '1000' },
        uid: 1000,
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

describe('ladder activation and switching', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  /** No user bus and no sudo: only the xdg file is a usable entry here. */
  function xdgLadder() {
    const runner = fakeRun(noSystemdHandler())
    return createBootLadder({
      platform: 'linux',
      home,
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
  }

  it('has no start command for a mechanism whose session reads it at login', async () => {
    const ladder = xdgLadder()
    await ladder.install(spec(), 'xdg-autostart')
    // `null` is the signal that keeps a running panel up rather than stopping it
    // with nothing to bring it back.
    expect(await ladder.activate(spec(), 'xdg-autostart')).toBeNull()
  })

  it('does not retire the working entry during an install', async () => {
    const ladder = xdgLadder()
    await ladder.install(spec(), 'xdg-autostart')
    // systemd-user is unavailable here, so this install fails — and must not have
    // taken the working xdg entry with it on the way out.
    const result = await ladder.install(spec(), 'systemd-user')
    expect(result.ok).toBe(false)
    expect((await ladder.status(spec(), 'xdg-autostart')).state).toBe('enabled-running')
  })

  it('stops the mechanism being left, never the one being installed', async () => {
    // The dangerous pair: the panel runs under the *user* unit today, and the
    // entry is becoming a *system* unit (sudo or linger appeared). `install()`
    // already ran, so the target reads as installed too — which is why the
    // previous mechanism has to be named rather than inferred. Stopping the target
    // is a no-op, and the user unit's `Restart=always` revives the panel the
    // moment the CLI's `down` returns, racing the entry about to start one.
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-system-running'))
        return { code: 0, stdout: 'running\n' }
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 0 }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=yes\n' }
      return { code: 0 }
    })
    const ladder = createBootLadder({
      platform: 'linux',
      home,
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
    await ladder.install(spec(), 'systemd-user')
    await ladder.install(spec(), 'systemd-system')

    const plan = await ladder.activate(spec(), 'systemd-system', 'systemd-user')
    expect(plan).not.toBeNull()
    expect(plan?.commands).toEqual([['sudo', '-n', 'systemctl', 'restart', 'home-hosted.service']])
    // The mechanism being left stops the panel, not the one being installed.
    expect(plan?.stop).toEqual([['systemctl', '--user', 'stop', 'home-hosted.service']])
  })

  it('carries the other mechanisms into the activation plan for retirement', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-system-running'))
        return { code: 0, stdout: 'running\n' }
      // Only the user scope has a unit here: answering for the system scope too
      // would make systemd-system read as installed and be retired as well.
      if (command === 'systemctl' && args.includes('is-enabled'))
        return args.includes('--user') ? { code: 0 } : { code: 4 }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=yes\n' }
      return { code: 0 }
    })
    const ladder = createBootLadder({
      platform: 'linux',
      home,
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
    // Both entries really exist, which is the state a switch has to clean up.
    await ladder.install(spec(), 'xdg-autostart')
    await ladder.install(spec(), 'systemd-user')

    // The panel is running under xdg-autostart (installed first); systemd-user is
    // the entry being installed. xdg-autostart has no way to stop a running panel,
    // so the detach is empty — the point is that it is the *previous* mechanism
    // that was asked, not systemd-user, which would have reported a stop that
    // never happened.
    const plan = await ladder.activate(spec(), 'systemd-user', 'xdg-autostart')
    expect(plan).not.toBeNull()
    expect(plan?.commands).toEqual([['systemctl', '--user', 'restart', 'home-hosted.service']])
    expect(plan?.stop).toEqual([])
    // Retirement rides in the same plan: only the detached helper may remove an
    // entry, and only after the panel is down and the new one has started.
    expect(plan?.retired).toEqual(['xdg-autostart'])
    expect(plan?.retire.flat().join(' ')).toContain('autostart/home-hosted.desktop')
  })
})

describe('ladder control: the installed entry owns start and stop', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  /** A machine where the systemd user unit is installed and enabled. */
  function installedLadder(options: { active?: boolean } = {}) {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-system-running'))
        return { code: 0, stdout: 'running\n' }
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 0 }
      if (command === 'systemctl' && args.includes('show'))
        return { code: 0, stdout: `ActiveState=${options.active === false ? 'inactive' : 'active'}\n` }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=yes\n' }
      return { code: 0 }
    })
    return createBootLadder({
      platform: 'linux',
      home,
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
  }

  it('stops through the unit that supervises the panel, not through the CLI', async () => {
    const ladder = installedLadder()
    const control = await ladder.control(spec(), 'stop')
    // `Restart=always` reads the CLI's `down` as a crash and brings the panel back;
    // only `systemctl stop` is a stop the entry believes in.
    expect(control?.mechanism).toBe('systemd-user')
    expect(control?.commands).toEqual([['systemctl', '--user', 'stop', 'home-hosted.service']])
  })

  it('starts through the same unit, with restart so a wedged panel recovers', async () => {
    const ladder = installedLadder()
    const control = await ladder.control(spec(), 'start')
    expect(control?.mechanism).toBe('systemd-user')
    expect(control?.commands).toEqual([['systemctl', '--user', 'restart', 'home-hosted.service']])
  })

  it('answers null with no entry installed, which is when the CLI is right', async () => {
    const runner = fakeRun(noSystemdHandler())
    const ladder = createBootLadder({
      platform: 'linux',
      home,
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
    // Nothing supervises the panel, so a mechanism's stop would stop nothing and a
    // mechanism's start would be a command for an entry that is not there.
    expect(await ladder.control(spec(), 'stop')).toBeNull()
    expect(await ladder.control(spec(), 'start')).toBeNull()
  })

  it('answers null for a mechanism whose entry cannot be commanded', async () => {
    const runner = fakeRun(noSystemdHandler())
    const ladder = createBootLadder({
      platform: 'linux',
      home,
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
    await ladder.install(spec(), 'xdg-autostart')
    // The `.desktop` entry is installed, and the session that reads it cannot be
    // told to stop anything — so the CLI remains the only path.
    expect(await ladder.control(spec(), 'stop')).toBeNull()
    expect(await ladder.control(spec(), 'start')).toBeNull()
  })
})

describe('ladder control with more than one entry installed', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  /**
   * An install does not retire another entry when no panel is answering
   * (`service.installBoot`), so two entries can coexist. Acting on the wrong one
   * starts a second panel beside the real one.
   *
   * The second entry is `xdg-autostart` rather than `systemd-system`: the latter
   * writes `/etc/systemd/system` and this machine really has a foreign
   * `home-hosted.service` there, which the provider correctly refuses to touch.
   */
  function twoEntries() {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-system-running'))
        return { code: 0, stdout: 'running\n' }
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 0 }
      if (command === 'systemctl' && args.includes('show'))
        return { code: 0, stdout: 'ActiveState=inactive\n' }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=yes\n' }
      return { code: 0 }
    })
    return createBootLadder({
      platform: 'linux',
      home,
      passwd: TEST_PASSWD,
      env: { USER: 'tester', UID: '1000' },
      uid: 1000,
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
  }

  it('acts on the mechanism the caller reported, not the first installed one', async () => {
    const ladder = twoEntries()
    await ladder.install(spec(), 'systemd-user')
    await ladder.install(spec(), 'xdg-autostart')
    // Provider order puts systemd-user first. A caller that reported the `.desktop`
    // entry must not have the systemd unit acted on instead.
    const control = await ladder.control(spec(), 'stop', 'xdg-autostart')
    // The `.desktop` entry cannot be commanded, so the honest answer is "nothing
    // installed can do it" — not a command for a different, unasked mechanism.
    expect(control).toBeNull()
  })

  it('answers for the reported mechanism when it can be commanded', async () => {
    const ladder = twoEntries()
    await ladder.install(spec(), 'systemd-user')
    await ladder.install(spec(), 'xdg-autostart')
    const control = await ladder.control(spec(), 'stop', 'systemd-user')
    expect(control?.mechanism).toBe('systemd-user')
    expect(control?.commands).toEqual([['systemctl', '--user', 'stop', 'home-hosted.service']])
  })
})

describe('the boot task is opt-in, never automatic', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  /**
   * An elevated Windows host where no task is registered yet.
   *
   * `/Query` on a missing task exits 1 with empty stdout — measured against the
   * real `schtasks.exe`; a fixture that returns 0 there makes every task look
   * registered-but-foreign.
   */
  function elevatedWindows() {
    // Registration is what makes the task appear, so `/Query` answers per task name.
    let registered: string | null = null
    const runner = fakeRun((command, args) => {
      // `Get-Command` is not its own argv element: the code passes one
      // `'Get-Command Register-ScheduledTask'` string, so `args.includes` misses it
      // and this probe would fall through to the register branch.
      if (command === 'powershell.exe' && args.join(' ').includes('Get-Command'))
        return { code: 0, stdout: 'Register-ScheduledTask\n' }
      if (command === 'powershell.exe' && args.join(' ').includes('IsInRole'))
        return { code: 0, stdout: 'True\n' }
      // After the two probes above: `Get-Command Register-ScheduledTask` also
      // contains the cmdlet name, so testing that first would register nothing.
      if (command === 'powershell.exe' && args.join(' ').includes('Register-ScheduledTask')) {
        registered = /TaskName '([^']+)'/.exec(args.join(' '))?.[1] ?? null
        return { code: 0 }
      }
      if (command === 'schtasks.exe' && args.includes('/Query')) {
        const want = args[args.indexOf('/TN') + 1]
        return want === registered ? { code: 0, stdout: '' } : { code: 1, stderr: 'ERROR: The system cannot find the file specified.\n' }
      }
      return { code: 0 }
    })
    return createBootLadder({
      platform: 'win32',
      home,
      passwd: TEST_PASSWD,
      env: { USER: 'tester', LOCALAPPDATA: path.join(home, 'AppData', 'Local') },
      uid: 1000,
      run: runner.run,
      sudo: async () => false,
      exists: () => false,
    })
  }

  it('reports itself as boot-capable, because it really does start before login', async () => {
    const ladder = elevatedWindows()
    const status = await ladder.status(winSpec(), 'windows-boot')
    const candidate = status.candidates.find(entry => entry.mechanism === 'windows-boot')
    // If this were false it would rank below the Run key by accident, which is not
    // the reason it is excluded from `auto` — the session-0 cost is.
    expect(candidate?.bootCapable).toBe(true)
    expect(candidate?.available).toBe(true)
  })

  it('is never what `auto` recommends, even though it is boot-capable and elevated', async () => {
    const ladder = elevatedWindows()
    const status = await ladder.status(winSpec())
    expect(status.recommended).not.toBe('windows-boot')
    // The boot task is strictly better on paper (it starts before login), so only an
    // explicit exclusion keeps it out — the assertion has to name the alternative.
    expect(['windows-task', 'windows-run']).toContain(status.recommended)
  })

  it('still installs when named explicitly', async () => {
    const ladder = elevatedWindows()
    const result = await ladder.install(winSpec(), 'windows-boot')
    expect(result.ok).toBe(true)
    expect(result.mechanism).toBe('windows-boot')
    // The task must be its own name: sharing the logon task's would make installing
    // one silently replace the other.
    expect(result.detail).toContain('home-hosted-boot')
  })
})
