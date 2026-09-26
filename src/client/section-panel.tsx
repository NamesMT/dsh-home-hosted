import type { CliSource } from '../shared/contracts.js'
import { dash, TOKEN_KEYS, WRITE_VIA_KEYS } from './format.js'
import type { SectionProps } from './props.js'
import { Hint, Row, Section } from './ui.js'

const CLI_SOURCE_KEYS: Record<CliSource, string> = {
  config: 'panelCliConfig',
  dependency: 'panelCliDependency',
  path: 'panelCliPathSource',
  none: 'panelCliMissing',
}

export function PanelSection({ t, status }: SectionProps) {
  const panel = status.panel
  const cli = status.cli
  return (
    <Section title={t('panelTitle')} description={t('panelDesc')}>
      <Row label={t('panelReachable')}>{panel.reachable ? t('yes') : t('no')}</Row>
      <Row label={t('panelHome')}>{dash(panel.home)}</Row>
      <Row label={t('panelUrl')}>{dash(panel.url)}</Row>
      <Row label={t('panelVersion')}>{dash(panel.version)}</Row>
      <Row label={t('panelPid')}>{dash(panel.pid)}</Row>
      <Row label={t('panelWriteVia')}>{t(WRITE_VIA_KEYS[panel.writeVia] ?? 'writeViaNone')}</Row>
      <Row label={t('panelToken')}>{t(TOKEN_KEYS[panel.token] ?? 'tokenUnknown')}</Row>
      {cli !== undefined && (
        <>
          <Row label={t('panelCliSource')}>{`${t(CLI_SOURCE_KEYS[cli.source])} · ${dash(cli.version)}`}</Row>
          <Row label={t('panelCliPath')}>{dash(cli.path)}</Row>
          {cli.source === 'path' && <Hint>{t('panelCliNotPinned', { range: cli.expectedRange })}</Hint>}
          {cli.launcherPath != null && cli.launcherVersion == null && <Hint>{t('panelCliLauncherFailed')}</Hint>}
        </>
      )}
      <Hint>{panel.detail}</Hint>
    </Section>
  )
}
