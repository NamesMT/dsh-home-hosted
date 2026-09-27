import { AGENT_TOOL_NAMES } from '../shared/contracts.js'
import { AGENT_TOOL_DESC_KEYS, AGENT_TOOL_KEYS, isMutatingTool } from './format.js'
import { IconSliders } from './icons.js'
import type { SectionProps } from './props.js'
import { toggleAllowed } from './settings.js'
import { Check, Chip, Hint, Section, Switch } from './ui.js'

export function AgentsSection({ t, status, updateSettings, busy, uiStyle }: SectionProps) {
  const agentTools = status.settings.agentTools
  const allow = agentTools.allow ?? []
  const granted = AGENT_TOOL_NAMES.filter(name => allow.includes(name)).length

  const toggle = (name: typeof AGENT_TOOL_NAMES[number], enabled: boolean): void => {
    updateSettings(current => ({
      ...current,
      agentTools: {
        ...current.agentTools,
        allow: toggleAllowed(current.agentTools.allow ?? [], name, enabled),
      },
    }))
  }

  return (
    <Section
      icon={<IconSliders />}
      title={t('agentTitle')}
      action={<Chip>{t('agentCount', { enabled: granted, total: AGENT_TOOL_NAMES.length })}</Chip>}
    >
      <Switch
        label={t('agentMaster')}
        checked={agentTools.enabled}
        onChange={enabled => updateSettings(current => ({
          ...current,
          agentTools: { ...current.agentTools, enabled },
        }))}
      />
      <div className="hh-field-block">
        <Switch
          label={t('reclaimAutoLabel')}
          checked={status.settings.reclaimToken !== false}
          disabled={busy === 'settings'}
          onChange={checked => updateSettings(current => ({ ...current, reclaimToken: checked }))}
        />
        <Hint>{t('reclaimAutoHint')}</Hint>
      </div>
      <Hint>{t('agentApproval')}</Hint>

      {uiStyle === 'detailed'
        ? (
            <div className="hh-tool-cards">
              {AGENT_TOOL_NAMES.map(name => (
                <label className="hh-tool-card" key={name}>
                  <input
                    type="checkbox"
                    checked={allow.includes(name)}
                    disabled={!agentTools.enabled}
                    onChange={event => toggle(name, event.target.checked)}
                  />
                  <span className="hh-tool-card-body">
                    <span className="hh-tool-card-head">
                      <span className="hh-tool-card-name">{t(AGENT_TOOL_KEYS[name])}</span>
                      {isMutatingTool(name) ? <Chip tone="warn">{t('agentApprovalBadge')}</Chip> : null}
                    </span>
                    <span className="hh-tool-card-desc">{t(AGENT_TOOL_DESC_KEYS[name])}</span>
                  </span>
                </label>
              ))}
            </div>
          )
        : (
            <div className="hh-tools">
              {AGENT_TOOL_NAMES.map(name => (
                <Check
                  key={name}
                  label={(
                    <>
                      <span className="hh-check-text">{t(AGENT_TOOL_KEYS[name])}</span>
                      {isMutatingTool(name) ? <Chip tone="warn">{t('agentApprovalBadge')}</Chip> : null}
                    </>
                  )}
                  checked={allow.includes(name)}
                  disabled={!agentTools.enabled}
                  onChange={enabled => toggle(name, enabled)}
                />
              ))}
            </div>
          )}
    </Section>
  )
}
