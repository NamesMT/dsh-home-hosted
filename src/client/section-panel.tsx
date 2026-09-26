import { useState } from 'react'
import type { CSSProperties } from 'react'
import { rpc } from './api.js'
import { CLI_SOURCE_KEYS, dash, TOKEN_KEYS, WRITE_VIA_KEYS } from './format.js'
import type { SectionProps } from './props.js'
import { Button, Hint, Link, Row, Section } from './ui.js'

const confirmBox: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 10,
  borderRadius: 6,
  border: '1px solid var(--dsw-alias-state-error-primary, #e53e3e)',
}

const actions: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }

export function PanelSection({ t, status, run, busy }: SectionProps) {
  const panel = status.panel
  const cli = status.cli
  const preferred = cli?.prefer ?? status.settings.cli?.prefer ?? 'pinned'
  const [confirming, setConfirming] = useState(false)

  const cliVersion = cli?.version ?? null
  const panelVersion = panel.version
  const versionsKnown = cliVersion !== null && panelVersion !== null
  const sameCopy = panel.reachable && versionsKnown && cliVersion === panelVersion
  const needsReplace = panel.reachable && versionsKnown && cliVersion !== panelVersion

  return (
    <Section title={t('panelTitle')} description={t('panelDesc')}>
      <Row label={t('panelReachable')}>{panel.reachable ? t('yes') : t('no')}</Row>
      <Row label={t('panelHome')}>{dash(panel.home)}</Row>
      <Row label={t('panelUrl')}>
        {panel.url === null ? dash(panel.url) : <Link href={panel.url}>{panel.url}</Link>}
      </Row>
      <Row label={t('panelVersion')}>{dash(panel.version)}</Row>
      <Row label={t('panelPid')}>{dash(panel.pid)}</Row>
      <Row label={t('panelWriteVia')}>{t(WRITE_VIA_KEYS[panel.writeVia] ?? 'writeViaNone')}</Row>
      <Row label={t('panelToken')}>{t(TOKEN_KEYS[panel.token] ?? 'tokenUnknown')}</Row>
      {cli !== undefined && (
        <>
          <Row label={t('panelCliSource')}>{`${t(CLI_SOURCE_KEYS[cli.source] ?? 'panelCliMissing')} · ${dash(cli.version)}`}</Row>
          <Row label={t('panelCliPath')}>{dash(cli.path)}</Row>
          {cli.source === 'path' && preferred !== 'global' && <Hint>{t('panelCliNotPinned', { range: cli.expectedRange })}</Hint>}
          {cli.launcherPath != null && cli.launcherVersion == null && <Hint>{t('panelCliLauncherFailed')}</Hint>}
        </>
      )}
      <Hint>{panel.detail}</Hint>

      {!panel.reachable
        ? (
            <div style={actions}>
              <Button
                busy={busy === 'panel.start'}
                onClick={() => { void run('panel.start', () => rpc('panel.start', {})) }}
              >
                {t('panelStart')}
              </Button>
            </div>
          )
        : null}

      {sameCopy ? <Hint>{t('panelAlreadyPreferred')}</Hint> : null}

      {needsReplace
        ? (confirming
            ? (
                <div style={confirmBox} role="alertdialog" aria-label={t('panelTakeoverTitle')}>
                  <strong>{t('panelTakeoverTitle')}</strong>
                  <Hint>{t('panelTakeoverBody')}</Hint>
                  <div style={actions}>
                    <Button onClick={() => setConfirming(false)}>{t('confirmCancel')}</Button>
                    <Button
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
              )
            : (
                <div style={actions}>
                  <Button onClick={() => setConfirming(true)}>
                    {t('panelReplace', { version: cliVersion })}
                  </Button>
                </div>
              ))
        : null}
    </Section>
  )
}
