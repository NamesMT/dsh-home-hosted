/** Shared section props: every section renders from the live status snapshot. */
import type { Envelope, HomeHostedStatus, PluginSettings } from '../shared/contracts.js'
import type { TranslateFn } from './context.js'

/** Run one mutation; the caller refreshes `status` afterwards. */
export type Runner = (key: string, call: () => Promise<Envelope<unknown>>) => void

/** Apply a settings edit; only the changed subtree is sent. */
export type SettingsUpdater = (mutate: (settings: PluginSettings) => PluginSettings) => void

export interface SectionProps {
  t: TranslateFn
  status: HomeHostedStatus
  run: Runner
  updateSettings: SettingsUpdater
  /** Key of the mutation currently in flight, if any. */
  busy: string | null
}
