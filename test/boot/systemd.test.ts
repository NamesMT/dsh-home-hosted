import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createSystemdSystemProvider, createSystemdUserProvider, systemdUserUnit } from '../../src/boot/systemd.js'
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
})

describe('systemd system', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

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
    const result = await provider.install(spec())
    expect(result.ok).toBe(false)
    expect(result.needsPrivilege).toBe(true)
    expect(result.commands).toEqual([
      `sudo install -m 0644 ${path.join(home, 'home-hosted-home-hosted.service')} /etc/systemd/system/home-hosted.service`,
      `sudo systemctl daemon-reload`,
      `sudo systemctl enable --now home-hosted.service`,
    ])
    expect(runner.calls.some(call => call.command === 'sudo')).toBe(false)
    expect(fs.existsSync(path.join(home, 'home-hosted-home-hosted.service'))).toBe(true)
  })

  it('installs through `sudo -n` and never through a shell', async () => {
    let installed = false
    const runner = fakeRun((command, args) => {
      if (command === 'sudo' && args.includes('install'))
        installed = true
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
    const result = await provider.install(spec())
    expect(result.ok).toBe(true)
    expect(result.needsPrivilege).toBe(true)
    expect(runner.lines()).toContain(`sudo -n install -m 0644 ${path.join(home, 'home-hosted-home-hosted.service')} /etc/systemd/system/home-hosted.service`)
    expect(runner.lines()).toContain('sudo -n systemctl daemon-reload')
    expect(runner.lines()).toContain('sudo -n systemctl enable --now home-hosted.service')
  })

  it('reports not-installed when systemd does not know the unit', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 4 }
      return { code: 0, stdout: '' }
    })
    const provider = createSystemdSystemProvider(ctxFor({ home, run: runner.run, sudo: async () => false }))
    const status = await provider.status(spec())
    expect(status.state).toBe('not-installed')
    expect(status.unitPath).toBe('/etc/systemd/system/home-hosted.service')
    expect(status.commands).toEqual([])
  })

  it('reports nothing to remove when no system unit is there and there is no privilege', async () => {
    const runner = fakeRun((command, args) => {
      if (command === 'systemctl' && args.includes('is-enabled'))
        return { code: 4 }
      return { code: 0, stdout: '' }
    })
    const provider = createSystemdSystemProvider(ctxFor({ home, run: runner.run, sudo: async () => false }))
    const result = await provider.uninstall(spec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(false)
    expect(result.detail).toMatch(/nothing to remove/)
  })
})
