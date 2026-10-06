window.__ModuleLoader__.load({ id: "dsh-home-hosted", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";var He=Object.defineProperty;var Zt=Object.getOwnPropertyDescriptor;var Qt=Object.getOwnPropertyNames;var en=Object.prototype.hasOwnProperty;var tn=(e,t)=>{for(var n in t)He(e,n,{get:t[n],enumerable:!0})},nn=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of Qt(t))!en.call(e,o)&&o!==n&&He(e,o,{get:()=>t[o],enumerable:!(r=Zt(t,o))||r.enumerable});return e};var on=e=>nn(He({},"__esModule",{value:!0}),e);var Un={};tn(Un,{apply:()=>_n,inject:()=>On});module.exports=on(Un);var xe="homeHosted",Me={tab:"Home Hosted",loading:"Loading\u2026",refresh:"Refresh",retry:"Retry",errorTitle:"Error",statusUnavailable:"The panel did not answer.",yes:"Yes",no:"No",copy:"Copy",copied:"Copied",details:"Details",uiStyleLabel:"Page style",uiStyleDetailed:"Detailed",uiStyleCompact:"Compact",workspacesTitle:"Workspaces",workspacesHint:"Every workspace this panel serves. Viewing one decides what this page lists.",workspacesViewLabel:"Workspace to view",workspacesEmpty:"The panel reports no workspaces yet.",workspacesManagedTag:"managed by the plugin",workspacesViewingTag:"viewing",workspacesCounts:"{servers} servers \xB7 {running} running",workspacesCountsFile:"{servers} in the config files",workspacesDegraded:"The panel is not answering, so these counts \u2014 and the entry list below \u2014 come from the workspace config files, not from live state.",workspaceLegacyTitle:"This state root still uses the pre-0.7 layout",workspaceLegacyBody:"The plugin cannot read or write its files until they move into .hh. Starting the panel once does the same move; this runs it directly.",workspaceMigrate:"Migrate state root",workspaceMigrateFailed:"The migration did not run.",workspaceMigrateDone:"The state root was migrated.",sigPanel:"Panel",sigAutostart:"Autostart",sigEntry:"{id} entry",stateAnswering:"answering",stateNotAnswering:"not answering",stateManaged:"managed",stateNotManaged:"not managed",stateWebOnly:"web only",panelTitle:"Panel",panelCopy:"Which copy runs the panel",panelCopyHint:"The pinned copy ships with this plugin; the global one is on PATH.",optionsPreferPinned:"Pinned dependency",optionsPreferGlobal:"Global install",optionsRecommended:"recommended",optionsConfigOverride:"The plugin row sets homeHostedCommand, and that always wins.",optionsInstallLabel:"Install a global copy",optionsInstallHint:"No global install was found. Install the pinned range, then choose it above:",optionsInstall:"Install globally",panelHome:"Panel root",panelUrl:"URL",panelVersion:"Version",panelPid:"PID",panelWriteVia:"Writes via",panelToken:"API token",panelCliSource:"CLI",panelCliPath:"CLI path",panelCliConfig:"configured command",panelCliDependency:"pinned dependency",panelCliPathSource:"global install (PATH)",panelCliMissing:"not found",panelCliNotPinned:"This host resolved a global home-hosted instead of the pinned copy ({range}).",panelCliUnsupported:"This home-hosted is older than the oldest release the plugin supports.",panelCliLauncherFailed:"The boot launcher did not answer, so a boot entry may fail to start the panel.",panelPort:"Panel port",panelPortHint:"Only changeable while the panel is stopped.",panelPortFree:"Leave empty to use the port in the config.",panelPortInvalid:"Enter a port between 1 and 65535.",panelStart:"Start the panel",panelStop:"Stop the panel",panelStopTitle:"Stop the running panel?",panelStopBody:"This stops the panel and every server it supervises \u2014 this session included, so the page may disconnect. An autostart entry starts them again at the next panel start.",panelStopping:"Stopping the panel\u2026",panelStopped:"The panel stopped.",panelStopFailed:"The panel did not stop: {message}",panelStartFailed:"The panel did not start: {message}",panelReplaceFailed:"The panel was not replaced: {message}",panelInstallFailed:"Installing home-hosted globally failed: {message}",panelRootLegacy:"Adopted from ~/.home-hosted. Set HHOSTED_HOME to give this dsh its own panel.",confirmStop:"Stop",panelOutdated:"Outdated panel",panelReplace:"Restart with {copy}",panelCopyPinned:"pinned dependency",panelCopyGlobal:"global install",panelTakeoverTitle:"Restart the running panel?",panelTakeoverBody:"This stops the panel and every server it supervises \u2014 this session included, so the page disconnects. It needs the {id} entry adopted with autostart on.",confirmCancel:"Cancel",confirmReplace:"Restart",writeViaApi:"authenticated API",writeViaFile:"config file",writeViaNone:"unavailable",tokenEnrolled:"enrolled",tokenPresent:"present",tokenAbsent:"absent",tokenStale:"stale",tokenUnknown:"unknown",panelTokenWarningTitle:"The panel API token is missing or refused",panelTokenWarnAbsent:"This plugin has no API token for the panel, so it cannot read or write the panel; regenerate one.",panelTokenWarnPresent:"home-hosted holds an API token this plugin does not have, so the plugin cannot authenticate; regenerate one to replace it.",panelTokenWarnStale:"The panel refused this plugin's API token; regenerate it.",panelTokenWarnUnreachable:"The plugin could not reach the panel to check its API token, so it cannot read or write the panel; the panel may need starting.",panelTokenWarnPanelDown:"The panel is not answering right now, so it may need starting too.",panelTokenRegenerate:"Regenerate token",panelTokenRegenerated:"A fresh API token was enrolled for the panel.",panelTokenRegenerateFailed:"The token was not replaced: {message}",panelInstances:"{count} panels found",panelInstanceManaged:"managed by this plugin",panelInstanceOther:"another panel",panelInstanceHosts:"hosts this dsh",panelInstancesHint:"This plugin drives only the managed one; the others are read from their state roots and never written to.",bootTitle:"Autostart",bootEnabled:"Enable autostart",bootUninstall:"Uninstall",bootSwitchMode:"Switch autostart",bootRecheck:"Re-check",bootMechanism:"Mechanism",bootMechanismAuto:"Automatic",bootMechanismAutoHint:"Picked from what this machine can actually use, preferring a mechanism that starts before you log in.",bootState:"State",bootStateNotInstalled:"not installed",bootStateInstalledDisabled:"installed, off",bootStateEnabledRunning:"enabled, running",bootStateEnabledFailing:"enabled, failing",bootStateUnsupported:"unsupported",bootBootCapable:"Starts before login",bootPrivileged:"This process can install it",bootUnitPath:"Unit path",bootCommandsLabel:"Install by hand",bootCommandsExplain:"This process cannot elevate. Run these commands to install autostart:",bootRequestedNotInstalled:"Autostart is requested, but no boot entry is installed.",bootHandover:"Enabling this stops the panel this plugin started and starts it through the entry, so this page disconnects and comes back.",bootSwitchRetires:"Switching stops the panel and removes the previous autostart entry, so this page disconnects and comes back.",bootActionInstall:"install",bootActionUninstall:"uninstall",bootAttemptFailed:"{action} failed",bootAttemptSucceeded:"{action} succeeded \u2014 {detail}",bootAttemptNoDetail:"The host did not explain the refusal.",bootAttemptCommands:"Run these yourself:",entriesTitle:"Managed entry",entriesManage:"Manage {id}",entriesManageNote:"Hands {id} to home-hosted: boot autostart, panel control, port reclaim.",entriesManageDesktop:"Available for dsh web only. Desktop starts its own profile, so it is never one of the panel's entries \u2014 servers are still managed here.",entriesManageWinWarning:"On Windows, `{id}` is managed via the `kill` onPortConflict policy, so when it is restarted detached by another plugin it may briefly fail to boot while home-hosted reclaims the process and port.",entriesEmpty:"{id} is not managed yet.",entriesExists:"exists",entriesMissing:"missing",entriesManaged:"managed",entriesUnmanaged:"unmanaged",entriesDrift:"drift",entriesNotRunning:"not running",agentTitle:"Agent tools",agentCount:"{enabled} of {total} on",agentMaster:"Let the agent use these tools",agentApproval:"Tools that change something ask for approval first.",agentApprovalBadge:"approval",reclaimAutoLabel:"Regenerate token automatically",reclaimAutoHint:"A tool call that finds a refused token re-enrols one and retries instead of failing.",instancesNoticeLabel:"Tell the agent about other panels",instancesNoticeHint:"Adds the panel inventory to the agent's context, and asks which panel to act on when several exist.",agentToolStatus:"Status",agentToolWorkspacesList:"List workspaces",agentToolServersList:"List servers",agentToolServersLifecycle:"Start, stop, restart",agentToolServersEdit:"Create, update, delete",agentToolAutostartManage:"Manage boot autostart",agentToolUiManage:"Manage Panel UI",agentToolPanelLogs:"Panel Logs",agentToolDescStatus:"Read the panel, the CLI copy in use and the managed entry. Nothing changes.",agentToolDescWorkspacesList:"List every workspace the panel serves, with its entry and running counts. A server id is only unique inside a workspace.",agentToolDescServersList:"List the servers of one workspace, with status, port and URL.",agentToolDescServersLifecycle:"Start, stop and restart supervised servers.",agentToolDescServersEdit:"Create, update and delete server entries.",agentToolDescAutostartManage:"Install or remove the boot entry that starts the panel.",agentToolDescUiManage:"Inspect, update, revert or install an official UI build.",agentToolDescPanelLogs:"Read the panel's own console output. Needs no API token, so it works when the panel is up but not answering.",serversTitle:"Servers",serversCount:"{running} of {total} running",serversHintPanel:"Entries are managed in the home-hosted panel:",serversHintNoPanel:"Entries cannot be managed right now: the panel is not running.",serversEmpty:"The panel reports no servers.",serversPid:"PID",serversUrl:"URL",serversCommand:"Command",serversArgs:"Args",serversCwd:"Working dir",serversPort:"Port",serversOnPortConflict:"On port conflict",serversAutostart:"Autostart",serversPersistent:"Persistent",serversPersistentHint:"Run by home-hosted's own nanny, so stopping or restarting the panel leaves it alive.",serversHealth:"Health",serversRestartPolicy:"Restart",serversConfiguration:"Configuration",serversRawConfig:"Raw config",serversDisabled:"disabled",serversEnabled:"enabled",serversHealthHttp:"HTTP {status} on {path}",serversHealthHttpBelow:"HTTP <{status} on {path}",serversHealthHttpProbe:"HTTP probe on {path}",serversHealthPort:"port {port}",serversHealthProbe:"port probe",serversHealthEvery:"every {seconds}",serversRestartSummary:"{retries} retries \xB7 {base} \u2192 \xD7{factor}",serversStart:"Start",serversStop:"Stop",serversRestart:"Restart",serversWorkspace:"Workspace",serversAdd:"Add server",serversEdit:"Edit",serversEditTitle:"Edit {id}",serversCreateTitle:"Add a server",serversEditorHint:"Only the fields you change are written. These are the common ones \u2014 the panel link above edits every field, including bootstrap, env files, resources and restart policy.",serversCreate:"Create",serversSave:"Save",serversDelete:"Delete",serversDeleteTitle:"Delete {id}?",serversDeleteBody:"This removes the entry from workspace {workspace}. A running server is stopped with it.",serversDeleteGo:"Delete",serversFreePort:"Free port",serversFreePortTitle:"Free port {port}?",serversFreePortBody:"Stops whatever holds the port, unless the panel supervises it. Processes get SIGTERM first, then a forced stop.",serversFreePortGo:"Free",serversPortFreed:"Port {port} is free.",serversPortHeld:"Port {port} is still held.",serversPortSkipped:"The listener belongs to a server the panel supervises, so it was left alone.",serversPortRefused:"The port was not freed: {message}",fieldId:"Id",fieldIdHint:"Lowercase letters, digits, `_` and `-`; unique inside the workspace.",fieldIdInvalid:"An id starts with a lowercase letter or digit and uses only a-z, 0-9, _ and -.",fieldLabel:"Label",fieldCommand:"Command",fieldArgs:"Arguments",fieldArgsHint:"One argument per line.",fieldCwd:"Working directory",fieldPort:"Port",fieldPortHint:"Empty means the entry has no port.",fieldPortInvalid:"Enter a port between 1 and 65535, or leave it empty.",fieldAutostart:"Start with the panel",fieldOnPortConflict:"On port conflict",fieldInherit:"Inherit",fieldRequired:"Id and command are required."},je={tab:"Home Hosted",loading:"\u52A0\u8F7D\u4E2D\u2026",refresh:"\u5237\u65B0",retry:"\u91CD\u8BD5",errorTitle:"\u9519\u8BEF",statusUnavailable:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\u3002",yes:"\u662F",no:"\u5426",copy:"\u590D\u5236",copied:"\u5DF2\u590D\u5236",details:"\u8BE6\u60C5",uiStyleLabel:"\u9875\u9762\u6837\u5F0F",uiStyleDetailed:"\u8BE6\u7EC6",uiStyleCompact:"\u7D27\u51D1",workspacesTitle:"\u5DE5\u4F5C\u533A",workspacesHint:"\u6B64\u9762\u677F\u63D0\u4F9B\u7684\u6240\u6709\u5DE5\u4F5C\u533A\u3002\u67E5\u770B\u54EA\u4E2A\u5C31\u5217\u51FA\u54EA\u4E2A\u3002",workspacesViewLabel:"\u8981\u67E5\u770B\u7684\u5DE5\u4F5C\u533A",workspacesEmpty:"\u9762\u677F\u5C1A\u672A\u62A5\u544A\u4EFB\u4F55\u5DE5\u4F5C\u533A\u3002",workspacesManagedTag:"\u7531\u63D2\u4EF6\u7BA1\u7406",workspacesViewingTag:"\u6B63\u5728\u67E5\u770B",workspacesCounts:"{servers} \u4E2A\u670D\u52A1\u5668 \xB7 {running} \u4E2A\u8FD0\u884C\u4E2D",workspacesCountsFile:"\u914D\u7F6E\u6587\u4EF6\u4E2D {servers} \u4E2A",workspacesDegraded:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\uFF0C\u56E0\u6B64\u8FD9\u4E9B\u8BA1\u6570\u2014\u2014\u4EE5\u53CA\u4E0B\u65B9\u7684\u6761\u76EE\u5217\u8868\u2014\u2014\u6765\u81EA\u5DE5\u4F5C\u533A\u914D\u7F6E\u6587\u4EF6\uFF0C\u800C\u4E0D\u662F\u5B9E\u65F6\u72B6\u6001\u3002",workspaceLegacyTitle:"\u8BE5\u72B6\u6001\u76EE\u5F55\u4ECD\u662F 0.7 \u4E4B\u524D\u7684\u5E03\u5C40",workspaceLegacyBody:"\u5728\u6587\u4EF6\u79FB\u5165 .hh \u4E4B\u524D\uFF0C\u63D2\u4EF6\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u5B83\u4EEC\u3002\u542F\u52A8\u4E00\u6B21\u9762\u677F\u5373\u53EF\u5B8C\u6210\u540C\u6837\u7684\u8FC1\u79FB\uFF1B\u6B64\u6309\u94AE\u76F4\u63A5\u6267\u884C\u8BE5\u547D\u4EE4\u3002",workspaceMigrate:"\u8FC1\u79FB\u72B6\u6001\u76EE\u5F55",workspaceMigrateFailed:"\u8FC1\u79FB\u6CA1\u6709\u6267\u884C\u3002",workspaceMigrateDone:"\u72B6\u6001\u76EE\u5F55\u5DF2\u8FC1\u79FB\u3002",sigPanel:"\u9762\u677F",sigAutostart:"\u5F00\u673A\u81EA\u542F",sigEntry:"{id} \u6761\u76EE",stateAnswering:"\u54CD\u5E94\u4E2D",stateNotAnswering:"\u672A\u54CD\u5E94",stateManaged:"\u5DF2\u63A5\u7BA1",stateNotManaged:"\u672A\u63A5\u7BA1",stateWebOnly:"\u4EC5 web",panelTitle:"\u9762\u677F",panelCopy:"\u7531\u54EA\u4E2A\u526F\u672C\u8FD0\u884C\u9762\u677F",panelCopyHint:"\u56FA\u5B9A\u526F\u672C\u968F\u63D2\u4EF6\u4E00\u8D77\u5B89\u88C5\uFF1B\u5168\u5C40\u526F\u672C\u6765\u81EA PATH\u3002",optionsPreferPinned:"\u56FA\u5B9A\u4F9D\u8D56",optionsPreferGlobal:"\u5168\u5C40\u5B89\u88C5",optionsRecommended:"\u63A8\u8350",optionsConfigOverride:"\u63D2\u4EF6\u884C\u4E2D\u7684 homeHostedCommand \u4F18\u5148\u7EA7\u6700\u9AD8\uFF0C\u59CB\u7EC8\u751F\u6548\u3002",optionsInstallLabel:"\u5B89\u88C5\u5168\u5C40\u526F\u672C",optionsInstallHint:"\u672A\u627E\u5230\u5168\u5C40\u5B89\u88C5\u3002\u5B89\u88C5\u56FA\u5B9A\u7248\u672C\u8303\u56F4\u540E\uFF0C\u5728\u4E0A\u65B9\u9009\u62E9\u5B83\uFF1A",optionsInstall:"\u5168\u5C40\u5B89\u88C5",panelHome:"\u9762\u677F\u6839\u76EE\u5F55",panelUrl:"URL",panelVersion:"\u7248\u672C",panelPid:"PID",panelWriteVia:"\u5199\u5165\u65B9\u5F0F",panelToken:"API \u4EE4\u724C",panelCliSource:"CLI",panelCliPath:"CLI \u8DEF\u5F84",panelCliConfig:"\u914D\u7F6E\u7684\u547D\u4EE4",panelCliDependency:"\u56FA\u5B9A\u7684\u4F9D\u8D56\u7248\u672C",panelCliPathSource:"\u5168\u5C40\u5B89\u88C5\uFF08PATH\uFF09",panelCliMissing:"\u672A\u627E\u5230",panelCliNotPinned:"\u6B64\u5BBF\u4E3B\u89E3\u6790\u5230\u7684\u662F\u5168\u5C40 home-hosted\uFF0C\u800C\u4E0D\u662F\u56FA\u5B9A\u526F\u672C\uFF08{range}\uFF09\u3002",panelCliUnsupported:"\u6B64 home-hosted \u65E9\u4E8E\u63D2\u4EF6\u652F\u6301\u7684\u6700\u8001\u7248\u672C\u3002",panelCliLauncherFailed:"\u5F00\u673A\u542F\u52A8\u5668\u6CA1\u6709\u5E94\u7B54\uFF0C\u5F00\u673A\u9879\u53EF\u80FD\u65E0\u6CD5\u542F\u52A8\u9762\u677F\u3002",panelPort:"\u9762\u677F\u7AEF\u53E3",panelPortHint:"\u4EC5\u5728\u9762\u677F\u505C\u6B62\u65F6\u53EF\u4FEE\u6539\u3002",panelPortFree:"\u7559\u7A7A\u5219\u4F7F\u7528\u914D\u7F6E\u6587\u4EF6\u4E2D\u7684\u7AEF\u53E3\u3002",panelPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\u3002",panelStart:"\u542F\u52A8\u9762\u677F",panelStop:"\u505C\u6B62\u9762\u677F",panelStopTitle:"\u505C\u6B62\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelStopBody:"\u8FD9\u4F1A\u505C\u6B62\u9762\u677F\u4EE5\u53CA\u5B83\u76D1\u7BA1\u7684\u6240\u6709\u670D\u52A1\u5668\u2014\u2014\u5305\u62EC\u672C\u4F1A\u8BDD\uFF0C\u56E0\u6B64\u672C\u9875\u9762\u53EF\u80FD\u4F1A\u65AD\u5F00\u8FDE\u63A5\u3002\u5E26\u6709\u81EA\u542F\u7684\u6761\u76EE\u4F1A\u5728\u4E0B\u6B21\u542F\u52A8\u9762\u677F\u65F6\u91CD\u65B0\u542F\u52A8\u3002",panelStopping:"\u6B63\u5728\u505C\u6B62\u9762\u677F\u2026",panelStopped:"\u9762\u677F\u5DF2\u505C\u6B62\u3002",panelStopFailed:"\u9762\u677F\u672A\u80FD\u505C\u6B62\uFF1A{message}",panelStartFailed:"\u9762\u677F\u672A\u80FD\u542F\u52A8\uFF1A{message}",panelReplaceFailed:"\u9762\u677F\u672A\u80FD\u66FF\u6362\uFF1A{message}",panelInstallFailed:"\u5168\u5C40\u5B89\u88C5 home-hosted \u5931\u8D25\uFF1A{message}",panelRootLegacy:"\u6CBF\u7528\u4E86 ~/.home-hosted\u3002\u8BBE\u7F6E HHOSTED_HOME \u53EF\u8BA9\u6B64 dsh \u4F7F\u7528\u81EA\u5DF1\u7684\u9762\u677F\u3002",confirmStop:"\u505C\u6B62",panelOutdated:"\u9762\u677F\u5DF2\u8FC7\u65F6",panelReplace:"\u4F7F\u7528{copy}\u91CD\u542F",panelCopyPinned:"\u56FA\u5B9A\u4F9D\u8D56",panelCopyGlobal:"\u5168\u5C40\u5B89\u88C5",panelTakeoverTitle:"\u91CD\u542F\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelTakeoverBody:"\u8FD9\u4F1A\u505C\u6B62\u9762\u677F\u4EE5\u53CA\u5B83\u76D1\u7BA1\u7684\u6240\u6709\u670D\u52A1\u5668\u2014\u2014\u5305\u62EC\u672C\u4F1A\u8BDD\uFF0C\u56E0\u6B64\u672C\u9875\u9762\u4F1A\u65AD\u5F00\u8FDE\u63A5\u3002\u4EC5\u5F53 {id} \u6761\u76EE\u5DF2\u88AB\u63A5\u7BA1\u4E14\u542F\u7528\u81EA\u542F\u65F6\u624D\u53EF\u7528\u3002",confirmCancel:"\u53D6\u6D88",confirmReplace:"\u91CD\u542F",writeViaApi:"\u5DF2\u8BA4\u8BC1 API",writeViaFile:"\u914D\u7F6E\u6587\u4EF6",writeViaNone:"\u4E0D\u53EF\u7528",tokenEnrolled:"\u5DF2\u767B\u8BB0",tokenPresent:"\u5DF2\u5B58\u5728",tokenAbsent:"\u4E0D\u5B58\u5728",tokenStale:"\u5DF2\u5931\u6548",tokenUnknown:"\u672A\u77E5",panelTokenWarningTitle:"\u9762\u677F API \u4EE4\u724C\u7F3A\u5931\u6216\u5DF2\u88AB\u62D2\u7EDD",panelTokenWarnAbsent:"\u672C\u63D2\u4EF6\u6CA1\u6709\u6B64\u9762\u677F\u7684 API \u4EE4\u724C\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u9762\u677F\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u4E00\u4E2A\u3002",panelTokenWarnPresent:"home-hosted \u6301\u6709\u4E00\u4E2A\u672C\u63D2\u4EF6\u6CA1\u6709\u7684 API \u4EE4\u724C\uFF0C\u63D2\u4EF6\u65E0\u6CD5\u901A\u8FC7\u8BA4\u8BC1\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u4E00\u4E2A\u4EE5\u66FF\u6362\u5B83\u3002",panelTokenWarnStale:"\u9762\u677F\u62D2\u7EDD\u4E86\u672C\u63D2\u4EF6\u7684 API \u4EE4\u724C\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u3002",panelTokenWarnUnreachable:"\u672C\u63D2\u4EF6\u65E0\u6CD5\u8BBF\u95EE\u9762\u677F\u4EE5\u68C0\u67E5\u5176 API \u4EE4\u724C\uFF0C\u56E0\u6B64\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u9762\u677F\uFF1B\u9762\u677F\u53EF\u80FD\u8FD8\u9700\u8981\u5148\u542F\u52A8\u3002",panelTokenWarnPanelDown:"\u9762\u677F\u5F53\u524D\u6CA1\u6709\u54CD\u5E94\uFF0C\u53EF\u80FD\u8FD8\u9700\u8981\u5148\u542F\u52A8\u9762\u677F\u3002",panelTokenRegenerate:"\u91CD\u65B0\u751F\u6210\u4EE4\u724C",panelTokenRegenerated:"\u5DF2\u4E3A\u9762\u677F\u767B\u8BB0\u65B0\u4EE4\u724C\u3002",panelTokenRegenerateFailed:"\u4EE4\u724C\u672A\u66FF\u6362\uFF1A{message}",panelInstances:"\u53D1\u73B0 {count} \u4E2A\u9762\u677F",panelInstanceManaged:"\u7531\u672C\u63D2\u4EF6\u7BA1\u7406",panelInstanceOther:"\u5176\u4ED6\u9762\u677F",panelInstanceHosts:"\u6258\u7BA1\u5F53\u524D dsh",panelInstancesHint:"\u672C\u63D2\u4EF6\u53EA\u9A71\u52A8\u88AB\u7BA1\u7406\u7684\u90A3\u4E00\u4E2A\uFF1B\u5176\u4ED6\u9762\u677F\u4EC5\u4ECE\u5176\u72B6\u6001\u76EE\u5F55\u8BFB\u53D6\uFF0C\u7EDD\u4E0D\u5199\u5165\u3002",bootTitle:"\u5F00\u673A\u81EA\u542F",bootEnabled:"\u542F\u7528\u5F00\u673A\u81EA\u542F",bootUninstall:"\u5378\u8F7D",bootSwitchMode:"\u5207\u6362\u81EA\u542F\u673A\u5236",bootRecheck:"\u91CD\u65B0\u68C0\u67E5",bootMechanism:"\u673A\u5236",bootMechanismAuto:"\u81EA\u52A8",bootMechanismAutoHint:"\u6839\u636E\u672C\u673A\u5B9E\u9645\u53EF\u7528\u7684\u65B9\u5F0F\u81EA\u52A8\u9009\u62E9\uFF0C\u4F18\u5148\u9009\u62E9\u5728\u767B\u5F55\u524D\u5373\u53EF\u542F\u52A8\u7684\u673A\u5236\u3002",bootState:"\u72B6\u6001",bootStateNotInstalled:"\u672A\u5B89\u88C5",bootStateInstalledDisabled:"\u5DF2\u5B89\u88C5\uFF0C\u672A\u542F\u7528",bootStateEnabledRunning:"\u5DF2\u542F\u7528\uFF0C\u8FD0\u884C\u4E2D",bootStateEnabledFailing:"\u5DF2\u542F\u7528\uFF0C\u542F\u52A8\u5931\u8D25",bootStateUnsupported:"\u4E0D\u652F\u6301",bootBootCapable:"\u767B\u5F55\u524D\u542F\u52A8",bootPrivileged:"\u672C\u8FDB\u7A0B\u53EF\u5B89\u88C5",bootUnitPath:"\u5355\u5143\u6587\u4EF6\u8DEF\u5F84",bootCommandsLabel:"\u624B\u52A8\u5B89\u88C5",bootCommandsExplain:"\u672C\u8FDB\u7A0B\u65E0\u6CD5\u63D0\u6743\u3002\u8BF7\u81EA\u884C\u6267\u884C\u4EE5\u4E0B\u547D\u4EE4\u6765\u5B89\u88C5\u81EA\u542F\uFF1A",bootRequestedNotInstalled:"\u5DF2\u8BF7\u6C42\u5F00\u673A\u81EA\u542F\uFF0C\u4F46\u5C1A\u672A\u5B89\u88C5\u4EFB\u4F55\u5F00\u673A\u9879\u3002",bootHandover:"\u542F\u7528\u540E\u4F1A\u505C\u6B62\u672C\u63D2\u4EF6\u542F\u52A8\u7684\u9762\u677F\uFF0C\u6539\u7531\u8BE5\u5F00\u673A\u9879\u542F\u52A8\uFF0C\u672C\u9875\u9762\u4F1A\u65AD\u5F00\u5E76\u81EA\u884C\u6062\u590D\u3002",bootSwitchRetires:"\u5207\u6362\u4F1A\u505C\u6B62\u9762\u677F\u5E76\u79FB\u9664\u5148\u524D\u7684\u81EA\u542F\u9879\uFF0C\u672C\u9875\u9762\u4F1A\u65AD\u5F00\u5E76\u81EA\u884C\u6062\u590D\u3002",bootActionInstall:"\u5B89\u88C5",bootActionUninstall:"\u5378\u8F7D",bootAttemptFailed:"{action}\u5931\u8D25",bootAttemptSucceeded:"{action}\u6210\u529F \u2014 {detail}",bootAttemptNoDetail:"\u5BBF\u4E3B\u6CA1\u6709\u8BF4\u660E\u5931\u8D25\u539F\u56E0\u3002",bootAttemptCommands:"\u4F60\u53EF\u4EE5\u81EA\u884C\u8FD0\u884C\u4EE5\u4E0B\u547D\u4EE4\uFF1A",entriesTitle:"\u53D7\u7BA1\u6761\u76EE",entriesManage:"\u63A5\u7BA1 {id}",entriesManageNote:"\u628A {id} \u4EA4\u7ED9 home-hosted\uFF1A\u5F00\u673A\u81EA\u542F\u3001\u9762\u677F\u63A7\u5236\u3001\u7AEF\u53E3\u56DE\u6536\u3002",entriesManageDesktop:"\u4EC5\u9002\u7528\u4E8E dsh web\u3002Desktop \u542F\u52A8\u81EA\u5DF1\u7684 profile\uFF0C\u56E0\u6B64\u5B83\u6C38\u8FDC\u4E0D\u4F1A\u6210\u4E3A\u9762\u677F\u4E2D\u7684\u6761\u76EE\u2014\u2014\u670D\u52A1\u5668\u4ECD\u53EF\u5728\u6B64\u7BA1\u7406\u3002",entriesManageWinWarning:"\u5728 Windows \u4E0A\uFF0C`{id}` \u901A\u8FC7 `kill` \u7AEF\u53E3\u51B2\u7A81\u7B56\u7565\u7BA1\u7406\uFF1B\u5F53\u5B83\u88AB\u5176\u4ED6\u63D2\u4EF6\u4EE5\u5206\u79BB\u65B9\u5F0F\u91CD\u542F\u65F6\uFF0Chome-hosted \u56DE\u6536\u8FDB\u7A0B\u4E0E\u7AEF\u53E3\u671F\u95F4\u53EF\u80FD\u77ED\u6682\u65E0\u6CD5\u542F\u52A8\u3002",entriesEmpty:"\u5C1A\u672A\u63A5\u7BA1 {id}\u3002",entriesExists:"\u5B58\u5728",entriesMissing:"\u7F3A\u5931",entriesManaged:"\u5DF2\u63A5\u7BA1",entriesUnmanaged:"\u672A\u63A5\u7BA1",entriesDrift:"\u6F02\u79FB",entriesNotRunning:"\u672A\u8FD0\u884C",agentTitle:"Agent \u5DE5\u5177",agentCount:"\u5DF2\u5F00\u542F {enabled}/{total}",agentMaster:"\u5141\u8BB8 Agent \u8C03\u7528\u8FD9\u4E9B\u5DE5\u5177",agentApproval:"\u4F1A\u6539\u53D8\u72B6\u6001\u7684\u5DE5\u5177\u5728\u8FD0\u884C\u524D\u4F1A\u8BF7\u6C42\u6279\u51C6\u3002",agentApprovalBadge:"\u9700\u6279\u51C6",reclaimAutoLabel:"\u88AB\u62D2\u7EDD\u65F6\u81EA\u52A8\u91CD\u65B0\u751F\u6210\u4EE4\u724C",reclaimAutoHint:"\u5DE5\u5177\u8C03\u7528\u9047\u5230\u88AB\u62D2\u7EDD\u7684\u4EE4\u724C\u65F6\u4F1A\u91CD\u65B0\u767B\u8BB0\u5E76\u91CD\u8BD5\uFF0C\u800C\u4E0D\u662F\u76F4\u63A5\u5931\u8D25\u3002",instancesNoticeLabel:"\u5411 Agent \u8BF4\u660E\u5176\u4ED6\u9762\u677F",instancesNoticeHint:"\u628A\u9762\u677F\u6E05\u5355\u52A0\u5165 Agent \u4E0A\u4E0B\u6587\uFF1B\u5B58\u5728\u591A\u4E2A\u9762\u677F\u65F6\u4F1A\u5148\u8BE2\u95EE\u8981\u64CD\u4F5C\u54EA\u4E00\u4E2A\u3002",agentToolStatus:"\u67E5\u770B\u72B6\u6001",agentToolWorkspacesList:"\u5217\u51FA\u5DE5\u4F5C\u533A",agentToolServersList:"\u5217\u51FA\u670D\u52A1\u5668",agentToolServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u3001\u91CD\u542F",agentToolServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u3001\u5220\u9664",agentToolAutostartManage:"\u7BA1\u7406\u5F00\u673A\u81EA\u542F",agentToolUiManage:"\u7BA1\u7406\u9762\u677F UI",agentToolPanelLogs:"\u9762\u677F\u65E5\u5FD7",agentToolDescStatus:"\u8BFB\u53D6\u9762\u677F\u3001\u6B63\u5728\u4F7F\u7528\u7684 CLI \u526F\u672C\u548C\u53D7\u7BA1\u6761\u76EE\u3002\u4E0D\u6539\u53D8\u4EFB\u4F55\u72B6\u6001\u3002",agentToolDescWorkspacesList:"\u5217\u51FA\u9762\u677F\u63D0\u4F9B\u7684\u6240\u6709\u5DE5\u4F5C\u533A\u53CA\u5176\u6761\u76EE\u6570\u548C\u8FD0\u884C\u6570\u3002\u670D\u52A1\u5668 id \u53EA\u5728\u5DE5\u4F5C\u533A\u5185\u552F\u4E00\u3002",agentToolDescServersList:"\u5217\u51FA\u67D0\u4E2A\u5DE5\u4F5C\u533A\u4E2D\u88AB\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u53CA\u5176\u72B6\u6001\u3001\u7AEF\u53E3\u548C URL\u3002",agentToolDescServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u548C\u91CD\u542F\u53D7\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u3002",agentToolDescServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u548C\u5220\u9664\u670D\u52A1\u5668\u6761\u76EE\u3002",agentToolDescAutostartManage:"\u5B89\u88C5\u6216\u79FB\u9664\u542F\u52A8\u9762\u677F\u7684\u5F00\u673A\u9879\u3002",agentToolDescUiManage:"\u67E5\u770B\u3001\u66F4\u65B0\u3001\u56DE\u9000\u6216\u5B89\u88C5\u5B98\u65B9 UI \u6784\u5EFA\u3002",agentToolDescPanelLogs:"\u8BFB\u53D6\u9762\u677F\u81EA\u8EAB\u7684\u63A7\u5236\u53F0\u8F93\u51FA\u3002\u65E0\u9700 API \u4EE4\u724C\uFF0C\u56E0\u6B64\u9762\u677F\u5728\u8FD0\u884C\u4F46\u65E0\u54CD\u5E94\u65F6\u4E5F\u80FD\u4F7F\u7528\u3002",serversTitle:"\u670D\u52A1\u5668",serversCount:"{total} \u4E2A\u4E2D {running} \u4E2A\u8FD0\u884C\u4E2D",serversHintPanel:"\u5728 home-hosted \u9762\u677F\u4E2D\u7BA1\u7406\u6761\u76EE\uFF1A",serversHintNoPanel:"\u5F53\u524D\u65E0\u6CD5\u7BA1\u7406\u6761\u76EE\uFF1A\u9762\u677F\u6CA1\u6709\u8FD0\u884C\u3002",serversEmpty:"\u9762\u677F\u672A\u62A5\u544A\u4EFB\u4F55\u670D\u52A1\u5668\u3002",serversPid:"PID",serversUrl:"URL",serversCommand:"\u547D\u4EE4",serversArgs:"\u53C2\u6570",serversCwd:"\u5DE5\u4F5C\u76EE\u5F55",serversPort:"\u7AEF\u53E3",serversOnPortConflict:"\u7AEF\u53E3\u51B2\u7A81\u65F6",serversAutostart:"\u81EA\u542F",serversPersistent:"\u6301\u4E45\u5316",serversPersistentHint:"\u7531 home-hosted \u81EA\u5E26\u7684 nanny \u6258\u7BA1\uFF0C\u505C\u6B62\u6216\u91CD\u542F\u9762\u677F\u4E0D\u4F1A\u505C\u6B62\u5B83\u3002",serversHealth:"\u5065\u5EB7\u68C0\u67E5",serversRestartPolicy:"\u91CD\u542F",serversConfiguration:"\u914D\u7F6E",serversRawConfig:"\u539F\u59CB\u914D\u7F6E",serversDisabled:"\u5DF2\u505C\u7528",serversEnabled:"\u5DF2\u542F\u7528",serversHealthHttp:"HTTP {status} \u4E8E {path}",serversHealthHttpBelow:"HTTP <{status} \u4E8E {path}",serversHealthHttpProbe:"HTTP \u63A2\u6D4B {path}",serversHealthPort:"\u7AEF\u53E3 {port}",serversHealthProbe:"\u7AEF\u53E3\u63A2\u6D4B",serversHealthEvery:"\u6BCF {seconds}",serversRestartSummary:"{retries} \u6B21\u91CD\u8BD5 \xB7 {base} \u2192 \xD7{factor}",serversStart:"\u542F\u52A8",serversStop:"\u505C\u6B62",serversRestart:"\u91CD\u542F",serversWorkspace:"\u5DE5\u4F5C\u533A",serversAdd:"\u6DFB\u52A0\u670D\u52A1\u5668",serversEdit:"\u7F16\u8F91",serversEditTitle:"\u7F16\u8F91 {id}",serversCreateTitle:"\u6DFB\u52A0\u670D\u52A1\u5668",serversEditorHint:"\u53EA\u5199\u5165\u4F60\u6539\u52A8\u7684\u5B57\u6BB5\u3002\u8FD9\u91CC\u53EA\u5217\u51FA\u5E38\u7528\u5B57\u6BB5\u2014\u2014\u4E0A\u65B9\u9762\u677F\u94FE\u63A5\u53EF\u7F16\u8F91\u5168\u90E8\u5B57\u6BB5\uFF0C\u5305\u62EC\u5F15\u5BFC\u547D\u4EE4\u3001\u73AF\u5883\u53D8\u91CF\u6587\u4EF6\u3001\u8D44\u6E90\u9650\u5236\u4E0E\u91CD\u542F\u7B56\u7565\u3002",serversCreate:"\u521B\u5EFA",serversSave:"\u4FDD\u5B58",serversDelete:"\u5220\u9664",serversDeleteTitle:"\u5220\u9664 {id}\uFF1F",serversDeleteBody:"\u8FD9\u4F1A\u4ECE\u5DE5\u4F5C\u533A {workspace} \u4E2D\u79FB\u9664\u8BE5\u6761\u76EE\uFF0C\u8FD0\u884C\u4E2D\u7684\u670D\u52A1\u5668\u4E5F\u4F1A\u968F\u4E4B\u505C\u6B62\u3002",serversDeleteGo:"\u5220\u9664",serversFreePort:"\u91CA\u653E\u7AEF\u53E3",serversFreePortTitle:"\u91CA\u653E\u7AEF\u53E3 {port}\uFF1F",serversFreePortBody:"\u505C\u6B62\u5360\u7528\u8BE5\u7AEF\u53E3\u7684\u8FDB\u7A0B\uFF0C\u9664\u975E\u5B83\u7531\u9762\u677F\u76D1\u7BA1\u3002\u8FDB\u7A0B\u5148\u6536\u5230 SIGTERM\uFF0C\u4E4B\u540E\u4F1A\u88AB\u5F3A\u5236\u505C\u6B62\u3002",serversFreePortGo:"\u91CA\u653E",serversPortFreed:"\u7AEF\u53E3 {port} \u5DF2\u91CA\u653E\u3002",serversPortHeld:"\u7AEF\u53E3 {port} \u4ECD\u88AB\u5360\u7528\u3002",serversPortSkipped:"\u8BE5\u76D1\u542C\u8005\u5C5E\u4E8E\u9762\u677F\u76D1\u7BA1\u7684\u670D\u52A1\u5668\uFF0C\u56E0\u6B64\u672A\u88AB\u52A8\u5B83\u3002",serversPortRefused:"\u7AEF\u53E3\u672A\u80FD\u91CA\u653E\uFF1A{message}",fieldId:"Id",fieldIdHint:"\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u3001`_` \u548C `-`\uFF1B\u5728\u5DE5\u4F5C\u533A\u5185\u552F\u4E00\u3002",fieldIdInvalid:"id \u4EE5\u5C0F\u5199\u5B57\u6BCD\u6216\u6570\u5B57\u5F00\u5934\uFF0C\u53EA\u80FD\u5305\u542B a-z\u30010-9\u3001_ \u548C -\u3002",fieldLabel:"\u6807\u7B7E",fieldCommand:"\u547D\u4EE4",fieldArgs:"\u53C2\u6570",fieldArgsHint:"\u6BCF\u884C\u4E00\u4E2A\u53C2\u6570\u3002",fieldCwd:"\u5DE5\u4F5C\u76EE\u5F55",fieldPort:"\u7AEF\u53E3",fieldPortHint:"\u7559\u7A7A\u8868\u793A\u8BE5\u6761\u76EE\u6CA1\u6709\u7AEF\u53E3\u3002",fieldPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\uFF0C\u6216\u7559\u7A7A\u3002",fieldAutostart:"\u968F\u9762\u677F\u542F\u52A8",fieldOnPortConflict:"\u7AEF\u53E3\u51B2\u7A81\u65F6",fieldInherit:"\u7EE7\u627F",fieldRequired:"Id \u548C\u547D\u4EE4\u4E3A\u5FC5\u586B\u3002"};function rn(e,t){return t===void 0?e:e.replace(/\{(\w+)\}/g,(n,r)=>Object.prototype.hasOwnProperty.call(t,r)?String(t[r]):n)}var ze=(e,t)=>rn(Me[e]??e,t);function Ge(e){if(e!==void 0)try{let t=e.bind(xe);if(typeof t=="function")return t}catch{}return ze}function Ke(e,t=ze){return e===void 0?t:(n,r)=>{let o;try{o=e(n,r)}catch{o=void 0}return o===void 0||o.length===0||o===n?t(n,r):o}}var $=require("react");var ae=require("react");var Ye="/home-hosted";var qe="default";var Je=["block","warn","follow","reclaim","kill"];var he=["status","workspaces_list","servers_list","servers_lifecycle","servers_edit","autostart_manage","ui_manage","panel_logs"],Xe=["servers_lifecycle","servers_edit","autostart_manage","ui_manage"],an=3,$n={version:an,autostart:{enabled:!1,mechanism:"auto"},manageDsh:!1,entries:[],agentTools:{enabled:!0,allow:[...he]},panel:{port:null},authNotice:!0,reclaimToken:!0,instancesNotice:!0,uiStyle:"detailed",cli:{prefer:"pinned"}};var sn="/api";function ne(e,t,n){return{ok:!1,error:n===void 0?{code:e,message:t}:{code:e,message:t,detail:n}}}function Le(e){return typeof e=="object"&&e!==null}function ln(e){return e instanceof Error?e.message:String(e)}function cn(e){if(!Le(e))return ne("bad-response","The panel returned a non-object response");if(typeof e.v=="number"&&e.v!==1)return ne("version-mismatch",`Response protocol v${e.v} does not match the expected v${1}`);let t=e.result;if(!Le(t))return ne("bad-response","The panel returned no result");if(t.ok===!0)return"value"in t?{ok:!0,value:t.value}:ne("bad-response","A successful response carried no value");if(t.ok===!1){let n=t.error;return Le(n)&&typeof n.message=="string"?ne(typeof n.code=="string"?n.code:"error",n.message,n.detail):ne("error","The panel reported a failure without a message")}return ne("bad-response","The panel returned an unrecognised result")}async function k(e,t,n={}){let r=n.fetch??globalThis.fetch;if(typeof r!="function")return ne("no-fetch","No fetch implementation is available");let o={v:1,endpoint:e,payload:t},a;try{a=await r(`${sn}${Ye}`,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(o)})}catch(s){return ne("network",ln(s))}if(!a.ok){let s=a.statusText.length>0?` ${a.statusText}`:"";return ne("http",`HTTP ${a.status}${s}`)}let i;try{i=await a.json()}catch{return ne("bad-json","The panel returned invalid JSON")}return cn(i)}function Ze(e,t={}){return k("settings.update",{patch:e},t)}var dn=5e3;function Qe(e=dn){let[t,n]=(0,ae.useState)(null),[r,o]=(0,ae.useState)(null),[a,i]=(0,ae.useState)(!0),s=(0,ae.useRef)(!0),p=(0,ae.useCallback)(async()=>{let h=await k("status",{});s.current&&(h.ok?(n(h.value),o(null)):o(h.error),i(!1))},[]);return(0,ae.useEffect)(()=>{s.current=!0,p();let h=setInterval(()=>{p()},e);return()=>{s.current=!1,clearInterval(h)}},[p,e]),{data:t,error:r,loading:a,refresh:p}}var y=require("react/jsx-runtime");function ie({size:e=14,children:t}){return(0,y.jsx)("svg",{width:e,height:e,viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",focusable:"false",children:t})}function et(e){return(0,y.jsxs)(ie,{...e,children:[(0,y.jsx)("rect",{x:"2.2",y:"3",width:"11.6",height:"7.6",rx:"1.6"}),(0,y.jsx)("path",{d:"M6.6 13.4h2.8M8 10.6v2.8"})]})}function tt(e){return(0,y.jsxs)(ie,{...e,children:[(0,y.jsx)("path",{d:"M8 2.4v5.2"}),(0,y.jsx)("path",{d:"M11.6 4.4a5 5 0 1 1-7.2 0"})]})}function nt(e){return(0,y.jsxs)(ie,{...e,children:[(0,y.jsx)("rect",{x:"2.2",y:"2.8",width:"11.6",height:"10.4",rx:"1.6"}),(0,y.jsx)("path",{d:"M5.2 6.9l1.8 1.8-1.8 1.8M8.7 10.5h2.2"})]})}function ot(e){return(0,y.jsxs)(ie,{...e,children:[(0,y.jsx)("path",{d:"M2.4 5.4h11.2M2.4 10.6h11.2"}),(0,y.jsx)("circle",{cx:"6",cy:"5.4",r:"1.6",fill:"currentColor",stroke:"none"}),(0,y.jsx)("circle",{cx:"10.4",cy:"10.6",r:"1.6",fill:"currentColor",stroke:"none"})]})}function Se(e){return(0,y.jsxs)(ie,{...e,children:[(0,y.jsx)("path",{d:"M8 2.3l5.4 2.9L8 8.1 2.6 5.2z"}),(0,y.jsx)("path",{d:"M2.6 8.6l5.4 2.9 5.4-2.9"}),(0,y.jsx)("path",{d:"M2.6 11.4l5.4 2.9 5.4-2.9"})]})}function rt(e){return(0,y.jsxs)(ie,{...e,children:[(0,y.jsx)("path",{d:"M13.4 9.4A5.5 5.5 0 1 1 12.2 4.4"}),(0,y.jsx)("path",{d:"M12.8 1.7v2.9h-2.9"})]})}function at(e){return(0,y.jsx)(ie,{...e,children:(0,y.jsx)("path",{d:"M6.2 3.8L10.4 8l-4.2 4.2"})})}function it(e){return(0,y.jsxs)(ie,{...e,children:[(0,y.jsx)("path",{d:"M6.6 3.4H3.4v9.2h9.2V9.4"}),(0,y.jsx)("path",{d:"M9.4 3.4h3.2v3.2M12.6 3.4L7.8 8.2"})]})}function ke(e){return(0,y.jsxs)(ie,{...e,children:[(0,y.jsx)("path",{d:"M8 2.6l5.7 10.2H2.3z"}),(0,y.jsx)("path",{d:"M8 6.4v3.1M8 11.5h.01"})]})}function st(e){return(0,y.jsx)(ie,{...e,children:(0,y.jsx)("path",{d:"M3 8.4l3.3 3.3L13 5"})})}var J="\u2014";function A(e){if(e==null)return J;let t=String(e);return t.length>0?t:J}function lt(e){return e.length>0?e.map(pn).join(", "):J}function pn(e){let t=e.replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").trim().toLowerCase();return t.length===0?e:t.charAt(0).toUpperCase()+t.slice(1)}function Be(e){return Xe.includes(e)}var De={status:"agentToolStatus",workspaces_list:"agentToolWorkspacesList",servers_list:"agentToolServersList",servers_lifecycle:"agentToolServersLifecycle",servers_edit:"agentToolServersEdit",autostart_manage:"agentToolAutostartManage",ui_manage:"agentToolUiManage",panel_logs:"agentToolPanelLogs"},ct={status:"agentToolDescStatus",workspaces_list:"agentToolDescWorkspacesList",servers_list:"agentToolDescServersList",servers_lifecycle:"agentToolDescServersLifecycle",servers_edit:"agentToolDescServersEdit",autostart_manage:"agentToolDescAutostartManage",ui_manage:"agentToolDescUiManage",panel_logs:"agentToolDescPanelLogs"},dt={api:"writeViaApi",file:"writeViaFile",none:"writeViaNone"},pt={enrolled:"tokenEnrolled",present:"tokenPresent",absent:"tokenAbsent",stale:"tokenStale",unknown:"tokenUnknown"},Te={"not-installed":"bootStateNotInstalled","installed-disabled":"bootStateInstalledDisabled","enabled-running":"bootStateEnabledRunning","enabled-failing":"bootStateEnabledFailing",unsupported:"bootStateUnsupported"},ht={config:"panelCliConfig",dependency:"panelCliDependency",path:"panelCliPathSource",none:"panelCliMissing"};function Pe(e,t=52){if(e.length<=t)return e;let n=e.includes("\\")?"\\":"/",r=e.split(/[\\/]/).filter(s=>s.length>0);if(r.length<4)return e;let o=/^[A-Za-z]:$/.test(r[0]??"")?3:2;if(r.length<=o)return e;let i=`${/^[\\/]/.test(e)?n:""}${r.slice(0,o).join(n)}${n}\u2026${n}${r.slice(-2).join(n)}`;return i.length<e.length?i:e}function ut(e){let t=n=>e.source===n&&e.path!==null?{source:n,path:e.path,version:e.version}:null;return{dependency:e.dependency??t("dependency"),global:e.global??t("path")}}function gt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function hn(e,t){if(Object.is(e,t))return!0;try{return JSON.stringify(e)===JSON.stringify(t)}catch{return!1}}function mt(e,t){let n={};for(let r of Object.keys(t)){let o=e[r],a=t[r];if(gt(o)&&gt(a)){let i=mt(o,a);Object.keys(i).length>0&&(n[r]=i)}else hn(o,a)||(n[r]=a)}return n}function ft(e,t){return mt(e,t)}function vt(e,t,n){let r=new Set(e);return n?r.add(t):r.delete(t),he.filter(o=>r.has(o))}var yt=require("react");async function bt(e){try{if(typeof navigator<"u"&&navigator.clipboard!==void 0)return await navigator.clipboard.writeText(e),!0}catch{}return!1}var d=require("react/jsx-runtime");function un(...e){return e.filter(t=>typeof t=="string"&&t.length>0).join(" ")}function X({icon:e,title:t,action:n,children:r}){return(0,d.jsxs)("section",{className:"hh-section",children:[(0,d.jsxs)("header",{className:"hh-section-head",children:[e===void 0?null:(0,d.jsx)("span",{className:"hh-section-icon",children:e}),(0,d.jsx)("h3",{className:"hh-section-title",children:t}),(0,d.jsx)("span",{className:"hh-section-rule","aria-hidden":"true"}),n===void 0?null:(0,d.jsx)("span",{className:"hh-section-action",children:n})]}),(0,d.jsx)("div",{className:"hh-section-body",children:r})]})}function C({label:e,children:t}){return(0,d.jsxs)("div",{className:"hh-spec",children:[(0,d.jsx)("span",{className:"hh-spec-label",children:e}),(0,d.jsx)("span",{className:"hh-spec-value",children:t})]})}function oe({children:e}){return(0,d.jsx)("code",{className:"hh-code",children:e})}function m({children:e}){return typeof e=="string"&&e.length===0?null:(0,d.jsx)("p",{className:"hh-hint",children:e})}function W({tone:e,children:t}){return(0,d.jsx)("span",{className:"hh-chip","data-tone":e??"idle",children:t})}function ce({href:e,children:t}){return(0,d.jsxs)("a",{className:"hh-link",href:e,target:"_blank",rel:"noreferrer noopener",children:[t??e,(0,d.jsx)("span",{className:"hh-link-icon","aria-hidden":"true",children:(0,d.jsx)(it,{size:11})})]})}function se({label:e,open:t=!1,children:n}){return(0,d.jsxs)("details",{className:"hh-details",open:t||void 0,children:[(0,d.jsxs)("summary",{className:"hh-summary",children:[(0,d.jsx)("span",{className:"hh-chevron","aria-hidden":"true",children:(0,d.jsx)(at,{size:12})}),e]}),(0,d.jsx)("div",{className:"hh-details-body",children:n})]})}function z({tone:e="bad",icon:t=!0,title:n,children:r}){return(0,d.jsxs)("div",{className:"hh-note","data-tone":e,role:e==="bad"?"alert":"note",children:[t?(0,d.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,d.jsx)(ke,{size:13})}):null,(0,d.jsxs)("div",{className:"hh-note-body",children:[n===void 0?null:(0,d.jsx)("span",{className:"hh-note-title",children:n}),typeof r=="string"?(0,d.jsx)("p",{children:r}):r]})]})}function Ce({title:e,detail:t}){return(0,d.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,d.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,d.jsx)(ke,{size:13})}),(0,d.jsxs)("div",{className:"hh-note-body",children:[(0,d.jsx)("strong",{children:e}),t.length>0?(0,d.jsx)("p",{children:t}):null]})]})}function be({error:e,title:t}){return e===null?null:(0,d.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,d.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,d.jsx)(ke,{size:13})}),(0,d.jsxs)("div",{className:"hh-note-body",children:[(0,d.jsx)("strong",{children:t}),(0,d.jsxs)("p",{children:[(0,d.jsx)("code",{children:e.code})," \u2014 ",e.message]})]})]})}function gn(){return(0,d.jsx)("span",{className:"hh-spinner","aria-hidden":"true"})}function b({children:e,onClick:t,disabled:n,busy:r,variant:o="default",icon:a,title:i}){let s=n===!0||r===!0;return(0,d.jsxs)("button",{type:"button",className:un("hh-btn",o!=="default"&&`hh-btn-${o}`),onClick:t,disabled:s,title:i,children:[r===!0?(0,d.jsx)(gn,{}):a,e]})}function fe({label:e,checked:t,disabled:n,onChange:r}){return(0,d.jsxs)("button",{type:"button",role:"switch",className:"hh-switch","aria-checked":t,disabled:n,onClick:()=>r(!t),children:[(0,d.jsx)("span",{className:"hh-switch-track","aria-hidden":"true",children:(0,d.jsx)("span",{className:"hh-switch-knob"})}),(0,d.jsx)("span",{className:"hh-check-label",children:e})]})}function wt({label:e,checked:t,disabled:n,onChange:r}){return(0,d.jsxs)("label",{className:"hh-check",children:[(0,d.jsx)("input",{type:"checkbox",checked:t,disabled:n,onChange:o=>r(o.target.checked)}),(0,d.jsx)("span",{className:"hh-check-label",children:e})]})}function me({value:e,options:t,disabled:n,label:r,onChange:o}){return(0,d.jsx)("select",{className:"hh-select",value:e,disabled:n,"aria-label":r,onChange:a=>o(a.target.value),children:t.map(a=>(0,d.jsx)("option",{value:a.value,children:a.label},a.value))})}function ye({label:e,meta:t,path:n,hint:r,checked:o,disabled:a,onChange:i}){return(0,d.jsxs)("label",{className:"hh-choice-option","data-disabled":a===!0,children:[(0,d.jsx)("input",{type:"radio",checked:o,disabled:a,onChange:()=>i()}),(0,d.jsxs)("span",{className:"hh-choice-label",children:[(0,d.jsx)("span",{children:e}),r]}),t===void 0?null:(0,d.jsx)("span",{className:"hh-choice-meta",children:t}),n===void 0?null:(0,d.jsx)("span",{className:"hh-choice-path",title:n,children:Pe(n)})]})}function Ne({children:e}){return(0,d.jsxs)(W,{tone:"accent",children:[(0,d.jsx)(st,{size:10}),e]})}function we({text:e,copyLabel:t,copiedLabel:n}){let[r,o]=(0,yt.useState)(!1);return(0,d.jsxs)("div",{className:"hh-code-box",children:[(0,d.jsx)("textarea",{className:"hh-code-text",readOnly:!0,value:e,rows:Math.min(e.split(`
`).length,4)}),(0,d.jsx)("div",{className:"hh-btn-row",children:(0,d.jsx)(b,{variant:"ghost",onClick:()=>{bt(e).then(o)},children:r?n:t})})]})}var T=require("react/jsx-runtime");function xt({t:e,status:t,updateSettings:n,busy:r,uiStyle:o}){let a=t.settings.agentTools,i=a.allow??[],s=he.filter(h=>i.includes(h)).length,p=(h,g)=>{n(v=>({...v,agentTools:{...v.agentTools,allow:vt(v.agentTools.allow??[],h,g)}}))};return(0,T.jsxs)(X,{icon:(0,T.jsx)(ot,{}),title:e("agentTitle"),action:(0,T.jsx)(W,{children:e("agentCount",{enabled:s,total:he.length})}),children:[(0,T.jsx)(fe,{label:e("agentMaster"),checked:a.enabled,disabled:r==="settings",onChange:h=>n(g=>({...g,agentTools:{...g.agentTools,enabled:h}}))}),(0,T.jsxs)("div",{className:"hh-field-block",children:[(0,T.jsx)(fe,{label:e("reclaimAutoLabel"),checked:t.settings.reclaimToken!==!1,disabled:r==="settings",onChange:h=>n(g=>({...g,reclaimToken:h}))}),(0,T.jsx)(m,{children:e("reclaimAutoHint")})]}),(0,T.jsxs)("div",{className:"hh-field-block",children:[(0,T.jsx)(fe,{label:e("instancesNoticeLabel"),checked:t.settings.instancesNotice!==!1,disabled:r==="settings",onChange:h=>n(g=>({...g,instancesNotice:h}))}),(0,T.jsx)(m,{children:e("instancesNoticeHint")})]}),(0,T.jsx)(m,{children:e("agentApproval")}),o==="detailed"?(0,T.jsx)("div",{className:"hh-tool-cards",children:he.map(h=>(0,T.jsxs)("label",{className:"hh-tool-card",children:[(0,T.jsx)("input",{type:"checkbox",checked:i.includes(h),disabled:!a.enabled,onChange:g=>p(h,g.target.checked)}),(0,T.jsxs)("span",{className:"hh-tool-card-body",children:[(0,T.jsxs)("span",{className:"hh-tool-card-head",children:[(0,T.jsx)("span",{className:"hh-tool-card-name",children:e(De[h])}),Be(h)?(0,T.jsx)(W,{tone:"warn",children:e("agentApprovalBadge")}):null]}),(0,T.jsx)("span",{className:"hh-tool-card-desc",children:e(ct[h])})]})]},h))}):(0,T.jsx)("div",{className:"hh-tools",children:he.map(h=>(0,T.jsx)(wt,{label:(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)("span",{className:"hh-check-text",children:e(De[h])}),Be(h)?(0,T.jsx)(W,{tone:"warn",children:e("agentApprovalBadge")}):null]}),checked:i.includes(h),disabled:!a.enabled,onChange:g=>p(h,g)},h))})]})}var Et=require("react");function St(e){return Array.isArray(e)?e.filter(t=>typeof t=="string"):[]}function kt(e){if(typeof e!="object"||e===null)return null;let t=e.result;if(typeof t!="object"||t===null)return null;let{ok:n,detail:r,commands:o}=t;return n!==!1?null:{detail:typeof r=="string"?r:"",commands:St(o)}}function Tt(e){return typeof e!="object"||e===null||Array.isArray(e)?null:{ok:e.ok===!0,action:e.action==="uninstall"?"uninstall":"install",detail:typeof e.detail=="string"?e.detail:"",commands:St(e.commands),mechanism:e.mechanism??null}}var mn=["enabled-running","enabled-failing","installed-disabled"];function Pt(e,t){let n=e.filter(a=>a.available).map(a=>a.mechanism),r=n.filter(a=>a!=="unsupported"),o=["auto",...r.length>0?r:n];return o.includes(t)||o.push(t),o}function Ct(e,t){return e!==null&&e!==t}function fn(e,t){return e===null||e.ok?!1:e.action==="install"?mn.includes(t):t==="not-installed"}function Nt(e,t,n,r){return e!==null&&e.state===n&&e.mechanism===r?e:t!==null&&t.mechanism!==r||fn(t,n)?null:t}var w=require("react/jsx-runtime");function Rt({t:e,status:t,run:n,updateSettings:r,busy:o,uiStyle:a}){let i=t.boot,s=t.settings.autostart,p=i.candidates??[],h=i.commands??[],[g,v]=(0,Et.useState)(null),F=o==="boot.install"||o==="boot.uninstall",N=Pt(p,s.mechanism).map(I=>({value:I,label:I==="auto"?e("bootMechanismAuto"):I})),E=Ct(i.mechanism,s.mechanism),G=I=>p.find(H=>H.mechanism===I)?.reason??null,_=s.mechanism==="auto"?e("bootMechanismAutoHint"):G(s.mechanism),x=i.mechanism===null?null:G(i.mechanism),B=i.mechanism!==null,Q=t.panel.reachable&&!E&&!B,ee=t.panel.reachable&&E,te=I=>e(I==="install"?"bootActionInstall":"bootActionUninstall"),q=async I=>{let H=await n(`boot.${I}`,async()=>I==="install"?k("boot.install",s.mechanism==="auto"?{}:{mechanism:s.mechanism}):k("boot.uninstall",{}));if(!H.ok){v(null);return}let re=kt(H.value);v(re===null?null:{ok:!1,action:I,detail:re.detail,commands:re.commands,state:i.state,mechanism:i.mechanism})},pe=Tt(s.lastAttempt),L=Nt(g,pe,i.state,i.mechanism);return(0,w.jsxs)(X,{icon:(0,w.jsx)(tt,{}),title:e("bootTitle"),action:(0,w.jsx)(me,{value:s.mechanism,options:N,label:e("bootMechanism"),disabled:o==="settings"||F,onChange:I=>r(H=>({...H,autostart:{...H.autostart,mechanism:I}}))}),children:[_!==null&&_.length>0?(0,w.jsx)(m,{children:_}):null,Q?(0,w.jsx)(m,{children:e("bootHandover")}):null,ee?(0,w.jsx)(z,{tone:"warn",children:e("bootSwitchRetires")}):null,(0,w.jsxs)("div",{className:"hh-btn-row",children:[(0,w.jsx)(b,{variant:B?"default":"primary",disabled:s.mechanism==="unsupported",busy:o==="boot.install",onClick:()=>{q("install")},children:e(E?"bootSwitchMode":"bootEnabled")}),(0,w.jsx)(b,{disabled:!B,busy:o==="boot.uninstall",onClick:()=>{q("uninstall")},children:e("bootUninstall")}),(0,w.jsx)(b,{variant:"ghost",busy:o==="boot.verify",onClick:()=>{n("boot.verify",()=>k("boot.verify",{}))},children:e("bootRecheck")})]}),s.enabled&&i.state==="not-installed"?(0,w.jsx)(z,{tone:"warn",children:e("bootRequestedNotInstalled")}):null,L!==null&&!L.ok?(0,w.jsxs)("div",{className:"hh-section-body",children:[(0,w.jsx)(Ce,{title:e("bootAttemptFailed",{action:te(L.action)}),detail:L.detail.length>0?L.detail:e("bootAttemptNoDetail")}),L.commands.length>0?(0,w.jsxs)(w.Fragment,{children:[(0,w.jsx)(m,{children:e("bootAttemptCommands")}),(0,w.jsx)(we,{text:L.commands.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null]}):null,L!==null&&L.ok?(0,w.jsx)(m,{children:e("bootAttemptSucceeded",{action:te(L.action),detail:L.detail})}):null,h.length>0?(0,w.jsxs)(se,{label:e("bootCommandsLabel"),open:a==="detailed",children:[(0,w.jsx)(m,{children:e("bootCommandsExplain")}),(0,w.jsx)(we,{text:h.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null,(0,w.jsxs)(se,{label:e("details"),open:a==="detailed",children:[(0,w.jsx)(C,{label:e("bootState"),children:e(Te[i.state]??"bootStateUnsupported")}),(0,w.jsx)(C,{label:e("bootBootCapable"),children:i.bootCapable?e("yes"):e("no")}),(0,w.jsx)(C,{label:e("bootPrivileged"),children:i.privileged?e("yes"):e("no")}),(0,w.jsx)(C,{label:e("bootUnitPath"),children:(0,w.jsx)(oe,{children:A(i.unitPath)})}),(0,w.jsx)(C,{label:e("bootMechanism"),children:A(i.mechanism)}),x===null?null:(0,w.jsx)(m,{children:x}),i.detail.length>0?(0,w.jsx)(m,{children:i.detail}):null]})]})}var O=require("react/jsx-runtime");function vn(e){return e.defaultEntryId??"dsh"}function At({t:e,status:t,run:n,busy:r}){let o=t.entries??[],a=t.settings.manageDsh===!0,i=t.boot.platform==="win32",s=t.surface==="desktop",p=vn(t),h=g=>{if(g){let v={id:p,autostart:!0};n("entries.apply",()=>k("entries.apply",{intents:[v]}))}else n("entries.remove",()=>k("entries.remove",{id:p}))};return(0,O.jsxs)(X,{icon:(0,O.jsx)(nt,{}),title:e("entriesTitle"),children:[(0,O.jsx)(fe,{label:e("entriesManage",{id:p}),checked:s?!1:a,disabled:r!==null||s,onChange:h}),s?(0,O.jsx)(z,{tone:"warn",children:e("entriesManageDesktop",{id:p})}):(0,O.jsx)(m,{children:e("entriesManageNote",{id:p})}),i?(0,O.jsx)(z,{tone:"warn",children:e("entriesManageWinWarning",{id:p})}):null,o.length===0?(0,O.jsx)(m,{children:e("entriesEmpty",{id:p})}):(0,O.jsx)("div",{className:"hh-list",children:o.map(g=>{let v=g.live;return(0,O.jsxs)("div",{className:"hh-item",children:[(0,O.jsxs)("span",{className:"hh-item-main",children:[(0,O.jsx)("span",{className:"hh-item-name",children:g.intent.id}),(0,O.jsx)(W,{tone:g.exists?"ok":"bad",children:g.exists?e("entriesExists"):e("entriesMissing")}),(0,O.jsx)(W,{children:g.managed?e("entriesManaged"):e("entriesUnmanaged")}),g.drift.length>0?(0,O.jsx)(W,{tone:"warn",children:`${e("entriesDrift")} ${lt(g.drift)}`}):null]}),(0,O.jsx)("span",{className:"hh-item-spacer"}),(0,O.jsx)("span",{className:"hh-item-meta",children:v===null?e("entriesNotRunning"):`${A(v.status)}${v.pid===null?"":` \xB7 pid ${v.pid}`}`})]},g.intent.id)})})]})}var le=require("react");var l=require("react/jsx-runtime"),bn={absent:"panelTokenWarnAbsent",present:"panelTokenWarnPresent",stale:"panelTokenWarnStale"};function yn(e){if(e.token!=="enrolled")return e.token!=="unknown"?bn[e.token]:e.url===null?void 0:"panelTokenWarnUnreachable"}function wn(e,t){if(!e.ok)return t("panelTokenRegenerateFailed",{message:e.error.message});let n=e.value?.panel;return n!==void 0&&n.detail.length>0?n.detail:t("panelTokenRegenerated")}function xn(e,t){return e.ok?e.value?.detail||t("panelStopped"):e.error.code==="client"?t("panelStopping"):t("panelStopFailed",{message:e.error.message})}function It(e,t,n){let r=n==="start"?"panelStartFailed":"panelReplaceFailed";if(!e.ok)return t(r,{message:e.error.message});let o=e.value;return o?.ok===!1?t(r,{message:o.detail??""}):o?.detail&&o.detail.length>0?o.detail:null}function Sn({value:e,label:t,hint:n,invalidLabel:r,placeholder:o,disabled:a,onChange:i}){let[s,p]=(0,le.useState)(e===null?"":String(e));(0,le.useEffect)(()=>{p(e===null?"":String(e))},[e]);let h=s.trim()===""?null:Number(s),g=h!==null&&(!Number.isInteger(h)||h<1||h>65535),v=()=>{if(g){p(e===null?"":String(e));return}h!==e&&i(h)};return(0,l.jsxs)("div",{className:"hh-field-block",children:[(0,l.jsxs)("div",{className:"hh-field",children:[(0,l.jsx)("label",{className:"hh-field-label",htmlFor:"hh-panel-port",children:t}),(0,l.jsx)("input",{id:"hh-panel-port",className:"hh-input",type:"number",value:s,placeholder:o,disabled:a,onChange:F=>p(F.target.value),onBlur:v,onKeyDown:F=>{F.key==="Enter"&&v()}})]}),(0,l.jsx)(m,{children:g?r:n})]})}function Ht({t:e,status:t,run:n,updateSettings:r,busy:o,uiStyle:a}){let i=t.panel,s=t.cli,p=t.instances??[],h=s?.prefer??t.settings.cli?.prefer??"pinned",[g,v]=(0,le.useState)(!1),[F,M]=(0,le.useState)(null),[N,E]=(0,le.useState)(null),[G,_]=(0,le.useState)(!1),[x,B]=(0,le.useState)(null),[Q,ee]=(0,le.useState)(null),te=yn(i),q=s?.version??null,pe=q!==null&&i.version!==null,L=i.reachable&&pe&&q!==i.version,{dependency:I,global:H}=s===void 0?{dependency:null,global:null}:ut(s),re=s===void 0?[]:[`pnpm add -g home-hosted@${s.expectedRange}`,`npm install -g home-hosted@${s.expectedRange}`],D=P=>{r(U=>({...U,cli:{...U.cli,prefer:P}}))},K=async()=>{let P=await n("cli.installGlobal",()=>k("cli.installGlobal",{}));if(!P.ok){M(e("panelInstallFailed",{message:P.error.message}));return}let U=P.value;U?.ok===!1?M(U.output&&U.output.length>0?U.output:e("panelInstallFailed",{message:U.detail??""})):M(typeof U?.output=="string"?U.output:null)},j=async()=>{E(wn(await n("panel.reclaimToken",()=>k("panel.reclaimToken",{})),e))},u=async()=>{ee(It(await n("panel.start",()=>k("panel.start",{})),e,"start"))},Y=async()=>{v(!1),ee(It(await n("panel.takeover",()=>k("panel.takeover",{})),e,"replace"))},R=async()=>{_(!1),B(e("panelStopping")),B(xn(await n("panel.stop",()=>k("panel.stop",{})),e))};return(0,l.jsxs)(X,{icon:(0,l.jsx)(et,{}),title:e("panelTitle"),children:[te===void 0?null:(0,l.jsxs)(z,{tone:"warn",title:e("panelTokenWarningTitle"),children:[(0,l.jsx)("p",{children:e(te)}),i.reachable||i.token==="unknown"?null:(0,l.jsx)("p",{children:e("panelTokenWarnPanelDown")}),(0,l.jsx)("div",{className:"hh-note-actions",children:(0,l.jsx)(b,{variant:"primary",busy:o==="panel.reclaimToken",onClick:()=>{j()},children:e("panelTokenRegenerate")})})]}),N===null?null:(0,l.jsx)(m,{children:N}),s===void 0?null:(0,l.jsxs)(l.Fragment,{children:[(0,l.jsxs)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("panelCopy"),children:[(0,l.jsx)(ye,{label:e("optionsPreferPinned"),hint:(0,l.jsx)(Ne,{children:e("optionsRecommended")}),meta:I===null?void 0:A(I.version),path:I?.path??void 0,checked:h==="pinned",disabled:I===null||o==="settings",onChange:()=>D("pinned")}),(0,l.jsx)(ye,{label:e("optionsPreferGlobal"),meta:H===null?void 0:A(H.version),path:H?.path??void 0,checked:h==="global",disabled:H===null||o==="settings",onChange:()=>D("global")})]}),(0,l.jsx)(m,{children:e("panelCopyHint")}),s.source==="config"?(0,l.jsx)(m,{children:e("optionsConfigOverride")}):null,s.source==="path"&&h!=="global"?(0,l.jsx)(m,{children:e("panelCliNotPinned",{range:s.expectedRange})}):null,s.supported?null:(0,l.jsx)(z,{tone:"warn",children:e("panelCliUnsupported")}),s.launcherPath!=null&&s.launcherVersion==null?(0,l.jsx)(z,{tone:"warn",children:e("panelCliLauncherFailed")}):null]}),(0,l.jsx)(Sn,{value:t.settings.panel?.port??null,label:e("panelPort"),hint:i.reachable?e("panelPortHint"):e("panelPortFree"),invalidLabel:e("panelPortInvalid"),placeholder:i.configPort==null?void 0:String(i.configPort),disabled:i.reachable||o!==null,onChange:P=>r(U=>({...U,panel:{...U.panel,port:P}}))}),t.panelRootSource!=="legacy"?null:(0,l.jsx)(m,{children:e("panelRootLegacy")}),p.length<=1?null:(0,l.jsxs)(se,{label:e("panelInstances",{count:p.length}),open:a==="detailed",children:[p.map(P=>(0,l.jsxs)(C,{label:P.managed?e("panelInstanceManaged"):e("panelInstanceOther"),children:[(0,l.jsx)(oe,{children:P.home}),P.url===null?null:(0,l.jsxs)(l.Fragment,{children:[" \xB7 ",(0,l.jsx)(ce,{href:P.url,children:P.url})]}),` \xB7 ${P.running?e("stateAnswering"):e("stateNotAnswering")}`,P.version===null?null:` \xB7 ${P.version}`,P.hosting?` \xB7 ${e("panelInstanceHosts")}`:null]},P.home)),(0,l.jsx)(m,{children:e("panelInstancesHint")})]}),L?(0,l.jsx)(m,{children:e("panelOutdated")}):null,(0,l.jsxs)("div",{className:"hh-btn-row",children:[i.reachable?null:(0,l.jsx)(b,{variant:"primary",busy:o==="panel.start",onClick:()=>{u()},children:e("panelStart")}),i.reachable?(0,l.jsx)(b,{variant:"danger",disabled:o!==null,onClick:()=>_(!0),children:e("panelStop")}):null,L&&!g?(0,l.jsx)(b,{variant:"primary",onClick:()=>v(!0),children:e("panelReplace",{copy:e(h==="global"?"panelCopyGlobal":"panelCopyPinned")})}):null]}),x===null?null:(0,l.jsx)(m,{children:x}),Q===null?null:(0,l.jsx)(m,{children:Q}),G?(0,l.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelStopTitle"),children:(0,l.jsxs)("div",{className:"hh-note-body",children:[(0,l.jsx)("strong",{children:e("panelStopTitle")}),(0,l.jsx)("p",{children:e("panelStopBody")}),(0,l.jsxs)("div",{className:"hh-note-actions",children:[(0,l.jsx)(b,{onClick:()=>_(!1),children:e("confirmCancel")}),(0,l.jsx)(b,{variant:"danger",busy:o==="panel.stop",onClick:()=>{R()},children:e("confirmStop")})]})]})}):null,L&&g?(0,l.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelTakeoverTitle"),children:(0,l.jsxs)("div",{className:"hh-note-body",children:[(0,l.jsx)("strong",{children:e("panelTakeoverTitle")}),(0,l.jsx)("p",{children:e("panelTakeoverBody",{id:t.defaultEntryId??"dsh"})}),(0,l.jsxs)("div",{className:"hh-note-actions",children:[(0,l.jsx)(b,{onClick:()=>v(!1),children:e("confirmCancel")}),(0,l.jsx)(b,{variant:"danger",busy:o==="panel.takeover",onClick:()=>{Y()},children:e("confirmReplace")})]})]})}):null,s!==void 0&&H===null?(0,l.jsxs)(se,{label:e("optionsInstallLabel"),open:a==="detailed",children:[(0,l.jsx)(m,{children:e("optionsInstallHint")}),(0,l.jsx)(we,{text:re.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")}),(0,l.jsx)("div",{className:"hh-btn-row",children:(0,l.jsx)(b,{busy:o==="cli.installGlobal",onClick:()=>{K()},children:e("optionsInstall")})}),F===null?null:(0,l.jsx)("pre",{className:"hh-output",children:F})]}):null,(0,l.jsxs)(se,{label:e("details"),open:a==="detailed",children:[(0,l.jsxs)(C,{label:e("panelHome"),children:[(0,l.jsx)(oe,{children:i.home}),t.bootUnitName===void 0?null:(0,l.jsxs)(l.Fragment,{children:[" \xB7 ",t.bootUnitName]})]}),(0,l.jsx)(C,{label:e("panelUrl"),children:i.url===null?A(i.url):(0,l.jsx)(ce,{href:i.url,children:i.url})}),(0,l.jsx)(C,{label:e("panelVersion"),children:A(i.version)}),(0,l.jsx)(C,{label:e("panelPid"),children:A(i.pid)}),(0,l.jsx)(C,{label:e("panelWriteVia"),children:e(dt[i.writeVia]??"writeViaNone")}),(0,l.jsx)(C,{label:e("panelToken"),children:e(pt[i.token]??"tokenUnknown")}),s===void 0?null:(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(C,{label:e("panelCliSource"),children:`${e(ht[s.source]??"panelCliMissing")} \xB7 ${A(s.version)}`}),(0,l.jsx)(C,{label:e("panelCliPath"),children:(0,l.jsx)(oe,{children:A(s.path)})})]}),i.detail.length>0?(0,l.jsx)(m,{children:i.detail}):null]})]})}var ge=require("react");var Mt=require("react");var S=require("react/jsx-runtime");function Oe(e){return{id:e.id,label:e.label??"",command:e.command??"",args:(e.args??[]).join(`
`),cwd:e.cwd??"",port:e.port===null||e.port===void 0?"":String(e.port),autostart:e.autostart===void 0?"inherit":e.autostart?"on":"off",onPortConflict:e.onPortConflict??""}}function Lt(e){return e.split(`
`).map(t=>t.trim()).filter(t=>t.length>0)}function _e(e){let t=e.trim();if(t.length===0)return null;let n=Number(t);return!Number.isInteger(n)||n<1||n>65535?"invalid":n}function Ft(e){return/^[a-z0-9][a-z0-9_-]*$/.test(e)}function kn(e,t){return e.length===t.length&&e.every((n,r)=>n===t[r])}function Bt(e){let t=e.id.trim(),n=e.command.trim();if(!Ft(t)||n.length===0)return null;let r={id:t,command:n},o=e.label.trim();o.length>0&&(r.label=o);let a=Lt(e.args);a.length>0&&(r.args=a);let i=e.cwd.trim();i.length>0&&(r.cwd=i);let s=_e(e.port);return s!=="invalid"&&s!==null&&(r.port=s),e.autostart==="on"&&(r.autostart=!0),e.onPortConflict!==""&&(r.onPortConflict=e.onPortConflict),r}function Dt(e,t){let n={},r=t.label.trim();r!==(e.label??"")&&(n.label=r);let o=t.command.trim();o.length>0&&o!==(e.command??"")&&(n.command=o);let a=Lt(t.args);kn(a,e.args??[])||(n.args=a);let i=t.cwd.trim();i.length>0&&i!==(e.cwd??"")&&(n.cwd=i);let s=_e(t.port);if(s!=="invalid"&&s!==(e.port??null)&&(n.port=s),t.autostart!=="inherit"){let p=t.autostart==="on";e.autostart!==p&&(n.autostart=p)}return t.onPortConflict!==""&&t.onPortConflict!==e.onPortConflict&&(n.onPortConflict=t.onPortConflict),Object.keys(n).length>0?n:null}function ue({label:e,hint:t,children:n}){return(0,S.jsxs)("div",{className:"hh-field-block",children:[(0,S.jsxs)("div",{className:"hh-field",children:[(0,S.jsx)("span",{className:"hh-field-label",children:e}),n]}),t===void 0?null:(0,S.jsx)(m,{children:t})]})}function Ue({t:e,title:t,initial:n,submitLabel:r,busy:o,lockId:a,onSubmit:i,onCancel:s}){let[p,h]=(0,Mt.useState)(n),g=(x,B)=>h(Q=>({...Q,[x]:B})),v=p.id.trim(),F=!a&&v.length>0&&!Ft(v),M=_e(p.port),N=!a&&v.length===0,E=p.command.trim().length===0,G=o||N||E||F||M==="invalid",_=e(N||E?"fieldRequired":F?"fieldIdInvalid":"fieldPortInvalid");return(0,S.jsx)("div",{className:"hh-note",role:"group","aria-label":t,children:(0,S.jsxs)("div",{className:"hh-note-body",children:[(0,S.jsx)("strong",{children:t}),(0,S.jsx)(ue,{label:e("fieldId"),hint:e("fieldIdHint"),children:(0,S.jsx)("input",{className:"hh-input",value:p.id,readOnly:a,disabled:o,onChange:x=>g("id",x.target.value)})}),(0,S.jsx)(ue,{label:e("fieldCommand"),children:(0,S.jsx)("input",{className:"hh-input",value:p.command,disabled:o,onChange:x=>g("command",x.target.value)})}),(0,S.jsx)(ue,{label:e("fieldArgs"),hint:e("fieldArgsHint"),children:(0,S.jsx)("textarea",{className:"hh-input",rows:3,value:p.args,disabled:o,onChange:x=>g("args",x.target.value)})}),(0,S.jsx)(ue,{label:e("fieldCwd"),children:(0,S.jsx)("input",{className:"hh-input",value:p.cwd,disabled:o,onChange:x=>g("cwd",x.target.value)})}),(0,S.jsx)(ue,{label:e("fieldLabel"),children:(0,S.jsx)("input",{className:"hh-input",value:p.label,disabled:o,onChange:x=>g("label",x.target.value)})}),(0,S.jsx)(ue,{label:e("fieldPort"),hint:e("fieldPortHint"),children:(0,S.jsx)("input",{className:"hh-input",type:"number",value:p.port,placeholder:"\u2014",disabled:o,onChange:x=>g("port",x.target.value)})}),(0,S.jsx)(ue,{label:e("fieldAutostart"),children:(0,S.jsx)(me,{value:p.autostart,label:e("fieldAutostart"),disabled:o,options:[{value:"inherit",label:e("fieldInherit")},{value:"on",label:e("yes")},{value:"off",label:e("no")}],onChange:x=>g("autostart",x)})}),(0,S.jsx)(ue,{label:e("fieldOnPortConflict"),children:(0,S.jsx)(me,{value:p.onPortConflict,label:e("fieldOnPortConflict"),disabled:o,options:[{value:"",label:e("fieldInherit")},...Je.map(x=>({value:x,label:x}))],onChange:x=>g("onPortConflict",x)})}),(0,S.jsx)(m,{children:e("serversEditorHint")}),G&&!o?(0,S.jsx)(m,{children:_}):null,(0,S.jsxs)("div",{className:"hh-btn-row",children:[(0,S.jsx)(b,{variant:"primary",busy:o,disabled:G,onClick:()=>i(p),children:r}),(0,S.jsx)(b,{variant:"ghost",disabled:o,onClick:s,children:e("confirmCancel")})]})]})})}var Tn=5e3;function We(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ve(e,t){let n=e[t];return typeof n=="number"&&Number.isFinite(n)?n:null}function Ot(e,t){let n=e[t];return typeof n=="string"&&n.length>0?n:null}function _t(e){let t=e/1e3;return`${Number.isInteger(t)?t:t.toFixed(1)}s`}function Ut(e,t,n){if(!We(e))return J;if(e.enabled!==!0)return n("serversDisabled");let r=Ot(e,"mode"),o=We(e.http)?e.http:null,a;if(r==="http"||r===null&&o!==null){let s=(o===null?null:Ot(o,"path"))??"/",p=o===null?null:ve(o,"expectStatus"),h=o===null?null:ve(o,"expectStatusBelow");a=p!==null?n("serversHealthHttp",{status:p,path:s}):h!==null?n("serversHealthHttpBelow",{status:h,path:s}):n("serversHealthHttpProbe",{path:s})}else t!==null?a=n("serversHealthPort",{port:t}):a=n("serversHealthProbe");let i=ve(e,"intervalMs");return i!==null&&i!==Tn?`${a} \xB7 ${n("serversHealthEvery",{seconds:_t(i)})}`:a}function Wt(e,t){if(!We(e))return J;if(e.enabled===!1)return t("serversDisabled");let n=ve(e,"maxRetries"),r=ve(e,"baseDelayMs"),o=ve(e,"factor");return n===null||r===null||o===null?t("serversEnabled"):t("serversRestartSummary",{retries:n,base:_t(r),factor:o})}var Pn={"not-installed":"idle","installed-disabled":"warn","enabled-running":"ok","enabled-failing":"bad",unsupported:"idle"};function Cn(...e){return e.filter(t=>t!==null&&t.length>0).join(" \xB7 ")}function Nn(e,t){let{panel:n}=e;return n.reachable?{key:"panel",tone:"ok",name:t("sigPanel"),state:t("stateAnswering"),meta:A(n.version),href:n.url}:{key:"panel",tone:e.lastError===null?"idle":"bad",name:t("sigPanel"),state:t("stateNotAnswering"),meta:n.home,href:null}}function En(e,t){let{boot:n}=e,o=e.settings.autostart.enabled&&n.state==="not-installed"?"warn":Pn[n.state]??"idle",a=n.mechanism??(e.settings.autostart.mechanism==="auto"?null:e.settings.autostart.mechanism);return{key:"autostart",tone:o,name:t("sigAutostart"),state:t(Te[n.state]??"bootStateUnsupported"),meta:a??"",href:null}}function Rn(e,t){let n=e.entries??[],r=t("sigEntry",{id:e.defaultEntryId??"dsh"}),o=e.settings.manageDsh===!0,a=e.surface==="desktop",i=n.filter(g=>!g.exists).length,s=n.filter(g=>g.drift.length>0).length,p=n.find(g=>g.live!==null)?.live??null;return{key:"entry",tone:a?"idle":o?i>0?"bad":s>0?"warn":p!==null?"ok":"warn":"idle",name:r,state:t(a?"stateWebOnly":o?"stateManaged":"stateNotManaged"),meta:p===null?t("entriesNotRunning"):Cn(A(p.status),p.pid===null?null:`pid ${p.pid}`),href:null}}function Vt(e,t){return[Nn(e,t),En(e,t),Rn(e,t)]}function $t(e,t){let n=e.filter(r=>r.status==="running").length;return t("serversCount",{running:n,total:e.length})}var c=require("react/jsx-runtime");function Re(e,t){return{workspace:e,id:t}}function An(e,t){return{workspace:e,entry:t}}function In(e,t,n){return{workspace:e,id:t,patch:n}}function Hn(e,t){return{workspace:e,id:t}}function Z(e,t,n){return`${t}:${e}/${n}`}function Ee(e,t){return t!==null&&t.workspace===e?t.value:null}function Mn({t:e,workspace:t,server:n,run:r,busy:o,offline:a,onEdit:i,onDelete:s,onFreePort:p}){let h=n.status==="running";return(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(b,{variant:"ghost",disabled:a||h,busy:o===Z(t,"servers.start",n.id),onClick:()=>{r(Z(t,"servers.start",n.id),()=>k("servers.start",Re(t,n.id)))},children:e("serversStart")}),(0,c.jsx)(b,{variant:"ghost",disabled:a||!h,busy:o===Z(t,"servers.stop",n.id),onClick:()=>{r(Z(t,"servers.stop",n.id),()=>k("servers.stop",Re(t,n.id)))},children:e("serversStop")}),(0,c.jsx)(b,{variant:"ghost",disabled:a||!h,busy:o===Z(t,"servers.restart",n.id),onClick:()=>{r(Z(t,"servers.restart",n.id),()=>k("servers.restart",Re(t,n.id)))},children:e("serversRestart")}),(0,c.jsx)(b,{variant:"ghost",disabled:a,onClick:i,children:e("serversEdit")}),(0,c.jsx)(b,{variant:"ghost",disabled:a,onClick:s,children:e("serversDelete")}),n.config.port==null?null:(0,c.jsx)(b,{variant:"ghost",disabled:a,onClick:p,children:e("serversFreePort")})]})}function Ln({text:e}){return e.length===0?(0,c.jsx)(c.Fragment,{children:J}):(0,c.jsx)("span",{className:"hh-nowrap",title:e,children:(0,c.jsx)(oe,{children:e})})}function jt({t:e,status:t,run:n,busy:r,uiStyle:o,workspace:a,servers:i,serversError:s}){let p=!t.panel.reachable||r!==null,h=new Map(a===t.workspace?(t.entries??[]).map(u=>[u.intent.id,u.intent]):[]),[g,v]=(0,ge.useState)(!1),[F,M]=(0,ge.useState)(null),[N,E]=(0,ge.useState)(null),[G,_]=(0,ge.useState)(null),[x,B]=(0,ge.useState)(null),Q=Ee(a,F),ee=Ee(a,N),te=Ee(a,G),q=Ee(a,x),pe=()=>{v(!0),M(null),E(null),_(null)},L=u=>{v(!1),M({workspace:a,value:u}),E(null),_(null)},I=()=>{v(!1),M(null)},H=async u=>{let Y=Bt(u);if(Y===null)return;(await n("servers.create",()=>k("servers.create",An(a,Y)))).ok&&I()},re=async(u,Y,R)=>{let P=Dt(R.config,Y);if(P===null){M(null);return}(await n(Z(a,"servers.update",u),()=>k("servers.update",In(a,u,P)))).ok&&M(null)},D=async u=>{E(null),await n(Z(a,"servers.delete",u),()=>k("servers.delete",Hn(a,u)))},K=async u=>{_(null);let Y=await n(Z(a,"servers.freePort",u.id),()=>k("servers.freePort",Re(a,u.id)));if(!Y.ok){B({workspace:a,value:e("serversPortRefused",{message:Y.error.message})});return}let R=Y.value,P=R?.port??u.config.port??J;if(R?.free===!0){B({workspace:a,value:e("serversPortFreed",{port:P})});return}B({workspace:a,value:R?.skipped!==void 0&&R.skipped.length>0?e("serversPortSkipped"):e("serversPortHeld",{port:P})})},j=te===null?null:i.find(u=>u.id===te)??null;return(0,c.jsxs)(X,{icon:(0,c.jsx)(Se,{}),title:e("serversTitle"),action:(0,c.jsx)(W,{children:$t(i,e)}),children:[(0,c.jsxs)(m,{children:[`${e("serversWorkspace")} `,(0,c.jsx)(oe,{children:a})," \xB7 ",t.panel.url===null?e("serversHintNoPanel"):(0,c.jsxs)(c.Fragment,{children:[`${e("serversHintPanel")} `,(0,c.jsx)(ce,{href:t.panel.url,children:t.panel.url})]})]}),s===null?null:(0,c.jsx)(Ce,{title:e("errorTitle"),detail:`${s.code} \u2014 ${s.message}`}),(0,c.jsx)("div",{className:"hh-btn-row",children:(0,c.jsx)(b,{variant:"primary",disabled:p||g,onClick:pe,children:e("serversAdd")})}),g?(0,c.jsx)(Ue,{t:e,title:e("serversCreateTitle"),initial:Oe({id:"",command:""}),submitLabel:e("serversCreate"),busy:r==="servers.create",lockId:!1,onSubmit:u=>{H(u)},onCancel:I},"create"):null,j===null?null:(0,c.jsxs)(z,{tone:"warn",title:e("serversFreePortTitle",{port:A(j.config.port)}),children:[(0,c.jsx)("p",{children:e("serversFreePortBody")}),(0,c.jsxs)("div",{className:"hh-note-actions",children:[(0,c.jsx)(b,{onClick:()=>_(null),children:e("confirmCancel")}),(0,c.jsx)(b,{variant:"danger",busy:r===Z(a,"servers.freePort",j.id),onClick:()=>{K(j)},children:e("serversFreePortGo")})]})]}),q===null?null:(0,c.jsx)(m,{children:q}),i.length===0?(0,c.jsx)(m,{children:e("serversEmpty")}):(0,c.jsx)("div",{className:o==="detailed"?"hh-cards":"hh-list",children:i.map(u=>{let Y=u.status==="running",R=u.config,P=Q===u.id?(0,c.jsx)(Ue,{t:e,title:e("serversEditTitle",{id:u.id}),initial:Oe(R),submitLabel:e("serversSave"),busy:r===Z(a,"servers.update",u.id),lockId:!0,onSubmit:Ae=>{re(u.id,Ae,u)},onCancel:()=>M(null)},`edit:${u.id}`):null,U=ee===u.id?(0,c.jsxs)(z,{tone:"warn",title:e("serversDeleteTitle",{id:u.id}),children:[(0,c.jsx)("p",{children:e("serversDeleteBody",{workspace:a})}),(0,c.jsxs)("div",{className:"hh-note-actions",children:[(0,c.jsx)(b,{onClick:()=>E(null),children:e("confirmCancel")}),(0,c.jsx)(b,{variant:"danger",busy:r===Z(a,"servers.delete",u.id),onClick:()=>{D(u.id)},children:e("serversDeleteGo")})]})]}):null,$e=(0,c.jsx)(Mn,{t:e,workspace:a,server:u,run:n,busy:r,offline:p,onEdit:()=>L(u.id),onDelete:()=>{E({workspace:a,value:u.id}),M(null),v(!1)},onFreePort:()=>{_({workspace:a,value:u.id}),M(null),v(!1)}});if(o==="detailed"){let Ae=(R.args??[]).join(" "),Ie=R.cwd??"",Xt=h.get(u.id)?.persistent;return(0,c.jsxs)("article",{className:"hh-card",children:[(0,c.jsxs)("div",{className:"hh-card-head",children:[(0,c.jsx)("span",{className:"hh-item-name",children:u.id}),(0,c.jsx)(W,{tone:Y?"ok":"idle",children:A(u.status)}),Xt===!0?(0,c.jsx)("span",{title:e("serversPersistentHint"),children:(0,c.jsx)(W,{tone:"accent",children:e("serversPersistent")})}):null,(0,c.jsx)("span",{className:"hh-item-spacer"}),(0,c.jsx)("span",{className:"hh-item-actions",children:$e})]}),(0,c.jsxs)("div",{className:"hh-card-facts",children:[(0,c.jsx)(C,{label:e("serversUrl"),children:u.url===null?A(u.url):(0,c.jsx)(ce,{href:u.url,children:u.url})}),(0,c.jsx)(C,{label:e("serversPid"),children:A(u.pid)}),(0,c.jsx)(C,{label:e("serversPort"),children:A(R.port)}),(0,c.jsx)(C,{label:e("serversAutostart"),children:R.autostart===void 0?J:R.autostart?e("yes"):e("no")})]}),(0,c.jsxs)(se,{label:e("serversConfiguration"),children:[(0,c.jsx)(C,{label:e("serversCommand"),children:R.command===void 0||R.command.length===0?J:(0,c.jsx)("span",{className:"hh-nowrap",title:R.command,children:(0,c.jsx)(oe,{children:R.command})})}),(0,c.jsx)(C,{label:e("serversArgs"),children:(0,c.jsx)(Ln,{text:Ae})}),(0,c.jsx)(C,{label:e("serversCwd"),children:Ie.length===0?J:(0,c.jsx)("span",{className:"hh-nowrap",title:Ie,children:(0,c.jsx)(oe,{children:Pe(Ie)})})}),(0,c.jsx)(C,{label:e("serversOnPortConflict"),children:A(R.onPortConflict)}),(0,c.jsx)(C,{label:e("serversHealth"),children:Ut(R.health,R.port??null,e)}),(0,c.jsx)(C,{label:e("serversRestartPolicy"),children:Wt(R.restart,e)})]}),(0,c.jsx)(se,{label:e("serversRawConfig"),children:(0,c.jsx)("pre",{className:"hh-output",children:JSON.stringify(R,null,2)})}),P,U]},u.id)}return(0,c.jsxs)(ge.Fragment,{children:[(0,c.jsxs)("div",{className:"hh-item",children:[(0,c.jsxs)("span",{className:"hh-item-main",children:[(0,c.jsx)("span",{className:"hh-item-name",children:u.id}),(0,c.jsx)(W,{tone:Y?"ok":"idle",children:A(u.status)}),u.url===null?null:(0,c.jsx)(ce,{href:u.url,children:u.url})]}),(0,c.jsx)("span",{className:"hh-item-spacer"}),u.pid===null?null:(0,c.jsx)("span",{className:"hh-item-meta",children:`${e("serversPid")} ${u.pid}`}),(0,c.jsx)("span",{className:"hh-item-actions",children:$e})]}),P,U]},u.id)})})]})}var zt=require("react");var V=require("react/jsx-runtime");function Fn(e){let t=typeof e.label=="string"?e.label.trim():"";return t.length===0||t===e.id?e.id:`${e.id} \u2014 ${t}`}function Bn(e,t){return e.source==="file"?t("workspacesCountsFile",{servers:e.servers}):t("workspacesCounts",{servers:e.servers,running:e.running})}function Gt({t:e,status:t,run:n,busy:r,viewing:o,onView:a}){let i=t.workspaces??[],s=t.workspace??qe,p=t.defaultEntryId??"dsh",h=t.legacyRoot===!0||(t.lastError??"").includes("pre-0.7"),g=i.some(N=>N.source==="file"),[v,F]=(0,zt.useState)(null),M=async()=>{let N=await n("panel.migrate",()=>k("panel.migrate",{}));if(!N.ok){F(`${e("workspaceMigrateFailed")} ${N.error.message}`);return}let E=N.value,G=typeof E?.detail=="string"&&E.detail.length>0?E.detail:null;E?.ok===!1?F(G??e("workspaceMigrateFailed")):F(G??e("workspaceMigrateDone"))};return(0,V.jsxs)(X,{icon:(0,V.jsx)(Se,{}),title:e("workspacesTitle"),action:(0,V.jsx)(W,{tone:"accent",children:o}),children:[(0,V.jsx)(m,{children:e("workspacesHint",{id:p})}),i.length===0?(0,V.jsx)(m,{children:e("workspacesEmpty")}):(0,V.jsx)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("workspacesViewLabel"),children:i.map(N=>{let E=N.id===s?(0,V.jsx)(Ne,{children:e("workspacesManagedTag")}):N.id===o?(0,V.jsx)(W,{tone:"accent",children:e("workspacesViewingTag")}):void 0;return(0,V.jsx)(ye,{label:Fn(N),meta:Bn(N,e),hint:E,checked:N.id===o,onChange:()=>a(N.id)},N.id)})}),g?(0,V.jsx)(z,{tone:"warn",children:e("workspacesDegraded")}):null,h?(0,V.jsxs)(z,{tone:"warn",title:e("workspaceLegacyTitle"),children:[(0,V.jsx)("p",{children:e("workspaceLegacyBody")}),(0,V.jsx)("div",{className:"hh-note-actions",children:(0,V.jsx)(b,{variant:"primary",busy:r==="panel.migrate",onClick:()=>{M()},children:e("workspaceMigrate")})})]}):null,v===null?null:(0,V.jsx)(m,{children:v})]})}var Ve=`
.hh-root {
  --hh-line: var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.25));
  --hh-line-soft: var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.15));
  --hh-ink: var(--dsw-alias-label-primary, #1f2429);
  --hh-dim: var(--dsw-alias-label-secondary, #5b6570);
  --hh-faint: var(--dsw-alias-label-tertiary, #8b949e);
  --hh-hover: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.1));
  --hh-ok: var(--dsw-alias-state-success-primary, #22a06b);
  --hh-warn: var(--dsw-alias-state-warn-primary, #d9822b);
  --hh-warn-ink: var(--dsw-alias-state-warn-label, #96601a);
  --hh-bad: var(--dsw-alias-state-error-primary, #d64545);
  --hh-idle: var(--dsw-alias-state-idle-primary, #b3bac1);
  --hh-code: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  --hh-family: var(--dsw-font-family, inherit);
  --hh-fs: var(--dsw-font-xs-13-font-size, 13px);
  --hh-lh: var(--dsw-font-xs-13-line-height, 20px);
  --hh-fs-sm: var(--dsw-font-xxs-12-font-size, 12px);
  --hh-lh-sm: var(--dsw-font-xxs-12-line-height, 18px);
  --hh-radius: var(--dsw-radius-sm, 8px);
  --hh-tap: 150ms cubic-bezier(0.2, 0.7, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 22px;
  font-family: var(--hh-family);
  font-size: var(--hh-fs);
  line-height: var(--hh-lh);
  color: var(--hh-ink);
}

/* -- header ------------------------------------------------------------- */

.hh-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 26px;
}

.hh-title {
  margin: 0;
  font-size: var(--dsw-font-s-strong-14-font-size, 14px);
  font-weight: var(--dsw-font-s-strong-14-font-weight, 600);
  line-height: var(--dsw-font-s-strong-14-line-height, 22px);
}

.hh-head-spacer {
  flex: 1 1 auto;
}

/* -- sections ----------------------------------------------------------- */

.hh-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hh-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 22px;
}

.hh-section-icon {
  display: inline-flex;
  flex: none;
  color: var(--hh-faint);
}

.hh-section-title {
  margin: 0;
  font-size: var(--dsw-font-xs-strong-13-font-size, 13px);
  font-weight: var(--dsw-font-xs-strong-13-font-weight, 500);
  line-height: var(--dsw-font-xs-strong-13-line-height, 20px);
  white-space: nowrap;
}

/* The rule is the section's structure, not its decoration: it carries the eye
   from a title across the pane and stops there. */
.hh-section-rule {
  flex: 1 1 auto;
  height: 1px;
  background: var(--hh-line);
}

.hh-section-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.hh-section-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* -- signal readout ----------------------------------------------------- */

.hh-signals {
  display: flex;
  flex-direction: column;
  padding: 5px 0;
  border-top: 1px solid var(--hh-line);
  border-bottom: 1px solid var(--hh-line);
}

.hh-signal {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  min-width: 0;
}

.hh-signal-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--hh-idle);
}

.hh-signal[data-tone='ok'] .hh-signal-dot { background: var(--hh-ok); }
.hh-signal[data-tone='warn'] .hh-signal-dot { background: var(--hh-warn); }
.hh-signal[data-tone='bad'] .hh-signal-dot { background: var(--hh-bad); }

.hh-signal-name {
  flex: none;
  width: 84px;
  color: var(--hh-dim);
}

.hh-signal-state {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hh-signal[data-tone='bad'] .hh-signal-state { color: var(--hh-bad); }
.hh-signal[data-tone='warn'] .hh-signal-state { color: var(--hh-warn-ink); }

.hh-signal-meta {
  margin-left: auto;
  padding-left: 10px;
  flex: none;
  max-width: 55%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--hh-faint);
  font-family: var(--hh-code);
  font-size: 0.94em;
  font-variant-numeric: tabular-nums;
}

/* -- text --------------------------------------------------------------- */

.hh-hint {
  margin: 0;
  max-width: 68ch;
  color: var(--hh-dim);
  font-size: var(--hh-fs-sm);
  line-height: var(--hh-lh-sm);
}

.hh-hint-tight { margin: 0; }

.hh-code {
  font-family: var(--hh-code);
  font-size: 0.94em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.hh-strong { font-weight: 500; }

/* -- links -------------------------------------------------------------- */

.hh-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--hh-line);
  text-underline-offset: 2px;
  overflow-wrap: anywhere;
  transition: text-decoration-color var(--hh-tap), color var(--hh-tap);
}

.hh-link:hover { text-decoration-color: currentColor; }
.hh-link:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  border-radius: 2px;
}

.hh-link-icon {
  display: inline-flex;
  vertical-align: -2px;
  margin-left: 3px;
  color: var(--hh-faint);
}

/* -- spec rows ---------------------------------------------------------- */

.hh-spec {
  display: grid;
  grid-template-columns: minmax(88px, 34%) minmax(0, 1fr);
  gap: 2px 14px;
  align-items: baseline;
  font-size: var(--hh-fs);
}

.hh-spec-label { color: var(--hh-dim); }

.hh-spec-value {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* -- buttons ------------------------------------------------------------ */

.hh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--hh-line);
  border-radius: var(--hh-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--hh-fs);
  line-height: 1;
  cursor: pointer;
  transition: background var(--hh-tap), border-color var(--hh-tap), color var(--hh-tap), opacity var(--hh-tap);
}

.hh-btn:hover:not(:disabled) { background: var(--hh-hover); }
.hh-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
.hh-btn:disabled { opacity: 0.45; cursor: default; }

.hh-btn-primary {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-fill, #1f2429);
  color: var(--dsw-alias-label-primary-foreground, #fff);
}

.hh-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #3a4149); }

.hh-btn-ghost {
  border-color: transparent;
  color: var(--hh-dim);
  padding: 5px 8px;
}

.hh-btn-ghost:hover:not(:disabled) { color: var(--hh-ink); }

.hh-btn-danger {
  border-color: color-mix(in srgb, var(--hh-bad) 45%, transparent);
  color: var(--hh-bad);
}

.hh-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--hh-bad) 10%, transparent);
}

.hh-btn-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.hh-spinner {
  flex: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, currentColor 25%, transparent);
  border-top-color: currentColor;
  animation: hh-spin 0.7s linear infinite;
}

/* -- switch and checkbox ------------------------------------------------ */

.hh-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: var(--hh-fs);
  text-align: left;
  cursor: pointer;
}

.hh-switch:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
  border-radius: 4px;
}

.hh-switch-track {
  position: relative;
  flex: none;
  width: 32px;
  height: 19px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.35));
  transition: background var(--hh-tap);
}

.hh-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--dsw-alias-label-primary-foreground, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
  transition: transform var(--hh-tap);
}

.hh-switch[aria-checked='true'] .hh-switch-track { background: var(--dsw-alias-brand-primary, #1f2429); }
.hh-switch[aria-checked='true'] .hh-switch-knob { transform: translateX(13px); }
.hh-switch:disabled { opacity: 0.5; cursor: default; }

.hh-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--hh-fs);
  cursor: pointer;
}

.hh-check input {
  flex: none;
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary, #1f2429);
  cursor: inherit;
}

.hh-check:has(input:disabled) { opacity: 0.5; cursor: default; }

.hh-check-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.hh-check-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* -- choice list (which copy runs the panel) ---------------------------- */

.hh-choice {
  display: flex;
  flex-direction: column;
}

.hh-choice-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 2px 9px;
  align-items: baseline;
  padding: 7px 8px;
  border-radius: var(--hh-radius);
  cursor: pointer;
  transition: background var(--hh-tap);
}

.hh-choice-option:hover { background: var(--hh-hover); }
.hh-choice-option[data-disabled='true'] { opacity: 0.5; cursor: default; }
.hh-choice-option[data-disabled='true']:hover { background: transparent; }

.hh-choice-option input {
  grid-row: 1;
  width: 13px;
  height: 13px;
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary, #1f2429);
}

.hh-choice-label {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.hh-choice-meta {
  font-family: var(--hh-code);
  font-size: 0.94em;
  font-variant-numeric: tabular-nums;
  color: var(--hh-dim);
}

.hh-choice-path {
  grid-column: 2 / -1;
  font-family: var(--hh-code);
  font-size: 0.94em;
  color: var(--hh-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* -- disclosure --------------------------------------------------------- */

.hh-details { border-top: 1px solid var(--hh-line-soft); }

.hh-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  color: var(--hh-dim);
  font-size: var(--hh-fs-sm);
  line-height: var(--hh-lh-sm);
  cursor: pointer;
  list-style: none;
  transition: color var(--hh-tap);
}

.hh-summary::-webkit-details-marker { display: none; }
.hh-summary:hover { color: var(--hh-ink); }
.hh-summary:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  border-radius: 2px;
}

.hh-chevron { transition: transform var(--hh-tap); }
.hh-details[open] .hh-chevron { transform: rotate(90deg); }

.hh-details-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 2px 0 8px;
}

.hh-details[open] .hh-details-body { animation: hh-reveal 160ms ease-out; }

/* -- chips -------------------------------------------------------------- */

.hh-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border: 1px solid var(--hh-line);
  border-radius: 999px;
  color: var(--hh-dim);
  font-size: var(--hh-fs-sm);
  line-height: 17px;
  white-space: nowrap;
}

.hh-chip[data-tone='ok'] { color: var(--hh-ok); border-color: color-mix(in srgb, var(--hh-ok) 40%, transparent); }
.hh-chip[data-tone='warn'] { color: var(--hh-warn-ink); border-color: color-mix(in srgb, var(--hh-warn) 45%, transparent); }
.hh-chip[data-tone='bad'] { color: var(--hh-bad); border-color: color-mix(in srgb, var(--hh-bad) 40%, transparent); }
.hh-chip[data-tone='accent'] {
  color: var(--hh-ink);
  border-color: color-mix(in srgb, var(--hh-ink) 25%, transparent);
  background: color-mix(in srgb, var(--hh-ink) 5%, transparent);
}

/* -- notes -------------------------------------------------------------- */

.hh-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--hh-radius);
  background: color-mix(in srgb, var(--hh-bad) 8%, transparent);
  color: var(--hh-bad);
  font-size: var(--hh-fs-sm);
  line-height: var(--hh-lh-sm);
}

.hh-note[data-tone='warn'] {
  background: color-mix(in srgb, var(--hh-warn) 12%, transparent);
  color: var(--hh-warn-ink);
}

.hh-note-icon { display: inline-flex; flex: none; margin-top: 2px; }
.hh-note-actions { display: flex; gap: 8px; margin-top: 6px; }
.hh-note-body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.hh-note-title { font-weight: 500; }
.hh-note p { margin: 0; overflow-wrap: anywhere; }
.hh-note code {
  font-family: var(--hh-code);
  font-size: 0.94em;
}

/* -- command / output boxes --------------------------------------------- */

.hh-code-box { display: flex; flex-direction: column; gap: 6px; }

.hh-code-text {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--hh-line);
  border-radius: var(--hh-radius);
  background: transparent;
  color: inherit;
  font-family: var(--hh-code);
  font-size: 0.94em;
  line-height: 1.6;
  resize: vertical;
}

.hh-output {
  max-height: 170px;
  margin: 0;
  padding: 8px 10px;
  overflow: auto;
  border-radius: var(--hh-radius);
  background: color-mix(in srgb, var(--hh-ink) 5%, transparent);
  font-family: var(--hh-code);
  font-size: 0.94em;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* -- lists (entries, servers, agent tools) ------------------------------ */

.hh-list { display: flex; flex-direction: column; }

.hh-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 0;
  border-top: 1px solid var(--hh-line-soft);
  min-width: 0;
}

.hh-item:first-child { border-top: 0; }

.hh-item-main { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.hh-item-name { font-weight: 500; }
.hh-item-meta {
  color: var(--hh-faint);
  font-size: var(--hh-fs-sm);
  font-family: var(--hh-code);
  font-variant-numeric: tabular-nums;
}
.hh-item-spacer { flex: 1 1 auto; }

.hh-item-actions {
  display: flex;
  flex: none;
  gap: 6px;
  opacity: 0.8;
  transition: opacity var(--hh-tap);
}

.hh-item:hover .hh-item-actions,
.hh-item:focus-within .hh-item-actions { opacity: 1; }

.hh-tools {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 7px 16px;
}

/* -- tool cards (detailed style) ---------------------------------------- */

.hh-tool-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px;
}

.hh-tool-card {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px 10px;
  border: 1px solid var(--hh-line);
  border-radius: var(--hh-radius);
  cursor: pointer;
  transition: background var(--hh-tap), border-color var(--hh-tap);
}

.hh-tool-card:hover { background: var(--hh-hover); }
.hh-tool-card:has(input:disabled) { opacity: 0.5; cursor: default; }
.hh-tool-card:has(input:disabled):hover { background: transparent; }
.hh-tool-card:has(input:focus-visible) {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.hh-tool-card input {
  flex: none;
  width: 14px;
  height: 14px;
  margin: 2px 0 0;
  accent-color: var(--dsw-alias-brand-primary, #1f2429);
  cursor: inherit;
}

.hh-tool-card-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.hh-tool-card-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.hh-tool-card-name { font-weight: 500; }
.hh-tool-card-desc {
  color: var(--hh-dim);
  font-size: var(--hh-fs-sm);
  line-height: var(--hh-lh-sm);
}

/* -- server cards (detailed style) -------------------------------------- */

.hh-cards { display: flex; flex-direction: column; gap: 8px; }

.hh-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 10px 11px;
  border: 1px solid var(--hh-line);
  border-radius: var(--hh-radius);
}

.hh-card-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }

/* A card is already the affordance, so its actions never hide on hover. */
.hh-card .hh-item-actions { opacity: 1; }

.hh-card-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 3px 18px;
}

/* A card's label column carries two-word labels ("On port conflict") without
   folding them onto a second line. */
.hh-card-facts .hh-spec { grid-template-columns: minmax(104px, auto) minmax(0, 1fr); }

.hh-nowrap {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* -- select ------------------------------------------------------------- */

.hh-select {
  padding: 4px 8px;
  border: 1px solid var(--hh-line);
  border-radius: var(--hh-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--hh-fs);
  cursor: pointer;
  transition: background var(--hh-tap);
}

.hh-select:hover:not(:disabled) { background: var(--hh-hover); }
.hh-select:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.hh-select:disabled { opacity: 0.45; cursor: default; }

/* -- field -------------------------------------------------------------- */

.hh-field-block {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.hh-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-width: 120px;
}

.hh-field-label { color: var(--hh-dim); font-size: var(--hh-fs-sm); }

.hh-input {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  border: 1px solid var(--hh-line);
  border-radius: var(--hh-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--hh-fs);
  font-variant-numeric: tabular-nums;
}

.hh-input:hover:not(:disabled) { background: var(--hh-hover); }
.hh-input:focus-visible { outline: 2px solid currentColor; outline-offset: 1px; }
.hh-input:disabled { opacity: 0.45; cursor: default; }

/* -- motion ------------------------------------------------------------- */

@keyframes hh-spin { to { transform: rotate(360deg); } }

@keyframes hh-reveal {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: none; }
}

@keyframes hh-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.hh-signals[data-busy='true'] .hh-signal-dot { animation: hh-pulse 1.2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .hh-root *, .hh-root *::before, .hh-root *::after {
    animation: none !important;
    transition: none !important;
  }
}

@media (max-width: 420px) {
  .hh-signal { flex-wrap: wrap; }
  .hh-signal-name { width: auto; min-width: 72px; }
  .hh-signal-meta { max-width: 100%; margin-left: 17px; padding-left: 0; }
  .hh-spec { grid-template-columns: minmax(0, 1fr); }
  .hh-tools { grid-template-columns: minmax(0, 1fr); }
  .hh-tool-cards { grid-template-columns: minmax(0, 1fr); }
  .hh-card-facts { grid-template-columns: minmax(0, 1fr); }
}
`;var f=require("react/jsx-runtime");function Dn({signal:e}){return(0,f.jsxs)("div",{className:"hh-signal","data-tone":e.tone,children:[(0,f.jsx)("span",{className:"hh-signal-dot","aria-hidden":"true"}),(0,f.jsx)("span",{className:"hh-signal-name",children:e.name}),(0,f.jsx)("span",{className:"hh-signal-state",children:e.state}),e.meta.length===0&&e.href===null?null:(0,f.jsxs)("span",{className:"hh-signal-meta",children:[e.meta,e.href===null?null:(0,f.jsxs)(f.Fragment,{children:[e.meta.length===0?null:" \xB7 ",(0,f.jsx)(ce,{href:e.href,children:e.href})]})]})]})}function Kt(e){let t=Ke(e.t),{data:n,error:r,loading:o,refresh:a}=Qe(),[i,s]=(0,$.useState)(null),[p,h]=(0,$.useState)(null),[g,v]=(0,$.useState)(null),[F,M]=(0,$.useState)([]),[N,E]=(0,$.useState)(null),[G,_]=(0,$.useState)(0),x=(0,$.useRef)(null),B=g??n?.workspace??null,Q=(0,$.useCallback)(async D=>{let K=await k("servers.list",{workspace:D});K.ok?(M(K.value),E(null)):E(K.error)},[]);(0,$.useEffect)(()=>{B!==null&&(x.current!==B&&(x.current=B,M([]),E(null)),Q(B))},[B,G,Q]);let ee=(0,$.useCallback)((D,K)=>(h(D),s(null),(async()=>{try{let j=await K();return j.ok||s(j.error),j}catch(j){let u={code:"client",message:j instanceof Error?j.message:String(j)};return s(u),{ok:!1,error:u}}finally{h(null),await a(),_(j=>j+1)}})()),[a]),te=(0,$.useCallback)(D=>{if(n===null)return;let K=ft(n.settings,D(n.settings));Object.keys(K).length!==0&&ee("settings",()=>Ze(K))},[n,ee]),q=n?.settings.uiStyle??"detailed",[pe,L]=(0,$.useState)(q);(0,$.useEffect)(()=>{L(q)},[q]);let I=D=>{L(D),te(K=>({...K,uiStyle:D}))};if(n===null)return(0,f.jsxs)("div",{className:"hh-root",children:[(0,f.jsx)("style",{children:Ve}),o?(0,f.jsx)(m,{children:t("loading")}):(0,f.jsxs)(f.Fragment,{children:[(0,f.jsx)(be,{error:r??{code:"status",message:t("statusUnavailable")},title:t("errorTitle")}),(0,f.jsx)("div",{className:"hh-btn-row",children:(0,f.jsx)(b,{onClick:()=>{a()},children:t("retry")})})]})]});let H={t,status:n,run:ee,updateSettings:te,busy:p,uiStyle:pe},re=B??n.workspace??"default";return(0,f.jsxs)("div",{className:"hh-root",children:[(0,f.jsx)("style",{children:Ve}),(0,f.jsxs)("header",{className:"hh-head",children:[(0,f.jsx)("h2",{className:"hh-title",children:t("tab")}),(0,f.jsx)("span",{className:"hh-head-spacer"}),(0,f.jsx)(me,{value:pe,label:t("uiStyleLabel"),disabled:p==="settings",options:[{value:"detailed",label:t("uiStyleDetailed")},{value:"compact",label:t("uiStyleCompact")}],onChange:D=>I(D)}),(0,f.jsx)(b,{variant:"ghost",icon:(0,f.jsx)(rt,{size:13}),busy:p==="status.refresh",onClick:()=>{ee("status.refresh",()=>k("status",{refresh:!0}))},children:t("refresh")})]}),(0,f.jsx)("div",{className:"hh-signals","data-busy":p!==null,children:Vt(n,t).map(D=>(0,f.jsx)(Dn,{signal:D},D.key))}),n.lastError===null?null:(0,f.jsx)(be,{error:{code:"panel",message:n.lastError},title:t("errorTitle")}),(0,f.jsx)(be,{error:r,title:t("errorTitle")}),(0,f.jsx)(be,{error:i,title:t("errorTitle")}),(0,f.jsx)(Ht,{...H}),(0,f.jsx)(Rt,{...H}),(0,f.jsx)(At,{...H}),(0,f.jsx)(xt,{...H}),(0,f.jsx)(Gt,{...H,viewing:re,onView:v}),(0,f.jsx)(jt,{...H,workspace:re,servers:F,serversError:N})]})}var On=["slots","locale"],Yt="[dsh-home-hosted]";function de(e,t){t===void 0?console.warn(`${Yt} ${e}`):console.warn(`${Yt} ${e}`,t)}function qt(e,t){try{let n=e.get?.(t);if(n!=null)return n}catch{}try{let n=e[t];if(n!=null)return n}catch{}}function Jt(e,t,n){if(typeof e.effect=="function")try{e.effect(t,n);return}catch(r){de(`registering the effect "${n}" failed`,r);return}try{t()}catch(r){de(`the effect "${n}" failed`,r)}}function _n(e){try{let t=qt(e,"locale"),n=Ge(t);t===void 0?de("the locale service is unavailable; the page keeps its bundled English copy"):Jt(e,()=>{let o=[];try{o.push(t.register(xe,{en:Me,zh:je}))}catch(a){de("registering the dictionaries failed",a)}return()=>{for(let a of o)try{a()}catch(i){de("disposing a dictionary failed",i)}}},"dsh-home-hosted: dictionaries");let r=qt(e,"slots");if(r===void 0){de("the slots service is unavailable; the settings section was not registered");return}Jt(e,()=>{try{return r.inject("settings.section",()=>{try{return r.register({name:"settings.section",id:"home-hosted",order:60,label:()=>n("tab"),locale:xe,inject:()=>({t:n})},Kt)}catch(o){return de("registering the settings section failed",o),()=>{}}})}catch(o){return de("injecting into settings.section failed",o),()=>{}}},"dsh-home-hosted: settings section")}catch(t){de("client bootstrap failed",t)}}

return module.exports; } });
