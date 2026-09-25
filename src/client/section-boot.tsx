import { useState } from 'react'
import type { BootMechanism } from '../shared/contracts.js'
import { rpc } from './api.js'
import { BOOT_STATE_KEYS, dash } from './format.js'
import type { SectionProps } from './props.js'
import { Button, Hint, Row, Section, Select, Toggle } from './ui.js'

const commandsBox = {
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
  resize: 'vertical' as const,
}

export function BootSection({ t, status, run, updateSettings, busy }: SectionProps) {
  const boot = status.boot
  const settings = status.settings.autostart
  const candidates = boot.candidates ?? []
  const commands = boot.commands ?? []
  const [copied, setCopied] = useState(false)
  const running = busy === 'settings'

  const mechanisms: Array<'auto' | BootMechanism> = [
    'auto',
    ...candidates.filter(candidate => candidate.available).map(candidate => candidate.mechanism),
  ]
  if (!mechanisms.includes(settings.mechanism)) mechanisms.push(settings.mechanism)
  const options = mechanisms.map(mechanism => ({
    value: mechanism,
    label: mechanism === 'auto' ? t('bootMechanismAuto') : mechanism,
  }))

  const copy = async (): Promise<void> => {
    const text = commands.join('\n')
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        return
      }
    }
    catch {
      // Clipboard blocked; leave the box selected-by-hand instead.
    }
    setCopied(false)
  }

  return (
    <Section title={t('bootTitle')} description={t('bootDesc')}>
      <Toggle
        label={t('bootEnabled')}
        checked={settings.enabled}
        disabled={running}
        onChange={enabled => updateSettings(current => ({
          ...current,
          autostart: { ...current.autostart, enabled },
        }))}
      />
      <Row label={t('bootMechanism')}>
        <Select
          value={settings.mechanism}
          options={options}
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
      <Hint>{boot.detail}</Hint>
      {commands.length > 0
        ? (
            <div>
              <Hint>{t('bootCommandsExplain')}</Hint>
              <textarea readOnly value={commands.join('\n')} rows={Math.min(commands.length, 6)} style={commandsBox} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <Button onClick={() => { void copy() }}>{copied ? t('copied') : t('copy')}</Button>
              </div>
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
