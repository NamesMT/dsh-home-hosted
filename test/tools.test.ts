import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { AgentToolName, RpcEndpoint } from '../src/shared/contracts.js'
import type { HomeHostedService } from '../src/service.js'
import { SettingsStore } from '../src/settings.js'
import { registerAgentTools, toolNameFor } from '../src/tools.js'
import { tempDir } from './helpers/temp.js'

interface RegisteredTool {
  name: string
  execute: (args: unknown, exec?: unknown) => Promise<string>
}

interface Harness {
  tools: RegisteredTool[]
  calls: Array<{ endpoint: RpcEndpoint, payload: unknown }>
  approvals: Array<{ toolName: string, reason?: string }>
  settings: SettingsStore
  /** Flip settings and let the store's listener re-register. */
  update: (patch: Parameters<SettingsStore['update']>[0]) => void
  registeredNames: () => string[]
}

function harness(options: { approval?: (toolName: string) => string, allow?: AgentToolName[], enabled?: boolean } = {}): Harness {
  const scratch = tempDir()
  const settings = new SettingsStore(`${scratch.path}/settings.json`, 'dsh')
  settings.update({ agentTools: { enabled: options.enabled ?? true, allow: options.allow ?? ['status', 'servers_list'] } })

  const tools: RegisteredTool[] = []
  const calls: Harness['calls'] = []
  const approvals: Harness['approvals'] = []

  const scoped = {
    tools: {
      register(definition: RegisteredTool) {
        tools.push(definition)
        return () => {
          const index = tools.indexOf(definition)
          if (index >= 0)
            tools.splice(index, 1)
        }
      },
    },
    get(name: string) {
      if (name !== 'approval')
        return undefined
      if (options.approval === undefined)
        return undefined
      return {
        request: async (request: { toolName: string, reason?: string }) => {
          approvals.push({ toolName: request.toolName, reason: request.reason })
          return options.approval!(request.toolName)
        },
      }
    },
    effect(body: () => unknown) {
      body()
    },
  }

  const ctx = {
    inject(_deps: string[], callback: (scopedContext: unknown) => void) {
      callback(scoped)
    },
  }

  const service = {
    call: async (endpoint: RpcEndpoint, payload: unknown) => {
      calls.push({ endpoint, payload })
      return { endpoint, payload }
    },
  }

  registerAgentTools(ctx as unknown as Context, service as unknown as HomeHostedService, settings)

  return {
    tools,
    calls,
    approvals,
    settings,
    update: patch => settings.update(patch),
    registeredNames: () => tools.map(tool => tool.name),
  }
}

describe('agent tools', () => {
  it('registers nothing while the feature is off', () => {
    const h = harness({ enabled: false })
    expect(h.tools).toHaveLength(0)
  })

  it('registers exactly the allowlisted tools and follows later changes', () => {
    const h = harness({ allow: ['status', 'servers_list'] })
    expect(h.registeredNames()).toEqual(['home_hosted_status', 'home_hosted_servers_list'])

    h.update({ agentTools: { enabled: true, allow: ['servers_start'] } })
    expect(h.registeredNames()).toEqual(['home_hosted_servers_start'])

    h.update({ agentTools: { enabled: false, allow: ['servers_start'] } })
    expect(h.registeredNames()).toEqual([])
  })

  it('answers a read-only tool without asking for approval', async () => {
    const h = harness({ allow: ['status'] })
    const tool = h.tools.find(candidate => candidate.name === toolNameFor('status'))!
    const answer = await tool.execute({}, { agent: 'agent-1' })
    expect(h.approvals).toHaveLength(0)
    expect(h.calls[0]?.endpoint).toBe('status')
    expect(answer).toContain('"endpoint": "status"')
  })

  it('fails closed when the deployment has no approval service', async () => {
    const h = harness({ allow: ['servers_start'] })
    const tool = h.tools[0]!
    const answer = await tool.execute({ id: 'other' }, { agent: 'agent-1' })
    expect(answer).toContain('refused')
    expect(h.calls).toHaveLength(0)
  })

  it('refuses when approval rejects or cancels', async () => {
    for (const outcome of ['rejected', 'cancelled', 'unavailable']) {
      const h = harness({ allow: ['servers_delete'], approval: () => outcome })
      const tool = h.tools[0]!
      const answer = await tool.execute({ id: 'other' }, { agent: 'agent-1' })
      expect(answer).toBe(`refused: approval answered "${outcome}".`)
      expect(h.calls).toHaveLength(0)
    }
  })

  it('runs a mutating tool once approval allows it, and passes the exact payload', async () => {
    const h = harness({ allow: ['servers_update'], approval: () => 'allowed-once' })
    const tool = h.tools[0]!
    const answer = await tool.execute({ id: 'dsh', patch: { autostart: false } }, { agent: 'agent-1' })
    expect(h.approvals).toHaveLength(1)
    expect(h.approvals[0]?.toolName).toBe('home_hosted_servers_update')
    expect(h.approvals[0]?.reason).toContain('"id":"dsh"')
    expect(h.calls[0]).toEqual({ endpoint: 'servers.update', payload: { id: 'dsh', patch: { autostart: false } } })
    expect(answer).toContain('servers.update')
  })

  it('reports a failed call as a tool result instead of throwing', async () => {
    const h = harness({ allow: ['servers_start'], approval: () => 'allowed-once' })
    const failing = {
      call: async () => {
        throw new Error('panel unavailable')
      },
    }
    const scratch = tempDir()
    const settings = new SettingsStore(`${scratch.path}/settings.json`, 'dsh')
    settings.update({ agentTools: { enabled: true, allow: ['servers_start'] } })
    const tools: RegisteredTool[] = []
    const scoped = {
      tools: { register: (definition: RegisteredTool) => { tools.push(definition); return () => {} } },
      get: () => ({ request: async () => 'allowed-once' }),
      effect: (body: () => unknown) => body(),
    }
    registerAgentTools(
      { inject: (_deps: string[], callback: (value: unknown) => void) => callback(scoped) } as unknown as Context,
      failing as unknown as HomeHostedService,
      settings,
    )
    const answer = await tools[0]!.execute({ id: 'x' }, {})
    expect(answer).toContain('failed: panel unavailable')
    expect(h.tools.length).toBeGreaterThan(0)
  })
})
