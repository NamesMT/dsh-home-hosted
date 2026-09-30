import type { EntryIntent } from '../shared/contracts.js'
import { rpc } from './api.js'
import { dash, formatDrift } from './format.js'
import { IconTerminal } from './icons.js'
import type { SectionProps } from './props.js'
import { Chip, Hint, Note, Section, Switch } from './ui.js'

/**
 * The entry this page manages — the harness itself. Its id comes from the host
 * (`defaultEntryId`, an operator override); `dsh` is only the fallback for a
 * host older than that field.
 */
function managedId(status: SectionProps['status']): string {
  return status.defaultEntryId ?? 'dsh'
}

export function EntriesSection({ t, status, run, busy }: SectionProps) {
  const entries = status.entries ?? []
  const manageDsh = status.settings.manageDsh === true
  const windows = status.boot.platform === 'win32'
  const desktop = status.surface === 'desktop'
  const id = managedId(status)

  const setManage = (enabled: boolean): void => {
    if (enabled) {
      // The host fills the platform defaults for the keys this draft omits.
      const intent = { id, autostart: true } as unknown as EntryIntent
      void run('entries.apply', () => rpc('entries.apply', { intents: [intent] }))
    }
    else {
      void run('entries.remove', () => rpc('entries.remove', { id }))
    }
  }

  return (
    <Section icon={<IconTerminal />} title={t('entriesTitle')}>
      <Switch
        label={t('entriesManage', { id })}
        checked={desktop ? false : manageDsh}
        disabled={busy !== null || desktop}
        onChange={setManage}
      />
      {desktop
        ? <Note tone="warn">{t('entriesManageDesktop', { id })}</Note>
        : <Hint>{t('entriesManageNote', { id })}</Hint>}

      {windows ? <Note tone="warn">{t('entriesManageWinWarning', { id })}</Note> : null}

      {entries.length === 0
        ? <Hint>{t('entriesEmpty', { id })}</Hint>
        : (
            <div className="hh-list">
              {entries.map((entry) => {
                const live = entry.live
                return (
                  <div className="hh-item" key={entry.intent.id}>
                    <span className="hh-item-main">
                      <span className="hh-item-name">{entry.intent.id}</span>
                      <Chip tone={entry.exists ? 'ok' : 'bad'}>
                        {entry.exists ? t('entriesExists') : t('entriesMissing')}
                      </Chip>
                      <Chip>{entry.managed ? t('entriesManaged') : t('entriesUnmanaged')}</Chip>
                      {entry.drift.length > 0
                        ? <Chip tone="warn">{`${t('entriesDrift')} ${formatDrift(entry.drift)}`}</Chip>
                        : null}
                    </span>
                    <span className="hh-item-spacer" />
                    <span className="hh-item-meta">
                      {live === null
                        ? t('entriesNotRunning')
                        : `${dash(live.status)}${live.pid === null ? '' : ` · pid ${live.pid}`}`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
    </Section>
  )
}
