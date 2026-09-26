import { describe, expect, it } from 'vitest'
import { bootAttemptView, bootRefusal } from '../../src/client/boot.js'

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
    })).toEqual({ ok: true, action: 'uninstall', detail: 'removed', commands: [] })
  })
})
