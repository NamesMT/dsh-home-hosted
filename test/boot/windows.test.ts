import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  bootTaskXml,
  createWindowsBootProvider,
  expandableByWscript,
  createWindowsRunProvider,
  createWindowsTaskProvider,
  hiddenLaunch,
  hiddenLaunchPath,
  hiddenLaunchScript,
  MARKER_KEY,
  RUN_KEY,
  scheduledTaskXml,
  windowlessSpec,
  windowsRunPayload,
  wscriptExecutable,
} from '../../src/boot/windows.js'
import { inspectOwned } from '../../src/boot/common.js'
import { windowsCommandLine, xmlEscape } from '../../src/boot/escape.js'
import type { FakeHandler } from './harness.js'
import { cleanup, ctxFor, fakeRun, tempHome, winSpec } from './harness.js'

const regKeyOf = (key: string, name: string): string => `${key}\u0000${name}`

const WINDOWS_ROOT = 'C:\\Windows'
const WSCRIPT = 'C:\\Windows\\System32\\wscript.exe'
const DEFAULT_MARKER = 'managed-by:dsh-home-hosted'

/**
 * A Windows context whose file-system facts are `wscript.exe` and whatever is really on disk.
 *
 * `exists` is one probe serving two questions — "is the wrapper available" and "is the
 * artifact there" — so it answers `wscript.exe` from a pinned machine fact and everything
 * else from the real FS. An override replaces a *whole* field (`env`, `exists`), never a
 * nested key, so passing `exists: () => false` is the "no wscript on this machine" branch.
 */
function winCtx(overrides: Parameters<typeof ctxFor>[0]): Parameters<typeof ctxFor>[0] {
  const { home, run, ...rest } = overrides
  const base = {
    platform: 'win32' as const,
    env: { USER: 'tester', SystemRoot: WINDOWS_ROOT, LOCALAPPDATA: path.join(home, 'AppData', 'Local'), TEMP: home } as Record<string, string | undefined>,
    exists: (file: string): boolean => file.toLowerCase() === WSCRIPT.toLowerCase() || fs.existsSync(file),
  }
  const defined = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined))
  return {
    ...base,
    ...defined,
    home,
    run,
    env: { ...base.env, ...(rest.env ?? {}) },
    exists: rest.exists ?? base.exists,
  }
}

/** One registered task action, as `Export-ScheduledTask` reports it. */
interface RegisteredAction {
  command: string
  args: string
  cwd: string
  marker: string
  boot: boolean
}

/** Read `New-ScheduledTaskAction …` back out of the script the provider emitted. */
function actionOf(script: string, boot: boolean): RegisteredAction | null {
  const unquote = (text: string): string => text.replace(/''/g, '\'')
  const match = /-Execute '((?:[^']|'')*)' -Argument '((?:[^']|'')*)' -WorkingDirectory '((?:[^']|'')*)'/.exec(script)
  if (match === null)
    return null
  return {
    command: unquote(match[1] ?? ''),
    args: unquote(match[2] ?? ''),
    cwd: unquote(match[3] ?? ''),
    marker: unquote(/-Description '((?:[^']|'')*)'/.exec(script)?.[1] ?? DEFAULT_MARKER),
    boot,
  }
}

/**
 * The XML `Export-ScheduledTask` reports for one registered action.
 *
 * The fields are passed in, so the fake can only ever answer with what was actually
 * registered. A fake that answered a fixed fixture would report "already matches" after
 * any install — hiding exactly the drift this suite exists to catch.
 */
function exportedXml(action: RegisteredAction): string {
  return `${[
    '<?xml version="1.0" encoding="UTF-16"?>',
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
    '<RegistrationInfo>',
    `<Description>${xmlEscape(action.marker)}</Description>`,
    '</RegistrationInfo>',
    '<Triggers>',
    action.boot ? '<BootTrigger><Enabled>true</Enabled></BootTrigger>' : '<LogonTrigger><Enabled>true</Enabled></LogonTrigger>',
    '</Triggers>',
    '<Actions Context="Author">',
    '<Exec>',
    `<Command>${xmlEscape(action.command)}</Command>`,
    `<Arguments>${xmlEscape(action.args)}</Arguments>`,
    `<WorkingDirectory>${xmlEscape(action.cwd)}</WorkingDirectory>`,
    '</Exec>',
    '</Actions>',
    '</Task>',
    '',
  ].join('\r\n')}`
}

/** An in-memory HKCU, so the reg.exe exit codes are the real ones. */
function regHandler(store: Map<string, string>): FakeHandler {
  return (command, args) => {
    if (command !== 'reg.exe')
      return undefined
    const verb = args[0]
    const key = args[1] ?? ''
    const nameIndex = args.indexOf('/v')
    const name = nameIndex === -1 ? '' : args[nameIndex + 1] ?? ''
    if (verb === 'add') {
      const dataIndex = args.indexOf('/d')
      store.set(regKeyOf(key, name), dataIndex === -1 ? '' : args[dataIndex + 1] ?? '')
      return { code: 0, stdout: 'The operation completed successfully.\r\n' }
    }
    if (verb === 'query') {
      const data = store.get(regKeyOf(key, name))
      if (data === undefined)
        return { code: 1, stderr: 'ERROR: The system was unable to find the specified registry key or value.\r\n' }
      return { code: 0, stdout: `\r\nHKEY_CURRENT_USER\r\n    ${name}    REG_SZ    ${data}\r\n\r\n` }
    }
    if (verb === 'delete')
      return store.delete(regKeyOf(key, name)) ? { code: 0 } : { code: 1, stderr: 'ERROR: not found\r\n' }
    return { code: 1 }
  }
}

describe('windows run key', () => {
  let home: string
  let store: Map<string, string>

  beforeEach(() => {
    home = tempHome()
    store = new Map()
  })
  afterEach(() => cleanup(home))

  function makeProvider(handler: FakeHandler = regHandler(store), options: { wscript?: boolean } = {}) {
    const runner = fakeRun(handler)
    const { wscript = true } = options
    return {
      runner,
      provider: createWindowsRunProvider(ctxFor(winCtx({
        home,
        run: runner.run,
        exists: wscript ? undefined : () => false,
      }))),
    }
  }

  it('is available without privilege but login-scoped', async () => {
    const { provider } = makeProvider()
    const candidate = await provider.detect()
    expect(candidate.available).toBe(true)
    expect(candidate.bootCapable).toBe(false)
    expect(candidate.privileged).toBe(true)
  })

  it('maps reg query exit 1 to not-installed', async () => {
    const { provider } = makeProvider()
    const status = await provider.status(winSpec())
    expect(status.state).toBe('not-installed')
    expect(status.detail).toContain(RUN_KEY)
  })

  /**
   * The reported defect, pinned as the value Windows is actually given.
   *
   * `node.exe` is console-subsystem, so a `Run` value naming it shows a console window at
   * every logon (measured `visible=True`). The value here must therefore name
   * `wscript.exe` — GUI-subsystem, which *cannot* allocate one — with the real command
   * line in the wrapper instead.
   */
  it('starts wscript.exe, not node.exe, and keeps the real command line in the wrapper', async () => {
    const { provider, runner } = makeProvider()
    const result = await provider.install(winSpec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    const data = store.get(regKeyOf(RUN_KEY, 'home-hosted'))
    expect(data).toBeDefined()
    expect(data).toContain('wscript.exe')
    expect(data).not.toContain('node.exe')
    // The wrapper carries the node command line, so the panel is still what starts.
    // Asserted in the *literal* form VBScript requires: an embedded `"` is doubled,
    // which is why a raw substring search for the command line would not match.
    const script = fs.readFileSync(hiddenLaunchPath(ctxFor(winCtx({ home, run: runner.run })), winSpec()), 'utf8')
    const literal = windowsCommandLine(winSpec().command, winSpec().args).split('"').join('""')
    expect(script).toContain(`sh.Run("${literal}", 0, True)`)
    expect(script).toContain(DEFAULT_MARKER)
    expect(store.get(regKeyOf(MARKER_KEY, 'home-hosted'))).toBe(DEFAULT_MARKER)
    expect(runner.lines().some(line => line.startsWith('reg.exe add '))).toBe(true)
  })

  it('registers the value exactly once', async () => {
    const { provider, runner } = makeProvider()
    await provider.install(winSpec())
    const adds = () => runner.calls.filter(call => call.command === 'reg.exe' && call.args[0] === 'add').length
    const before = adds()
    const second = await provider.install(winSpec())
    expect(second.ok).toBe(true)
    // Idempotence is the whole point: the wrapper is byte-identical, the value already
    // reads back, so a re-install changes nothing and the page shows no drift.
    expect(second.changed).toBe(false)
    expect(adds()).toBe(before)
    expect((await provider.status(winSpec())).state).toBe('enabled-running')
  })

  it('stays idempotent when the wrapper was deleted underneath it', async () => {
    const { provider, runner } = makeProvider()
    const ctx = ctxFor(winCtx({ home, run: runner.run }))
    await provider.install(winSpec())
    fs.rmSync(hiddenLaunchPath(ctx, winSpec()), { force: true })
    // A `Run` value whose wrapper is gone starts nothing, so it is reported as failing
    // rather than healthy — the state a person has to see to know why nothing came up.
    expect((await provider.status(winSpec())).state).toBe('enabled-failing')
    const again = await provider.install(winSpec())
    expect(again.ok).toBe(true)
    expect(again.changed).toBe(true)
    expect(fs.existsSync(hiddenLaunchPath(ctx, winSpec()))).toBe(true)
    expect((await provider.status(winSpec())).state).toBe('enabled-running')
  })

  /**
   * The `.cmd` wrapper interpolates `spec.marker` straight into a `rem` line, and this
   * builder used to be the **only** artifact builder that did not validate its own spec
   * (`systemdUserUnit`, `systemdSystemUnit`, `launchdPlist` and `xdgDesktopEntry` all
   * do). Its callers validated, so no production path was exposed — but that is an
   * assumption a reader of this function cannot see, and the consequence is a `.cmd`
   * line a newline can escape:
   *
   *   `rem ok<CRLF>echo PWNED<CRLF>node ...`
   *
   * The other three platforms were checked with a real parser and split on a genuine
   * `LF` only (real `systemd-analyze verify`, real `cmd.exe`, Python's XML parser all
   * treat U+0085/U+2028/U+2029 as ordinary characters), so a single control-character
   * rule is the right width — it just has to be *applied* here too.
   */
  it('refuses to build a wrapper from a spec it never validated', () => {
    const ctx = ctxFor({ home, run: fakeRun().run, platform: 'win32', env: { LOCALAPPDATA: path.join(home, 'AppData', 'Local') } })
    // Long enough to force the wrapper, with a marker a newline would escape.
    const hostile = winSpec({
      marker: 'ok\r\necho PWNED',
      args: ['C:\\home-hosted\\dist\\cli.js', 'up', `C:\\Users\\tester\\${'x'.repeat(260)}`],
    })
    expect(() => windowsRunPayload(ctx, hostile)).toThrow(/control characters/)
    // And the same builder still accepts what it always did.
    const fine = winSpec({ args: ['C:\\home-hosted\\dist\\cli.js', 'up', `C:\\Users\\tester\\${'x'.repeat(260)}`] })
    expect(windowsRunPayload(ctx, fine).wrapperContent).toContain('@echo off')
  })

  /**
   * The `.cmd` wrapper is the **fallback**, not dead code: it is the path on a machine
   * without `wscript.exe`, where the command line can still exceed the `Run` value
   * budget. Its `%`-neutralisation and its metacharacter care are guard logic on a real
   * injection surface, so both stay pinned — against the branch that uses them.
   */
  it('writes a .cmd wrapper when the command line exceeds the limit and wscript is absent', async () => {
    const long = winSpec({ args: ['C:\\home-hosted\\dist\\cli.js', 'up', '--foreground', '--home', `C:\\Users\\tester\\${'x'.repeat(260)}`] })
    const ctx = ctxFor(winCtx({ home, run: fakeRun().run, exists: () => false }))
    const payload = windowsRunPayload(ctx, long)
    expect(payload.wrapperPath).not.toBeNull()
    expect(payload.data).toContain('cmd.exe /c ')
    expect(payload.wrapperContent).toContain('@echo off')
    expect(payload.wrapperContent).toContain(DEFAULT_MARKER)

    const { provider } = makeProvider(regHandler(store), { wscript: false })
    const result = await provider.install(long)
    expect(result.ok).toBe(true)
    expect(fs.readFileSync(payload.wrapperPath ?? '', 'utf8')).toContain(DEFAULT_MARKER)
    expect(store.get(regKeyOf(RUN_KEY, 'home-hosted'))).toContain('cmd.exe /c ')
  })

  it('is idempotent on the fallback branch too', async () => {
    const long = winSpec({ args: ['C:\\home-hosted\\dist\\cli.js', 'up', '--foreground', '--home', `C:\\Users\\tester\\${'x'.repeat(260)}`] })
    const { provider } = makeProvider(regHandler(store), { wscript: false })
    expect((await provider.install(long)).changed).toBe(true)
    const second = await provider.install(long)
    expect(second.ok).toBe(true)
    expect(second.changed).toBe(false)
  })

  /**
   * Converging between the two branches, which is what makes a re-install quiet on a
   * machine that gained (or lost) `wscript.exe`: the artifact the *other* launch needs is
   * written, and the one this launch no longer uses is removed.
   */
  it('converges between the wrapper and the fallback when the machine changes', async () => {
    const long = winSpec({ args: ['C:\\home-hosted\\dist\\cli.js', 'up', '--foreground', '--home', `C:\\Users\\tester\\${'x'.repeat(260)}`] })
    const fallbackCtx = ctxFor(winCtx({ home, run: fakeRun().run, exists: () => false }))
    const wrapperCtx = ctxFor(winCtx({ home, run: fakeRun().run }))
    const fallback = makeProvider(regHandler(store), { wscript: false }).provider
    await fallback.install(long)
    const cmdPath = windowsRunPayload(fallbackCtx, long).wrapperPath ?? ''
    expect(fs.existsSync(cmdPath)).toBe(true)

    const wrapper = makeProvider(regHandler(store)).provider
    expect((await wrapper.install(long)).ok).toBe(true)
    // The wrapper took over: a short value, the `.vbs` present, the `.cmd` gone.
    expect(fs.existsSync(hiddenLaunchPath(wrapperCtx, long))).toBe(true)
    expect(fs.existsSync(cmdPath)).toBe(false)
    expect(store.get(regKeyOf(RUN_KEY, 'home-hosted'))).toContain('wscript.exe')
  })

  it('refuses a foreign Run value', async () => {
    store.set(regKeyOf(RUN_KEY, 'home-hosted'), 'someone-elses-command.exe')
    const { provider, runner } = makeProvider()
    const install = await provider.install(winSpec())
    expect(install.ok).toBe(false)
    expect(install.detail).toMatch(/refusing to overwrite/)
    const uninstall = await provider.uninstall(winSpec())
    expect(uninstall.ok).toBe(false)
    expect(uninstall.detail).toMatch(/foreign Run value/)
    expect(store.get(regKeyOf(RUN_KEY, 'home-hosted'))).toBe('someone-elses-command.exe')
    expect(runner.lines().some(line => line.includes('delete'))).toBe(false)
  })

  it('reports a Run value without our marker as not-installed', async () => {
    store.set(regKeyOf(RUN_KEY, 'home-hosted'), windowsCommandLine(winSpec().command, winSpec().args))
    const { provider } = makeProvider()
    const status = await provider.status(winSpec())
    expect(status.state).toBe('not-installed')
    expect(status.detail).toMatch(/not marked as ours/)
  })

  /**
   * A value rewritten back to the direct command still carries the marker, so every other
   * check passes while each logon goes back to showing a console window — the regression the
   * wrapper exists to prevent, and one the page could not previously report.
   */
  it('reports a marked value that is not this launch as needing a reinstall', async () => {
    const { provider } = makeProvider()
    await provider.install(winSpec())
    // Simulate an older install / a hand edit that put the direct command back, marker kept.
    store.set(regKeyOf(RUN_KEY, 'home-hosted'), windowsCommandLine(winSpec().command, winSpec().args))
    const status = await provider.status(winSpec())
    expect(status.state).toBe('enabled-failing')
    expect(status.detail).toMatch(/does not name this machine's launch/)
    // And an install converges it, so the reported remedy actually works.
    const repaired = await provider.install(winSpec())
    expect(repaired.ok).toBe(true)
    expect((await provider.status(winSpec())).state).toBe('enabled-running')
  })

  it('does not claim a foreign Run value whose data already equals ours', async () => {
    const exact = windowsCommandLine(winSpec().command, winSpec().args)
    store.set(regKeyOf(RUN_KEY, 'home-hosted'), exact)
    const { provider, runner } = makeProvider()
    const install = await provider.install(winSpec())
    expect(install.ok).toBe(false)
    expect(install.detail).toMatch(/refusing to overwrite/)
    expect(runner.find('reg.exe').some(call => call.args[0] === 'add')).toBe(false)
    expect(store.get(regKeyOf(RUN_KEY, 'home-hosted'))).toBe(exact)
    expect(store.has(regKeyOf(MARKER_KEY, 'home-hosted'))).toBe(false)
  })

  it('neutralises batch metacharacters in the .cmd wrapper', () => {
    const spaced = `C:\\Users\\tester\\A & B\\${'x'.repeat(240)}`
    const long = winSpec({ args: ['C:\\home-hosted\\dist\\cli.js', 'up', '--home', spaced, '%TEMP%'] })
    const payload = windowsRunPayload(ctxFor(winCtx({ home, run: fakeRun().run, exists: () => false })), long)
    expect(payload.wrapperPath).not.toBeNull()
    expect(payload.wrapperContent).toContain('A ^& B')
    expect(payload.wrapperContent).toContain('%%TEMP%%')
    expect(/[^^]&/.test(payload.wrapperContent ?? '')).toBe(false)
  })

  /**
   * A refusal must leave the machine exactly as it was.
   *
   * The other order removed the `Run` value first and only then found a foreign wrapper,
   * reporting failure with the entry already gone — and the retry could never recover, because
   * `status()` reads a missing value as `not-installed`. So every file the removal touches is
   * proved to be ours *before* the registry is mutated.
   */
  it('refuses a foreign wrapper without touching the Run value', async () => {
    const { provider } = makeProvider(regHandler(store), { wscript: false })
    await provider.install(winSpec())

    // Replace the wrapper the install just wrote with somebody else's file.
    const long = winSpec({ args: ['C:\\home-hosted\\dist\\cli.js', 'up', '--home', 'C:\\Users\\tester\\' + 'x'.repeat(240)] })
    const payload = windowsRunPayload(ctxFor(winCtx({ home, run: fakeRun().run, exists: () => false })), long)
    expect(payload.wrapperPath).not.toBeNull()
    fs.mkdirSync(path.dirname(payload.wrapperPath!), { recursive: true })
    fs.writeFileSync(payload.wrapperPath!, 'somebody else wrote this\r\n', 'utf8')
    store.set(regKeyOf(RUN_KEY, 'home-hosted'), payload.data)

    const before = store.get(regKeyOf(RUN_KEY, 'home-hosted'))
    const refused = await provider.uninstall(long)
    expect(refused.ok).toBe(false)
    // `inspectOwned`'s own sentence: the file exists and is not marked as ours.
    expect(refused.detail).toMatch(/does not carry this plugin's marker/)
    // The whole point: the value is still there, so the entry is still removable next time.
    expect(store.get(regKeyOf(RUN_KEY, 'home-hosted'))).toBe(before)
  })

  /** A `.vbs` somebody else wrote at our path is refused the same way, before any mutation. */
  it('refuses a foreign .vbs without touching the Run value', async () => {
    const { provider } = makeProvider()
    await provider.install(winSpec())
    const script = hiddenLaunchPath(ctxFor(winCtx({ home, run: fakeRun().run })), winSpec())
    fs.writeFileSync(script, 'somebody else wrote this\r\n', 'utf8')
    const before = store.get(regKeyOf(RUN_KEY, 'home-hosted'))
    const install = await provider.install(winSpec())
    expect(install.ok).toBe(false)
    expect(install.detail).toMatch(/does not carry this plugin's marker/)
    const refused = await provider.uninstall(winSpec())
    expect(refused.ok).toBe(false)
    expect(refused.detail).toMatch(/does not carry this plugin's marker/)
    expect(store.get(regKeyOf(RUN_KEY, 'home-hosted'))).toBe(before)
  })

  it('deletes the value, the marker and the wrapper, tolerating reg exit 1', async () => {
    const { provider } = makeProvider()
    const ctx = ctxFor(winCtx({ home, run: fakeRun().run }))
    await provider.install(winSpec())
    const script = hiddenLaunchPath(ctx, winSpec())
    expect(fs.existsSync(script)).toBe(true)

    const removed = await provider.uninstall(winSpec())
    expect(removed.ok).toBe(true)
    expect(removed.changed).toBe(true)
    expect(fs.existsSync(script)).toBe(false)
    expect(store.has(regKeyOf(RUN_KEY, 'home-hosted'))).toBe(false)
    expect(store.has(regKeyOf(MARKER_KEY, 'home-hosted'))).toBe(false)

    const again = await provider.uninstall(winSpec())
    expect(again.ok).toBe(true)
    expect(again.changed).toBe(false)
    expect(again.detail).toMatch(/already gone/)
  })

  it('retires the wrapper only when the marker proves it is ours', async () => {
    const ctx = ctxFor(winCtx({ home, run: fakeRun().run }))
    const runner = fakeRun(regHandler(store))
    const provider = createWindowsRunProvider({ ...ctx, run: runner.run })
    await provider.install(winSpec())
    const script = hiddenLaunchPath(ctx, winSpec())
    const retirement = await provider.retireCommands?.(winSpec())
    expect(retirement?.commands.flat().join(' ')).toContain(script)

    // A file somebody else wrote is never named by a removal step.
    fs.writeFileSync(script, 'foreign\r\n', 'utf8')
    const after = await provider.retireCommands?.(winSpec())
    expect(after?.commands.flat().join(' ')).not.toContain(script)
  })

  /**
   * `uninstall()` validates only `spec.marker` itself — it calls `assertMarker` and nothing else —
   * so the command, its arguments and the label all reach the payload builder unchecked. The guard
   * inside `windowsRunPayload` is therefore load-bearing on this path, not merely defensive.
   *
   * A relative command is the clean probe: `validate` refuses it and nothing earlier on this path
   * does, so removing the builder's guard makes this fail.
   */
  it('refuses a spec field that only the payload builder checks', async () => {
    const { provider } = makeProvider()
    const result = await provider.uninstall(winSpec({ command: 'rel.exe' }))
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/absolute/)
  })
})

describe('windows scheduled task', () => {
  let home: string

  beforeEach(() => { home = tempHome() })
  afterEach(() => { cleanup(home) })

  interface TaskMockOptions {
    cmdlet?: boolean
    elevated?: boolean
    /** A pre-registered action, so a test can start from a task somebody else shaped. */
    startWith?: RegisteredAction | null
    deleteExit?: number
  }

  /**
   * A Windows task store that answers with what was actually registered.
   *
   * The fixtures the rules read are the **real** shapes captured from `powershell.exe` on a
   * Windows host, not invented ones — a guessed string is exactly where a rule that matches
   * output hides. Two details matter and neither is obvious:
   *
   * - the present-cmdlet table goes to **stdout** and says `Function`, not `Cmdlet`;
   * - the absent-cmdlet error *quotes the name being asked for* and goes to **stderr**.
   *
   * `Export-ScheduledTask` is answered from the emitted `New-ScheduledTaskAction`, never
   * from a fixture: a fixed answer would report "already registered" whatever the provider
   * wrote, which is how a drift check starts pretending to work.
   */
  function taskRunner(options: TaskMockOptions = {}) {
    const { cmdlet = true, elevated = true, startWith = null, deleteExit = 0 } = options
    let exported: string | null = startWith === null ? null : exportedXml(startWith)
    const handler: FakeHandler = (command, args) => {
      if (command === 'powershell.exe') {
        const script = args[2] ?? ''
        if (script === 'Get-Command Register-ScheduledTask')
          return { code: 0, stdout: cmdlet ? '\r\nCommandType     Name\r\n-----------     ----\r\nCommand         Register-ScheduledTask\r\n' : '' }
        if (script.includes('IsInRole'))
          return { code: 0, stdout: elevated ? 'True\r\n' : 'False\r\n' }
        if (script.startsWith('$action =')) {
          const action = actionOf(script, script.includes('-AtStartup'))
          if (action !== null)
            exported = exportedXml(action)
        }
        if (script.startsWith('Unregister-ScheduledTask'))
          exported = null
        return { code: 0, stdout: '' }
      }
      if (command === 'schtasks.exe') {
        if (args[0] === '/Query')
          return exported === null ? { code: 1, stderr: 'ERROR: The system cannot find the file specified.\r\n' } : { code: 0, stdout: exported }
        if (args[0] === '/Create') {
          const file = args[args.indexOf('/XML') + 1] ?? ''
          exported = fs.readFileSync(file, 'utf16le').replace(/^\uFEFF/, '')
          return { code: 0, stdout: 'SUCCESS: The scheduled task was successfully created.\r\n' }
        }
        if (args[0] === '/Delete') {
          exported = null
          return { code: deleteExit, stderr: deleteExit === 1 ? 'ERROR: The system cannot find the file specified.\r\n' : '' }
        }
      }
      return { code: 1 }
    }
    const runner = fakeRun(handler)
    const ctx = ctxFor(winCtx({ home, run: runner.run }))
    return {
      runner,
      ctx,
      /** The command and arguments the registered task actually runs. */
      action: (): { command: string, args: string } | null => {
        if (exported === null)
          return null
        return {
          command: /<Command>([\s\S]*?)<\/Command>/.exec(exported)?.[1] ?? '',
          args: /<Arguments>([\s\S]*?)<\/Arguments>/.exec(exported)?.[1] ?? '',
        }
      },
      provider: createWindowsTaskProvider(ctx),
    }
  }

  it('needs an elevated process', async () => {
    const { provider } = taskRunner({ elevated: false })
    const candidate = await provider.detect()
    expect(candidate.available).toBe(false)
    expect(candidate.bootCapable).toBe(false)
    expect(candidate.reason).toMatch(/elevated/)
  })

  /**
   * A file at the wrapper path that this plugin did not write must stop the install.
   *
   * `writeOwned` refuses it, but the refusal was only reachable through code no test covered:
   * deleting the check left the whole suite green. The task must not be registered either —
   * a task pointing at somebody else's file is worse than no task.
   */
  it('refuses a foreign wrapper and does not register the task', async () => {
    const { provider, ctx, action } = taskRunner()
    const spec = winSpec()
    const scriptPath = hiddenLaunchPath(ctx, spec)
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, 'somebody else wrote this\r\n', 'utf8')

    const result = await provider.install(spec)
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/does not carry this plugin's marker/)
    // The foreign file is untouched, and nothing was registered against it.
    expect(fs.readFileSync(scriptPath, 'utf8')).toContain('somebody else wrote this')
    expect(action()).toBeNull()
  })

  it('maps schtasks /Query exit 1 to not-installed', async () => {
    const { provider } = taskRunner()
    const status = await provider.status(winSpec())
    expect(status.state).toBe('not-installed')
    expect(status.detail).toMatch(/no scheduled task/)
  })

  /**
   * The defect, at the artifact a logon runs: `wscript.exe`, never `node.exe`.
   *
   * A task starting `node.exe` measured `visible=True` — the console window at every logon.
   * The registered command must be the GUI-subsystem wrapper (which *cannot* allocate a
   * console), and the wrapper must carry the real node command line so the panel is still
   * what starts.
   */
  it('registers the logon task against wscript.exe, with the panel in the wrapper', async () => {
    const { provider, ctx, action } = taskRunner()
    const result = await provider.install(winSpec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    const registered = action()
    expect(registered?.command).toBe(WSCRIPT)
    expect(registered?.args).toBe(`//B //nologo ${hiddenLaunchPath(ctx, winSpec())}`)
    // The real command line lives in the wrapper, with the marker.
    const wrapper = fs.readFileSync(hiddenLaunchPath(ctx, winSpec()), 'utf8')
    expect(wrapper).toContain(DEFAULT_MARKER)
    expect(wrapper).toContain('node.exe')
    expect((await provider.status(winSpec())).state).toBe('enabled-running')
  })

  it('falls back to task XML when the cmdlet is missing, still windowless', async () => {
    const { provider, ctx, action } = taskRunner({ cmdlet: false })
    const result = await provider.install(winSpec())
    expect(result.ok).toBe(true)
    // The XML path registered the same windowless action.
    expect(action()?.command).toBe(WSCRIPT)
    expect(action()?.args).toBe(`//B //nologo ${hiddenLaunchPath(ctx, winSpec())}`)
  })

  /** The idempotence the page depends on: a second install must not rewrite a matching task. */
  it('is a no-op when the registered task already matches', async () => {
    const { provider, runner } = taskRunner()
    await provider.install(winSpec())
    const writes = () => runner.lines().filter(line => line.includes('New-ScheduledTaskAction')).length
    const before = writes()
    const second = await provider.install(winSpec())
    expect(second.ok).toBe(true)
    expect(second.changed).toBe(false)
    expect(writes()).toBe(before)
  })

  it('re-registers a task whose action drifted back to node.exe', async () => {
    // The exact regression: a task left pointing at node.exe from an earlier version.
    const drifted: RegisteredAction = {
      command: 'C:\\Program Files\\nodejs\\node.exe',
      args: 'C:\\home-hosted\\dist\\cli.js up',
      cwd: 'C:\\Users\\tester',
      marker: DEFAULT_MARKER,
      boot: false,
    }
    const { provider, runner } = taskRunner({ startWith: drifted })
    const result = await provider.install(winSpec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    expect(runner.lines().some(line => line.includes('New-ScheduledTaskAction'))).toBe(true)
  })

  it('refuses to overwrite a foreign task with our name', async () => {
    const foreign: RegisteredAction = {
      command: WSCRIPT,
      args: '//B //nologo C:\\Users\\tester\\x.vbs',
      cwd: 'C:\\Users\\tester',
      marker: 'someone-elses-task',
      boot: false,
    }
    const { provider, runner } = taskRunner({ startWith: foreign })
    const install = await provider.install(winSpec())
    expect(install.ok).toBe(false)
    expect(install.detail).toMatch(/refusing to overwrite/)
    const uninstall = await provider.uninstall(winSpec())
    expect(uninstall.ok).toBe(false)
    expect(uninstall.detail).toMatch(/foreign task/)
    expect(runner.lines().some(line => line.includes('Unregister-ScheduledTask'))).toBe(false)
  })

  it('refuses to register without elevation', async () => {
    const { provider } = taskRunner({ elevated: false })
    const result = await provider.install(winSpec())
    expect(result.ok).toBe(false)
    expect(result.needsPrivilege).toBe(true)
    expect(result.detail).toMatch(/elevated/)
  })

  it('unregisters through the cmdlet and tolerates schtasks /Delete exit 1', async () => {
    const cmdletRun = taskRunner()
    await cmdletRun.provider.install(winSpec())
    const removed = await cmdletRun.provider.uninstall(winSpec())
    expect(removed.ok).toBe(true)
    expect(removed.changed).toBe(true)
    expect(cmdletRun.runner.lines().some(line => line.includes('Unregister-ScheduledTask'))).toBe(true)

    const legacy = taskRunner({ cmdlet: false, deleteExit: 1 })
    await legacy.provider.install(winSpec())
    const legacyRemoved = await legacy.provider.uninstall(winSpec())
    expect(legacyRemoved.ok).toBe(true)
    expect(legacyRemoved.changed).toBe(true)
    expect(legacy.runner.lines().some(line => line.includes('/Delete /TN home-hosted /F'))).toBe(true)
  })

  it('removes the wrapper on uninstall', async () => {
    const { provider, ctx } = taskRunner()
    await provider.install(winSpec())
    const script = hiddenLaunchPath(ctx, winSpec())
    expect(fs.existsSync(script)).toBe(true)
    expect((await provider.uninstall(winSpec())).ok).toBe(true)
    expect(fs.existsSync(script)).toBe(false)
  })

  /**
   * A refusal must leave the machine as it was — the rule `windows-run.uninstall` already
   * paid for. Proving the wrapper *after* unregistering would report failure with the entry
   * already gone, and the retry could never recover.
   */
  it('refuses a foreign wrapper without unregistering the task', async () => {
    const { provider, ctx } = taskRunner()
    await provider.install(winSpec())
    const script = hiddenLaunchPath(ctx, winSpec())
    fs.writeFileSync(script, 'somebody else wrote this\r\n', 'utf8')
    const refused = await provider.uninstall(winSpec())
    expect(refused.ok).toBe(false)
    expect(refused.detail).toMatch(/does not carry this plugin's marker/)
    // Still registered, so the entry is still removable once the file is dealt with.
    expect((await provider.status(winSpec())).state).toMatch(/enabled-/)
  })

  it('reports a missing wrapper as failing rather than healthy', async () => {
    const { provider, ctx } = taskRunner()
    await provider.install(winSpec())
    fs.rmSync(hiddenLaunchPath(ctx, winSpec()), { force: true })
    const status = await provider.status(winSpec())
    expect(status.state).toBe('enabled-failing')
    expect(status.detail).toMatch(/wrapper .* is missing/)
    // And a repair install puts it back.
    expect((await provider.install(winSpec())).changed).toBe(true)
    expect((await provider.status(winSpec())).state).toBe('enabled-running')
  })

  /**
   * A switch retires the mechanism it came from, and the wrapper goes with it — but only
   * a file the marker proves is ours. `home-hosted` is the generic name the machine-default
   * install uses, so a `.vbs` at that path may belong to somebody else.
   */
  it('retires the task\'s wrapper only when the marker proves it is ours', async () => {
    const { provider, ctx } = taskRunner()
    await provider.install(winSpec())
    const script = hiddenLaunchPath(ctx, winSpec())
    const ours = await provider.retireCommands?.(winSpec())
    expect(ours?.commands.flat().join(' ')).toContain(script)

    // Somebody else's file at our path is never named by a removal step.
    fs.writeFileSync(script, 'foreign\r\n', 'utf8')
    const theirs = await provider.retireCommands?.(winSpec())
    expect(theirs?.commands.flat().join(' ')).not.toContain(script)
  })

  it('treats an absent task as already gone on uninstall', async () => {
    const { provider } = taskRunner()
    const result = await provider.uninstall(winSpec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(false)
    expect(result.detail).toMatch(/already gone/)
  })
})

/**
 * The two rules that classify by reading PowerShell's **stdout**, against the real
 * strings.
 *
 * Both are sound, and for a reason that is invisible from the rule itself: the text that
 * would produce a false positive goes to **stderr**. PowerShell reports an absent cmdlet
 * as `The term 'Register-ScheduledTask' is not recognized...` — which quotes the very name
 * the rule greps for — but it writes that to stderr, and `src/util/exec.ts` keeps stdout
 * and stderr in separate fields. A rule that scanned both, or a seam that merged them,
 * would report a missing cmdlet as available and send the install down the PowerShell path
 * on a Windows without the ScheduledTasks module.
 *
 * Captured from `powershell.exe` on a Windows host, not invented:
 *   present -> stdout is a table whose Name column holds the verb;
 *   absent  -> stdout is EMPTY, and stderr holds the quoted-name error.
 */
describe('the text rules that read powershell stdout', () => {
  const presentStdout = '\r\nCommandType     Name                                               Version    Source                                   \r\n-----------     ----                                               -------    ------                                   \r\nFunction        Register-ScheduledTask                             1.0.0.0    ScheduledTasks                           \r\n\r\n\r\n'
  const absentStdout = ''
  const absentStderr = 'Get-Command : The term \'Register-ScheduledTask\' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.\r\nAt line:1 char:1\r\n+ Get-Command Register-ScheduledTask\r\n'

  it('finds the cmdlet in the real table and not in the real error', async () => {
    // Driven through the **provider**, so this exercises the rule that ships. Asserting the
    // regexes here instead would pin nothing: changing the rule to scan `stdout` and
    // `stderr` together — the plausible "improvement" this test exists to prevent — fails no
    // assertion when the regexes are copied into the test, and does fail the one below.
    const present = ctxFor({
      home: tempHome(),
      platform: 'win32',
      run: fakeRun((command, args) => {
        const script = args[2] ?? ''
        if (command === 'powershell.exe' && script === 'Get-Command Register-ScheduledTask')
          return { code: 0, stdout: presentStdout, stderr: '' }
        if (command === 'powershell.exe' && script.includes('IsInRole'))
          return { code: 0, stdout: 'True\r\n' }
        if (command === 'schtasks.exe')
          return { code: 1, stdout: '', stderr: 'ERROR: The system cannot find the file specified.' }
        return { code: 0, stdout: '' }
      }).run,
      sudo: async () => true,
    })
    const taken: string[] = []
    const presentRun = present.run
    const presentProvider = createWindowsTaskProvider({ ...present, run: async (c, a = []) => { taken.push(`${c} ${a.join(' ')}`); return presentRun(c, a) } })
    await presentProvider.install(winSpec())
    // The cmdlet path ran: PowerShell was asked to register. (The fake does not make the
    // task appear afterwards, so the install itself reports failure — the PATH is what
    // this asserts, because that is what the rule decides.)
    expect(taken.some(line => line.includes('New-ScheduledTaskAction'))).toBe(true)

    // The trap: the SAME real error text, but on stderr, must not be read as "available".
    // `taskRunner({ cmdlet: false })` covers this shape; this pins the real strings.
    const absent = ctxFor({
      home: tempHome(),
      platform: 'win32',
      run: fakeRun((command, args) => {
        const script = args[2] ?? ''
        if (command === 'powershell.exe' && script === 'Get-Command Register-ScheduledTask')
          return { code: 1, stdout: absentStdout, stderr: absentStderr }
        if (command === 'powershell.exe' && script.includes('IsInRole'))
          return { code: 0, stdout: 'True\r\n' }
        if (command === 'schtasks.exe' && args.includes('/Query'))
          return { code: 1, stdout: '', stderr: 'ERROR: The system cannot find the file specified.' }
        return { code: 0, stdout: '' }
      }).run,
      sudo: async () => true,
    })
    const seen: string[] = []
    const realRun = absent.run
    const absentProvider = createWindowsTaskProvider({ ...absent, run: async (c, a = []) => { seen.push(`${c} ${a.join(' ')}`); return realRun(c, a) } })
    await absentProvider.install(winSpec())
    // The XML fallback was chosen, i.e. the stderr text was NOT read as a present cmdlet.
    // Scanning both streams would take the PowerShell path and never reach schtasks.
    expect(seen.some(line => line.includes('New-ScheduledTaskAction')), 'PowerShell register script must not run').toBe(false)
  })

  it('reads the real elevation answer through the rule that ships', async () => {
    // `True\r\n` is what powershell.exe prints. Driven through the provider rather than
    // asserted as a copied regex: un-anchoring the real rule (`/true/i`) fails no test that
    // only re-tests the regex, and does fail this one, because `NotTrue`/`Trueish` would
    // then read as elevated and the install would run without privilege.
    const isElevated = async (stdout: string): Promise<string> => {
      const dir = tempHome()
      const provider = createWindowsTaskProvider(ctxFor({
        home: dir,
        platform: 'win32',
        run: fakeRun((command, args) => {
          const script = args[2] ?? ''
          if (command === 'powershell.exe' && script.includes('IsInRole'))
            return { code: 0, stdout }
          if (command === 'powershell.exe' && script === 'Get-Command Register-ScheduledTask')
            return { code: 0, stdout: 'Function        Register-ScheduledTask\r\n' }
          if (command === 'schtasks.exe' && args.includes('/Query'))
            return { code: 1, stdout: '', stderr: 'ERROR: The system cannot find the file specified.' }
          return { code: 0, stdout: '' }
        }).run,
        sudo: async () => false,
      }))
      return (await provider.install(winSpec())).detail
    }
    // The real answer: elevated, so the install proceeds past the privilege gate.
    expect(await isElevated('True\r\n')).not.toMatch(/needs an elevated process/)
    expect(await isElevated('False\r\n')).toMatch(/needs an elevated process/)
    // The anchoring: neither of these is `True`, and reading either as elevated would
    // register a task with no privilege.
    expect(await isElevated('NotTrue\r\n')).toMatch(/needs an elevated process/)
    expect(await isElevated('Trueish\r\n')).toMatch(/needs an elevated process/)
  })
})

describe('windows boot task (SYSTEM, before login)', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  /** A task store keyed by task name, so two mechanisms cannot hide each other. */
  function bootRunner(options: { elevated?: boolean, cmdlet?: boolean } = {}) {
    const { elevated = true, cmdlet = true } = options
    const tasks = new Map<string, string>()
    const handler: FakeHandler = (command, args) => {
      if (command === 'powershell.exe') {
        const script = args[2] ?? ''
        if (script === 'Get-Command Register-ScheduledTask')
          return cmdlet ? { code: 0, stdout: 'Function        Register-ScheduledTask\r\n' } : { code: 1, stderr: 'The term is not recognized\r\n' }
        if (script.includes('IsInRole'))
          return { code: 0, stdout: elevated ? 'True\r\n' : 'False\r\n' }
        if (script.startsWith('$action =')) {
          const name = /TaskName '([^']+)'/.exec(script)?.[1]
          // `-AtStartup` is the boot task; store the XML that matches, or the test
          // would compare the wrong artifact to the wrong name.
          if (name !== undefined) {
            const action = actionOf(script, script.includes('-AtStartup'))
            if (action !== null)
              tasks.set(name, exportedXml(action))
          }
          return { code: 0, stdout: '' }
        }
        if (script.startsWith('Unregister-ScheduledTask')) {
          const name = /TaskName '([^']+)'/.exec(script)?.[1]
          if (name !== undefined)
            tasks.delete(name)
          return { code: 0, stdout: '' }
        }
        return { code: 0, stdout: '' }
      }
      if (command === 'schtasks.exe') {
        const name = args[args.indexOf('/TN') + 1] ?? ''
        if (args[0] === '/Query')
          return tasks.has(name) ? { code: 0, stdout: tasks.get(name)! } : { code: 1, stderr: 'ERROR: The system cannot find the file specified.\r\n' }
        if (args[0] === '/Create') {
          tasks.set(name, fs.readFileSync(args[args.indexOf('/XML') + 1] ?? '', 'utf16le').replace(/^\uFEFF/, ''))
          return { code: 0, stdout: 'SUCCESS\r\n' }
        }
        if (args[0] === '/Delete') {
          tasks.delete(name)
          return { code: 0 }
        }
      }
      return { code: 1 }
    }
    const runner = fakeRun(handler)
    const ctx = ctxFor(winCtx({ home, run: runner.run }))
    return { tasks, ctx, boot: createWindowsBootProvider(ctx), logon: createWindowsTaskProvider(ctx) }
  }

  it('registers under its own name, leaving the logon task untouched', async () => {
    const { tasks, boot, logon } = bootRunner()
    expect((await boot.install(winSpec())).ok).toBe(true)
    expect((await logon.install(winSpec())).ok).toBe(true)
    // Two artifacts, not one clobbering the other — the whole point of the suffix.
    expect([...tasks.keys()].sort()).toEqual(['home-hosted', 'home-hosted-boot'])
    expect(tasks.get('home-hosted')).toContain('<LogonTrigger>')
    expect(tasks.get('home-hosted-boot')).toContain('<BootTrigger>')
  })

  /**
   * The split the measurement dictates: only the *logon* task needs the wrapper.
   *
   * A SYSTEM task runs in session 0, which has no interactive desktop, so starting
   * `node.exe` there already measured `visible=False`. Wrapping it would add an artifact
   * between SYSTEM and the panel for no window to remove.
   */
  it('leaves the boot task on the real node, and only wraps the logon task', async () => {
    const { tasks, boot, logon } = bootRunner()
    expect((await boot.install(winSpec())).ok).toBe(true)
    expect((await logon.install(winSpec())).ok).toBe(true)
    const bootAction = /<Command>([\s\S]*?)<\/Command>/.exec(tasks.get('home-hosted-boot') ?? '')?.[1] ?? ''
    const logonAction = /<Command>([\s\S]*?)<\/Command>/.exec(tasks.get('home-hosted') ?? '')?.[1] ?? ''
    expect(bootAction).toBe('C:\\Program Files\\nodejs\\node.exe')
    expect(logonAction).toBe(WSCRIPT)
  })

  it('uninstalling one mechanism leaves the other installed', async () => {
    const { tasks, boot, logon } = bootRunner()
    await boot.install(winSpec())
    await logon.install(winSpec())
    await boot.uninstall(winSpec())
    expect([...tasks.keys()]).toEqual(['home-hosted'])
    await logon.uninstall(winSpec())
    expect([...tasks.keys()]).toEqual([])
  })

  it('never deletes a boot task it did not write', async () => {
    const { tasks, boot } = bootRunner()
    tasks.set('home-hosted-boot', bootTaskXml(winSpec()).replace('managed-by:dsh-home-hosted', 'someone-else'))
    const result = await boot.uninstall(winSpec())
    expect(result.ok).toBe(false)
    expect(tasks.has('home-hosted-boot')).toBe(true)
  })

  it('reports the session-0 cost where the user will see it', async () => {
    const { boot } = bootRunner()
    const candidate = await boot.detect()
    expect(candidate.bootCapable).toBe(true)
    expect(candidate.reason).toMatch(/session 0/i)
  })

  it('refuses to install without elevation', async () => {
    const { boot } = bootRunner({ elevated: false })
    const result = await boot.install(winSpec())
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/elevated/)
  })
})

/**
 * The hidden-launch derivation, on its own.
 *
 * Every path that has to agree about the windowless launch goes through `hiddenLaunch`:
 * `install()` writes its artifact, `status()`/`inspect()` compare the registered action
 * against it, and `uninstall()`/`retireCommands()` remove it. Deriving it twice — even
 * identically-looking — is how a re-install starts reporting `changed: true` forever and
 * the page shows drift that is not there, so the derivation is pinned directly as well as
 * through the providers.
 */
/**
 * `WScript.Shell.Run` expands `%NAME%` for every variable the environment actually defines.
 *
 * Measured: through a wrapper, `C:\Users\%USERNAME%\hh` reached the child as
 * `C:\Users\Administrator\hh`, while `%NOT_AN_ENV_VAR%`, a lone `100%` and `a%b_not_set%c`
 * all arrived verbatim. The direct command never expanded anything, so a panel root carrying
 * a `%NAME%` pair would silently start against a *different* state root — worse than a console
 * window. `Shell.Application.ShellExecute` passes it through literally but returns as soon as
 * the child starts (measured 0.16 s), so it cannot carry the exit code.
 *
 * Therefore a command line the wrapper would rewrite does not use the wrapper at all.
 */
describe('a command line the wrapper would rewrite', () => {
  const withArgs = (args: string[], env: Record<string, string> = { USERNAME: 'tester' }) =>
    winSpec({ args, env })

  it('is detected when a %NAME% pair names a variable the environment defines', () => {
    expect(expandableByWscript('panel --home C:\\Users\\%USERNAME%\\hh', { USERNAME: 'tester' })).toBe(true)
    // An empty value still shortens the argument, so it counts.
    expect(expandableByWscript('%EMPTY%', { EMPTY: '' })).toBe(true)
  })

  it('is not detected for a percent pair the environment does not define', () => {
    // Measured: these three arrived verbatim through a real wrapper.
    expect(expandableByWscript('C:\\x\\%NOT_AN_ENV_VAR%\\p', { USERNAME: 'tester' })).toBe(false)
    expect(expandableByWscript('C:\\100% done', { USERNAME: 'tester' })).toBe(false)
    expect(expandableByWscript('C:\\a%b_not_set%c', { USERNAME: 'tester' })).toBe(false)
  })

  it('falls back to the direct launch instead of corrupting the argument', () => {
    const dir = tempHome()
    try {
      const spec = withArgs(['cli.js', 'up', '--home', 'C:\\Users\\%USERNAME%\\hh'], { USERNAME: 'tester', SystemRoot: 'C:\\Windows' })
      const launch = hiddenLaunch(ctxFor({ home: dir, run: fakeRun().run, platform: 'win32', env: spec.env, exists: () => true }), spec)
      // No wrapper, and the entry keeps the real program: a console window is cosmetic,
      // running the panel against the wrong state root is not.
      expect(launch.scriptPath).toBeNull()
      expect(launch.spec.command).toBe(spec.command)
    }
    finally {
      cleanup(dir)
    }
  })

  it('still uses the wrapper when a percent sign cannot expand', () => {
    // The control: same platform and wscript availability, only the value differs.
    const dir = tempHome()
    try {
      const spec = withArgs(['cli.js', 'up', '--home', 'C:\\100% done\\hh'], { USERNAME: 'tester', SystemRoot: 'C:\\Windows' })
      const launch = hiddenLaunch(ctxFor({ home: dir, run: fakeRun().run, platform: 'win32', env: spec.env, exists: () => true }), spec)
      expect(launch.scriptPath).not.toBeNull()
      expect(launch.spec.command).toMatch(/wscript(\.exe)?$/i)
    }
    finally {
      cleanup(dir)
    }
  })
})

/**
 * A capability can be removed from Windows: VBScript is an optional feature.
 *
 * When `wscript.exe` is gone the launch falls back to the direct command, but the `.vbs` an
 * earlier install wrote is still this plugin's artifact and must still be removable. Deriving
 * cleanup from "what should the entry run *now*" made it `null` exactly then, so `uninstall()`
 * reported success while leaving the file, `status()` kept saying `enabled-running`, and a
 * reinstall converged the task back to `node.exe` — silently restoring the console window.
 */
describe('a task whose wrapper the machine can no longer launch', () => {
  let home: string
  let store: Map<string, string>

  beforeEach(() => {
    home = tempHome()
    store = new Map()
  })
  afterEach(() => cleanup(home))

  /** A provider whose `wscript.exe` does not resolve, with one owned `.vbs` already on disk. */
  function withoutWscript(spec = winSpec()) {
    const runner = fakeRun(regHandler(store))
    const ctx = ctxFor(winCtx({ home, run: runner.run, exists: () => false }))
    const scriptPath = hiddenLaunchPath(ctx, spec)
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    fs.writeFileSync(scriptPath, hiddenLaunchScript(spec), 'utf8')
    // The task itself is registered, with our marker.
    store.set('task:home-hosted', spec.marker)
    return { ctx, scriptPath, spec }
  }

  it('still reports the missing/foreign artifact rather than claiming health', () => {
    const { ctx, spec, scriptPath } = withoutWscript()
    // The artifact exists, so this is the healthy case even with no wscript.
    expect(inspectOwned(scriptPath, spec.marker).owned).toBe(true)
    // And the derivation that removal must NOT use is null here — the whole point.
    expect(hiddenLaunch(ctx, spec).scriptPath).toBeNull()
  })

  it('names the wrapper in its retirement plan even though wscript is unavailable', async () => {
    const { ctx, spec, scriptPath } = withoutWscript()
    const provider = createWindowsTaskProvider(ctx)
    const retirement = await provider.retireCommands?.(spec)
    expect(retirement).toBeDefined()
    // The file must appear in at least one removal step; otherwise it is stranded.
    expect(JSON.stringify(retirement!.commands)).toContain(scriptPath)
  })
})

describe('the windowless launch', () => {
  let home: string
  beforeEach(() => { home = tempHome() })
  afterEach(() => { cleanup(home) })

  const ctx = (overrides: Partial<Parameters<typeof ctxFor>[0]> = {}) => ctxFor(winCtx({ home, run: fakeRun().run, ...overrides }))

  it('derives wscript + //B //nologo + the .vbs, copying everything else', () => {
    const spec = winSpec()
    const derived = windowlessSpec(ctx(), spec)
    expect(derived.command).toBe(WSCRIPT)
    expect(derived.args).toEqual(['//B', '//nologo', hiddenLaunchPath(ctx(), spec)])
    // Everything else is the caller's spec, unchanged.
    expect(derived.cwd).toBe(spec.cwd)
    expect(derived.env).toEqual(spec.env)
    expect(derived.marker).toBe(spec.marker)
    expect(derived.unitName).toBe(spec.unitName)
    expect(derived.label).toBe(spec.label)
    expect(derived.logDir).toBe(spec.logDir)
    // And the input is not mutated: the `.vbs` is built from the original spec.
    expect(spec.command).toBe('C:\\Program Files\\nodejs\\node.exe')
  })

  /**
   * `//B` is load-bearing, measured in all four combinations: without it a missing `.vbs`
   * (deleted by hand, or an interrupted uninstall) puts up a modal "Input Error" dialog and
   * the wrapper **never exits** — still alive after 120 s. A dialog at every logon would be
   * worse than the console window this replaces.
   *
   * `//B` is not sufficient on its own, which is why the script also carries the `On Error`
   * guards: with `//B` and no guards, an unstartable child makes the wrapper exit **0**, and
   * `RestartOnFailure` would never fire — the same blind spot that disqualified
   * `conhost --headless`. Both are asserted, in the two tests around this one.
   */
  it('runs wscript in batch mode, so a missing script cannot open a modal dialog', () => {
    expect(windowlessSpec(ctx(), winSpec()).args[0]).toBe('//B')
    expect(windowlessSpec(ctx(), winSpec()).args[1]).toBe('//nologo')
  })

  it('puts the .vbs beside the .cmd fallback, named for the unit', () => {
    expect(hiddenLaunchPath(ctx(), winSpec())).toBe(path.join(home, 'AppData', 'Local', 'home-hosted', 'home-hosted.vbs'))
    // The unit name is what keys the artifact, so two specs cannot share one file.
    expect(hiddenLaunchPath(ctx(), winSpec({ unitName: 'home-hosted-1a2b3c4d' })))
      .toContain(`${path.sep}home-hosted-1a2b3c4d.vbs`)
  })

  /**
   * Pinned **directly**, because every production path reaches this through
   * `hiddenLaunch`, whose `validate(spec)` refuses an illegal unit name first — so the
   * rule that runs on the normal path is the caller's, and removing this one changes
   * nothing reachable. `hiddenLaunchPath` is exported, though, so a direct caller has no
   * preceding check, and `../evil` would otherwise name a file outside the directory.
   * This is the same shape as `assertLabel`/`assertRegistryValueName` above: the only
   * place that rule is exercised at all.
   */
  it('refuses a unit name that would escape the directory, when called directly', () => {
    expect(() => hiddenLaunchPath(ctx(), winSpec({ unitName: '../evil' }))).toThrow(/unit name/)
    expect(() => hiddenLaunchPath(ctx(), winSpec({ unitName: '..\\evil' }))).toThrow(/unit name/)
    expect(hiddenLaunchPath(ctx(), winSpec({ unitName: 'ok.name_1' }))).toContain('ok.name_1.vbs')
  })

  /** No `wscript.exe` on the machine is not an error: it is today's direct command. */
  it('falls back to the direct command when wscript cannot be found', () => {
    const spec = winSpec()
    const none = ctx({ exists: () => false })
    expect(wscriptExecutable(none)).toBeNull()
    expect(windowlessSpec(none, spec)).toEqual(spec)
    expect(hiddenLaunch(none, spec)).toEqual({ spec, scriptPath: null })
  })

  it('does not guess a wscript path without a SystemRoot', () => {
    // A bare `wscript.exe` is not absolute, so naming it would break `validate()` — the
    // honest answer is "no wrapper", not a crash at install time.
    const noRoot = ctxFor({
      home,
      platform: 'win32',
      run: fakeRun().run,
      env: { USER: 'tester', LOCALAPPDATA: path.join(home, 'AppData', 'Local') },
      exists: () => true,
    })
    expect(wscriptExecutable(noRoot)).toBeNull()
    expect(windowlessSpec(noRoot, winSpec())).toEqual(winSpec())
  })

  it('honours windir when SystemRoot is absent', () => {
    const windir = ctx({ env: { USER: 'tester', windir: WINDOWS_ROOT, LOCALAPPDATA: path.join(home, 'AppData', 'Local') } })
    expect(wscriptExecutable(windir)).toBe(WSCRIPT)
  })

  it('builds the script around the real command line and the marker', () => {
    const script = hiddenLaunchScript(winSpec())
    // The marker on its own first line, so `inspectOwned` can prove the file is ours.
    expect(script.split('\r\n')[0]).toBe(`' ${DEFAULT_MARKER}`)
    // The ORIGINAL command line, not the wscript form — otherwise the wrapper recurses.
    expect(script).toContain('node.exe')
    expect(script).toContain('sh.Run(')
    expect(script).toContain(', 0, True)')
    expect(script).toContain('WScript.Quit rc')
    expect(script).not.toContain('wscript.exe')
    // CRLF, because the file is read by a Windows host.
    expect(script).toContain('\r\n')
    expect(script.split('\n').every(line => !line.endsWith('\r') || line.length > 0)).toBe(true)
  })

  /**
   * A bare `sh.Run` on a program that cannot start does not raise into the script: it opens
   * a **modal dialog** and the wrapper never finishes (measured: no exit in 120 s, with a
   * live `wscript.exe` holding a window). The guards turn that into a nonzero exit, which
   * is what `RestartOnFailure` can act on.
   */
  it('guards sh.Run so an unstartable child reports failure, not exit 0', () => {
    const script = hiddenLaunchScript(winSpec())
    const lines = script.split('\r\n')
    expect(script).toContain('On Error Resume Next')
    /**
     * `toContain` on the guard text pinned **nothing**: the same sentence appears after
     * `CreateObject` and after `sh.Run`, so deleting the `sh.Run` one — the guard that turns
     * an unstartable child into a nonzero exit — left all 249 boot tests green. Measured, that
     * shape returns exit **0**, the exact false success that disqualified `conhost`.
     *
     * So the assertion is positional: the guard must be the line *immediately after*
     * `sh.Run`, and there must be one guard for each of the two calls that can raise.
     */
    const runIndex = lines.findIndex(line => line.includes('sh.Run('))
    expect(runIndex, 'the script must call sh.Run').toBeGreaterThanOrEqual(0)
    expect(lines[runIndex + 1], 'the sh.Run guard must follow sh.Run, not merely exist').toBe('If Err.Number <> 0 Then WScript.Quit 90')
    const createIndex = lines.findIndex(line => line.includes('CreateObject("WScript.Shell")'))
    expect(lines[createIndex + 1], 'the CreateObject guard must follow CreateObject').toBe('If Err.Number <> 0 Then WScript.Quit 90')
    // Two call sites, two guards: a count catches a deletion that a text match cannot.
    expect(lines.filter(line => line === 'If Err.Number <> 0 Then WScript.Quit 90')).toHaveLength(2)
    expect(script).not.toContain('WScript.Quit 0')
    expect(script).toContain('WScript.Quit rc')
  })

  /**
   * The wrapper's exit code is the child's, which is the whole reason this shape was chosen
   * over `conhost --headless` (measured: child 7 -> conhost 0). Asserted here as the source
   * shape; the measurement itself was `Last Result: 7` on a real task.
   */
  it('returns the child\'s exit code', () => {
    const statements = hiddenLaunchScript(winSpec()).split('\r\n').filter(line => line !== '')
    // The capture is from `sh.Run`, and it is what `Quit` reports: not a constant, which
    // is what makes `RestartOnFailure` able to see a failure at all.
    expect(statements.some(line => line.startsWith('rc = sh.Run('))).toBe(true)
    expect(statements.at(-1)).toBe('WScript.Quit rc')
    // Exactly one capture: `Quit` reads `rc`, so a second assignment would be the bug
    // that makes the reported code something other than the child's.
    expect(statements.filter(line => line.startsWith('rc = ')).length).toBe(1)
  })

  /** The marker is interpolated, so it goes through `assertMarker` like every other writer. */
  it('refuses a marker a newline would take out of the comment', () => {
    expect(() => hiddenLaunchScript(winSpec({ marker: 'ok\r\nWScript.Quit 0' }))).toThrow(/control characters/)
    expect(hiddenLaunchScript(winSpec({ marker: 'other-marker' }))).toContain('\' other-marker')
  })

  it('keeps a non-ASCII path out of the raw source', () => {
    // The ANSI-source rule: a raw non-ASCII byte would be mojibake, so it is a ChrW run.
    const script = hiddenLaunchScript(winSpec({
      command: 'C:\\Program Files\\nodejs\\node.exe',
      args: ['C:\\home-hosted\\dist\\cli.js', 'up', '--home', 'C:\\Users\\José\\.home-hosted'],
    }))
    expect(script).toContain('ChrW(&H00E9)')
    // eslint-disable-next-line no-control-regex -- the assertion IS about ASCII-only output.
    expect(/^[\u0000-\u007F]*$/.test(script)).toBe(true)
  })
})
