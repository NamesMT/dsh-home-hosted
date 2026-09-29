import { useState } from 'react'
import type { BootMechanism, Envelope } from '../shared/contracts.js'
import { rpc } from './api.js'
import type { FreshBootAttempt } from './boot.js'
import { bootAttemptView, bootMechanisms, bootRefusal, isSwitchingMechanism, visibleBootAttempt } from './boot.js'
import { BOOT_STATE_KEYS, dash } from './format.js'
import { IconPower } from './icons.js'
import type { SectionProps } from './props.js'
import { Button, Code, CommandBox, Details, FailureNote, Hint, Note, Section, Select, Spec } from './ui.js'

export function BootSection({ t, status, run, updateSettings, busy, uiStyle }: SectionProps) {
  const boot = status.boot
  const autostart = status.settings.autostart
  const candidates = boot.candidates ?? []
  const commands = boot.commands ?? []
  const [freshFailure, setFreshFailure] = useState<FreshBootAttempt | null>(null)
  const installing = busy === 'boot.install' || busy === 'boot.uninstall'

  // `unsupported` is only worth offering when it is the only thing on this platform.
  const mechanisms = bootMechanisms(candidates, autostart.mechanism)
  const mechanismOptions = mechanisms.map(mechanism => ({
    value: mechanism,
    label: mechanism === 'auto' ? t('bootMechanismAuto') : mechanism,
  }))

  const switching = isSwitchingMechanism(boot.mechanism, autostart.mechanism)
  const installed = boot.mechanism !== null

  const actionLabel = (action: 'install' | 'uninstall'): string =>
    t(action === 'install' ? 'bootActionInstall' : 'bootActionUninstall')

  const attempt = async (action: 'install' | 'uninstall'): Promise<void> => {
    const envelope = await run(`boot.${action}`, async (): Promise<Envelope<unknown>> => action === 'install'
      ? rpc('boot.install', autostart.mechanism === 'auto' ? {} : { mechanism: autostart.mechanism })
      : rpc('boot.uninstall', {}))
    if (!envelope.ok) {
      setFreshFailure(null)
      return
    }
    const refusal = bootRefusal(envelope.value)
    setFreshFailure(refusal === null
      ? null
      : { ok: false, action, detail: refusal.detail, commands: refusal.commands, state: boot.state, mechanism: boot.mechanism })
  }

  // A persisted failure the live state contradicts is history, not news; a fresh
  // one stops being news as soon as that state moves.
  const persisted = bootAttemptView(autostart.lastAttempt)
  const shown = visibleBootAttempt(freshFailure, persisted, boot.state, boot.mechanism)

  return (
    <Section
      icon={<IconPower />}
      title={t('bootTitle')}
      action={(
        <Select
          value={autostart.mechanism}
          options={mechanismOptions}
          label={t('bootMechanism')}
          disabled={busy === 'settings' || installing}
          onChange={mechanism => updateSettings(current => ({
            ...current,
            autostart: { ...current.autostart, mechanism: mechanism as 'auto' | BootMechanism },
          }))}
        />
      )}
    >
      <div className="hh-btn-row">
        <Button
          variant={installed ? 'default' : 'primary'}
          disabled={autostart.mechanism === 'unsupported'}
          busy={busy === 'boot.install'}
          onClick={() => { void attempt('install') }}
        >
          {switching ? t('bootSwitchMode') : t('bootEnabled')}
        </Button>
        <Button
          disabled={!installed}
          busy={busy === 'boot.uninstall'}
          onClick={() => { void attempt('uninstall') }}
        >
          {t('bootUninstall')}
        </Button>
        <Button
          variant="ghost"
          busy={busy === 'boot.verify'}
          onClick={() => { void run('boot.verify', () => rpc('boot.verify', {})) }}
        >
          {t('bootRecheck')}
        </Button>
      </div>

      {autostart.enabled && boot.state === 'not-installed'
        ? <Note tone="warn">{t('bootRequestedNotInstalled')}</Note>
        : null}

      {shown !== null && !shown.ok
        ? (
            <div className="hh-section-body">
              <FailureNote
                title={t('bootAttemptFailed', { action: actionLabel(shown.action) })}
                detail={shown.detail.length > 0 ? shown.detail : t('bootAttemptNoDetail')}
              />
              {shown.commands.length > 0
                ? (
                    <>
                      <Hint>{t('bootAttemptCommands')}</Hint>
                      <CommandBox
                        text={shown.commands.join('\n')}
                        copyLabel={t('copy')}
                        copiedLabel={t('copied')}
                      />
                    </>
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
            <Details label={t('bootCommandsLabel')} open={uiStyle === 'detailed'}>
              <Hint>{t('bootCommandsExplain')}</Hint>
              <CommandBox text={commands.join('\n')} copyLabel={t('copy')} copiedLabel={t('copied')} />
            </Details>
          )
        : null}

      <Details label={t('details')} open={uiStyle === 'detailed'}>
        <Spec label={t('bootState')}>{t(BOOT_STATE_KEYS[boot.state] ?? 'bootStateUnsupported')}</Spec>
        <Spec label={t('bootBootCapable')}>{boot.bootCapable ? t('yes') : t('no')}</Spec>
        <Spec label={t('bootPrivileged')}>{boot.privileged ? t('yes') : t('no')}</Spec>
        <Spec label={t('bootUnitPath')}><Code>{dash(boot.unitPath)}</Code></Spec>
        {boot.detail.length > 0 ? <Hint>{boot.detail}</Hint> : null}
      </Details>
    </Section>
  )
}
