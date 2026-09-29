/**
 * Windows: the per-user `Run` key (login scope, no admin) and a scheduled task
 * (admin). `sc.exe` is never used — a plain Node process has no service
 * dispatcher and would fail with error 1053.
 *
 * The `Run` key starts *every* value it holds, so the ownership marker cannot
 * live beside the command there; it lives under this plugin's own key
 * (`HKCU\Software\home-hosted`), and a `Run` value is only touched when that
 * marker proves we wrote it.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { BootCandidate, BootState } from '../shared/contracts.js'
import type { BootActionResult, BootProvider, BootProviderContext, BootProviderStatus, BootRetirement, BootSpec, BootStart } from './types.js'
import {
  assertAbsolute,
  assertArg,
  assertEnvKey,
  assertLabel,
  assertMarker,
  assertRegistryValueName,
  assertUnitName,
  batchCommandLine,
  powershellLiteral,
  windowsArg,
  windowsCommandLine,
  windowsDisplayCommand,
  xmlEscape,
  xmlUnescape,
} from './escape.js'
import { bootState, errorMessage, failed, inspectOwned, localAppData, removeOwned, tempDir, writeOwned } from './common.js'

export const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
export const MARKER_KEY = 'HKCU\\Software\\home-hosted'
const RUN_VALUE_LIMIT = 260

function validate(spec: BootSpec): void {
  assertUnitName(spec.unitName)
  assertMarker(spec.marker)
  assertLabel(spec.label)
  assertAbsolute(spec.command, 'spec.command')
  assertAbsolute(spec.cwd, 'spec.cwd')
  for (const arg of spec.args)
    assertArg(arg)
  for (const key of Object.keys(spec.env))
    assertEnvKey(key)
}

function codeOf(result: { code: number | null, error?: string | null }): number | null {
  return result.error ? null : result.code
}

function problem(run: { code: number | null, error?: string | null, stdout: string, stderr: string }, command: string): string | null {
  const code = codeOf(run)
  if (code === 0)
    return null
  if (code === null)
    return run.error ? `${command}: ${run.error}` : `${command}: no exit code`
  return `${command} exited ${code}: ${(run.stderr || run.stdout).trim() || '(no output)'}`
}

interface RegValue {
  exists: boolean
  data: string | null
}

async function queryReg(ctx: BootProviderContext, key: string, name: string): Promise<RegValue> {
  const res = await ctx.run('reg.exe', ['query', key, '/v', name])
  if (res.error || res.code !== 0)
    return { exists: false, data: null }
  for (const line of res.stdout.split(/\r?\n/)) {
    const match = /^\s{2,}(.+?)\s{2,}(REG_[A-Z_]+)\s{2,}(.*)$/.exec(line)
    if (match && match[1]?.trim() === name)
      return { exists: true, data: (match[3] ?? '').trim() }
  }
  return { exists: false, data: null }
}

export interface WindowsRunPayload {
  /** The exact `Run` value data. */
  data: string
  /** Set when the command line exceeded the `Run` value limit and a `.cmd` wrapper is needed. */
  wrapperPath: string | null
  wrapperContent: string | null
}

export function windowsRunPayload(ctx: BootProviderContext, spec: BootSpec): WindowsRunPayload {
  const direct = windowsCommandLine(spec.command, spec.args)
  if (direct.length <= RUN_VALUE_LIMIT)
    return { data: direct, wrapperPath: null, wrapperContent: null }
  const wrapperPath = path.join(localAppData(ctx), 'home-hosted', `${spec.unitName}.cmd`)
  return {
    data: `cmd.exe /c ${windowsArg(wrapperPath)}`,
    wrapperPath,
    wrapperContent: `@echo off\r\nrem ${spec.marker}\r\n${batchCommandLine(spec.command, spec.args)}\r\n`,
  }
}

function createWindowsRunProviderImpl(ctx: BootProviderContext): BootProvider {
  const mechanism = 'windows-run' as const
  const nameOf = (spec: BootSpec): string => assertRegistryValueName(assertUnitName(spec.unitName))

  const addValue = (key: string, name: string, data: string) =>
    ctx.run('reg.exe', ['add', key, '/v', name, '/t', 'REG_SZ', '/d', data, '/f'])

  return {
    mechanism,

    async detect(): Promise<BootCandidate> {
      if (ctx.platform !== 'win32')
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: 'the Run key is Windows-only' }
      return {
        mechanism,
        available: true,
        bootCapable: false,
        privileged: true,
        reason: `HKCU\\…\\Run needs no admin, but it starts at login rather than at boot`,
      }
    },

    async status(spec: BootSpec): Promise<BootProviderStatus> {
      try {
        const name = nameOf(spec)
        const marker = assertMarker(spec.marker)
        const value = await queryReg(ctx, RUN_KEY, name)
        if (!value.exists)
          return { state: 'not-installed', unitPath: RUN_KEY, detail: `no ${RUN_KEY}\\${name} value`, commands: [] }
        const markerValue = await queryReg(ctx, MARKER_KEY, name)
        const owned = markerValue.data?.includes(marker) === true
        if (!owned)
          return { state: 'not-installed', unitPath: RUN_KEY, detail: `${name} exists under ${RUN_KEY} but is not marked as ours; refusing to treat it as this plugin's entry`, commands: [] }
        const state: BootState = bootState(true, true, false)
        return { state, unitPath: RUN_KEY, detail: `${RUN_KEY}\\${name} starts at login (not at boot)`, commands: [] }
      }
      catch (error) {
        return { state: 'not-installed', unitPath: RUN_KEY, detail: errorMessage(error), commands: [] }
      }
    },

    async install(spec: BootSpec): Promise<BootActionResult> {
      try {
        validate(spec)
        const name = nameOf(spec)
        const marker = assertMarker(spec.marker)
        const payload = windowsRunPayload(ctx, spec)
        const wrapperExists = payload.wrapperPath !== null && fs.existsSync(payload.wrapperPath)
        const wrapperOwn = payload.wrapperPath ? inspectOwned(payload.wrapperPath, marker) : null
        if (wrapperOwn?.exists && !wrapperOwn.owned)
          return failed(wrapperOwn.reason ?? 'foreign wrapper')

        const markerValue = await queryReg(ctx, MARKER_KEY, name)
        const owned = markerValue.data?.includes(marker) === true
        const current = await queryReg(ctx, RUN_KEY, name)
        // A value the marker does not prove is ours is never touched and never
        // claimed, even when it already equals what we would write.
        if (current.exists && !owned)
          return failed(`${RUN_KEY}\\${name} already exists and was not written by this plugin; refusing to overwrite it`)

        const commands: string[] = [
          windowsDisplayCommand('reg.exe', ['add', RUN_KEY, '/v', name, '/t', 'REG_SZ', '/d', payload.data, '/f']),
        ]

        let changed = false
        if (payload.wrapperPath && payload.wrapperContent) {
          const write = writeOwned(payload.wrapperPath, marker, payload.wrapperContent, 0o644)
          if (write.refusal)
            return failed(write.refusal)
          changed = write.changed || changed
        }

        if (!current.exists || current.data !== payload.data) {
          const add = await addValue(RUN_KEY, name, payload.data)
          const addProblem = problem(add, commands[0] ?? 'reg.exe add')
          if (addProblem)
            return failed(addProblem, { changed, commands })
          changed = true
        }
        if (!owned) {
          const mark = await addValue(MARKER_KEY, name, marker)
          const markProblem = problem(mark, windowsDisplayCommand('reg.exe', ['add', MARKER_KEY, '/v', name, '/t', 'REG_SZ', '/d', marker, '/f']))
          if (markProblem)
            return failed(markProblem, { changed, commands })
          changed = true
        }

        const after = await queryReg(ctx, RUN_KEY, name)
        if (after.data !== payload.data)
          return failed(`${RUN_KEY}\\${name} does not read back as the value that was written`, { changed, commands })

        // A wrapper we no longer need is cleaned up so the Run value converges on the direct form.
        if (!payload.wrapperPath && wrapperExists && wrapperOwn?.owned) {
          removeOwned(path.join(localAppData(ctx), 'home-hosted', `${spec.unitName}.cmd`), marker)
        }

        return {
          ok: true,
          changed,
          detail: changed ? `${RUN_KEY}\\${name} installed; it starts at login (not at boot)` : `${RUN_KEY}\\${name} was already installed`,
          commands: [],
          needsPrivilege: false,
        }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    async uninstall(spec: BootSpec): Promise<BootActionResult> {
      try {
        const name = nameOf(spec)
        const marker = assertMarker(spec.marker)
        const current = await queryReg(ctx, RUN_KEY, name)
        const markerValue = await queryReg(ctx, MARKER_KEY, name)
        const owned = markerValue.data?.includes(marker) === true
        if (current.exists && !owned) {
          const payload = windowsRunPayload(ctx, spec)
          const wrapperOwned = payload.wrapperPath !== null ? inspectOwned(payload.wrapperPath, marker).owned : false
          if (current.data !== payload.data && !wrapperOwned)
            return failed(`${RUN_KEY}\\${name} is not marked as ours; refusing to delete a foreign Run value`)
        }

        let changed = false
        if (current.exists) {
          const del = await ctx.run('reg.exe', ['delete', RUN_KEY, '/v', name, '/f'])
          const delCode = codeOf(del)
          if (delCode !== 0 && delCode !== 1)
            return failed(problem(del, windowsDisplayCommand('reg.exe', ['delete', RUN_KEY, '/v', name, '/f'])) ?? 'reg.exe delete failed')
          changed = delCode === 0
        }
        if (owned) {
          await ctx.run('reg.exe', ['delete', MARKER_KEY, '/v', name, '/f'])
          changed = true
        }

        const payload = windowsRunPayload(ctx, spec)
        if (payload.wrapperPath) {
          const remove = removeOwned(payload.wrapperPath, marker)
          if (remove.refusal)
            return failed(remove.refusal)
          changed = remove.removed || changed
        }
        const stale = path.join(localAppData(ctx), 'home-hosted', `${spec.unitName}.cmd`)
        const staleRemove = removeOwned(stale, marker)
        if (staleRemove.refusal)
          return failed(staleRemove.refusal)
        changed = staleRemove.removed || changed

        const after = await queryReg(ctx, RUN_KEY, name)
        if (after.exists)
          return failed(`${RUN_KEY}\\${name} still exists after removal`, { changed })

        return {
          ok: true,
          changed,
          detail: changed ? `removed ${RUN_KEY}\\${name}` : `${RUN_KEY}\\${name} was already gone`,
          commands: [],
          needsPrivilege: false,
        }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    /**
     * The `Run` key is read by the shell at logon; there is no way to make it
     * start something now. Reporting none is what sends the caller back to the
     * CLI, which is the only honest way to bring the panel up here.
     */
    async activate(): Promise<null> {
      return null
    },

    /** Deleting the value and its marker stops nothing that is already running. */
    async retireCommands(spec: BootSpec): Promise<BootRetirement> {
      const name = nameOf(spec)
      return {
        commands: [
          ['reg.exe', 'delete', RUN_KEY, '/v', name, '/f'],
          ['reg.exe', 'delete', MARKER_KEY, '/v', name, '/f'],
        ],
        display: [
          windowsDisplayCommand('reg.exe', ['delete', RUN_KEY, '/v', name, '/f']),
          windowsDisplayCommand('reg.exe', ['delete', MARKER_KEY, '/v', name, '/f']),
        ],
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Scheduled task
// ---------------------------------------------------------------------------

export function scheduledTaskXml(spec: BootSpec): string {
  validate(spec)
  const args = spec.args.map(windowsArg).join(' ')
  return `${[
    '<?xml version="1.0" encoding="UTF-16"?>',
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
    '<RegistrationInfo>',
    `<Description>${xmlEscape(spec.marker)}</Description>`,
    '</RegistrationInfo>',
    '<Triggers>',
    '<LogonTrigger>',
    '<Enabled>true</Enabled>',
    '</LogonTrigger>',
    '</Triggers>',
    '<Principals>',
    '<Principal id="Author">',
    '<LogonType>InteractiveToken</LogonType>',
    '<RunLevel>LeastPrivilege</RunLevel>',
    '</Principal>',
    '</Principals>',
    '<Settings>',
    '<MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>',
    '<DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>',
    '<StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>',
    '<StartWhenAvailable>true</StartWhenAvailable>',
    '<RestartOnFailure>',
    '<Interval>PT1M</Interval>',
    '<Count>3</Count>',
    '</RestartOnFailure>',
    '<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>',
    '</Settings>',
    '<Actions Context="Author">',
    '<Exec>',
    `<Command>${xmlEscape(spec.command)}</Command>`,
    `<Arguments>${xmlEscape(args)}</Arguments>`,
    `<WorkingDirectory>${xmlEscape(spec.cwd)}</WorkingDirectory>`,
    '</Exec>',
    '</Actions>',
    '</Task>',
    '',
  ].join('\r\n')}`
}

export function registerTaskScript(spec: BootSpec): string {
  validate(spec)
  const args = spec.args.map(windowsArg).join(' ')
  return [
    `$action = New-ScheduledTaskAction -Execute ${powershellLiteral(spec.command)} -Argument ${powershellLiteral(args)} -WorkingDirectory ${powershellLiteral(spec.cwd)}`,
    '$trigger = New-ScheduledTaskTrigger -AtLogOn',
    '$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries',
    `Register-ScheduledTask -TaskName ${powershellLiteral(spec.unitName)} -Action $action -Trigger $trigger -Settings $settings -Description ${powershellLiteral(spec.marker)} -Force | Out-Null`,
  ].join('; ')
}

export function unregisterTaskScript(name: string): string {
  return `Unregister-ScheduledTask -TaskName ${powershellLiteral(assertUnitName(name))} -Confirm:$false`
}

function xmlTag(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml)
  return match?.[1] === undefined ? null : xmlUnescape(match[1].trim())
}

interface TaskInfo {
  exists: boolean
  xml: string | null
  marked: boolean
  matches: boolean
}

export function createWindowsTaskProvider(ctx: BootProviderContext): BootProvider {
  const mechanism = 'windows-task' as const
  const nameOf = (spec: BootSpec): string => assertUnitName(spec.unitName)

  const query = async (name: string): Promise<{ exists: boolean, xml: string | null }> => {
    const res = await ctx.run('schtasks.exe', ['/Query', '/TN', name, '/XML'])
    if (res.error || res.code !== 0)
      return { exists: false, xml: null }
    return { exists: true, xml: res.stdout }
  }

  const inspect = async (spec: BootSpec): Promise<TaskInfo> => {
    const found = await query(nameOf(spec))
    if (!found.exists || found.xml === null)
      return { exists: false, xml: null, marked: false, matches: false }
    const marked = xmlUnescape(found.xml).includes(spec.marker)
    const args = spec.args.map(windowsArg).join(' ')
    const matches = marked
      && xmlTag(found.xml, 'Command') === spec.command
      && xmlTag(found.xml, 'Arguments') === args
      && (xmlTag(found.xml, 'WorkingDirectory') ?? spec.cwd) === spec.cwd
    return { exists: true, xml: found.xml, marked, matches }
  }

  const hasRegisterCmdlet = async (): Promise<boolean> => {
    const probe = await ctx.run('powershell.exe', ['-NoProfile', '-Command', 'Get-Command Register-ScheduledTask'])
    return probe.error === undefined || probe.error === null
      ? /Register-ScheduledTask/.test(probe.stdout)
      : false
  }

  const isElevated = async (): Promise<boolean> => {
    const script = '([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'
    const probe = await ctx.run('powershell.exe', ['-NoProfile', '-Command', script])
    return probe.error === undefined || probe.error === null ? /^true$/im.test(probe.stdout.trim()) : false
  }

  return {
    mechanism,

    async detect(): Promise<BootCandidate> {
      if (ctx.platform !== 'win32')
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: 'scheduled tasks are Windows-only' }
      const elevated = await isElevated()
      return {
        mechanism,
        available: elevated,
        bootCapable: false,
        privileged: elevated,
        reason: elevated
          ? 'administrator rights are available; the task is registered for logon (not for boot)'
          : 'registering a scheduled task needs an elevated process',
      }
    },

    async status(spec: BootSpec): Promise<BootProviderStatus> {
      try {
        const name = nameOf(spec)
        const info = await inspect(spec)
        if (!info.exists)
          return { state: 'not-installed', unitPath: null, detail: `no scheduled task named ${name}`, commands: [] }
        if (!info.marked)
          return { state: 'not-installed', unitPath: null, detail: `task ${name} exists but does not carry this plugin's marker; refusing to treat it as this plugin's entry`, commands: [] }
        const state: BootState = bootState(true, true, false)
        return { state, unitPath: null, detail: `scheduled task ${name} is registered (runs at logon, not at boot)`, commands: [] }
      }
      catch (error) {
        return { state: 'not-installed', unitPath: null, detail: errorMessage(error), commands: [] }
      }
    },

    async install(spec: BootSpec): Promise<BootActionResult> {
      try {
        validate(spec)
        const name = nameOf(spec)
        const info = await inspect(spec)
        if (info.exists && !info.marked)
          return failed(`scheduled task ${name} already exists and was not written by this plugin; refusing to overwrite it`)
        if (!(await isElevated()))
          return failed('registering a scheduled task needs an elevated process', { needsPrivilege: true })

        const elevatedCommands = [
          windowsDisplayCommand('powershell.exe', ['-NoProfile', '-Command', unregisterTaskScript(name)]),
          windowsDisplayCommand('schtasks.exe', ['/Query', '/TN', name, '/XML']),
        ]

        if (info.exists && info.matches) {
          const verify = await query(name)
          if (verify.exists)
            return { ok: true, changed: false, detail: `scheduled task ${name} is already registered`, commands: [], needsPrivilege: true }
        }

        const cmdlet = await hasRegisterCmdlet()
        if (cmdlet) {
          const script = registerTaskScript(spec)
          const res = await ctx.run('powershell.exe', ['-NoProfile', '-Command', script])
          if (codeOf(res) !== 0)
            return failed(problem(res, windowsDisplayCommand('powershell.exe', ['-NoProfile', '-Command', script])) ?? 'Register-ScheduledTask failed', { needsPrivilege: true, commands: elevatedCommands })
        }
        else {
          const xmlFile = path.join(tempDir(ctx), `${name}.xml`)
          fs.mkdirSync(path.dirname(xmlFile), { recursive: true })
          fs.writeFileSync(xmlFile, Buffer.from(`\uFEFF${scheduledTaskXml(spec)}`, 'utf16le'))
          const createCommand = windowsDisplayCommand('schtasks.exe', ['/Create', '/TN', name, '/XML', xmlFile, '/F'])
          const create = await ctx.run('schtasks.exe', ['/Create', '/TN', name, '/XML', xmlFile, '/F'])
          if (codeOf(create) !== 0)
            return failed(problem(create, createCommand) ?? 'schtasks /Create failed', { needsPrivilege: true, commands: [createCommand] })
          fs.rmSync(xmlFile, { force: true })
        }

        const after = await query(name)
        if (!after.exists)
          return failed(`scheduled task ${name} was not found after registration`, { changed: true, needsPrivilege: true, commands: elevatedCommands })

        return {
          ok: true,
          changed: true,
          detail: `scheduled task ${name} registered (runs at logon, not at boot)`,
          commands: [],
          needsPrivilege: true,
        }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    async uninstall(spec: BootSpec): Promise<BootActionResult> {
      try {
        const name = nameOf(spec)
        const info = await inspect(spec)
        if (!info.exists)
          return { ok: true, changed: false, detail: `no scheduled task named ${name}; already gone`, commands: [], needsPrivilege: false }
        if (!info.marked)
          return failed(`scheduled task ${name} is not marked as ours; refusing to delete a foreign task`)
        if (!(await isElevated()))
          return failed('deleting a scheduled task needs an elevated process', { needsPrivilege: true })

        const cmdlet = await hasRegisterCmdlet()
        const res = cmdlet
          ? await ctx.run('powershell.exe', ['-NoProfile', '-Command', unregisterTaskScript(name)])
          : await ctx.run('schtasks.exe', ['/Delete', '/TN', name, '/F'])
        const code = codeOf(res)
        if (code !== 0 && code !== 1)
          return failed(problem(res, cmdlet ? 'powershell.exe Unregister-ScheduledTask' : windowsDisplayCommand('schtasks.exe', ['/Delete', '/TN', name, '/F'])) ?? 'unregistering the task failed', { needsPrivilege: true })

        const after = await query(name)
        if (after.exists)
          return failed(`scheduled task ${name} still exists after removal`, { changed: true, needsPrivilege: true })

        return {
          ok: true,
          changed: true,
          detail: `unregistered scheduled task ${name}`,
          commands: [],
          needsPrivilege: true,
        }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    /**
     * `/Run` starts the registered task now, and the query proves the task is
     * really registered before the panel is touched. A task does not restart a
     * panel it does not own, so the caller stops the one it drove first.
     */
    async activate(spec: BootSpec): Promise<BootStart> {
      const name = nameOf(spec)
      return {
        commands: [['schtasks.exe', '/Run', '/TN', name]],
        requires: { commands: [['schtasks.exe', '/Query', '/TN', name]], files: [] },
        display: [windowsDisplayCommand('schtasks.exe', ['/Run', '/TN', name])],
      }
    },

    /** Unregistering a task stops nothing that is already running. */
    async retireCommands(spec: BootSpec): Promise<BootRetirement> {
      const name = nameOf(spec)
      const cmdlet = await hasRegisterCmdlet()
      return {
        commands: [cmdlet
          ? ['powershell.exe', '-NoProfile', '-Command', unregisterTaskScript(name)]
          : ['schtasks.exe', '/Delete', '/TN', name, '/F']],
        display: [windowsDisplayCommand('schtasks.exe', ['/Delete', '/TN', name, '/F'])],
      }
    },
  }
}

export function createWindowsRunProvider(ctx: BootProviderContext): BootProvider {
  return createWindowsRunProviderImpl(ctx)
}
