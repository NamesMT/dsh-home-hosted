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
import { accountOf, bootUserName, currentUser, parsePasswd, uidOf } from '../../src/boot/common.js'
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

  /**
   * A uid field that is *partly* numeric is the case `notanumber` above does not reach:
   * `Number.parseInt` takes a prefix, so `1000abc` became uid 1000 — a plausible
   * account `accountOf` would then name, and that name becomes `User=` in a generated
   * boot unit. Verified before the fix: the row survived as uid 1000 and `accountOf`
   * returned it. A dropped row is honest; a wrong account is not.
   */
  it('drops a uid field that is only partly numeric, rather than reading its prefix', () => {
    const rows = parsePasswd([
      'real:x:1000:1000:Real:/home/real:/bin/sh',
      'prefix:x:1000abc:1000:Odd:/home/odd:/bin/sh',
      'zerohex:x:0x10:1000:Hex:/home/hex:/bin/sh',
      'exp:x:1e3:1000:Exp:/home/exp:/bin/sh',
    ].join('\n'))
    expect(rows).toEqual([{ name: 'real', uid: 1000, home: '/home/real' }])
    // And the malformed row can no longer be resolved as anybody's account.
    const resolved = accountOf({ passwd: rows, env: {}, uid: 1000 })
    expect(resolved?.name).toBe('real')
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
    expect(resolved).toEqual({ name: USER, uid: USER_UID, home: '/home/ci', root: false, verified: true })
  })

  it('accepts the SUDO_USER name when the uid is not in the user database', () => {
    const resolved = accountOf({ passwd: PASSWD, env: { USER: 'root', SUDO_USER: 'someone', SUDO_UID: String(UNKNOWN_UID) }, uid: 0 })
    // A login looked up nowhere (LDAP, a container): the uid is the fact, the home
    // is deliberately unknown because `$HOME` is already root's, and `verified`
    // records that nothing here can place the name — so no `User=` is written.
    expect(resolved).toEqual({ name: 'someone', uid: UNKNOWN_UID, home: null, root: false, verified: false })
  })

  it('treats PKEXEC_UID the same way', () => {
    expect(accountOf({ passwd: PASSWD, env: { USER: 'root', PKEXEC_UID: String(USER_UID) }, uid: 0 })?.root).toBe(false)
  })

  it('uses a non-root login environment as itself, with its home', () => {
    const resolved = accountOf({ passwd: PASSWD, env: { USER: USER, HOME: '/home/ci', UID: String(USER_UID) }, uid: null })
    expect(resolved).toEqual({ name: USER, uid: USER_UID, home: '/home/ci', root: false, verified: true })
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
        expect(resolved).toMatchObject({ name: known.name, uid: known.uid, root: known.uid === 0 })
    }
    finally {
      cleanup(dir)
    }
  })

  /**
   * A database that does **not** hold the directory's owner is the case the name
   * describes, and the previous version could never reach it: `PASSWD` deliberately
   * contains uid 1000 (the CI user) while a `tempHome()` directory is owned by whoever
   * runs the suite, so its guard was false on every machine and the test asserted
   * nothing. Here the owner is deliberately absent from the supplied rows, so the
   * question is actually asked: no account may be invented from that uid.
   */
  it('never reports a uid the user database does not know as a chosen account', () => {
    const dir = tempHome()
    try {
      const ownerUid = fs.statSync(dir).uid
      const rootOnly = parsePasswd('root:x:0:0:root:/root:/bin/sh')
      const resolved = accountOf({ passwd: rootOnly, env: { LOGNAME: 'root', USER: 'root' }, uid: 0, ownerPaths: [dir] })
      // Forced: the fixture cannot accidentally describe the owner, so the assertion
      // below always has a real answer to judge.
      expect(rootOnly.some(row => row.uid === ownerUid)).toBe(false)
      // Root or nothing is acceptable; an account derived from the owner's uid is not,
      // since that uid is exactly what the database could not confirm.
      if (resolved !== null)
        expect(resolved.uid, 'a uid the database does not hold was reported as an account').not.toBe(ownerUid)
    }
    finally {
      cleanup(dir)
    }
  })

  it('does not let $UID override the uid this process actually has', () => {
    // `$UID` is a shell variable rather than an exported one, so when it is present
    // at all it was inherited — and it also feeds launchd's `gui/$UID` domain. The
    // process is the fact.
    expect(accountOf({ passwd: PASSWD, env: { USER: USER, UID: '0' }, uid: USER_UID })?.uid).toBe(USER_UID)
    expect(accountOf({ passwd: PASSWD, env: { USER: USER, UID: '99999999' }, uid: USER_UID })?.uid).toBe(USER_UID)
    // It is still the only uid available when the platform gives none.
    expect(accountOf({ passwd: PASSWD, env: { USER: USER, UID: String(USER_UID) }, uid: null })?.uid).toBe(USER_UID)
  })

  it('prefers the database row for the uid over a name that names nobody', () => {
    // A typo'd or stale `$USER` must not become `User=<typo>`: systemd cannot
    // resolve it and refuses to start the unit (status=217/USER).
    const resolved = accountOf({ passwd: PASSWD, env: { USER: 'ghost' }, uid: USER_UID })
    expect(resolved).toEqual({ name: USER, uid: USER_UID, home: '/home/ci', root: false, verified: true })
  })

  it('marks a name the database cannot place, and the login-scoped path keeps it', () => {
    // No row for the uid either, so nothing can place the name: it is marked
    // unverified (the writer then refuses it) but a login-scoped mechanism may
    // still use it, because those trust the session they are running in.
    const resolved = accountOf({ passwd: PASSWD, env: { USER: 'ghost' }, uid: UNKNOWN_UID })
    expect(resolved).toMatchObject({ name: 'ghost', uid: UNKNOWN_UID, verified: false })
    expect(currentUser({ passwd: PASSWD, env: { USER: 'ghost' }, uid: UNKNOWN_UID })).toBe('ghost')
  })

  it('a stale elevating uid falls through instead of collapsing to root', () => {
    // `SUDO_UID`/`PKEXEC_UID` inherited from an ancestor must not pre-empt a login
    // this process can still name: the outcome would be no `User=` at all, i.e.
    // the panel as root, with nothing said.
    const resolved = accountOf({ passwd: PASSWD, env: { SUDO_UID: '99999999', USER: USER, LOGNAME: USER }, uid: 0 })
    expect(resolved).toMatchObject({ name: USER, verified: true })
    expect(resolved?.root).toBe(false)
    // With no name beside it, a root process is honestly root.
    expect(accountOf({ passwd: PASSWD, env: { SUDO_UID: '99999999' }, uid: 0 })).toMatchObject({ root: true })
  })

  it('treats an uppercase ROOT session as root, not as a login', () => {
    // systemd matches names case-sensitively, so `User=ROOT` is a 217/USER refusal
    // — and it is not a login either way.
    expect(accountOf({ passwd: PASSWD, env: { USER: 'ROOT' }, uid: 0 })).toMatchObject({ root: true })
    expect(currentUser({ passwd: PASSWD, env: { USER: 'ROOT' }, uid: 0 })).toBeNull()
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

  it('warns just as loudly when no account resolves at all', () => {
    // No account and `root` have the same runtime outcome — the entry runs as
    // root — so the silent one must not be the quiet one.
    const warnings: string[] = []
    const ctx = { passwd: PASSWD, env: { UID: String(UNKNOWN_UID) }, uid: null, warn: (line: string) => warnings.push(line) }
    expect(bootUserName(ctx)).toBeNull()
    expect(warnings.join('\n')).toMatch(/run the panel as root/)
  })

  it('refuses a name it cannot place in the user database', () => {
    // systemd cannot resolve it, so the unit would refuse to start and crash-loop.
    const warnings: string[] = []
    const ctx = { passwd: PASSWD, env: { USER: 'ghost' }, uid: UNKNOWN_UID, warn: (line: string) => warnings.push(line) }
    expect(bootUserName(ctx)).toBeNull()
    expect(warnings.join('\n')).toMatch(/217\/USER|user database/)
  })

  it('refuses a name that would inject a directive into the unit', () => {
    // `User=` is unquoted, so a newline in the name ends the line and the rest of
    // it becomes another directive. `evil\nUser=root` is the worst shape: systemd
    // takes the LAST `User=`, so it resolves to root — the exact bug this commit
    // exists to prevent, written by this commit's own code.
    const warnings: string[] = []
    const hostile = 'evil\nUser=root'
    // No row for the uid, so the hostile session name is what would be written.
    for (const env of [{ SUDO_USER: hostile, SUDO_UID: '0' }, { USER: hostile }, { LOGNAME: hostile }]) {
      const name = bootUserName({ passwd: PASSWD, env, uid: UNKNOWN_UID, warn: (line: string) => warnings.push(line) })
      expect(name).toBeNull()
      expect(systemdSystemUnit(spec(), name)).not.toMatch(/^User=/m)
    }
    expect(warnings.join('\n')).toMatch(/not a usable user name/)
  })

  it('writes no User= line at all for an empty name', () => {
    expect(systemdSystemUnit(spec(), '')).not.toMatch(/^User=/m)
  })

  it('rejects an unusable name at the writer, not only at the resolver', () => {
    // Defense in depth: a caller that reaches the generator directly cannot get a
    // hostile value into the file either.
    expect(() => systemdSystemUnit(spec(), 'evil\nUser=root')).toThrow(/user name/)
    expect(() => launchdPlist(spec(), { userName: 'evil\nUser=root' })).toThrow(/user name/)
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

  it('writes no UserName key for an empty name, rather than a root daemon', () => {
    // launchd with no `UserName` runs as root, so an empty name must be treated as
    // "no name" — which the caller refuses — never as a directive with no value.
    const daemon = launchdPlist(spec({ logDir: path.join(home, 'logs') }), { userName: '  ' })
    expect(daemon).not.toContain('<key>UserName</key>')
  })
})

/**
 * The uid a launchd domain is addressed by. `accountOf` already treats `$UID` as a
 * claim and the process as the fact; `uidOf` must agree, or a stale exported `$UID`
 * picks the wrong `gui/<uid>` domain — silently degrading an install to "loads at
 * the next login", or addressing another user's domain.
 */
describe('the uid a launchd domain uses', () => {
  it('prefers the process uid over an inherited $UID', () => {
    expect(uidOf({ uid: 1000, env: { UID: '0' } } as never)).toBe('1000')
  })

  it('falls back to $UID only when the platform gives no uid', () => {
    expect(uidOf({ uid: null, env: { UID: '1000' } } as never)).toBe('1000')
  })

  it('answers nothing when neither is available', () => {
    expect(uidOf({ uid: null, env: {} } as never)).toBeNull()
  })
})
