import { useState } from 'react'
import type { CSSProperties } from 'react'
import { rpc } from './api.js'
import { copyText } from './clipboard.js'
import { CLI_SOURCE_KEYS, dash, effectiveCandidates, formatCandidate } from './format.js'
import type { SectionProps } from './props.js'
import { Button, Hint, Radio, Row, Section } from './ui.js'

const box: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 10,
  borderRadius: 6,
  border: '1px solid var(--dsw-alias-border-secondary, rgba(128, 128, 128, 0.25))',
}

const commandsBox: CSSProperties = {
  width: '100%',
  minHeight: 48,
  padding: 8,
  borderRadius: 6,
  border: '1px solid var(--dsw-alias-border-secondary, rgba(128, 128, 128, 0.25))',
  background: 'transparent',
  color: 'inherit',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  resize: 'vertical',
}

const actions: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }

const output: CSSProperties = {
  maxHeight: 180,
  margin: '6px 0 0',
  padding: 8,
  overflow: 'auto',
  borderRadius: 6,
  border: '1px solid var(--dsw-alias-border-secondary, rgba(128, 128, 128, 0.25))',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  whiteSpace: 'pre-wrap',
}

export function OptionsSection({ t, status, run, updateSettings, busy }: SectionProps) {
  const cli = status.cli
  const [copied, setCopied] = useState(false)
  const [installOutput, setInstallOutput] = useState<string | null>(null)

  if (cli === undefined) {
    return (
      <Section title={t('optionsTitle')} description={t('optionsDesc')}>
        <Hint>{t('optionsCliUnavailable')}</Hint>
      </Section>
    )
  }

  const preferred = cli.prefer ?? status.settings.cli?.prefer ?? 'pinned'
  const { dependency, global } = effectiveCandidates(cli)
  const commands = [
    `pnpm add -g home-hosted@${cli.expectedRange}`,
    `npm install -g home-hosted@${cli.expectedRange}`,
  ]
  const choosing = busy === 'settings'

  const copy = async (): Promise<void> => {
    setCopied(await copyText(commands.join('\n')))
  }

  const install = async (): Promise<void> => {
    const envelope = await run('cli.installGlobal', () => rpc('cli.installGlobal', {}))
    if (!envelope.ok) return
    const value = envelope.value as { output?: string } | null
    setInstallOutput(typeof value?.output === 'string' ? value.output : null)
  }

  const choose = (prefer: 'pinned' | 'global'): void => {
    updateSettings(current => ({ ...current, cli: { ...current.cli, prefer } }))
  }

  return (
    <Section title={t('optionsTitle')} description={t('optionsDesc')}>
      <Row label={t('optionsCurrent')}>{t(CLI_SOURCE_KEYS[cli.source] ?? 'cliSourceNone')}</Row>
      <Row label={t('optionsVersion')}>{dash(cli.version)}</Row>
      <Row label={t('optionsPath')}>{dash(cli.path)}</Row>
      <Hint>{cli.detail}</Hint>
      {cli.source === 'config' ? <Hint>{t('optionsConfigOverride')}</Hint> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Radio
          label={t('optionsPreferPinned')}
          description={dependency === null ? t('optionsNotResolved') : formatCandidate(dependency)}
          checked={preferred === 'pinned'}
          disabled={dependency === null || choosing}
          onChange={() => choose('pinned')}
        />
        <Radio
          label={t('optionsPreferGlobal')}
          description={global === null ? t('optionsNotResolved') : formatCandidate(global)}
          checked={preferred === 'global'}
          disabled={global === null || choosing}
          onChange={() => choose('global')}
        />
      </div>
      <Hint>{t('optionsPreferHint')}</Hint>

      {global === null
        ? (
            <div style={box}>
              <Hint>{t('optionsInstallHint')}</Hint>
              <textarea readOnly value={commands.join('\n')} rows={2} style={commandsBox} />
              <div style={actions}>
                <Button onClick={() => { void copy() }}>{copied ? t('copied') : t('copy')}</Button>
                <Button busy={busy === 'cli.installGlobal'} onClick={() => { void install() }}>
                  {t('optionsInstall')}
                </Button>
                <Button
                  busy={busy === 'status.refresh'}
                  onClick={() => { void run('status.refresh', () => rpc('status', { refresh: true })) }}
                >
                  {t('refresh')}
                </Button>
              </div>
              {installOutput === null
                ? null
                : (
                    <details>
                      <summary style={{ fontSize: 12, cursor: 'pointer' }}>{t('optionsOutput')}</summary>
                      <pre style={output}>{installOutput}</pre>
                    </details>
                  )}
            </div>
          )
        : null}
    </Section>
  )
}
