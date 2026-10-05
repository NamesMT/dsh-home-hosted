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
import type { ParameterPropertySpec, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { AgentToolName, ForeignMechanism, HomeHostedStatus, InstanceView, RpcEndpoint, UiAction } from './shared/contracts.js'
import { FOREIGN_MECHANISMS, MUTATING_AGENT_TOOLS, ON_PORT_CONFLICT_POLICIES } from './shared/contracts.js'
import { canonicalPath, describeInstance } from './home-hosted/instances.js'
import type { HomeHostedService } from './service.js'
import type { SettingsStore } from './settings.js'

interface ApprovalLike {
  request: (request: { agent: unknown, toolName: string, reason?: string }) => Promise<string>
}

interface SandboxPolicyLike {
  resolve?: (input: { session?: unknown }) => { mode?: string } | undefined
}

/** The subset of `ctx.userQuestions` this uses; absent on a host without a UI. */
interface UserQuestionsLike {
  ask: (request: {
    questions: Array<{
      id: string
      header?: string
      question: string
      detail?: string
      options?: Array<{ label: string, description?: string }>
    }>
    agent?: unknown
    signal?: unknown
  }) => Promise<{ answers: Array<{ id: string, selected: string[], custom?: string }> }>
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

/** A payload carrying the panel a call targets and how to reach it. */
function withTarget(payload: unknown, home: string, via: ForeignMechanism | null): unknown {
  const target = via === null ? { home } : { home, via }
  return typeof payload === 'object' && payload !== null ? { ...payload, ...target } : target
}

function stringArg(input: Input, key: string): string | null {
  const value = input[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * The workspace a server call acts on, which every such call names explicitly —
 * a server id is only unique inside one workspace, so a default would make the
 * same call mean different things on different machines.
 */
function requiredWorkspace(input: Input): string {
  const workspace = stringArg(input, 'workspace')
  if (workspace === null)
    throw new Error('workspace is required; a server id is only unique inside one')
  return workspace
}

/**
 * A structured argument. `entry`/`patch` are declared as objects, so the runtime
 * validates them before this runs; what remains is the absent case, which the
 * caller reports as such rather than as an unusable value.
 */
function jsonArg(input: Input, key: string): Record<string, unknown> | null {
  const value = input[key]
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** Why a structured argument was unusable, naming the type that arrived. */
function jsonArgError(input: Input, key: string, purpose: string): Error {
  const value = input[key]
  const received = value === undefined ? 'missing' : Array.isArray(value) ? 'array' : typeof value
  return new Error(`${key} must be a JSON object ${purpose} (received: ${received})`)
}

interface ToolSpec {
  description: string
  parameters: ParameterSchemaSpec
  /** The endpoint call this tool performs, after its own argument handling. */
  run: (input: Input) => { endpoint: RpcEndpoint, payload: unknown }
}

/**
 * Every tool takes the same optional panel selector. Omitting it means the panel
 * this plugin manages; naming another panel is neither ignored nor silently
 * retargeted — this plugin asks the user first, then reaches that panel the only
 * way it can: its config file, or its own CLI.
 */
const INSTANCE_PARAM = {
  type: 'string',
  description: 'Panel state root or URL; omit for the managed panel',
} as const satisfies ParameterPropertySpec

/** Which workspace a call acts on; a server id is only unique inside one. */
const WORKSPACE_PARAM = {
  type: 'string',
  required: true,
  description: 'Workspace id (^[a-z0-9][a-z0-9_-]*$)',
} as const satisfies ParameterPropertySpec

/**
 * A home-hosted server entry, as one object parameter.
 *
 * Declared field by field rather than as `type: 'json'`: an author-only `json`
 * node projects to a schema with no `type`, and the model then has nothing to
 * aim at — the same mistake that made `create`/`update` unusable. `entry` stays
 * open (`additionalProperties: true`), so a key the panel grows later still passes
 * through; these are the keys named so a caller can **discover** them.
 *
 * This list is the panel's whole `serverSchema`, kept in step by one test. It used
 * to name 15 of the 23, so `persistent`, `bootstrap`, `dependsOn`, `envFile`,
 * `resources`, `backupPaths`, `logBufferLines` and `backupIgnoreGenerated` were
 * stored but invisible to a model — a capability that existed with no way to reach
 * it. `test/tools` reads the panel's own schema and fails if a field it accepts is
 * missing here, so the two cannot drift apart silently again.
 */
const ENTRY_FIELDS: ParameterSchemaSpec = {
  id: { type: 'string', required: true, description: 'Entry id, ^[a-z0-9][a-z0-9_-]*$' },
  command: { type: 'string', description: 'Executable to run' },
  args: { type: 'array', items: { type: 'string' }, description: 'Arguments' },
  cwd: { type: 'string', description: 'Working directory' },
  label: { type: 'string', description: 'Human label' },
  enabled: { type: 'boolean', description: 'Whether the entry may run' },
  autostart: { type: 'boolean', description: 'Start it when the panel starts' },
  // The panel's schema is `1..65535 | null`, and a patch that clears a port sends it.
  port: { oneOf: [{ type: 'number' }, { type: 'null' }], description: 'Port the panel tracks for this entry, or null' },
  bind: { type: 'string', description: 'Bind host, or local/lan: a local bind is loopback only' },
  onPortConflict: { type: 'string', enum: [...ON_PORT_CONFLICT_POLICIES], description: 'Policy when the port is taken' },
  stop: { type: 'object', additionalProperties: true, description: 'Stop policy: signal, killGroup, graceMs, killPortHolders' },
  health: { type: 'object', additionalProperties: true, description: 'Health check: enabled, mode (port|http), http {path, method, expectStatus, expectStatusBelow, expectBody}, intervalMs, timeoutMs, unhealthyThreshold, forceRestartAfterMs, startTimeoutMs' },
  restart: { type: 'object', additionalProperties: true, description: 'Restart policy: enabled, maxRetries, baseDelayMs, factor, maxDelayMs, resetAfterMs' },
  env: { type: 'object', additionalProperties: true, description: 'Environment variables' },
  dataEnvs: { type: 'object', additionalProperties: true, description: 'ENV=path pairs: exported to the process and backed up automatically' },
  persistent: { type: 'boolean', description: 'Run under the panel\'s nanny, so stopping or restarting the panel leaves this process alive' },
  bootstrap: { oneOf: [{ type: 'object', additionalProperties: true }, { type: 'null' }], description: 'Setup step run before start: command, args, env, timeoutMs, runOnce — or null' },
  dependsOn: { type: 'array', items: { type: 'string' }, description: 'Ids that must be running (and healthy) first; stopped in reverse order' },
  envFile: { type: 'string', description: 'KEY=value file loaded at spawn; its values override env' },
  resources: { type: 'object', additionalProperties: true, description: 'Resource policy: maxRssBytes — restart when the tree exceeds it; 0 disables' },
  backupPaths: { type: 'array', items: { type: 'string' }, description: 'Paths included in backups for this entry (templates allowed)' },
  logBufferLines: { type: 'number', description: 'Live log lines kept for this entry, 50..100000' },
  backupIgnoreGenerated: { type: 'boolean', description: 'Skip build output and dependency directories (node_modules, dist, caches) inside the declared backup paths' },
}
const ENTRY_PARAM = {
  type: 'object',
  additionalProperties: true,
  description: 'A home-hosted server entry: at least id and command',
  properties: ENTRY_FIELDS,
} as const satisfies ParameterPropertySpec

const PATCH_PARAM = {
  type: 'object',
  additionalProperties: true,
  description: 'Fields to change on an existing entry; only the given keys are touched',
  // The same fields, none required and without `id`: the entry patched is the one
  // the `id` argument names, and the panel rejects a patch that carries an id.
  properties: Object.fromEntries(Object.entries(ENTRY_FIELDS).filter(([key]) => key !== 'id')),
} as const satisfies ParameterPropertySpec

const TOOL_SPECS: Record<AgentToolName, ToolSpec> = {
  status: {
    description: 'Report the panel state, the panels found on this machine, its autostart entry, and the entries this plugin manages.',
    parameters: { instance: INSTANCE_PARAM },
    run: () => ({ endpoint: 'status', payload: {} }),
  },
  workspaces_list: {
    description: 'List every workspace the panel serves, with its label, entry count and running count. Read-only.',
    parameters: { instance: INSTANCE_PARAM },
    run: () => ({ endpoint: 'workspaces.list', payload: {} }),
  },
  servers_list: {
    description: 'List the servers home-hosted supervises in one workspace, with status, pid and url.',
    parameters: { instance: INSTANCE_PARAM, workspace: WORKSPACE_PARAM },
    run: (input) => {
      const workspace = requiredWorkspace(input)
      return { endpoint: 'servers.list', payload: { workspace } }
    },
  },
  servers_lifecycle: {
    description: 'Start, stop or restart a server supervised by home-hosted. Restarting the entry this session runs as ends the session.',
    parameters: {
      instance: INSTANCE_PARAM,
      workspace: WORKSPACE_PARAM,
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
      return {
        endpoint: `servers.${action}` as RpcEndpoint,
        payload: { id, workspace: requiredWorkspace(input) },
      }
    },
  },
  servers_edit: {
    description: 'Create, update or delete a home-hosted server entry. Delete is refused for the entry this session runs as.',
    parameters: {
      instance: INSTANCE_PARAM,
      workspace: WORKSPACE_PARAM,
      action: { type: 'string', required: true, description: 'create, update or delete' },
      id: { type: 'string', description: 'Server entry id (update, delete)' },
      entry: ENTRY_PARAM,
      patch: PATCH_PARAM,
    },
    run: (input) => {
      const action = stringArg(input, 'action')
      const workspace = requiredWorkspace(input)
      if (action === 'create') {
        const entry = jsonArg(input, 'entry')
        if (entry === null)
          throw jsonArgError(input, 'entry', 'to create a server')
        return { endpoint: 'servers.create', payload: { entry, workspace } }
      }
      if (action === 'update') {
        const id = stringArg(input, 'id')
        const patch = jsonArg(input, 'patch')
        if (id === null)
          throw new Error('id is required to update a server')
        if (patch === null)
          throw jsonArgError(input, 'patch', 'to update a server')
        // A caller may echo the id back; it is the key, not a field to change.
        const { id: _key, ...fields } = patch
        return { endpoint: 'servers.update', payload: { id, patch: fields, workspace } }
      }
      if (action === 'delete') {
        const id = stringArg(input, 'id')
        if (id === null)
          throw new Error('id is required to delete a server')
        return { endpoint: 'servers.delete', payload: { id, workspace } }
      }
      throw new Error('action must be create, update or delete')
    },
  },
  autostart_manage: {
    description: 'Install or remove the OS entry that starts home-hosted at boot or login. Installing stops the panel (and every server it supervises, which can include this session) and starts it again through that entry.',
    parameters: {
      instance: INSTANCE_PARAM,
      action: { type: 'string', required: true, description: 'install or uninstall' },
      mechanism: { type: 'string', description: 'Mechanism, e.g. systemd-system; omit for the plugin setting' },
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
    description: 'Inspect or change the panel\'s own web UI: status, update, revert, or install a UI by release asset or local zip.',
    parameters: {
      instance: INSTANCE_PARAM,
      action: { type: 'string', required: true, description: 'status, update, revert or switch' },
      asset: { type: 'string', description: 'Release asset name to install (switch), e.g. noc-console' },
      repo: { type: 'string', description: 'owner/name the asset lives in (switch/update)' },
      tag: { type: 'string', description: 'Release tag (switch/update)' },
      file: { type: 'string', description: 'Absolute path to a local UI zip (switch)' },
    },
    run: (input) => {
      const action = stringArg(input, 'action')
      if (action !== 'status' && action !== 'update' && action !== 'revert' && action !== 'switch')
        throw new Error('action must be status, update, revert or switch')
      const optional = (key: string): Record<string, string> => {
        const value = stringArg(input, key)
        return value === null ? {} : { [key]: value }
      }
      return {
        endpoint: 'ui.manage',
        payload: {
          action: action as UiAction,
          ...optional('file'),
          ...optional('asset'),
          ...optional('repo'),
          ...optional('tag'),
        },
      }
    },
  },
  /**
   * The one diagnostic that works when the panel's API does not: it reads the
   * console log off disk, so it needs no session and no API token. Read-only, and
   * deliberately not gated behind approval — a token is hardest to come by in
   * exactly the case this exists for.
   */
  panel_logs: {
    description: 'Read the panel\'s own console output — what home-hosted printed while starting and supervising. Needs no API token, so it still works when the panel is up but not answering.',
    parameters: {
      instance: INSTANCE_PARAM,
      lines: { type: 'string', description: 'How many trailing lines to read (default 50, `all` for everything)' },
    },
    run: (input) => {
      const raw = stringArg(input, 'lines')
      if (raw === null)
        return { endpoint: 'panel.console', payload: {} }
      if (raw.trim().toLowerCase() === 'all')
        return { endpoint: 'panel.console', payload: { lines: 0 } }
      const parsed = Number.parseInt(raw, 10)
      if (!Number.isFinite(parsed))
        throw new Error('lines must be a number or `all`')
      return { endpoint: 'panel.console', payload: { lines: parsed } }
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

/**
 * Which panel a call lands on, and whether the user still has to agree to it.
 *
 * The plugin drives one state root; a person may run several. A call that names
 * another panel is neither silently retargeted nor refused outright: the plugin
 * asks the user, names the way it would reach that panel (its config file, or
 * its own CLI), and only then changes it. A call that names none is the managed
 * panel by definition, unless several exist and the `instancesNotice` setting is
 * on, in which case the user is asked which panel was meant.
 */
type TargetPlan =
  | { ok: false, text: string }
  /** `home: null` is the managed panel; a null `ask` means nothing to confirm. */
  | { ok: true, home: string | null, ask: null }
  | { ok: true, home: null, ask: 'which', mechanisms: readonly ForeignMechanism[] }
  | { ok: true, home: string, ask: 'foreign', mechanisms: readonly ForeignMechanism[] }

/** The plan a question settled on: the panel and how to reach it, or why not. */
type TargetDecision = { ok: true, home: string | null, via: ForeignMechanism | null } | { ok: false, text: string }

const CANCEL_LABEL = 'Cancel'

/**
 * `userQuestions.ask` failures that mean no human could be reached: a host with
 * no answerer, and a delegated child (whose answers never reach a person).
 */
const NO_ANSWERER_CODES = new Set(['NO_PROVIDER', 'DELEGATED_CALLER', 'CALLER_NOT_LIVE'])

/** How each mechanism is offered to a person, and how the result names it. */
const MECHANISM_WORDING: Record<ForeignMechanism, { option: string, phrase: string }> = {
  file: { option: 'Edit its config file', phrase: 'by editing its servers.config.json' },
  cli: { option: 'Run the home-hosted CLI', phrase: 'by running the home-hosted CLI against its state root' },
  api: { option: 'Generate a token and use its API', phrase: 'by enrolling a token for it and using its API' },
}

/** Why an endpoint cannot be aimed at another panel, when it cannot. */
const NO_FOREIGN_REASON: Partial<Record<RpcEndpoint, string>> = {
  'status': 'home_hosted_status describes the panel this plugin manages, and it already lists every panel found on the machine.',
  'boot.install': 'the OS boot entry starts the panel this plugin manages; it is one machine-wide entry and cannot be aimed at another panel.',
  'boot.uninstall': 'the OS boot entry is one machine-wide entry and belongs to the panel this plugin manages.',
}

/** The panel inventory, when the host can produce one. */
async function inventoryOf(service: HomeHostedService): Promise<InstanceView[]> {
  const reader = (service as unknown as { instances?: () => Promise<InstanceView[]> }).instances
  if (typeof reader !== 'function')
    return []
  try {
    return await reader.call(service)
  }
  catch {
    return []
  }
}

/** The instance a caller named by state root, URL or project dir. */
function matchInstance(instances: readonly InstanceView[], wanted: string): InstanceView | null {
  const target = wanted.trim()
  if (target.length === 0)
    return null
  const asPath = canonicalPath(target)
  return instances.find(instance =>
    instance.home === asPath
    || instance.url === target
    || (instance.projectDir !== null && instance.projectDir === target),
  ) ?? null
}

function inventoryText(instances: readonly InstanceView[]): string {
  return instances.map(instance => `${instance.managed ? 'managed: ' : ''}${describeInstance(instance)}`).join('; ')
}

function refusalForUnknownPanel(instances: readonly InstanceView[], wanted: string): string {
  return `refused: no home-hosted panel at "${wanted}" was found on this machine. `
    + `Panels found: ${inventoryText(instances)}. `
    + 'Ask the user which panel they mean, or read home_hosted_status for the inventory.'
}

function refusalForUnreachablePanel(instances: readonly InstanceView[], target: InstanceView, endpoint: RpcEndpoint): string {
  const reason = NO_FOREIGN_REASON[endpoint] ?? `this plugin has no way to change another panel's state for ${endpoint}`
  return `refused: ${describeInstance(target)} is another home-hosted panel, and ${reason} `
    + `Panels found: ${inventoryText(instances)}.`
}

/** Read an answer's option labels; a UI may also return free text. */
function answerOf(answer: { answers?: Array<{ id: string, selected: string[], custom?: string }> }, id: string): { selected: string[], custom: string | null } {
  const item = (Array.isArray(answer?.answers) ? answer.answers : []).find(entry => entry.id === id)
  return {
    selected: Array.isArray(item?.selected) ? item.selected : [],
    custom: typeof item?.custom === 'string' && item.custom.trim().length > 0 ? item.custom.trim() : null,
  }
}

/**
 * Which panel the call lands on, validated before anything is asked. The
 * questions themselves run after the approval gate, so a call the session may
 * not make never puts a question to the user.
 */
async function planTarget(
  service: HomeHostedService,
  settings: SettingsStore,
  endpoint: RpcEndpoint,
  requested: string | null,
  mutating: boolean,
): Promise<TargetPlan> {
  const instances = await inventoryOf(service)
  if (instances.length === 0) {
    // An unverifiable target must not become the managed panel by default: that
    // is the silent retarget this whole check exists to prevent.
    return requested === null
      ? { ok: true, home: null, ask: null }
      : { ok: false, text: `refused: this host could not list the home-hosted panels on this machine, so "${requested}" cannot be checked; ask the user, or call without instance to act on the panel this plugin manages.` }
  }
  const managed = instances.find(instance => instance.managed)
  const mechanisms = FOREIGN_MECHANISMS[endpoint]

  if (requested !== null) {
    const target = matchInstance(instances, requested)
    if (target === null)
      return { ok: false, text: refusalForUnknownPanel(instances, requested) }
    if (target.managed)
      return { ok: true, home: null, ask: null }
    if (mechanisms === undefined)
      return { ok: false, text: refusalForUnreachablePanel(instances, target, endpoint) }
    return mutating ? { ok: true, home: target.home, ask: 'foreign', mechanisms } : { ok: true, home: target.home, ask: null }
  }

  // Asking which panel is only worth it when this call could reach more than one.
  if (!mutating || !settings.get().instancesNotice || managed === undefined || mechanisms === undefined || instances.length < 2)
    return { ok: true, home: null, ask: null }
  return { ok: true, home: null, ask: 'which', mechanisms }
}

/** One ask, returning the answered option labels or how it failed. */
async function ask(
  ctx: Context,
  exec: unknown,
  questions: UserQuestionsLike,
  item: { id: string, question: string, detail?: string, options: Array<{ label: string, description: string }> },
): Promise<{ ok: true, selected: string[], custom: string | null } | { ok: false, code: string | null, error: unknown }> {
  try {
    const answer = await questions.ask({
      questions: [{ id: item.id, header: 'home-hosted', question: item.question, detail: item.detail, options: item.options }],
      agent: (exec as { agent?: unknown } | undefined)?.agent,
      signal: (exec as { signal?: unknown } | undefined)?.signal,
    })
    const { selected, custom } = answerOf(answer, item.id)
    return { ok: true, selected, custom }
  }
  catch (error) {
    return { ok: false, code: errorCode(error), error }
  }
}

/**
 * Confirm a change to a panel the plugin does not manage, and how to reach it.
 *
 * Every mechanism that endpoint has is offered, least invasive first, so the
 * person chooses whether the plugin edits that panel's config, runs the
 * home-hosted CLI against it, or mints a token and uses its API. A host that
 * cannot reach a person proceeds on the mechanism the caller would have used
 * anyway; the tool result then says which one it was.
 */
async function askForeignPanel(
  ctx: Context,
  exec: unknown,
  instances: readonly InstanceView[],
  target: InstanceView,
  mechanisms: readonly ForeignMechanism[],
): Promise<TargetDecision> {
  const questions = ctx.get('userQuestions') as UserQuestionsLike | undefined
  const first = mechanisms[0] as ForeignMechanism
  if (typeof questions?.ask !== 'function')
    return { ok: true, home: target.home, via: first }

  const answer = await ask(ctx, exec, questions, {
    id: 'home-hosted-foreign-panel',
    question: `${target.home} is not a panel this plugin manages. How should it be changed?`,
    detail: inventoryText(instances),
    options: [
      ...mechanisms.map(mechanism => ({
        label: MECHANISM_WORDING[mechanism].option,
        description: `${MECHANISM_WORDING[mechanism].phrase}${
          mechanism === 'api' ? '; that mints a token for it, replacing any it had' : '; this plugin holds no API token for that panel'}`,
      })),
      { label: CANCEL_LABEL, description: 'Change nothing; say which panel you meant instead.' },
    ],
  })

  if (!answer.ok) {
    if (answer.code === 'ASK_ABORTED')
      return { ok: false, text: 'cancelled: the user dismissed the panel question to speak instead; stop and wait for their message.' }
    if (answer.code !== null && NO_ANSWERER_CODES.has(answer.code))
      return { ok: true, home: target.home, via: first }
    return { ok: false, text: `refused: the panel question could not be asked (${messageOf(answer.error)}); ask the user before changing another panel.` }
  }

  // Cancel settles it: an answer that cancels, or cancels and types something,
  // must never be read as consent.
  if (answer.selected.includes(CANCEL_LABEL))
    return { ok: false, text: `cancelled: the user did not confirm changing ${target.home}; ask which panel they meant.` }
  const chosen = answer.selected.find(label => label !== CANCEL_LABEL)
  if (chosen !== undefined) {
    const mechanism = mechanisms.find(candidate => MECHANISM_WORDING[candidate].option === chosen)
    if (mechanism !== undefined)
      return { ok: true, home: target.home, via: mechanism }
  }
  if (chosen === undefined && answer.custom !== null) {
    const mechanism = mechanisms.find(candidate => matchesMechanism(answer.custom as string, candidate))
    if (mechanism !== undefined)
      return { ok: true, home: target.home, via: mechanism }
  }
  return { ok: false, text: `cancelled: the user did not confirm changing ${target.home}; ask which panel they meant.` }
}

/** Whether free text names a mechanism, so a typed answer is honoured. */
function matchesMechanism(text: string, mechanism: ForeignMechanism): boolean {
  const value = text.toLowerCase()
  if (mechanism === 'file')
    return /file|config/.test(value)
  if (mechanism === 'cli')
    return /cli|command|terminal/.test(value)
  return /api|token/.test(value)
}

/**
 * Ask which panel a call that named none should hit, when more than one could
 * take it. The managed panel is the default, so a host with no answerer proceeds
 * there; the others are only offered when this call knows how to reach them.
 */
async function askWhichPanel(
  ctx: Context,
  exec: unknown,
  instances: readonly InstanceView[],
  managed: InstanceView,
  others: readonly InstanceView[],
  mechanisms: readonly ForeignMechanism[],
): Promise<TargetDecision> {
  const questions = ctx.get('userQuestions') as UserQuestionsLike | undefined
  if (typeof questions?.ask !== 'function')
    return { ok: true, home: null, via: null }

  const answer = await ask(ctx, exec, questions, {
    id: 'home-hosted-instance',
    question: `${instances.length} home-hosted panels were found on this machine. Act on the panel this plugin manages?`,
    detail: inventoryText(instances),
    options: [
      { label: managed.home, description: `managed by this plugin${managed.url === null ? '' : ` · ${managed.url}`}` },
      ...others.map(instance => ({
        label: instance.home,
        description: `not managed by this plugin${instance.url === null ? '' : ` · ${instance.url}`}`
          + ` · ${mechanisms.map(candidate => MECHANISM_WORDING[candidate].phrase).join(', or ')}`,
      })),
      { label: CANCEL_LABEL, description: 'Do nothing; say which panel you meant instead.' },
    ],
  })

  if (!answer.ok) {
    if (answer.code === 'ASK_ABORTED')
      return { ok: false, text: 'cancelled: the user dismissed the panel question to speak instead; stop and wait for their message.' }
    if (answer.code !== null && NO_ANSWERER_CODES.has(answer.code))
      return { ok: true, home: null, via: null }
    return { ok: false, text: `refused: the panel question could not be asked (${messageOf(answer.error)}); ask the user which panel they mean before acting.` }
  }

  if (answer.selected.includes(CANCEL_LABEL))
    return { ok: false, text: 'cancelled: the user chose not to pick a panel; ask them which one they mean.' }
  const chosen = answer.selected.find(label => label !== CANCEL_LABEL)
  if (chosen !== undefined) {
    const instance = matchInstance(instances, chosen)
    if (instance === null)
      return { ok: false, text: `cancelled: the answer "${chosen}" names no panel; ask the user which panel they mean.` }
    return instance.managed ? { ok: true, home: null, via: null } : { ok: true, home: instance.home, via: null }
  }
  if (answer.custom !== null) {
    const instance = matchInstance(instances, answer.custom)
    if (instance?.managed === true)
      return { ok: true, home: null, via: null }
    if (instance !== null)
      return { ok: true, home: instance.home, via: null }
    return { ok: false, text: `cancelled: the user answered "${answer.custom}", which names no panel; ask them which panel they mean.` }
  }
  return { ok: false, text: 'cancelled: the panel question was not answered; ask the user which panel they mean before acting.' }
}

/**
 * Run the questions a plan called for, and settle on the panel and mechanism.
 *
 * A call that named another panel is asked about the mechanism straight away; a
 * call that named none is asked which panel first, and when that answer is
 * another panel it is asked how to reach it — one decision per question.
 */
async function confirmPlan(
  ctx: Context,
  exec: unknown,
  service: HomeHostedService,
  plan: Extract<TargetPlan, { ok: true }>,
): Promise<TargetDecision> {
  if (plan.ask === null)
    return { ok: true, home: plan.home, via: null }
  const instances = await inventoryOf(service)
  const managed = instances.find(instance => instance.managed)
  if (plan.ask === 'foreign') {
    const target = instances.find(instance => instance.home === plan.home)
    // A panel that vanished between validation and here is not worth a question.
    return target === undefined
      ? { ok: false, text: refusalForUnknownPanel(instances, plan.home) }
      : await askForeignPanel(ctx, exec, instances, target, plan.mechanisms)
  }
  if (managed === undefined)
    return { ok: true, home: null, via: null }
  const others = instances.filter(instance => !instance.managed)
  const picked = await askWhichPanel(ctx, exec, instances, managed, others, plan.mechanisms)
  if (!picked.ok || picked.home === null)
    return picked
  const chosen = instances.find(instance => instance.home === picked.home)
  if (chosen === undefined || chosen.managed)
    return picked
  return await askForeignPanel(ctx, exec, instances, chosen, plan.mechanisms)
}

/** Error codes that mean the panel refused the plugin's credential. */
const TOKEN_REFUSAL_CODES = new Set([
  'AUTH_REQUIRED',
  'AUTH_UNARMED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INVALID_TOKEN',
  'TOKEN_STALE',
  'TOKEN_REFUSED',
])

function errorCode(error: unknown): string | null {
  const code = (error as { code?: unknown } | null | undefined)?.code
  return typeof code === 'string' ? code : null
}

function errorStatus(error: unknown): number | null {
  const status = (error as { status?: unknown } | null | undefined)?.status
  return typeof status === 'number' ? status : null
}

/** A panel answer that refused the token, as opposed to a bad request or a 404. */
function refusedByPanel(error: unknown): boolean {
  const status = errorStatus(error)
  if (status === 401 || status === 403)
    return true
  const code = errorCode(error)
  return code !== null && TOKEN_REFUSAL_CODES.has(code)
}

/**
 * Whether a failed call failed because the panel refused this plugin's token.
 *
 * A 401/403 or an auth code is that refusal directly. A client that could not be
 * established at all is ambiguous — the panel may simply be down — so the
 * panel's measured token state is asked instead; only `stale`, which the panel
 * sets from an actual refusal, justifies a repair.
 */
async function tokenRefused(service: Pick<HomeHostedService, 'call'>, error: unknown): Promise<boolean> {
  if (refusedByPanel(error))
    return true
  if (errorCode(error) !== 'PANEL_UNAVAILABLE')
    return false
  try {
    const status = await service.call('status', {}) as HomeHostedStatus | null
    return status?.panel.token === 'stale'
  }
  catch {
    return false
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function failureText(error: unknown): string {
  return `failed: ${messageOf(error)}`
}

function registerOne(ctx: Context, service: HomeHostedService, settings: SettingsStore, name: AgentToolName): () => void {
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
      // Argument handling is not a panel call: a bad input is reported as-is,
      // never "repaired" by minting a token.
      let request: { endpoint: RpcEndpoint, payload: unknown }
      try {
        request = spec.run(input)
      }
      catch (error) {
        return failureText(error)
      }

      const mode = sandboxMode(ctx, exec)
      // Fail closed: only a positively identified read-only action skips the
      // gate; an unknown action is rejected by the argument check above.
      const mutating = mutatingTool && !(READ_ONLY_ACTIONS[name]?.(input) ?? false)
      // The panel is settled before permission is asked: a refusal here changes
      // nothing, and no question is put to the user for a call that will not run.
      const plan = await planTarget(service, settings, request.endpoint, stringArg(input, 'instance'), mutating)
      if (!plan.ok)
        return plan.text

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

      const target = await confirmPlan(ctx, exec, service, plan)
      if (!target.ok)
        return target.text
      const payload = target.home === null
        ? request.payload
        : withTarget(request.payload, target.home, target.via ?? FOREIGN_MECHANISMS[request.endpoint]?.[0] ?? null)
      // What another panel's result must carry: the model may not have been the
      // one that chose it, and a config edit has no page to show.
      const landing = target.home === null
        ? ''
        : `\n\nhome-hosted: ${plan.ask === null ? 'read from' : 'acted on'} ${target.home}, not the panel this plugin manages`
          + `${target.via === null ? '' : `, ${MECHANISM_WORDING[target.via].phrase}`}.`

      try {
        return `${JSON.stringify(await service.call(request.endpoint, payload), null, 2)}${landing}`
      }
      catch (error) {
        // A foreign call carries its own credential; repairing this plugin's
        // managed token would churn it and still fail the retry.
        if (target.home !== null || !settings.get().reclaimToken || !(await tokenRefused(service, error)))
          return failureText(error)

        // One repair, one retry. The reclaim is a write, but it repairs this
        // plugin's own credential, not the panel's state, so it runs behind the
        // call's existing approval gate rather than asking for a second one.
        try {
          await service.call('panel.reclaimToken', {})
        }
        catch (reclaimError) {
          return `${failureText(error)} (token reclaim failed: ${messageOf(reclaimError)})`
        }
        try {
          return `${JSON.stringify(await service.call(request.endpoint, payload), null, 2)}${landing}`
        }
        catch (retryError) {
          return failureText(retryError)
        }
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
          disposers.push(registerOne(scoped, service, settings, name))
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
