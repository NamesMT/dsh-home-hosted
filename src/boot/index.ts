/**
 * The boot-autostart family: one provider per OS mechanism, ordered into a
 * ladder. The plugin runs inside dsh, so it can only install, verify and
 * remove an OS-level entry — it never runs at boot itself.
 */
export type {
  BootActionResult,
  BootLadder,
  BootLadderOptions,
  BootProvider,
  BootProviderContext,
  BootProviderStatus,
  BootRunOptions,
  BootRunResult,
  BootRunner,
  BootSpec,
} from './types.js'

export { bootProviders, createBootLadder } from './ladder.js'
export { launchdLabel, launchdPlist } from './launchd.js'
export { systemdSystemUnit, systemdUserUnit } from './systemd.js'
export { xdgDesktopEntry } from './xdg.js'
export { registerTaskScript, scheduledTaskXml, unregisterTaskScript, windowsRunPayload } from './windows.js'
export { detectContainer } from './fallback.js'
