/**
 * Windows: the per-user `Run` key (login scope, no admin), a logon triggered task
 * (admin) and a boot triggered SYSTEM task (admin, opt-in). `sc.exe` is never used
 * — a plain Node process has no service dispatcher and would fail with error 1053.
 *
 * The `Run` key starts *every* value it holds, so the ownership marker cannot
 * live beside the command there; it lives under this plugin's own key
 * (`HKCU\Software\home-hosted`), and a `Run` value is only touched when that
 * marker proves we wrote it.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { BootCandidate, BootState } from '../shared/contracts.js'
import type { BootActionResult, BootControl, BootProvider, BootProviderContext, BootProviderStatus, BootRetirement, BootSpec, BootStart } from './types.js'
import {
  assertAbsolute,
  assertArg,
  assertEnvKey,
  assertLabel,
  assertMarker,
  assertRegistryValueName,
  assertUnitName,
  batchCommandLine,
  isAbsolutePath,
  powershellLiteral,
  windowsArg,
  windowsCommandLine,
  windowsDisplayCommand,
  xmlEscape,
  xmlUnescape,
  vbscriptString,
} from './escape.js'
import { bootState, errorMessage, existsOf, failed, inspectOwned, localAppData, removeOwned, tempDir, writeOwned } from './common.js'

export const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
export const MARKER_KEY = 'HKCU\\Software\\home-hosted'
const RUN_VALUE_LIMIT = 260

/**
 * Why the wrapper exists at all: **`wscript.exe` is a GUI-subsystem binary.**
 *
 * `node.exe` is console-subsystem (PE `Subsystem=3`, measured), so a task or a `Run`
 * value that starts it inherits no console, Windows allocates one, and the user sees a
 * console window at every logon. `wscript.exe` is `Subsystem=2` (also measured), so it
 * cannot allocate a console — the window is impossible by construction rather than
 * hidden. Measured from inside the started process with `GetConsoleWindow` +
 * `IsWindowVisible`: task -> `node.exe` is `visible=True`; task -> `wscript.exe <vbs>`
 * is `visible=False`. The task's `<Hidden>true</Hidden>` does *not* help, and a
 * `conhost.exe --headless` wrapper is disqualified for a different reason: it turns a
 * child exit of 7 into an exit of 0, which would blind `RestartOnFailure`. The wrapper
 * below preserves the code (measured `Last Result: 7`).
 *
 * Returns null when this machine does not provably have one, and null is the signal every
 * caller uses to keep today's direct command: a machine whose `SystemRoot` we cannot read
 * is not a machine whose wrapper we can name, and a bare
 * `wscript.exe` would not be an absolute `spec.command` (`validate()` refuses it), so
 * guessing one there would break the install instead of improving it.
 */
export function wscriptExecutable(ctx: BootProviderContext): string | null {
  const root = ctx.env.SystemRoot?.trim() || ctx.env.windir?.trim()
  if (root === undefined || root === '' || !isAbsolutePath(root))
    return null
  const candidate = path.win32.join(root, 'System32', 'wscript.exe')
  return existsOf(ctx, candidate) ? candidate : null
}

/** The `.vbs` this spec's launch goes through, in the same directory as the `.cmd` fallback. */
export function hiddenLaunchPath(ctx: BootProviderContext, spec: BootSpec): string {
  return path.join(localAppData(ctx), 'home-hosted', `${assertUnitName(spec.unitName)}.vbs`)
}

/**
 * The wrapper's own exit code when it could not start the child at all.
 *
 * Not 0: a wrapper that could not launch anything must not look like a clean exit, or
 * `RestartOnFailure` and the launcher's retry branch both read the failure as success.
 */
const WRAPPER_FAILURE = 90

/**
 * The `.vbs` source: a marker comment, then the real command line run hidden and waited on.
 *
 * Two things here are **measured**, and the two guards cover different failures — neither
 * is redundant, which a matrix of the four combinations showed:
 *
 * | shape | unstartable child | missing `.vbs` |
 * | --- | --- | --- |
 * | bare `sh.Run`, no `//B` | **hangs** on a modal dialog (no exit in 120 s) | **hangs** |
 * | bare `sh.Run`, `//B` | exits **0** — a false success | exits 1 |
 * | `On Error` guards, no `//B` | exits 90 | n/a (the script never runs) |
 * | `On Error` guards, `//B` | exits 90 | exits 1 |
 *
 * So `//B` is what stops the wrapper hanging before it can even report, and `On Error` is
 * what stops a failed launch reading as **exit 0** — the same blind spot that disqualified
 * `conhost --headless` (child 7 -> 0). Both are needed: `//B` alone makes a broken wrapper
 * look healthy to `RestartOnFailure`, and the guards alone cannot run at all when the
 * script itself is missing.
 *
 * The command line is the **original** spec's. Deriving it from the windowless spec would
 * make the wrapper launch `wscript.exe` again and recurse.
 *
 * A marker is safe inside the comment because `assertNoControl` already refuses the one
 * character that ends a VBScript comment: a bare `CR` (measured to run the text after
 * it as code — exit 42), while `LF` does too but `assertNoControl` refuses it as well.
 * `U+2028`, `U+2029` and `U+0085` were each measured to stay inside the comment.
 */
export function hiddenLaunchScript(spec: BootSpec, marker = spec.marker): string {
  validate(spec)
  assertMarker(marker)
  return [
    `' ${marker}`,
    'On Error Resume Next',
    'Set sh = CreateObject("WScript.Shell")',
    `If Err.Number <> 0 Then WScript.Quit ${WRAPPER_FAILURE}`,
    `rc = sh.Run(${vbscriptString(windowsCommandLine(spec.command, spec.args))}, 0, True)`,
    `If Err.Number <> 0 Then WScript.Quit ${WRAPPER_FAILURE}`,
    'WScript.Quit rc',
    '',
  ].join('\r\n')
}

/** A derived spec plus the artifact it needs, or `scriptPath: null` for no wrapper. */
export interface HiddenLaunch {
  /** What the entry must start. The input spec itself when no wrapper is used. */
  spec: BootSpec
  /** The `.vbs` that must exist for this launch to work, or null. */
  scriptPath: string | null
}

/**
 * The **one** derivation of the launch an entry performs.
 *
 * Everything that has to agree about it goes through here: `install()` writes what this
 * names, `status()`/`inspect()` compare the registered artifact against it, and
 * `uninstall()`/`retireCommands()` remove exactly it. A second derivation — even one
 * that looks the same — is the bug this shape exists to prevent, because the symptom is
 * `changed: true` on every re-install and a page that reports drift that is not there.
 *
 * `//B` is batch mode, and it is load-bearing: without it a missing `.vbs` (deleted by
 * hand, or an interrupted uninstall) makes `wscript.exe` open a modal "Input Error" dialog
 * and never exit — measured: still alive after 120 s. It does not touch a real child's exit
 * code (7 either way), which is why the *failure* case still needs the script's own guards.
 * See `hiddenLaunchScript` for the full matrix.
 */
export function hiddenLaunch(ctx: BootProviderContext, spec: BootSpec): HiddenLaunch {
  // Validated **here**, on the input spec, before anything is derived. The derivation
  // replaces `command`/`args` with the wrapper's, so a hostile `command` or `unitName`
  // would otherwise be validated only in the derived form — and `uninstall()` reaches
  // this path with only `assertMarker` behind it. That is the same guard
  // `windowsRunPayload` carries, applied to the value the caller actually passed.
  validate(spec)
  const wscript = wscriptExecutable(ctx)
  if (wscript === null)
    return { spec, scriptPath: null }
  const scriptPath = hiddenLaunchPath(ctx, spec)
  return { spec: { ...spec, command: wscript, args: ['//B', '//nologo', scriptPath] }, scriptPath }
}

/** The windowless form of a spec; the spec itself when this machine has no `wscript.exe`. */
export function windowlessSpec(ctx: BootProviderContext, spec: BootSpec): BootSpec {
  return hiddenLaunch(ctx, spec).spec
}

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
  // Every other artifact builder validates its own spec (`systemdUserUnit`,
  // `systemdSystemUnit`, `launchdPlist`, `xdgDesktopEntry`), and this one interpolates
  // `spec.marker` into a `rem` line and `spec.unitName` into a path of the generated `.cmd`.
  //
  // The guard is load-bearing, not merely defensive: `install()` validates before calling, but
  // **`uninstall()` does not** — it calls only `assertMarker`, then reaches here twice (once to
  // inspect the owned wrapper, once to remove it). Without this, `unitName` would reach
  // `path.join(..., `${spec.unitName}.cmd`)` unchecked, and a value like `../evil` would escape
  // the directory. An earlier version of this comment claimed every caller validates; two do not.
  validate(spec)
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

/**
 * The `.cmd` fallback's path, which `windowsRunPayload` writes for a long command line.
 *
 * Named here as well as there because the *removal* paths have to find it without
 * knowing whether this install used it: the `.cmd` may be left over from an install
 * made before the wrapper existed, or from a machine whose `wscript.exe` has since gone.
 */
function legacyWrapperPath(ctx: BootProviderContext, spec: BootSpec): string {
  return path.join(localAppData(ctx), 'home-hosted', `${assertUnitName(spec.unitName)}.cmd`)
}

/** Every file the `Run` mechanism can leave behind for one spec. */
function runArtifacts(ctx: BootProviderContext, spec: BootSpec): { script: string, wrapper: string } {
  return { script: hiddenLaunchPath(ctx, spec), wrapper: legacyWrapperPath(ctx, spec) }
}

/** One refusal for the first artifact that exists and is not ours; null when all are ours or absent. */
function foreignArtifact(files: readonly string[], marker: string): string | null {
  for (const file of files) {
    const own = inspectOwned(file, marker)
    if (own.exists && !own.owned)
      return own.reason ?? `${file} was not written by this plugin; refusing to touch it`
  }
  return null
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
        // The value names the wrapper, so a wrapper that is gone makes the entry start
        // nothing — reporting `enabled-running` there would hide exactly the failure a
        // person needs to see. Only checked when this machine's launch *is* the wrapper.
        const launch = hiddenLaunch(ctx, spec)
        if (launch.scriptPath !== null && !existsOf(ctx, launch.scriptPath)) {
          const state: BootState = bootState(true, true, true)
          return { state, unitPath: RUN_KEY, detail: `${RUN_KEY}\\${name} starts at login, but its wrapper ${launch.scriptPath} is missing, so it would start nothing`, commands: [] }
        }
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
        const launch = hiddenLaunch(ctx, spec)
        const artifacts = runArtifacts(ctx, spec)
        // Nothing is mutated while a file this install would touch is somebody else's.
        const foreign = foreignArtifact([artifacts.script, artifacts.wrapper], marker)
        if (foreign !== null)
          return failed(foreign)

        // The windowless form is what the entry starts; the payload builder only quotes it.
        const payload = windowsRunPayload(ctx, launch.spec)

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

        /**
         * Exactly the artifacts this launch needs, and then whatever the *other* form
         * left behind. The fallback's `.cmd` converges away once the wrapper takes over,
         * and an orphaned `.vbs` converges away if the wrapper ever cannot be used —
         * so a re-install is a no-op in either direction instead of reporting `changed`.
         */
        const wanted: Array<{ path: string, content: string }> = []
        if (launch.scriptPath !== null)
          wanted.push({ path: launch.scriptPath, content: hiddenLaunchScript(spec, marker) })
        if (payload.wrapperPath !== null && payload.wrapperContent !== null)
          wanted.push({ path: payload.wrapperPath, content: payload.wrapperContent })
        const stale = [artifacts.script, artifacts.wrapper].filter(file => !wanted.some(entry => entry.path === file))

        let changed = false
        for (const artifact of wanted) {
          const write = writeOwned(artifact.path, marker, artifact.content, 0o644)
          if (write.refusal)
            return failed(write.refusal)
          changed = write.changed || changed
        }
        for (const file of stale) {
          const remove = removeOwned(file, marker)
          if (remove.refusal)
            return failed(remove.refusal)
          changed = remove.removed || changed
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
        const launch = hiddenLaunch(ctx, spec)
        const payload = windowsRunPayload(ctx, launch.spec)
        const artifacts = runArtifacts(ctx, spec)
        if (current.exists && !owned) {
          const artifactOwned = [artifacts.script, artifacts.wrapper].some(file => inspectOwned(file, marker).owned)
          if (current.data !== payload.data && !artifactOwned)
            return failed(`${RUN_KEY}\\${name} is not marked as ours; refusing to delete a foreign Run value`)
        }

        /**
         * Prove every file this removal touches is ours BEFORE mutating the registry.
         *
         * The other order deleted the `Run` value first and only then refused a foreign wrapper,
         * leaving the entry gone while reporting failure — and the retry could never succeed,
         * because `status()` reads a missing value as `not-installed`. A refusal has to leave the
         * machine exactly as it was.
         */
        const foreign = foreignArtifact([artifacts.script, artifacts.wrapper], marker)
        if (foreign !== null)
          return failed(foreign)

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

        // Already proved ours above, so only a deletion failure can remain.
        for (const file of [artifacts.script, artifacts.wrapper]) {
          const remove = removeOwned(file, marker)
          if (remove.refusal)
            return failed(remove.refusal)
          changed = remove.removed || changed
        }

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
     * CLI, which is the only honest way to bring the panel up here — and, for the
     * same reason, the only way to stop what it started.
     */
    async activate(): Promise<null> {
      return null
    },

    /**
     * Deleting the value and its marker stops nothing that is already running.
     *
     * The wrapper goes too, or every switch away from this mechanism would leave a `.vbs`
     * that a later login could never run. Ownership is decided **here**, at plan time,
     * exactly as the systemd retirement decides it: the step is only emitted for a file
     * this plugin wrote. `Remove-Item -LiteralPath` is used rather than `del` because
     * these steps run argv-only, with no shell to quote `&` or `%` for.
     */
    async retireCommands(spec: BootSpec): Promise<BootRetirement> {
      const name = nameOf(spec)
      const marker = assertMarker(spec.marker)
      const artifacts = runArtifacts(ctx, spec)
      const ours = [artifacts.script, artifacts.wrapper].filter(file => inspectOwned(file, marker).owned)
      const removeFiles = ours.map(file => ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', `Remove-Item -LiteralPath ${powershellLiteral(file)} -Force -ErrorAction SilentlyContinue`])
      return {
        commands: [
          ['reg.exe', 'delete', RUN_KEY, '/v', name, '/f'],
          ['reg.exe', 'delete', MARKER_KEY, '/v', name, '/f'],
          ...removeFiles,
        ],
        display: [
          windowsDisplayCommand('reg.exe', ['delete', RUN_KEY, '/v', name, '/f']),
          windowsDisplayCommand('reg.exe', ['delete', MARKER_KEY, '/v', name, '/f']),
          ...ours.map(file => windowsDisplayCommand('powershell.exe', ['-NoProfile', '-Command', `Remove-Item -LiteralPath ${powershellLiteral(file)} -Force`])),
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

/**
 * The boot task's name, which must differ from the logon task's.
 *
 * Both mechanisms key their artifact on `spec.unitName`, so sharing it would mean
 * installing one silently replaces the other — and switching between them is the
 * one thing a person wants to be able to undo.
 */
export function bootTaskNameOf(unitName: string): string {
  return `${assertUnitName(unitName)}-boot`
}

/**
 * The boot-triggered task, which runs the panel as SYSTEM before any login.
 *
 * Deliberately narrow: a `BootTrigger` and the `S-1-5-18` well-known SYSTEM SID,
 * with no stored password anywhere. A named account would need `PASSWORD` logon
 * credentials written into the artifact, which this plugin will not do — that is a
 * credential store, not a boot entry.
 *
 * The cost is real and unavoidable: SYSTEM runs in **session 0**, which has no
 * interactive desktop, so a supervised server that needs a display or the user's
 * own profile breaks there. That is why this mechanism is opt-in and never
 * recommended automatically.
 */
export function bootTaskXml(spec: BootSpec): string {
  validate(spec)
  const args = spec.args.map(windowsArg).join(' ')
  return `${[
    '<?xml version="1.0" encoding="UTF-16"?>',
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
    '<RegistrationInfo>',
    `<Description>${xmlEscape(spec.marker)}</Description>`,
    '</RegistrationInfo>',
    '<Triggers>',
    // `Delay` gives the network stack and disks a moment, matching the systemd
    // unit's `After=network-online.target` intent.
    '<BootTrigger>',
    '<Enabled>true</Enabled>',
    '<Delay>PT15S</Delay>',
    '</BootTrigger>',
    '</Triggers>',
    '<Principals>',
    '<Principal id="Author">',
    '<UserId>S-1-5-18</UserId>',
    '<RunLevel>HighestAvailable</RunLevel>',
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

/** The cmdlet form of {@link bootTaskXml}; `-AtStartup` with a SYSTEM principal. */
export function registerBootTaskScript(spec: BootSpec): string {
  validate(spec)
  const name = bootTaskNameOf(spec.unitName)
  const args = spec.args.map(windowsArg).join(' ')
  return [
    `$action = New-ScheduledTaskAction -Execute ${powershellLiteral(spec.command)} -Argument ${powershellLiteral(args)} -WorkingDirectory ${powershellLiteral(spec.cwd)}`,
    '$trigger = New-ScheduledTaskTrigger -AtStartup',
    `$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest`,
    '$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)',
    `Register-ScheduledTask -TaskName ${powershellLiteral(name)} -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description ${powershellLiteral(spec.marker)} -Force | Out-Null`,
  ].join('; ')
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

/**
 * What differs between the two scheduled-task mechanisms.
 *
 * Everything else — the ownership marker, the elevation probe, the drift check
 * and the unregister path — is identical, so it lives in one implementation. A
 * copy would be the bug: two guards that look alike and only one of them runs.
 */
interface TaskFlavour {
  mechanism: 'windows-task' | 'windows-boot'
  /** The task name this flavour owns; the two must never collide. */
  nameOf: (spec: BootSpec) => string
  xml: (spec: BootSpec) => string
  script: (spec: BootSpec) => string
  /**
   * Whether the registered action must go through the windowless wrapper.
   *
   * `true` only for the logon task, because only an interactive logon has a desktop to
   * show a console on. `false` for the boot task, and that is a **measurement**, not a
   * preference: a SYSTEM task runs in session 0, which has no interactive desktop, so a
   * task that starts `node.exe` there already measured `visible=False`. Adding the
   * wrapper would buy nothing and would put a second artifact between SYSTEM and the
   * panel.
   */
  hideWindow: boolean
  /** How the entry starts the panel. */
  describe: string
  /** Whether it starts the panel before an interactive login. */
  bootCapable: boolean
  detectReason: { elevated: string, anonymous: string }
}

const LOGON_TASK: TaskFlavour = {
  mechanism: 'windows-task',
  nameOf: spec => assertUnitName(spec.unitName),
  xml: scheduledTaskXml,
  script: registerTaskScript,
  // Measured `visible=True` for a task that starts node.exe at logon; a wrapper is
  // the only shape that removes the console rather than hiding it.
  hideWindow: true,
  describe: 'runs at logon, not at boot',
  bootCapable: false,
  detectReason: {
    elevated: 'administrator rights are available; the task is registered for logon (not for boot)',
    anonymous: 'registering a scheduled task needs an elevated process',
  },
}

const BOOT_TASK: TaskFlavour = {
  mechanism: 'windows-boot',
  nameOf: spec => bootTaskNameOf(spec.unitName),
  xml: bootTaskXml,
  script: registerBootTaskScript,
  // No wrapper: session 0 has no interactive desktop, so a SYSTEM task that starts
  // node.exe directly already measured `visible=False`. See `TaskFlavour.hideWindow`.
  hideWindow: false,
  describe: 'runs at boot as SYSTEM, before any login, in session 0',
  bootCapable: true,
  detectReason: {
    elevated: 'administrator rights are available; the boot task runs as SYSTEM in session 0, with no interactive desktop',
    anonymous: 'registering a boot task needs an elevated process',
  },
}

function createTaskProvider(ctx: BootProviderContext, flavour: TaskFlavour): BootProvider {
  const mechanism = flavour.mechanism
  const nameOf = flavour.nameOf

  /**
   * What this flavour's registered action must actually name.
   *
   * The single derivation: `inspect()` (and so `status()`), `install()` and the two
   * removal paths all ask this, never the raw spec. `hideWindow` is the whole difference
   * between the mechanisms, and a second place deciding it is how an install starts
   * rewriting a task that already matches.
   */
  const entryOf = (spec: BootSpec): HiddenLaunch => flavour.hideWindow ? hiddenLaunch(ctx, spec) : { spec, scriptPath: null }

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
    const entry = entryOf(spec).spec
    const args = entry.args.map(windowsArg).join(' ')
    const matches = marked
      && xmlTag(found.xml, 'Command') === entry.command
      && xmlTag(found.xml, 'Arguments') === args
      && (xmlTag(found.xml, 'WorkingDirectory') ?? spec.cwd) === spec.cwd
    return { exists: true, xml: found.xml, marked, matches }
  }

  /**
   * Write (or converge away) the `.vbs` this flavour's action names.
   *
   * `writeOwned` is idempotent on identical bytes, so a re-install reports `changed:
   * false`; a foreign file refuses the whole install rather than being overwritten.
   */
  const syncArtifact = (spec: BootSpec, entry: HiddenLaunch): { changed: boolean, refusal: string | null } => {
    if (entry.scriptPath === null)
      return { changed: false, refusal: null }
    const write = writeOwned(entry.scriptPath, assertMarker(spec.marker), hiddenLaunchScript(spec, spec.marker), 0o644)
    return { changed: write.changed, refusal: write.refusal }
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
        bootCapable: flavour.bootCapable,
        privileged: elevated,
        reason: elevated ? flavour.detectReason.elevated : flavour.detectReason.anonymous,
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
        // The action names the wrapper, so a missing wrapper means the logon would start
        // nothing. Reported as failing rather than healthy, because the entry a person
        // relies on is the one that does not work.
        const entry = entryOf(spec)
        if (entry.scriptPath !== null && !existsOf(ctx, entry.scriptPath)) {
          const state: BootState = bootState(true, true, true)
          return { state, unitPath: null, detail: `scheduled task ${name} is registered, but its wrapper ${entry.scriptPath} is missing, so it would start nothing (${flavour.describe})`, commands: [] }
        }
        const state: BootState = bootState(true, true, false)
        return { state, unitPath: null, detail: `scheduled task ${name} is registered (${flavour.describe})`, commands: [] }
      }
      catch (error) {
        return { state: 'not-installed', unitPath: null, detail: errorMessage(error), commands: [] }
      }
    },

    async install(spec: BootSpec): Promise<BootActionResult> {
      try {
        validate(spec)
        const name = nameOf(spec)
        const marker = assertMarker(spec.marker)
        const info = await inspect(spec)
        if (info.exists && !info.marked)
          return failed(`scheduled task ${name} already exists and was not written by this plugin; refusing to overwrite it`)
        if (!(await isElevated()))
          return failed('registering a scheduled task needs an elevated process', { needsPrivilege: true })

        const elevatedCommands = [
          windowsDisplayCommand('powershell.exe', ['-NoProfile', '-Command', unregisterTaskScript(name)]),
          windowsDisplayCommand('schtasks.exe', ['/Query', '/TN', name, '/XML']),
        ]

        const entry = entryOf(spec)
        if (info.exists && info.matches) {
          // Already registered, but the wrapper it names may not be on disk (a hand
          // deletion, an interrupted uninstall): writing it back is part of the install,
          // and it is a no-op when the bytes already match.
          const artifact = syncArtifact(spec, entry)
          if (artifact.refusal)
            return failed(artifact.refusal, { needsPrivilege: true })
          const verify = await query(name)
          if (verify.exists)
            return { ok: true, changed: artifact.changed, detail: artifact.changed ? `scheduled task ${name} was already registered; its wrapper was rewritten` : `scheduled task ${name} is already registered`, commands: [], needsPrivilege: true }
        }

        // Proved before the task is registered, so a refusal leaves the machine as it was.
        const artifact = syncArtifact(spec, entry)
        if (artifact.refusal)
          return failed(artifact.refusal, { needsPrivilege: true })

        const cmdlet = await hasRegisterCmdlet()
        if (cmdlet) {
          const script = flavour.script(entry.spec)
          const res = await ctx.run('powershell.exe', ['-NoProfile', '-Command', script])
          if (codeOf(res) !== 0)
            return failed(problem(res, windowsDisplayCommand('powershell.exe', ['-NoProfile', '-Command', script])) ?? 'Register-ScheduledTask failed', { needsPrivilege: true, commands: elevatedCommands })
        }
        else {
          const xmlFile = path.join(tempDir(ctx), `${name}.xml`)
          fs.mkdirSync(path.dirname(xmlFile), { recursive: true })
          fs.writeFileSync(xmlFile, Buffer.from(`\uFEFF${flavour.xml(entry.spec)}`, 'utf16le'))
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
          detail: `scheduled task ${name} registered (${flavour.describe})`,
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
        const marker = assertMarker(spec.marker)
        const info = await inspect(spec)
        const entry = entryOf(spec)
        /**
         * Proved before the task is unregistered, exactly as `windows-run.uninstall` does:
         * a refusal must leave the machine as it was, and a foreign `.vbs` at our path
         * would otherwise be reported *after* the entry was already gone.
         */
        if (entry.scriptPath !== null) {
          const own = inspectOwned(entry.scriptPath, marker)
          if (own.exists && !own.owned)
            return failed(own.reason ?? `${entry.scriptPath} was not written by this plugin; refusing to remove anything`)
        }
        if (!info.exists) {
          // No task, but a wrapper left behind by an interrupted removal is still ours to
          // clear — otherwise a later install would adopt an artifact nothing references.
          const orphan = entry.scriptPath === null ? { removed: false, refusal: null } : removeOwned(entry.scriptPath, marker)
          if (orphan.refusal)
            return failed(orphan.refusal)
          return { ok: true, changed: orphan.removed, detail: orphan.removed ? `no scheduled task named ${name}; removed its orphaned wrapper` : `no scheduled task named ${name}; already gone`, commands: [], needsPrivilege: false }
        }
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

        // The task is gone, so the wrapper it named has no reader left.
        const remove = entry.scriptPath === null ? { removed: false, refusal: null } : removeOwned(entry.scriptPath, marker)
        if (remove.refusal)
          return failed(remove.refusal, { changed: true, needsPrivilege: true })

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

    /**
     * `/Run` starts the registered task now. Unlike systemd's `restart` this
     * cannot recover a *wedged* panel: the task is written
     * `MultipleInstancesPolicy=IgnoreNew`, so `/Run` on a running instance is a
     * no-op. There is no graceful restart in `schtasks`, so the wait then reports
     * that the panel did not answer rather than claiming it restarted.
     */
    async startCommands(spec: BootSpec): Promise<BootControl | null> {
      const name = nameOf(spec)
      return {
        commands: [['schtasks.exe', '/Run', '/TN', name]],
        display: [windowsDisplayCommand('schtasks.exe', ['/Run', '/TN', name])],
      }
    },

    /**
     * No stop command, deliberately — measured on Windows 11 via WSL interop: `/End`
     * delivers no shutdown request (a PowerShell `trap` in the task never ran) and
     * left orphans alive while reporting success. The CLI's `down`, which signals
     * the panel's pids, is the only stop here that runs the stop policy.
     */
    async stopCommands(): Promise<null> {
      return null
    },

    /**
     * Unregistering a task stops nothing that is already running.
     *
     * The wrapper is removed in the same plan, and only when the marker proves it is
     * ours: a switch retires the mechanism it came from, and leaving a `.vbs` behind
     * would accumulate an artifact no entry names. `Remove-Item -LiteralPath` runs
     * argv-only, so no shell quotes it and a path with `&` needs no escaping.
     */
    async retireCommands(spec: BootSpec): Promise<BootRetirement> {
      const name = nameOf(spec)
      const entry = entryOf(spec)
      const ours = entry.scriptPath !== null && inspectOwned(entry.scriptPath, assertMarker(spec.marker)).owned
      const cmdlet = await hasRegisterCmdlet()
      return {
        commands: [
          cmdlet
            ? ['powershell.exe', '-NoProfile', '-Command', unregisterTaskScript(name)]
            : ['schtasks.exe', '/Delete', '/TN', name, '/F'],
          ...(ours && entry.scriptPath !== null
            ? [['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', `Remove-Item -LiteralPath ${powershellLiteral(entry.scriptPath)} -Force -ErrorAction SilentlyContinue`]]
            : []),
        ],
        display: [
          windowsDisplayCommand('schtasks.exe', ['/Delete', '/TN', name, '/F']),
          ...(ours && entry.scriptPath !== null
            ? [windowsDisplayCommand('powershell.exe', ['-NoProfile', '-Command', `Remove-Item -LiteralPath ${powershellLiteral(entry.scriptPath)} -Force`])]
            : []),
        ],
      }
    },
  }
}

export function createWindowsTaskProvider(ctx: BootProviderContext): BootProvider {
  return createTaskProvider(ctx, LOGON_TASK)
}

/**
 * The boot-triggered SYSTEM task: the panel is up before anyone logs in.
 *
 * Deliberately *last* in the ladder and never the automatic pick — running in
 * session 0 breaks any supervised server that wants a display, and the user's own
 * profile is not loaded. It exists for the headless case (`docs/BOOT.md`).
 */
export function createWindowsBootProvider(ctx: BootProviderContext): BootProvider {
  return createTaskProvider(ctx, BOOT_TASK)
}

export function createWindowsRunProvider(ctx: BootProviderContext): BootProvider {
  return createWindowsRunProviderImpl(ctx)
}
