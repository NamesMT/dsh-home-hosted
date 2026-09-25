import { AGENT_TOOL_NAMES } from '../shared/contracts.js'
import { isMutatingTool } from './format.js'
import type { SectionProps } from './props.js'
import { toggleAllowed } from './settings.js'
import { Hint, Section, Toggle } from './ui.js'

export function AgentsSection({ t, status, updateSettings }: SectionProps) {
  const agentTools = status.settings.agentTools
  const allow = agentTools.allow ?? []
  return (
    <Section title={t('agentTitle')} description={t('agentDesc')}>
      <Toggle
        label={t('agentMaster')}
        checked={agentTools.enabled}
        onChange={enabled => updateSettings(current => ({
          ...current,
          agentTools: { ...current.agentTools, enabled },
        }))}
      />
      <Hint>{t('agentApproval')}</Hint>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {AGENT_TOOL_NAMES.map(name => (
          <Toggle
            key={name}
            label={isMutatingTool(name) ? t('agentToolMutating', { name }) : name}
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
