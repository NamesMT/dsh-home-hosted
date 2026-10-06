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

  // The option values *are* internal names (`systemd-system`, `xdg-autostart`), because
  // that is what the setting stores and what the host reports back. The host already
  // computes a sentence explaining each one — "systemd is the init system here", "a
  // LaunchAgent loads at login, not at boot", "this needs root here, so the plugin stages
  // the plist and shows the sudo commands" — and the page was dropping it, so a person (and
  // a model reading the rendered page) had to know what the identifier meant.
  //
  // One lookup serves both places the name appears: the hint under the picker, and the
  // `Details` block, which describes the mechanism that is actually *installed* — a
  // different one while a switch is pending, and previously unnamed there entirely.
  const reasonFor = (mechanism: string): string | null =>
    candidates.find(candidate => candidate.mechanism === mechanism)?.reason ?? null
  /**
   * `auto` is not a mechanism, it is "let the host decide" — and the host decides with
   * `recommend()`, whose answer it already sends as `BootStatus.recommended` and which
   * `install()` resolves to when nothing is installed (`pickOf(mechanism ?? before.mechanism
   * ?? before.recommended)`). So the page can name the mechanism Automatic will install
   * instead of leaving a person to install it and read the result. It is only the *next*
   * install this predicts, which is why the wording stays a prediction.
   */
  // `!== boot.mechanism` also covers an older payload that omits the key entirely: a
  // response field is optional and read defensively here (the page is bundled separately
  // from the host, so a new page can meet a panel that never sent `recommended`). Reading
  // it as a plain string is what produced the literal "would use undefined" when that
  // field was absent, which is why the check is on the value being a non-empty string.
  const autoTarget = typeof boot.recommended === 'string'
    && boot.recommended.length > 0
    && boot.recommended !== boot.mechanism
    ? boot.recommended
    : null
  const autoNote = autoTarget === null
    ? t('bootMechanismAutoHint')
    : `${t('bootMechanismAutoHint')} ${t('bootMechanismAutoPicks', { mechanism: autoTarget })}`
  const mechanismNote = autostart.mechanism === 'auto'
    ? autoNote
    : reasonFor(autostart.mechanism)
  const installedNote = boot.mechanism === null ? null : reasonFor(boot.mechanism)
  const installed = boot.mechanism !== null

  // Enabling an entry that does not start anything proves nothing, so the host
  // hands the running panel to it; the page says so before the button is pressed,
  // because that stop takes this session's connection with it.
  const handover = status.panel.reachable && !switching && !installed
  const switchWarning = status.panel.reachable && switching

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
      {mechanismNote !== null && mechanismNote.length > 0 ? <Hint>{mechanismNote}</Hint> : null}
      {handover ? <Hint>{t('bootHandover')}</Hint> : null}
      {switchWarning ? <Note tone="warn">{t('bootSwitchRetires')}</Note> : null}

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
        <Spec label={t('bootMechanism')}>{dash(boot.mechanism)}</Spec>
        {installedNote === null ? null : <Hint>{installedNote}</Hint>}
        {boot.detail.length > 0 ? <Hint>{boot.detail}</Hint> : null}
      </Details>
    </Section>
  )
}
