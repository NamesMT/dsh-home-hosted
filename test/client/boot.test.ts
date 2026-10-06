import { describe, expect, it } from 'vitest'
import { bootAttemptView, bootMechanisms, bootRefusal, isStaleAttempt, isSwitchingMechanism, visibleBootAttempt } from '../../src/client/boot.js'
import type { BootAttemptView, FreshBootAttempt } from '../../src/client/boot.js'
import type { BootCandidate, BootMechanism } from '../../src/shared/contracts.js'

function candidate(mechanism: BootMechanism, available = true): BootCandidate {
  return { mechanism, available, bootCapable: true, privileged: true, reason: '' }
}

describe('bootRefusal', () => {
  it('extracts a refusal from a successful envelope payload', () => {
    expect(bootRefusal({
      result: {
        ok: false,
        detail: 'launchctl bootstrap failed (exit 5)',
        commands: ['launchctl bootstrap gui/501 ~/Library/LaunchAgents/x.plist', 'launchctl kickstart gui/501/x'],
      },
      status: {},
    })).toEqual({
      detail: 'launchctl bootstrap failed (exit 5)',
      commands: ['launchctl bootstrap gui/501 ~/Library/LaunchAgents/x.plist', 'launchctl kickstart gui/501/x'],
    })
  })

  it('reports nothing for a success', () => {
    expect(bootRefusal({ result: { ok: true, detail: 'installed', commands: [] } })).toBeNull()
  })

  it('requires an explicit ok:false', () => {
    expect(bootRefusal({ result: { detail: '?', commands: [] } })).toBeNull()
    expect(bootRefusal({ result: {} })).toBeNull()
  })

  it('tolerates a missing or malformed payload', () => {
    expect(bootRefusal(undefined)).toBeNull()
    expect(bootRefusal(null)).toBeNull()
    expect(bootRefusal('nope')).toBeNull()
    expect(bootRefusal({})).toBeNull()
    expect(bootRefusal({ result: 'nope' })).toBeNull()
  })

  it('normalises a refusal with no detail and filters foreign commands', () => {
    expect(bootRefusal({ result: { ok: false, commands: ['ok', 3, null] } }))
      .toEqual({ detail: '', commands: ['ok'] })
  })
})

describe('bootAttemptView', () => {
  it('renders nothing without a persisted attempt', () => {
    expect(bootAttemptView(undefined)).toBeNull()
  })

  /**
   * The field is `lastAttempt?: BootAttempt` — absent or a record — but a cleared
   * optional written back is an explicit `null`, and this read `.ok` off it. That threw
   * during render and took the whole Boot section down, so the non-records are handled at
   * both ends: `SettingsStore.normalize` refuses to store one, and this returns "none"
   * rather than reading it.
   */
  it('treats every non-record as "no attempt kept"', () => {
    for (const value of [null, undefined, 'nonsense', 42, [], true])
      expect(bootAttemptView(value as never), `${JSON.stringify(value)} should read as no attempt`).toBeNull()
    // And a real record still survives.
    expect(bootAttemptView({ ok: false, action: 'install', mechanism: null, detail: 'd', commands: [], at: 1 })?.detail).toBe('d')
  })

  it('normalises a failed attempt', () => {
    expect(bootAttemptView({
      ok: false,
      action: 'install',
      mechanism: 'launchd-agent',
      detail: 'Bootstrap failed: 5: Input/output error',
      commands: ['launchctl bootstrap gui/501 x.plist'],
      at: 1,
    })).toEqual({
      ok: false,
      action: 'install',
      detail: 'Bootstrap failed: 5: Input/output error',
      commands: ['launchctl bootstrap gui/501 x.plist'],
      // Carried, not dropped: the note is gated on the mechanism it was made for.
      mechanism: 'launchd-agent',
    })
  })

  it('normalises a successful uninstall and tolerates missing commands', () => {
    expect(bootAttemptView({
      ok: true,
      action: 'uninstall',
      mechanism: 'systemd-user',
      detail: 'removed',
      commands: undefined as unknown as string[],
      at: 2,
    })).toEqual({ ok: true, action: 'uninstall', detail: 'removed', commands: [], mechanism: 'systemd-user' })
  })
})

describe('bootMechanisms', () => {
  it('always leads with auto and lists the available mechanisms', () => {
    expect(bootMechanisms([candidate('systemd-system'), candidate('xdg-autostart')], 'auto'))
      .toEqual(['auto', 'systemd-system', 'xdg-autostart'])
  })

  it('hides the unsupported placeholder when a real mechanism exists', () => {
    expect(bootMechanisms([candidate('unsupported'), candidate('systemd-system')], 'auto'))
      .toEqual(['auto', 'systemd-system'])
  })

  it('keeps unsupported when it is the only thing available', () => {
    expect(bootMechanisms([candidate('unsupported')], 'auto')).toEqual(['auto', 'unsupported'])
  })

  it('skips unavailable candidates', () => {
    expect(bootMechanisms([candidate('systemd-user', false), candidate('systemd-system')], 'auto'))
      .toEqual(['auto', 'systemd-system'])
  })

  it('keeps the selected value selectable even when hidden', () => {
    expect(bootMechanisms([candidate('unsupported'), candidate('systemd-system')], 'unsupported'))
      .toEqual(['auto', 'systemd-system', 'unsupported'])
  })
})

describe('isSwitchingMechanism', () => {
  it('is false while nothing is installed', () => {
    expect(isSwitchingMechanism(null, 'auto')).toBe(false)
  })

  it('is true when the installed mechanism differs from the selection', () => {
    expect(isSwitchingMechanism('systemd-system', 'auto')).toBe(true)
    expect(isSwitchingMechanism('systemd-system', 'systemd-user')).toBe(true)
  })

  it('is false when the selection matches', () => {
    expect(isSwitchingMechanism('systemd-user', 'systemd-user')).toBe(false)
  })
})

describe('isStaleAttempt', () => {
  const failedInstall = bootAttemptView({ ok: false, action: 'install', mechanism: null, detail: 'x', commands: [], at: 1 })
  const failedUninstall = bootAttemptView({ ok: false, action: 'uninstall', mechanism: null, detail: 'x', commands: [], at: 1 })
  const okInstall = bootAttemptView({ ok: true, action: 'install', mechanism: null, detail: 'x', commands: [], at: 1 })

  it('hides a failed install once an entry exists', () => {
    expect(isStaleAttempt(failedInstall, 'enabled-running')).toBe(true)
    expect(isStaleAttempt(failedInstall, 'enabled-failing')).toBe(true)
    expect(isStaleAttempt(failedInstall, 'installed-disabled')).toBe(true)
  })

  it('keeps a failed install while nothing is installed', () => {
    expect(isStaleAttempt(failedInstall, 'not-installed')).toBe(false)
  })

  it('hides a failed uninstall once nothing is installed', () => {
    expect(isStaleAttempt(failedUninstall, 'not-installed')).toBe(true)
    expect(isStaleAttempt(failedUninstall, 'installed-disabled')).toBe(false)
  })

  it('never hides a success or an absent attempt', () => {
    expect(isStaleAttempt(okInstall, 'enabled-running')).toBe(false)
    expect(isStaleAttempt(null, 'enabled-running')).toBe(false)
  })
})

describe('visibleBootAttempt', () => {
  const failedInstall = (): BootAttemptView => bootAttemptView({
    ok: false,
    action: 'install',
    mechanism: null,
    detail: 'needs root',
    commands: ['sudo x'],
    at: 1,
  })!

  const fresh = (over: Partial<FreshBootAttempt> = {}): FreshBootAttempt => ({
    ok: false,
    action: 'install',
    detail: 'writing /Library/LaunchDaemons needs root',
    commands: ['sudo install -m 0644 /tmp/x.plist /Library/LaunchDaemons/x.plist'],
    state: 'not-installed',
    mechanism: null,
    ...over,
  })

  it('keeps a fresh refusal the live status still matches', () => {
    const refusal = fresh()
    expect(visibleBootAttempt(refusal, null, 'not-installed', null)).toBe(refusal)
  })

  // The reported case: the commands were run and Re-check now proves the entry,
  // so the "install failed" note must not sit there forever.
  it('retires a fresh refusal once the state it answered has moved', () => {
    expect(visibleBootAttempt(fresh(), null, 'enabled-running', 'launchd-daemon')).toBeNull()
  })

  it('retires a fresh refusal when only the mechanism moved', () => {
    const switching = fresh({ state: 'enabled-running', mechanism: 'launchd-agent' })
    expect(visibleBootAttempt(switching, null, 'enabled-running', 'launchd-agent')).toBe(switching)
    expect(visibleBootAttempt(switching, null, 'enabled-running', 'launchd-daemon')).toBeNull()
  })

  it('keeps a failed switch visible while the entry it kept is unmoved', () => {
    // An install refusal while a boot entry already exists is still news, unlike
    // the same persisted attempt.
    const refusal = fresh({ state: 'enabled-running', mechanism: 'launchd-agent' })
    expect(visibleBootAttempt(refusal, null, 'enabled-running', 'launchd-agent')).toBe(refusal)
  })

  it('falls back to the persisted attempt while it is still news', () => {
    const persisted = failedInstall()
    expect(visibleBootAttempt(null, persisted, 'not-installed', null)).toBe(persisted)
  })

  it('drops the persisted attempt the live state contradicts', () => {
    expect(visibleBootAttempt(null, failedInstall(), 'enabled-running', null)).toBeNull()
  })
})
