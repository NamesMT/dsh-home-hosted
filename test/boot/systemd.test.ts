import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createSystemdSystemProvider, createSystemdUserProvider, systemdSystemUnit, systemdUserUnit } from '../../src/boot/systemd.js'
import { cleanup, ctxFor, fakeRun, spec, tempHome } from './harness.js'

const UNIT = 'home-hosted.service'

function unitPath(home: string): string {
  return path.join(home, '.config', 'systemd', 'user', UNIT)
}

describe('systemd --user', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  it('reports an unreachable user bus as unavailable, not as a missing unit', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-system-running'))
        return { code: 1, stderr: 'Failed to connect to user scope bus' }
      return { code: 0 }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const candidate = await provider.detect()
    expect(candidate.available).toBe(false)
    expect(candidate.bootCapable).toBe(false)
    expect(candidate.reason).toMatch(/user scope bus/)
  })

  it('reports boot capability from linger', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'loginctl' && args[0] === 'show-user')
        return { code: 0, stdout: 'Linger=yes\n' }
      return { code: 0, stdout: 'running\n' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const candidate = await provider.detect()
    expect(candidate.available).toBe(true)
    expect(candidate.bootCapable).toBe(true)
    expect(candidate.privileged).toBe(true)
  })

  it('does not claim boot capability without linger', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'loginctl' && args[0] === 'show-user')
        return { code: 0, stdout: 'Linger=no\n' }
      return { code: 0, stdout: 'running\n' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const candidate = await provider.detect()
    expect(candidate.available).toBe(true)
    expect(candidate.bootCapable).toBe(false)
    expect(candidate.privileged).toBe(false)
  })

  it('maps is-enabled exit 4 to not-installed', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 4, stderr: 'Unit home-hosted.service could not be found.' }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=no\n' }
      return { code: 0, stdout: '' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const status = await provider.status(spec())
    expect(status.state).toBe('not-installed')
    expect(status.unitPath).toBe(unitPath(home))
  })

  it('never reads an unreachable user bus as an installed unit', async () => {
    // Reproduces the real host: no user bus, so is-enabled exits 1 and show prints nothing.
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-system-running'))
        return { code: 1, stderr: 'Failed to connect to user scope bus' }
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 1, stderr: 'Failed to connect to user scope bus' }
      if (command === 'systemctl')
        return { code: 1, stderr: 'Failed to connect to user scope bus', stdout: '' }
      if (command === 'loginctl')
        return { code: 1, stderr: 'Failed to connect to user scope bus' }
      return { code: 1 }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const status = await provider.status(spec())
    expect(status.state).toBe('not-installed')
    expect(status.detail).toContain('UnitFileState=(none)')
    expect(status.commands).toEqual(['sudo loginctl enable-linger tester'])
  })

  it('maps is-enabled exit 1 with the file present to installed-disabled', async () => {
    fs.mkdirSync(path.dirname(unitPath(home)), { recursive: true })
    fs.writeFileSync(unitPath(home), systemdUserUnit(spec()))
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 1, stdout: 'disabled\n' }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=no\n' }
      return { code: 0, stdout: 'UnitFileState=disabled\nActiveState=inactive\nResult=success\nNRestarts=0\n' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const status = await provider.status(spec())
    expect(status.state).toBe('installed-disabled')
    expect(status.commands).toEqual([`sudo loginctl enable-linger tester`])
  })

  it('reports enabled-failing when the last run failed', async () => {
    fs.mkdirSync(path.dirname(unitPath(home)), { recursive: true })
    fs.writeFileSync(unitPath(home), systemdUserUnit(spec()))
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 0, stdout: 'enabled\n' }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=yes\n' }
      return { code: 0, stdout: 'UnitFileState=enabled\nActiveState=failed\nResult=exit-code\nNRestarts=3\n' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const status = await provider.status(spec())
    expect(status.state).toBe('enabled-failing')
    expect(status.detail).toContain('Result=exit-code')
    expect(status.commands).toEqual([])
  })

  it('installs, reloads and enables, then re-reads the state', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 0, stdout: 'enabled\n' }
      if (command === 'loginctl')
        return { code: 0, stdout: args[0] === 'show-user' ? 'Linger=yes\n' : '' }
      return { code: 0, stdout: 'UnitFileState=enabled\nActiveState=active\nResult=success\nNRestarts=0\n' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const result = await provider.install(spec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    expect(fs.readFileSync(unitPath(home), 'utf8')).toBe(systemdUserUnit(spec()))
    expect(runner.lines()).toContain('systemctl --user daemon-reload')
    expect(runner.lines()).toContain('systemctl --user enable --now home-hosted.service')
  })

  it('treats an identical unit that is already enabled as no change', async () => {
    fs.mkdirSync(path.dirname(unitPath(home)), { recursive: true })
    fs.writeFileSync(unitPath(home), systemdUserUnit(spec()))
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 0, stdout: 'enabled\n' }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=yes\n' }
      return { code: 0, stdout: 'UnitFileState=enabled\nActiveState=active\nResult=success\n' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const result = await provider.install(spec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(false)
    expect(runner.lines().some(line => line.includes('daemon-reload'))).toBe(false)
    expect(runner.lines().some(line => line.includes('enable --now'))).toBe(false)
  })

  it('reports the sudo linger command when enable-linger fails', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'loginctl' && args[0] === 'show-user')
        return { code: 0, stdout: 'Linger=no\n' }
      if (command === 'loginctl')
        return { code: 1, stderr: 'Interactive authentication required.' }
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 0, stdout: 'enabled\n' }
      return { code: 0, stdout: 'UnitFileState=enabled\nActiveState=active\nResult=success\n' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const result = await provider.install(spec())
    expect(result.ok).toBe(true)
    expect(result.needsPrivilege).toBe(true)
    expect(result.commands).toEqual(['sudo loginctl enable-linger tester'])
    expect(result.detail).toMatch(/linger is off/)
  })

  it('refuses to touch a unit file written by someone else', async () => {
    fs.mkdirSync(path.dirname(unitPath(home)), { recursive: true })
    fs.writeFileSync(unitPath(home), '[Unit]\nDescription=not ours\n')
    const runner = fakeRun()
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))

    const install = await provider.install(spec())
    expect(install.ok).toBe(false)
    expect(install.detail).toMatch(/marker/)
    const uninstall = await provider.uninstall(spec())
    expect(uninstall.ok).toBe(false)
    expect(uninstall.detail).toMatch(/marker/)
    expect(fs.existsSync(unitPath(home))).toBe(true)
    expect(runner.calls).toEqual([])
    const status = await provider.status(spec())
    expect(status.state).toBe('not-installed')
    expect(status.detail).toMatch(/does not carry this plugin's marker/)
  })

  it('tolerates an already absent unit on uninstall', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 4, stderr: 'Unit home-hosted.service could not be found.' }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=no\n' }
      return { code: 0, stdout: '' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const result = await provider.uninstall(spec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(false)
    expect(result.detail).toMatch(/already gone/)
  })

  it('disables and deletes an installed unit, tolerating disable exit 1', async () => {
    fs.mkdirSync(path.dirname(unitPath(home)), { recursive: true })
    fs.writeFileSync(unitPath(home), systemdUserUnit(spec()))
    let installed = true
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('disable')) {
        installed = false
        return { code: 1, stderr: 'Unit is not enabled.' }
      }
      if (command === 'systemctl' && args.includes('is-enabled'))
        return installed ? { code: 0, stdout: 'enabled\n' } : { code: 4 }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=yes\n' }
      return { code: 0, stdout: installed ? 'UnitFileState=enabled\nActiveState=active\nResult=success\n' : '' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const result = await provider.uninstall(spec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    expect(fs.existsSync(unitPath(home))).toBe(false)
    expect(runner.lines()).toContain('systemctl --user disable --now home-hosted.service')
    expect(runner.lines()).toContain('systemctl --user daemon-reload')
  })

  it('refuses to uninstall while systemd still reports the unit', async () => {
    fs.mkdirSync(path.dirname(unitPath(home)), { recursive: true })
    fs.writeFileSync(unitPath(home), systemdUserUnit(spec()))
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 0, stdout: 'enabled\n' }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=yes\n' }
      return { code: 0, stdout: 'UnitFileState=enabled\nActiveState=active\nResult=success\n' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const result = await provider.uninstall(spec())
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/still known to systemd/)
    expect(fs.existsSync(unitPath(home))).toBe(false)
  })

  it('rejects a bad unit name instead of writing it', async () => {
    const runner = fakeRun()
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const result = await provider.install(spec({ unitName: 'home-hosted; rm -rf /' }))
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/unit name/)
    expect(runner.calls).toEqual([])
  })

  it('writes WorkingDirectory= as the raw path while ExecStart= words stay quoted', () => {
    const cwd = '/home/my user/My Project'
    const unit = systemdUserUnit(spec({ cwd, args: ['/opt/home-hosted/dist/my cli.js', 'up'] }))
    const lines = unit.split('\n')
    // systemd takes path settings verbatim, so a space must not gain quotes.
    expect(lines).toContain(`WorkingDirectory=${cwd}`)
    expect(lines.some(line => line.startsWith('WorkingDirectory="'))).toBe(false)
    expect(lines).toContain('ExecStart=/usr/bin/node "/opt/home-hosted/dist/my cli.js" up')
  })

  it('refuses a WorkingDirectory= path containing a double quote', async () => {
    expect(() => systemdUserUnit(spec({ cwd: '/home/my "user"/project' }))).toThrow(/double quote/)
    const runner = fakeRun()
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const result = await provider.install(spec({ cwd: '/home/my "user"/project' }))
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/double quote/)
    expect(runner.calls).toEqual([])
    expect(fs.existsSync(unitPath(home))).toBe(false)
  })

  it('quotes an ExecStart= argument containing a semicolon', () => {
    const unit = systemdUserUnit(spec({ args: ['run', 'a;b'] }))
    expect(unit.split('\n')).toContain('ExecStart=/usr/bin/node run "a;b"')
  })

  it('refuses to uninstall a same-named unit file this plugin did not write', async () => {
    fs.mkdirSync(path.dirname(unitPath(home)), { recursive: true })
    fs.writeFileSync(unitPath(home), '[Unit]\nDescription=someone else\n')
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 0, stdout: 'enabled\n' }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=yes\n' }
      return { code: 0, stdout: 'UnitFileState=enabled\nActiveState=active\nResult=success\n' }
    })
    const provider = createSystemdUserProvider(ctxFor({ home, run: runner.run }))
    const result = await provider.uninstall(spec())
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/marker/)
    expect(runner.find('systemctl').some(call => call.args.includes('disable'))).toBe(false)
    expect(fs.existsSync(unitPath(home))).toBe(true)
  })
})

describe('systemd system', () => {
  let home: string
  // A unit name no real install uses: a machine that already has this plugin's own
  // system unit must not make these tests read — or refuse to touch — somebody's
  // live entry. That host dependency is exactly what made them fail here.
  const unitName = 'home-hosted-plugin-test'
  const unitFile = `/etc/systemd/system/${unitName}.service`
  beforeEach(() => { home = tempHome() })
  afterEach(() => { cleanup(home) })

  it('is unavailable without systemd PID 1', async () => {
    const runner = fakeRun()
    const provider = createSystemdSystemProvider(ctxFor({ home, run: runner.run, exists: () => false }))
    const candidate = await provider.detect()
    expect(candidate.available).toBe(false)
    expect(candidate.reason).toMatch(/run\/systemd\/system/)
  })

  it('exposes the exact sudo commands when privilege is missing', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 4 }
      return { code: 0, stdout: '' }
    })
    const provider = createSystemdSystemProvider(ctxFor({
      home,
      run: runner.run,
      exists: file => file === '/run/systemd/system',
      sudo: async () => false,
      env: { USER: 'tester', TMPDIR: home },
    }))
    const result = await provider.install(spec({ unitName }))
    expect(result.ok).toBe(false)
    expect(result.needsPrivilege).toBe(true)
    expect(result.commands).toEqual([
      `sudo install -m 0644 ${path.join(home, `home-hosted-${unitName}.service`)} ${unitFile}`,
      `sudo systemctl daemon-reload`,
      `sudo systemctl enable --now ${unitName}.service`,
    ])
    expect(runner.calls.some(call => call.command === 'sudo')).toBe(false)
    expect(fs.existsSync(path.join(home, `home-hosted-${unitName}.service`))).toBe(true)
  })

  it('installs through `sudo -n` and never through a shell', async () => {
    let installed = false
    // The staged unit is a temp file the install deletes once copied, so read it out
    // of the very argv the faked `sudo install` was handed — the same technique the
    // `User=` test below uses. Asserting on a path afterwards can never run.
    let stagedContent = ''
    const runner = fakeRun((command, args) => {
      if (command === 'sudo' && args.includes('install')) {
        installed = true
        stagedContent = fs.readFileSync(args[args.length - 2] ?? '', 'utf8')
      }
      if (command === 'systemctl' && args.includes('is-enabled'))
        return installed ? { code: 0, stdout: 'enabled\n' } : { code: 4 }
      if (command === 'sudo' && args.includes('enable')) {
        installed = true
        return { code: 0 }
      }
      return { code: 0, stdout: installed ? 'UnitFileState=enabled\nActiveState=active\nResult=success\n' : '' }
    })
    const provider = createSystemdSystemProvider(ctxFor({
      home,
      run: runner.run,
      exists: file => file === '/run/systemd/system',
      sudo: async () => true,
      env: { USER: 'tester', TMPDIR: home },
    }))
    const result = await provider.install(spec({ unitName }))
    expect(result.ok).toBe(true)
    expect(result.needsPrivilege).toBe(true)
    expect(runner.lines()).toContain(`sudo -n install -m 0644 ${path.join(home, `home-hosted-${unitName}.service`)} ${unitFile}`)
    expect(runner.lines()).toContain('sudo -n systemctl daemon-reload')
    expect(runner.lines()).toContain(`sudo -n systemctl enable --now ${unitName}.service`)
    // Never `User=root`: the account is whoever the login named, and a root answer
    // is dropped rather than written. Asserted on the content actually staged, which
    // is the only moment it exists.
    expect(stagedContent, 'the install should have been handed a staged unit').not.toBe('')
    expect(stagedContent).not.toContain('User=root')
  })

  it('writes User= for the login that elevated, never for a root environment', async () => {
    // The staged unit is a temp file the install deletes once copied, so read it
    // out of the very argv the faked `sudo install` was handed.
    let staged = ''
    const runner = fakeRun((command, args) => {
      if (command === 'sudo' && args.includes('install'))
        staged = fs.readFileSync(args[args.length - 2] ?? '', 'utf8')
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 4 }
      if (command === 'systemctl')
        return { code: 0, stdout: 'UnitFileState=enabled\nActiveState=active\n' }
      if (command === 'loginctl')
        return { code: 0, stdout: 'Linger=no\n' }
      return { code: 0, stdout: '' }
    })
    const provider = createSystemdSystemProvider(ctxFor({
      home,
      run: runner.run,
      exists: file => file === '/run/systemd/system',
      sudo: async () => true,
      // Exactly what `sudo systemctl restart` hands the unit back later: root's own
      // environment. SUDO_UID is the only place the invoking login survives.
      env: { USER: 'root', HOME: '/root', LOGNAME: 'root', SUDO_UID: '1000', TMPDIR: home },
      uid: 0,
    }))
    await provider.install(spec({ unitName }))
    expect(staged).not.toBe('')
    const content = staged
    expect(content).toMatch(/^User=\S/m)
    expect(content).not.toContain('User=root')
    expect(content).toContain('KillMode=process')
    // And the entry's own environment is that account's home, not the /root the
    // root helper would otherwise pass down on restart.
    expect(content).not.toContain('Environment=HOME=/root')
  })

  it('names the account it would run as in the detect reason', async () => {
    const runner = fakeRun()
    const provider = createSystemdSystemProvider(ctxFor({
      home,
      run: runner.run,
      exists: file => file === '/run/systemd/system',
      isRoot: true,
      env: { USER: 'root', HOME: '/root', LOGNAME: 'root', SUDO_UID: '1000' },
      uid: 0,
    }))
    const candidate = await provider.detect()
    expect(candidate.available).toBe(true)
    expect(candidate.reason).toMatch(/the entry runs the panel as \S+/)
    expect(candidate.reason).not.toMatch(/as root/)
  })

  it('says an unresolvable account means the panel runs as root', async () => {
    const warnings: string[] = []
    const runner = fakeRun()
    const provider = createSystemdSystemProvider(ctxFor({
      home,
      run: runner.run,
      exists: file => file === '/run/systemd/system',
      // Root with no login behind it: the one honest root answer. It must be said
      // out loud, and the unit must not be dressed up with `User=root`.
      isRoot: true,
      env: { USER: 'root', HOME: '/root', TMPDIR: home },
      uid: 0,
      warn: (line: string) => warnings.push(line),
    }))
    const candidate = await provider.detect()
    expect(candidate.reason).toMatch(/run the panel as root/)
    warnings.length = 0
    systemdSystemUnit(spec({ unitName }), 'root')
    expect(warnings).toEqual([])
  })

  it('reports not-installed when systemd does not know the unit', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 4 }
      return { code: 0, stdout: '' }
    })
    const provider = createSystemdSystemProvider(ctxFor({ home, run: runner.run, sudo: async () => false }))
    const status = await provider.status(spec({ unitName }))
    expect(status.state).toBe('not-installed')
    expect(status.unitPath).toBe(unitFile)
    expect(status.commands).toEqual([])
  })

  it('reports nothing to remove when no system unit is there and there is no privilege', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 4 }
      return { code: 0, stdout: '' }
    })
    const provider = createSystemdSystemProvider(ctxFor({ home, run: runner.run, sudo: async () => false }))
    const result = await provider.uninstall(spec({ unitName }))
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(false)
    expect(result.detail).toMatch(/nothing to remove/)
  })
})

describe('systemd working directory encoding', () => {
  it('escapes a percent, and keeps a backslash as data', () => {
    // `%x` is a fatal invalid specifier, so it is escaped. A backslash is not an
    // escape in this setting — systemd takes the path verbatim — so doubling it
    // (the old behaviour) addressed `a\\b` and failed with `status=200/CHDIR`.
    const percent = systemdUserUnit(spec({ cwd: '/home/my dir/100%' }))
    expect(percent.split('\n')).toContain('WorkingDirectory=/home/my dir/100%%')

    const backslashes = systemdUserUnit(spec({ cwd: '/home/my dir/a\\b' }))
    expect(backslashes.split('\n')).toContain('WorkingDirectory=/home/my dir/a\\b')

    // A trailing backslash continues the line and would swallow `KillMode=`, so a
    // trailing space is added; systemd strips it and the path is unchanged.
    const trailing = systemdUserUnit(spec({ cwd: '/home/my dir/trail\\' }))
    expect(trailing.split('\n')).toContain('WorkingDirectory=/home/my dir/trail\\ ')
    expect(trailing).toContain('KillMode=process')
    expect(percent).toContain('KillMode=process')
  })

  it('keeps a description verbatim, without letting it splice the next directive', () => {
    const unit = systemdUserUnit(spec({ label: 'label 100%\\tail' }))
    expect(unit.split('\n')).toContain('Description=label 100%%\\tail')
    // The label ends in a plain character here, so nothing needs absorbing.
    expect(unit).toContain('[Unit]')
    const trailing = systemdUserUnit(spec({ label: 'ends with a backslash\\' }))
    expect(trailing.split('\n')).toContain('Description=ends with a backslash\\ ')
    expect(trailing).toContain('After=network-online.target')
  })
})

