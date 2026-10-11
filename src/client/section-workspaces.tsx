/**
 * Which workspace the page looks at.
 *
 * The view moves freely across every workspace the panel serves; the one the
 * plugin's intent (reconcile, the harness entry, boot autostart) applies to is
 * the panel's default, and it is marked rather than chosen.
 */
import type { WorkspaceSummary } from '../shared/contracts.js'
import { DEFAULT_WORKSPACE } from '../shared/contracts.js'
import type { TranslateFn } from './context.js'
import { IconLayers } from './icons.js'
import type { WorkspacesSectionProps } from './props.js'
import { Chip, Hint, Note, Option, Section, Tag } from './ui.js'

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

export function WorkspacesSection({ t, status, viewing, onView }: WorkspacesSectionProps) {
  const workspaces = status.workspaces ?? []
  const managedId = status.workspace ?? DEFAULT_WORKSPACE
  const entryId = status.defaultEntryId ?? 'dsh'
  // `legacyRoot` is the host's own word for it; the error text is the fallback for
  // a host that predates the field but still refuses the write.
  const migratable = status.legacyRoot === true || (status.lastError ?? '').includes('pre-0.7')
  const degraded = workspaces.some(workspace => workspace.source === 'file')

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

      {migratable
        ? (
            <Note tone="warn" title={t('workspaceLegacyTitle')}>
              <p>{t('workspaceLegacyBody')}</p>
            </Note>
          )
        : null}
    </Section>
  )
}
