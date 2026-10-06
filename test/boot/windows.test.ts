import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createWindowsRunProvider,
  createWindowsTaskProvider,
  MARKER_KEY,
  RUN_KEY,
  scheduledTaskXml,
  windowsRunPayload,
} from '../../src/boot/windows.js'
import { windowsCommandLine } from '../../src/boot/escape.js'
import type { FakeHandler } from './harness.js'
import { cleanup, ctxFor, fakeRun, tempHome, winSpec } from './harness.js'

const regKeyOf = (key: string, name: string): string => `${key}\u0000${name}`

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

  function makeProvider(handler: FakeHandler = regHandler(store)) {
    const runner = fakeRun(handler)
    return {
      runner,
      provider: createWindowsRunProvider(ctxFor({
        home,
        run: runner.run,
        platform: 'win32',
        env: { USER: 'tester', LOCALAPPDATA: path.join(home, 'AppData', 'Local'), TEMP: home },
      })),
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

  it('writes the direct command line and a separate marker value', async () => {
    const { provider, runner } = makeProvider()
    const result = await provider.install(winSpec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    expect(store.get(regKeyOf(RUN_KEY, 'home-hosted'))).toBe(windowsCommandLine(winSpec().command, winSpec().args))
    expect(store.get(regKeyOf(MARKER_KEY, 'home-hosted'))).toBe('managed-by:dsh-home-hosted')
    expect(runner.lines().some(line => line.startsWith('reg.exe add '))).toBe(true)
  })

  it('registers the value exactly once', async () => {
    const { provider, runner } = makeProvider()
    await provider.install(winSpec())
    const adds = () => runner.calls.filter(call => call.command === 'reg.exe' && call.args[0] === 'add').length
    const before = adds()
    const second = await provider.install(winSpec())
    expect(second.ok).toBe(true)
    expect(second.changed).toBe(false)
    expect(adds()).toBe(before)
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

  it('writes a .cmd wrapper when the command line exceeds the Run value limit', async () => {
    const long = winSpec({ args: ['C:\\home-hosted\\dist\\cli.js', 'up', '--foreground', '--home', `C:\\Users\\tester\\${'x'.repeat(260)}`] })
    const payload = windowsRunPayload(ctxFor({ home, run: fakeRun().run, platform: 'win32', env: { LOCALAPPDATA: path.join(home, 'AppData', 'Local') } }), long)
    expect(payload.wrapperPath).not.toBeNull()
    expect(payload.data).toContain('cmd.exe /c ')
    expect(payload.wrapperContent).toContain('@echo off')
    expect(payload.wrapperContent).toContain('managed-by:dsh-home-hosted')

    const { provider } = makeProvider()
    const result = await provider.install(long)
    expect(result.ok).toBe(true)
    expect(fs.readFileSync(payload.wrapperPath ?? '', 'utf8')).toContain('managed-by:dsh-home-hosted')
    expect(store.get(regKeyOf(RUN_KEY, 'home-hosted'))).toContain('cmd.exe /c ')
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
    const payload = windowsRunPayload(ctxFor({ home, run: fakeRun().run, platform: 'win32', env: { LOCALAPPDATA: path.join(home, 'AppData', 'Local') } }), long)
    expect(payload.wrapperPath).not.toBeNull()
    expect(payload.wrapperContent).toContain('A ^& B')
    expect(payload.wrapperContent).toContain('%%TEMP%%')
    expect(/[^^]&/.test(payload.wrapperContent ?? '')).toBe(false)
  })

  it('deletes the value and the marker, tolerating reg exit 1', async () => {
    const { provider } = makeProvider()
    await provider.install(winSpec())
    const removed = await provider.uninstall(winSpec())
    expect(removed.ok).toBe(true)
    expect(removed.changed).toBe(true)
    expect(store.has(regKeyOf(RUN_KEY, 'home-hosted'))).toBe(false)
    expect(store.has(regKeyOf(MARKER_KEY, 'home-hosted'))).toBe(false)

    const again = await provider.uninstall(winSpec())
    expect(again.ok).toBe(true)
    expect(again.changed).toBe(false)
    expect(again.detail).toMatch(/already gone/)
  })
})

describe('windows scheduled task', () => {
  let home: string

  beforeEach(() => { home = tempHome() })
  afterEach(() => cleanup(home))

  interface TaskMockOptions {
    cmdlet?: boolean
    elevated?: boolean
    startWith?: string | null
    deleteExit?: number
  }

  function taskRunner(options: TaskMockOptions = {}) {
    const { cmdlet = true, elevated = true, startWith = null, deleteExit = 0 } = options
    let xml = startWith
    const handler: FakeHandler = (command, args) => {
      if (command === 'powershell.exe') {
        const script = args[2] ?? ''
        if (script === 'Get-Command Register-ScheduledTask')
          return { code: 0, stdout: cmdlet ? '\r\nCommandType     Name\r\n-----------     ----\r\nCmdlet          Register-ScheduledTask\r\n' : '' }
        if (script.includes('IsInRole'))
          return { code: 0, stdout: elevated ? 'True\r\n' : 'False\r\n' }
        if (script.startsWith('$action ='))
          xml = scheduledTaskXml(winSpec())
        if (script.startsWith('Unregister-ScheduledTask'))
          xml = null
        return { code: 0, stdout: '' }
      }
      if (command === 'schtasks.exe') {
        if (args[0] === '/Query')
          return xml === null ? { code: 1, stderr: 'ERROR: The system cannot find the file specified.\r\n' } : { code: 0, stdout: xml }
        if (args[0] === '/Create') {
          const file = args[args.indexOf('/XML') + 1] ?? ''
          xml = fs.readFileSync(file, 'utf16le').replace(/^\uFEFF/, '')
          return { code: 0, stdout: 'SUCCESS: The scheduled task was successfully created.\r\n' }
        }
        if (args[0] === '/Delete') {
          xml = null
          return { code: deleteExit, stderr: deleteExit === 1 ? 'ERROR: The system cannot find the file specified.\r\n' : '' }
        }
      }
      return { code: 1 }
    }
    const runner = fakeRun(handler)
    return {
      runner,
      provider: createWindowsTaskProvider(ctxFor({
        home,
        run: runner.run,
        platform: 'win32',
        env: { USER: 'tester', TEMP: home },
      })),
    }
  }

  it('needs an elevated process', async () => {
    const { provider } = taskRunner({ elevated: false })
    const candidate = await provider.detect()
    expect(candidate.available).toBe(false)
    expect(candidate.bootCapable).toBe(false)
    expect(candidate.reason).toMatch(/elevated/)
  })

  it('maps schtasks /Query exit 1 to not-installed', async () => {
    const { provider } = taskRunner()
    const status = await provider.status(winSpec())
    expect(status.state).toBe('not-installed')
    expect(status.detail).toMatch(/no scheduled task/)
  })

  it('registers through Register-ScheduledTask and verifies with schtasks /Query', async () => {
    const { provider, runner } = taskRunner()
    const result = await provider.install(winSpec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    expect(runner.lines().some(line => line.includes('$action = New-ScheduledTaskAction'))).toBe(true)
    expect((await provider.status(winSpec())).state).toBe('enabled-running')
  })

  it('falls back to task XML when the cmdlet is missing', async () => {
    const { provider, runner } = taskRunner({ cmdlet: false })
    const result = await provider.install(winSpec())
    expect(result.ok).toBe(true)
    expect(runner.lines().some(line => line.includes('/Create /TN home-hosted /XML'))).toBe(true)
    expect(runner.lines().some(line => line.includes('New-ScheduledTaskAction'))).toBe(false)
  })

  it('is a no-op when the registered task already matches', async () => {
    const { provider, runner } = taskRunner({ startWith: scheduledTaskXml(winSpec()) })
    const result = await provider.install(winSpec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(false)
    expect(runner.lines().some(line => line.includes('New-ScheduledTaskAction'))).toBe(false)
  })

  it('re-registers a task whose action drifted', async () => {
    const drifted = scheduledTaskXml(winSpec()).replace('<Command>C:\\Program Files\\nodejs\\node.exe</Command>', '<Command>C:\\old\\node.exe</Command>')
    const { provider, runner } = taskRunner({ startWith: drifted })
    const result = await provider.install(winSpec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    expect(runner.lines().some(line => line.includes('$action = New-ScheduledTaskAction'))).toBe(true)
  })

  it('refuses to overwrite a foreign task with our name', async () => {
    const foreign = scheduledTaskXml(winSpec()).replace('managed-by:dsh-home-hosted', 'someone-elses-task')
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
    const cmdletRun = taskRunner({ startWith: scheduledTaskXml(winSpec()) })
    const removed = await cmdletRun.provider.uninstall(winSpec())
    expect(removed.ok).toBe(true)
    expect(removed.changed).toBe(true)
    expect(cmdletRun.runner.lines().some(line => line.includes('Unregister-ScheduledTask'))).toBe(true)

    const legacy = taskRunner({ cmdlet: false, startWith: scheduledTaskXml(winSpec()), deleteExit: 1 })
    const legacyRemoved = await legacy.provider.uninstall(winSpec())
    expect(legacyRemoved.ok).toBe(true)
    expect(legacyRemoved.changed).toBe(true)
    expect(legacy.runner.lines().some(line => line.includes('/Delete /TN home-hosted /F'))).toBe(true)
  })

  it('treats an absent task as already gone on uninstall', async () => {
    const { provider } = taskRunner()
    const result = await provider.uninstall(winSpec())
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(false)
    expect(result.detail).toMatch(/already gone/)
  })
})
