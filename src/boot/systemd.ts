/**
 * systemd: a user unit (`~/.config/systemd/user`) and a system unit
 * (`/etc/systemd/system`). The system one needs root, so every privileged call
 * goes through `sudo -n` — it never prompts — and the copy-pasteable `sudo …`
 * form is reported when elevation is not available.
 */
import fs from 'node:fs'
import type { BootCandidate, BootState } from '../shared/contracts.js'
import type { BootActionResult, BootProvider, BootProviderContext, BootProviderStatus, BootRetirement, BootSpec, BootStart } from './types.js'
import {
  assertAbsolute,
  assertUserName,
  assertArg,
  assertEnvKey,
  assertLabel,
  assertMarker,
  assertUnitName,
  shellCommand,
  systemdEnvLine,
  systemdExecWord,
  systemdPath,
  systemdText,
} from './escape.js'
import type { FileOwnership } from './common.js'
import {
  accountOf,
  bootState,
  bootUserName,
  configHome,
  currentUser,
  errorMessage,
  existsOf,
  failed,
  inspectOwned,
  posixJoin,
  removeOwned,
  tempDir,
  writeOwned,
} from './common.js'

const ENABLED_UNIT_STATES = new Set(['enabled', 'enabled-runtime', 'alias', 'static', 'indirect', 'generated', 'transient'])
const FAILED_RESULTS = new Set(['failed', 'exit-code', 'signal', 'timeout', 'core-dump', 'watchdog', 'start-limit-hit', 'oom-kill'])

type Scope = 'user' | 'system'

function validate(spec: BootSpec): void {
  assertUnitName(spec.unitName)
  assertMarker(spec.marker)
  assertLabel(spec.label)
  assertAbsolute(spec.command, 'spec.command')
  assertAbsolute(spec.cwd, 'spec.cwd')
  assertAbsolute(spec.logDir, 'spec.logDir')
  for (const arg of spec.args)
    assertArg(arg)
  for (const key of Object.keys(spec.env))
    assertEnvKey(key)
}

function envLines(spec: BootSpec): string[] {
  return Object.entries(spec.env).map(([key, value]) => `Environment=${systemdEnvLine(key, value)}`)
}

const MANAGED = (spec: BootSpec): string => `# Managed by ${spec.marker}`

function codeOf(result: { code: number | null, error?: string | null }): number | null {
  return result.error ? null : result.code
}

/**
 * What a status read says about the account the installed unit runs as.
 *
 * A unit this plugin wrote that names no `User=` runs the panel as root, and one
 * that names somebody else is running a panel that is not that person's — either
 * way a server which refuses root crash-loops with no hint that the panel's own
 * user is the cause. So the account is stated where the operator is already
 * looking, and the remedy is the install button already on the page.
 */
function accountNote(own: FileOwnership, ctx: BootProviderContext): string {
  if (!own.owned || own.text === null)
    return ''
  // Only the root outcome is reachable: any other name in a unit this plugin wrote
  // came from this same resolver, so it is the name the resolver would pick now.
  const declared = /^User=(.*)$/m.exec(own.text)?.[1]?.trim() ?? ''
  return declared === '' || declared === 'root'
    ? '; the unit names no other user, so the panel runs as root — install again from the account that should own it'
    : ''
}

/** `Type=exec` with an explicit environment; boot capability comes from linger, not from this file. */
export function systemdUserUnit(spec: BootSpec): string {
  validate(spec)
  return `${[
    MANAGED(spec),
    '[Unit]',
    `Description=${systemdText(spec.label)}`,
    'After=network-online.target',
    '',
    '[Service]',
    'Type=exec',
    `ExecStart=${[spec.command, ...spec.args].map(systemdExecWord).join(' ')}`,
    `WorkingDirectory=${systemdPath(spec.cwd, 'spec.cwd')}`,
    // A persistent entry survives a panel restart only because its nanny is not
    // the panel. The nanny is spawned `detached`, which gives it its own session —
    // but *not* its own cgroup, so the default `KillMode=control-group` kills it
    // with the panel and takes the entry down too, quietly falsifying what
    // `persistent: true` promises. `process` signals the panel alone. (An ordinary
    // entry is spawned detached as well, so this keeps every supervised server, not
    // only the nannies — the panel re-adopts such a survivor by its port.)
    'KillMode=process',
    'Restart=always',
    'RestartSec=5',
    ...envLines(spec),
    '',
    '[Install]',
    'WantedBy=default.target',
    '',
  ].join('\n')}`
}

/**
 * The system unit. `StartLimit*` belongs in `[Unit]`, not `[Service]`.
 *
 * `User=` is written when the entry has a real account to run as, and *never* as
 * `root`: an entry with no `User=` already runs as root, so naming it changes
 * nothing except to make the silent default look deliberate. A root account is
 * therefore refused loudly (by {@link bootUserName}) and the directive omitted.
 */
export function systemdSystemUnit(spec: BootSpec, user: string | null = null): string {
  validate(spec)
  return `${[
    MANAGED(spec),
    '[Unit]',
    `Description=${systemdText(spec.label)}`,
    'After=network-online.target',
    'StartLimitIntervalSec=60',
    'StartLimitBurst=5',
    '',
    '[Service]',
    ...(user === null || user === '' || user === 'root' ? [] : [`User=${assertUserName(user)}`]),
    'Type=exec',
    `ExecStart=${[spec.command, ...spec.args].map(systemdExecWord).join(' ')}`,
    `WorkingDirectory=${systemdPath(spec.cwd, 'spec.cwd')}`,
    // See the user unit: `control-group` would kill the nannies too.
    'KillMode=process',
    'Restart=always',
    'RestartSec=5',
    ...envLines(spec),
    '',
    '[Install]',
    'WantedBy=multi-user.target',
    '',
  ].join('\n')}`
}

function parseKeyValues(stdout: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of stdout.split('\n')) {
    const eq = line.indexOf('=')
    if (eq > 0)
      out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return out
}

interface UnitProbe {
  unitFileState: string
  activeState: string
  result: string
  nRestarts: string
  enabled: boolean
  installed: boolean
  reachable: boolean
  detail: string
}

async function readUnit(ctx: BootProviderContext, unit: string, scope: Scope): Promise<UnitProbe> {
  const scopeArgs = scope === 'user' ? ['--user'] : []
  const show = await ctx.run('systemctl', [...scopeArgs, 'show', '-p', 'UnitFileState', '-p', 'ActiveState', '-p', 'Result', '-p', 'NRestarts', unit])
  const props = parseKeyValues(show.stdout)
  const isEnabled = await ctx.run('systemctl', [...scopeArgs, 'is-enabled', unit])
  const enabledCode = codeOf(isEnabled)
  const unitFileState = props.UnitFileState ?? ''
  /**
   * `is-enabled` exits 1 both for a disabled unit and for a unit it cannot even
   * look up, so only a known `UnitFileState` (or an explicit exit 0) proves the
   * unit exists. A user-bus failure must not read as `installed-disabled`.
   */
  const knownState = unitFileState !== '' && unitFileState !== 'not-found'
  const enabled = enabledCode === 0 || ENABLED_UNIT_STATES.has(unitFileState)
  const installed = enabled || knownState
  const result = props.Result ?? ''
  return {
    unitFileState,
    activeState: props.ActiveState ?? '',
    result,
    nRestarts: props.NRestarts ?? '',
    enabled,
    installed,
    reachable: show.error === undefined || show.error === null,
    detail: `UnitFileState=${unitFileState || '(none)'} ActiveState=${props.ActiveState || '(none)'} Result=${result || '(none)'} NRestarts=${props.NRestarts ?? '0'}`,
  }
}

async function userScopeReachable(ctx: BootProviderContext): Promise<{ reachable: boolean, reason: string }> {
  const probe = await ctx.run('systemctl', ['--user', 'is-system-running'])
  if (probe.error)
    return { reachable: false, reason: `systemctl --user is not available here (${probe.error})` }
  if (`${probe.stdout}\n${probe.stderr}`.includes('Failed to connect to user scope bus'))
    return { reachable: false, reason: 'systemctl --user cannot reach a user manager: Failed to connect to user scope bus' }
  return { reachable: true, reason: '' }
}

async function lingerEnabled(ctx: BootProviderContext): Promise<boolean> {
  const user = currentUser(ctx)
  if (!user)
    return false
  const probe = await ctx.run('loginctl', ['show-user', user, '--property=Linger'])
  if (codeOf(probe) !== 0)
    return false
  return /(^|\n)Linger=yes(\n|$)/.test(probe.stdout)
}

function problem(run: { code: number | null, error?: string | null, stdout: string, stderr: string }, command: string): string | null {
  const code = codeOf(run)
  if (code === 0)
    return null
  if (code === null)
    return run.error ? `${command}: ${run.error}` : `${command}: no exit code`
  return `${command} exited ${code}: ${(run.stderr || run.stdout).trim() || '(no output)'}`
}

export function createSystemdUserProvider(ctx: BootProviderContext): BootProvider {
  const mechanism = 'systemd-user' as const
  const unitOf = (spec: BootSpec): string => `${assertUnitName(spec.unitName)}.service`
  const pathOf = (spec: BootSpec): string => posixJoin(configHome(ctx), 'systemd', 'user', unitOf(spec))

  return {
    mechanism,

    async detect(): Promise<BootCandidate> {
      if (ctx.platform !== 'linux')
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: 'systemd is Linux-only' }
      const bus = await userScopeReachable(ctx)
      if (!bus.reachable)
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: bus.reason }
      const linger = await lingerEnabled(ctx)
      const privileged = linger || (await ctx.sudo())
      return {
        mechanism,
        available: true,
        bootCapable: linger,
        privileged,
        reason: linger
          ? 'a systemd user manager is reachable and linger is on, so the unit starts at boot'
          : 'a systemd user manager is reachable, but linger is off: the unit starts at login until `loginctl enable-linger` succeeds',
      }
    },

    async status(spec: BootSpec): Promise<BootProviderStatus> {
      try {
        const unit = unitOf(spec)
        const file = pathOf(spec)
        const own = inspectOwned(file, assertMarker(spec.marker))
        if (own.exists && !own.owned)
          return { state: 'not-installed', unitPath: file, detail: own.reason ?? 'foreign file', commands: [] }
        const probe = await readUnit(ctx, unit, 'user')
        const installed = own.owned || probe.installed
        const state: BootState = bootState(installed, probe.enabled, FAILED_RESULTS.has(probe.result))
        const user = currentUser(ctx)
        const linger = await lingerEnabled(ctx)
        const commands: string[] = []
        if (!linger && user)
          commands.push(shellCommand('sudo', ['loginctl', 'enable-linger', user]))
        const detail = `${probe.detail}; ${linger ? 'linger is on (boot-capable)' : 'linger is off (login-scoped)'}`
        return { state, unitPath: file, detail, commands }
      }
      catch (error) {
        return { state: 'not-installed', unitPath: null, detail: errorMessage(error), commands: [] }
      }
    },

    async install(spec: BootSpec): Promise<BootActionResult> {
      try {
        validate(spec)
        const unit = unitOf(spec)
        const file = pathOf(spec)
        const write = writeOwned(file, spec.marker, systemdUserUnit(spec), 0o644)
        if (write.refusal)
          return failed(write.refusal)

        const before = await readUnit(ctx, unit, 'user')
        let changed = write.changed
        if (write.changed || !before.enabled) {
          const reloadCommand = shellCommand('systemctl', ['--user', 'daemon-reload'])
          const reload = await ctx.run('systemctl', ['--user', 'daemon-reload'])
          const reloadProblem = problem(reload, reloadCommand)
          if (reloadProblem)
            return failed(reloadProblem, { changed, commands: [reloadCommand] })

          const enableCommand = shellCommand('systemctl', ['--user', 'enable', '--now', unit])
          const enable = await ctx.run('systemctl', ['--user', 'enable', '--now', unit])
          const enableProblem = problem(enable, enableCommand)
          if (enableProblem)
            return failed(enableProblem, { changed: true, commands: [enableCommand] })
          changed = true
        }

        const after = await readUnit(ctx, unit, 'user')
        if (!after.enabled)
          return failed(`unit ${unit} is not enabled after install (${after.detail})`, { changed })

        let linger = await lingerEnabled(ctx)
        const user = currentUser(ctx)
        const commands: string[] = []
        if (!linger && user) {
          const res = await ctx.run('loginctl', ['enable-linger', user])
          if (codeOf(res) === 0) {
            linger = true
            changed = true
          }
          else {
            commands.push(shellCommand('sudo', ['loginctl', 'enable-linger', user]))
          }
        }
        const detail = linger
          ? `${file} installed and enabled; linger is on, so ${unit} starts at boot`
          : `${file} installed and enabled, but linger is off: ${unit} starts at login only. ${commands.length ? `Run \`${commands[0]}\` to make it boot-capable.` : 'No target user could be determined to enable linger for.'}`
        return { ok: true, changed, detail, commands, needsPrivilege: !linger }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    async uninstall(spec: BootSpec): Promise<BootActionResult> {
      try {
        validate(spec)
        const unit = unitOf(spec)
        const file = pathOf(spec)
        const own = inspectOwned(file, spec.marker)
        if (own.exists && !own.owned)
          return failed(own.reason ?? 'foreign file')

        const before = await readUnit(ctx, unit, 'user')
        if (!before.reachable && !own.exists) {
          return { ok: true, changed: false, detail: `no unit file at ${file} and systemctl is unavailable; nothing to remove`, commands: [], needsPrivilege: false }
        }
        // A unit of the same name can come from anywhere on the search path; with
        // no file of ours, disabling by name would stop somebody else's unit.
        if (!own.owned && !own.exists && before.installed)
          return failed(`a unit named ${unit} exists but no unit file of ours is at ${file}; refusing to disable a unit this plugin did not install`)
        if (own.owned && before.reachable) {
          const disableCommand = shellCommand('systemctl', ['--user', 'disable', '--now', unit])
          const disable = await ctx.run('systemctl', ['--user', 'disable', '--now', unit])
          const disableCode = codeOf(disable)
          if (disableCode !== 0 && disableCode !== 1 && disableCode !== 4)
            return failed(problem(disable, disableCommand) ?? 'disable failed', { commands: [disableCommand] })
        }

        const remove = removeOwned(file, spec.marker)
        if (remove.refusal)
          return failed(remove.refusal)

        let changed = remove.removed
        if (before.installed || remove.removed) {
          await ctx.run('systemctl', ['--user', 'daemon-reload'])
          changed = true
        }

        const after = await readUnit(ctx, unit, 'user')
        if (after.installed)
          return failed(`unit ${unit} is still known to systemd after removal (${after.detail})`, { changed })

        return {
          ok: true,
          changed,
          detail: remove.removed ? `disabled and removed ${file}` : `${file} was already gone`,
          commands: [],
          needsPrivilege: false,
        }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    /**
     * `restart` stops the panel and starts it again under the unit, so nothing
     * else may stop it first: stopping it from outside would race this call.
     * `is-active` is the proof the unit is really there, before anything is
     * killed.
     */
    async activate(spec: BootSpec): Promise<BootStart> {
      const unit = unitOf(spec)
      return {
        commands: [['systemctl', '--user', 'restart', unit]],
        requires: { commands: [['systemctl', '--user', 'is-active', unit]], files: [] },
        display: [shellCommand('systemctl', ['--user', 'restart', unit])],
      }
    },

    /** Stops the panel the unit supervises, keeping the unit enabled. */
    async stopCommands(spec: BootSpec): Promise<string[][]> {
      return [['systemctl', '--user', 'stop', unitOf(spec)]]
    },

    /** No `--now`: the panel is already down when a switch runs this. */
    async retireCommands(spec: BootSpec): Promise<BootRetirement> {
      const unit = unitOf(spec)
      const file = pathOf(spec)
      return {
        commands: [
          ['systemctl', '--user', 'disable', unit],
          ['rm', '-f', file],
          ['systemctl', '--user', 'daemon-reload'],
        ],
        display: [
          shellCommand('systemctl', ['--user', 'disable', unit]),
          shellCommand('rm', ['-f', file]),
          shellCommand('systemctl', ['--user', 'daemon-reload']),
        ],
      }
    },
  }
}

function stageUnit(ctx: BootProviderContext, unit: string, content: string): string {
  const staged = posixJoin(tempDir(ctx), `home-hosted-${unit}`)
  fs.writeFileSync(staged, content, { mode: 0o644 })
  return staged
}

export function createSystemdSystemProvider(ctx: BootProviderContext): BootProvider {
  const mechanism = 'systemd-system' as const
  const unitOf = (spec: BootSpec): string => `${assertUnitName(spec.unitName)}.service`
  const pathOf = (spec: BootSpec): string => posixJoin('/etc', 'systemd', 'system', unitOf(spec))
  /**
   * The account the entry runs as — never this process's `$USER`.
   *
   * A system unit outlives the shell that wrote it and is restarted by root, so
   * the only honest answer is the login that asked for root (`SUDO_UID`) or, when
   * the panel itself is not root, the account it belongs to. A root answer is not
   * written as `User=root`: omitting the directive *is* running as root, so
   * naming it only disguises the default this exists to surface.
   */
  const contentOf = (spec: BootSpec): string => systemdSystemUnit(spec, bootUserName(ctx))

  const installCommands = (staged: string, file: string, unit: string): string[] => [
    shellCommand('sudo', ['install', '-m', '0644', staged, file]),
    shellCommand('sudo', ['systemctl', 'daemon-reload']),
    shellCommand('sudo', ['systemctl', 'enable', '--now', unit]),
  ]

  return {
    mechanism,

    async detect(): Promise<BootCandidate> {
      if (ctx.platform !== 'linux')
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: 'systemd is Linux-only' }
      if (!existsOf(ctx, '/run/systemd/system'))
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: 'systemd is not the init system here (no /run/systemd/system)' }
      const privileged = ctx.isRoot || (await ctx.sudo())
      // The account the entry would run as is a property of the candidate, not a
      // detail: a system unit with no account runs the panel as root, and that is
      // the whole reason a server that refuses root crash-loops.
      const who = accountOf(ctx)
      const scope = who === null || who.root
        ? 'no account was resolved for the entry, so it would run the panel as root'
        : `the entry runs the panel as ${who.name}`
      return {
        mechanism,
        available: privileged,
        bootCapable: privileged,
        privileged,
        reason: privileged
          ? `systemd is PID 1 and this process can use root, so a system unit starts at boot; ${scope}`
          : 'systemd is PID 1, but installing a system unit needs root or passwordless sudo',
      }
    },

    async status(spec: BootSpec): Promise<BootProviderStatus> {
      try {
        const unit = unitOf(spec)
        const file = pathOf(spec)
        const own = inspectOwned(file, assertMarker(spec.marker))
        if (own.exists && !own.owned)
          return { state: 'not-installed', unitPath: file, detail: own.reason ?? 'foreign file', commands: [] }
        const probe = await readUnit(ctx, unit, 'system')
        const installed = own.owned || probe.installed
        const state: BootState = bootState(installed, probe.enabled, FAILED_RESULTS.has(probe.result))
        const privileged = ctx.isRoot || (await ctx.sudo())
        const commands: string[] = []
        if (installed && !probe.enabled && !privileged)
          commands.push(shellCommand('sudo', ['systemctl', 'enable', '--now', unit]))
        return {
          state,
          unitPath: file,
          detail: `${probe.detail}${privileged ? '' : '; needs root to change'}${accountNote(own, ctx)}`,
          commands,
        }
      }
      catch (error) {
        return { state: 'not-installed', unitPath: null, detail: errorMessage(error), commands: [] }
      }
    },

    async install(spec: BootSpec): Promise<BootActionResult> {
      try {
        validate(spec)
        const unit = unitOf(spec)
        const file = pathOf(spec)
        const content = contentOf(spec)
        const own = inspectOwned(file, spec.marker)
        if (own.exists && !own.owned)
          return failed(own.reason ?? 'foreign file')

        const before = await readUnit(ctx, unit, 'system')
        const changed = !own.exists || own.text !== content

        if (!ctx.isRoot && !(await ctx.sudo())) {
          const staged = stageUnit(ctx, unit, content)
          return failed(`installing a system unit needs root; the unit is staged at ${staged}`, {
            changed: false,
            needsPrivilege: true,
            commands: installCommands(staged, file, unit),
          })
        }

        if (ctx.isRoot) {
          const write = writeOwned(file, spec.marker, content, 0o644)
          if (write.refusal)
            return failed(write.refusal)
        }
        else {
          const staged = stageUnit(ctx, unit, content)
          const installCommand = shellCommand('sudo', ['install', '-m', '0644', staged, file])
          const install = await ctx.run('sudo', ['-n', 'install', '-m', '0644', staged, file])
          const installProblem = problem(install, installCommand)
          if (installProblem)
            return failed(installProblem, { needsPrivilege: true, commands: installCommands(staged, file, unit) })
          fs.rmSync(staged, { force: true })
        }

        if (changed || !before.enabled) {
          const sudoPrefix = ctx.isRoot ? [] : ['-n']
          const reloadCommand = shellCommand('sudo', ['systemctl', 'daemon-reload'])
          const reload = await ctx.run('sudo', [...sudoPrefix, 'systemctl', 'daemon-reload'])
          const reloadProblem = problem(reload, reloadCommand)
          if (reloadProblem)
            return failed(reloadProblem, { changed, needsPrivilege: !ctx.isRoot, commands: [reloadCommand] })

          const enableCommand = shellCommand('sudo', ['systemctl', 'enable', '--now', unit])
          const enable = await ctx.run('sudo', [...sudoPrefix, 'systemctl', 'enable', '--now', unit])
          const enableProblem = problem(enable, enableCommand)
          if (enableProblem)
            return failed(enableProblem, { changed: true, needsPrivilege: !ctx.isRoot, commands: [enableCommand] })
        }

        const after = await readUnit(ctx, unit, 'system')
        if (!after.enabled)
          return failed(`unit ${unit} is not enabled after install (${after.detail})`, { changed })

        return {
          ok: true,
          changed: changed || !before.enabled,
          detail: `${file} installed and enabled as a system unit (${after.detail})`,
          commands: [],
          needsPrivilege: !ctx.isRoot,
        }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    async uninstall(spec: BootSpec): Promise<BootActionResult> {
      try {
        const unit = unitOf(spec)
        const file = pathOf(spec)
        const own = inspectOwned(file, spec.marker)
        if (own.exists && !own.owned)
          return failed(own.reason ?? 'foreign file')

        const privileged = ctx.isRoot || (await ctx.sudo())
        if (!privileged) {
          if (!own.exists)
            return { ok: true, changed: false, detail: `no unit file at ${file} and no privilege to change systemd; nothing to remove`, commands: [], needsPrivilege: false }
          return failed('removing a system unit needs root', {
            needsPrivilege: true,
            commands: [
              shellCommand('sudo', ['systemctl', 'disable', '--now', unit]),
              shellCommand('sudo', ['rm', '-f', file]),
              shellCommand('sudo', ['systemctl', 'daemon-reload']),
            ],
          })
        }

        const prefix = ctx.isRoot ? [] : ['-n']
        // With no file of ours at the path we write, a same-named unit belongs to
        // somebody else (a vendor unit in /usr/lib/systemd/system): leave it alone.
        if (!own.exists && !own.owned)
          return failed(`no unit file of ours at ${file}; refusing to disable a unit this plugin did not install`)
        const disableCommand = shellCommand('sudo', ['systemctl', 'disable', '--now', unit])
        const disable = await ctx.run('sudo', [...prefix, 'systemctl', 'disable', '--now', unit])
        const disableCode = codeOf(disable)
        if (disableCode !== 0 && disableCode !== 1 && disableCode !== 4)
          return failed(problem(disable, disableCommand) ?? 'disable failed', { needsPrivilege: !ctx.isRoot, commands: [disableCommand] })

        if (own.exists) {
          if (ctx.isRoot) {
            const remove = removeOwned(file, spec.marker)
            if (remove.refusal)
              return failed(remove.refusal)
          }
          else {
            // The check above ran as the invoking user, which cannot read a
            // root-only file; re-prove ownership before the privileged delete.
            if (!own.owned)
              return failed(own.reason ?? 'foreign file')
            const rmCommand = shellCommand('sudo', ['rm', '-f', file])
            const rm = await ctx.run('sudo', ['-n', 'rm', '-f', file])
            const rmProblem = problem(rm, rmCommand)
            if (rmProblem)
              return failed(rmProblem, { needsPrivilege: true, commands: [rmCommand] })
          }
        }

        await ctx.run('sudo', [...prefix, 'systemctl', 'daemon-reload'])
        const after = await readUnit(ctx, unit, 'system')
        if (after.installed)
          return failed(`unit ${unit} is still known to systemd after removal (${after.detail})`, { changed: true, needsPrivilege: !ctx.isRoot })

        return {
          ok: true,
          changed: own.exists || disableCode === 0,
          detail: own.exists ? `disabled and removed ${file}` : `${file} was already gone`,
          commands: [],
          needsPrivilege: !ctx.isRoot,
        }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    /**
     * `restart` stops the panel and starts it again under the unit, so nothing
     * else may stop it first. A system unit needs root; `sudo -n` never prompts,
     * which is the only elevation a detached helper can get.
     */
    async activate(spec: BootSpec): Promise<BootStart> {
      const unit = unitOf(spec)
      const elevate = (args: string[]): string[] => ctx.isRoot ? args : ['sudo', '-n', ...args]
      return {
        commands: [elevate(['systemctl', 'restart', unit])],
        requires: { commands: [elevate(['systemctl', 'is-active', unit])], files: [] },
        display: [shellCommand('sudo', ['systemctl', 'restart', unit])],
      }
    },

    /**
     * Stops the panel the unit supervises. Without this a switch would lose the
     * race: `Restart=always` brings the panel back as soon as the CLI's `down`
     * ends, before the new entry starts one.
     */
    async stopCommands(spec: BootSpec): Promise<string[][]> {
      const elevate = (args: string[]): string[] => ctx.isRoot ? args : ['sudo', '-n', ...args]
      return [elevate(['systemctl', 'stop', unitOf(spec)])]
    },

    /**
     * The retirement for a switch. Deliberately no `--now`: this runs in the
     * helper *after* the panel is already down, and `--now` here would race the
     * start command that follows.
     */
    async retireCommands(spec: BootSpec): Promise<BootRetirement> {
      const unit = unitOf(spec)
      const file = pathOf(spec)
      const elevate = (args: string[]): string[] => ctx.isRoot ? args : ['sudo', '-n', ...args]
      return {
        commands: [
          elevate(['systemctl', 'disable', unit]),
          elevate(['rm', '-f', file]),
          elevate(['systemctl', 'daemon-reload']),
        ],
        display: [
          shellCommand('sudo', ['systemctl', 'disable', unit]),
          shellCommand('sudo', ['rm', '-f', file]),
          shellCommand('sudo', ['systemctl', 'daemon-reload']),
        ],
      }
    },
  }
}
