import { rpc } from './api.js'
import { dash } from './format.js'
import { IconLayers } from './icons.js'
import type { SectionProps } from './props.js'
import { serversRunning } from './status.js'
import { Button, Chip, Hint, Link, Section } from './ui.js'

export function ServersSection({ t, status, run, busy }: SectionProps) {
  const servers = status.servers ?? []
  return (
    <Section
      icon={<IconLayers />}
      title={t('serversTitle')}
      action={<Chip>{serversRunning(servers, t)}</Chip>}
    >
      <Hint>
        {status.panel.url === null
          ? t('serversHintNoPanel')
          : (
              <>
                {`${t('serversHintPanel')} `}
                <Link href={status.panel.url}>{status.panel.url}</Link>
              </>
            )}
      </Hint>
      {servers.length === 0
        ? <Hint>{t('serversEmpty')}</Hint>
        : (
            <div className="hh-list">
              {servers.map((server) => {
                const running = server.status === 'running'
                const offline = !status.panel.reachable || busy !== null
                return (
                  <div className="hh-item" key={server.id}>
                    <span className="hh-item-main">
                      <span className="hh-item-name">{server.id}</span>
                      <Chip tone={running ? 'ok' : 'idle'}>{dash(server.status)}</Chip>
                      {server.url === null ? null : <Link href={server.url}>{server.url}</Link>}
                    </span>
                    <span className="hh-item-spacer" />
                    {server.pid === null
                      ? null
                      : <span className="hh-item-meta">{`${t('serversPid')} ${server.pid}`}</span>}
                    <span className="hh-item-actions">
                      <Button
                        variant="ghost"
                        disabled={offline || running}
                        busy={busy === `servers.start:${server.id}`}
                        onClick={() => { void run(`servers.start:${server.id}`, () => rpc('servers.start', { id: server.id })) }}
                      >
                        {t('serversStart')}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={offline || !running}
                        busy={busy === `servers.stop:${server.id}`}
                        onClick={() => { void run(`servers.stop:${server.id}`, () => rpc('servers.stop', { id: server.id })) }}
                      >
                        {t('serversStop')}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={offline || !running}
                        busy={busy === `servers.restart:${server.id}`}
                        onClick={() => { void run(`servers.restart:${server.id}`, () => rpc('servers.restart', { id: server.id })) }}
                      >
                        {t('serversRestart')}
                      </Button>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
    </Section>
  )
}
