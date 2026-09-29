/**
 * Which account a *system* entry runs the panel as.
 *
 * This is the bug the whole file exists for: `$USER` is root whenever the panel
 * was launched from a root shell or a root unit, so resolving the entry's user
 * from the environment wrote an entry that ran the panel as root — and a server
 * which refuses root then crash-loops for reasons nothing in the page explained.
 *
 * No user database is faked and no OS entry is touched: the account comes from
 * `/etc/passwd`, and every case here pins `uid` so the result never depends on
 * whoever happens to run the suite.
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { accountOf, bootUserName, currentUser } from '../../src/boot/common.js'
import { launchdPlist } from '../../src/boot/launchd.js'
import { systemdSystemUnit } from '../../src/boot/systemd.js'
import { cleanup, spec, tempHome } from './harness.js'

/** The first *login* account this machine actually has, so `User=` is real. */
function realAccount(): { name: string, home: string } {
  const row = fs.readFileSync('/etc/passwd', 'utf8')
    .split('\n')
    .map(line => line.split(':'))
    // The lowest login uid: `nobody` (65534) sits above it and owns `/`, which is
    // not a home a person's panel lives in.
    .find((fields) => {
      const uid = Number.parseInt(fields[2] ?? '', 10)
      return uid >= 1000 && uid < 60000 && (fields[0] ?? '').length > 0
    })
  if (row === undefined)
    throw new Error('this machine has no login account to resolve')
  return { name: row[0] ?? '', home: row[5] ?? '' }
}

const account = realAccount()

describe('account resolution', () => {
  it('follows SUDO_UID rather than the $USER sudo rewrote', () => {
    // The whole bug in one assertion: sudo sets USER=root, but SUDO_UID still
    // names the login that asked for it.
    const resolved = accountOf({ env: { USER: 'root', LOGNAME: 'root', SUDO_UID: String(1000) }, uid: 0 })
    expect(resolved?.name).not.toBe('root')
    expect(resolved?.root).toBe(false)
  })

  it('accepts the SUDO_USER name when the uid is not in the user database', () => {
    const resolved = accountOf({ env: { USER: 'root', SUDO_USER: 'someone', SUDO_UID: '424242' }, uid: 0 })
    // A login looked up nowhere (LDAP, a container): the uid is the fact, and the
    // home is deliberately unknown because `$HOME` is already root's.
    expect(resolved).toEqual({ name: 'someone', uid: 424242, home: null, root: false })
  })

  it('treats PKEXEC_UID the same way', () => {
    const resolved = accountOf({ env: { USER: 'root', PKEXEC_UID: '1000' }, uid: 0 })
    expect(resolved?.root).toBe(false)
  })

  it('uses a non-root login environment as itself', () => {
    const resolved = accountOf({ env: { USER: account.name, UID: '1000' }, uid: null })
    expect(resolved).toMatchObject({ name: account.name, root: false })
    expect(resolved?.home).not.toBeNull()
  })

  it('refuses to read the session name when the session says root', () => {
    // A root shell's `USER=root` is the silent default, never a choice: an entry
    // must not inherit it as if somebody had picked it.
    const resolved = accountOf({ env: { USER: 'root', LOGNAME: 'root' }, uid: 0 })
    expect(resolved).toMatchObject({ name: 'root', root: true })
  })

  it('falls back to the owner of a state path when nothing names a person', () => {
    const resolved = accountOf({ env: {}, uid: 0, ownerPaths: ['/nonexistent-xyz', '/etc'] })
    expect(resolved).toEqual({ name: 'root', uid: 0, home: '/root', root: true })
  })

  it('reads the panel root\'s owner from a root shell with no elevating tool', () => {
    // `USER=root` with no `SUDO_UID`: a root shell or a root systemd unit starting
    // this dsh. The uid is honestly 0, so the *files* are what say whose panel it
    // is — a root passwd row must not short-circuit that answer.
    const owner = accountOf({ env: { USER: 'root', HOME: '/root', LOGNAME: 'root' }, uid: 0, ownerPaths: ['/tmp', '/etc'] })
    expect(owner?.root).toBe(true)
    expect(owner?.name).toBe('root')
    // And when a real panel root is readable, it names its owner instead.
    const dir = tempHome()
    try {
      fs.chownSync(dir, 1000, 1000)
      const resolved = accountOf({ env: { USER: 'root', LOGNAME: 'root' }, uid: 0, ownerPaths: [dir, '/etc'] })
      expect(resolved?.uid).toBe(1000)
      expect(resolved?.root).toBe(false)
      expect(resolved?.name).toBe(account.name)
    }
    finally {
      cleanup(dir)
    }
  })

  it('reports the uid behind $UID without reading the process', () => {
    expect(accountOf({ env: { UID: '1000' }, uid: 0 })?.uid).toBe(1000)
  })

  it('never offers root as a login-scoped user', () => {
    expect(currentUser({ env: { USER: 'root' }, uid: 0 })).toBeNull()
    expect(currentUser({ env: { USER: account.name, UID: '1000' }, uid: null })).toBe(account.name)
  })

  it('warns loudly and writes no name when the only account is root', () => {
    const warnings: string[] = []
    const ctx = { env: { USER: 'root' }, uid: 0, warn: (line: string) => warnings.push(line) }
    expect(bootUserName(ctx)).toBeNull()
    expect(warnings.join('\n')).toMatch(/root/)
  })
})

describe('an entry never runs the panel as root', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  it('drops User= rather than writing User=root', () => {
    const unit = systemdSystemUnit(spec(), 'root')
    expect(unit).not.toMatch(/^User=/m)
    expect(unit).not.toContain('User=root')
    expect(unit).toContain('KillMode=process')
  })

  it('writes User= for the account the elevating login named', () => {
    const unit = systemdSystemUnit(spec(), account.name)
    expect(unit.split('\n')).toContain(`User=${account.name}`)
    expect(unit.indexOf(`User=${account.name}`)).toBeLessThan(unit.indexOf('Type=exec'))
  })

  it('names the invoking account for a LaunchDaemon, never root', () => {
    const daemon = launchdPlist(spec({ logDir: path.join(home, 'logs') }), { userName: account.name })
    expect(daemon).toContain(`<string>${account.name}</string>`)
    expect(daemon).not.toContain('<string>root</string>')
  })
})
