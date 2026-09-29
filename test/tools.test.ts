import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { AgentToolName, InstanceView, RpcEndpoint } from '../src/shared/contracts.js'
import { AGENT_TOOL_NAMES } from '../src/shared/contracts.js'
import { PanelError } from '../src/home-hosted/panel.js'
import type { HomeHostedService } from '../src/service.js'
import { SettingsStore } from '../src/settings.js'
import { registerAgentTools, toolNameFor } from '../src/tools.js'
import { tempDir } from './helpers/temp.js'

interface RegisteredTool {
  name: string
  parameters?: Record<string, unknown>
  execute: (args: unknown, exec?: unknown) => Promise<string>
}

/** What the tool asked the user; the harness answers from `answer`. */
interface AskRequest {
  questions: Array<{ id: string, question: string, detail?: string, options?: Array<{ label: string, description?: string }> }>
}

type AskAnswer = { answers: Array<{ id: string, selected: string[], custom?: string }> }

interface Harness {
  tools: RegisteredTool[]
  calls: Array<{ endpoint: RpcEndpoint, payload: unknown }>
  approvals: Array<{ toolName: string, reason?: string }>
  asks: AskRequest[]
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
  /** The panel inventory the service reports; `undefined` means a host without one. */
  instances?: InstanceView[]
  /** Scripted answer to the panel question; a returned Error is thrown instead. */
  answer?: (request: AskRequest) => AskAnswer | Error
  /** Scripted panel behaviour; the default answers every call with its own payload. */
  call?: (endpoint: RpcEndpoint, payload: unknown) => Promise<unknown>
} = {}): Harness {
  const scratch = tempDir()
  const settings = new SettingsStore(`${scratch.path}/settings.json`, 'dsh')
  settings.update({ agentTools: { enabled: options.enabled ?? true, allow: options.allow ?? ['status', 'servers_list'] } })

  const tools: RegisteredTool[] = []
  const calls: Harness['calls'] = []
  const approvals: Harness['approvals'] = []
  const asks: AskRequest[] = []

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
      if (name === 'userQuestions') {
        if (options.answer === undefined)
          return undefined
        return {
          ask: async (request: AskRequest) => {
            asks.push(request)
            const outcome = options.answer!(request)
            if (outcome instanceof Error)
              throw outcome
            return outcome
          },
        }
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
    ...(options.instances === undefined ? {} : { instances: async () => options.instances! }),
  }

  registerAgentTools(ctx as unknown as Context, service as unknown as HomeHostedService, settings)

  return {
    tools,
    calls,
    approvals,
    asks,
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
      'workspaces_list',
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
    expect(await tool.execute({ action: 'create' }, { agent: 'a' })).toContain('entry must be a JSON object to create a server (received: missing)')
    expect(await tool.execute({ action: 'update', id: 'x' }, { agent: 'a' })).toContain('patch must be a JSON object to update a server (received: missing)')
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
    for (const action of ['update', 'revert', 'switch']) {
      expect(await h.tools[0]!.execute({ action }, { agent: 'a' })).toContain('refused')
    }
    // An unknown action is a bad input, not a read-only one: it is rejected
    // before any permission prompt, and nothing runs.
    expect(await h.tools[0]!.execute({ action: 'Status' }, { agent: 'a' })).toContain('action must be')
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

describe('structured arguments through the bridge', () => {
  /**
   * The parameter schema is the model's contract, and the layer that used to be
   * untested: a `type: 'json'` parameter projected to a schema with no `type` at
   * all, and every real session then delivered something `create`/`update` could
   * not read. These assert the projection, not just the handler.
   */
  it('declares entry and patch as objects with named fields', () => {
    const h = harness({ allow: ['servers_edit'], sandbox: 'danger-full-access' })
    const properties = (h.tools[0]!.parameters as {
      properties: Record<string, { type?: string, additionalProperties?: boolean, properties?: Record<string, unknown> }>
    }).properties
    expect(properties.entry?.type).toBe('object')
    expect(properties.entry?.additionalProperties).toBe(true)
    expect(Object.keys(properties.entry?.properties ?? {})).toContain('command')
    expect(properties.patch?.type).toBe('object')
    // A patch never renames, so its `id` is not required and create's is.
    expect((properties.entry as { required?: string[] }).required).toEqual(['id'])
    expect((properties.patch as { required?: string[] }).required ?? []).toEqual([])
    // The panel's own schema is `1..65535 | null`, so a patch can clear a port.
    const port = (properties.entry as { properties?: Record<string, { oneOf?: unknown[] }> }).properties?.port
    expect(port?.oneOf).toHaveLength(2)
  })

  it('carries a real entry object through to the endpoint unchanged', async () => {
    const h = harness({ allow: ['servers_edit'], sandbox: 'danger-full-access' })
    const entry = { id: 'x', command: 'sleep', args: ['5'], env: { A: 'b' } }
    await h.tools[0]!.execute({ action: 'create', entry }, { agent: 'a' })
    expect(h.calls[0]).toEqual({ endpoint: 'servers.create', payload: { entry } })

    const patch = { autostart: false, stop: { killPortHolders: true } }
    await h.tools[0]!.execute({ action: 'update', id: 'x', patch }, { agent: 'a' })
    expect(h.calls[1]).toEqual({ endpoint: 'servers.update', payload: { id: 'x', patch } })
  })

  it('names the parameter and the received type when a value cannot be used', async () => {
    const h = harness({ allow: ['servers_edit'], sandbox: 'danger-full-access' })
    const tool = h.tools[0]!
    // The declared object type is what rejects a wrong shape, before the handler.
    await expect(tool.execute({ action: 'create', entry: 'not json' }, { agent: 'a' }))
      .rejects.toThrow(/"entry" must be an object/)
    // And an absent one says so, instead of reading as a malformed payload.
    expect(await tool.execute({ action: 'create' }, { agent: 'a' }))
      .toContain('entry must be a JSON object to create a server (received: missing)')
    expect(h.calls).toHaveLength(0)
  })
})

describe('panel targeting', () => {
  const instance = (over: Partial<InstanceView> & { home: string }): InstanceView => ({
    managed: false,
    hosting: false,
    url: null,
    port: null,
    pid: null,
    version: null,
    running: false,
    projectDir: null,
    servers: 0,
    source: 'configured',
    ...over,
  })
  const managed = instance({ home: '/managed', managed: true, url: 'http://127.0.0.1:3999', running: true })
  const other = instance({ home: '/other', url: 'http://127.0.0.1:4000' })
  const FILE_OPTION = 'Edit its config file'
  const CLI_OPTION = 'Run the home-hosted CLI'
  const API_OPTION = 'Generate a token and use its API'

  const fileAnswer = { answers: [{ id: 'home-hosted-foreign-panel', selected: [FILE_OPTION] }] }
  const cliAnswer = { answers: [{ id: 'home-hosted-foreign-panel', selected: [CLI_OPTION] }] }

  /** Answer the panel question and the mechanism question it leads to. */
  const answersByQuestion = (panel: string, mechanism: string) => (request: AskRequest) => ({
    answers: request.questions.map(question => ({
      id: question.id,
      selected: [question.id === 'home-hosted-instance' ? panel : mechanism],
    })),
  })

  it('refuses a target it cannot check when the host reports no inventory', async () => {
    // No inventory means no way to tell which panel is meant; falling back to the
    // managed panel would be the silent retarget this must not do.
    const h = harness({ allow: ['servers_edit'], sandbox: 'danger-full-access' })
    const answer = await h.tools[0]!.execute({ action: 'delete', id: 'dsh', instance: '/other' }, { agent: 'a' })
    expect(answer).toContain('refused: this host could not list the home-hosted panels')
    expect(h.calls).toHaveLength(0)
  })

  it('refuses a panel it cannot find', async () => {
    const h = harness({ allow: ['servers_lifecycle'], sandbox: 'danger-full-access', instances: [managed] })
    const answer = await h.tools[0]!.execute({ action: 'start', id: 'x', instance: '/nope' }, { agent: 'a' })
    expect(answer).toContain('no home-hosted panel at "/nope"')
    expect(h.calls).toHaveLength(0)
  })

  it('accepts the managed panel named by path or url, and never sends the selector to the panel', async () => {
    for (const selector of ['/managed', 'http://127.0.0.1:3999']) {
      const h = harness({ allow: ['servers_lifecycle'], sandbox: 'danger-full-access', instances: [managed, other] })
      const answer = await h.tools[0]!.execute({ action: 'start', id: 'x', instance: selector }, { agent: 'a' })
      expect(h.calls[0]).toEqual({ endpoint: 'servers.start', payload: { id: 'x' } })
      expect(h.asks).toHaveLength(0)
      expect(answer).toContain('servers.start')
    }
  })

  it('changes another panel through its config file once the user confirms', async () => {
    const h = harness({
      allow: ['servers_edit'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: () => fileAnswer,
    })
    const answer = await h.tools[0]!.execute({ action: 'delete', id: 'x', instance: '/other' }, { agent: 'a' })
    expect(h.asks).toHaveLength(1)
    expect(h.asks[0]?.questions[0]?.question).toContain('/other is not a panel this plugin manages. How should it be changed?')
    expect(h.calls[0]).toEqual({ endpoint: 'servers.delete', payload: { id: 'x', home: '/other', via: 'file' } })
    expect(answer).toContain('acted on /other')
    expect(answer).toContain('by editing its servers.config.json')
  })

  it('mints a token and uses another panel\'s API when the user picks that', async () => {
    const h = harness({
      allow: ['servers_edit'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: () => ({ answers: [{ id: 'home-hosted-foreign-panel', selected: [API_OPTION] }] }),
    })
    const answer = await h.tools[0]!.execute({ action: 'delete', id: 'x', instance: '/other' }, { agent: 'a' })
    expect(h.asks[0]?.questions[0]?.options?.map(option => option.label))
      .toEqual([FILE_OPTION, API_OPTION, 'Cancel'])
    expect(h.asks[0]?.questions[0]?.options?.[1]?.description).toContain('mints a token for it')
    expect(h.calls[0]).toEqual({ endpoint: 'servers.delete', payload: { id: 'x', home: '/other', via: 'api' } })
    expect(answer).toContain('by enrolling a token for it and using its API')
  })

  it('drives another panel through its own CLI once the user confirms', async () => {
    const h = harness({
      allow: ['servers_lifecycle'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: () => cliAnswer,
    })
    await h.tools[0]!.execute({ action: 'restart', id: 'web', instance: '/other' }, { agent: 'a' })
    expect(h.asks[0]?.questions[0]?.question).toContain('How should it be changed?')
    expect(h.calls[0]).toEqual({ endpoint: 'servers.restart', payload: { id: 'web', home: '/other', via: 'cli' } })
  })

  it('reads another panel without asking, and says where the answer came from', async () => {
    const h = harness({ allow: ['servers_list'], instances: [managed, other] })
    const answer = await h.tools[0]!.execute({ instance: '/other' }, { agent: 'a' })
    expect(h.asks).toHaveLength(0)
    expect(h.calls[0]).toEqual({ endpoint: 'servers.list', payload: { home: '/other', via: 'file' } })
    expect(answer).toContain('read from /other')
  })

  it('changes nothing when the user cancels the question about another panel', async () => {
    const cancelled = harness({
      allow: ['servers_edit'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: () => ({ answers: [{ id: 'home-hosted-foreign-panel', selected: ['Cancel'] }] }),
    })
    expect(await cancelled.tools[0]!.execute({ action: 'delete', id: 'x', instance: '/other' }, { agent: 'a' })).toContain('did not confirm')
    expect(cancelled.calls).toHaveLength(0)

    const dismissed = harness({
      allow: ['servers_edit'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: () => Object.assign(new Error('dismissed'), { code: 'ASK_ABORTED' }),
    })
    expect(await dismissed.tools[0]!.execute({ action: 'delete', id: 'x', instance: '/other' }, { agent: 'a' })).toContain('dismissed the panel question')
    expect(dismissed.calls).toHaveLength(0)
  })

  it('honours a typed answer that names the mechanism', async () => {
    const h = harness({
      allow: ['servers_edit'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: () => ({ answers: [{ id: 'home-hosted-foreign-panel', selected: [], custom: 'yes, edit the config' }] }),
    })
    await h.tools[0]!.execute({ action: 'delete', id: 'x', instance: '/other' }, { agent: 'a' })
    expect(h.calls[0]?.payload).toEqual({ id: 'x', home: '/other', via: 'file' })
  })

  it('lets a host with no answerer carry out an explicitly named panel, and says so', async () => {
    const h = harness({
      allow: ['servers_edit'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: () => Object.assign(new Error('no answerer'), { code: 'NO_PROVIDER' }),
    })
    const answer = await h.tools[0]!.execute({ action: 'delete', id: 'x', instance: '/other' }, { agent: 'a' })
    expect(h.calls[0]?.payload).toEqual({ id: 'x', home: '/other', via: 'file' })
    expect(answer).toContain('acted on /other')
  })

  it('refuses an endpoint that is about the managed panel, whichever panel is named', async () => {
    const h = harness({ allow: ['status'], instances: [managed, other] })
    const answer = await h.tools[0]!.execute({ instance: '/other' }, { agent: 'a' })
    expect(answer).toContain('describes the panel this plugin manages')
    expect(h.calls).toHaveLength(0)

    const boot = harness({ allow: ['autostart_manage'], sandbox: 'danger-full-access', instances: [managed, other] })
    expect(await boot.tools[0]!.execute({ action: 'install', instance: '/other' }, { agent: 'a' })).toContain('one machine-wide entry')
    expect(boot.calls).toHaveLength(0)
  })

  it('asks which panel when several exist, naming how each would be reached', async () => {
    const h = harness({
      allow: ['servers_edit'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: () => ({ answers: [{ id: 'home-hosted-instance', selected: ['/managed'] }] }),
    })
    const answer = await h.tools[0]!.execute({ action: 'update', id: 'x', patch: { autostart: false } }, { agent: 'a' })
    expect(h.asks).toHaveLength(1)
    expect(h.asks[0]?.questions[0]?.question).toContain('2 home-hosted panels')
    expect(h.asks[0]?.questions[0]?.options?.map(option => option.label)).toEqual(['/managed', '/other', 'Cancel'])
    expect(h.asks[0]?.questions[0]?.options?.[1]?.description).toContain('by editing its servers.config.json')
    expect(h.calls[0]).toEqual({ endpoint: 'servers.update', payload: { id: 'x', patch: { autostart: false } } })
    expect(answer).not.toContain('not the panel this plugin manages')
  })

  it('carries out a call the user redirected to another panel', async () => {
    const h = harness({
      allow: ['servers_edit'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: answersByQuestion('/other', FILE_OPTION),
    })
    const answer = await h.tools[0]!.execute({ action: 'update', id: 'x', patch: { autostart: false } }, { agent: 'a' })
    // Which panel, then how: one decision per question.
    expect(h.asks.map(request => request.questions[0]?.id)).toEqual(['home-hosted-instance', 'home-hosted-foreign-panel'])
    expect(h.calls[0]?.payload).toEqual({ id: 'x', patch: { autostart: false }, home: '/other', via: 'file' })
    expect(answer).toContain('acted on /other')
  })

  it('never reads a cancel, or a cancel plus free text, as consent', async () => {
    for (const selected of [['Cancel', FILE_OPTION], ['Cancel']]) {
      const h = harness({
        allow: ['servers_edit'],
        sandbox: 'danger-full-access',
        instances: [managed, other],
        answer: () => ({ answers: [{ id: 'home-hosted-foreign-panel', selected, custom: 'no, do not edit the config' }] }),
      })
      const answer = await h.tools[0]!.execute({ action: 'delete', id: 'x', instance: '/other' }, { agent: 'a' })
      expect(answer).toContain('did not confirm')
      expect(h.calls).toHaveLength(0)
    }
  })

  it('strips the id a patch may echo, because the panel rejects it', async () => {
    const h = harness({ allow: ['servers_edit'], sandbox: 'danger-full-access' })
    await h.tools[0]!.execute({ action: 'update', id: 'web', patch: { id: 'web', port: null } }, { agent: 'a' })
    expect(h.calls[0]).toEqual({ endpoint: 'servers.update', payload: { id: 'web', patch: { port: null } } })
  })

  it('does not repair the managed token for a failure on another panel', async () => {
    const refused = new PanelError('authentication required', 'AUTH_REQUIRED', 401)
    const h = harness({
      allow: ['servers_edit'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: () => ({ answers: [{ id: 'home-hosted-foreign-panel', selected: [API_OPTION] }] }),
      call: async () => { throw refused },
    })
    const answer = await h.tools[0]!.execute({ action: 'delete', id: 'x', instance: '/other' }, { agent: 'a' })
    expect(answer).toContain('failed: authentication required')
    expect(h.calls.map(call => call.endpoint)).toEqual(['servers.delete'])
  })

  it('refuses when the panel question fails for a reason that is not "no answerer"', async () => {
    const h = harness({
      allow: ['servers_edit'],
      sandbox: 'danger-full-access',
      instances: [managed, other],
      answer: () => Object.assign(new Error('the question UI exploded'), { code: 'UI_FAILED' }),
    })
    const answer = await h.tools[0]!.execute({ action: 'delete', id: 'x' }, { agent: 'a' })
    expect(answer).toContain('refused: the panel question could not be asked')
    expect(answer).toContain('the question UI exploded')
    expect(h.calls).toHaveLength(0)
  })

  it('declares the panel selector on every tool', () => {
    const h = harness({ allow: [...AGENT_TOOL_NAMES], sandbox: 'danger-full-access' })
    expect(h.registeredNames().sort()).toEqual(AGENT_TOOL_NAMES.map(name => toolNameFor(name)).sort())
    for (const tool of h.tools) {
      // `defineTool` registers the projected JSON schema, not the spec.
      const properties = (tool.parameters as { properties?: Record<string, unknown> } | undefined)?.properties ?? {}
      expect(Object.keys(properties)).toContain('instance')
    }
  })

  it('does not ask for a read-only call, or when the setting is off', async () => {
    const read = harness({ allow: ['status'], instances: [managed, other] })
    await read.tools[0]!.execute({}, { agent: 'a' })
    expect(read.asks).toHaveLength(0)
    expect(read.calls[0]?.endpoint).toBe('status')

    const off = harness({ allow: ['servers_lifecycle'], sandbox: 'danger-full-access', instances: [managed, other] })
    off.update({ instancesNotice: false })
    await off.tools[0]!.execute({ action: 'start', id: 'x' }, { agent: 'a' })
    expect(off.asks).toHaveLength(0)
    expect(off.calls[0]).toEqual({ endpoint: 'servers.start', payload: { id: 'x' } })
  })

  it('does not put the panel question before the session may act', async () => {
    // No approval service and a sandbox below Full access: the call is refused,
    // and the user is never asked which panel a refused call should have hit.
    const h = harness({ allow: ['servers_lifecycle'], instances: [managed, other] })
    const answer = await h.tools[0]!.execute({ action: 'start', id: 'x' }, { agent: 'a' })
    expect(answer).toContain('no approval service')
    expect(h.asks).toHaveLength(0)
    expect(h.calls).toHaveLength(0)
  })

  it('does not ask a host that reports no inventory', async () => {
    const h = harness({ allow: ['servers_lifecycle'], sandbox: 'danger-full-access' })
    await h.tools[0]!.execute({ action: 'start', id: 'x' }, { agent: 'a' })
    expect(h.asks).toHaveLength(0)
    expect(h.calls[0]?.endpoint).toBe('servers.start')
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
