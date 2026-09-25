import { dash, TOKEN_KEYS, WRITE_VIA_KEYS } from './format.js'
import type { SectionProps } from './props.js'
import { Hint, Row, Section } from './ui.js'

export function PanelSection({ t, status }: SectionProps) {
  const panel = status.panel
  return (
    <Section title={t('panelTitle')} description={t('panelDesc')}>
      <Row label={t('panelReachable')}>{panel.reachable ? t('yes') : t('no')}</Row>
      <Row label={t('panelHome')}>{dash(panel.home)}</Row>
      <Row label={t('panelUrl')}>{dash(panel.url)}</Row>
      <Row label={t('panelVersion')}>{dash(panel.version)}</Row>
      <Row label={t('panelPid')}>{dash(panel.pid)}</Row>
      <Row label={t('panelWriteVia')}>{t(WRITE_VIA_KEYS[panel.writeVia] ?? 'writeViaNone')}</Row>
      <Row label={t('panelToken')}>{t(TOKEN_KEYS[panel.token] ?? 'tokenUnknown')}</Row>
      <Hint>{panel.detail}</Hint>
    </Section>
  )
}
