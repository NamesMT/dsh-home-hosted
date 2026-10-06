import { useEffect, useState } from 'react'
import type { Envelope, HomeHostedStatus, PanelStatus, TokenState } from '../shared/contracts.js'
import { rpc } from './api.js'
import type { TranslateFn } from './context.js'
import { CLI_SOURCE_KEYS, dash, effectiveCandidates, shortenPath, TOKEN_KEYS, WRITE_VIA_KEYS } from './format.js'
import { IconPanel } from './icons.js'
import type { SectionProps } from './props.js'
import { Button, Code, CommandBox, Details, Hint, Link, Note, Option, Section, Spec, Tag } from './ui.js'

/** The measured token states a person must act on, whether or not the panel answers. */
const TOKEN_WARNING_KEYS: Partial<Record<TokenState, string>> = {
  absent: 'panelTokenWarnAbsent',
  present: 'panelTokenWarnPresent',
  stale: 'panelTokenWarnStale',
}

/**
 * Whether the token is the reason this page cannot reach the panel. A measured
 * `absent`/`present`/`stale` always warns; an unmeasured `unknown` warns only
 * when the panel process was started (`url` is known) — its silence is then
 * token-shaped. An `enrolled` token, or a panel that was never started (no
 * `url`, so no token could have been enrolled against it), does not warn.
 */
function tokenWarningKey(panel: Pick<PanelStatus, 'reachable' | 'token' | 'url'>): string | undefined {
  if (panel.token === 'enrolled') return undefined
  if (panel.token !== 'unknown') return TOKEN_WARNING_KEYS[panel.token]
  return panel.url === null ? undefined : 'panelTokenWarnUnreachable'
}

/**
 * The outcome note for a reclaim: the host's own settled detail is shown when it
 * has one, so a panel that never answered is reported as "not proved yet" rather
 * than claiming an acceptance that never happened.
 */
export function reclaimNote(envelope: Envelope<unknown>, t: TranslateFn): string {
  if (!envelope.ok) return t('panelTokenRegenerateFailed', { message: envelope.error.message })
  const settled = (envelope.value as HomeHostedStatus | null | undefined)?.panel
  return settled !== undefined && settled.detail.length > 0
    ? settled.detail
    : t('panelTokenRegenerated')
}

/**
 * The note a stop attempt leaves behind.
 *
 * A dropped transport is not a failure: stopping the panel this session runs
 * under kills the connection, and claiming "did not stop" there would be false.
 */
/**
 * The code a *dropped transport* carries, as a value rather than a message.
 *
 * `rpc()` catches its own fetch failure and returns `failure('network', …)` — it never throws —
 * so `'network'` is what a stop arrives as when the caller's own connection dies, and it has to
 * be named here. The check used to be `code === 'client'`, which only `page.tsx`'s `run()` catch
 * produces (when the *call* throws rather than returning an envelope) and which `rpc` never can:
 * the branch was unreachable on the real path, so stopping the panel showed
 * **"The panel did not stop: Failed to fetch"** — the false claim this function exists to avoid.
 */
const DROPPED_TRANSPORT = new Set(['network', 'no-fetch', 'client'])

export function stopNoteFor(envelope: Envelope<unknown>, t: TranslateFn): string {
  if (!envelope.ok)
    return DROPPED_TRANSPORT.has(envelope.error.code) ? t('panelStopping') : t('panelStopFailed', { message: envelope.error.message })
  return (envelope.value as { detail?: string } | null)?.detail || t('panelStopped')
}

/**
 * The note a start/replace attempt leaves behind.
 *
 * The host answers a *successful* envelope whose payload is
 * `PanelControlResult { ok: false, detail }` — a CLI that exited non-zero, or a
 * helper that never spawned. Reading only `envelope.ok` would let the button
 * return in silence, which is exactly the failure this exists to surface.
 */
export function controlNoteFor(
  envelope: Envelope<unknown>,
  t: TranslateFn,
  action: 'start' | 'replace',
): string | null {
  const failed = action === 'start' ? 'panelStartFailed' : 'panelReplaceFailed'
  if (!envelope.ok)
    return t(failed, { message: envelope.error.message })
  const value = envelope.value as { ok?: boolean, detail?: string } | null | undefined
  if (value?.ok === false)
    return t(failed, { message: value.detail ?? '' })
  return value?.detail && value.detail.length > 0 ? value.detail : null
}

/** Draft-then-commit numeric field: empty means `null`, invalid reverts. */
function PortField({ value, label, hint, invalidLabel, placeholder, disabled, onChange }: {
  value: number | null
  label: string
  hint: string
  invalidLabel: string
  /** What an empty field falls back to, so blank is not a mystery. */
  placeholder?: string
  disabled: boolean
  onChange: (port: number | null) => void
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  useEffect(() => {
    setDraft(value === null ? '' : String(value))
  }, [value])

  const parsed = draft.trim() === '' ? null : Number(draft)
  const invalid = parsed !== null && (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535)
  const commit = (): void => {
    if (invalid) {
      setDraft(value === null ? '' : String(value))
      return
    }
    if (parsed !== value) onChange(parsed)
  }

  return (
    <div className="hh-field-block">
      <div className="hh-field">
        <label className="hh-field-label" htmlFor="hh-panel-port">{label}</label>
        <input
          id="hh-panel-port"
          className="hh-input"
          type="number"
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          onChange={event => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
        />
      </div>
      <Hint>{invalid ? invalidLabel : hint}</Hint>
    </div>
  )
}

export function PanelSection({ t, status, run, updateSettings, busy, uiStyle }: SectionProps) {
  const panel = status.panel
  const cli = status.cli
  const instances = status.instances ?? []
  const preferred = cli?.prefer ?? status.settings.cli?.prefer ?? 'pinned'
  const [confirming, setConfirming] = useState(false)
  const [installOutput, setInstallOutput] = useState<string | null>(null)
  const [tokenNote, setTokenNote] = useState<string | null>(null)
  const [confirmingStop, setConfirmingStop] = useState(false)
  const [stopNote, setStopNote] = useState<string | null>(null)
  const [controlNote, setControlNote] = useState<string | null>(null)

  const tokenWarning = tokenWarningKey(panel)

  const cliVersion = cli?.version ?? null
  const versionsKnown = cliVersion !== null && panel.version !== null
  const needsReplace = panel.reachable && versionsKnown && cliVersion !== panel.version

  const { dependency, global } = cli === undefined
    ? { dependency: null, global: null }
    : effectiveCandidates(cli)
  const commands = cli === undefined
    ? []
    : [`pnpm add -g home-hosted@${cli.expectedRange}`, `npm install -g home-hosted@${cli.expectedRange}`]

  const choose = (prefer: 'pinned' | 'global'): void => {
    updateSettings(current => ({ ...current, cli: { ...current.cli, prefer } }))
  }

  const installGlobal = async (): Promise<void> => {
    const envelope = await run('cli.installGlobal', () => rpc('cli.installGlobal', {}))
    if (!envelope.ok) {
      setInstallOutput(t('panelInstallFailed', { message: envelope.error.message }))
      return
    }
    const value = envelope.value as { ok?: boolean, detail?: string, output?: string } | null
    // The installer's own output is the useful text; when it never ran there is
    // none, so the host's detail is what says why.
    if (value?.ok === false)
      setInstallOutput(value.output && value.output.length > 0 ? value.output : t('panelInstallFailed', { message: value.detail ?? '' }))
    else
      setInstallOutput(typeof value?.output === 'string' ? value.output : null)
  }

  const regenerate = async (): Promise<void> => {
    setTokenNote(reclaimNote(await run('panel.reclaimToken', () => rpc('panel.reclaimToken', {})), t))
  }

  const startPanel = async (): Promise<void> => {
    setControlNote(controlNoteFor(await run('panel.start', () => rpc('panel.start', {})), t, 'start'))
  }

  const replacePanel = async (): Promise<void> => {
    setConfirming(false)
    setControlNote(controlNoteFor(await run('panel.takeover', () => rpc('panel.takeover', {})), t, 'replace'))
  }

  const stopPanel = async (): Promise<void> => {
    setConfirmingStop(false)
    // If this harness is one of the panel's servers, the answer may never
    // arrive; say what is happening before asking, not after.
    setStopNote(t('panelStopping'))
    setStopNote(stopNoteFor(await run('panel.stop', () => rpc('panel.stop', {})), t))
  }

  return (
    <Section icon={<IconPanel />} title={t('panelTitle')}>
      {tokenWarning === undefined
        ? null
        : (
            <Note tone="warn" title={t('panelTokenWarningTitle')}>
              <p>{t(tokenWarning)}</p>
              {/* The unmeasured branch already names the panel needing a start. */}
              {panel.reachable || panel.token === 'unknown' ? null : <p>{t('panelTokenWarnPanelDown')}</p>}
              <div className="hh-note-actions">
                <Button
                  variant="primary"
                  busy={busy === 'panel.reclaimToken'}
                  onClick={() => { void regenerate() }}
                >
                  {t('panelTokenRegenerate')}
                </Button>
              </div>
            </Note>
          )}
      {tokenNote === null ? null : <Hint>{tokenNote}</Hint>}

      {cli === undefined ? null : (
        <>
          <div className="hh-choice" role="radiogroup" aria-label={t('panelCopy')}>
            <Option
              label={t('optionsPreferPinned')}
              hint={<Tag>{t('optionsRecommended')}</Tag>}
              meta={dependency === null ? undefined : dash(dependency.version)}
              path={dependency?.path ?? undefined}
              checked={preferred === 'pinned'}
              disabled={dependency === null || busy === 'settings'}
              onChange={() => choose('pinned')}
            />
            <Option
              label={t('optionsPreferGlobal')}
              meta={global === null ? undefined : dash(global.version)}
              path={global?.path ?? undefined}
              checked={preferred === 'global'}
              disabled={global === null || busy === 'settings'}
              onChange={() => choose('global')}
            />
          </div>
          <Hint>{t('panelCopyHint')}</Hint>
          {cli.source === 'config' ? <Hint>{t('optionsConfigOverride')}</Hint> : null}
          {cli.source === 'path' && preferred !== 'global'
            ? <Hint>{t('panelCliNotPinned', { range: cli.expectedRange })}</Hint>
            : null}
          {cli.supported ? null : <Note tone="warn">{t('panelCliUnsupported')}</Note>}
          {cli.launcherPath != null && cli.launcherVersion == null
            ? <Note tone="warn">{t('panelCliLauncherFailed')}</Note>
            : null}
        </>
      )}

      <PortField
        value={status.settings.panel?.port ?? null}
        label={t('panelPort')}
        hint={panel.reachable ? t('panelPortHint') : t('panelPortFree')}
        invalidLabel={t('panelPortInvalid')}
        placeholder={panel.configPort == null ? undefined : String(panel.configPort)}
        disabled={panel.reachable || busy !== null}
        onChange={port => updateSettings(current => ({ ...current, panel: { ...current.panel, port } }))}
      />

      {status.panelRootSource !== 'legacy' ? null : <Hint>{t('panelRootLegacy')}</Hint>}

      {instances.length <= 1
        ? null
        : (
            <Details label={t('panelInstances', { count: instances.length })} open={uiStyle === 'detailed'}>
              {instances.map(instance => (
                <Spec
                  key={instance.home}
                  label={instance.managed ? t('panelInstanceManaged') : t('panelInstanceOther')}
                >
                  <Code>{instance.home}</Code>
                  {instance.url === null ? null : <>{' · '}<Link href={instance.url}>{instance.url}</Link></>}
                  {` · ${instance.running ? t('stateAnswering') : t('stateNotAnswering')}`}
                  {instance.version === null ? null : ` · ${instance.version}`}
                  {instance.hosting ? ` · ${t('panelInstanceHosts')}` : null}
                </Spec>
              ))}
              <Hint>{t('panelInstancesHint')}</Hint>
            </Details>
          )}

      {needsReplace ? <Hint>{t('panelOutdated')}</Hint> : null}

      <div className="hh-btn-row">
        {panel.reachable
          ? null
          : (
              <Button
                variant="primary"
                busy={busy === 'panel.start'}
                onClick={() => { void startPanel() }}
              >
                {t('panelStart')}
              </Button>
            )}
        {panel.reachable
          ? (
              <Button
                variant="danger"
                disabled={busy !== null}
                onClick={() => setConfirmingStop(true)}
              >
                {t('panelStop')}
              </Button>
            )
          : null}
        {needsReplace && !confirming
          ? (
              <Button variant="primary" onClick={() => setConfirming(true)}>
                {t('panelReplace', { copy: t(preferred === 'global' ? 'panelCopyGlobal' : 'panelCopyPinned') })}
              </Button>
            )
          : null}
      </div>

      {stopNote === null ? null : <Hint>{stopNote}</Hint>}
      {controlNote === null ? null : <Hint>{controlNote}</Hint>}

      {confirmingStop
        ? (
            <div className="hh-note" role="alertdialog" aria-label={t('panelStopTitle')}>
              <div className="hh-note-body">
                <strong>{t('panelStopTitle')}</strong>
                <p>{t('panelStopBody')}</p>
                <div className="hh-note-actions">
                  <Button onClick={() => setConfirmingStop(false)}>{t('confirmCancel')}</Button>
                  <Button
                    variant="danger"
                    busy={busy === 'panel.stop'}
                    onClick={() => { void stopPanel() }}
                  >
                    {t('confirmStop')}
                  </Button>
                </div>
              </div>
            </div>
          )
        : null}

      {needsReplace && confirming
        ? (
            <div className="hh-note" role="alertdialog" aria-label={t('panelTakeoverTitle')}>
              <div className="hh-note-body">
                <strong>{t('panelTakeoverTitle')}</strong>
                <p>{t('panelTakeoverBody', { id: status.defaultEntryId ?? 'dsh' })}</p>
                <div className="hh-note-actions">
                  <Button onClick={() => setConfirming(false)}>{t('confirmCancel')}</Button>
                  <Button
                    variant="danger"
                    busy={busy === 'panel.takeover'}
                    onClick={() => { void replacePanel() }}
                  >
                    {t('confirmReplace')}
                  </Button>
                </div>
              </div>
            </div>
          )
        : null}

      {cli !== undefined && global === null
        ? (
            <Details label={t('optionsInstallLabel')} open={uiStyle === 'detailed'}>
              <Hint>{t('optionsInstallHint')}</Hint>
              <CommandBox text={commands.join('\n')} copyLabel={t('copy')} copiedLabel={t('copied')} />
              <div className="hh-btn-row">
                <Button busy={busy === 'cli.installGlobal'} onClick={() => { void installGlobal() }}>
                  {t('optionsInstall')}
                </Button>
              </div>
              {installOutput === null ? null : <pre className="hh-output">{installOutput}</pre>}
            </Details>
          )
        : null}

      <Details label={t('details')} open={uiStyle === 'detailed'}>
        <Spec label={t('panelHome')}>
          <Code>{panel.home}</Code>
          {status.bootUnitName === undefined ? null : <>{' · '}{status.bootUnitName}</>}
        </Spec>
        <Spec label={t('panelUrl')}>
          {panel.url === null ? dash(panel.url) : <Link href={panel.url}>{panel.url}</Link>}
        </Spec>
        <Spec label={t('panelVersion')}>{dash(panel.version)}</Spec>
        <Spec label={t('panelPid')}>{dash(panel.pid)}</Spec>
        <Spec label={t('panelWriteVia')}>{t(WRITE_VIA_KEYS[panel.writeVia] ?? 'writeViaNone')}</Spec>
        <Spec label={t('panelToken')}>{t(TOKEN_KEYS[panel.token] ?? 'tokenUnknown')}</Spec>
        {cli === undefined
          ? null
          : (
              <>
                <Spec label={t('panelCliSource')}>
                  {`${t(CLI_SOURCE_KEYS[cli.source] ?? 'panelCliMissing')} · ${dash(cli.version)}`}
                </Spec>
                <Spec label={t('panelCliPath')}><Code>{dash(cli.path)}</Code></Spec>
              </>
            )}
        {panel.detail.length > 0 ? <Hint>{panel.detail}</Hint> : null}
      </Details>
    </Section>
  )
}
