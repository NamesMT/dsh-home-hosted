/**
 * freedesktop XDG autostart: `~/.config/autostart/<unitName>.desktop`.
 * This runs at login, never at boot, and needs no privilege. `Exec=` is not a
 * shell, so every word is quoted for the desktop entry parser and `$`/`%` are
 * escaped rather than expanded.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { BootCandidate, BootState } from '../shared/contracts.js'
import type { BootActionResult, BootProvider, BootProviderContext, BootProviderStatus, BootRetirement, BootSpec } from './types.js'
import { assertAbsolute, assertArg, assertEnvKey, assertLabel, assertMarker, assertUnitName, desktopExec, shellCommand } from './escape.js'
import { bootState, configHome, errorMessage, failed, inspectOwned, posixJoin, removeOwned, writeOwned } from './common.js'

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

export function xdgDesktopEntry(spec: BootSpec): string {
  validate(spec)
  return `${[
    '[Desktop Entry]',
    'Type=Application',
    `Name=${spec.label}`,
    `Comment=home-hosted daemon, managed by ${spec.marker}`,
    `Exec=${desktopExec(spec.command, spec.args)}`,
    `Path=${spec.cwd}`,
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    `X-HomeHosted-Marker=${spec.marker}`,
    '',
  ].join('\n')}`
}

function desktopFlag(text: string, key: string): string | null {
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith(`${key}=`))
      return trimmed.slice(key.length + 1).trim()
  }
  return null
}

export function createXdgAutostartProvider(ctx: BootProviderContext): BootProvider {
  const mechanism = 'xdg-autostart' as const
  const unitOf = (spec: BootSpec): string => `${assertUnitName(spec.unitName)}.desktop`
  const pathOf = (spec: BootSpec): string => posixJoin(configHome(ctx), 'autostart', unitOf(spec))

  return {
    mechanism,

    async detect(): Promise<BootCandidate> {
      if (ctx.platform !== 'linux')
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: 'XDG autostart is Linux-only' }
      return {
        mechanism,
        available: true,
        bootCapable: false,
        privileged: true,
        reason: `a .desktop entry under ${posixJoin(configHome(ctx), 'autostart')} needs no privilege, but it starts at login rather than at boot`,
      }
    },

    async status(spec: BootSpec): Promise<BootProviderStatus> {
      try {
        const file = pathOf(spec)
        const own = inspectOwned(file, assertMarker(spec.marker))
        if (own.exists && !own.owned)
          return { state: 'not-installed', unitPath: file, detail: own.reason ?? 'foreign file', commands: [] }
        if (!own.owned || own.text === null)
          return { state: 'not-installed', unitPath: file, detail: `no autostart entry at ${file}`, commands: [] }
        const enabled = desktopFlag(own.text, 'X-GNOME-Autostart-enabled') !== 'false'
          && desktopFlag(own.text, 'Hidden') !== 'true'
        const state: BootState = bootState(true, enabled, false)
        return {
          state,
          unitPath: file,
          detail: `${file} is present; ${enabled ? 'it starts at login' : 'it is disabled'} (login scope, not boot)`,
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
        fs.mkdirSync(path.dirname(file), { recursive: true })
        const write = writeOwned(file, spec.marker, xdgDesktopEntry(spec), 0o644)
        if (write.refusal)
          return failed(write.refusal)

        const text = inspectOwned(file, spec.marker).text
        const enabled = text !== null
          && desktopFlag(text, 'X-GNOME-Autostart-enabled') !== 'false'
          && desktopFlag(text, 'Hidden') !== 'true'
        if (!enabled)
          return failed(`${file} was written but does not read back as enabled`, { changed: write.changed })

        return {
          ok: true,
          changed: write.changed,
          detail: write.changed
            ? `${file} installed; it starts at login (not at boot)`
            : `${file} was already installed and enabled`,
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
        const file = pathOf(spec)
        const own = inspectOwned(file, spec.marker)
        if (own.exists && !own.owned)
          return failed(own.reason ?? 'foreign file')
        const remove = removeOwned(file, spec.marker)
        if (remove.refusal)
          return failed(remove.refusal)
        return {
          ok: true,
          changed: remove.removed,
          detail: remove.removed ? `removed ${file}` : `${file} was already gone`,
          commands: [],
          needsPrivilege: false,
        }
      }
      catch (error) {
        return failed(errorMessage(error))
      }
    },

    /**
     * A `.desktop` entry has no launcher of its own: the desktop session reads
     * the file at login. Nothing here can start the panel, and claiming a start
     * command would be a fiction, so the caller falls back to the CLI.
     */
    async activate(): Promise<null> {
      return null
    },

    /** A file the session reads at login: deleting it stops nothing. */
    async retireCommands(spec: BootSpec): Promise<BootRetirement> {
      const file = pathOf(spec)
      return { commands: [['rm', '-f', file]], display: [shellCommand('rm', ['-f', file])] }
    },
  }
}
