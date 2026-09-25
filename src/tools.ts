/**
 * Agent tools, off by default and allowlisted by name.
 *
 * The list is read at registration time and re-read whenever the settings file
 * changes, so toggling a tool takes effect without a restart. Every tool that
 * changes something asks the approval service first and fails closed when it is
 * absent or refuses.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { AgentToolName, RpcEndpoint } from './shared/contracts.js'
import { MUTATING_AGENT_TOOLS } from './shared/contracts.js'
import type { HomeHostedService } from './service.js'
import type { SettingsStore } from './settings.js'

interface ApprovalLike {
  request: (request: { agent: unknown, toolName: string, reason?: string }) => Promise<string>
}

interface ToolSpec {
  endpoint: RpcEndpoint
  description: string
  parameters: ParameterSchemaSpec
}

const TOOL_SPECS: Record<AgentToolName, ToolSpec> = {
  status: {
    endpoint: 'status',
    description: 'Report the home-hosted panel state, its boot-autostart entry, and the entries this plugin manages.',
    parameters: {},
  },
  servers_list: {
    endpoint: 'servers.list',
    description: 'List every server home-hosted supervises, with status, pid and url.',
    parameters: {},
  },
  servers_start: {
    endpoint: 'servers.start',
    description: 'Start a server supervised by home-hosted.',
    parameters: { id: { type: 'string', required: true, description: 'Server entry id' } },
  },
  servers_stop: {
    endpoint: 'servers.stop',
    description: 'Stop a server supervised by home-hosted.',
    parameters: { id: { type: 'string', required: true, description: 'Server entry id' } },
  },
  servers_restart: {
    endpoint: 'servers.restart',
    description: 'Restart a server supervised by home-hosted. Restarting the entry this session runs as will end the session.',
    parameters: { id: { type: 'string', required: true, description: 'Server entry id' } },
  },
  servers_create: {
    endpoint: 'servers.create',
    description: 'Add a server entry to home-hosted. The entry runs a command on this machine under the panel\'s supervision.',
    parameters: { entry: { type: 'json', required: true, description: 'A full home-hosted server entry, including its id and command' } },
  },
  servers_update: {
    endpoint: 'servers.update',
    description: 'Change fields of an existing home-hosted server entry.',
    parameters: {
      id: { type: 'string', required: true, description: 'Server entry id' },
      patch: { type: 'json', required: true, description: 'Fields to change' },
    },
  },
  servers_delete: {
    endpoint: 'servers.delete',
    description: 'Stop and remove a home-hosted server entry. Refused for the entry this session runs as.',
    parameters: { id: { type: 'string', required: true, description: 'Server entry id' } },
  },
  autostart_install: {
    endpoint: 'boot.install',
    description: 'Install the OS entry that starts home-hosted at boot or login.',
    parameters: { mechanism: { type: 'string', description: 'Explicit mechanism, e.g. systemd-user; omit to pick the best available one' } },
  },
  autostart_uninstall: {
    endpoint: 'boot.uninstall',
    description: 'Remove the OS entry that starts home-hosted at boot or login.',
    parameters: { mechanism: { type: 'string', description: 'Explicit mechanism; omit to use the installed one' } },
  },
}

export function toolNameFor(name: AgentToolName): string {
  return `home_hosted_${name}`
}

function registerOne(ctx: Context, service: HomeHostedService, name: AgentToolName): () => void {
  const spec = TOOL_SPECS[name]
  const toolName = toolNameFor(name)
  const mutating = MUTATING_AGENT_TOOLS.includes(name)

  return ctx.tools.register(defineTool({
    name: toolName,
    description: spec.description,
    parameters: spec.parameters,
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const input = (args ?? {}) as Record<string, unknown>

      if (mutating) {
        const approval = ctx.get('approval') as ApprovalLike | undefined
        if (approval?.request === undefined)
          return 'refused: this deployment has no approval service, so a mutating home-hosted tool cannot run.'
        const outcome = await approval.request({
          agent: (exec as { agent?: unknown } | undefined)?.agent,
          toolName,
          reason: `${spec.description} (${JSON.stringify(input)})`,
        })
        if (outcome !== 'allowed-once')
          return `refused: approval answered "${outcome}".`
      }

      try {
        const payload = name === 'servers_create'
          ? { entry: input.entry }
          : name === 'servers_update'
            ? { id: input.id, patch: input.patch }
            : name === 'status' || name === 'servers_list'
              ? {}
              : { id: input.id, mechanism: input.mechanism }
        const value = await service.call(spec.endpoint, payload)
        return JSON.stringify(value, null, 2)
      }
      catch (error) {
        return `failed: ${error instanceof Error ? error.message : String(error)}`
      }
    },
  }))
}

export function registerAgentTools(ctx: Context, service: HomeHostedService, settings: SettingsStore): void {
  ctx.inject(['tools'], (scoped) => {
    const disposers: Array<() => void> = []

    const sync = (): void => {
      while (disposers.length > 0)
        disposers.pop()?.()
      const current = settings.get()
      if (!current.agentTools.enabled)
        return
      for (const name of current.agentTools.allow) {
        try {
          disposers.push(registerOne(scoped, service, name))
        }
        catch {
          // one unruly tool must not keep the rest of the allowlist off the model
        }
      }
    }

    scoped.effect(() => {
      sync()
      const off = settings.onChange(sync)
      return () => {
        off()
        while (disposers.length > 0)
          disposers.pop()?.()
      }
    }, 'dsh-home-hosted: agent tools')
  })
}
