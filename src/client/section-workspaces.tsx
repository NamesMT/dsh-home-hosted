/**
 * Which workspace the page looks at, and which one the plugin manages.
 *
 * The two are deliberately separate controls: the view moves freely across every
 * workspace the panel serves, while the setting is the one workspace the plugin's
 * intent (reconcile, the harness entry, boot autostart) applies to.
 */
import { useState } from 'react'
import type { WorkspaceSummary } from '../shared/contracts.js'
import { isWorkspaceId } from '../shared/contracts.js'
import { rpc } from './api.js'
import type { TranslateFn } from './context.js'
import { IconLayers } from './icons.js'
import type { WorkspacesSectionProps } from './props.js'
import { Button, Chip, Hint, Note, Option, Section, Select, Tag } from './ui.js'

/** `id`, or `id — label` when the registry carries a distinct human label. */
function workspaceLabel(workspace: WorkspaceSummary): string {
  const label = typeof workspace.label === 'string' ? workspace.label.trim() : ''
  return label.length === 0 || label === workspace.id ? workspace.id : `${workspace.id} — ${label}`
}

/** Counts read as live only when the panel answered for them. */
function countsText(workspace: WorkspaceSummary, t: TranslateFn): string {
  return workspace.source === 'file'
    ? t('workspacesCountsFile', { servers: workspace.servers })
    : t('workspacesCounts', { servers: workspace.servers, running: workspace.running })
}

export function WorkspacesSection({ t, status, run, updateSettings, busy, viewing, onView }: WorkspacesSectionProps) {
  const workspaces = status.workspaces ?? []
  const managedId = status.settings.workspace
  const entryId = status.defaultEntryId ?? 'dsh'
  // `legacyRoot` is the host's own word for it; the error text is the fallback for
  // a host that predates the field but still refuses the write.
  const migratable = status.legacyRoot === true || (status.lastError ?? '').includes('pre-0.7')
  const degraded = workspaces.some(workspace => workspace.source === 'file')
  const [migrateNote, setMigrateNote] = useState<string | null>(null)

  // The managed workspace may be unlisted (a panel that is down, a root without a
  // registry yet), and it must stay selectable — the setting still names it.
  const managedOptions = workspaces.map(workspace => ({
    value: workspace.id,
    label: workspaceLabel(workspace),
  }))
  if (!managedOptions.some(option => option.value === managedId) && isWorkspaceId(managedId))
    managedOptions.unshift({ value: managedId, label: managedId })

  const migrate = async (): Promise<void> => {
    const envelope = await run('panel.migrate', () => rpc('panel.migrate', {}))
    if (!envelope.ok) {
      setMigrateNote(`${t('workspaceMigrateFailed')} ${envelope.error.message}`)
      return
    }
    const value = envelope.value as { ok?: boolean, detail?: string } | null
    const detail = typeof value?.detail === 'string' && value.detail.length > 0 ? value.detail : null
    if (value?.ok === false) setMigrateNote(detail ?? t('workspaceMigrateFailed'))
    else setMigrateNote(detail ?? t('workspaceMigrateDone'))
  }

  return (
    <Section
      icon={<IconLayers />}
      title={t('workspacesTitle')}
      action={<Chip tone="accent">{viewing}</Chip>}
    >
      <Hint>{t('workspacesHint', { id: entryId })}</Hint>

      {workspaces.length === 0
        ? <Hint>{t('workspacesEmpty')}</Hint>
        : (
            <div className="hh-choice" role="radiogroup" aria-label={t('workspacesViewLabel')}>
              {workspaces.map((workspace) => {
                const hint = workspace.id === managedId
                  ? <Tag>{t('workspacesManagedTag')}</Tag>
                  : workspace.id === viewing
                    ? <Chip tone="accent">{t('workspacesViewingTag')}</Chip>
                    : undefined
                return (
                  <Option
                    key={workspace.id}
                    label={workspaceLabel(workspace)}
                    meta={countsText(workspace, t)}
                    hint={hint}
                    checked={workspace.id === viewing}
                    onChange={() => onView(workspace.id)}
                  />
                )
              })}
            </div>
          )}

      {degraded ? <Note tone="warn">{t('workspacesDegraded')}</Note> : null}

      <div className="hh-field-block">
        <span className="hh-field-label">{t('workspaceManagedLabel')}</span>
        <Select
          value={managedId}
          label={t('workspaceManagedLabel')}
          disabled={busy === 'settings'}
          options={managedOptions}
          onChange={workspace => updateSettings(current => ({ ...current, workspace }))}
        />
        <Hint>{t('workspaceManagedHint', { id: entryId })}</Hint>
      </div>

      {migratable
        ? (
            <Note tone="warn" title={t('workspaceLegacyTitle')}>
              <p>{t('workspaceLegacyBody')}</p>
              <div className="hh-note-actions">
                <Button
                  variant="primary"
                  busy={busy === 'panel.migrate'}
                  onClick={() => { void migrate() }}
                >
                  {t('workspaceMigrate')}
                </Button>
              </div>
            </Note>
          )
        : null}
      {migrateNote === null ? null : <Hint>{migrateNote}</Hint>}
    </Section>
  )
}
