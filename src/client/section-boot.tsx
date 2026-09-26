import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { BootMechanism, Envelope } from '../shared/contracts.js'
import { rpc, rpcSettingsUpdate } from './api.js'
import type { BootAttemptView } from './boot.js'
import { bootAttemptView, bootRefusal } from './boot.js'
import { copyText } from './clipboard.js'
import { BOOT_STATE_KEYS, dash } from './format.js'
import type { SectionProps } from './props.js'
import { diffSettings } from './settings.js'
import { Button, FailureNote, Hint, Row, Section, Select, Toggle } from './ui.js'

const commandsBox: CSSProperties = {
  width: '100%',
  minHeight: 60,
  marginTop: 6,
  padding: 8,
  borderRadius: 6,
  border: '1px solid var(--dsw-alias-border-secondary, rgba(128, 128, 128, 0.25))',
  background: 'transparent',
  color: 'inherit',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  resize: 'vertical',
}

/** Read-only command box with its own copy button. */
function CommandBox({ text, copyLabel, copiedLabel }: {
  text: string
  copyLabel: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <textarea
        readOnly
        value={text}
        rows={Math.min(text.split('\n').length, 6)}
        style={commandsBox}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <Button onClick={() => { void copyText(text).then(setCopied) }}>
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
    </div>
  )
}

interface FreshFailure extends BootAttemptView {
  ok: false
}

export function BootSection({ t, status, run, updateSettings, busy }: SectionProps) {
  const boot = status.boot
  const autostart = status.settings.autostart
  const candidates = boot.candidates ?? []
  const commands = boot.commands ?? []
  const [freshFailure, setFreshFailure] = useState<FreshFailure | null>(null)
  const installing = busy === 'boot.install' || busy === 'boot.uninstall'
  const running = busy === 'settings' || installing

  const mechanisms: Array<'auto' | BootMechanism> = [
    'auto',
    ...candidates.filter(candidate => candidate.available).map(candidate => candidate.mechanism),
  ]
  if (!mechanisms.includes(autostart.mechanism)) mechanisms.push(autostart.mechanism)
  const mechanismOptions = mechanisms.map(mechanism => ({
    value: mechanism,
    label: mechanism === 'auto' ? t('bootMechanismAuto') : mechanism,
  }))

  const actionLabel = (action: 'install' | 'uninstall'): string =>
    t(action === 'install' ? 'bootActionInstall' : 'bootActionUninstall')

  const toggle = async (enabled: boolean): Promise<void> => {
    const action = enabled ? 'install' : 'uninstall'
    // Persist the intent first so the toggle answers immediately; the host
    // leaves `enabled` alone when the action itself is refused.
    const patch = diffSettings(status.settings, {
      ...status.settings,
      autostart: { ...autostart, enabled },
    })
    const envelope = await run(`boot.${action}`, async (): Promise<Envelope<unknown>> => {
      if (Object.keys(patch).length > 0) {
        const intent = await rpcSettingsUpdate(patch)
        if (!intent.ok) return intent
      }
      return enabled
        ? rpc('boot.install', autostart.mechanism === 'auto' ? {} : { mechanism: autostart.mechanism })
        : rpc('boot.uninstall', {})
    })
    if (!envelope.ok) {
      setFreshFailure(null)
      return
    }
    const refusal = bootRefusal(envelope.value)
    setFreshFailure(refusal === null ? null : { ok: false, action, detail: refusal.detail, commands: refusal.commands })
  }

  const persisted = bootAttemptView(autostart.lastAttempt)
  const shown: BootAttemptView | null = freshFailure ?? persisted

  return (
    <Section title={t('bootTitle')} description={t('bootDesc')}>
      <Toggle
        label={t('bootEnabled')}
        checked={autostart.enabled}
        disabled={installing}
        onChange={enabled => { void toggle(enabled) }}
      />
      <Row label={t('bootMechanism')}>
        <Select
          value={autostart.mechanism}
          options={mechanismOptions}
          disabled={running}
          onChange={mechanism => updateSettings(current => ({
            ...current,
            autostart: { ...current.autostart, mechanism: mechanism as 'auto' | BootMechanism },
          }))}
        />
      </Row>
      <Row label={t('bootState')}>{t(BOOT_STATE_KEYS[boot.state] ?? 'bootStateUnsupported')}</Row>
      <Row label={t('bootBootCapable')}>{boot.bootCapable ? t('yes') : t('no')}</Row>
      <Row label={t('bootPrivileged')}>{boot.privileged ? t('yes') : t('no')}</Row>
      <Row label={t('bootUnitPath')}>{dash(boot.unitPath)}</Row>
      {boot.bootCapable || boot.state === 'unsupported' ? null : <Hint>{t('bootLoginScope')}</Hint>}
      <Hint>{boot.detail}</Hint>

      {autostart.enabled && boot.state === 'not-installed'
        ? <Hint>{t('bootRequestedNotInstalled')}</Hint>
        : null}

      {shown !== null && !shown.ok
        ? (
            <div>
              <FailureNote
                title={t('bootAttemptFailed', { action: actionLabel(shown.action) })}
                detail={shown.detail.length > 0 ? shown.detail : t('bootAttemptNoDetail')}
              />
              {shown.commands.length > 0
                ? (
                    <div>
                      <Hint>{t('bootAttemptCommands')}</Hint>
                      <CommandBox
                        text={shown.commands.join('\n')}
                        copyLabel={t('copy')}
                        copiedLabel={t('copied')}
                      />
                    </div>
                  )
                : null}
            </div>
          )
        : null}

      {shown !== null && shown.ok
        ? <Hint>{t('bootAttemptSucceeded', { action: actionLabel(shown.action), detail: shown.detail })}</Hint>
        : null}

      {commands.length > 0
        ? (
            <div>
              <Hint>{t('bootCommandsExplain')}</Hint>
              <CommandBox text={commands.join('\n')} copyLabel={t('copy')} copiedLabel={t('copied')} />
            </div>
          )
        : null}
      <div>
        <Button busy={busy === 'boot.verify'} onClick={() => run('boot.verify', () => rpc('boot.verify', {}))}>
          {t('bootRecheck')}
        </Button>
      </div>
    </Section>
  )
}
