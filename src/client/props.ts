/** Shared section props: every section renders from the live status snapshot. */
import type { Envelope, HomeHostedStatus, PluginSettings, RpcError, ServerEntryView, UiStyle } from '../shared/contracts.js'
import type { TranslateFn } from './context.js'

/** Run one mutation and resolve its envelope; `status` is refreshed either way. */
export type Runner = (key: string, call: () => Promise<Envelope<unknown>>) => Promise<Envelope<unknown>>

/** Apply a settings edit; only the changed subtree is sent. */
export type SettingsUpdater = (mutate: (settings: PluginSettings) => PluginSettings) => void

export interface SectionProps {
  t: TranslateFn
  status: HomeHostedStatus
  run: Runner
  updateSettings: SettingsUpdater
  /** Key of the mutation currently in flight, if any. */
  busy: string | null
  /** The page's presentation: detailed unfolds and enriches, compact is the row list. */
  uiStyle: UiStyle
}

/**
 * The workspace section owns the *viewing* choice: the plugin manages one
 * workspace, but the page may look at any of them.
 */
export interface WorkspacesSectionProps extends SectionProps {
  /** The workspace the page currently lists servers for. */
  viewing: string
  onView: (workspace: string) => void
}

/**
 * The servers section renders `servers.list` for the viewed workspace, which is
 * not necessarily the managed one — `status.servers` holds only that workspace's
 * own entries.
 */
export interface ServersSectionProps extends SectionProps {
  /** The workspace these entries were read from. */
  workspace: string
  /** Its entries, as `servers.list` answered for it. */
  servers: ServerEntryView[]
  /** The failure that list hit, if any (a panel that is down, a bad workspace id). */
  serversError: RpcError | null
}
