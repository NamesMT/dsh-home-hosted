import type { CSSProperties } from 'react'
import { rpc } from './api.js'
import { dash, formatDrift } from './format.js'
import type { SectionProps } from './props.js'
import { Button, Hint, Row, Section } from './ui.js'

const card: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 10,
  borderRadius: 6,
  border: '1px solid var(--dsw-alias-border-secondary, rgba(128, 128, 128, 0.25))',
}

const cardTitle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
  fontSize: 13,
}

const actions: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }

export function EntriesSection({ t, status, run, busy }: SectionProps) {
  const entries = status.entries ?? []
  return (
    <Section title={t('entriesTitle')} description={t('entriesDesc')}>
      {entries.length === 0
        ? <Hint>{t('entriesEmpty')}</Hint>
        : entries.map((entry) => {
            const id = entry.intent.id
            const live = entry.live
            return (
              <div key={id} style={card}>
                <div style={cardTitle}>
                  <strong>{id}</strong>
                  <span style={{ color: 'var(--dsw-alias-label-secondary, #8b8b8b)' }}>
                    {entry.exists ? t('entriesExists') : t('entriesMissing')}
                    {' · '}
                    {entry.managed ? t('entriesManaged') : t('entriesUnmanaged')}
                  </span>
                </div>
                <Row label={t('entriesDrift')}>{formatDrift(entry.drift)}</Row>
                <Row label={t('entriesLive')}>
                  {live === null
                    ? t('entriesNotRunning')
                    : `${dash(live.status)}${live.pid === null ? '' : ` · pid ${live.pid}`}`}
                </Row>
                <Row label={t('entriesAutostart')}>{entry.intent.autostart ? t('yes') : t('no')}</Row>
                <Row label={t('entriesOnPortConflict')}>{entry.intent.onPortConflict}</Row>
                <Row label={t('entriesStopKillPortHolders')}>
                  {entry.intent.stopKillPortHolders ? t('yes') : t('no')}
                </Row>
                <div style={actions}>
                  <Button
                    busy={busy === `entries.adopt:${id}`}
                    onClick={() => run(`entries.adopt:${id}`, () => rpc('entries.apply', {
                      intents: [entry.intent],
                    }))}
                  >
                    {t('entriesAdopt')}
                  </Button>
                  <Button
                    busy={busy === `entries.pause:${id}`}
                    onClick={() => run(`entries.pause:${id}`, () => rpc('entries.apply', {
                      intents: [{ ...entry.intent, autostart: false }],
                    }))}
                  >
                    {t('entriesPause')}
                  </Button>
                  <Button
                    busy={busy === `entries.restore:${id}`}
                    disabled={!entry.managed}
                    onClick={() => run(`entries.restore:${id}`, () => rpc('entries.restore', { id }))}
                  >
                    {t('entriesRestore')}
                  </Button>
                </div>
              </div>
            )
          })}
    </Section>
  )
}
