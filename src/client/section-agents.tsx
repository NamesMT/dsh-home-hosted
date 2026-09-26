import { AGENT_TOOL_NAMES } from '../shared/contracts.js'
import { AGENT_TOOL_KEYS, isMutatingTool } from './format.js'
import { IconSliders } from './icons.js'
import type { SectionProps } from './props.js'
import { toggleAllowed } from './settings.js'
import { Check, Chip, Hint, Section, Switch } from './ui.js'

export function AgentsSection({ t, status, updateSettings }: SectionProps) {
  const agentTools = status.settings.agentTools
  const allow = agentTools.allow ?? []
  const granted = AGENT_TOOL_NAMES.filter(name => allow.includes(name)).length

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
      <Hint>{t('agentApproval')}</Hint>
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
            onChange={enabled => updateSettings(current => ({
              ...current,
              agentTools: {
                ...current.agentTools,
                allow: toggleAllowed(current.agentTools.allow ?? [], name, enabled),
              },
            }))}
          />
        ))}
      </div>
    </Section>
  )
}
