/**
 * The three questions the page opens with — is the panel answering, will it be
 * started at boot, is this dsh managed — answered from the one status snapshot.
 *
 * Pure and translator-injected, so the wording and the tones can be pinned by a
 * test without mounting anything.
 */
import type { BootState, HomeHostedStatus, ServerEntryView } from '../shared/contracts.js'
import type { TranslateFn } from './context.js'
import { BOOT_STATE_KEYS, dash } from './format.js'
import type { Tone } from './ui.js'

export interface Signal {
  key: 'panel' | 'autostart' | 'entry'
  tone: Tone
  /** Short group name; the fixed left column of the readout. */
  name: string
  /** What that group is doing, in the host's own vocabulary. */
  state: string
  /** Machine detail: a version, an address, a pid. */
  meta: string
  /** The one address worth clicking. */
  href: string | null
}

/** A boot state that means an entry exists and is meant to run at boot. */
const BOOT_TONES: Record<BootState, Tone> = {
  'not-installed': 'idle',
  'installed-disabled': 'warn',
  'enabled-running': 'ok',
  'enabled-failing': 'bad',
  'unsupported': 'idle',
}

/** `0.6.1 · http://127.0.0.1:6301`, skipping the halves that are absent. */
function join(...parts: Array<string | null>): string {
  return parts.filter((part): part is string => part !== null && part.length > 0).join(' · ')
}

function panelSignal(status: HomeHostedStatus, t: TranslateFn): Signal {
  const { panel } = status
  if (!panel.reachable) {
    return {
      key: 'panel',
      // A panel that is down is a normal resting state, not a failure — unless
      // the host reported an error reaching one that should have answered.
      tone: status.lastError === null ? 'idle' : 'bad',
      name: t('sigPanel'),
      state: t('stateNotAnswering'),
      meta: panel.home,
      href: null,
    }
  }
  return {
    key: 'panel',
    tone: 'ok',
    name: t('sigPanel'),
    state: t('stateAnswering'),
    meta: dash(panel.version),
    href: panel.url,
  }
}

function autostartSignal(status: HomeHostedStatus, t: TranslateFn): Signal {
  const { boot } = status
  const requested = status.settings.autostart.enabled
  // Asked for but nothing installed is the one boot state worth flagging: the
  // checkbox below says one thing and the machine says another.
  const tone = requested && boot.state === 'not-installed' ? 'warn' : BOOT_TONES[boot.state] ?? 'idle'
  const mechanism = boot.mechanism ?? (status.settings.autostart.mechanism === 'auto' ? null : status.settings.autostart.mechanism)
  return {
    key: 'autostart',
    tone,
    name: t('sigAutostart'),
    state: t(BOOT_STATE_KEYS[boot.state] ?? 'bootStateUnsupported'),
    meta: mechanism ?? '',
    href: null,
  }
}

function entrySignal(status: HomeHostedStatus, t: TranslateFn): Signal {
  const entries = status.entries ?? []
  // The host names the entry it manages; `dsh` is only the older-host fallback.
  const name = t('sigEntry', { id: status.defaultEntryId ?? 'dsh' })
  // The host always reports the harness entry, managed or not, so the intent is
  // what says whether this plugin manages it.
  const managed = status.settings.manageDsh === true
  const missing = entries.filter(entry => !entry.exists).length
  const drifted = entries.filter(entry => entry.drift.length > 0).length
  const live = entries.find(entry => entry.live !== null)?.live ?? null
  const tone: Tone = !managed
    ? 'idle'
    : missing > 0 ? 'bad' : drifted > 0 ? 'warn' : live !== null ? 'ok' : 'warn'
  return {
    key: 'entry',
    tone,
    name,
    state: managed ? t('stateManaged') : t('stateNotManaged'),
    meta: live === null ? t('entriesNotRunning') : join(dash(live.status), live.pid === null ? null : `pid ${live.pid}`),
    href: null,
  }
}

export function statusSignals(status: HomeHostedStatus, t: TranslateFn): Signal[] {
  return [panelSignal(status, t), autostartSignal(status, t), entrySignal(status, t)]
}

/** `1 of 3 running`, for the servers group's title chip. */
export function serversRunning(servers: readonly ServerEntryView[], t: TranslateFn): string {
  const running = servers.filter(server => server.status === 'running').length
  return t('serversCount', { running, total: servers.length })
}
