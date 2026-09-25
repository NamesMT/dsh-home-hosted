import { useCallback, useState } from 'react'
import type { RpcError } from '../shared/contracts.js'
import { rpc, rpcSettingsUpdate, useStatus } from './api.js'
import type { TranslateFn } from './context.js'
import { resolveTranslator } from './locales.js'
import type { Runner, SectionProps, SettingsUpdater } from './props.js'
import { AgentsSection } from './section-agents.js'
import { BootSection } from './section-boot.js'
import { EntriesSection } from './section-entries.js'
import { PanelSection } from './section-panel.js'
import { ServersSection } from './section-servers.js'
import { diffSettings } from './settings.js'
import { Button, ErrorNote, Hint } from './ui.js'

export interface HomeHostedPageProps {
  /** The registration's injected translator; the framework seat is only a fallback. */
  t?: TranslateFn
  /** Settings shell's close affordance. */
  close?: () => void
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
    void (async () => {
      try {
        const envelope = await call()
        if (!envelope.ok) setActionError(envelope.error)
      }
      catch (caught) {
        setActionError({
          code: 'client',
          message: caught instanceof Error ? caught.message : String(caught),
        })
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
    run('settings', () => rpcSettingsUpdate(patch))
  }, [data, run])

  if (data === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading
          ? <Hint>{t('loading')}</Hint>
          : <ErrorNote error={error ?? { code: 'status', message: t('statusUnavailable') }} title={t('errorTitle')} />}
        {loading ? null : <div><Button onClick={() => { void refresh() }}>{t('retry')}</Button></div>}
      </div>
    )
  }

  const sectionProps: SectionProps = { t, status: data, run, updateSettings, busy }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{t('tab')}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--dsw-alias-label-secondary, #8b8b8b)' }}>
            {t('pageDesc')}
          </p>
        </div>
        <Button
          busy={busy === 'status.refresh'}
          onClick={() => run('status.refresh', () => rpc('status', { refresh: true }))}
        >
          {t('refresh')}
        </Button>
      </header>
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
