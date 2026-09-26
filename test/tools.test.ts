import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { AgentToolName, RpcEndpoint } from '../src/shared/contracts.js'
import { PanelError } from '../src/home-hosted/panel.js'
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

function harness(options: {
  approval?: (toolName: string) => string
  allow?: AgentToolName[]
  enabled?: boolean
  sandbox?: string | null
  /** Scripted panel behaviour; the default answers every call with its own payload. */
  call?: (endpoint: RpcEndpoint, payload: unknown) => Promise<unknown>
} = {}): Harness {
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
      if (name === 'sandboxPolicy') {
        if (options.sandbox === null)
          return undefined
        return { resolve: () => ({ mode: options.sandbox ?? 'workspace-write' }) }
      }
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
      return options.call === undefined ? { endpoint, payload } : await options.call(endpoint, payload)
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

    h.update({ agentTools: { enabled: true, allow: ['servers_lifecycle'] } })
    expect(h.registeredNames()).toEqual(['home_hosted_servers_lifecycle'])

    h.update({ agentTools: { enabled: false, allow: ['servers_lifecycle'] } })
    expect(h.registeredNames()).toEqual([])
  })

  it('turns every tool on by default', () => {
    const scratch = tempDir()
    const settings = new SettingsStore(`${scratch.path}/settings.json`, 'dsh')
    expect(settings.get().agentTools.enabled).toBe(true)
    expect(settings.get().agentTools.allow).toEqual([
      'status',
      'servers_list',
      'servers_lifecycle',
      'servers_edit',
      'autostart_manage',
      'ui_manage',
    ])
  })

  it('answers a read-only tool without asking for approval', async () => {
    const h = harness({ allow: ['status'] })
    const tool = h.tools.find(candidate => candidate.name === toolNameFor('status'))!
    const answer = await tool.execute({}, { agent: 'agent-1' })
    expect(h.approvals).toHaveLength(0)
    expect(h.calls[0]?.endpoint).toBe('status')
    expect(answer).toContain('"endpoint": "status"')
  })

  it('maps a lifecycle action onto its endpoint', async () => {
    for (const action of ['start', 'stop', 'restart']) {
      const h = harness({ allow: ['servers_lifecycle'], sandbox: 'danger-full-access' })
      const answer = await h.tools[0]!.execute({ action, id: 'other' }, { agent: 'a' })
      expect(h.calls[0]).toEqual({ endpoint: `servers.${action}`, payload: { id: 'other' } })
      expect(answer).toContain(`servers.${action}`)
    }
  })

  it('checks the arguments of the merged edit tool', async () => {
    const h = harness({ allow: ['servers_edit'], sandbox: 'danger-full-access' })
    const tool = h.tools[0]!
    expect(await tool.execute({ action: 'create' }, { agent: 'a' })).toContain('entry is required')
    expect(await tool.execute({ action: 'update', id: 'x' }, { agent: 'a' })).toContain('patch are required')
    expect(await tool.execute({ action: 'delete' }, { agent: 'a' })).toContain('id is required')
    expect(await tool.execute({ action: 'nope' }, { agent: 'a' })).toContain('action must be')
    expect(h.calls).toHaveLength(0)

    await tool.execute({ action: 'create', entry: { id: 'x', command: 'sleep' } }, { agent: 'a' })
    expect(h.calls[0]).toEqual({ endpoint: 'servers.create', payload: { entry: { id: 'x', command: 'sleep' } } })
  })

  it('maps autostart and ui actions', async () => {
    const autostart = harness({ allow: ['autostart_manage'], sandbox: 'danger-full-access' })
    await autostart.tools[0]!.execute({ action: 'install', mechanism: 'launchd-daemon' }, { agent: 'a' })
    expect(autostart.calls[0]).toEqual({ endpoint: 'boot.install', payload: { mechanism: 'launchd-daemon' } })
    await autostart.tools[0]!.execute({ action: 'uninstall' }, { agent: 'a' })
    expect(autostart.calls[1]).toEqual({ endpoint: 'boot.uninstall', payload: {} })

    const ui = harness({ allow: ['ui_manage'], sandbox: 'danger-full-access' })
    await ui.tools[0]!.execute({ action: 'switch', file: '/tmp/x.zip' }, { agent: 'a' })
    expect(ui.calls[0]).toEqual({ endpoint: 'ui.manage', payload: { action: 'switch', file: '/tmp/x.zip' } })
    expect(await ui.tools[0]!.execute({ action: 'delete' }, { agent: 'a' })).toContain('action must be')
  })

  it('does not ask for approval for a read-only ui status call', async () => {
    const h = harness({ allow: ['ui_manage'], sandbox: 'workspace-write' })
    const answer = await h.tools[0]!.execute({ action: 'status' }, { agent: 'a' })
    expect(h.approvals).toHaveLength(0)
    expect(h.calls[0]).toEqual({ endpoint: 'ui.manage', payload: { action: 'status' } })
    expect(answer).toContain('ui.manage')
  })

  it('still asks before a ui action that changes the panel', async () => {
    const h = harness({ allow: ['ui_manage'], sandbox: 'workspace-write' })
    for (const action of ['update', 'revert', 'switch', 'Status']) {
      expect(await h.tools[0]!.execute({ action }, { agent: 'a' })).toContain('refused')
    }
    expect(h.approvals).toHaveLength(0)
    expect(h.calls).toHaveLength(0)
  })

  it('fails closed when the deployment has no approval service', async () => {
    const h = harness({ allow: ['servers_lifecycle'] })
    const answer = await h.tools[0]!.execute({ action: 'start', id: 'other' }, { agent: 'agent-1' })
    expect(answer).toContain('refused')
    expect(h.calls).toHaveLength(0)
  })

  it('refuses when approval rejects or cancels', async () => {
    for (const outcome of ['rejected', 'cancelled', 'unavailable']) {
      const h = harness({ allow: ['servers_edit'], approval: () => outcome })
      const answer = await h.tools[0]!.execute({ action: 'delete', id: 'other' }, { agent: 'agent-1' })
      expect(answer).toContain(`refused: approval answered "${outcome}"`)
      expect(answer).toContain('Full access')
      expect(h.calls).toHaveLength(0)
    }
  })

  it('runs a mutating tool once approval allows it', async () => {
    const h = harness({ allow: ['servers_edit'], approval: () => 'allowed-once' })
    const answer = await h.tools[0]!.execute({ action: 'update', id: 'dsh', patch: { autostart: false } }, { agent: 'agent-1' })
    expect(h.approvals).toHaveLength(1)
    expect(h.approvals[0]?.toolName).toBe('home_hosted_servers_edit')
    expect(h.calls[0]).toEqual({ endpoint: 'servers.update', payload: { id: 'dsh', patch: { autostart: false } } })
    expect(answer).toContain('servers.update')
  })

  it('reports a failed call as a tool result instead of throwing', async () => {
    const scratch = tempDir()
    const settings = new SettingsStore(`${scratch.path}/settings.json`, 'dsh')
    settings.update({ agentTools: { enabled: true, allow: ['servers_lifecycle'] } })
    const tools: RegisteredTool[] = []
    const scoped = {
      tools: { register: (definition: RegisteredTool) => { tools.push(definition); return () => {} } },
      get: (name: string) => (name === 'sandboxPolicy' ? { resolve: () => ({ mode: 'danger-full-access' }) } : undefined),
      effect: (body: () => unknown) => body(),
    }
    registerAgentTools(
      { inject: (_deps: string[], callback: (value: unknown) => void) => callback(scoped) } as unknown as Context,
      { call: async () => { throw new Error('panel unavailable') } } as unknown as HomeHostedService,
      settings,
    )
    const answer = await tools[0]!.execute({ action: 'start', id: 'x' }, {})
    expect(answer).toContain('failed: panel unavailable')
  })
})

describe('token reclaim', () => {
  const refused = (): PanelError => new PanelError('authentication required', 'AUTH_REQUIRED', 401)

  it('is on by default', () => {
    const scratch = tempDir()
    const settings = new SettingsStore(`${scratch.path}/settings.json`, 'dsh')
    expect(settings.get().reclaimToken).toBe(true)
  })

  it('reclaims a refused token and retries the call once', async () => {
    let attempts = 0
    const h = harness({
      allow: ['servers_list'],
      call: async (endpoint, payload) => {
        if (endpoint === 'servers.list' && attempts++ === 0)
          throw refused()
        return { endpoint, payload }
      },
    })
    const answer = await h.tools[0]!.execute({}, { agent: 'agent-1' })
    expect(h.calls.map(call => call.endpoint)).toEqual(['servers.list', 'panel.reclaimToken', 'servers.list'])
    expect(h.calls[1]?.payload).toEqual({})
    expect(answer).toContain('"endpoint": "servers.list"')
  })

  it('reclaims when a client could not be built but the token is measured stale', async () => {
    let attempts = 0
    const h = harness({
      allow: ['servers_list'],
      call: async (endpoint, payload) => {
        if (endpoint === 'status')
          return { panel: { token: 'stale', tokenVerified: true } }
        if (attempts++ === 0)
          throw Object.assign(new Error('the panel refused this plugin\'s API token'), { code: 'PANEL_UNAVAILABLE' })
        return { endpoint, payload }
      },
    })
    const answer = await h.tools[0]!.execute({}, { agent: 'agent-1' })
    expect(h.calls.map(call => call.endpoint)).toEqual(['servers.list', 'status', 'panel.reclaimToken', 'servers.list'])
    expect(answer).toContain('"endpoint": "servers.list"')
  })

  it('reports the original failure and reclaims nothing while the setting is off', async () => {
    const h = harness({ allow: ['servers_list'], call: async () => { throw refused() } })
    h.update({ reclaimToken: false })
    const answer = await h.tools[0]!.execute({}, { agent: 'agent-1' })
    expect(answer).toBe('failed: authentication required')
    expect(h.calls.map(call => call.endpoint)).toEqual(['servers.list'])
  })

  it('does not reclaim for a panel that is down or a bad request', async () => {
    const failures = [
      new PanelError('fetch failed', 'PANEL_UNREACHABLE'),
      new PanelError('unknown server "x"', 'UNKNOWN_SERVER', 404),
      Object.assign(new Error('"x" is not a valid server id'), { code: 'INVALID_ID' }),
    ]
    for (const failure of failures) {
      const h = harness({ allow: ['servers_list'], call: async () => { throw failure } })
      const answer = await h.tools[0]!.execute({}, { agent: 'agent-1' })
      expect(answer).toContain('failed:')
      expect(h.calls.map(call => call.endpoint)).toEqual(['servers.list'])
    }
  })

  it('does not reclaim an ambiguous client failure when the token is not stale', async () => {
    const h = harness({
      allow: ['servers_list'],
      call: async (endpoint) => {
        if (endpoint === 'status')
          return { panel: { token: 'unknown', tokenVerified: false } }
        throw Object.assign(new Error('the panel is not running'), { code: 'PANEL_UNAVAILABLE' })
      },
    })
    const answer = await h.tools[0]!.execute({}, { agent: 'agent-1' })
    expect(answer).toContain('failed: the panel is not running')
    expect(h.calls.map(call => call.endpoint)).toEqual(['servers.list', 'status'])
  })

  it('reports the retry failure and never reclaims twice', async () => {
    let attempts = 0
    const h = harness({
      allow: ['servers_list'],
      call: async (endpoint) => {
        if (endpoint === 'panel.reclaimToken')
          return { panel: { token: 'enrolled' } }
        if (attempts++ === 0)
          throw refused()
        throw new PanelError('the panel refused the replacement token', 'AUTH_REQUIRED', 401)
      },
    })
    const answer = await h.tools[0]!.execute({}, { agent: 'agent-1' })
    expect(answer).toBe('failed: the panel refused the replacement token')
    expect(h.calls.filter(call => call.endpoint === 'panel.reclaimToken')).toHaveLength(1)
    expect(h.calls.map(call => call.endpoint)).toEqual(['servers.list', 'panel.reclaimToken', 'servers.list'])
  })

  it('reports the original failure when the reclaim itself fails', async () => {
    const h = harness({
      allow: ['servers_list'],
      call: async (endpoint) => {
        if (endpoint === 'panel.reclaimToken')
          throw new PanelError('could not clear the old API token', 'TOKEN_RECLAIM_FAILED')
        throw refused()
      },
    })
    const answer = await h.tools[0]!.execute({}, { agent: 'agent-1' })
    expect(answer).toContain('failed: authentication required')
    expect(answer).toContain('token reclaim failed: could not clear the old API token')
    expect(h.calls.map(call => call.endpoint)).toEqual(['servers.list', 'panel.reclaimToken'])
  })

  it('reclaims behind the existing approval gate without asking again', async () => {
    let attempts = 0
    const h = harness({
      allow: ['servers_lifecycle'],
      approval: () => 'allowed-once',
      call: async (endpoint, payload) => {
        if (endpoint === 'servers.start' && attempts++ === 0)
          throw refused()
        return { endpoint, payload }
      },
    })
    const answer = await h.tools[0]!.execute({ action: 'start', id: 'other' }, { agent: 'agent-1' })
    expect(h.approvals).toHaveLength(1)
    expect(h.calls.map(call => call.endpoint)).toEqual(['servers.start', 'panel.reclaimToken', 'servers.start'])
    expect(answer).toContain('servers.start')
  })
})

describe('session sandbox', () => {
  it('does not ask for approval when the session is already full access', async () => {
    const h = harness({ allow: ['servers_edit'], sandbox: 'danger-full-access' })
    const answer = await h.tools[0]!.execute({ action: 'create', entry: { id: 'x', command: 'sleep' } }, { agent: 'agent-1' })
    expect(h.approvals).toHaveLength(0)
    expect(h.calls).toHaveLength(1)
    expect(answer).toContain('servers.create')
  })

  it('still asks — and fails closed — below full access', async () => {
    const readOnly = harness({ allow: ['servers_edit'], sandbox: 'read-only' })
    const answer = await readOnly.tools[0]!.execute({ action: 'create', entry: { id: 'x', command: 'sleep' } }, { agent: 'a' })
    expect(answer).toContain('refused')
    expect(answer).toContain('Full access')
    expect(readOnly.calls).toHaveLength(0)

    const denied = harness({ allow: ['servers_edit'], sandbox: 'workspace-write', approval: () => 'rejected' })
    const deniedAnswer = await denied.tools[0]!.execute({ action: 'create', entry: { id: 'x', command: 'sleep' } }, { agent: 'a' })
    expect(deniedAnswer).toContain('workspace-write')
    expect(denied.calls).toHaveLength(0)
  })

  it('runs when the sandbox is unknown but approval is granted', async () => {
    const h = harness({ allow: ['servers_lifecycle'], sandbox: null, approval: () => 'allowed-once' })
    const answer = await h.tools[0]!.execute({ action: 'start', id: 'other' }, { agent: 'a' })
    expect(h.approvals).toHaveLength(1)
    expect(answer).toContain('servers.start')
  })
})
