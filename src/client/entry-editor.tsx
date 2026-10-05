/**
 * The entry fields this editor renders, and the ones it deliberately does not.
 *
 * The page is a **convenience for the common fields**, not a full config editor: the
 * servers section says so ("Entries are managed in the home-hosted panel:") and links
 * to that panel, whose own `ServerConfigEditor.vue` carries all 23 fields. A person
 * who needs `bootstrap`, an env file, a resource ceiling or a restart policy follows
 * that link, and a **minimal-diff** edit here never disturbs those keys — a patch
 * carries only what differs, so nothing unrendered is overwritten or dropped.
 *
 * `OUT_OF_SCOPE_FIELDS` is not a wishlist: it is the record of a decision, and
 * `test/client/entry-editor` fails if the two lists and the panel's own `serverSchema`
 * disagree. That is what stops a field the panel grows from becoming reachable in the
 * panel and *silently* missing here without anybody noticing which it was.
 */
export const EDITOR_FIELDS = ['id', 'command', 'args', 'cwd', 'label', 'port', 'autostart', 'onPortConflict'] as const

/** Panel fields no control here sets, on purpose — edit them in the panel. */
export const OUT_OF_SCOPE_FIELDS = [
  'enabled',
  'bind',
  'persistent',
  'env',
  'dataEnvs',
  'envFile',
  'bootstrap',
  'dependsOn',
  'resources',
  'backupPaths',
  'logBufferLines',
  'backupIgnoreGenerated',
  'health',
  'restart',
  'stop',
] as const

/**
 * One server entry, as a person edits it on the page.
 *
 * The plugin writes a create body as the *difference* from what the workspace
 * defaults supply and an edit as the difference from the stored entry — a value
 * written into `servers.config.json` stops following those defaults, so anything
 * nobody decided stays out of both.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { OnPortConflict, ServerEntry, ServerEntryPatch } from '../shared/contracts.js'
import { ON_PORT_CONFLICT_POLICIES } from '../shared/contracts.js'
import type { TranslateFn } from './context.js'
import { Button, Hint, Select } from './ui.js'

/** An unset choice stays `inherit`: the form then writes nothing for it. */
export type TriState = 'inherit' | 'on' | 'off'

export interface EntryDraft {
  id: string
  label: string
  command: string
  /** One argument per line. */
  args: string
  cwd: string
  /** Empty means the entry has no port. */
  port: string
  autostart: TriState
  /** Empty means the workspace default policy. */
  onPortConflict: '' | OnPortConflict
}

export const EMPTY_DRAFT: EntryDraft = {
  id: '',
  label: '',
  command: '',
  args: '',
  cwd: '',
  port: '',
  autostart: 'inherit',
  onPortConflict: '',
}

export function draftFromEntry(entry: ServerEntry): EntryDraft {
  return {
    id: entry.id,
    label: entry.label ?? '',
    command: entry.command ?? '',
    args: (entry.args ?? []).join('\n'),
    cwd: entry.cwd ?? '',
    port: entry.port === null || entry.port === undefined ? '' : String(entry.port),
    autostart: entry.autostart === undefined ? 'inherit' : entry.autostart ? 'on' : 'off',
    onPortConflict: entry.onPortConflict ?? '',
  }
}

/** One argument per line; blank lines are not arguments. */
export function parseArgs(text: string): string[] {
  return text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
}

/** A port, `null` for an empty field, or `'invalid'`. */
export function parsePort(text: string): number | null | 'invalid' {
  const trimmed = text.trim()
  if (trimmed.length === 0) return null
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value < 1 || value > 65535) return 'invalid'
  return value
}

/** The panel's own entry id rule. */
export function isValidEntryId(id: string): boolean {
  return /^[a-z0-9][a-z0-9_-]*$/.test(id)
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

/** The create body, or null when the required fields are not usable. */
export function createBodyFromDraft(draft: EntryDraft): ServerEntry | null {
  const id = draft.id.trim()
  const command = draft.command.trim()
  if (!isValidEntryId(id) || command.length === 0) return null
  const entry: ServerEntry = { id, command }
  const label = draft.label.trim()
  if (label.length > 0) entry.label = label
  const args = parseArgs(draft.args)
  if (args.length > 0) entry.args = args
  const cwd = draft.cwd.trim()
  if (cwd.length > 0) entry.cwd = cwd
  const port = parsePort(draft.port)
  if (port !== 'invalid' && port !== null) entry.port = port
  if (draft.autostart === 'on') entry.autostart = true
  if (draft.onPortConflict !== '') entry.onPortConflict = draft.onPortConflict
  return entry
}

/**
 * The patch an edit sends: only the fields that differ from the stored entry,
 * or null when nothing changed. An empty port clears it (a patch may carry
 * `null`); an empty working directory is left alone, because the panel's schema
 * has no way to unset one.
 */
export function patchFromDraft(entry: ServerEntry, draft: EntryDraft): ServerEntryPatch | null {
  const patch: ServerEntryPatch = {}
  const label = draft.label.trim()
  if (label !== (entry.label ?? '')) patch.label = label
  const command = draft.command.trim()
  if (command.length > 0 && command !== (entry.command ?? '')) patch.command = command
  const args = parseArgs(draft.args)
  if (!sameList(args, entry.args ?? [])) patch.args = args
  const cwd = draft.cwd.trim()
  if (cwd.length > 0 && cwd !== (entry.cwd ?? '')) patch.cwd = cwd
  const port = parsePort(draft.port)
  if (port !== 'invalid' && port !== (entry.port ?? null)) patch.port = port
  if (draft.autostart !== 'inherit') {
    const enabled = draft.autostart === 'on'
    if (entry.autostart !== enabled) patch.autostart = enabled
  }
  if (draft.onPortConflict !== '' && draft.onPortConflict !== entry.onPortConflict)
    patch.onPortConflict = draft.onPortConflict
  return Object.keys(patch).length > 0 ? patch : null
}

function Field({ label, hint, children }: { label: string, hint?: string, children: ReactNode }) {
  return (
    <div className="hh-field-block">
      <div className="hh-field">
        <span className="hh-field-label">{label}</span>
        {children}
      </div>
      {hint === undefined ? null : <Hint>{hint}</Hint>}
    </div>
  )
}

export function EntryEditor({ t, title, initial, submitLabel, busy, lockId, onSubmit, onCancel }: {
  t: TranslateFn
  title: string
  initial: EntryDraft
  submitLabel: string
  busy: boolean
  /** An edit keeps the stored id: it is the key the patch is applied by. */
  lockId: boolean
  onSubmit: (draft: EntryDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<EntryDraft>(initial)
  const set = <K extends keyof EntryDraft>(key: K, value: EntryDraft[K]): void =>
    setDraft(current => ({ ...current, [key]: value }))

  const idValue = draft.id.trim()
  const idInvalid = !lockId && idValue.length > 0 && !isValidEntryId(idValue)
  const port = parsePort(draft.port)
  const missing = !lockId && idValue.length === 0
  const commandMissing = draft.command.trim().length === 0
  const blocked = busy || missing || commandMissing || idInvalid || port === 'invalid'

  const invalidHint = missing || commandMissing
    ? t('fieldRequired')
    : idInvalid ? t('fieldIdInvalid') : t('fieldPortInvalid')

  return (
    <div className="hh-note" role="group" aria-label={title}>
      <div className="hh-note-body">
        <strong>{title}</strong>
        <Field label={t('fieldId')} hint={t('fieldIdHint')}>
          <input
            className="hh-input"
            value={draft.id}
            readOnly={lockId}
            disabled={busy}
            onChange={event => set('id', event.target.value)}
          />
        </Field>
        <Field label={t('fieldCommand')}>
          <input
            className="hh-input"
            value={draft.command}
            disabled={busy}
            onChange={event => set('command', event.target.value)}
          />
        </Field>
        <Field label={t('fieldArgs')} hint={t('fieldArgsHint')}>
          <textarea
            className="hh-input"
            rows={3}
            value={draft.args}
            disabled={busy}
            onChange={event => set('args', event.target.value)}
          />
        </Field>
        <Field label={t('fieldCwd')}>
          <input
            className="hh-input"
            value={draft.cwd}
            disabled={busy}
            onChange={event => set('cwd', event.target.value)}
          />
        </Field>
        <Field label={t('fieldLabel')}>
          <input
            className="hh-input"
            value={draft.label}
            disabled={busy}
            onChange={event => set('label', event.target.value)}
          />
        </Field>
        <Field label={t('fieldPort')} hint={t('fieldPortHint')}>
          <input
            className="hh-input"
            type="number"
            value={draft.port}
            placeholder="—"
            disabled={busy}
            onChange={event => set('port', event.target.value)}
          />
        </Field>
        <Field label={t('fieldAutostart')}>
          <Select
            value={draft.autostart}
            label={t('fieldAutostart')}
            disabled={busy}
            options={[
              { value: 'inherit', label: t('fieldInherit') },
              { value: 'on', label: t('yes') },
              { value: 'off', label: t('no') },
            ]}
            onChange={value => set('autostart', value as TriState)}
          />
        </Field>
        <Field label={t('fieldOnPortConflict')}>
          <Select
            value={draft.onPortConflict}
            label={t('fieldOnPortConflict')}
            disabled={busy}
            options={[
              { value: '', label: t('fieldInherit') },
              ...ON_PORT_CONFLICT_POLICIES.map(policy => ({ value: policy, label: policy })),
            ]}
            onChange={value => set('onPortConflict', value as EntryDraft['onPortConflict'])}
          />
        </Field>
        <Hint>{t('serversEditorHint')}</Hint>
        {blocked && !busy ? <Hint>{invalidHint}</Hint> : null}
        <div className="hh-btn-row">
          <Button
            variant="primary"
            busy={busy}
            disabled={blocked}
            onClick={() => onSubmit(draft)}
          >
            {submitLabel}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {t('confirmCancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}
