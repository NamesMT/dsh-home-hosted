import type { EntryIntent, ServerEntryView } from '../shared/contracts.js'
import { rpc } from './api.js'
import { dash, EMPTY, shortenPath } from './format.js'
import { IconLayers } from './icons.js'
import type { Runner, SectionProps } from './props.js'
import { healthLine, restartLine } from './server-facts.js'
import { serversRunning } from './status.js'
import { Button, Chip, Code, Details, Hint, Link, Section, Spec } from './ui.js'

/** The three lifecycle buttons, identical in both styles. */
function ServerActions({ t, server, run, busy, offline }: {
  t: SectionProps['t']
  server: ServerEntryView
  run: Runner
  busy: string | null
  /** Panel unreachable, or another mutation in flight. */
  offline: boolean
}) {
  const running = server.status === 'running'
  return (
    <>
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
    </>
  )
}

/** One machine value on a single line; the full text lives in the title. */
function OneLine({ text }: { text: string }) {
  if (text.length === 0) return <>{EMPTY}</>
  return <span className="hh-nowrap" title={text}><Code>{text}</Code></span>
}

export function ServersSection({ t, status, run, busy, uiStyle }: SectionProps) {
  const servers = status.servers ?? []
  const offline = !status.panel.reachable || busy !== null
  const intents = new Map<string, EntryIntent>(
    (status.entries ?? []).map(entry => [entry.intent.id, entry.intent]),
  )

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
            <div className={uiStyle === 'detailed' ? 'hh-cards' : 'hh-list'}>
              {servers.map((server) => {
                const running = server.status === 'running'
                const config = server.config
                if (uiStyle === 'detailed') {
                  const args = (config.args ?? []).join(' ')
                  const cwd = config.cwd ?? ''
                  const persistent = intents.get(server.id)?.persistent
                  return (
                    <article className="hh-card" key={server.id}>
                      <div className="hh-card-head">
                        <span className="hh-item-name">{server.id}</span>
                        <Chip tone={running ? 'ok' : 'idle'}>{dash(server.status)}</Chip>
                        {persistent === true
                          ? (
                              <span title={t('serversPersistentHint')}>
                                <Chip tone="accent">{t('serversPersistent')}</Chip>
                              </span>
                            )
                          : null}
                        <span className="hh-item-spacer" />
                        <span className="hh-item-actions">
                          <ServerActions t={t} server={server} run={run} busy={busy} offline={offline} />
                        </span>
                      </div>

                      {/* The card face is the server's live state; its config is one
                          disclosure down, not the first thing a person reads. */}
                      <div className="hh-card-facts">
                        <Spec label={t('serversUrl')}>
                          {server.url === null ? dash(server.url) : <Link href={server.url}>{server.url}</Link>}
                        </Spec>
                        <Spec label={t('serversPid')}>{dash(server.pid)}</Spec>
                        <Spec label={t('serversPort')}>{dash(config.port)}</Spec>
                        <Spec label={t('serversAutostart')}>
                          {config.autostart === undefined ? EMPTY : config.autostart ? t('yes') : t('no')}
                        </Spec>
                      </div>

                      <Details label={t('serversConfiguration')}>
                        <Spec label={t('serversCommand')}>
                          {config.command === undefined || config.command.length === 0
                            ? EMPTY
                            : (
                                <span className="hh-nowrap" title={config.command}>
                                  <Code>{config.command}</Code>
                                </span>
                              )}
                        </Spec>
                        <Spec label={t('serversArgs')}><OneLine text={args} /></Spec>
                        <Spec label={t('serversCwd')}>
                          {cwd.length === 0
                            ? EMPTY
                            : (
                                <span className="hh-nowrap" title={cwd}>
                                  <Code>{shortenPath(cwd)}</Code>
                                </span>
                              )}
                        </Spec>
                        <Spec label={t('serversOnPortConflict')}>{dash(config.onPortConflict)}</Spec>
                        <Spec label={t('serversHealth')}>{healthLine(config.health, config.port ?? null, t)}</Spec>
                        <Spec label={t('serversRestartPolicy')}>{restartLine(config.restart, t)}</Spec>
                      </Details>

                      <Details label={t('serversRawConfig')}>
                        <pre className="hh-output">{JSON.stringify(config, null, 2)}</pre>
                      </Details>
                    </article>
                  )
                }
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
                      <ServerActions t={t} server={server} run={run} busy={busy} offline={offline} />
                    </span>
                  </div>
                )
              })}
            </div>
          )}
    </Section>
  )
}
