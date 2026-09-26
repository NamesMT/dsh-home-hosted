import { describe, expect, it } from 'vitest'
import { launchdPlist } from '../../src/boot/launchd.js'
import { systemdSystemUnit, systemdUserUnit } from '../../src/boot/systemd.js'
import { registerTaskScript, scheduledTaskXml } from '../../src/boot/windows.js'
import { xdgDesktopEntry } from '../../src/boot/xdg.js'
import { spec, winSpec } from './harness.js'

describe('systemd payloads', () => {
  it('writes a user unit with Type=exec, Restart and an explicit environment', () => {
    const unit = systemdUserUnit(spec())
    expect(unit).toMatchSnapshot()
    expect(unit).toContain('# Managed by managed-by:dsh-home-hosted')
    expect(unit).toContain('Type=exec')
    expect(unit).toContain('Restart=always')
    expect(unit).toContain('RestartSec=5')
    expect(unit).toContain('WantedBy=default.target')
    expect(unit).toContain('Environment=HHOSTED_HOME=/home/tester/.home-hosted')
    expect(unit).not.toContain('StartLimitIntervalSec')
  })

  it('writes a system unit with StartLimit* in [Unit] and User= only when known', () => {
    const unit = systemdSystemUnit(spec(), 'tester')
    expect(unit).toMatchSnapshot()
    expect(unit).toContain('WantedBy=multi-user.target')
    expect(unit).toContain('User=tester')
    const unitIndex = unit.indexOf('[Unit]')
    const limitIndex = unit.indexOf('StartLimitIntervalSec=60')
    const serviceIndex = unit.indexOf('[Service]')
    expect(limitIndex).toBeGreaterThan(unitIndex)
    expect(limitIndex).toBeLessThan(serviceIndex)
    expect(systemdSystemUnit(spec(), null)).not.toContain('User=')
  })

  it('quotes values that would otherwise change the unit', () => {
    const unit = systemdUserUnit(spec({
      args: ['/opt/cli.js', '--home', '/home/my user', '--tag', '100%'],
      env: { HOME: '/home/my user', PCT: '50%', DOLLAR: '$HOME' },
    }))
    expect(unit).toContain('--home "/home/my user"')
    expect(unit).toContain('100%%')
    expect(unit).toContain('Environment="HOME=/home/my user"')
    expect(unit).toContain('Environment="PCT=50%%"')
    expect(unit).toContain('Environment=DOLLAR=$HOME')
  })
})

describe('xdg payload', () => {
  it('writes a login-scope desktop entry with a non-shell Exec', () => {
    const entry = xdgDesktopEntry(spec())
    expect(entry).toMatchSnapshot()
    expect(entry).toContain('Terminal=false')
    expect(entry).toContain('X-GNOME-Autostart-enabled=true')
    expect(entry).toContain('X-HomeHosted-Marker=managed-by:dsh-home-hosted')
    expect(entry).toContain(`Exec=/usr/bin/node /opt/home-hosted/dist/cli.js up --foreground --home /home/tester/.home-hosted`)
    expect(entry).not.toContain('~')
  })
})

describe('launchd payload', () => {
  it('writes a plist with argv, KeepAlive, ThrottleInterval and log paths', () => {
    const plist = launchdPlist(spec({ logDir: '/home/tester/.home-hosted/.logs' }))
    expect(plist).toMatchSnapshot()
    expect(plist).toContain('<key>Label</key>')
    expect(plist).toContain('<string>dev.home-hosted.home-hosted</string>')
    expect(plist).toContain('<key>RunAtLoad</key>')
    expect(plist).toContain('<key>SuccessfulExit</key>')
    expect(plist).toContain('<integer>10</integer>')
    expect(plist).toContain('<key>WorkingDirectory</key>')
    expect(plist).toContain('<string>/home/tester/.home-hosted/.logs/dev.home-hosted.home-hosted.err.log</string>')
    expect(plist).toContain('<!-- Managed by managed-by:dsh-home-hosted -->')
  })
})

describe('windows payloads', () => {
  it('writes task XML with the marker, a logon trigger and restart settings', () => {
    const xml = scheduledTaskXml(winSpec())
    expect(xml).toMatchSnapshot()
    expect(xml).toContain('<Description>managed-by:dsh-home-hosted</Description>')
    expect(xml).toContain('<LogonTrigger>')
    expect(xml).toContain('<RestartOnFailure>')
    expect(xml).toContain('<Count>3</Count>')
    expect(xml).toContain('<Command>C:\\Program Files\\nodejs\\node.exe</Command>')
    expect(xml).toContain('<WorkingDirectory>C:\\Users\\tester</WorkingDirectory>')
  })

  it('builds the Register-ScheduledTask script from cmdlets', () => {
    const script = registerTaskScript(winSpec())
    expect(script).toMatchSnapshot()
    expect(script).toContain('New-ScheduledTaskAction')
    expect(script).toContain('New-ScheduledTaskTrigger -AtLogOn')
    expect(script).toContain('New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable')
    expect(script).toContain('Register-ScheduledTask -TaskName \'home-hosted\'')
  })
})
