import { useCallback, useEffect, useState } from 'react'
import type { Envelope, RpcError, UiStyle } from '../shared/contracts.js'
import { rpc, rpcSettingsUpdate, useStatus } from './api.js'
import type { TranslateFn } from './context.js'
import { IconRefresh } from './icons.js'
import { resolveTranslator } from './locales.js'
import type { Runner, SectionProps, SettingsUpdater } from './props.js'
import { AgentsSection } from './section-agents.js'
import { BootSection } from './section-boot.js'
import { EntriesSection } from './section-entries.js'
import { PanelSection } from './section-panel.js'
import { ServersSection } from './section-servers.js'
import { diffSettings } from './settings.js'
import type { Signal } from './status.js'
import { statusSignals } from './status.js'
import { CSS } from './styles.js'
import { Button, ErrorNote, Hint, Link, Select } from './ui.js'

export interface HomeHostedPageProps {
  /** The registration's injected translator; the framework seat is only a fallback. */
  t?: TranslateFn
  /** Settings shell's close affordance. */
  close?: () => void
}

/** One line of the readout: a state dot, its group, its state, its machine detail. */
function SignalRow({ signal }: { signal: Signal }) {
  return (
    <div className="hh-signal" data-tone={signal.tone}>
      <span className="hh-signal-dot" aria-hidden="true" />
      <span className="hh-signal-name">{signal.name}</span>
      <span className="hh-signal-state">{signal.state}</span>
      {signal.meta.length === 0 && signal.href === null
        ? null
        : (
            <span className="hh-signal-meta">
              {signal.meta}
              {signal.href === null
                ? null
                : (
                    <>
                      {signal.meta.length === 0 ? null : ' · '}
                      <Link href={signal.href}>{signal.href}</Link>
                    </>
                  )}
            </span>
          )}
    </div>
  )
}

export function HomeHostedPage(props: HomeHostedPageProps) {
  // Wrapped: a seat without our namespace returns the raw key, which must
  // never reach the page — the bundled English copy takes over instead.
  const t = resolveTranslator(props.t)
  const { data, error, loading, refresh } = useStatus()
  const [actionError, setActionError] = useState<RpcError | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const run = useCallback<Runner>((key, call) => {
    setBusy(key)
    setActionError(null)
    return (async (): Promise<Envelope<unknown>> => {
      try {
        const envelope = await call()
        if (!envelope.ok) setActionError(envelope.error)
        return envelope
      }
      catch (caught) {
        const error: RpcError = {
          code: 'client',
          message: caught instanceof Error ? caught.message : String(caught),
        }
        setActionError(error)
        return { ok: false, error }
      }
      finally {
        setBusy(null)
        await refresh()
      }
    })()
  }, [refresh])

  const updateSettings = useCallback<SettingsUpdater>((mutate) => {
    if (data === null) return
    const patch = diffSettings(data.settings, mutate(data.settings))
    if (Object.keys(patch).length === 0) return
    void run('settings', () => rpcSettingsUpdate(patch))
  }, [data, run])

  // The style flips locally first — the host answers on its own round trip, and
  // a person should not watch a select sit still while it does.
  const hostStyle: UiStyle = data?.settings.uiStyle ?? 'detailed'
  const [uiStyle, setUiStyle] = useState<UiStyle>(hostStyle)
  useEffect(() => {
    setUiStyle(hostStyle)
  }, [hostStyle])

  const chooseStyle = (next: UiStyle): void => {
    setUiStyle(next)
    updateSettings(current => ({ ...current, uiStyle: next }))
  }

  if (data === null) {
    return (
      <div className="hh-root">
        <style>{CSS}</style>
        {loading
          ? <Hint>{t('loading')}</Hint>
          : (
              <>
                <ErrorNote
                  error={error ?? { code: 'status', message: t('statusUnavailable') }}
                  title={t('errorTitle')}
                />
                <div className="hh-btn-row">
                  <Button onClick={() => { void refresh() }}>{t('retry')}</Button>
                </div>
              </>
            )}
      </div>
    )
  }

  const sectionProps: SectionProps = { t, status: data, run, updateSettings, busy, uiStyle }

  return (
    <div className="hh-root">
      <style>{CSS}</style>
      <header className="hh-head">
        <h2 className="hh-title">{t('tab')}</h2>
        <span className="hh-head-spacer" />
        <Select
          value={uiStyle}
          label={t('uiStyleLabel')}
          disabled={busy === 'settings'}
          options={[
            { value: 'detailed', label: t('uiStyleDetailed') },
            { value: 'compact', label: t('uiStyleCompact') },
          ]}
          onChange={value => chooseStyle(value as UiStyle)}
        />
        <Button
          variant="ghost"
          icon={<IconRefresh size={13} />}
          busy={busy === 'status.refresh'}
          onClick={() => { void run('status.refresh', () => rpc('status', { refresh: true })) }}
        >
          {t('refresh')}
        </Button>
      </header>
      <div className="hh-signals" data-busy={busy !== null}>
        {statusSignals(data, t).map(signal => <SignalRow key={signal.key} signal={signal} />)}
      </div>
      {data.lastError === null
        ? null
        : <ErrorNote error={{ code: 'panel', message: data.lastError }} title={t('errorTitle')} />}
      <ErrorNote error={error} title={t('errorTitle')} />
      <ErrorNote error={actionError} title={t('errorTitle')} />
      <PanelSection {...sectionProps} />
      <BootSection {...sectionProps} />
      <EntriesSection {...sectionProps} />
      <AgentsSection {...sectionProps} />
      <ServersSection {...sectionProps} />
    </div>
  )
}
