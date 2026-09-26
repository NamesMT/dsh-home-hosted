import type { CSSProperties } from 'react'
import { rpc } from './api.js'
import { dash } from './format.js'
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

export function ServersSection({ t, status, run, busy }: SectionProps) {
  const servers = status.servers ?? []
  return (
    <Section title={t('serversTitle')} description={t('serversDesc')}>
      <div style={actions}>
        <Button
          busy={busy === 'status.refresh'}
          onClick={() => run('status.refresh', () => rpc('status', { refresh: true }))}
        >
          {t('refresh')}
        </Button>
      </div>
      <Hint>
        {status.panel.url === null
          ? t('serversHintNoPanel')
          : t('serversHintPanel', { url: status.panel.url })}
      </Hint>
      {servers.length === 0
        ? <Hint>{t('serversEmpty')}</Hint>
        : servers.map(server => (
            <div key={server.id} style={card}>
              <div style={cardTitle}>
                <strong>{server.id}</strong>
                <span>{dash(server.status)}</span>
              </div>
              <Row label={t('serversPid')}>{dash(server.pid)}</Row>
              <Row label={t('serversUrl')}>{dash(server.url)}</Row>
              <div style={actions}>
                <Button
                  busy={busy === `servers.start:${server.id}`}
                  onClick={() => run(`servers.start:${server.id}`, () => rpc('servers.start', { id: server.id }))}
                >
                  {t('serversStart')}
                </Button>
                <Button
                  busy={busy === `servers.stop:${server.id}`}
                  onClick={() => run(`servers.stop:${server.id}`, () => rpc('servers.stop', { id: server.id }))}
                >
                  {t('serversStop')}
                </Button>
                <Button
                  busy={busy === `servers.restart:${server.id}`}
                  onClick={() => run(`servers.restart:${server.id}`, () => rpc('servers.restart', { id: server.id }))}
                >
                  {t('serversRestart')}
                </Button>
              </div>
            </div>
          ))}
    </Section>
  )
}
