window.__ModuleLoader__.load({ id: "dsh-home-hosted", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";var Ne=Object.defineProperty;var Kt=Object.getOwnPropertyDescriptor;var Yt=Object.getOwnPropertyNames;var qt=Object.prototype.hasOwnProperty;var Jt=(e,t)=>{for(var n in t)Ne(e,n,{get:t[n],enumerable:!0})},Xt=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of Yt(t))!qt.call(e,o)&&o!==n&&Ne(e,o,{get:()=>t[o],enumerable:!(r=Kt(t,o))||r.enumerable});return e};var Zt=e=>Xt(Ne({},"__esModule",{value:!0}),e);var Ln={};Jt(Ln,{apply:()=>Mn,inject:()=>Hn});module.exports=Zt(Ln);var ve="homeHosted",Ee={tab:"Home Hosted",loading:"Loading\u2026",refresh:"Refresh",retry:"Retry",errorTitle:"Error",statusUnavailable:"The panel did not answer.",yes:"Yes",no:"No",copy:"Copy",copied:"Copied",details:"Details",uiStyleLabel:"Page style",uiStyleDetailed:"Detailed",uiStyleCompact:"Compact",workspacesTitle:"Workspaces",workspacesHint:"Every workspace this panel serves. Viewing one decides what this page lists; the plugin manages exactly one for reconcile, the {id} entry and boot autostart.",workspacesViewLabel:"Workspace to view",workspacesEmpty:"The panel reports no workspaces yet.",workspacesManagedTag:"managed by the plugin",workspacesViewingTag:"viewing",workspacesCounts:"{servers} servers \xB7 {running} running",workspacesCountsFile:"{servers} in the config files",workspacesDegraded:"The panel is not answering, so these counts \u2014 and the entry list below \u2014 come from the workspace config files, not from live state.",workspaceManagedLabel:"Workspace the plugin manages",workspaceManagedHint:"Reconcile, the {id} entry and boot autostart apply to this workspace alone. Viewing another one never changes it.",workspaceLegacyTitle:"This state root still uses the pre-0.7 layout",workspaceLegacyBody:"The plugin cannot read or write its files until they move into .hh. Starting the panel once does the same move; this runs it directly.",workspaceMigrate:"Migrate state root",workspaceMigrateFailed:"The migration did not run.",workspaceMigrateDone:"The state root was migrated.",sigPanel:"Panel",sigAutostart:"Autostart",sigEntry:"{id} entry",stateAnswering:"answering",stateNotAnswering:"not answering",stateManaged:"managed",stateNotManaged:"not managed",panelTitle:"Panel",panelCopy:"Which copy runs the panel",panelCopyHint:"The pinned copy ships with this plugin; the global one is on PATH.",optionsPreferPinned:"Pinned dependency",optionsPreferGlobal:"Global install",optionsRecommended:"recommended",optionsConfigOverride:"The plugin row sets homeHostedCommand, and that always wins.",optionsInstallLabel:"Install a global copy",optionsInstallHint:"No global install was found. Install the pinned range, then choose it above:",optionsInstall:"Install globally",panelHome:"Panel root",panelUrl:"URL",panelVersion:"Version",panelPid:"PID",panelWriteVia:"Writes via",panelToken:"API token",panelCliSource:"CLI",panelCliPath:"CLI path",panelCliConfig:"configured command",panelCliDependency:"pinned dependency",panelCliPathSource:"global install (PATH)",panelCliMissing:"not found",panelCliNotPinned:"This host resolved a global home-hosted instead of the pinned copy ({range}).",panelCliUnsupported:"This home-hosted is older than the oldest release the plugin supports.",panelCliLauncherFailed:"The boot launcher did not answer, so a boot entry may fail to start the panel.",panelPort:"Panel port",panelPortHint:"Only changeable while the panel is stopped.",panelPortFree:"Leave empty to use the port in the config.",panelPortInvalid:"Enter a port between 1 and 65535.",panelStart:"Start the panel",panelStop:"Stop the panel",panelStopTitle:"Stop the running panel?",panelStopBody:"This stops the panel and every server it supervises \u2014 this session included, so the page may disconnect. An autostart entry starts them again at the next panel start.",panelStopping:"Stopping the panel\u2026",panelStopped:"The panel stopped.",panelStopFailed:"The panel did not stop: {message}",panelRootLegacy:"Adopted from ~/.home-hosted. Set HHOSTED_HOME to give this dsh its own panel.",confirmStop:"Stop",panelOutdated:"Outdated panel",panelReplace:"Restart with {copy}",panelCopyPinned:"pinned dependency",panelCopyGlobal:"global install",panelTakeoverTitle:"Restart the running panel?",panelTakeoverBody:"This stops the panel and every server it supervises \u2014 this session included, so the page disconnects. It needs the {id} entry adopted with autostart on.",confirmCancel:"Cancel",confirmReplace:"Restart",writeViaApi:"authenticated API",writeViaFile:"config file",writeViaNone:"unavailable",tokenEnrolled:"enrolled",tokenPresent:"present",tokenAbsent:"absent",tokenStale:"stale",tokenUnknown:"unknown",panelTokenWarningTitle:"The panel API token is missing or refused",panelTokenWarnAbsent:"This plugin has no API token for the panel, so it cannot read or write the panel; regenerate one.",panelTokenWarnPresent:"home-hosted holds an API token this plugin does not have, so the plugin cannot authenticate; regenerate one to replace it.",panelTokenWarnStale:"The panel refused this plugin's API token; regenerate it.",panelTokenWarnUnreachable:"The plugin could not reach the panel to check its API token, so it cannot read or write the panel; the panel may need starting.",panelTokenWarnPanelDown:"The panel is not answering right now, so it may need starting too.",panelTokenRegenerate:"Regenerate token",panelTokenRegenerated:"A fresh API token was enrolled for the panel.",panelTokenRegenerateFailed:"The token was not replaced: {message}",panelInstances:"{count} panels found",panelInstanceManaged:"managed by this plugin",panelInstanceOther:"another panel",panelInstanceHosts:"hosts this dsh",panelInstancesHint:"This plugin drives only the managed one; the others are read from their state roots and never written to.",bootTitle:"Autostart",bootEnabled:"Enable autostart",bootUninstall:"Uninstall",bootSwitchMode:"Switch autostart",bootRecheck:"Re-check",bootMechanism:"Mechanism",bootMechanismAuto:"Automatic",bootState:"State",bootStateNotInstalled:"not installed",bootStateInstalledDisabled:"installed, off",bootStateEnabledRunning:"enabled, running",bootStateEnabledFailing:"enabled, failing",bootStateUnsupported:"unsupported",bootBootCapable:"Starts before login",bootPrivileged:"This process can install it",bootUnitPath:"Unit path",bootCommandsLabel:"Install by hand",bootCommandsExplain:"This process cannot elevate. Run these commands to install autostart:",bootRequestedNotInstalled:"Autostart is requested, but no boot entry is installed.",bootActionInstall:"install",bootActionUninstall:"uninstall",bootAttemptFailed:"{action} failed",bootAttemptSucceeded:"{action} succeeded \u2014 {detail}",bootAttemptNoDetail:"The host did not explain the refusal.",bootAttemptCommands:"Run these yourself:",entriesTitle:"Managed entry",entriesManage:"Manage {id}",entriesManageNote:"Hands {id} to home-hosted: boot autostart, panel control, port reclaim.",entriesManageWinWarning:"On Windows, `{id}` is managed via the `kill` onPortConflict policy, so when it is restarted detached by another plugin it may briefly fail to boot while home-hosted reclaims the process and port.",entriesEmpty:"{id} is not managed yet.",entriesExists:"exists",entriesMissing:"missing",entriesManaged:"managed",entriesUnmanaged:"unmanaged",entriesDrift:"drift",entriesNotRunning:"not running",agentTitle:"Agent tools",agentCount:"{enabled} of {total} on",agentMaster:"Let the agent use these tools",agentApproval:"Tools that change something ask for approval first.",agentApprovalBadge:"approval",reclaimAutoLabel:"Regenerate token automatically",reclaimAutoHint:"A tool call that finds a refused token re-enrols one and retries instead of failing.",instancesNoticeLabel:"Tell the agent about other panels",instancesNoticeHint:"Adds the panel inventory to the agent's context, and asks which panel to act on when several exist.",agentToolStatus:"Status",agentToolWorkspacesList:"List workspaces",agentToolServersList:"List servers",agentToolServersLifecycle:"Start, stop, restart",agentToolServersEdit:"Create, update, delete",agentToolAutostartManage:"Manage boot autostart",agentToolUiManage:"Manage Panel UI",agentToolDescStatus:"Read the panel, the CLI copy in use and the managed entry. Nothing changes.",agentToolDescWorkspacesList:"List every workspace the panel serves, with its entry and running counts. A server id is only unique inside a workspace.",agentToolDescServersList:"List the servers of one workspace the panel supervises, with status, port and URL. A server id is only unique inside a workspace.",agentToolDescServersLifecycle:"Start, stop and restart supervised servers, in the workspace the call names.",agentToolDescServersEdit:"Create, update and delete server entries, in the workspace the call names.",agentToolDescAutostartManage:"Install or remove the boot entry that starts the panel.",agentToolDescUiManage:"Inspect, update, revert or switch the panel's own UI build.",serversTitle:"Servers",serversCount:"{running} of {total} running",serversHintPanel:"Entries are managed in the home-hosted panel:",serversHintNoPanel:"Entries cannot be managed right now: the panel is not running.",serversEmpty:"The panel reports no servers.",serversPid:"PID",serversUrl:"URL",serversCommand:"Command",serversArgs:"Args",serversCwd:"Working dir",serversPort:"Port",serversOnPortConflict:"On port conflict",serversAutostart:"Autostart",serversPersistent:"Persistent",serversPersistentHint:"Run by home-hosted's own nanny, so stopping or restarting the panel leaves it alive.",serversHealth:"Health",serversRestartPolicy:"Restart",serversConfiguration:"Configuration",serversRawConfig:"Raw config",serversDisabled:"disabled",serversEnabled:"enabled",serversHealthHttp:"HTTP {status} on {path}",serversHealthHttpBelow:"HTTP <{status} on {path}",serversHealthHttpProbe:"HTTP probe on {path}",serversHealthPort:"port {port}",serversHealthProbe:"port probe",serversHealthEvery:"every {seconds}",serversRestartSummary:"{retries} retries \xB7 {base} \u2192 \xD7{factor}",serversStart:"Start",serversStop:"Stop",serversRestart:"Restart",serversWorkspace:"Workspace",serversAdd:"Add server",serversEdit:"Edit",serversEditTitle:"Edit {id}",serversCreateTitle:"Add a server",serversEditorHint:"Only the fields you change are written; everything else keeps inheriting the workspace defaults.",serversCreate:"Create",serversSave:"Save",serversDelete:"Delete",serversDeleteTitle:"Delete {id}?",serversDeleteBody:"This removes the entry from workspace {workspace}. A running server is stopped with it.",serversDeleteGo:"Delete",serversFreePort:"Free port",serversFreePortTitle:"Free port {port}?",serversFreePortBody:"Stops whatever holds the port, unless the panel supervises it. Processes get SIGTERM first, then a forced stop.",serversFreePortGo:"Free",serversPortFreed:"Port {port} is free.",serversPortHeld:"Port {port} is still held.",serversPortSkipped:"The listener belongs to a server the panel supervises, so it was left alone.",serversPortRefused:"The port was not freed: {message}",fieldId:"Id",fieldIdHint:"Lowercase letters, digits, `_` and `-`; unique inside the workspace.",fieldIdInvalid:"An id starts with a lowercase letter or digit and uses only a-z, 0-9, _ and -.",fieldLabel:"Label",fieldCommand:"Command",fieldArgs:"Arguments",fieldArgsHint:"One argument per line.",fieldCwd:"Working directory",fieldPort:"Port",fieldPortHint:"Empty means the entry has no port.",fieldPortInvalid:"Enter a port between 1 and 65535, or leave it empty.",fieldAutostart:"Start with the panel",fieldOnPortConflict:"On port conflict",fieldInherit:"Inherit",fieldRequired:"Id and command are required."},_e={tab:"Home Hosted",loading:"\u52A0\u8F7D\u4E2D\u2026",refresh:"\u5237\u65B0",retry:"\u91CD\u8BD5",errorTitle:"\u9519\u8BEF",statusUnavailable:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\u3002",yes:"\u662F",no:"\u5426",copy:"\u590D\u5236",copied:"\u5DF2\u590D\u5236",details:"\u8BE6\u60C5",uiStyleLabel:"\u9875\u9762\u6837\u5F0F",uiStyleDetailed:"\u8BE6\u7EC6",uiStyleCompact:"\u7D27\u51D1",workspacesTitle:"\u5DE5\u4F5C\u533A",workspacesHint:"\u6B64\u9762\u677F\u63D0\u4F9B\u7684\u6240\u6709\u5DE5\u4F5C\u533A\u3002\u67E5\u770B\u54EA\u4E00\u4E2A\u51B3\u5B9A\u672C\u9875\u5217\u51FA\u4EC0\u4E48\uFF1B\u63D2\u4EF6\u53EA\u7BA1\u7406\u5176\u4E2D\u4E00\u4E2A\uFF0C\u7528\u4E8E\u534F\u8C03\u3001{id} \u6761\u76EE\u548C\u5F00\u673A\u81EA\u542F\u3002",workspacesViewLabel:"\u8981\u67E5\u770B\u7684\u5DE5\u4F5C\u533A",workspacesEmpty:"\u9762\u677F\u5C1A\u672A\u62A5\u544A\u4EFB\u4F55\u5DE5\u4F5C\u533A\u3002",workspacesManagedTag:"\u7531\u63D2\u4EF6\u7BA1\u7406",workspacesViewingTag:"\u6B63\u5728\u67E5\u770B",workspacesCounts:"{servers} \u4E2A\u670D\u52A1\u5668 \xB7 {running} \u4E2A\u8FD0\u884C\u4E2D",workspacesCountsFile:"\u914D\u7F6E\u6587\u4EF6\u4E2D {servers} \u4E2A",workspacesDegraded:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\uFF0C\u56E0\u6B64\u8FD9\u4E9B\u8BA1\u6570\u2014\u2014\u4EE5\u53CA\u4E0B\u65B9\u7684\u6761\u76EE\u5217\u8868\u2014\u2014\u6765\u81EA\u5DE5\u4F5C\u533A\u914D\u7F6E\u6587\u4EF6\uFF0C\u800C\u4E0D\u662F\u5B9E\u65F6\u72B6\u6001\u3002",workspaceManagedLabel:"\u63D2\u4EF6\u7BA1\u7406\u7684\u5DE5\u4F5C\u533A",workspaceManagedHint:"\u534F\u8C03\u3001{id} \u6761\u76EE\u548C\u5F00\u673A\u81EA\u542F\u53EA\u4F5C\u7528\u4E8E\u8FD9\u4E2A\u5DE5\u4F5C\u533A\u3002\u67E5\u770B\u5176\u4ED6\u5DE5\u4F5C\u533A\u4E0D\u4F1A\u6539\u53D8\u5B83\u3002",workspaceLegacyTitle:"\u8BE5\u72B6\u6001\u76EE\u5F55\u4ECD\u662F 0.7 \u4E4B\u524D\u7684\u5E03\u5C40",workspaceLegacyBody:"\u5728\u6587\u4EF6\u79FB\u5165 .hh \u4E4B\u524D\uFF0C\u63D2\u4EF6\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u5B83\u4EEC\u3002\u542F\u52A8\u4E00\u6B21\u9762\u677F\u5373\u53EF\u5B8C\u6210\u540C\u6837\u7684\u8FC1\u79FB\uFF1B\u6B64\u6309\u94AE\u76F4\u63A5\u6267\u884C\u8BE5\u547D\u4EE4\u3002",workspaceMigrate:"\u8FC1\u79FB\u72B6\u6001\u76EE\u5F55",workspaceMigrateFailed:"\u8FC1\u79FB\u6CA1\u6709\u6267\u884C\u3002",workspaceMigrateDone:"\u72B6\u6001\u76EE\u5F55\u5DF2\u8FC1\u79FB\u3002",sigPanel:"\u9762\u677F",sigAutostart:"\u5F00\u673A\u81EA\u542F",sigEntry:"{id} \u6761\u76EE",stateAnswering:"\u54CD\u5E94\u4E2D",stateNotAnswering:"\u672A\u54CD\u5E94",stateManaged:"\u5DF2\u63A5\u7BA1",stateNotManaged:"\u672A\u63A5\u7BA1",panelTitle:"\u9762\u677F",panelCopy:"\u7531\u54EA\u4E2A\u526F\u672C\u8FD0\u884C\u9762\u677F",panelCopyHint:"\u56FA\u5B9A\u526F\u672C\u968F\u63D2\u4EF6\u4E00\u8D77\u5B89\u88C5\uFF1B\u5168\u5C40\u526F\u672C\u6765\u81EA PATH\u3002",optionsPreferPinned:"\u56FA\u5B9A\u4F9D\u8D56",optionsPreferGlobal:"\u5168\u5C40\u5B89\u88C5",optionsRecommended:"\u63A8\u8350",optionsConfigOverride:"\u63D2\u4EF6\u884C\u4E2D\u7684 homeHostedCommand \u4F18\u5148\u7EA7\u6700\u9AD8\uFF0C\u59CB\u7EC8\u751F\u6548\u3002",optionsInstallLabel:"\u5B89\u88C5\u5168\u5C40\u526F\u672C",optionsInstallHint:"\u672A\u627E\u5230\u5168\u5C40\u5B89\u88C5\u3002\u5B89\u88C5\u56FA\u5B9A\u7248\u672C\u8303\u56F4\u540E\uFF0C\u5728\u4E0A\u65B9\u9009\u62E9\u5B83\uFF1A",optionsInstall:"\u5168\u5C40\u5B89\u88C5",panelHome:"\u9762\u677F\u6839\u76EE\u5F55",panelUrl:"URL",panelVersion:"\u7248\u672C",panelPid:"PID",panelWriteVia:"\u5199\u5165\u65B9\u5F0F",panelToken:"API \u4EE4\u724C",panelCliSource:"CLI",panelCliPath:"CLI \u8DEF\u5F84",panelCliConfig:"\u914D\u7F6E\u7684\u547D\u4EE4",panelCliDependency:"\u56FA\u5B9A\u7684\u4F9D\u8D56\u7248\u672C",panelCliPathSource:"\u5168\u5C40\u5B89\u88C5\uFF08PATH\uFF09",panelCliMissing:"\u672A\u627E\u5230",panelCliNotPinned:"\u6B64\u5BBF\u4E3B\u89E3\u6790\u5230\u7684\u662F\u5168\u5C40 home-hosted\uFF0C\u800C\u4E0D\u662F\u56FA\u5B9A\u526F\u672C\uFF08{range}\uFF09\u3002",panelCliUnsupported:"\u6B64 home-hosted \u65E9\u4E8E\u63D2\u4EF6\u652F\u6301\u7684\u6700\u8001\u7248\u672C\u3002",panelCliLauncherFailed:"\u5F00\u673A\u542F\u52A8\u5668\u6CA1\u6709\u5E94\u7B54\uFF0C\u5F00\u673A\u9879\u53EF\u80FD\u65E0\u6CD5\u542F\u52A8\u9762\u677F\u3002",panelPort:"\u9762\u677F\u7AEF\u53E3",panelPortHint:"\u4EC5\u5728\u9762\u677F\u505C\u6B62\u65F6\u53EF\u4FEE\u6539\u3002",panelPortFree:"\u7559\u7A7A\u5219\u4F7F\u7528\u914D\u7F6E\u6587\u4EF6\u4E2D\u7684\u7AEF\u53E3\u3002",panelPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\u3002",panelStart:"\u542F\u52A8\u9762\u677F",panelStop:"\u505C\u6B62\u9762\u677F",panelStopTitle:"\u505C\u6B62\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelStopBody:"\u8FD9\u4F1A\u505C\u6B62\u9762\u677F\u4EE5\u53CA\u5B83\u76D1\u7BA1\u7684\u6240\u6709\u670D\u52A1\u5668\u2014\u2014\u5305\u62EC\u672C\u4F1A\u8BDD\uFF0C\u56E0\u6B64\u672C\u9875\u9762\u53EF\u80FD\u4F1A\u65AD\u5F00\u8FDE\u63A5\u3002\u5E26\u6709\u81EA\u542F\u7684\u6761\u76EE\u4F1A\u5728\u4E0B\u6B21\u542F\u52A8\u9762\u677F\u65F6\u91CD\u65B0\u542F\u52A8\u3002",panelStopping:"\u6B63\u5728\u505C\u6B62\u9762\u677F\u2026",panelStopped:"\u9762\u677F\u5DF2\u505C\u6B62\u3002",panelStopFailed:"\u9762\u677F\u672A\u80FD\u505C\u6B62\uFF1A{message}",panelRootLegacy:"\u6CBF\u7528\u4E86 ~/.home-hosted\u3002\u8BBE\u7F6E HHOSTED_HOME \u53EF\u8BA9\u6B64 dsh \u4F7F\u7528\u81EA\u5DF1\u7684\u9762\u677F\u3002",confirmStop:"\u505C\u6B62",panelOutdated:"\u9762\u677F\u5DF2\u8FC7\u65F6",panelReplace:"\u4F7F\u7528{copy}\u91CD\u542F",panelCopyPinned:"\u56FA\u5B9A\u4F9D\u8D56",panelCopyGlobal:"\u5168\u5C40\u5B89\u88C5",panelTakeoverTitle:"\u91CD\u542F\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelTakeoverBody:"\u8FD9\u4F1A\u505C\u6B62\u9762\u677F\u4EE5\u53CA\u5B83\u76D1\u7BA1\u7684\u6240\u6709\u670D\u52A1\u5668\u2014\u2014\u5305\u62EC\u672C\u4F1A\u8BDD\uFF0C\u56E0\u6B64\u672C\u9875\u9762\u4F1A\u65AD\u5F00\u8FDE\u63A5\u3002\u4EC5\u5F53 {id} \u6761\u76EE\u5DF2\u88AB\u63A5\u7BA1\u4E14\u542F\u7528\u81EA\u542F\u65F6\u624D\u53EF\u7528\u3002",confirmCancel:"\u53D6\u6D88",confirmReplace:"\u91CD\u542F",writeViaApi:"\u5DF2\u8BA4\u8BC1 API",writeViaFile:"\u914D\u7F6E\u6587\u4EF6",writeViaNone:"\u4E0D\u53EF\u7528",tokenEnrolled:"\u5DF2\u767B\u8BB0",tokenPresent:"\u5DF2\u5B58\u5728",tokenAbsent:"\u4E0D\u5B58\u5728",tokenStale:"\u5DF2\u5931\u6548",tokenUnknown:"\u672A\u77E5",panelTokenWarningTitle:"\u9762\u677F API \u4EE4\u724C\u7F3A\u5931\u6216\u5DF2\u88AB\u62D2\u7EDD",panelTokenWarnAbsent:"\u672C\u63D2\u4EF6\u6CA1\u6709\u6B64\u9762\u677F\u7684 API \u4EE4\u724C\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u9762\u677F\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u4E00\u4E2A\u3002",panelTokenWarnPresent:"home-hosted \u6301\u6709\u4E00\u4E2A\u672C\u63D2\u4EF6\u6CA1\u6709\u7684 API \u4EE4\u724C\uFF0C\u63D2\u4EF6\u65E0\u6CD5\u901A\u8FC7\u8BA4\u8BC1\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u4E00\u4E2A\u4EE5\u66FF\u6362\u5B83\u3002",panelTokenWarnStale:"\u9762\u677F\u62D2\u7EDD\u4E86\u672C\u63D2\u4EF6\u7684 API \u4EE4\u724C\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u3002",panelTokenWarnUnreachable:"\u672C\u63D2\u4EF6\u65E0\u6CD5\u8BBF\u95EE\u9762\u677F\u4EE5\u68C0\u67E5\u5176 API \u4EE4\u724C\uFF0C\u56E0\u6B64\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u9762\u677F\uFF1B\u9762\u677F\u53EF\u80FD\u8FD8\u9700\u8981\u5148\u542F\u52A8\u3002",panelTokenWarnPanelDown:"\u9762\u677F\u5F53\u524D\u6CA1\u6709\u54CD\u5E94\uFF0C\u53EF\u80FD\u8FD8\u9700\u8981\u5148\u542F\u52A8\u9762\u677F\u3002",panelTokenRegenerate:"\u91CD\u65B0\u751F\u6210\u4EE4\u724C",panelTokenRegenerated:"\u5DF2\u4E3A\u9762\u677F\u767B\u8BB0\u65B0\u4EE4\u724C\u3002",panelTokenRegenerateFailed:"\u4EE4\u724C\u672A\u66FF\u6362\uFF1A{message}",panelInstances:"\u53D1\u73B0 {count} \u4E2A\u9762\u677F",panelInstanceManaged:"\u7531\u672C\u63D2\u4EF6\u7BA1\u7406",panelInstanceOther:"\u5176\u4ED6\u9762\u677F",panelInstanceHosts:"\u6258\u7BA1\u5F53\u524D dsh",panelInstancesHint:"\u672C\u63D2\u4EF6\u53EA\u9A71\u52A8\u88AB\u7BA1\u7406\u7684\u90A3\u4E00\u4E2A\uFF1B\u5176\u4ED6\u9762\u677F\u4EC5\u4ECE\u5176\u72B6\u6001\u76EE\u5F55\u8BFB\u53D6\uFF0C\u7EDD\u4E0D\u5199\u5165\u3002",bootTitle:"\u5F00\u673A\u81EA\u542F",bootEnabled:"\u542F\u7528\u5F00\u673A\u81EA\u542F",bootUninstall:"\u5378\u8F7D",bootSwitchMode:"\u5207\u6362\u81EA\u542F\u673A\u5236",bootRecheck:"\u91CD\u65B0\u68C0\u67E5",bootMechanism:"\u673A\u5236",bootMechanismAuto:"\u81EA\u52A8",bootState:"\u72B6\u6001",bootStateNotInstalled:"\u672A\u5B89\u88C5",bootStateInstalledDisabled:"\u5DF2\u5B89\u88C5\uFF0C\u672A\u542F\u7528",bootStateEnabledRunning:"\u5DF2\u542F\u7528\uFF0C\u8FD0\u884C\u4E2D",bootStateEnabledFailing:"\u5DF2\u542F\u7528\uFF0C\u542F\u52A8\u5931\u8D25",bootStateUnsupported:"\u4E0D\u652F\u6301",bootBootCapable:"\u767B\u5F55\u524D\u542F\u52A8",bootPrivileged:"\u672C\u8FDB\u7A0B\u53EF\u5B89\u88C5",bootUnitPath:"\u5355\u5143\u6587\u4EF6\u8DEF\u5F84",bootCommandsLabel:"\u624B\u52A8\u5B89\u88C5",bootCommandsExplain:"\u672C\u8FDB\u7A0B\u65E0\u6CD5\u63D0\u6743\u3002\u8BF7\u81EA\u884C\u6267\u884C\u4EE5\u4E0B\u547D\u4EE4\u6765\u5B89\u88C5\u81EA\u542F\uFF1A",bootRequestedNotInstalled:"\u5DF2\u8BF7\u6C42\u5F00\u673A\u81EA\u542F\uFF0C\u4F46\u5C1A\u672A\u5B89\u88C5\u4EFB\u4F55\u5F00\u673A\u9879\u3002",bootActionInstall:"\u5B89\u88C5",bootActionUninstall:"\u5378\u8F7D",bootAttemptFailed:"{action}\u5931\u8D25",bootAttemptSucceeded:"{action}\u6210\u529F \u2014 {detail}",bootAttemptNoDetail:"\u5BBF\u4E3B\u6CA1\u6709\u8BF4\u660E\u5931\u8D25\u539F\u56E0\u3002",bootAttemptCommands:"\u4F60\u53EF\u4EE5\u81EA\u884C\u8FD0\u884C\u4EE5\u4E0B\u547D\u4EE4\uFF1A",entriesTitle:"\u53D7\u7BA1\u6761\u76EE",entriesManage:"\u63A5\u7BA1 {id}",entriesManageNote:"\u628A {id} \u4EA4\u7ED9 home-hosted\uFF1A\u5F00\u673A\u81EA\u542F\u3001\u9762\u677F\u63A7\u5236\u3001\u7AEF\u53E3\u56DE\u6536\u3002",entriesManageWinWarning:"\u5728 Windows \u4E0A\uFF0C`{id}` \u901A\u8FC7 `kill` \u7AEF\u53E3\u51B2\u7A81\u7B56\u7565\u7BA1\u7406\uFF1B\u5F53\u5B83\u88AB\u5176\u4ED6\u63D2\u4EF6\u4EE5\u5206\u79BB\u65B9\u5F0F\u91CD\u542F\u65F6\uFF0Chome-hosted \u56DE\u6536\u8FDB\u7A0B\u4E0E\u7AEF\u53E3\u671F\u95F4\u53EF\u80FD\u77ED\u6682\u65E0\u6CD5\u542F\u52A8\u3002",entriesEmpty:"\u5C1A\u672A\u63A5\u7BA1 {id}\u3002",entriesExists:"\u5B58\u5728",entriesMissing:"\u7F3A\u5931",entriesManaged:"\u5DF2\u63A5\u7BA1",entriesUnmanaged:"\u672A\u63A5\u7BA1",entriesDrift:"\u6F02\u79FB",entriesNotRunning:"\u672A\u8FD0\u884C",agentTitle:"Agent \u5DE5\u5177",agentCount:"\u5DF2\u5F00\u542F {enabled}/{total}",agentMaster:"\u5141\u8BB8 Agent \u8C03\u7528\u8FD9\u4E9B\u5DE5\u5177",agentApproval:"\u4F1A\u6539\u53D8\u72B6\u6001\u7684\u5DE5\u5177\u5728\u8FD0\u884C\u524D\u4F1A\u8BF7\u6C42\u6279\u51C6\u3002",agentApprovalBadge:"\u9700\u6279\u51C6",reclaimAutoLabel:"\u88AB\u62D2\u7EDD\u65F6\u81EA\u52A8\u91CD\u65B0\u751F\u6210\u4EE4\u724C",reclaimAutoHint:"\u5DE5\u5177\u8C03\u7528\u9047\u5230\u88AB\u62D2\u7EDD\u7684\u4EE4\u724C\u65F6\u4F1A\u91CD\u65B0\u767B\u8BB0\u5E76\u91CD\u8BD5\uFF0C\u800C\u4E0D\u662F\u76F4\u63A5\u5931\u8D25\u3002",instancesNoticeLabel:"\u5411 Agent \u8BF4\u660E\u5176\u4ED6\u9762\u677F",instancesNoticeHint:"\u628A\u9762\u677F\u6E05\u5355\u52A0\u5165 Agent \u4E0A\u4E0B\u6587\uFF1B\u5B58\u5728\u591A\u4E2A\u9762\u677F\u65F6\u4F1A\u5148\u8BE2\u95EE\u8981\u64CD\u4F5C\u54EA\u4E00\u4E2A\u3002",agentToolStatus:"\u67E5\u770B\u72B6\u6001",agentToolWorkspacesList:"\u5217\u51FA\u5DE5\u4F5C\u533A",agentToolServersList:"\u5217\u51FA\u670D\u52A1\u5668",agentToolServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u3001\u91CD\u542F",agentToolServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u3001\u5220\u9664",agentToolAutostartManage:"\u7BA1\u7406\u5F00\u673A\u81EA\u542F",agentToolUiManage:"\u7BA1\u7406\u9762\u677F UI",agentToolDescStatus:"\u8BFB\u53D6\u9762\u677F\u3001\u6B63\u5728\u4F7F\u7528\u7684 CLI \u526F\u672C\u548C\u53D7\u7BA1\u6761\u76EE\u3002\u4E0D\u6539\u53D8\u4EFB\u4F55\u72B6\u6001\u3002",agentToolDescWorkspacesList:"\u5217\u51FA\u9762\u677F\u63D0\u4F9B\u7684\u6240\u6709\u5DE5\u4F5C\u533A\u53CA\u5176\u6761\u76EE\u6570\u548C\u8FD0\u884C\u6570\u3002\u670D\u52A1\u5668 id \u53EA\u5728\u5DE5\u4F5C\u533A\u5185\u552F\u4E00\u3002",agentToolDescServersList:"\u5217\u51FA\u67D0\u4E2A\u5DE5\u4F5C\u533A\u4E2D\u88AB\u9762\u677F\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u53CA\u5176\u72B6\u6001\u3001\u7AEF\u53E3\u548C URL\u3002\u670D\u52A1\u5668 id \u53EA\u5728\u5DE5\u4F5C\u533A\u5185\u552F\u4E00\u3002",agentToolDescServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u548C\u91CD\u542F\u53D7\u76D1\u7BA1\u7684\u670D\u52A1\u5668\uFF0C\u4F5C\u7528\u4E8E\u8C03\u7528\u6240\u6307\u5B9A\u7684\u5DE5\u4F5C\u533A\u3002",agentToolDescServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u548C\u5220\u9664\u670D\u52A1\u5668\u6761\u76EE\uFF0C\u4F5C\u7528\u4E8E\u8C03\u7528\u6240\u6307\u5B9A\u7684\u5DE5\u4F5C\u533A\u3002",agentToolDescAutostartManage:"\u5B89\u88C5\u6216\u79FB\u9664\u542F\u52A8\u9762\u677F\u7684\u5F00\u673A\u9879\u3002",agentToolDescUiManage:"\u67E5\u770B\u3001\u66F4\u65B0\u3001\u56DE\u9000\u6216\u5207\u6362\u9762\u677F\u81EA\u8EAB\u7684 UI \u6784\u5EFA\u3002",serversTitle:"\u670D\u52A1\u5668",serversCount:"{total} \u4E2A\u4E2D {running} \u4E2A\u8FD0\u884C\u4E2D",serversHintPanel:"\u5728 home-hosted \u9762\u677F\u4E2D\u7BA1\u7406\u6761\u76EE\uFF1A",serversHintNoPanel:"\u5F53\u524D\u65E0\u6CD5\u7BA1\u7406\u6761\u76EE\uFF1A\u9762\u677F\u6CA1\u6709\u8FD0\u884C\u3002",serversEmpty:"\u9762\u677F\u672A\u62A5\u544A\u4EFB\u4F55\u670D\u52A1\u5668\u3002",serversPid:"PID",serversUrl:"URL",serversCommand:"\u547D\u4EE4",serversArgs:"\u53C2\u6570",serversCwd:"\u5DE5\u4F5C\u76EE\u5F55",serversPort:"\u7AEF\u53E3",serversOnPortConflict:"\u7AEF\u53E3\u51B2\u7A81\u65F6",serversAutostart:"\u81EA\u542F",serversPersistent:"\u6301\u4E45\u5316",serversPersistentHint:"\u7531 home-hosted \u81EA\u5E26\u7684 nanny \u6258\u7BA1\uFF0C\u505C\u6B62\u6216\u91CD\u542F\u9762\u677F\u4E0D\u4F1A\u505C\u6B62\u5B83\u3002",serversHealth:"\u5065\u5EB7\u68C0\u67E5",serversRestartPolicy:"\u91CD\u542F",serversConfiguration:"\u914D\u7F6E",serversRawConfig:"\u539F\u59CB\u914D\u7F6E",serversDisabled:"\u5DF2\u505C\u7528",serversEnabled:"\u5DF2\u542F\u7528",serversHealthHttp:"HTTP {status} \u4E8E {path}",serversHealthHttpBelow:"HTTP <{status} \u4E8E {path}",serversHealthHttpProbe:"HTTP \u63A2\u6D4B {path}",serversHealthPort:"\u7AEF\u53E3 {port}",serversHealthProbe:"\u7AEF\u53E3\u63A2\u6D4B",serversHealthEvery:"\u6BCF {seconds}",serversRestartSummary:"{retries} \u6B21\u91CD\u8BD5 \xB7 {base} \u2192 \xD7{factor}",serversStart:"\u542F\u52A8",serversStop:"\u505C\u6B62",serversRestart:"\u91CD\u542F",serversWorkspace:"\u5DE5\u4F5C\u533A",serversAdd:"\u6DFB\u52A0\u670D\u52A1\u5668",serversEdit:"\u7F16\u8F91",serversEditTitle:"\u7F16\u8F91 {id}",serversCreateTitle:"\u6DFB\u52A0\u670D\u52A1\u5668",serversEditorHint:"\u53EA\u5199\u5165\u4F60\u6539\u52A8\u7684\u5B57\u6BB5\uFF0C\u5176\u4F59\u4ECD\u7EE7\u627F\u5DE5\u4F5C\u533A\u9ED8\u8BA4\u503C\u3002",serversCreate:"\u521B\u5EFA",serversSave:"\u4FDD\u5B58",serversDelete:"\u5220\u9664",serversDeleteTitle:"\u5220\u9664 {id}\uFF1F",serversDeleteBody:"\u8FD9\u4F1A\u4ECE\u5DE5\u4F5C\u533A {workspace} \u4E2D\u79FB\u9664\u8BE5\u6761\u76EE\uFF0C\u8FD0\u884C\u4E2D\u7684\u670D\u52A1\u5668\u4E5F\u4F1A\u968F\u4E4B\u505C\u6B62\u3002",serversDeleteGo:"\u5220\u9664",serversFreePort:"\u91CA\u653E\u7AEF\u53E3",serversFreePortTitle:"\u91CA\u653E\u7AEF\u53E3 {port}\uFF1F",serversFreePortBody:"\u505C\u6B62\u5360\u7528\u8BE5\u7AEF\u53E3\u7684\u8FDB\u7A0B\uFF0C\u9664\u975E\u5B83\u7531\u9762\u677F\u76D1\u7BA1\u3002\u8FDB\u7A0B\u5148\u6536\u5230 SIGTERM\uFF0C\u4E4B\u540E\u4F1A\u88AB\u5F3A\u5236\u505C\u6B62\u3002",serversFreePortGo:"\u91CA\u653E",serversPortFreed:"\u7AEF\u53E3 {port} \u5DF2\u91CA\u653E\u3002",serversPortHeld:"\u7AEF\u53E3 {port} \u4ECD\u88AB\u5360\u7528\u3002",serversPortSkipped:"\u8BE5\u76D1\u542C\u8005\u5C5E\u4E8E\u9762\u677F\u76D1\u7BA1\u7684\u670D\u52A1\u5668\uFF0C\u56E0\u6B64\u672A\u88AB\u52A8\u5B83\u3002",serversPortRefused:"\u7AEF\u53E3\u672A\u80FD\u91CA\u653E\uFF1A{message}",fieldId:"Id",fieldIdHint:"\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u3001`_` \u548C `-`\uFF1B\u5728\u5DE5\u4F5C\u533A\u5185\u552F\u4E00\u3002",fieldIdInvalid:"id \u4EE5\u5C0F\u5199\u5B57\u6BCD\u6216\u6570\u5B57\u5F00\u5934\uFF0C\u53EA\u80FD\u5305\u542B a-z\u30010-9\u3001_ \u548C -\u3002",fieldLabel:"\u6807\u7B7E",fieldCommand:"\u547D\u4EE4",fieldArgs:"\u53C2\u6570",fieldArgsHint:"\u6BCF\u884C\u4E00\u4E2A\u53C2\u6570\u3002",fieldCwd:"\u5DE5\u4F5C\u76EE\u5F55",fieldPort:"\u7AEF\u53E3",fieldPortHint:"\u7559\u7A7A\u8868\u793A\u8BE5\u6761\u76EE\u6CA1\u6709\u7AEF\u53E3\u3002",fieldPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\uFF0C\u6216\u7559\u7A7A\u3002",fieldAutostart:"\u968F\u9762\u677F\u542F\u52A8",fieldOnPortConflict:"\u7AEF\u53E3\u51B2\u7A81\u65F6",fieldInherit:"\u7EE7\u627F",fieldRequired:"Id \u548C\u547D\u4EE4\u4E3A\u5FC5\u586B\u3002"};function Qt(e,t){return t===void 0?e:e.replace(/\{(\w+)\}/g,(n,r)=>Object.prototype.hasOwnProperty.call(t,r)?String(t[r]):n)}var Ue=(e,t)=>Qt(Ee[e]??e,t);function Ve(e){if(e!==void 0)try{let t=e.bind(ve);if(typeof t=="function")return t}catch{}return Ue}function We(e,t=Ue){return e===void 0?t:(n,r)=>{let o;try{o=e(n,r)}catch{o=void 0}return o===void 0||o.length===0||o===n?t(n,r):o}}var V=require("react");var ee=require("react");var $e="/home-hosted";var en=/^[a-z0-9][a-z0-9_-]*$/;function je(e){return typeof e=="string"&&en.test(e)}var ze=["block","warn","follow","reclaim","kill"];var le=["status","workspaces_list","servers_list","servers_lifecycle","servers_edit","autostart_manage","ui_manage"],Ge=["servers_lifecycle","servers_edit","autostart_manage","ui_manage"],tn=3,Dn={version:tn,autostart:{enabled:!1,mechanism:"auto"},manageDsh:!1,workspace:"default",entries:[],agentTools:{enabled:!0,allow:[...le]},panel:{port:null},authNotice:!0,reclaimToken:!0,instancesNotice:!0,uiStyle:"detailed",cli:{prefer:"pinned"}};var nn="/api";function X(e,t,n){return{ok:!1,error:n===void 0?{code:e,message:t}:{code:e,message:t,detail:n}}}function Re(e){return typeof e=="object"&&e!==null}function on(e){return e instanceof Error?e.message:String(e)}function rn(e){if(!Re(e))return X("bad-response","The panel returned a non-object response");if(typeof e.v=="number"&&e.v!==1)return X("version-mismatch",`Response protocol v${e.v} does not match the expected v${1}`);let t=e.result;if(!Re(t))return X("bad-response","The panel returned no result");if(t.ok===!0)return"value"in t?{ok:!0,value:t.value}:X("bad-response","A successful response carried no value");if(t.ok===!1){let n=t.error;return Re(n)&&typeof n.message=="string"?X(typeof n.code=="string"?n.code:"error",n.message,n.detail):X("error","The panel reported a failure without a message")}return X("bad-response","The panel returned an unrecognised result")}async function T(e,t,n={}){let r=n.fetch??globalThis.fetch;if(typeof r!="function")return X("no-fetch","No fetch implementation is available");let o={v:1,endpoint:e,payload:t},a;try{a=await r(`${nn}${$e}`,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(o)})}catch(s){return X("network",on(s))}if(!a.ok){let s=a.statusText.length>0?` ${a.statusText}`:"";return X("http",`HTTP ${a.status}${s}`)}let i;try{i=await a.json()}catch{return X("bad-json","The panel returned invalid JSON")}return rn(i)}function Ke(e,t={}){return T("settings.update",{patch:e},t)}var an=5e3;function Ye(e=an){let[t,n]=(0,ee.useState)(null),[r,o]=(0,ee.useState)(null),[a,i]=(0,ee.useState)(!0),s=(0,ee.useRef)(!0),u=(0,ee.useCallback)(async()=>{let c=await T("status",{});s.current&&(c.ok?(n(c.value),o(null)):o(c.error),i(!1))},[]);return(0,ee.useEffect)(()=>{s.current=!0,u();let c=setInterval(()=>{u()},e);return()=>{s.current=!1,clearInterval(c)}},[u,e]),{data:t,error:r,loading:a,refresh:u}}var x=require("react/jsx-runtime");function te({size:e=14,children:t}){return(0,x.jsx)("svg",{width:e,height:e,viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",focusable:"false",children:t})}function qe(e){return(0,x.jsxs)(te,{...e,children:[(0,x.jsx)("rect",{x:"2.2",y:"3",width:"11.6",height:"7.6",rx:"1.6"}),(0,x.jsx)("path",{d:"M6.6 13.4h2.8M8 10.6v2.8"})]})}function Je(e){return(0,x.jsxs)(te,{...e,children:[(0,x.jsx)("path",{d:"M8 2.4v5.2"}),(0,x.jsx)("path",{d:"M11.6 4.4a5 5 0 1 1-7.2 0"})]})}function Xe(e){return(0,x.jsxs)(te,{...e,children:[(0,x.jsx)("rect",{x:"2.2",y:"2.8",width:"11.6",height:"10.4",rx:"1.6"}),(0,x.jsx)("path",{d:"M5.2 6.9l1.8 1.8-1.8 1.8M8.7 10.5h2.2"})]})}function Ze(e){return(0,x.jsxs)(te,{...e,children:[(0,x.jsx)("path",{d:"M2.4 5.4h11.2M2.4 10.6h11.2"}),(0,x.jsx)("circle",{cx:"6",cy:"5.4",r:"1.6",fill:"currentColor",stroke:"none"}),(0,x.jsx)("circle",{cx:"10.4",cy:"10.6",r:"1.6",fill:"currentColor",stroke:"none"})]})}function be(e){return(0,x.jsxs)(te,{...e,children:[(0,x.jsx)("path",{d:"M8 2.3l5.4 2.9L8 8.1 2.6 5.2z"}),(0,x.jsx)("path",{d:"M2.6 8.6l5.4 2.9 5.4-2.9"}),(0,x.jsx)("path",{d:"M2.6 11.4l5.4 2.9 5.4-2.9"})]})}function Qe(e){return(0,x.jsxs)(te,{...e,children:[(0,x.jsx)("path",{d:"M13.4 9.4A5.5 5.5 0 1 1 12.2 4.4"}),(0,x.jsx)("path",{d:"M12.8 1.7v2.9h-2.9"})]})}function et(e){return(0,x.jsx)(te,{...e,children:(0,x.jsx)("path",{d:"M6.2 3.8L10.4 8l-4.2 4.2"})})}function tt(e){return(0,x.jsxs)(te,{...e,children:[(0,x.jsx)("path",{d:"M6.6 3.4H3.4v9.2h9.2V9.4"}),(0,x.jsx)("path",{d:"M9.4 3.4h3.2v3.2M12.6 3.4L7.8 8.2"})]})}function ye(e){return(0,x.jsxs)(te,{...e,children:[(0,x.jsx)("path",{d:"M8 2.6l5.7 10.2H2.3z"}),(0,x.jsx)("path",{d:"M8 6.4v3.1M8 11.5h.01"})]})}function nt(e){return(0,x.jsx)(te,{...e,children:(0,x.jsx)("path",{d:"M3 8.4l3.3 3.3L13 5"})})}var Y="\u2014";function I(e){if(e==null)return Y;let t=String(e);return t.length>0?t:Y}function ot(e){return e.length>0?e.join(", "):Y}function Ie(e){return Ge.includes(e)}var He={status:"agentToolStatus",workspaces_list:"agentToolWorkspacesList",servers_list:"agentToolServersList",servers_lifecycle:"agentToolServersLifecycle",servers_edit:"agentToolServersEdit",autostart_manage:"agentToolAutostartManage",ui_manage:"agentToolUiManage"},rt={status:"agentToolDescStatus",workspaces_list:"agentToolDescWorkspacesList",servers_list:"agentToolDescServersList",servers_lifecycle:"agentToolDescServersLifecycle",servers_edit:"agentToolDescServersEdit",autostart_manage:"agentToolDescAutostartManage",ui_manage:"agentToolDescUiManage"},at={api:"writeViaApi",file:"writeViaFile",none:"writeViaNone"},it={enrolled:"tokenEnrolled",present:"tokenPresent",absent:"tokenAbsent",stale:"tokenStale",unknown:"tokenUnknown"},we={"not-installed":"bootStateNotInstalled","installed-disabled":"bootStateInstalledDisabled","enabled-running":"bootStateEnabledRunning","enabled-failing":"bootStateEnabledFailing",unsupported:"bootStateUnsupported"},st={config:"panelCliConfig",dependency:"panelCliDependency",path:"panelCliPathSource",none:"panelCliMissing"};function ke(e,t=52){if(e.length<=t)return e;let n=e.includes("\\")?"\\":"/",r=e.split(/[\\/]/).filter(s=>s.length>0);if(r.length<4)return e;let o=/^[A-Za-z]:$/.test(r[0]??"")?3:2;if(r.length<=o)return e;let i=`${/^[\\/]/.test(e)?n:""}${r.slice(0,o).join(n)}${n}\u2026${n}${r.slice(-2).join(n)}`;return i.length<e.length?i:e}function lt(e){let t=n=>e.source===n&&e.path!==null?{source:n,path:e.path,version:e.version}:null;return{dependency:e.dependency??t("dependency"),global:e.global??t("path")}}function dt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function sn(e,t){if(Object.is(e,t))return!0;try{return JSON.stringify(e)===JSON.stringify(t)}catch{return!1}}function ct(e,t){let n={};for(let r of Object.keys(t)){let o=e[r],a=t[r];if(dt(o)&&dt(a)){let i=ct(o,a);Object.keys(i).length>0&&(n[r]=i)}else sn(o,a)||(n[r]=a)}return n}function pt(e,t){return ct(e,t)}function ht(e,t,n){let r=new Set(e);return n?r.add(t):r.delete(t),le.filter(o=>r.has(o))}var gt=require("react");async function ut(e){try{if(typeof navigator<"u"&&navigator.clipboard!==void 0)return await navigator.clipboard.writeText(e),!0}catch{}return!1}var p=require("react/jsx-runtime");function ln(...e){return e.filter(t=>typeof t=="string"&&t.length>0).join(" ")}function q({icon:e,title:t,action:n,children:r}){return(0,p.jsxs)("section",{className:"hh-section",children:[(0,p.jsxs)("header",{className:"hh-section-head",children:[e===void 0?null:(0,p.jsx)("span",{className:"hh-section-icon",children:e}),(0,p.jsx)("h3",{className:"hh-section-title",children:t}),(0,p.jsx)("span",{className:"hh-section-rule","aria-hidden":"true"}),n===void 0?null:(0,p.jsx)("span",{className:"hh-section-action",children:n})]}),(0,p.jsx)("div",{className:"hh-section-body",children:r})]})}function R({label:e,children:t}){return(0,p.jsxs)("div",{className:"hh-spec",children:[(0,p.jsx)("span",{className:"hh-spec-label",children:e}),(0,p.jsx)("span",{className:"hh-spec-value",children:t})]})}function Z({children:e}){return(0,p.jsx)("code",{className:"hh-code",children:e})}function m({children:e}){return typeof e=="string"&&e.length===0?null:(0,p.jsx)("p",{className:"hh-hint",children:e})}function _({tone:e,children:t}){return(0,p.jsx)("span",{className:"hh-chip","data-tone":e??"idle",children:t})}function re({href:e,children:t}){return(0,p.jsxs)("a",{className:"hh-link",href:e,target:"_blank",rel:"noreferrer noopener",children:[t??e,(0,p.jsx)("span",{className:"hh-link-icon","aria-hidden":"true",children:(0,p.jsx)(tt,{size:11})})]})}function ne({label:e,open:t=!1,children:n}){return(0,p.jsxs)("details",{className:"hh-details",open:t||void 0,children:[(0,p.jsxs)("summary",{className:"hh-summary",children:[(0,p.jsx)("span",{className:"hh-chevron","aria-hidden":"true",children:(0,p.jsx)(et,{size:12})}),e]}),(0,p.jsx)("div",{className:"hh-details-body",children:n})]})}function z({tone:e="bad",icon:t=!0,title:n,children:r}){return(0,p.jsxs)("div",{className:"hh-note","data-tone":e,role:e==="bad"?"alert":"note",children:[t?(0,p.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,p.jsx)(ye,{size:13})}):null,(0,p.jsxs)("div",{className:"hh-note-body",children:[n===void 0?null:(0,p.jsx)("span",{className:"hh-note-title",children:n}),typeof r=="string"?(0,p.jsx)("p",{children:r}):r]})]})}function xe({title:e,detail:t}){return(0,p.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,p.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,p.jsx)(ye,{size:13})}),(0,p.jsxs)("div",{className:"hh-note-body",children:[(0,p.jsx)("strong",{children:e}),t.length>0?(0,p.jsx)("p",{children:t}):null]})]})}function ge({error:e,title:t}){return e===null?null:(0,p.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,p.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,p.jsx)(ye,{size:13})}),(0,p.jsxs)("div",{className:"hh-note-body",children:[(0,p.jsx)("strong",{children:t}),(0,p.jsxs)("p",{children:[(0,p.jsx)("code",{children:e.code})," \u2014 ",e.message]})]})]})}function dn(){return(0,p.jsx)("span",{className:"hh-spinner","aria-hidden":"true"})}function w({children:e,onClick:t,disabled:n,busy:r,variant:o="default",icon:a,title:i}){let s=n===!0||r===!0;return(0,p.jsxs)("button",{type:"button",className:ln("hh-btn",o!=="default"&&`hh-btn-${o}`),onClick:t,disabled:s,title:i,children:[r===!0?(0,p.jsx)(dn,{}):a,e]})}function pe({label:e,checked:t,disabled:n,onChange:r}){return(0,p.jsxs)("button",{type:"button",role:"switch",className:"hh-switch","aria-checked":t,disabled:n,onClick:()=>r(!t),children:[(0,p.jsx)("span",{className:"hh-switch-track","aria-hidden":"true",children:(0,p.jsx)("span",{className:"hh-switch-knob"})}),(0,p.jsx)("span",{className:"hh-check-label",children:e})]})}function mt({label:e,checked:t,disabled:n,onChange:r}){return(0,p.jsxs)("label",{className:"hh-check",children:[(0,p.jsx)("input",{type:"checkbox",checked:t,disabled:n,onChange:o=>r(o.target.checked)}),(0,p.jsx)("span",{className:"hh-check-label",children:e})]})}function ae({value:e,options:t,disabled:n,label:r,onChange:o}){return(0,p.jsx)("select",{className:"hh-select",value:e,disabled:n,"aria-label":r,onChange:a=>o(a.target.value),children:t.map(a=>(0,p.jsx)("option",{value:a.value,children:a.label},a.value))})}function me({label:e,meta:t,path:n,hint:r,checked:o,disabled:a,onChange:i}){return(0,p.jsxs)("label",{className:"hh-choice-option","data-disabled":a===!0,children:[(0,p.jsx)("input",{type:"radio",checked:o,disabled:a,onChange:()=>i()}),(0,p.jsxs)("span",{className:"hh-choice-label",children:[(0,p.jsx)("span",{children:e}),r]}),t===void 0?null:(0,p.jsx)("span",{className:"hh-choice-meta",children:t}),n===void 0?null:(0,p.jsx)("span",{className:"hh-choice-path",title:n,children:ke(n)})]})}function Se({children:e}){return(0,p.jsxs)(_,{tone:"accent",children:[(0,p.jsx)(nt,{size:10}),e]})}function fe({text:e,copyLabel:t,copiedLabel:n}){let[r,o]=(0,gt.useState)(!1);return(0,p.jsxs)("div",{className:"hh-code-box",children:[(0,p.jsx)("textarea",{className:"hh-code-text",readOnly:!0,value:e,rows:Math.min(e.split(`
`).length,4)}),(0,p.jsx)("div",{className:"hh-btn-row",children:(0,p.jsx)(w,{variant:"ghost",onClick:()=>{ut(e).then(o)},children:r?n:t})})]})}var C=require("react/jsx-runtime");function ft({t:e,status:t,updateSettings:n,busy:r,uiStyle:o}){let a=t.settings.agentTools,i=a.allow??[],s=le.filter(c=>i.includes(c)).length,u=(c,g)=>{n(N=>({...N,agentTools:{...N.agentTools,allow:ht(N.agentTools.allow??[],c,g)}}))};return(0,C.jsxs)(q,{icon:(0,C.jsx)(Ze,{}),title:e("agentTitle"),action:(0,C.jsx)(_,{children:e("agentCount",{enabled:s,total:le.length})}),children:[(0,C.jsx)(pe,{label:e("agentMaster"),checked:a.enabled,onChange:c=>n(g=>({...g,agentTools:{...g.agentTools,enabled:c}}))}),(0,C.jsxs)("div",{className:"hh-field-block",children:[(0,C.jsx)(pe,{label:e("reclaimAutoLabel"),checked:t.settings.reclaimToken!==!1,disabled:r==="settings",onChange:c=>n(g=>({...g,reclaimToken:c}))}),(0,C.jsx)(m,{children:e("reclaimAutoHint")})]}),(0,C.jsxs)("div",{className:"hh-field-block",children:[(0,C.jsx)(pe,{label:e("instancesNoticeLabel"),checked:t.settings.instancesNotice!==!1,disabled:r==="settings",onChange:c=>n(g=>({...g,instancesNotice:c}))}),(0,C.jsx)(m,{children:e("instancesNoticeHint")})]}),(0,C.jsx)(m,{children:e("agentApproval")}),o==="detailed"?(0,C.jsx)("div",{className:"hh-tool-cards",children:le.map(c=>(0,C.jsxs)("label",{className:"hh-tool-card",children:[(0,C.jsx)("input",{type:"checkbox",checked:i.includes(c),disabled:!a.enabled,onChange:g=>u(c,g.target.checked)}),(0,C.jsxs)("span",{className:"hh-tool-card-body",children:[(0,C.jsxs)("span",{className:"hh-tool-card-head",children:[(0,C.jsx)("span",{className:"hh-tool-card-name",children:e(He[c])}),Ie(c)?(0,C.jsx)(_,{tone:"warn",children:e("agentApprovalBadge")}):null]}),(0,C.jsx)("span",{className:"hh-tool-card-desc",children:e(rt[c])})]})]},c))}):(0,C.jsx)("div",{className:"hh-tools",children:le.map(c=>(0,C.jsx)(mt,{label:(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)("span",{className:"hh-check-text",children:e(He[c])}),Ie(c)?(0,C.jsx)(_,{tone:"warn",children:e("agentApprovalBadge")}):null]}),checked:i.includes(c),disabled:!a.enabled,onChange:g=>u(c,g)},c))})]})}var St=require("react");function vt(e){return Array.isArray(e)?e.filter(t=>typeof t=="string"):[]}function bt(e){if(typeof e!="object"||e===null)return null;let t=e.result;if(typeof t!="object"||t===null)return null;let{ok:n,detail:r,commands:o}=t;return n!==!1?null:{detail:typeof r=="string"?r:"",commands:vt(o)}}function yt(e){return e===void 0?null:{ok:e.ok===!0,action:e.action==="uninstall"?"uninstall":"install",detail:typeof e.detail=="string"?e.detail:"",commands:vt(e.commands)}}var cn=["enabled-running","enabled-failing","installed-disabled"];function wt(e,t){let n=e.filter(a=>a.available).map(a=>a.mechanism),r=n.filter(a=>a!=="unsupported"),o=["auto",...r.length>0?r:n];return o.includes(t)||o.push(t),o}function kt(e,t){return e!==null&&e!==t}function pn(e,t){return e===null||e.ok?!1:e.action==="install"?cn.includes(t):t==="not-installed"}function xt(e,t,n,r){return e!==null&&e.state===n&&e.mechanism===r?e:pn(t,n)?null:t}var P=require("react/jsx-runtime");function Tt({t:e,status:t,run:n,updateSettings:r,busy:o,uiStyle:a}){let i=t.boot,s=t.settings.autostart,u=i.candidates??[],c=i.commands??[],[g,N]=(0,St.useState)(null),B=o==="boot.install"||o==="boot.uninstall",W=wt(u,s.mechanism).map(M=>({value:M,label:M==="auto"?e("bootMechanismAuto"):M})),D=kt(i.mechanism,s.mechanism),k=i.mechanism!==null,A=M=>e(M==="install"?"bootActionInstall":"bootActionUninstall"),y=async M=>{let G=await n(`boot.${M}`,async()=>M==="install"?T("boot.install",s.mechanism==="auto"?{}:{mechanism:s.mechanism}):T("boot.uninstall",{}));if(!G.ok){N(null);return}let K=bt(G.value);N(K===null?null:{ok:!1,action:M,detail:K.detail,commands:K.commands,state:i.state,mechanism:i.mechanism})},O=yt(s.lastAttempt),H=xt(g,O,i.state,i.mechanism);return(0,P.jsxs)(q,{icon:(0,P.jsx)(Je,{}),title:e("bootTitle"),action:(0,P.jsx)(ae,{value:s.mechanism,options:W,label:e("bootMechanism"),disabled:o==="settings"||B,onChange:M=>r(G=>({...G,autostart:{...G.autostart,mechanism:M}}))}),children:[(0,P.jsxs)("div",{className:"hh-btn-row",children:[(0,P.jsx)(w,{variant:k?"default":"primary",disabled:s.mechanism==="unsupported",busy:o==="boot.install",onClick:()=>{y("install")},children:e(D?"bootSwitchMode":"bootEnabled")}),(0,P.jsx)(w,{disabled:!k,busy:o==="boot.uninstall",onClick:()=>{y("uninstall")},children:e("bootUninstall")}),(0,P.jsx)(w,{variant:"ghost",busy:o==="boot.verify",onClick:()=>{n("boot.verify",()=>T("boot.verify",{}))},children:e("bootRecheck")})]}),s.enabled&&i.state==="not-installed"?(0,P.jsx)(z,{tone:"warn",children:e("bootRequestedNotInstalled")}):null,H!==null&&!H.ok?(0,P.jsxs)("div",{className:"hh-section-body",children:[(0,P.jsx)(xe,{title:e("bootAttemptFailed",{action:A(H.action)}),detail:H.detail.length>0?H.detail:e("bootAttemptNoDetail")}),H.commands.length>0?(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(m,{children:e("bootAttemptCommands")}),(0,P.jsx)(fe,{text:H.commands.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null]}):null,H!==null&&H.ok?(0,P.jsx)(m,{children:e("bootAttemptSucceeded",{action:A(H.action),detail:H.detail})}):null,c.length>0?(0,P.jsxs)(ne,{label:e("bootCommandsLabel"),open:a==="detailed",children:[(0,P.jsx)(m,{children:e("bootCommandsExplain")}),(0,P.jsx)(fe,{text:c.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null,(0,P.jsxs)(ne,{label:e("details"),open:a==="detailed",children:[(0,P.jsx)(R,{label:e("bootState"),children:e(we[i.state]??"bootStateUnsupported")}),(0,P.jsx)(R,{label:e("bootBootCapable"),children:i.bootCapable?e("yes"):e("no")}),(0,P.jsx)(R,{label:e("bootPrivileged"),children:i.privileged?e("yes"):e("no")}),(0,P.jsx)(R,{label:e("bootUnitPath"),children:(0,P.jsx)(Z,{children:I(i.unitPath)})}),i.detail.length>0?(0,P.jsx)(m,{children:i.detail}):null]})]})}var U=require("react/jsx-runtime");function hn(e){return e.defaultEntryId??"dsh"}function Ct({t:e,status:t,run:n,busy:r}){let o=t.entries??[],a=t.settings.manageDsh===!0,i=t.boot.platform==="win32",s=hn(t),u=c=>{if(c){let g={id:s,autostart:!0};n("entries.apply",()=>T("entries.apply",{intents:[g]}))}else n("entries.remove",()=>T("entries.remove",{id:s}))};return(0,U.jsxs)(q,{icon:(0,U.jsx)(Xe,{}),title:e("entriesTitle"),children:[(0,U.jsx)(pe,{label:e("entriesManage",{id:s}),checked:a,disabled:r!==null,onChange:u}),(0,U.jsx)(m,{children:e("entriesManageNote",{id:s})}),i?(0,U.jsx)(z,{tone:"warn",children:e("entriesManageWinWarning",{id:s})}):null,o.length===0?(0,U.jsx)(m,{children:e("entriesEmpty",{id:s})}):(0,U.jsx)("div",{className:"hh-list",children:o.map(c=>{let g=c.live;return(0,U.jsxs)("div",{className:"hh-item",children:[(0,U.jsxs)("span",{className:"hh-item-main",children:[(0,U.jsx)("span",{className:"hh-item-name",children:c.intent.id}),(0,U.jsx)(_,{tone:c.exists?"ok":"bad",children:c.exists?e("entriesExists"):e("entriesMissing")}),(0,U.jsx)(_,{children:c.managed?e("entriesManaged"):e("entriesUnmanaged")}),c.drift.length>0?(0,U.jsx)(_,{tone:"warn",children:`${e("entriesDrift")} ${ot(c.drift)}`}):null]}),(0,U.jsx)("span",{className:"hh-item-spacer"}),(0,U.jsx)("span",{className:"hh-item-meta",children:g===null?e("entriesNotRunning"):`${I(g.status)}${g.pid===null?"":` \xB7 pid ${g.pid}`}`})]},c.intent.id)})})]})}var ie=require("react");var l=require("react/jsx-runtime"),un={absent:"panelTokenWarnAbsent",present:"panelTokenWarnPresent",stale:"panelTokenWarnStale"};function gn(e){if(e.token!=="enrolled")return e.token!=="unknown"?un[e.token]:e.url===null?void 0:"panelTokenWarnUnreachable"}function mn(e,t){if(!e.ok)return t("panelTokenRegenerateFailed",{message:e.error.message});let n=e.value?.panel;return n!==void 0&&n.detail.length>0?n.detail:t("panelTokenRegenerated")}function fn(e,t){return e.ok?e.value?.detail||t("panelStopped"):e.error.code==="client"?t("panelStopping"):t("panelStopFailed",{message:e.error.message})}function vn({value:e,label:t,hint:n,invalidLabel:r,placeholder:o,disabled:a,onChange:i}){let[s,u]=(0,ie.useState)(e===null?"":String(e));(0,ie.useEffect)(()=>{u(e===null?"":String(e))},[e]);let c=s.trim()===""?null:Number(s),g=c!==null&&(!Number.isInteger(c)||c<1||c>65535),N=()=>{if(g){u(e===null?"":String(e));return}c!==e&&i(c)};return(0,l.jsxs)("div",{className:"hh-field-block",children:[(0,l.jsxs)("div",{className:"hh-field",children:[(0,l.jsx)("label",{className:"hh-field-label",htmlFor:"hh-panel-port",children:t}),(0,l.jsx)("input",{id:"hh-panel-port",className:"hh-input",type:"number",value:s,placeholder:o,disabled:a,onChange:B=>u(B.target.value),onBlur:N,onKeyDown:B=>{B.key==="Enter"&&N()}})]}),(0,l.jsx)(m,{children:g?r:n})]})}function Pt({t:e,status:t,run:n,updateSettings:r,busy:o,uiStyle:a}){let i=t.panel,s=t.cli,u=t.instances??[],c=s?.prefer??t.settings.cli?.prefer??"pinned",[g,N]=(0,ie.useState)(!1),[B,F]=(0,ie.useState)(null),[W,D]=(0,ie.useState)(null),[k,A]=(0,ie.useState)(!1),[y,O]=(0,ie.useState)(null),H=gn(i),M=s?.version??null,G=M!==null&&i.version!==null,K=i.reachable&&G&&M!==i.version,{dependency:oe,global:Q}=s===void 0?{dependency:null,global:null}:lt(s),ue=s===void 0?[]:[`pnpm add -g home-hosted@${s.expectedRange}`,`npm install -g home-hosted@${s.expectedRange}`],j=b=>{r($=>({...$,cli:{...$.cli,prefer:b}}))},h=async()=>{let b=await n("cli.installGlobal",()=>T("cli.installGlobal",{}));if(!b.ok)return;let $=b.value;F(typeof $?.output=="string"?$.output:null)},E=async()=>{D(mn(await n("panel.reclaimToken",()=>T("panel.reclaimToken",{})),e))},v=async()=>{A(!1),O(e("panelStopping")),O(fn(await n("panel.stop",()=>T("panel.stop",{})),e))};return(0,l.jsxs)(q,{icon:(0,l.jsx)(qe,{}),title:e("panelTitle"),children:[H===void 0?null:(0,l.jsxs)(z,{tone:"warn",title:e("panelTokenWarningTitle"),children:[(0,l.jsx)("p",{children:e(H)}),i.reachable||i.token==="unknown"?null:(0,l.jsx)("p",{children:e("panelTokenWarnPanelDown")}),(0,l.jsx)("div",{className:"hh-note-actions",children:(0,l.jsx)(w,{variant:"primary",busy:o==="panel.reclaimToken",onClick:()=>{E()},children:e("panelTokenRegenerate")})})]}),W===null?null:(0,l.jsx)(m,{children:W}),s===void 0?null:(0,l.jsxs)(l.Fragment,{children:[(0,l.jsxs)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("panelCopy"),children:[(0,l.jsx)(me,{label:e("optionsPreferPinned"),hint:(0,l.jsx)(Se,{children:e("optionsRecommended")}),meta:oe===null?void 0:I(oe.version),path:oe?.path??void 0,checked:c==="pinned",disabled:oe===null||o==="settings",onChange:()=>j("pinned")}),(0,l.jsx)(me,{label:e("optionsPreferGlobal"),meta:Q===null?void 0:I(Q.version),path:Q?.path??void 0,checked:c==="global",disabled:Q===null||o==="settings",onChange:()=>j("global")})]}),(0,l.jsx)(m,{children:e("panelCopyHint")}),s.source==="config"?(0,l.jsx)(m,{children:e("optionsConfigOverride")}):null,s.source==="path"&&c!=="global"?(0,l.jsx)(m,{children:e("panelCliNotPinned",{range:s.expectedRange})}):null,s.supported?null:(0,l.jsx)(z,{tone:"warn",children:e("panelCliUnsupported")}),s.launcherPath!=null&&s.launcherVersion==null?(0,l.jsx)(z,{tone:"warn",children:e("panelCliLauncherFailed")}):null]}),(0,l.jsx)(vn,{value:t.settings.panel?.port??null,label:e("panelPort"),hint:i.reachable?e("panelPortHint"):e("panelPortFree"),invalidLabel:e("panelPortInvalid"),placeholder:i.configPort==null?void 0:String(i.configPort),disabled:i.reachable||o!==null,onChange:b=>r($=>({...$,panel:{...$.panel,port:b}}))}),t.panelRootSource!=="legacy"?null:(0,l.jsx)(m,{children:e("panelRootLegacy")}),u.length<=1?null:(0,l.jsxs)(ne,{label:e("panelInstances",{count:u.length}),open:a==="detailed",children:[u.map(b=>(0,l.jsxs)(R,{label:b.managed?e("panelInstanceManaged"):e("panelInstanceOther"),children:[(0,l.jsx)(Z,{children:b.home}),b.url===null?null:(0,l.jsxs)(l.Fragment,{children:[" \xB7 ",(0,l.jsx)(re,{href:b.url,children:b.url})]}),` \xB7 ${b.running?e("stateAnswering"):e("stateNotAnswering")}`,b.version===null?null:` \xB7 ${b.version}`,b.hosting?` \xB7 ${e("panelInstanceHosts")}`:null]},b.home)),(0,l.jsx)(m,{children:e("panelInstancesHint")})]}),K?(0,l.jsx)(m,{children:e("panelOutdated")}):null,(0,l.jsxs)("div",{className:"hh-btn-row",children:[i.reachable?null:(0,l.jsx)(w,{variant:"primary",busy:o==="panel.start",onClick:()=>{n("panel.start",()=>T("panel.start",{}))},children:e("panelStart")}),i.reachable?(0,l.jsx)(w,{variant:"danger",disabled:o!==null,onClick:()=>A(!0),children:e("panelStop")}):null,K&&!g?(0,l.jsx)(w,{variant:"primary",onClick:()=>N(!0),children:e("panelReplace",{copy:e(c==="global"?"panelCopyGlobal":"panelCopyPinned")})}):null]}),y===null?null:(0,l.jsx)(m,{children:y}),k?(0,l.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelStopTitle"),children:(0,l.jsxs)("div",{className:"hh-note-body",children:[(0,l.jsx)("strong",{children:e("panelStopTitle")}),(0,l.jsx)("p",{children:e("panelStopBody")}),(0,l.jsxs)("div",{className:"hh-note-actions",children:[(0,l.jsx)(w,{onClick:()=>A(!1),children:e("confirmCancel")}),(0,l.jsx)(w,{variant:"danger",busy:o==="panel.stop",onClick:()=>{v()},children:e("confirmStop")})]})]})}):null,K&&g?(0,l.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelTakeoverTitle"),children:(0,l.jsxs)("div",{className:"hh-note-body",children:[(0,l.jsx)("strong",{children:e("panelTakeoverTitle")}),(0,l.jsx)("p",{children:e("panelTakeoverBody",{id:t.defaultEntryId??"dsh"})}),(0,l.jsxs)("div",{className:"hh-note-actions",children:[(0,l.jsx)(w,{onClick:()=>N(!1),children:e("confirmCancel")}),(0,l.jsx)(w,{variant:"danger",busy:o==="panel.takeover",onClick:()=>{N(!1),n("panel.takeover",()=>T("panel.takeover",{}))},children:e("confirmReplace")})]})]})}):null,s!==void 0&&Q===null?(0,l.jsxs)(ne,{label:e("optionsInstallLabel"),open:a==="detailed",children:[(0,l.jsx)(m,{children:e("optionsInstallHint")}),(0,l.jsx)(fe,{text:ue.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")}),(0,l.jsx)("div",{className:"hh-btn-row",children:(0,l.jsx)(w,{busy:o==="cli.installGlobal",onClick:()=>{h()},children:e("optionsInstall")})}),B===null?null:(0,l.jsx)("pre",{className:"hh-output",children:B})]}):null,(0,l.jsxs)(ne,{label:e("details"),open:a==="detailed",children:[(0,l.jsxs)(R,{label:e("panelHome"),children:[(0,l.jsx)(Z,{children:i.home}),t.bootUnitName===void 0?null:(0,l.jsxs)(l.Fragment,{children:[" \xB7 ",t.bootUnitName]})]}),(0,l.jsx)(R,{label:e("panelUrl"),children:i.url===null?I(i.url):(0,l.jsx)(re,{href:i.url,children:i.url})}),(0,l.jsx)(R,{label:e("panelVersion"),children:I(i.version)}),(0,l.jsx)(R,{label:e("panelPid"),children:I(i.pid)}),(0,l.jsx)(R,{label:e("panelWriteVia"),children:e(at[i.writeVia]??"writeViaNone")}),(0,l.jsx)(R,{label:e("panelToken"),children:e(it[i.token]??"tokenUnknown")}),s===void 0?null:(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(R,{label:e("panelCliSource"),children:`${e(st[s.source]??"panelCliMissing")} \xB7 ${I(s.version)}`}),(0,l.jsx)(R,{label:e("panelCliPath"),children:(0,l.jsx)(Z,{children:I(s.path)})})]}),i.detail.length>0?(0,l.jsx)(m,{children:i.detail}):null]})]})}var ce=require("react");var Nt=require("react");var S=require("react/jsx-runtime");function Me(e){return{id:e.id,label:e.label??"",command:e.command??"",args:(e.args??[]).join(`
`),cwd:e.cwd??"",port:e.port===null||e.port===void 0?"":String(e.port),autostart:e.autostart===void 0?"inherit":e.autostart?"on":"off",onPortConflict:e.onPortConflict??""}}function Et(e){return e.split(`
`).map(t=>t.trim()).filter(t=>t.length>0)}function Le(e){let t=e.trim();if(t.length===0)return null;let n=Number(t);return!Number.isInteger(n)||n<1||n>65535?"invalid":n}function Rt(e){return/^[a-z0-9][a-z0-9_-]*$/.test(e)}function bn(e,t){return e.length===t.length&&e.every((n,r)=>n===t[r])}function At(e){let t=e.id.trim(),n=e.command.trim();if(!Rt(t)||n.length===0)return null;let r={id:t,command:n},o=e.label.trim();o.length>0&&(r.label=o);let a=Et(e.args);a.length>0&&(r.args=a);let i=e.cwd.trim();i.length>0&&(r.cwd=i);let s=Le(e.port);return s!=="invalid"&&s!==null&&(r.port=s),e.autostart==="on"&&(r.autostart=!0),e.onPortConflict!==""&&(r.onPortConflict=e.onPortConflict),r}function It(e,t){let n={},r=t.label.trim();r!==(e.label??"")&&(n.label=r);let o=t.command.trim();o.length>0&&o!==(e.command??"")&&(n.command=o);let a=Et(t.args);bn(a,e.args??[])||(n.args=a);let i=t.cwd.trim();i.length>0&&i!==(e.cwd??"")&&(n.cwd=i);let s=Le(t.port);if(s!=="invalid"&&s!==(e.port??null)&&(n.port=s),t.autostart!=="inherit"){let u=t.autostart==="on";e.autostart!==u&&(n.autostart=u)}return t.onPortConflict!==""&&t.onPortConflict!==e.onPortConflict&&(n.onPortConflict=t.onPortConflict),Object.keys(n).length>0?n:null}function de({label:e,hint:t,children:n}){return(0,S.jsxs)("div",{className:"hh-field-block",children:[(0,S.jsxs)("div",{className:"hh-field",children:[(0,S.jsx)("span",{className:"hh-field-label",children:e}),n]}),t===void 0?null:(0,S.jsx)(m,{children:t})]})}function Fe({t:e,title:t,initial:n,submitLabel:r,busy:o,lockId:a,onSubmit:i,onCancel:s}){let[u,c]=(0,Nt.useState)(n),g=(y,O)=>c(H=>({...H,[y]:O})),N=u.id.trim(),B=!a&&N.length>0&&!Rt(N),F=Le(u.port),W=!a&&N.length===0,D=u.command.trim().length===0,k=o||W||D||B||F==="invalid",A=e(W||D?"fieldRequired":B?"fieldIdInvalid":"fieldPortInvalid");return(0,S.jsx)("div",{className:"hh-note",role:"group","aria-label":t,children:(0,S.jsxs)("div",{className:"hh-note-body",children:[(0,S.jsx)("strong",{children:t}),(0,S.jsx)(de,{label:e("fieldId"),hint:e("fieldIdHint"),children:(0,S.jsx)("input",{className:"hh-input",value:u.id,readOnly:a,disabled:o,onChange:y=>g("id",y.target.value)})}),(0,S.jsx)(de,{label:e("fieldCommand"),children:(0,S.jsx)("input",{className:"hh-input",value:u.command,disabled:o,onChange:y=>g("command",y.target.value)})}),(0,S.jsx)(de,{label:e("fieldArgs"),hint:e("fieldArgsHint"),children:(0,S.jsx)("textarea",{className:"hh-input",rows:3,value:u.args,disabled:o,onChange:y=>g("args",y.target.value)})}),(0,S.jsx)(de,{label:e("fieldCwd"),children:(0,S.jsx)("input",{className:"hh-input",value:u.cwd,disabled:o,onChange:y=>g("cwd",y.target.value)})}),(0,S.jsx)(de,{label:e("fieldLabel"),children:(0,S.jsx)("input",{className:"hh-input",value:u.label,disabled:o,onChange:y=>g("label",y.target.value)})}),(0,S.jsx)(de,{label:e("fieldPort"),hint:e("fieldPortHint"),children:(0,S.jsx)("input",{className:"hh-input",type:"number",value:u.port,placeholder:"\u2014",disabled:o,onChange:y=>g("port",y.target.value)})}),(0,S.jsx)(de,{label:e("fieldAutostart"),children:(0,S.jsx)(ae,{value:u.autostart,label:e("fieldAutostart"),disabled:o,options:[{value:"inherit",label:e("fieldInherit")},{value:"on",label:e("yes")},{value:"off",label:e("no")}],onChange:y=>g("autostart",y)})}),(0,S.jsx)(de,{label:e("fieldOnPortConflict"),children:(0,S.jsx)(ae,{value:u.onPortConflict,label:e("fieldOnPortConflict"),disabled:o,options:[{value:"",label:e("fieldInherit")},...ze.map(y=>({value:y,label:y}))],onChange:y=>g("onPortConflict",y)})}),(0,S.jsx)(m,{children:e("serversEditorHint")}),k&&!o?(0,S.jsx)(m,{children:A}):null,(0,S.jsxs)("div",{className:"hh-btn-row",children:[(0,S.jsx)(w,{variant:"primary",busy:o,disabled:k,onClick:()=>i(u),children:r}),(0,S.jsx)(w,{variant:"ghost",disabled:o,onClick:s,children:e("confirmCancel")})]})]})})}var yn=5e3;function Be(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function he(e,t){let n=e[t];return typeof n=="number"&&Number.isFinite(n)?n:null}function Ht(e,t){let n=e[t];return typeof n=="string"&&n.length>0?n:null}function Mt(e){let t=e/1e3;return`${Number.isInteger(t)?t:t.toFixed(1)}s`}function Lt(e,t,n){if(!Be(e))return Y;if(e.enabled!==!0)return n("serversDisabled");let r=Ht(e,"mode"),o=Be(e.http)?e.http:null,a;if(r==="http"||r===null&&o!==null){let s=(o===null?null:Ht(o,"path"))??"/",u=o===null?null:he(o,"expectStatus"),c=o===null?null:he(o,"expectStatusBelow");a=u!==null?n("serversHealthHttp",{status:u,path:s}):c!==null?n("serversHealthHttpBelow",{status:c,path:s}):n("serversHealthHttpProbe",{path:s})}else t!==null?a=n("serversHealthPort",{port:t}):a=n("serversHealthProbe");let i=he(e,"intervalMs");return i!==null&&i!==yn?`${a} \xB7 ${n("serversHealthEvery",{seconds:Mt(i)})}`:a}function Ft(e,t){if(!Be(e))return Y;if(e.enabled===!1)return t("serversDisabled");let n=he(e,"maxRetries"),r=he(e,"baseDelayMs"),o=he(e,"factor");return n===null||r===null||o===null?t("serversEnabled"):t("serversRestartSummary",{retries:n,base:Mt(r),factor:o})}var wn={"not-installed":"idle","installed-disabled":"warn","enabled-running":"ok","enabled-failing":"bad",unsupported:"idle"};function kn(...e){return e.filter(t=>t!==null&&t.length>0).join(" \xB7 ")}function xn(e,t){let{panel:n}=e;return n.reachable?{key:"panel",tone:"ok",name:t("sigPanel"),state:t("stateAnswering"),meta:I(n.version),href:n.url}:{key:"panel",tone:e.lastError===null?"idle":"bad",name:t("sigPanel"),state:t("stateNotAnswering"),meta:n.home,href:null}}function Sn(e,t){let{boot:n}=e,o=e.settings.autostart.enabled&&n.state==="not-installed"?"warn":wn[n.state]??"idle",a=n.mechanism??(e.settings.autostart.mechanism==="auto"?null:e.settings.autostart.mechanism);return{key:"autostart",tone:o,name:t("sigAutostart"),state:t(we[n.state]??"bootStateUnsupported"),meta:a??"",href:null}}function Tn(e,t){let n=e.entries??[],r=t("sigEntry",{id:e.defaultEntryId??"dsh"}),o=e.settings.manageDsh===!0,a=n.filter(c=>!c.exists).length,i=n.filter(c=>c.drift.length>0).length,s=n.find(c=>c.live!==null)?.live??null;return{key:"entry",tone:o?a>0?"bad":i>0?"warn":s!==null?"ok":"warn":"idle",name:r,state:t(o?"stateManaged":"stateNotManaged"),meta:s===null?t("entriesNotRunning"):kn(I(s.status),s.pid===null?null:`pid ${s.pid}`),href:null}}function Bt(e,t){return[xn(e,t),Sn(e,t),Tn(e,t)]}function Dt(e,t){let n=e.filter(r=>r.status==="running").length;return t("serversCount",{running:n,total:e.length})}var d=require("react/jsx-runtime");function Te(e,t){return{workspace:e,id:t}}function Cn(e,t){return{workspace:e,entry:t}}function Pn(e,t,n){return{workspace:e,id:t,patch:n}}function Nn(e,t){return{workspace:e,id:t}}function J(e,t,n){return`${t}:${e}/${n}`}function En({t:e,workspace:t,server:n,run:r,busy:o,offline:a,onEdit:i,onDelete:s,onFreePort:u}){let c=n.status==="running";return(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(w,{variant:"ghost",disabled:a||c,busy:o===J(t,"servers.start",n.id),onClick:()=>{r(J(t,"servers.start",n.id),()=>T("servers.start",Te(t,n.id)))},children:e("serversStart")}),(0,d.jsx)(w,{variant:"ghost",disabled:a||!c,busy:o===J(t,"servers.stop",n.id),onClick:()=>{r(J(t,"servers.stop",n.id),()=>T("servers.stop",Te(t,n.id)))},children:e("serversStop")}),(0,d.jsx)(w,{variant:"ghost",disabled:a||!c,busy:o===J(t,"servers.restart",n.id),onClick:()=>{r(J(t,"servers.restart",n.id),()=>T("servers.restart",Te(t,n.id)))},children:e("serversRestart")}),(0,d.jsx)(w,{variant:"ghost",disabled:a,onClick:i,children:e("serversEdit")}),(0,d.jsx)(w,{variant:"ghost",disabled:a,onClick:s,children:e("serversDelete")}),n.config.port==null?null:(0,d.jsx)(w,{variant:"ghost",disabled:a,onClick:u,children:e("serversFreePort")})]})}function Rn({text:e}){return e.length===0?(0,d.jsx)(d.Fragment,{children:Y}):(0,d.jsx)("span",{className:"hh-nowrap",title:e,children:(0,d.jsx)(Z,{children:e})})}function Ot({t:e,status:t,run:n,busy:r,uiStyle:o,workspace:a,servers:i,serversError:s}){let u=!t.panel.reachable||r!==null,c=new Map(a===t.workspace?(t.entries??[]).map(h=>[h.intent.id,h.intent]):[]),[g,N]=(0,ce.useState)(!1),[B,F]=(0,ce.useState)(null),[W,D]=(0,ce.useState)(null),[k,A]=(0,ce.useState)(null),[y,O]=(0,ce.useState)(null),H=()=>{N(!0),F(null),D(null),A(null)},M=h=>{N(!1),F(h),D(null),A(null)},G=()=>{N(!1),F(null)},K=async h=>{let E=At(h);if(E===null)return;(await n("servers.create",()=>T("servers.create",Cn(a,E)))).ok&&G()},oe=async(h,E,v)=>{let b=It(v.config,E);if(b===null){F(null);return}(await n(J(a,"servers.update",h),()=>T("servers.update",Pn(a,h,b)))).ok&&F(null)},Q=async h=>{D(null),await n(J(a,"servers.delete",h),()=>T("servers.delete",Nn(a,h)))},ue=async h=>{A(null);let E=await n(J(a,"servers.freePort",h.id),()=>T("servers.freePort",Te(a,h.id)));if(!E.ok){O(e("serversPortRefused",{message:E.error.message}));return}let v=E.value,b=v?.port??h.config.port??Y;if(v?.free===!0){O(e("serversPortFreed",{port:b}));return}O(v?.skipped!==void 0&&v.skipped.length>0?e("serversPortSkipped"):e("serversPortHeld",{port:b}))},j=k===null?null:i.find(h=>h.id===k)??null;return(0,d.jsxs)(q,{icon:(0,d.jsx)(be,{}),title:e("serversTitle"),action:(0,d.jsx)(_,{children:Dt(i,e)}),children:[(0,d.jsxs)(m,{children:[`${e("serversWorkspace")} `,(0,d.jsx)(Z,{children:a})," \xB7 ",t.panel.url===null?e("serversHintNoPanel"):(0,d.jsxs)(d.Fragment,{children:[`${e("serversHintPanel")} `,(0,d.jsx)(re,{href:t.panel.url,children:t.panel.url})]})]}),s===null?null:(0,d.jsx)(xe,{title:e("errorTitle"),detail:`${s.code} \u2014 ${s.message}`}),(0,d.jsx)("div",{className:"hh-btn-row",children:(0,d.jsx)(w,{variant:"primary",disabled:u||g,onClick:H,children:e("serversAdd")})}),g?(0,d.jsx)(Fe,{t:e,title:e("serversCreateTitle"),initial:Me({id:"",command:""}),submitLabel:e("serversCreate"),busy:r==="servers.create",lockId:!1,onSubmit:h=>{K(h)},onCancel:G},"create"):null,j===null?null:(0,d.jsxs)(z,{tone:"warn",title:e("serversFreePortTitle",{port:I(j.config.port)}),children:[(0,d.jsx)("p",{children:e("serversFreePortBody")}),(0,d.jsxs)("div",{className:"hh-note-actions",children:[(0,d.jsx)(w,{onClick:()=>A(null),children:e("confirmCancel")}),(0,d.jsx)(w,{variant:"danger",busy:r===J(a,"servers.freePort",j.id),onClick:()=>{ue(j)},children:e("serversFreePortGo")})]})]}),y===null?null:(0,d.jsx)(m,{children:y}),i.length===0?(0,d.jsx)(m,{children:e("serversEmpty")}):(0,d.jsx)("div",{className:o==="detailed"?"hh-cards":"hh-list",children:i.map(h=>{let E=h.status==="running",v=h.config,b=B===h.id?(0,d.jsx)(Fe,{t:e,title:e("serversEditTitle",{id:h.id}),initial:Me(v),submitLabel:e("serversSave"),busy:r===J(a,"servers.update",h.id),lockId:!0,onSubmit:Ce=>{oe(h.id,Ce,h)},onCancel:()=>F(null)},`edit:${h.id}`):null,$=W===h.id?(0,d.jsxs)(z,{tone:"warn",title:e("serversDeleteTitle",{id:h.id}),children:[(0,d.jsx)("p",{children:e("serversDeleteBody",{workspace:a})}),(0,d.jsxs)("div",{className:"hh-note-actions",children:[(0,d.jsx)(w,{onClick:()=>D(null),children:e("confirmCancel")}),(0,d.jsx)(w,{variant:"danger",busy:r===J(a,"servers.delete",h.id),onClick:()=>{Q(h.id)},children:e("serversDeleteGo")})]})]}):null,Oe=(0,d.jsx)(En,{t:e,workspace:a,server:h,run:n,busy:r,offline:u,onEdit:()=>M(h.id),onDelete:()=>{D(h.id),F(null),N(!1)},onFreePort:()=>{A(h.id),F(null),N(!1)}});if(o==="detailed"){let Ce=(v.args??[]).join(" "),Pe=v.cwd??"",Gt=c.get(h.id)?.persistent;return(0,d.jsxs)("article",{className:"hh-card",children:[(0,d.jsxs)("div",{className:"hh-card-head",children:[(0,d.jsx)("span",{className:"hh-item-name",children:h.id}),(0,d.jsx)(_,{tone:E?"ok":"idle",children:I(h.status)}),Gt===!0?(0,d.jsx)("span",{title:e("serversPersistentHint"),children:(0,d.jsx)(_,{tone:"accent",children:e("serversPersistent")})}):null,(0,d.jsx)("span",{className:"hh-item-spacer"}),(0,d.jsx)("span",{className:"hh-item-actions",children:Oe})]}),(0,d.jsxs)("div",{className:"hh-card-facts",children:[(0,d.jsx)(R,{label:e("serversUrl"),children:h.url===null?I(h.url):(0,d.jsx)(re,{href:h.url,children:h.url})}),(0,d.jsx)(R,{label:e("serversPid"),children:I(h.pid)}),(0,d.jsx)(R,{label:e("serversPort"),children:I(v.port)}),(0,d.jsx)(R,{label:e("serversAutostart"),children:v.autostart===void 0?Y:v.autostart?e("yes"):e("no")})]}),(0,d.jsxs)(ne,{label:e("serversConfiguration"),children:[(0,d.jsx)(R,{label:e("serversCommand"),children:v.command===void 0||v.command.length===0?Y:(0,d.jsx)("span",{className:"hh-nowrap",title:v.command,children:(0,d.jsx)(Z,{children:v.command})})}),(0,d.jsx)(R,{label:e("serversArgs"),children:(0,d.jsx)(Rn,{text:Ce})}),(0,d.jsx)(R,{label:e("serversCwd"),children:Pe.length===0?Y:(0,d.jsx)("span",{className:"hh-nowrap",title:Pe,children:(0,d.jsx)(Z,{children:ke(Pe)})})}),(0,d.jsx)(R,{label:e("serversOnPortConflict"),children:I(v.onPortConflict)}),(0,d.jsx)(R,{label:e("serversHealth"),children:Lt(v.health,v.port??null,e)}),(0,d.jsx)(R,{label:e("serversRestartPolicy"),children:Ft(v.restart,e)})]}),(0,d.jsx)(ne,{label:e("serversRawConfig"),children:(0,d.jsx)("pre",{className:"hh-output",children:JSON.stringify(v,null,2)})}),b,$]},h.id)}return(0,d.jsxs)(ce.Fragment,{children:[(0,d.jsxs)("div",{className:"hh-item",children:[(0,d.jsxs)("span",{className:"hh-item-main",children:[(0,d.jsx)("span",{className:"hh-item-name",children:h.id}),(0,d.jsx)(_,{tone:E?"ok":"idle",children:I(h.status)}),h.url===null?null:(0,d.jsx)(re,{href:h.url,children:h.url})]}),(0,d.jsx)("span",{className:"hh-item-spacer"}),h.pid===null?null:(0,d.jsx)("span",{className:"hh-item-meta",children:`${e("serversPid")} ${h.pid}`}),(0,d.jsx)("span",{className:"hh-item-actions",children:Oe})]}),b,$]},h.id)})})]})}var Ut=require("react");var L=require("react/jsx-runtime");function _t(e){let t=typeof e.label=="string"?e.label.trim():"";return t.length===0||t===e.id?e.id:`${e.id} \u2014 ${t}`}function An(e,t){return e.source==="file"?t("workspacesCountsFile",{servers:e.servers}):t("workspacesCounts",{servers:e.servers,running:e.running})}function Vt({t:e,status:t,run:n,updateSettings:r,busy:o,viewing:a,onView:i}){let s=t.workspaces??[],u=t.settings.workspace,c=t.defaultEntryId??"dsh",g=t.legacyRoot===!0||(t.lastError??"").includes("pre-0.7"),N=s.some(k=>k.source==="file"),[B,F]=(0,Ut.useState)(null),W=s.map(k=>({value:k.id,label:_t(k)}));!W.some(k=>k.value===u)&&je(u)&&W.unshift({value:u,label:u});let D=async()=>{let k=await n("panel.migrate",()=>T("panel.migrate",{}));if(!k.ok){F(`${e("workspaceMigrateFailed")} ${k.error.message}`);return}let A=k.value,y=typeof A?.detail=="string"&&A.detail.length>0?A.detail:null;A?.ok===!1?F(y??e("workspaceMigrateFailed")):F(y??e("workspaceMigrateDone"))};return(0,L.jsxs)(q,{icon:(0,L.jsx)(be,{}),title:e("workspacesTitle"),action:(0,L.jsx)(_,{tone:"accent",children:a}),children:[(0,L.jsx)(m,{children:e("workspacesHint",{id:c})}),s.length===0?(0,L.jsx)(m,{children:e("workspacesEmpty")}):(0,L.jsx)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("workspacesViewLabel"),children:s.map(k=>{let A=k.id===u?(0,L.jsx)(Se,{children:e("workspacesManagedTag")}):k.id===a?(0,L.jsx)(_,{tone:"accent",children:e("workspacesViewingTag")}):void 0;return(0,L.jsx)(me,{label:_t(k),meta:An(k,e),hint:A,checked:k.id===a,onChange:()=>i(k.id)},k.id)})}),N?(0,L.jsx)(z,{tone:"warn",children:e("workspacesDegraded")}):null,(0,L.jsxs)("div",{className:"hh-field-block",children:[(0,L.jsx)("span",{className:"hh-field-label",children:e("workspaceManagedLabel")}),(0,L.jsx)(ae,{value:u,label:e("workspaceManagedLabel"),disabled:o==="settings",options:W,onChange:k=>r(A=>({...A,workspace:k}))}),(0,L.jsx)(m,{children:e("workspaceManagedHint",{id:c})})]}),g?(0,L.jsxs)(z,{tone:"warn",title:e("workspaceLegacyTitle"),children:[(0,L.jsx)("p",{children:e("workspaceLegacyBody")}),(0,L.jsx)("div",{className:"hh-note-actions",children:(0,L.jsx)(w,{variant:"primary",busy:o==="panel.migrate",onClick:()=>{D()},children:e("workspaceMigrate")})})]}):null,B===null?null:(0,L.jsx)(m,{children:B})]})}var De=`
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
`;var f=require("react/jsx-runtime");function In({signal:e}){return(0,f.jsxs)("div",{className:"hh-signal","data-tone":e.tone,children:[(0,f.jsx)("span",{className:"hh-signal-dot","aria-hidden":"true"}),(0,f.jsx)("span",{className:"hh-signal-name",children:e.name}),(0,f.jsx)("span",{className:"hh-signal-state",children:e.state}),e.meta.length===0&&e.href===null?null:(0,f.jsxs)("span",{className:"hh-signal-meta",children:[e.meta,e.href===null?null:(0,f.jsxs)(f.Fragment,{children:[e.meta.length===0?null:" \xB7 ",(0,f.jsx)(re,{href:e.href,children:e.href})]})]})]})}function Wt(e){let t=We(e.t),{data:n,error:r,loading:o,refresh:a}=Ye(),[i,s]=(0,V.useState)(null),[u,c]=(0,V.useState)(null),[g,N]=(0,V.useState)(null),[B,F]=(0,V.useState)([]),[W,D]=(0,V.useState)(null),[k,A]=(0,V.useState)(0),y=(0,V.useRef)(null),O=g??n?.workspace??null,H=(0,V.useCallback)(async E=>{let v=await T("servers.list",{workspace:E});v.ok?(F(v.value),D(null)):D(v.error)},[]);(0,V.useEffect)(()=>{O!==null&&(y.current!==O&&(y.current=O,F([]),D(null)),H(O))},[O,k,H]);let M=(0,V.useCallback)((E,v)=>(c(E),s(null),(async()=>{try{let b=await v();return b.ok||s(b.error),b}catch(b){let $={code:"client",message:b instanceof Error?b.message:String(b)};return s($),{ok:!1,error:$}}finally{c(null),await a(),A(b=>b+1)}})()),[a]),G=(0,V.useCallback)(E=>{if(n===null)return;let v=pt(n.settings,E(n.settings));Object.keys(v).length!==0&&M("settings",()=>Ke(v))},[n,M]),K=n?.settings.uiStyle??"detailed",[oe,Q]=(0,V.useState)(K);(0,V.useEffect)(()=>{Q(K)},[K]);let ue=E=>{Q(E),G(v=>({...v,uiStyle:E}))};if(n===null)return(0,f.jsxs)("div",{className:"hh-root",children:[(0,f.jsx)("style",{children:De}),o?(0,f.jsx)(m,{children:t("loading")}):(0,f.jsxs)(f.Fragment,{children:[(0,f.jsx)(ge,{error:r??{code:"status",message:t("statusUnavailable")},title:t("errorTitle")}),(0,f.jsx)("div",{className:"hh-btn-row",children:(0,f.jsx)(w,{onClick:()=>{a()},children:t("retry")})})]})]});let j={t,status:n,run:M,updateSettings:G,busy:u,uiStyle:oe},h=O??n.workspace??"default";return(0,f.jsxs)("div",{className:"hh-root",children:[(0,f.jsx)("style",{children:De}),(0,f.jsxs)("header",{className:"hh-head",children:[(0,f.jsx)("h2",{className:"hh-title",children:t("tab")}),(0,f.jsx)("span",{className:"hh-head-spacer"}),(0,f.jsx)(ae,{value:oe,label:t("uiStyleLabel"),disabled:u==="settings",options:[{value:"detailed",label:t("uiStyleDetailed")},{value:"compact",label:t("uiStyleCompact")}],onChange:E=>ue(E)}),(0,f.jsx)(w,{variant:"ghost",icon:(0,f.jsx)(Qe,{size:13}),busy:u==="status.refresh",onClick:()=>{M("status.refresh",()=>T("status",{refresh:!0}))},children:t("refresh")})]}),(0,f.jsx)("div",{className:"hh-signals","data-busy":u!==null,children:Bt(n,t).map(E=>(0,f.jsx)(In,{signal:E},E.key))}),n.lastError===null?null:(0,f.jsx)(ge,{error:{code:"panel",message:n.lastError},title:t("errorTitle")}),(0,f.jsx)(ge,{error:r,title:t("errorTitle")}),(0,f.jsx)(ge,{error:i,title:t("errorTitle")}),(0,f.jsx)(Vt,{...j,viewing:h,onView:N}),(0,f.jsx)(Pt,{...j}),(0,f.jsx)(Tt,{...j}),(0,f.jsx)(Ct,{...j}),(0,f.jsx)(ft,{...j}),(0,f.jsx)(Ot,{...j,workspace:h,servers:B,serversError:W})]})}var Hn=["slots","locale"],$t="[dsh-home-hosted]";function se(e,t){t===void 0?console.warn(`${$t} ${e}`):console.warn(`${$t} ${e}`,t)}function jt(e,t){try{let n=e.get?.(t);if(n!=null)return n}catch{}try{let n=e[t];if(n!=null)return n}catch{}}function zt(e,t,n){if(typeof e.effect=="function")try{e.effect(t,n);return}catch(r){se(`registering the effect "${n}" failed`,r);return}try{t()}catch(r){se(`the effect "${n}" failed`,r)}}function Mn(e){try{let t=jt(e,"locale"),n=Ve(t);t===void 0?se("the locale service is unavailable; the page keeps its bundled English copy"):zt(e,()=>{let o=[];try{o.push(t.register(ve,{en:Ee,zh:_e}))}catch(a){se("registering the dictionaries failed",a)}return()=>{for(let a of o)try{a()}catch(i){se("disposing a dictionary failed",i)}}},"dsh-home-hosted: dictionaries");let r=jt(e,"slots");if(r===void 0){se("the slots service is unavailable; the settings section was not registered");return}zt(e,()=>{try{return r.inject("settings.section",()=>{try{return r.register({name:"settings.section",id:"home-hosted",order:60,label:()=>n("tab"),locale:ve,inject:()=>({t:n})},Wt)}catch(o){return se("registering the settings section failed",o),()=>{}}})}catch(o){return se("injecting into settings.section failed",o),()=>{}}},"dsh-home-hosted: settings section")}catch(t){se("client bootstrap failed",t)}}

return module.exports; } });
