/**
 * Agent tools, on by default and allowlisted by name.
 *
 * The list is read at registration time and re-read whenever the settings file
 * changes, so toggling a tool takes effect without a restart. A tool that
 * changes something asks the approval service only when the calling session is
 * not already `danger-full-access` — the session has then granted exactly what
 * the tool would be asking about, and asking anyway is what makes a
 * Full-access run fail against an auto-rejecting approval channel.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { AgentToolName, RpcEndpoint, UiAction } from './shared/contracts.js'
import { MUTATING_AGENT_TOOLS } from './shared/contracts.js'
import type { HomeHostedService } from './service.js'
import type { SettingsStore } from './settings.js'

interface ApprovalLike {
  request: (request: { agent: unknown, toolName: string, reason?: string }) => Promise<string>
}

interface SandboxPolicyLike {
  resolve?: (input: { session?: unknown }) => { mode?: string } | undefined
}

/** The calling session's file-sandbox mode, or null when nothing can report it. */
function sandboxMode(ctx: Context, exec: unknown): string | null {
  const policy = ctx.get('sandboxPolicy') as SandboxPolicyLike | undefined
  if (policy?.resolve === undefined)
    return null
  const session = (exec as { agent?: { session?: unknown } } | undefined)?.agent?.session
  try {
    return policy.resolve({ ...(session === undefined ? {} : { session }) })?.mode ?? null
  }
  catch {
    return null
  }
}

type Input = Record<string, unknown>

function stringArg(input: Input, key: string): string | null {
  const value = input[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function jsonArg(input: Input, key: string): Record<string, unknown> | null {
  const value = input[key]
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

interface ToolSpec {
  description: string
  parameters: ParameterSchemaSpec
  /** The endpoint call this tool performs, after its own argument handling. */
  run: (input: Input) => { endpoint: RpcEndpoint, payload: unknown }
}

const TOOL_SPECS: Record<AgentToolName, ToolSpec> = {
  status: {
    description: 'Report the home-hosted panel state, its boot-autostart entry, and the entries this plugin manages.',
    parameters: {},
    run: () => ({ endpoint: 'status', payload: {} }),
  },
  servers_list: {
    description: 'List every server home-hosted supervises, with status, pid and url.',
    parameters: {},
    run: () => ({ endpoint: 'servers.list', payload: {} }),
  },
  servers_lifecycle: {
    description: 'Start, stop or restart a server supervised by home-hosted. Restarting the entry this session runs as ends the session.',
    parameters: {
      action: { type: 'string', required: true, description: 'start, stop or restart' },
      id: { type: 'string', required: true, description: 'Server entry id' },
    },
    run: (input) => {
      const action = stringArg(input, 'action')
      if (action !== 'start' && action !== 'stop' && action !== 'restart')
        throw new Error('action must be start, stop or restart')
      const id = stringArg(input, 'id')
      if (id === null)
        throw new Error('id is required')
      return { endpoint: `servers.${action}` as RpcEndpoint, payload: { id } }
    },
  },
  servers_edit: {
    description: 'Create, update or delete a home-hosted server entry. Delete is refused for the entry this session runs as.',
    parameters: {
      action: { type: 'string', required: true, description: 'create, update or delete' },
      id: { type: 'string', description: 'Server entry id (update, delete)' },
      entry: { type: 'json', description: 'A full home-hosted server entry, including its id and command (create)' },
      patch: { type: 'json', description: 'Fields to change (update)' },
    },
    run: (input) => {
      const action = stringArg(input, 'action')
      if (action === 'create') {
        const entry = jsonArg(input, 'entry')
        if (entry === null)
          throw new Error('entry is required to create a server')
        return { endpoint: 'servers.create', payload: { entry } }
      }
      if (action === 'update') {
        const id = stringArg(input, 'id')
        const patch = jsonArg(input, 'patch')
        if (id === null || patch === null)
          throw new Error('id and patch are required to update a server')
        return { endpoint: 'servers.update', payload: { id, patch } }
      }
      if (action === 'delete') {
        const id = stringArg(input, 'id')
        if (id === null)
          throw new Error('id is required to delete a server')
        return { endpoint: 'servers.delete', payload: { id } }
      }
      throw new Error('action must be create, update or delete')
    },
  },
  autostart_manage: {
    description: 'Install or remove the OS entry that starts home-hosted at boot or login.',
    parameters: {
      action: { type: 'string', required: true, description: 'install or uninstall' },
      mechanism: { type: 'string', description: 'Explicit mechanism, e.g. launchd-daemon or systemd-system; omit to use the plugin setting' },
    },
    run: (input) => {
      const action = stringArg(input, 'action')
      if (action !== 'install' && action !== 'uninstall')
        throw new Error('action must be install or uninstall')
      const mechanism = stringArg(input, 'mechanism')
      return { endpoint: `boot.${action}` as RpcEndpoint, payload: mechanism === null ? {} : { mechanism } }
    },
  },
  ui_manage: {
    description: 'Inspect or change the home-hosted panel\'s own web UI: status, update, revert to stock, or switch to a local zip.',
    parameters: {
      action: { type: 'string', required: true, description: 'status, update, revert or switch' },
      file: { type: 'string', description: 'Absolute path to a UI zip (switch)' },
    },
    run: (input) => {
      const action = stringArg(input, 'action')
      if (action !== 'status' && action !== 'update' && action !== 'revert' && action !== 'switch')
        throw new Error('action must be status, update, revert or switch')
      const file = stringArg(input, 'file')
      return { endpoint: 'ui.manage', payload: { action: action as UiAction, ...(file === null ? {} : { file }) } }
    },
  },
}

export function toolNameFor(name: AgentToolName): string {
  return `home_hosted_${name}`
}

/**
 * Actions of an otherwise mutating tool that only read. `ui_manage` carries both,
 * and a status call must not be blocked (or prompted for) as if it changed the UI.
 */
const READ_ONLY_ACTIONS: Partial<Record<AgentToolName, (input: Input) => boolean>> = {
  ui_manage: input => stringArg(input, 'action') === 'status',
}

function registerOne(ctx: Context, service: HomeHostedService, name: AgentToolName): () => void {
  const spec = TOOL_SPECS[name]
  const toolName = toolNameFor(name)
  const mutatingTool = MUTATING_AGENT_TOOLS.includes(name)

  return ctx.tools.register(defineTool({
    name: toolName,
    description: spec.description,
    parameters: spec.parameters,
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const input = (args ?? {}) as Input
      const mode = sandboxMode(ctx, exec)
      // Fail closed: only a positively identified read-only action skips the gate,
      // and an unknown action still asks.
      const mutating = mutatingTool && !(READ_ONLY_ACTIONS[name]?.(input) ?? false)
      if (mutating && mode !== 'danger-full-access') {
        const remedy = 'Set the session to Full access (danger-full-access), or use a session where approvals can be answered.'
        const approval = ctx.get('approval') as ApprovalLike | undefined
        if (approval?.request === undefined)
          return `refused: this session runs in ${mode ?? 'an unknown'} sandbox and the deployment has no approval service. ${remedy}`
        const outcome = await approval.request({
          agent: (exec as { agent?: unknown } | undefined)?.agent,
          toolName,
          reason: `${spec.description} (${JSON.stringify(input)})`,
        })
        if (outcome !== 'allowed-once')
          return `refused: approval answered "${outcome}" (session sandbox: ${mode ?? 'unknown'}). ${remedy}`
      }

      try {
        const { endpoint, payload } = spec.run(input)
        return JSON.stringify(await service.call(endpoint, payload), null, 2)
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
