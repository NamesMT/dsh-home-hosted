import { useEffect, useState } from 'react'
import { rpc } from './api.js'
import { CLI_SOURCE_KEYS, dash, effectiveCandidates, shortenPath, TOKEN_KEYS, WRITE_VIA_KEYS } from './format.js'
import { IconPanel } from './icons.js'
import type { SectionProps } from './props.js'
import { Button, Code, CommandBox, Details, Hint, Link, Note, Option, Section, Spec, Tag } from './ui.js'

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

export function PanelSection({ t, status, run, updateSettings, busy }: SectionProps) {
  const panel = status.panel
  const cli = status.cli
  const preferred = cli?.prefer ?? status.settings.cli?.prefer ?? 'pinned'
  const [confirming, setConfirming] = useState(false)
  const [installOutput, setInstallOutput] = useState<string | null>(null)

  const cliVersion = cli?.version ?? null
  const versionsKnown = cliVersion !== null && panel.version !== null
  const sameCopy = panel.reachable && versionsKnown && cliVersion === panel.version
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
    if (!envelope.ok) return
    const value = envelope.value as { output?: string } | null
    setInstallOutput(typeof value?.output === 'string' ? value.output : null)
  }

  return (
    <Section icon={<IconPanel />} title={t('panelTitle')}>
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

      <div className="hh-btn-row">
        {panel.reachable
          ? null
          : (
              <Button
                variant="primary"
                busy={busy === 'panel.start'}
                onClick={() => { void run('panel.start', () => rpc('panel.start', {})) }}
              >
                {t('panelStart')}
              </Button>
            )}
        {needsReplace && !confirming
          ? (
              <Button variant="primary" onClick={() => setConfirming(true)}>
                {t('panelReplace', { version: cliVersion })}
              </Button>
            )
          : null}
      </div>

      {sameCopy ? <Hint>{t('panelAlreadyPreferred')}</Hint> : null}

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
                    onClick={() => {
                      setConfirming(false)
                      void run('panel.takeover', () => rpc('panel.takeover', {}))
                    }}
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
            <Details label={t('optionsInstallLabel')}>
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

      <Details label={t('details')}>
        <Spec label={t('panelHome')}><Code>{panel.home}</Code></Spec>
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
