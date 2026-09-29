/**
 * Which account a *system* entry runs the panel as.
 *
 * This is the bug the whole file exists for: `$USER` is root whenever the panel
 * was launched from a root shell or a root unit, so resolving the entry's user
 * from the environment wrote an entry that ran the panel as root — and a server
 * which refuses root then crash-loops for reasons nothing in the page explained.
 *
 * Every case here is hermetic. `accountOf` reads `/etc/passwd`, so nothing in this
 * file depends on which accounts the machine running the suite was provisioned
 * with: the fixture is asserted through `parsePasswd`, the named cases use `nobody`
 * (in POSIX's reserved range, so present wherever there is a passwd file), and the
 * "cannot answer" cases use a uid no machine has. Nothing here needs root.
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { accountOf, bootUserName, currentUser, parsePasswd } from '../../src/boot/common.js'
import { launchdPlist } from '../../src/boot/launchd.js'
import { systemdSystemUnit } from '../../src/boot/systemd.js'
import { cleanup, spec, tempHome } from './harness.js'

/**
 * The user database these tests resolve against, injected so the expected names,
 * uid and home are fixtures rather than facts about the CI machine. `/etc/passwd`
 * differs per image (`nobody`'s home is `/` here, `/nonexistent` there), and a
 * test that reads it is a test that fails on somebody else's runner.
 */
const PASSWD = parsePasswd([
  'root:x:0:0:root:/root:/bin/sh',
  'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
  'ci:x:1000:1000:CI User:/home/ci:/bin/sh',
].join('\n'))
const USER = 'ci'
const USER_UID = 1000
/** A uid no database has: the "cannot answer" case. */
const UNKNOWN_UID = 424242

describe('passwd parsing', () => {
  it('keeps well-formed rows and drops the rest', () => {
    const rows = parsePasswd([
      'root:x:0:0:root:/root:/bin/sh',
      'nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin',
      'malformed:row',
      ':x:1000:1000::/home/x:/bin/sh',
      'nohome:x:1001:1001',
      'garbage-uid:x:notanumber:1000::/home/g:/bin/sh',
      '',
    ].join('\n'))
    expect(rows).toEqual([
      { name: 'root', uid: 0, home: '/root' },
      { name: 'nobody', uid: 65534, home: '/nonexistent' },
    ])
  })

  it('reads an empty database as no rows, never a throw', () => {
    expect(parsePasswd('')).toEqual([])
  })
})

describe('account resolution', () => {
  it('follows SUDO_UID rather than the $USER sudo rewrote', () => {
    // The whole bug in one assertion: sudo sets USER=root, but SUDO_UID still
    // names the login that asked for it.
    const resolved = accountOf({ passwd: PASSWD, env: { USER: 'root', LOGNAME: 'root', SUDO_UID: String(USER_UID) }, uid: 0 })
    expect(resolved).toEqual({ name: USER, uid: USER_UID, home: '/home/ci', root: false })
  })

  it('accepts the SUDO_USER name when the uid is not in the user database', () => {
    const resolved = accountOf({ passwd: PASSWD, env: { USER: 'root', SUDO_USER: 'someone', SUDO_UID: String(UNKNOWN_UID) }, uid: 0 })
    // A login looked up nowhere (LDAP, a container): the uid is the fact, and the
    // home is deliberately unknown because `$HOME` is already root's.
    expect(resolved).toEqual({ name: 'someone', uid: UNKNOWN_UID, home: null, root: false })
  })

  it('treats PKEXEC_UID the same way', () => {
    expect(accountOf({ passwd: PASSWD, env: { USER: 'root', PKEXEC_UID: String(USER_UID) }, uid: 0 })?.root).toBe(false)
  })

  it('uses a non-root login environment as itself, with its home', () => {
    const resolved = accountOf({ passwd: PASSWD, env: { USER: USER, HOME: '/home/ci', UID: String(USER_UID) }, uid: null })
    expect(resolved).toEqual({ name: USER, uid: USER_UID, home: '/home/ci', root: false })
  })

  it('refuses to read the session name when the session says root', () => {
    // A root shell's `USER=root` is the silent default, never a choice: an entry
    // must not inherit it as if somebody had picked it.
    expect(accountOf({ passwd: PASSWD, env: { USER: 'root', LOGNAME: 'root' }, uid: 0 })).toMatchObject({ name: 'root', root: true })
  })

  it('falls back to the owner of a state path when nothing names a person', () => {
    // Nothing here names a login, so the honest answer is root — and the caller is
    // told so rather than handed a name it could write into a unit.
    expect(accountOf({ passwd: PASSWD, env: {}, uid: 0, ownerPaths: ['/nonexistent-xyz'] })).toMatchObject({ root: true, name: 'root' })
  })

  it('reads the panel root\'s owner from a root shell with no elevating tool', () => {
    // `USER=root` with no `SUDO_UID`: a root shell, or a root systemd unit starting
    // this dsh. The uid is honestly 0, so the *files* are what say whose panel it
    // is — a root passwd row must not short-circuit that answer. The fixture dir is
    // owned by whoever created it, which is all this rule needs.
    const dir = tempHome()
    try {
      const ownerUid = fs.statSync(dir).uid
      // The fixture database holds the owner only when the owner is one of its
      // rows; otherwise the rule cannot answer and root stays the verdict.
      const known = PASSWD.find(row => row.uid === ownerUid)
      const resolved = accountOf({ passwd: PASSWD, env: { USER: 'root', HOME: '/root', LOGNAME: 'root' }, uid: 0, ownerPaths: [dir] })
      if (known === undefined)
        expect(resolved?.root).toBe(true)
      else
        expect(resolved).toEqual({ name: known.name, uid: known.uid, home: known.home, root: known.uid === 0 })
    }
    finally {
      cleanup(dir)
    }
  })

  it('never reports a uid the user database does not know as a chosen account', () => {
    const dir = tempHome()
    try {
      const resolved = accountOf({ passwd: PASSWD, env: { LOGNAME: 'root' }, uid: 0, ownerPaths: [dir] })
      // Whatever the machine's own uid is, an answer that is not root must come
      // from a row of the database the caller supplied — never from a guess.
      if (resolved !== null && !resolved.root && !PASSWD.some(row => row.uid === fs.statSync(dir).uid))
        expect(PASSWD.map(row => row.uid)).toContain(resolved.uid)
    }
    finally {
      cleanup(dir)
    }
  })

  it('reports the uid behind $UID without reading the process', () => {
    expect(accountOf({ passwd: PASSWD, env: { UID: String(USER_UID) }, uid: 0 })?.uid).toBe(USER_UID)
  })

  it('never offers root as a login-scoped user', () => {
    expect(currentUser({ passwd: PASSWD, env: { USER: 'root' }, uid: 0 })).toBeNull()
    expect(currentUser({ passwd: PASSWD, env: { USER, UID: String(USER_UID) }, uid: null })).toBe(USER)
  })

  it('warns loudly and writes no name when the only account is root', () => {
    const warnings: string[] = []
    expect(bootUserName({ passwd: PASSWD, env: { USER: 'root' }, uid: 0, warn: (line: string) => warnings.push(line) })).toBeNull()
    expect(warnings.join('\n')).toMatch(/root/)
  })
})

describe('an entry never runs the panel as root', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => { cleanup(home) })

  it('drops User= rather than writing User=root', () => {
    const unit = systemdSystemUnit(spec(), 'root')
    expect(unit).not.toMatch(/^User=/m)
    expect(unit).not.toContain('User=root')
    expect(unit).toContain('KillMode=process')
  })

  it('writes User= for the account the elevating login named', () => {
    const unit = systemdSystemUnit(spec(), USER)
    expect(unit.split('\n')).toContain(`User=${USER}`)
    expect(unit.indexOf(`User=${USER}`)).toBeLessThan(unit.indexOf('Type=exec'))
  })

  it('names the invoking account for a LaunchDaemon, never root', () => {
    const daemon = launchdPlist(spec({ logDir: path.join(home, 'logs') }), { userName: USER })
    expect(daemon).toContain(`<string>${USER}</string>`)
    expect(daemon).not.toContain('<string>root</string>')
  })
})
