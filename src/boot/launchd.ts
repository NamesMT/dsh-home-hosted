/**
 * launchd: a per-user agent (`~/Library/LaunchAgents`) and a system daemon
 * (`/Library/LaunchDaemons`). `launchctl print` is read for its exit code only
 * — its output is explicitly not API. Loading is `bootstrap`, unloading is
 * `bootout`, and exit 5 from bootstrap means the job is already loaded.
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
  assertUnitName,
  assertXmlCommentSafe,
  shellCommand,
  xmlEscape,
} from './escape.js'
import {
  bootState,
  errorMessage,
  failed,
  inspectOwned,
  posixJoin,
  removeOwned,
  tempDir,
  uidOf,
  userNameOf,
  writeOwned,
} from './common.js'

/** Both scopes label with the same reverse-DNS prefix. */
export const LAUNCHD_LABEL_PREFIX = 'dev.home-hosted.'
/** bootstrap on an already-loaded job reports EIO. */
const LAUNCHCTL_ALREADY_LOADED = 5
/** `launchctl print` for a label that is not loaded. */
const LAUNCHCTL_NOT_LOADED = 113
/** `launchctl bootout` for a job that is not there. */
const LAUNCHCTL_NO_SUCH_PROCESS = 3

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

export function launchdLabel(spec: BootSpec): string {
  return `${LAUNCHD_LABEL_PREFIX}${assertUnitName(spec.unitName)}`
}

/** The full property list. The marker rides in an XML comment, which launchd ignores. */
export interface LaunchdPlistOptions {
  /** Set for a LaunchDaemon: launchd would otherwise run the panel as root. */
  userName?: string | null
}

export function launchdPlist(spec: BootSpec, options: LaunchdPlistOptions = {}): string {
  validate(spec)
  const label = launchdLabel(spec)
  const userName = options.userName?.trim()
  const out = path.posix.join(spec.logDir, `${label}.out.log`)
  const err = path.posix.join(spec.logDir, `${label}.err.log`)
  const envKeys = Object.keys(spec.env)
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '\t<key>Label</key>',
    `\t<string>${xmlEscape(label)}</string>`,
    ...(userName === undefined || userName.length === 0
      ? []
      : ['\t<key>UserName</key>', `\t<string>${xmlEscape(userName)}</string>`]),
    '\t<key>ProgramArguments</key>',
    '\t<array>',
    ...[spec.command, ...spec.args].map(arg => `\t\t<string>${xmlEscape(arg)}</string>`),
    '\t</array>',
    '\t<key>RunAtLoad</key>',
    '\t<true/>',
    '\t<key>KeepAlive</key>',
    '\t<dict>',
    '\t\t<key>SuccessfulExit</key>',
    '\t\t<false/>',
    '\t</dict>',
    '\t<key>ThrottleInterval</key>',
    '\t<integer>10</integer>',
    '\t<key>WorkingDirectory</key>',
    `\t<string>${xmlEscape(spec.cwd)}</string>`,
    ...(envKeys.length
      ? [
          '\t<key>EnvironmentVariables</key>',
          '\t<dict>',
          ...envKeys.flatMap(key => [`\t\t<key>${xmlEscape(key)}</key>`, `\t\t<string>${xmlEscape(spec.env[key] ?? '')}</string>`]),
          '\t</dict>',
        ]
      : []),
    '\t<key>StandardOutPath</key>',
    `\t<string>${xmlEscape(out)}</string>`,
    '\t<key>StandardErrorPath</key>',
    `\t<string>${xmlEscape(err)}</string>`,
    `\t<!-- Managed by ${assertXmlCommentSafe(spec.marker)} -->`,
    '</dict>',
    '</plist>',
    '',
  ]
  return lines.join('\n')
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

type LaunchdMode = 'agent' | 'daemon'

/** Best effort: `/Library/LaunchDaemons` exists on macOS, and only the privileged write can create it. */
function ensureDirQuiet(dir: string): void {
  try {
    fs.mkdirSync(dir, { recursive: true })
  }
  catch {
    // the privileged install reports the real failure
  }
}

function createLaunchdProvider(ctx: BootProviderContext, mode: LaunchdMode): BootProvider {
  const mechanism = mode === 'agent' ? 'launchd-agent' as const : 'launchd-daemon' as const
  const pathOf = (spec: BootSpec): string => mode === 'agent'
    ? posixJoin(ctx.home, 'Library', 'LaunchAgents', `${launchdLabel(spec)}.plist`)
    : posixJoin('/Library', 'LaunchDaemons', `${launchdLabel(spec)}.plist`)

  /** `system` for the daemon; `gui/$UID`, else `user/$UID` for the agent. */
  const domainOf = async (): Promise<string | null> => {
    if (mode === 'daemon')
      return 'system'
    const uid = uidOf(ctx)
    if (!uid)
      return null
    const gui = `gui/${uid}`
    if (codeOf(await ctx.run('launchctl', ['print', gui])) === 0)
      return gui
    const user = `user/${uid}`
    if (codeOf(await ctx.run('launchctl', ['print', user])) === 0)
      return user
    return null
  }

  const privileged = async (): Promise<boolean> =>
    mode === 'agent' ? true : ctx.isRoot || (await ctx.sudo())

  /** Root runs launchctl directly; everything else goes through `sudo -n`. */
  const runPrivileged = async (program: string, args: string[]) =>
    mode === 'agent' || ctx.isRoot ? await ctx.run(program, args) : await ctx.run('sudo', ['-n', program, ...args])

  /** The sudo form of what is left to do when this process cannot write the file itself. */
  const commands = (file: string, label: string): string[] => mode === 'agent'
    ? []
    : [
        shellCommand('sudo', ['launchctl', 'bootstrap', 'system', file]),
        shellCommand('sudo', ['launchctl', 'enable', `system/${label}`]),
      ]

  return {
    mechanism,

    async detect(): Promise<BootCandidate> {
      if (ctx.platform !== 'darwin')
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: 'launchd is macOS-only' }
      if (mode === 'agent') {
        const domain = await domainOf()
        return {
          mechanism,
          // A plist in ~/Library/LaunchAgents is loaded at login whether or not
          // this process can reach launchd right now, so an unreachable domain
          // is a diagnostic, not a reason to refuse.
          available: true,
          bootCapable: false,
          privileged: true,
          reason: domain === null
            ? `a LaunchAgent loads at login; launchd's domain is not reachable from this process for uid ${uidOf(ctx) ?? '?'} right now, so it is loaded at the next login`
            : `launchd ${domain} domain is reachable; a LaunchAgent loads at login, not at boot`,
        }
      }
      const canElevate = ctx.isRoot || (await ctx.sudo())
      return {
        mechanism,
        // Always selectable: without root the plugin stages the plist and hands
        // over the three sudo commands, which is the only way to start before
        // login on a Mac that has no passwordless sudo.
        available: true,
        bootCapable: true,
        privileged: canElevate,
        reason: canElevate
          ? 'this process can write /Library/LaunchDaemons, so a LaunchDaemon starts at boot'
          : 'a LaunchDaemon starts at boot but needs root here, so the plugin stages the plist and shows the sudo commands',
      }
    },

    async status(spec: BootSpec): Promise<BootProviderStatus> {
      try {
        const file = pathOf(spec)
        const label = launchdLabel(spec)
        const own = inspectOwned(file, assertMarker(spec.marker))
        if (own.exists && !own.owned)
          return { state: 'not-installed', unitPath: file, detail: own.reason ?? 'foreign file', commands: [] }
        const domain = await domainOf()
        if (!own.owned)
          return { state: 'not-installed', unitPath: file, detail: `no plist at ${file}`, commands: [] }
        if (domain === null)
          return { state: 'enabled-running', unitPath: file, detail: `${file} is present; launchd has no reachable domain for uid ${uidOf(ctx) ?? '?'}, so it loads at the next login`, commands: [] }
        const probe = await ctx.run('launchctl', ['print', `${domain}/${label}`])
        const loaded = codeOf(probe) === 0
        const state: BootState = bootState(true, true, false)
        return {
          state,
          unitPath: file,
          detail: `${file} is present; ${loaded ? `loaded in ${domain}` : `not loaded right now (RunAtLoad loads it at the next login)`}`,
          commands: [],
        }
      }
      catch (error) {
        return { state: 'not-installed', unitPath: null, detail: errorMessage(error), commands: [] }
      }
    },

    async install(spec: BootSpec): Promise<BootActionResult> {
      try {
        validate(spec)
        const file = pathOf(spec)
        const label = launchdLabel(spec)
        const content = launchdPlist(spec, mode === 'daemon' ? { userName: userNameOf(ctx) } : {})
        const own = inspectOwned(file, spec.marker)
        if (own.exists && !own.owned)
          return failed(own.reason ?? 'foreign file')
        const staged = posixJoin(tempDir(ctx), `${label}.plist`)
        if (!(await privileged())) {
          // The command below installs this exact file, so it has to exist.
          ensureDirQuiet(path.posix.dirname(staged))
          fs.writeFileSync(staged, content, { mode: 0o644 })
          return failed('writing /Library/LaunchDaemons needs root; the plist is staged for you to install', {
            needsPrivilege: true,
            commands: [
              shellCommand('sudo', ['install', '-m', '0644', staged, file]),
              shellCommand('sudo', ['launchctl', 'bootstrap', 'system', file]),
              shellCommand('sudo', ['launchctl', 'enable', `system/${label}`]),
            ],
          })
        }

        const domain = await domainOf()

        ensureDirQuiet(path.posix.dirname(file))
        ensureDirQuiet(spec.logDir)

        const loaded = domain !== null && codeOf(await ctx.run('launchctl', ['print', `${domain}/${label}`])) === 0
        const before = { text: own.text, exists: own.exists }

        let changed = false
        if (mode === 'agent' || ctx.isRoot) {
          const write = writeOwned(file, spec.marker, content, 0o644)
          if (write.refusal)
            return failed(write.refusal)
          changed = write.changed
        }
        else {
          ensureDirQuiet(path.dirname(staged))
          fs.writeFileSync(staged, content, { mode: 0o644 })
          changed = !before.exists || before.text !== content
          if (!changed) {
            fs.rmSync(staged, { force: true })
          }
          else {
            const installCommand = shellCommand('sudo', ['install', '-m', '0644', staged, file])
            const install = await runPrivileged('install', ['-m', '0644', staged, file])
            if (codeOf(install) !== 0)
              return failed(problem(install, installCommand) ?? 'launchctl failed', { needsPrivilege: true, commands: [installCommand] })
            fs.rmSync(staged, { force: true })
          }
        }

        const lint = await runPrivileged('plutil', ['-lint', file])
        if (codeOf(lint) !== 0)
          return failed(`plutil -lint rejected the generated plist: ${(lint.stderr || lint.stdout).trim() || 'no output'}`, { changed, commands: commands(file, label) })

        if (domain === null) {
          return {
            ok: true,
            changed,
            detail: `${file} is in place; launchd's domain is not reachable from this process, so it loads at the next login`,
            commands: [],
            needsPrivilege: false,
          }
        }

        if (loaded && changed) {
          const bootout = await runPrivileged('launchctl', ['bootout', `${domain}/${label}`])
          const bootoutCode = codeOf(bootout)
          if (bootoutCode !== 0 && bootoutCode !== LAUNCHCTL_NO_SUCH_PROCESS && bootoutCode !== LAUNCHCTL_NOT_LOADED)
            return failed(problem(bootout, shellCommand('launchctl', ['bootout', `${domain}/${label}`])) ?? 'launchctl failed', { changed, commands: commands(file, label) })
        }

        if (changed || !loaded) {
          const boot = await runPrivileged('launchctl', ['bootstrap', domain, file])
          const bootCode = codeOf(boot)
          if (bootCode !== 0 && bootCode !== LAUNCHCTL_ALREADY_LOADED)
            return failed(problem(boot, shellCommand('launchctl', ['bootstrap', domain, file])) ?? 'launchctl failed', { changed, commands: commands(file, label) })
          if (bootCode === 0)
            changed = true
          const enable = await runPrivileged('launchctl', ['enable', `${domain}/${label}`])
          if (codeOf(enable) !== 0)
            return failed(problem(enable, shellCommand('launchctl', ['enable', `${domain}/${label}`])) ?? 'launchctl failed', { changed, commands: commands(file, label) })
        }

        const verify = await runPrivileged('launchctl', ['print', `${domain}/${label}`])
        if (codeOf(verify) !== 0)
          return failed(`launchctl print ${domain}/${label} did not confirm the job (exit ${String(codeOf(verify))})`, { changed, commands: commands(file, label) })

        return {
          ok: true,
          changed,
          detail: `${file} installed and loaded in ${domain}`,
          commands: [],
          needsPrivilege: mode === 'daemon' && !ctx.isRoot,
        }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    async uninstall(spec: BootSpec): Promise<BootActionResult> {
      try {
        const file = pathOf(spec)
        const label = launchdLabel(spec)
        const own = inspectOwned(file, spec.marker)
        if (own.exists && !own.owned)
          return failed(own.reason ?? 'foreign file')
        if (mode === 'daemon' && !ctx.isRoot && !(await ctx.sudo())) {
          if (!own.exists)
            return { ok: true, changed: false, detail: `no plist at ${file} and no privilege to change launchd; nothing to remove`, commands: [], needsPrivilege: false }
          return failed('removing a LaunchDaemon needs root', {
            needsPrivilege: true,
            commands: [
              shellCommand('sudo', ['launchctl', 'bootout', `system/${label}`]),
              shellCommand('sudo', ['rm', '-f', file]),
            ],
          })
        }

        const domain = await domainOf()
        // A job under this label may belong to a plist we did not write; never
        // boot out a job whose own file is not ours.
        if (!own.exists && !own.owned)
          return failed(`no plist of ours at ${file}; refusing to unload a job this plugin did not install`)
        let changed = false
        if (domain !== null) {
          const bootout = await runPrivileged('launchctl', ['bootout', `${domain}/${label}`])
          const bootoutCode = codeOf(bootout)
          if (bootoutCode === 0)
            changed = true
          else if (bootoutCode !== LAUNCHCTL_NO_SUCH_PROCESS && bootoutCode !== LAUNCHCTL_NOT_LOADED)
            return failed(problem(bootout, shellCommand('launchctl', ['bootout', `${domain}/${label}`])) ?? 'launchctl failed', { commands: commands(file, label) })
        }

        if (own.exists) {
          if (mode === 'agent' || ctx.isRoot) {
            const remove = removeOwned(file, spec.marker)
            if (remove.refusal)
              return failed(remove.refusal)
            if (remove.removed)
              changed = true
          }
          else {
            // Re-prove ownership before the privileged delete: the check above
            // ran as the invoking user, which may not be able to read the file.
            if (!own.owned)
              return failed(own.reason ?? 'foreign file')
            const rmCommand = shellCommand('sudo', ['rm', '-f', file])
            const rm = await runPrivileged('rm', ['-f', file])
            if (codeOf(rm) !== 0)
              return failed(problem(rm, rmCommand) ?? 'launchctl failed', { needsPrivilege: true, commands: [rmCommand] })
            changed = true
          }
        }

        if (domain !== null) {
          const verify = await runPrivileged('launchctl', ['print', `${domain}/${label}`])
          if (codeOf(verify) === 0)
            return failed(`${label} is still loaded in ${domain} after bootout`, { changed })
        }

        return {
          ok: true,
          changed,
          detail: own.exists ? `unloaded and removed ${file}` : `no plist at ${file} (already gone)`,
          commands: [],
          needsPrivilege: mode === 'daemon' && !ctx.isRoot,
        }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    /**
     * A LaunchAgent that was written but never booted is exactly the state an
     * install leaves behind, and nothing else can start it: `kickstart -k` needs
     * the label loaded first, so loading it is part of the start.
     */
    async activate(spec: BootSpec): Promise<BootStart | null> {
      const file = pathOf(spec)
      const label = launchdLabel(spec)
      const domain = await domainOf()
      if (domain === null)
        return null
      const job = `${domain}/${label}`
      if (mode === 'daemon') {
        return {
          commands: [
            ['sudo', '-n', 'launchctl', 'bootstrap', 'system', file],
            ['sudo', '-n', 'launchctl', 'kickstart', '-k', job],
          ],
          requires: { commands: [], files: [file] },
          display: [
            shellCommand('sudo', ['launchctl', 'bootstrap', 'system', file]),
            shellCommand('sudo', ['launchctl', 'kickstart', '-k', job]),
          ],
        }
      }
      const loaded = codeOf(await ctx.run('launchctl', ['print', job])) === 0
      return {
        commands: [
          ...(loaded ? [] : [['launchctl', 'bootstrap', domain, file]]),
          ['launchctl', 'kickstart', '-k', job],
        ],
        requires: { commands: [], files: [file] },
        display: [
          ...(loaded ? [] : [shellCommand('launchctl', ['bootstrap', domain, file])]),
          shellCommand('launchctl', ['kickstart', '-k', job]),
        ],
      }
    },

    /** `KeepAlive` would resurrect the panel, so the job itself has to stop it. */
    async stopCommands(spec: BootSpec): Promise<string[][]> {
      const label = launchdLabel(spec)
      const domain = await domainOf()
      if (domain === null)
        return []
      const job = `${domain}/${label}`
      return mode === 'daemon'
        ? [['sudo', '-n', 'launchctl', 'kill', 'SIGTERM', job]]
        : [['launchctl', 'kill', 'SIGTERM', job]]
    },

    /**
     * launchd has no "unload but leave running": `bootout` always stops the job.
     * That is why retirement is handed to the caller instead of run during the
     * install — here it runs once the panel is already down, and the entry being
     * started is a different mechanism's, so stopping this job is harmless.
     */
    async retireCommands(spec: BootSpec): Promise<BootRetirement> {
      const file = pathOf(spec)
      const label = launchdLabel(spec)
      const domain = await domainOf()
      const bootout = mode === 'daemon'
        ? ['sudo', '-n', 'launchctl', 'bootout', `system/${label}`]
        : domain === null ? null : ['launchctl', 'bootout', `${domain}/${label}`]
      const remove = mode === 'daemon' ? ['sudo', '-n', 'rm', '-f', file] : ['rm', '-f', file]
      return {
        commands: [...(bootout === null ? [] : [bootout]), remove],
        display: [
          ...(bootout === null ? [] : [shellCommand('sudo', ['launchctl', 'bootout', `system/${label}`])]),
          shellCommand('sudo', ['rm', '-f', file]),
        ],
      }
    },
  }
}

export function createLaunchdAgentProvider(ctx: BootProviderContext): BootProvider {
  return createLaunchdProvider(ctx, 'agent')
}

export function createLaunchdDaemonProvider(ctx: BootProviderContext): BootProvider {
  return createLaunchdProvider(ctx, 'daemon')
}
