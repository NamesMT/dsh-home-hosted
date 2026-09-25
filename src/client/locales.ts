/**
 * English copy plus its Chinese twin. Both dictionaries carry the same key
 * union (`zh` is typed against `en`), and both are registered under
 * {@link LOCALE_NS} so the framework's synthesized `t` seat resolves here.
 */
import type { LocaleService, TranslateFn } from './context.js'

/** Namespace this page registers its dictionaries under. */
export const LOCALE_NS = 'homeHosted'

export const en = {
  tab: 'Home Hosted',
  pageDesc: 'Boot autostart and home-hosted server management.',
  loading: 'Loading…',
  refresh: 'Refresh',
  retry: 'Retry',
  errorTitle: 'Error',
  statusUnavailable: 'The panel did not answer.',
  yes: 'Yes',
  no: 'No',
  copy: 'Copy',
  copied: 'Copied',

  panelTitle: 'Panel',
  panelDesc: 'Reachability and identity of the home-hosted panel.',
  panelReachable: 'Reachable',
  panelHome: '$HHOSTED_HOME',
  panelUrl: 'URL',
  panelVersion: 'Version',
  panelPid: 'PID',
  panelWriteVia: 'Writes via',
  panelToken: 'API token',
  writeViaApi: 'authenticated API',
  writeViaFile: 'config file',
  writeViaNone: 'unavailable',
  tokenEnrolled: 'enrolled',
  tokenPresent: 'present',
  tokenAbsent: 'absent',
  tokenUnknown: 'unknown',

  bootTitle: 'Boot autostart',
  bootDesc: 'Start the panel automatically when the machine boots.',
  bootEnabled: 'Enable autostart',
  bootMechanism: 'Mechanism',
  bootMechanismAuto: 'Automatic (recommended)',
  bootState: 'State',
  bootStateNotInstalled: 'not installed',
  bootStateInstalledDisabled: 'installed, disabled',
  bootStateEnabledRunning: 'enabled, running',
  bootStateEnabledFailing: 'enabled, failing',
  bootStateUnsupported: 'unsupported',
  bootBootCapable: 'Starts before login',
  bootPrivileged: 'This process can install it',
  bootUnitPath: 'Unit path',
  bootCommands: 'Manual commands',
  bootCommandsExplain:
    'This process could not elevate. Run these commands yourself to install autostart:',
  bootRecheck: 'Re-check',

  entriesTitle: 'Managed entries',
  entriesDesc: 'What this plugin wants each entry to be, and what the panel reports.',
  entriesEmpty: 'No managed entries are configured yet.',
  entriesExists: 'exists',
  entriesMissing: 'missing',
  entriesManaged: 'managed',
  entriesUnmanaged: 'unmanaged',
  entriesDrift: 'Drift',
  entriesLive: 'Live',
  entriesNotRunning: 'not running',
  entriesAutostart: 'Autostart',
  entriesOnPortConflict: 'On port conflict',
  entriesStopKillPortHolders: 'Stop port holders',
  entriesAdopt: 'Adopt',
  entriesPause: 'Pause',
  entriesRestore: 'Restore',

  agentTitle: 'Agent tools',
  agentDesc: 'Which of this plugin’s tools the agent may call.',
  agentMaster: 'Enable agent tools',
  agentApproval: 'Mutating tools ask for approval before they run.',
  agentToolMutating: '{name} · asks approval',

  serversTitle: 'Servers',
  serversDesc: 'Servers supervised by the panel.',
  serversEmpty: 'The panel reports no servers.',
  serversPid: 'PID',
  serversUrl: 'URL',
  serversStart: 'Start',
  serversStop: 'Stop',
  serversRestart: 'Restart',
}

/** Chinese copy; the record type keeps it in step with {@link en}. */
export const zh: Record<keyof typeof en, string> = {
  tab: 'Home Hosted',
  pageDesc: '开机自启与 home-hosted 服务器管理。',
  loading: '加载中…',
  refresh: '刷新',
  retry: '重试',
  errorTitle: '错误',
  statusUnavailable: '面板没有响应。',
  yes: '是',
  no: '否',
  copy: '复制',
  copied: '已复制',

  panelTitle: '面板',
  panelDesc: 'home-hosted 面板的可达性与身份。',
  panelReachable: '可达',
  panelHome: '$HHOSTED_HOME',
  panelUrl: 'URL',
  panelVersion: '版本',
  panelPid: 'PID',
  panelWriteVia: '写入方式',
  panelToken: 'API 令牌',
  writeViaApi: '已认证 API',
  writeViaFile: '配置文件',
  writeViaNone: '不可用',
  tokenEnrolled: '已登记',
  tokenPresent: '已存在',
  tokenAbsent: '不存在',
  tokenUnknown: '未知',

  bootTitle: '开机自启',
  bootDesc: '随机器启动自动拉起面板。',
  bootEnabled: '启用自启',
  bootMechanism: '机制',
  bootMechanismAuto: '自动（推荐）',
  bootState: '状态',
  bootStateNotInstalled: '未安装',
  bootStateInstalledDisabled: '已安装，未启用',
  bootStateEnabledRunning: '已启用，运行中',
  bootStateEnabledFailing: '已启用，启动失败',
  bootStateUnsupported: '不支持',
  bootBootCapable: '登录前启动',
  bootPrivileged: '本进程可安装',
  bootUnitPath: '单元文件路径',
  bootCommands: '手动命令',
  bootCommandsExplain: '本进程无法提权。请自行执行以下命令来安装自启：',
  bootRecheck: '重新检查',

  entriesTitle: '受管条目',
  entriesDesc: '本插件希望每条目成为的样子，以及面板实际报告的状态。',
  entriesEmpty: '尚未配置任何受管条目。',
  entriesExists: '存在',
  entriesMissing: '缺失',
  entriesManaged: '已接管',
  entriesUnmanaged: '未接管',
  entriesDrift: '漂移',
  entriesLive: '实时',
  entriesNotRunning: '未运行',
  entriesAutostart: '自启',
  entriesOnPortConflict: '端口冲突时',
  entriesStopKillPortHolders: '停止端口占用者',
  entriesAdopt: '接管',
  entriesPause: '暂停',
  entriesRestore: '还原',

  agentTitle: 'Agent 工具',
  agentDesc: 'Agent 可以调用本插件的哪些工具。',
  agentMaster: '启用 Agent 工具',
  agentApproval: '会改变状态的工具在运行前会请求批准。',
  agentToolMutating: '{name} · 需批准',

  serversTitle: '服务器',
  serversDesc: '面板监管的服务器。',
  serversEmpty: '面板未报告任何服务器。',
  serversPid: 'PID',
  serversUrl: 'URL',
  serversStart: '启动',
  serversStop: '停止',
  serversRestart: '重启',
}

/** Substitute `{name}` placeholders; a missing param is left verbatim. */
export function interpolate(text: string, params?: Record<string, unknown>): string {
  if (params === undefined) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match)
}

/** English-only translator used when no locale service is available. */
export const englishTranslator: TranslateFn = (key, params) =>
  interpolate(en[key as keyof typeof en] ?? key, params)

/** Bind the service's namespace, falling back to the bundled English copy. */
export function createTranslator(locale?: LocaleService): TranslateFn {
  if (locale !== undefined) {
    try {
      const bound = locale.bind(LOCALE_NS)
      if (typeof bound === 'function') return bound
    }
    catch {
      // Fall through to the bundled copy.
    }
  }
  return englishTranslator
}
