import { describe, expect, it } from 'vitest'
import { launchdPlist } from '../../src/boot/launchd.js'
import { systemdSystemUnit, systemdUserUnit } from '../../src/boot/systemd.js'
import { bootTaskNameOf, bootTaskXml, hiddenLaunchPath, registerBootTaskScript, registerTaskScript, scheduledTaskXml, windowlessSpec } from '../../src/boot/windows.js'
import { xdgDesktopEntry } from '../../src/boot/xdg.js'
import { ctxFor, fakeRun, spec, winSpec } from './harness.js'
import type { BootProviderContext } from '../../src/boot/types.js'

/**
 * A Windows context with `wscript.exe` present, so the derived spec is the wrapped one.
 *
 * The builders stay pure — they take whatever spec they are given — so the *provider* is
 * what decides. These tests therefore drive the derivation and hand its result to the
 * builder, which is exactly what `install()` does.
 */
function windowsCtx(systemRoot = 'C:\\Windows'): BootProviderContext {
  return ctxFor({
    home: 'C:\\Users\\tester',
    platform: 'win32',
    run: fakeRun().run,
    env: { SystemRoot: systemRoot, LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local' },
    exists: file => file.toLowerCase() === `${systemRoot.toLowerCase()}\\system32\\wscript.exe`,
  })
}

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

  it('never writes User=root, however the caller got there', () => {
    // The bug: a panel launched from a root shell resolved $USER to `root`, and an
    // entry with User=root looks deliberate while it is only the default of a root
    // process. The directive is dropped, so nothing about the unit claims a choice.
    expect(systemdSystemUnit(spec(), 'root')).not.toContain('User=')
    expect(systemdUserUnit(spec())).not.toContain('User=')
  })

  it('keeps entries alive across a panel restart with KillMode=process', () => {
    // This plugin's own non-persistent `dsh` row is the panel's child and shares
    // its cgroup; under the default control-group kill, a `systemctl restart` takes
    // that row down with the panel, which is the guarantee `persistent` promises.
    for (const unit of [systemdUserUnit(spec()), systemdSystemUnit(spec(), 'tester')]) {
      expect(unit).toContain('KillMode=process')
      expect(unit).not.toContain('KillMode=control-group')
    }
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

  it('writes a boot task XML that runs as SYSTEM at startup, not at logon', () => {
    const xml = bootTaskXml(winSpec())
    expect(xml).toMatchSnapshot()
    expect(xml).toContain('<BootTrigger>')
    expect(xml).not.toContain('<LogonTrigger>')
    // The well-known SYSTEM SID, and never a stored password: a named account would
    // turn this artifact into a credential store.
    expect(xml).toContain('<UserId>S-1-5-18</UserId>')
    expect(xml.toLowerCase()).not.toContain('password')
    expect(xml).toContain('<RunLevel>HighestAvailable</RunLevel>')
    // Still the same marker and restart policy as the logon task.
    expect(xml).toContain('<Description>managed-by:dsh-home-hosted</Description>')
    expect(xml).toContain('<RestartOnFailure>')
  })

  it('gives the boot task its own name, so it cannot replace the logon task', () => {
    // Both mechanisms key their artifact on `unitName`; sharing it would make
    // installing one silently consume the other.
    expect(bootTaskNameOf('home-hosted')).toBe('home-hosted-boot')
    expect(bootTaskNameOf('home-hosted')).not.toBe('home-hosted')
    // Still a legal task name by the same rule the logon task obeys.
    expect(bootTaskNameOf('home-hosted-1a2b3c4d')).toBe('home-hosted-1a2b3c4d-boot')
  })

  it('registers the boot task with -AtStartup and a SYSTEM principal', () => {
    const script = registerBootTaskScript(winSpec())
    expect(script).toMatchSnapshot()
    expect(script).toContain('New-ScheduledTaskTrigger -AtStartup')
    expect(script).not.toContain('-AtLogOn')
    expect(script).toContain("New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount")
    expect(script).toContain("Register-ScheduledTask -TaskName 'home-hosted-boot'")
  })

  /**
   * The builders stay **pure**: they take a spec and interpolate it. Which spec they are
   * handed is the provider's decision, and this is that decision's payload half — the logon
   * task's action names `wscript.exe` with the wrapper, while the boot task's still names
   * the real node (session 0 shows no window, measured).
   */
  it('names wscript.exe in a logon task built from the derived spec', () => {
    const ctx = windowsCtx()
    const original = winSpec()
    const derived = windowlessSpec(ctx, original)
    const xml = scheduledTaskXml(derived)
    expect(xml).toContain('<Command>C:\\Windows\\System32\\wscript.exe</Command>')
    expect(xml).toContain(`//B //nologo ${hiddenLaunchPath(ctx, original)}`)
    expect(xml).not.toContain('nodejs\\node.exe')
    // The marker and the restart policy are untouched, so `RestartOnFailure` still works.
    expect(xml).toContain('<Description>managed-by:dsh-home-hosted</Description>')
    expect(xml).toContain('<RestartOnFailure>')

    const script = registerTaskScript(derived)
    expect(script).toContain("-Execute 'C:\\Windows\\System32\\wscript.exe'")
    expect(script).not.toContain('node.exe')
  })

  it('leaves the boot task naming the real node, because session 0 has no window', () => {
    // The wrapper is deliberately NOT applied here: a SYSTEM task in session 0 measured
    // `visible=False`, so wrapping it would add an artifact for no window to remove.
    const xml = bootTaskXml(winSpec())
    expect(xml).toContain('<Command>C:\\Program Files\\nodejs\\node.exe</Command>')
    expect(xml).not.toContain('wscript.exe')
    expect(registerBootTaskScript(winSpec())).toContain("-Execute 'C:\\Program Files\\nodejs\\node.exe'")
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
