/**
 * The one transport this page speaks: `POST /api/home-hosted` with the
 * frozen envelope from `src/shared/contracts.ts`. Plain `fetch` with
 * `credentials: 'same-origin'` — the page's own session cookie authorises
 * it, and the harness fence rejects anything cross-origin.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  BootControlResult,
  EndpointPayloads,
  Envelope,
  FreePortResult,
  HomeHostedStatus,
  ManagedEntryStatus,
  PanelControlResult,
  RpcEndpoint,
  RpcError,
  RpcRequest,
  ServerEntryView,
  SettingsPatch,
  UiResult,
  WorkspaceSummary,
} from '../shared/contracts.js'
import { isRecord, RPC_PATH, RPC_VERSION } from '../shared/contracts.js'

/** Authenticated harness channel prefix. */
export const API_BASE = '/api'

/** `cli.installGlobal` adds the command output to the panel-control result. */
export type CliInstallResult = PanelControlResult & { output?: string }

/** Result payload of each endpoint this page calls. */
export interface EndpointResults {
  'status': HomeHostedStatus
  'servers.list': ServerEntryView[]
  'servers.create': ServerEntryView
  'servers.update': ServerEntryView
  'servers.delete': { id: string, workspace?: string }
  'servers.freePort': FreePortResult
  'workspaces.list': WorkspaceSummary[]
  'panel.migrate': PanelControlResult
  'entries.apply': ManagedEntryStatus[]
  'entries.remove': ManagedEntryStatus[]
  'panel.start': PanelControlResult
  'panel.stop': PanelControlResult
  'panel.takeover': PanelControlResult
  'cli.installGlobal': CliInstallResult
  'boot.install': BootControlResult
  'boot.uninstall': BootControlResult
  'ui.manage': UiResult
}

export type RpcValue<E extends RpcEndpoint> = E extends keyof EndpointResults
  ? EndpointResults[E]
  : unknown

function failure(code: string, message: string, detail?: unknown): Envelope<never> {
  const error: RpcError = detail === undefined ? { code, message } : { code, message, detail }
  return { ok: false, error }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Unwrap one `{ v, endpoint, result }` response body; never throws.
 *
 * `isRecord` is the shared predicate, and this file is why the sharing matters: its local
 * copy accepted an **array**, because `typeof [] === 'object'`. The difference was real but
 * unreachable — `JSON.stringify([1, 2])` with a `.message` set emits `[1,2]`, so a JSON
 * response can never deliver an array carrying one, and the only input here is
 * `await response.json()`. Rather than leave the one copy that differs, the strict
 * predicate is imported: a reader should not have to re-derive that to know it is safe.
 */
export function parseResponse(json: unknown): Envelope<unknown> {
  if (!isRecord(json)) return failure('bad-response', 'The panel returned a non-object response')
  if (typeof json.v === 'number' && json.v !== RPC_VERSION) {
    return failure(
      'version-mismatch',
      `Response protocol v${json.v} does not match the expected v${RPC_VERSION}`,
    )
  }
  const result = json.result
  if (!isRecord(result)) return failure('bad-response', 'The panel returned no result')
  if (result.ok === true) {
    if (!('value' in result)) return failure('bad-response', 'A successful response carried no value')
    return { ok: true, value: result.value }
  }
  if (result.ok === false) {
    const error = result.error
    if (isRecord(error) && typeof error.message === 'string') {
      return failure(
        typeof error.code === 'string' ? error.code : 'error',
        error.message,
        error.detail,
      )
    }
    return failure('error', 'The panel reported a failure without a message')
  }
  return failure('bad-response', 'The panel returned an unrecognised result')
}

export interface RpcOptions {
  /** Injectable fetch (tests, alternative transports). */
  fetch?: typeof fetch
}

/** Call one endpoint and resolve its envelope; transport failures stay in-band. */
export async function rpc<E extends RpcEndpoint>(
  endpoint: E,
  payload: EndpointPayloads[E],
  options: RpcOptions = {},
): Promise<Envelope<RpcValue<E>>> {
  const doFetch = options.fetch ?? globalThis.fetch
  if (typeof doFetch !== 'function') return failure('no-fetch', 'No fetch implementation is available')
  const request: RpcRequest = { v: RPC_VERSION, endpoint, payload }
  let response: Response
  try {
    response = await doFetch(`${API_BASE}${RPC_PATH}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })
  }
  catch (error) {
    return failure('network', errorMessage(error))
  }
  if (!response.ok) {
    const suffix = response.statusText.length > 0 ? ` ${response.statusText}` : ''
    return failure('http', `HTTP ${response.status}${suffix}`)
  }
  let json: unknown
  try {
    json = await response.json()
  }
  catch {
    return failure('bad-json', 'The panel returned invalid JSON')
  }
  return parseResponse(json) as Envelope<RpcValue<E>>
}

/** `settings.update` with a deep partial; the host merges key by key. */
export function rpcSettingsUpdate(patch: SettingsPatch, options: RpcOptions = {}): Promise<Envelope<unknown>> {
  return rpc('settings.update', { patch }, options)
}

/** Refresh cadence while the settings page is mounted. */
export const STATUS_POLL_MS = 5000

export interface StatusState {
  data: HomeHostedStatus | null
  error: RpcError | null
  loading: boolean
  refresh: () => Promise<void>
}

/**
 * Live `status`: one read on mount, then one every `pollMs` — and every read
 * after a mutation, because the host answer is the only truth.
 */
export function useStatus(pollMs: number = STATUS_POLL_MS): StatusState {
  const [data, setData] = useState<HomeHostedStatus | null>(null)
  const [error, setError] = useState<RpcError | null>(null)
  const [loading, setLoading] = useState(true)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    const envelope = await rpc('status', {})
    if (!alive.current) return
    if (envelope.ok) {
      setData(envelope.value)
      setError(null)
    }
    else {
      setError(envelope.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    alive.current = true
    void refresh()
    const timer = setInterval(() => { void refresh() }, pollMs)
    return () => {
      alive.current = false
      clearInterval(timer)
    }
  }, [refresh, pollMs])

  return { data, error, loading, refresh }
}
