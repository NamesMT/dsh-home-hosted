import { Fragment, useState } from 'react'
import type { EntryIntent, ServerEntry, ServerEntryPatch, ServerEntryView } from '../shared/contracts.js'
import { rpc } from './api.js'
import type { EntryDraft } from './entry-editor.js'
import { createBodyFromDraft, draftFromEntry, EntryEditor, patchFromDraft } from './entry-editor.js'
import { dash, EMPTY, shortenPath } from './format.js'
import { IconLayers } from './icons.js'
import type { Runner, ServersSectionProps } from './props.js'
import { healthLine, restartLine } from './server-facts.js'
import { serversRunning } from './status.js'
import { Button, Chip, Code, Details, FailureNote, Hint, Link, Note, Section, Spec } from './ui.js'

/** What the panel's `free-port` reports back; read defensively. */
interface FreePortResult {
  port?: number | null
  free?: boolean
  skipped?: number[]
}

/**
 * Every `servers.*` call is workspace-scoped at the payload level: a server id
 * is only unique inside one, so the workspace travels with the id, never beside
 * it as an optional extra.
 */
export function lifecyclePayload(workspace: string, id: string): { workspace: string, id: string } {
  return { workspace, id }
}

export function createPayload(workspace: string, entry: ServerEntry): { workspace: string, entry: ServerEntry } {
  return { workspace, entry }
}

export function updatePayload(workspace: string, id: string, patch: ServerEntryPatch): { workspace: string, id: string, patch: ServerEntryPatch } {
  return { workspace, id, patch }
}

export function deletePayload(workspace: string, id: string): { workspace: string, id: string } {
  return { workspace, id }
}

/** A busy key names the workspace too: a server id is only unique inside one. */
function busyKey(workspace: string, action: string, id: string): string {
  return `${action}:${workspace}/${id}`
}

/** The three lifecycle buttons, identical in both styles. */
function ServerActions({ t, workspace, server, run, busy, offline, onEdit, onDelete, onFreePort }: {
  t: ServersSectionProps['t']
  workspace: string
  server: ServerEntryView
  run: Runner
  busy: string | null
  /** Panel unreachable, or another mutation in flight. */
  offline: boolean
  onEdit: () => void
  onDelete: () => void
  onFreePort: () => void
}) {
  const running = server.status === 'running'
  return (
    <>
      <Button
        variant="ghost"
        disabled={offline || running}
        busy={busy === busyKey(workspace, 'servers.start', server.id)}
        onClick={() => { void run(busyKey(workspace, 'servers.start', server.id), () => rpc('servers.start', lifecyclePayload(workspace, server.id))) }}
      >
        {t('serversStart')}
      </Button>
      <Button
        variant="ghost"
        disabled={offline || !running}
        busy={busy === busyKey(workspace, 'servers.stop', server.id)}
        onClick={() => { void run(busyKey(workspace, 'servers.stop', server.id), () => rpc('servers.stop', lifecyclePayload(workspace, server.id))) }}
      >
        {t('serversStop')}
      </Button>
      <Button
        variant="ghost"
        disabled={offline || !running}
        busy={busy === busyKey(workspace, 'servers.restart', server.id)}
        onClick={() => { void run(busyKey(workspace, 'servers.restart', server.id), () => rpc('servers.restart', lifecyclePayload(workspace, server.id))) }}
      >
        {t('serversRestart')}
      </Button>
      <Button variant="ghost" disabled={offline} onClick={onEdit}>
        {t('serversEdit')}
      </Button>
      <Button variant="ghost" disabled={offline} onClick={onDelete}>
        {t('serversDelete')}
      </Button>
      {server.config.port == null
        ? null
        : (
            <Button variant="ghost" disabled={offline} onClick={onFreePort}>
              {t('serversFreePort')}
            </Button>
          )}
    </>
  )
}

/** One machine value on a single line; the full text lives in the title. */
function OneLine({ text }: { text: string }) {
  if (text.length === 0) return <>{EMPTY}</>
  return <span className="hh-nowrap" title={text}><Code>{text}</Code></span>
}

export function ServersSection({ t, status, run, busy, uiStyle, workspace, servers, serversError }: ServersSectionProps) {
  const offline = !status.panel.reachable || busy !== null
  // The intent belongs to the managed workspace only: a same-named entry in
  // another workspace is a different server, so it must not inherit its badge.
  const intents = new Map<string, EntryIntent>(
    workspace === status.workspace
      ? (status.entries ?? []).map(entry => [entry.intent.id, entry.intent])
      : [],
  )
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [freeing, setFreeing] = useState<string | null>(null)
  const [freeNote, setFreeNote] = useState<string | null>(null)

  const openCreate = (): void => {
    setCreating(true)
    setEditing(null)
    setDeleting(null)
    setFreeing(null)
  }

  const openEdit = (id: string): void => {
    setCreating(false)
    setEditing(id)
    setDeleting(null)
    setFreeing(null)
  }

  const closeEditor = (): void => {
    setCreating(false)
    setEditing(null)
  }

  const submitCreate = async (draft: EntryDraft): Promise<void> => {
    const entry = createBodyFromDraft(draft)
    if (entry === null) return
    const envelope = await run('servers.create', () => rpc('servers.create', createPayload(workspace, entry)))
    if (envelope.ok) closeEditor()
  }

  const submitUpdate = async (id: string, draft: EntryDraft, stored: ServerEntryView): Promise<void> => {
    const patch = patchFromDraft(stored.config, draft)
    if (patch === null) {
      setEditing(null)
      return
    }
    const envelope = await run(busyKey(workspace, 'servers.update', id), () =>
      rpc('servers.update', updatePayload(workspace, id, patch)))
    if (envelope.ok) setEditing(null)
  }

  const removeEntry = async (id: string): Promise<void> => {
    setDeleting(null)
    await run(busyKey(workspace, 'servers.delete', id), () => rpc('servers.delete', deletePayload(workspace, id)))
  }

  const freePort = async (server: ServerEntryView): Promise<void> => {
    setFreeing(null)
    const envelope = await run(busyKey(workspace, 'servers.freePort', server.id), () =>
      rpc('servers.freePort', lifecyclePayload(workspace, server.id)))
    if (!envelope.ok) {
      setFreeNote(t('serversPortRefused', { message: envelope.error.message }))
      return
    }
    const value = envelope.value as FreePortResult | null
    const port = value?.port ?? server.config.port ?? EMPTY
    if (value?.free === true) {
      setFreeNote(t('serversPortFreed', { port }))
      return
    }
    setFreeNote(
      value?.skipped !== undefined && value.skipped.length > 0
        ? t('serversPortSkipped')
        : t('serversPortHeld', { port }),
    )
  }

  const freeTarget = freeing === null ? null : servers.find(server => server.id === freeing) ?? null

  return (
    <Section
      icon={<IconLayers />}
      title={t('serversTitle')}
      action={<Chip>{serversRunning(servers, t)}</Chip>}
    >
      <Hint>
        {`${t('serversWorkspace')} `}
        <Code>{workspace}</Code>
        {' · '}
        {status.panel.url === null
          ? t('serversHintNoPanel')
          : (
              <>
                {`${t('serversHintPanel')} `}
                <Link href={status.panel.url}>{status.panel.url}</Link>
              </>
            )}
      </Hint>

      {serversError === null
        ? null
        : (
            <FailureNote
              title={t('errorTitle')}
              detail={`${serversError.code} — ${serversError.message}`}
            />
          )}

      <div className="hh-btn-row">
        <Button
          variant="primary"
          disabled={offline || creating}
          onClick={openCreate}
        >
          {t('serversAdd')}
        </Button>
      </div>

      {creating
        ? (
            <EntryEditor
              key="create"
              t={t}
              title={t('serversCreateTitle')}
              initial={draftFromEntry({ id: '', command: '' })}
              submitLabel={t('serversCreate')}
              busy={busy === 'servers.create'}
              lockId={false}
              onSubmit={draft => { void submitCreate(draft) }}
              onCancel={closeEditor}
            />
          )
        : null}

      {freeTarget === null
        ? null
        : (
            <Note tone="warn" title={t('serversFreePortTitle', { port: dash(freeTarget.config.port) })}>
              <p>{t('serversFreePortBody')}</p>
              <div className="hh-note-actions">
                <Button onClick={() => setFreeing(null)}>{t('confirmCancel')}</Button>
                <Button
                  variant="danger"
                  busy={busy === busyKey(workspace, 'servers.freePort', freeTarget.id)}
                  onClick={() => { void freePort(freeTarget) }}
                >
                  {t('serversFreePortGo')}
                </Button>
              </div>
            </Note>
          )}

      {freeNote === null ? null : <Hint>{freeNote}</Hint>}

      {servers.length === 0
        ? <Hint>{t('serversEmpty')}</Hint>
        : (
            <div className={uiStyle === 'detailed' ? 'hh-cards' : 'hh-list'}>
              {servers.map((server) => {
                const running = server.status === 'running'
                const config = server.config
                const editor = editing === server.id
                  ? (
                      <EntryEditor
                        key={`edit:${server.id}`}
                        t={t}
                        title={t('serversEditTitle', { id: server.id })}
                        initial={draftFromEntry(config)}
                        submitLabel={t('serversSave')}
                        busy={busy === busyKey(workspace, 'servers.update', server.id)}
                        lockId
                        onSubmit={draft => { void submitUpdate(server.id, draft, server) }}
                        onCancel={() => setEditing(null)}
                      />
                    )
                  : null
                const confirmation = deleting === server.id
                  ? (
                      <Note tone="warn" title={t('serversDeleteTitle', { id: server.id })}>
                        <p>{t('serversDeleteBody', { workspace })}</p>
                        <div className="hh-note-actions">
                          <Button onClick={() => setDeleting(null)}>{t('confirmCancel')}</Button>
                          <Button
                            variant="danger"
                            busy={busy === busyKey(workspace, 'servers.delete', server.id)}
                            onClick={() => { void removeEntry(server.id) }}
                          >
                            {t('serversDeleteGo')}
                          </Button>
                        </div>
                      </Note>
                    )
                  : null
                const actions = (
                  <ServerActions
                    t={t}
                    workspace={workspace}
                    server={server}
                    run={run}
                    busy={busy}
                    offline={offline}
                    onEdit={() => openEdit(server.id)}
                    onDelete={() => { setDeleting(server.id); setEditing(null); setCreating(false) }}
                    onFreePort={() => { setFreeing(server.id); setEditing(null); setCreating(false) }}
                  />
                )

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
                        <span className="hh-item-actions">{actions}</span>
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

                      {editor}
                      {confirmation}
                    </article>
                  )
                }
                return (
                  <Fragment key={server.id}>
                    <div className="hh-item">
                      <span className="hh-item-main">
                        <span className="hh-item-name">{server.id}</span>
                        <Chip tone={running ? 'ok' : 'idle'}>{dash(server.status)}</Chip>
                        {server.url === null ? null : <Link href={server.url}>{server.url}</Link>}
                      </span>
                      <span className="hh-item-spacer" />
                      {server.pid === null
                        ? null
                        : <span className="hh-item-meta">{`${t('serversPid')} ${server.pid}`}</span>}
                      <span className="hh-item-actions">{actions}</span>
                    </div>
                    {editor}
                    {confirmation}
                  </Fragment>
                )
              })}
            </div>
          )}
    </Section>
  )
}
