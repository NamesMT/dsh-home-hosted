window.__ModuleLoader__.load({ id: "dsh-home-hosted", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";var Fe=Object.defineProperty;var tn=Object.getOwnPropertyDescriptor;var nn=Object.getOwnPropertyNames;var on=Object.prototype.hasOwnProperty;var rn=(e,t)=>{for(var n in t)Fe(e,n,{get:t[n],enumerable:!0})},an=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of nn(t))!on.call(e,o)&&o!==n&&Fe(e,o,{get:()=>t[o],enumerable:!(r=tn(t,o))||r.enumerable});return e};var sn=e=>an(Fe({},"__esModule",{value:!0}),e);var qn={};rn(qn,{apply:()=>Yn,inject:()=>Kn});module.exports=sn(qn);var Te="homeHosted",Be={tab:"Home Hosted",loading:"Loading\u2026",refresh:"Refresh",retry:"Retry",errorTitle:"Error",statusUnavailable:"The panel did not answer.",yes:"Yes",no:"No",copy:"Copy",copied:"Copied",details:"Details",uiStyleLabel:"Page style",uiStyleDetailed:"Detailed",uiStyleCompact:"Compact",workspacesTitle:"Workspaces",workspacesHint:"Every workspace this panel serves. Viewing one decides what this page lists.",workspacesViewLabel:"Workspace to view",workspacesEmpty:"The panel reports no workspaces yet.",workspacesManagedTag:"managed by the plugin",workspacesViewingTag:"viewing",workspacesCounts:"{servers} servers \xB7 {running} running",workspacesCountsFile:"{servers} in the config files",workspacesDegraded:"The panel is not answering, so these counts \u2014 and the entry list below \u2014 come from the workspace config files, not from live state.",workspaceLegacyTitle:"This state root still uses the pre-0.7 layout",workspaceLegacyBody:"home-hosted 0.8 no longer relocates it, and the plugin cannot read or write these files until they move into .hh. Install the latest 0.7.x once \u2014 its first run does the move \u2014 then start this release. Nothing has been changed or deleted.",sigPanel:"Panel",sigAutostart:"Autostart",sigEntry:"{id} entry",stateAnswering:"answering",stateNotAnswering:"not answering",stateManaged:"managed",stateNotManaged:"not managed",stateWebOnly:"web only",panelTitle:"Panel",panelCopy:"Which copy runs the panel",panelCopyHint:"The pinned copy ships with this plugin; the global one is on PATH.",optionsPreferPinned:"Pinned dependency",optionsPreferGlobal:"Global install",optionsRecommended:"recommended",optionsConfigOverride:"The plugin row sets homeHostedCommand, and that always wins.",optionsInstallLabel:"Install a global copy",optionsInstallHint:"No global install was found. Install the pinned range, then choose it above:",optionsInstall:"Install globally",panelHome:"Panel root",panelUrl:"URL",panelVersion:"Version",panelPid:"PID",panelWriteVia:"Writes via",panelToken:"API token",panelCliSource:"CLI",panelCliPath:"CLI path",panelCliConfig:"configured command",panelCliDependency:"pinned dependency",panelCliPathSource:"global install (PATH)",panelCliMissing:"not found",panelCliNotPinned:"This host resolved a global home-hosted instead of the pinned copy ({range}).",panelCliUnsupported:"This home-hosted is older than the oldest release the plugin supports.",panelCliLauncherFailed:"The boot launcher did not answer, so a boot entry may fail to start the panel.",panelPort:"Panel port",panelPortHint:"Only changeable while the panel is stopped.",panelPortFree:"Leave empty to use the port in the config.",panelPortInvalid:"Enter a port between 1 and 65535.",panelStart:"Start the panel",panelStop:"Stop the panel",panelStopTitle:"Stop the running panel?",panelStopBody:"This stops the panel and all non-persistent servers it supervises. Persistent entries keep running, and an installed autostart entry stops the panel through itself, so it does not restart it.",panelStopping:"Stopping the panel\u2026",panelStopped:"The panel stopped.",panelStopFailed:"The panel did not stop: {message}",panelStartFailed:"The panel did not start: {message}",panelReplaceFailed:"The panel was not replaced: {message}",panelInstallFailed:"Installing home-hosted globally failed: {message}",panelRootLegacy:"Adopted from ~/.home-hosted. Set HHOSTED_HOME to give this dsh its own panel.",confirmStop:"Stop",panelOutdated:"Outdated panel",panelReplace:"Restart with {copy}",panelCopyPinned:"pinned dependency",panelCopyGlobal:"global install",panelTakeoverTitle:"Restart the running panel?",panelTakeoverBody:"This stops the panel and all non-persistent servers it supervises. Persistent entries keep running. It needs the {id} entry adopted with autostart on.",confirmCancel:"Cancel",confirmReplace:"Restart",writeViaApi:"authenticated API",writeViaFile:"config file",writeViaNone:"unavailable",tokenEnrolled:"enrolled",tokenPresent:"present",tokenAbsent:"absent",tokenStale:"stale",tokenUnknown:"unknown",panelTokenWarningTitle:"The panel API token is missing or refused",panelTokenWarnAbsent:"This plugin has no API token for the panel, so it cannot read or write the panel; regenerate one.",panelTokenWarnPresent:"home-hosted holds an API token this plugin does not have, so the plugin cannot authenticate; regenerate one to replace it.",panelTokenWarnStale:"The panel refused this plugin's API token; regenerate it.",panelTokenWarnUnreachable:"The plugin could not reach the panel to check its API token, so it cannot read or write the panel; the panel may need starting.",panelTokenWarnPanelDown:"The panel is not answering right now, so it may need starting too.",panelTokenRegenerate:"Regenerate token",panelTokenRegenerated:"A fresh API token was enrolled for the panel.",panelTokenRegenerateFailed:"The token was not replaced: {message}",panelInstances:"{count} panels found",panelInstanceManaged:"managed by this plugin",panelInstanceOther:"another panel",panelInstanceHosts:"hosts this dsh",panelInstancesHint:"This plugin drives only the managed one; the others are read from their state roots and never written to.",bootTitle:"Autostart",bootEnabled:"Enable autostart",bootUninstall:"Uninstall",bootSwitchMode:"Switch autostart",bootRecheck:"Re-check",bootMechanism:"Mechanism",bootMechanismAuto:"Automatic",bootMechanismAutoHint:"Picked from what this machine can actually use, preferring a mechanism that starts before you log in.",bootMechanismAutoPicks:"The next install would use {mechanism}.",bootState:"State",bootStateNotInstalled:"not installed",bootStateInstalledDisabled:"installed, off",bootStateEnabledRunning:"enabled, running",bootStateEnabledFailing:"enabled, failing",bootStateUnsupported:"unsupported",bootBootCapable:"Starts before login",bootPrivileged:"This process can install it",bootUnitPath:"Unit path",bootCommandsLabel:"Install by hand",bootCommandsExplain:"This process cannot elevate. Run these commands to install autostart:",bootRequestedNotInstalled:"Autostart is requested, but no boot entry is installed.",bootHandover:"Enabling this stops the panel this plugin started and starts it through the entry. Persistent entries keep running, so this session stays up and the page keeps working; it shows the panel again once it answers.",bootSwitchRetires:"Switching stops the panel and removes the previous autostart entry. Persistent entries keep running, so this session stays up and the page keeps working; it shows the panel again once the entry starts one.",bootActionInstall:"install",bootActionUninstall:"uninstall",bootAttemptFailed:"{action} failed",bootAttemptSucceeded:"{action} succeeded \u2014 {detail}",bootAttemptNoDetail:"The host did not explain the refusal.",bootAttemptCommands:"Run these yourself:",entriesTitle:"Managed entry",entriesManage:"Manage {id}",entriesManageNote:"Hands {id} to home-hosted: boot autostart, panel control, port reclaim.",entriesManageDesktop:"Available for dsh web only. Desktop starts its own profile, so it is never one of the panel's entries \u2014 servers are still managed here.",entriesManageWinWarning:"On Windows, `{id}` is managed via the `kill` onPortConflict policy, so when it is restarted detached by another plugin it may briefly fail to boot while home-hosted reclaims the process and port.",entriesEmpty:"{id} is not managed yet.",entriesExists:"exists",entriesMissing:"missing",entriesManaged:"managed",entriesUnmanaged:"unmanaged",entriesDrift:"drift",entriesNotRunning:"not running",agentTitle:"Agent tools",agentCount:"{enabled} of {total} on",agentMaster:"Let the agent use these tools",agentApproval:"Tools that change something ask for approval first.",agentApprovalBadge:"approval",reclaimAutoLabel:"Regenerate token automatically",reclaimAutoHint:"A tool call that finds a refused token re-enrols one and retries instead of failing.",instancesNoticeLabel:"Tell the agent about other panels",instancesNoticeHint:"Adds the panel inventory to the agent's context, and asks which panel to act on when several exist.",agentToolStatus:"Status",agentToolWorkspacesList:"List workspaces",agentToolServersList:"List servers",agentToolServersLifecycle:"Start, stop, restart",agentToolServersEdit:"Create, update, delete",agentToolAutostartManage:"Manage boot autostart",agentToolUiManage:"Manage Panel UI",agentToolPanelLogs:"Panel Logs",agentToolDescStatus:"Read the panel, the CLI copy in use and the managed entry. Nothing changes.",agentToolDescWorkspacesList:"List every workspace the panel serves, with its entry and running counts. A server id is only unique inside a workspace.",agentToolDescServersList:"List the servers of one workspace, with status, port and URL.",agentToolDescServersLifecycle:"Start, stop and restart supervised servers.",agentToolDescServersEdit:"Create, update and delete server entries.",agentToolDescAutostartManage:"Install or remove the boot entry that starts the panel.",agentToolDescUiManage:"Inspect, update, revert or install an official UI build.",agentToolDescPanelLogs:"Read the panel's own console output. Needs no API token, so it works when the panel is up but not answering.",serversTitle:"Servers",serversCount:"{running} of {total} running",serversHintPanel:"Entries are managed in the home-hosted panel:",serversHintNoPanel:"Entries cannot be managed right now: the panel is not running.",serversEmpty:"The panel reports no servers.",serversStopped:"Stopped by the panel",serversStoppedByPanel:"The panel gave up on this entry because it never passed its health check. Starting it again clears the flag.",serversPid:"PID",serversUrl:"URL",serversCommand:"Command",serversArgs:"Args",serversCwd:"Working dir",serversPort:"Port",serversOnPortConflict:"On port conflict",serversAutostart:"Autostart",serversPersistent:"Persistent",serversPersistentHint:"Run by home-hosted's own nanny, so stopping or restarting the panel leaves it alive.",serversHealth:"Health",serversRestartPolicy:"Restart",serversConfiguration:"Configuration",serversRawConfig:"Raw config",serversDisabled:"disabled",serversEnabled:"enabled",serversHealthHttp:"HTTP {status} on {path}",serversHealthHttpBelow:"HTTP <{status} on {path}",serversHealthHttpProbe:"HTTP probe on {path}",serversHealthPort:"port {port}",serversHealthProbe:"port probe",serversHealthEvery:"every {seconds}",serversRestartSummary:"{retries} retries \xB7 {base} \u2192 \xD7{factor}",serversStart:"Start",serversStop:"Stop",serversRestart:"Restart",serversWorkspace:"Workspace",serversAdd:"Add server",serversEdit:"Edit",serversEditTitle:"Edit {id}",serversCreateTitle:"Add a server",serversEditorHint:"Only the fields you change are written. These are the common ones \u2014 the panel link above edits every field, including bootstrap, env files, resources and restart policy.",serversCreate:"Create",serversSave:"Save",serversDelete:"Delete",serversDeleteTitle:"Delete {id}?",serversDeleteBody:"This removes the entry from workspace {workspace}. A running server is stopped with it.",serversDeleteGo:"Delete",serversFreePort:"Free port",serversFreePortTitle:"Free port {port}?",serversFreePortBody:"Stops whatever holds the port, unless the panel supervises it. Processes get SIGTERM first, then a forced stop.",serversFreePortGo:"Free",serversPortFreed:"Port {port} is free.",serversPortHeld:"Port {port} is still held.",serversPortSkipped:"The listener belongs to a server the panel supervises, so it was left alone.",serversPortRefused:"The port was not freed: {message}",fieldId:"Id",fieldIdHint:"Lowercase letters, digits, `_` and `-`; unique inside the workspace.",fieldIdInvalid:"An id starts with a lowercase letter or digit and uses only a-z, 0-9, _ and -.",fieldLabel:"Label",fieldCommand:"Command",fieldArgs:"Arguments",fieldArgsHint:"One argument per line.",fieldCwd:"Working directory",fieldPort:"Port",fieldPortHint:"Empty means the entry has no port.",fieldPortInvalid:"Enter a port between 1 and 65535, or leave it empty.",fieldAutostart:"Start with the panel",fieldOnPortConflict:"On port conflict",fieldInherit:"Inherit",fieldRequired:"Id and command are required."},Ge={tab:"Home Hosted",loading:"\u52A0\u8F7D\u4E2D\u2026",refresh:"\u5237\u65B0",retry:"\u91CD\u8BD5",errorTitle:"\u9519\u8BEF",statusUnavailable:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\u3002",yes:"\u662F",no:"\u5426",copy:"\u590D\u5236",copied:"\u5DF2\u590D\u5236",details:"\u8BE6\u60C5",uiStyleLabel:"\u9875\u9762\u6837\u5F0F",uiStyleDetailed:"\u8BE6\u7EC6",uiStyleCompact:"\u7D27\u51D1",workspacesTitle:"\u5DE5\u4F5C\u533A",workspacesHint:"\u6B64\u9762\u677F\u63D0\u4F9B\u7684\u6240\u6709\u5DE5\u4F5C\u533A\u3002\u67E5\u770B\u54EA\u4E2A\u5C31\u5217\u51FA\u54EA\u4E2A\u3002",workspacesViewLabel:"\u8981\u67E5\u770B\u7684\u5DE5\u4F5C\u533A",workspacesEmpty:"\u9762\u677F\u5C1A\u672A\u62A5\u544A\u4EFB\u4F55\u5DE5\u4F5C\u533A\u3002",workspacesManagedTag:"\u7531\u63D2\u4EF6\u7BA1\u7406",workspacesViewingTag:"\u6B63\u5728\u67E5\u770B",workspacesCounts:"{servers} \u4E2A\u670D\u52A1\u5668 \xB7 {running} \u4E2A\u8FD0\u884C\u4E2D",workspacesCountsFile:"\u914D\u7F6E\u6587\u4EF6\u4E2D {servers} \u4E2A",workspacesDegraded:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\uFF0C\u56E0\u6B64\u8FD9\u4E9B\u8BA1\u6570\u2014\u2014\u4EE5\u53CA\u4E0B\u65B9\u7684\u6761\u76EE\u5217\u8868\u2014\u2014\u6765\u81EA\u5DE5\u4F5C\u533A\u914D\u7F6E\u6587\u4EF6\uFF0C\u800C\u4E0D\u662F\u5B9E\u65F6\u72B6\u6001\u3002",workspaceLegacyTitle:"\u8BE5\u72B6\u6001\u76EE\u5F55\u4ECD\u662F 0.7 \u4E4B\u524D\u7684\u5E03\u5C40",workspaceLegacyBody:"home-hosted 0.8 \u4E0D\u518D\u8FC1\u79FB\u8BE5\u5E03\u5C40\uFF0C\u5728\u8FD9\u4E9B\u6587\u4EF6\u79FB\u5165 .hh \u4E4B\u524D\uFF0C\u63D2\u4EF6\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u5B83\u4EEC\u3002\u8BF7\u5148\u5B89\u88C5\u5E76\u8FD0\u884C\u4E00\u6B21\u6700\u65B0\u7684 0.7.x\u2014\u2014\u5B83\u9996\u6B21\u8FD0\u884C\u5373\u5B8C\u6210\u8FC1\u79FB\u2014\u2014\u7136\u540E\u542F\u52A8\u672C\u7248\u672C\u3002\u4E0D\u4F1A\u6539\u52A8\u6216\u5220\u9664\u4EFB\u4F55\u5185\u5BB9\u3002",sigPanel:"\u9762\u677F",sigAutostart:"\u5F00\u673A\u81EA\u542F",sigEntry:"{id} \u6761\u76EE",stateAnswering:"\u54CD\u5E94\u4E2D",stateNotAnswering:"\u672A\u54CD\u5E94",stateManaged:"\u5DF2\u63A5\u7BA1",stateNotManaged:"\u672A\u63A5\u7BA1",stateWebOnly:"\u4EC5 web",panelTitle:"\u9762\u677F",panelCopy:"\u7531\u54EA\u4E2A\u526F\u672C\u8FD0\u884C\u9762\u677F",panelCopyHint:"\u56FA\u5B9A\u526F\u672C\u968F\u63D2\u4EF6\u4E00\u8D77\u5B89\u88C5\uFF1B\u5168\u5C40\u526F\u672C\u6765\u81EA PATH\u3002",optionsPreferPinned:"\u56FA\u5B9A\u4F9D\u8D56",optionsPreferGlobal:"\u5168\u5C40\u5B89\u88C5",optionsRecommended:"\u63A8\u8350",optionsConfigOverride:"\u63D2\u4EF6\u884C\u4E2D\u7684 homeHostedCommand \u4F18\u5148\u7EA7\u6700\u9AD8\uFF0C\u59CB\u7EC8\u751F\u6548\u3002",optionsInstallLabel:"\u5B89\u88C5\u5168\u5C40\u526F\u672C",optionsInstallHint:"\u672A\u627E\u5230\u5168\u5C40\u5B89\u88C5\u3002\u5B89\u88C5\u56FA\u5B9A\u7248\u672C\u8303\u56F4\u540E\uFF0C\u5728\u4E0A\u65B9\u9009\u62E9\u5B83\uFF1A",optionsInstall:"\u5168\u5C40\u5B89\u88C5",panelHome:"\u9762\u677F\u6839\u76EE\u5F55",panelUrl:"URL",panelVersion:"\u7248\u672C",panelPid:"PID",panelWriteVia:"\u5199\u5165\u65B9\u5F0F",panelToken:"API \u4EE4\u724C",panelCliSource:"CLI",panelCliPath:"CLI \u8DEF\u5F84",panelCliConfig:"\u914D\u7F6E\u7684\u547D\u4EE4",panelCliDependency:"\u56FA\u5B9A\u7684\u4F9D\u8D56\u7248\u672C",panelCliPathSource:"\u5168\u5C40\u5B89\u88C5\uFF08PATH\uFF09",panelCliMissing:"\u672A\u627E\u5230",panelCliNotPinned:"\u6B64\u5BBF\u4E3B\u89E3\u6790\u5230\u7684\u662F\u5168\u5C40 home-hosted\uFF0C\u800C\u4E0D\u662F\u56FA\u5B9A\u526F\u672C\uFF08{range}\uFF09\u3002",panelCliUnsupported:"\u6B64 home-hosted \u65E9\u4E8E\u63D2\u4EF6\u652F\u6301\u7684\u6700\u8001\u7248\u672C\u3002",panelCliLauncherFailed:"\u5F00\u673A\u542F\u52A8\u5668\u6CA1\u6709\u5E94\u7B54\uFF0C\u5F00\u673A\u9879\u53EF\u80FD\u65E0\u6CD5\u542F\u52A8\u9762\u677F\u3002",panelPort:"\u9762\u677F\u7AEF\u53E3",panelPortHint:"\u4EC5\u5728\u9762\u677F\u505C\u6B62\u65F6\u53EF\u4FEE\u6539\u3002",panelPortFree:"\u7559\u7A7A\u5219\u4F7F\u7528\u914D\u7F6E\u6587\u4EF6\u4E2D\u7684\u7AEF\u53E3\u3002",panelPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\u3002",panelStart:"\u542F\u52A8\u9762\u677F",panelStop:"\u505C\u6B62\u9762\u677F",panelStopTitle:"\u505C\u6B62\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelStopBody:"\u8FD9\u4F1A\u505C\u6B62\u9762\u677F\u4EE5\u53CA\u5B83\u76D1\u7BA1\u7684\u6240\u6709\u975E\u6301\u4E45\u5316\u670D\u52A1\u5668\uFF1B\u6301\u4E45\u5316\u6761\u76EE\u4F1A\u7EE7\u7EED\u8FD0\u884C\u3002\u82E5\u5DF2\u5B89\u88C5\u81EA\u542F\u6761\u76EE\uFF0C\u505C\u6B62\u4F1A\u901A\u8FC7\u8BE5\u6761\u76EE\u8FDB\u884C\uFF0C\u56E0\u6B64\u4E0D\u4F1A\u628A\u9762\u677F\u91CD\u65B0\u62C9\u8D77\u3002",panelStopping:"\u6B63\u5728\u505C\u6B62\u9762\u677F\u2026",panelStopped:"\u9762\u677F\u5DF2\u505C\u6B62\u3002",panelStopFailed:"\u9762\u677F\u672A\u80FD\u505C\u6B62\uFF1A{message}",panelStartFailed:"\u9762\u677F\u672A\u80FD\u542F\u52A8\uFF1A{message}",panelReplaceFailed:"\u9762\u677F\u672A\u80FD\u66FF\u6362\uFF1A{message}",panelInstallFailed:"\u5168\u5C40\u5B89\u88C5 home-hosted \u5931\u8D25\uFF1A{message}",panelRootLegacy:"\u6CBF\u7528\u4E86 ~/.home-hosted\u3002\u8BBE\u7F6E HHOSTED_HOME \u53EF\u8BA9\u6B64 dsh \u4F7F\u7528\u81EA\u5DF1\u7684\u9762\u677F\u3002",confirmStop:"\u505C\u6B62",panelOutdated:"\u9762\u677F\u5DF2\u8FC7\u65F6",panelReplace:"\u4F7F\u7528{copy}\u91CD\u542F",panelCopyPinned:"\u56FA\u5B9A\u4F9D\u8D56",panelCopyGlobal:"\u5168\u5C40\u5B89\u88C5",panelTakeoverTitle:"\u91CD\u542F\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelTakeoverBody:"\u8FD9\u4F1A\u505C\u6B62\u9762\u677F\u4EE5\u53CA\u5B83\u76D1\u7BA1\u7684\u6240\u6709\u975E\u6301\u4E45\u5316\u670D\u52A1\u5668\uFF1B\u6301\u4E45\u5316\u6761\u76EE\u4F1A\u7EE7\u7EED\u8FD0\u884C\u3002\u4EC5\u5F53 {id} \u6761\u76EE\u5DF2\u88AB\u63A5\u7BA1\u4E14\u542F\u7528\u81EA\u542F\u65F6\u624D\u53EF\u7528\u3002",confirmCancel:"\u53D6\u6D88",confirmReplace:"\u91CD\u542F",writeViaApi:"\u5DF2\u8BA4\u8BC1 API",writeViaFile:"\u914D\u7F6E\u6587\u4EF6",writeViaNone:"\u4E0D\u53EF\u7528",tokenEnrolled:"\u5DF2\u767B\u8BB0",tokenPresent:"\u5DF2\u5B58\u5728",tokenAbsent:"\u4E0D\u5B58\u5728",tokenStale:"\u5DF2\u5931\u6548",tokenUnknown:"\u672A\u77E5",panelTokenWarningTitle:"\u9762\u677F API \u4EE4\u724C\u7F3A\u5931\u6216\u5DF2\u88AB\u62D2\u7EDD",panelTokenWarnAbsent:"\u672C\u63D2\u4EF6\u6CA1\u6709\u6B64\u9762\u677F\u7684 API \u4EE4\u724C\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u9762\u677F\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u4E00\u4E2A\u3002",panelTokenWarnPresent:"home-hosted \u6301\u6709\u4E00\u4E2A\u672C\u63D2\u4EF6\u6CA1\u6709\u7684 API \u4EE4\u724C\uFF0C\u63D2\u4EF6\u65E0\u6CD5\u901A\u8FC7\u8BA4\u8BC1\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u4E00\u4E2A\u4EE5\u66FF\u6362\u5B83\u3002",panelTokenWarnStale:"\u9762\u677F\u62D2\u7EDD\u4E86\u672C\u63D2\u4EF6\u7684 API \u4EE4\u724C\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u3002",panelTokenWarnUnreachable:"\u672C\u63D2\u4EF6\u65E0\u6CD5\u8BBF\u95EE\u9762\u677F\u4EE5\u68C0\u67E5\u5176 API \u4EE4\u724C\uFF0C\u56E0\u6B64\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u9762\u677F\uFF1B\u9762\u677F\u53EF\u80FD\u8FD8\u9700\u8981\u5148\u542F\u52A8\u3002",panelTokenWarnPanelDown:"\u9762\u677F\u5F53\u524D\u6CA1\u6709\u54CD\u5E94\uFF0C\u53EF\u80FD\u8FD8\u9700\u8981\u5148\u542F\u52A8\u9762\u677F\u3002",panelTokenRegenerate:"\u91CD\u65B0\u751F\u6210\u4EE4\u724C",panelTokenRegenerated:"\u5DF2\u4E3A\u9762\u677F\u767B\u8BB0\u65B0\u4EE4\u724C\u3002",panelTokenRegenerateFailed:"\u4EE4\u724C\u672A\u66FF\u6362\uFF1A{message}",panelInstances:"\u53D1\u73B0 {count} \u4E2A\u9762\u677F",panelInstanceManaged:"\u7531\u672C\u63D2\u4EF6\u7BA1\u7406",panelInstanceOther:"\u5176\u4ED6\u9762\u677F",panelInstanceHosts:"\u6258\u7BA1\u5F53\u524D dsh",panelInstancesHint:"\u672C\u63D2\u4EF6\u53EA\u9A71\u52A8\u88AB\u7BA1\u7406\u7684\u90A3\u4E00\u4E2A\uFF1B\u5176\u4ED6\u9762\u677F\u4EC5\u4ECE\u5176\u72B6\u6001\u76EE\u5F55\u8BFB\u53D6\uFF0C\u7EDD\u4E0D\u5199\u5165\u3002",bootTitle:"\u5F00\u673A\u81EA\u542F",bootEnabled:"\u542F\u7528\u5F00\u673A\u81EA\u542F",bootUninstall:"\u5378\u8F7D",bootSwitchMode:"\u5207\u6362\u81EA\u542F\u673A\u5236",bootRecheck:"\u91CD\u65B0\u68C0\u67E5",bootMechanism:"\u673A\u5236",bootMechanismAuto:"\u81EA\u52A8",bootMechanismAutoHint:"\u6839\u636E\u672C\u673A\u5B9E\u9645\u53EF\u7528\u7684\u65B9\u5F0F\u81EA\u52A8\u9009\u62E9\uFF0C\u4F18\u5148\u9009\u62E9\u5728\u767B\u5F55\u524D\u5373\u53EF\u542F\u52A8\u7684\u673A\u5236\u3002",bootMechanismAutoPicks:"\u4E0B\u6B21\u5B89\u88C5\u5C06\u4F7F\u7528 {mechanism}\u3002",bootState:"\u72B6\u6001",bootStateNotInstalled:"\u672A\u5B89\u88C5",bootStateInstalledDisabled:"\u5DF2\u5B89\u88C5\uFF0C\u672A\u542F\u7528",bootStateEnabledRunning:"\u5DF2\u542F\u7528\uFF0C\u8FD0\u884C\u4E2D",bootStateEnabledFailing:"\u5DF2\u542F\u7528\uFF0C\u542F\u52A8\u5931\u8D25",bootStateUnsupported:"\u4E0D\u652F\u6301",bootBootCapable:"\u767B\u5F55\u524D\u542F\u52A8",bootPrivileged:"\u672C\u8FDB\u7A0B\u53EF\u5B89\u88C5",bootUnitPath:"\u5355\u5143\u6587\u4EF6\u8DEF\u5F84",bootCommandsLabel:"\u624B\u52A8\u5B89\u88C5",bootCommandsExplain:"\u672C\u8FDB\u7A0B\u65E0\u6CD5\u63D0\u6743\u3002\u8BF7\u81EA\u884C\u6267\u884C\u4EE5\u4E0B\u547D\u4EE4\u6765\u5B89\u88C5\u81EA\u542F\uFF1A",bootRequestedNotInstalled:"\u5DF2\u8BF7\u6C42\u5F00\u673A\u81EA\u542F\uFF0C\u4F46\u5C1A\u672A\u5B89\u88C5\u4EFB\u4F55\u5F00\u673A\u9879\u3002",bootHandover:"\u542F\u7528\u540E\u4F1A\u505C\u6B62\u672C\u63D2\u4EF6\u542F\u52A8\u7684\u9762\u677F\uFF0C\u6539\u7531\u8BE5\u5F00\u673A\u9879\u542F\u52A8\u3002\u6301\u4E45\u5316\u6761\u76EE\u4F1A\u7EE7\u7EED\u8FD0\u884C\uFF0C\u56E0\u6B64\u672C\u4F1A\u8BDD\u4E0D\u53D7\u5F71\u54CD\u3001\u9875\u9762\u4FDD\u6301\u53EF\u7528\uFF1B\u9762\u677F\u6062\u590D\u5E94\u7B54\u540E\u9875\u9762\u4F1A\u91CD\u65B0\u663E\u793A\u5B83\u3002",bootSwitchRetires:"\u5207\u6362\u4F1A\u505C\u6B62\u9762\u677F\u5E76\u79FB\u9664\u5148\u524D\u7684\u81EA\u542F\u9879\u3002\u6301\u4E45\u5316\u6761\u76EE\u4F1A\u7EE7\u7EED\u8FD0\u884C\uFF0C\u56E0\u6B64\u672C\u4F1A\u8BDD\u4E0D\u53D7\u5F71\u54CD\u3001\u9875\u9762\u4FDD\u6301\u53EF\u7528\uFF1B\u8BE5\u5F00\u673A\u9879\u542F\u52A8\u65B0\u9762\u677F\u540E\u9875\u9762\u4F1A\u91CD\u65B0\u663E\u793A\u5B83\u3002",bootActionInstall:"\u5B89\u88C5",bootActionUninstall:"\u5378\u8F7D",bootAttemptFailed:"{action}\u5931\u8D25",bootAttemptSucceeded:"{action}\u6210\u529F \u2014 {detail}",bootAttemptNoDetail:"\u5BBF\u4E3B\u6CA1\u6709\u8BF4\u660E\u5931\u8D25\u539F\u56E0\u3002",bootAttemptCommands:"\u4F60\u53EF\u4EE5\u81EA\u884C\u8FD0\u884C\u4EE5\u4E0B\u547D\u4EE4\uFF1A",entriesTitle:"\u53D7\u7BA1\u6761\u76EE",entriesManage:"\u63A5\u7BA1 {id}",entriesManageNote:"\u628A {id} \u4EA4\u7ED9 home-hosted\uFF1A\u5F00\u673A\u81EA\u542F\u3001\u9762\u677F\u63A7\u5236\u3001\u7AEF\u53E3\u56DE\u6536\u3002",entriesManageDesktop:"\u4EC5\u9002\u7528\u4E8E dsh web\u3002Desktop \u542F\u52A8\u81EA\u5DF1\u7684 profile\uFF0C\u56E0\u6B64\u5B83\u6C38\u8FDC\u4E0D\u4F1A\u6210\u4E3A\u9762\u677F\u4E2D\u7684\u6761\u76EE\u2014\u2014\u670D\u52A1\u5668\u4ECD\u53EF\u5728\u6B64\u7BA1\u7406\u3002",entriesManageWinWarning:"\u5728 Windows \u4E0A\uFF0C`{id}` \u901A\u8FC7 `kill` \u7AEF\u53E3\u51B2\u7A81\u7B56\u7565\u7BA1\u7406\uFF1B\u5F53\u5B83\u88AB\u5176\u4ED6\u63D2\u4EF6\u4EE5\u5206\u79BB\u65B9\u5F0F\u91CD\u542F\u65F6\uFF0Chome-hosted \u56DE\u6536\u8FDB\u7A0B\u4E0E\u7AEF\u53E3\u671F\u95F4\u53EF\u80FD\u77ED\u6682\u65E0\u6CD5\u542F\u52A8\u3002",entriesEmpty:"\u5C1A\u672A\u63A5\u7BA1 {id}\u3002",entriesExists:"\u5B58\u5728",entriesMissing:"\u7F3A\u5931",entriesManaged:"\u5DF2\u63A5\u7BA1",entriesUnmanaged:"\u672A\u63A5\u7BA1",entriesDrift:"\u6F02\u79FB",entriesNotRunning:"\u672A\u8FD0\u884C",agentTitle:"Agent \u5DE5\u5177",agentCount:"\u5DF2\u5F00\u542F {enabled}/{total}",agentMaster:"\u5141\u8BB8 Agent \u8C03\u7528\u8FD9\u4E9B\u5DE5\u5177",agentApproval:"\u4F1A\u6539\u53D8\u72B6\u6001\u7684\u5DE5\u5177\u5728\u8FD0\u884C\u524D\u4F1A\u8BF7\u6C42\u6279\u51C6\u3002",agentApprovalBadge:"\u9700\u6279\u51C6",reclaimAutoLabel:"\u88AB\u62D2\u7EDD\u65F6\u81EA\u52A8\u91CD\u65B0\u751F\u6210\u4EE4\u724C",reclaimAutoHint:"\u5DE5\u5177\u8C03\u7528\u9047\u5230\u88AB\u62D2\u7EDD\u7684\u4EE4\u724C\u65F6\u4F1A\u91CD\u65B0\u767B\u8BB0\u5E76\u91CD\u8BD5\uFF0C\u800C\u4E0D\u662F\u76F4\u63A5\u5931\u8D25\u3002",instancesNoticeLabel:"\u5411 Agent \u8BF4\u660E\u5176\u4ED6\u9762\u677F",instancesNoticeHint:"\u628A\u9762\u677F\u6E05\u5355\u52A0\u5165 Agent \u4E0A\u4E0B\u6587\uFF1B\u5B58\u5728\u591A\u4E2A\u9762\u677F\u65F6\u4F1A\u5148\u8BE2\u95EE\u8981\u64CD\u4F5C\u54EA\u4E00\u4E2A\u3002",agentToolStatus:"\u67E5\u770B\u72B6\u6001",agentToolWorkspacesList:"\u5217\u51FA\u5DE5\u4F5C\u533A",agentToolServersList:"\u5217\u51FA\u670D\u52A1\u5668",agentToolServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u3001\u91CD\u542F",agentToolServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u3001\u5220\u9664",agentToolAutostartManage:"\u7BA1\u7406\u5F00\u673A\u81EA\u542F",agentToolUiManage:"\u7BA1\u7406\u9762\u677F UI",agentToolPanelLogs:"\u9762\u677F\u65E5\u5FD7",agentToolDescStatus:"\u8BFB\u53D6\u9762\u677F\u3001\u6B63\u5728\u4F7F\u7528\u7684 CLI \u526F\u672C\u548C\u53D7\u7BA1\u6761\u76EE\u3002\u4E0D\u6539\u53D8\u4EFB\u4F55\u72B6\u6001\u3002",agentToolDescWorkspacesList:"\u5217\u51FA\u9762\u677F\u63D0\u4F9B\u7684\u6240\u6709\u5DE5\u4F5C\u533A\u53CA\u5176\u6761\u76EE\u6570\u548C\u8FD0\u884C\u6570\u3002\u670D\u52A1\u5668 id \u53EA\u5728\u5DE5\u4F5C\u533A\u5185\u552F\u4E00\u3002",agentToolDescServersList:"\u5217\u51FA\u67D0\u4E2A\u5DE5\u4F5C\u533A\u4E2D\u88AB\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u53CA\u5176\u72B6\u6001\u3001\u7AEF\u53E3\u548C URL\u3002",agentToolDescServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u548C\u91CD\u542F\u53D7\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u3002",agentToolDescServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u548C\u5220\u9664\u670D\u52A1\u5668\u6761\u76EE\u3002",agentToolDescAutostartManage:"\u5B89\u88C5\u6216\u79FB\u9664\u542F\u52A8\u9762\u677F\u7684\u5F00\u673A\u9879\u3002",agentToolDescUiManage:"\u67E5\u770B\u3001\u66F4\u65B0\u3001\u56DE\u9000\u6216\u5B89\u88C5\u5B98\u65B9 UI \u6784\u5EFA\u3002",agentToolDescPanelLogs:"\u8BFB\u53D6\u9762\u677F\u81EA\u8EAB\u7684\u63A7\u5236\u53F0\u8F93\u51FA\u3002\u65E0\u9700 API \u4EE4\u724C\uFF0C\u56E0\u6B64\u9762\u677F\u5728\u8FD0\u884C\u4F46\u65E0\u54CD\u5E94\u65F6\u4E5F\u80FD\u4F7F\u7528\u3002",serversTitle:"\u670D\u52A1\u5668",serversCount:"{total} \u4E2A\u4E2D {running} \u4E2A\u8FD0\u884C\u4E2D",serversHintPanel:"\u5728 home-hosted \u9762\u677F\u4E2D\u7BA1\u7406\u6761\u76EE\uFF1A",serversHintNoPanel:"\u5F53\u524D\u65E0\u6CD5\u7BA1\u7406\u6761\u76EE\uFF1A\u9762\u677F\u6CA1\u6709\u8FD0\u884C\u3002",serversEmpty:"\u9762\u677F\u672A\u62A5\u544A\u4EFB\u4F55\u670D\u52A1\u5668\u3002",serversStopped:"\u88AB\u9762\u677F\u505C\u6B62",serversStoppedByPanel:"\u8BE5\u6761\u76EE\u59CB\u7EC8\u672A\u901A\u8FC7\u5065\u5EB7\u68C0\u67E5\uFF0C\u9762\u677F\u5DF2\u653E\u5F03\u5B83\u3002\u91CD\u65B0\u542F\u52A8\u5373\u53EF\u6E05\u9664\u6B64\u6807\u8BB0\u3002",serversPid:"PID",serversUrl:"URL",serversCommand:"\u547D\u4EE4",serversArgs:"\u53C2\u6570",serversCwd:"\u5DE5\u4F5C\u76EE\u5F55",serversPort:"\u7AEF\u53E3",serversOnPortConflict:"\u7AEF\u53E3\u51B2\u7A81\u65F6",serversAutostart:"\u81EA\u542F",serversPersistent:"\u6301\u4E45\u5316",serversPersistentHint:"\u7531 home-hosted \u81EA\u5E26\u7684 nanny \u6258\u7BA1\uFF0C\u505C\u6B62\u6216\u91CD\u542F\u9762\u677F\u4E0D\u4F1A\u505C\u6B62\u5B83\u3002",serversHealth:"\u5065\u5EB7\u68C0\u67E5",serversRestartPolicy:"\u91CD\u542F",serversConfiguration:"\u914D\u7F6E",serversRawConfig:"\u539F\u59CB\u914D\u7F6E",serversDisabled:"\u5DF2\u505C\u7528",serversEnabled:"\u5DF2\u542F\u7528",serversHealthHttp:"HTTP {status} \u4E8E {path}",serversHealthHttpBelow:"HTTP <{status} \u4E8E {path}",serversHealthHttpProbe:"HTTP \u63A2\u6D4B {path}",serversHealthPort:"\u7AEF\u53E3 {port}",serversHealthProbe:"\u7AEF\u53E3\u63A2\u6D4B",serversHealthEvery:"\u6BCF {seconds}",serversRestartSummary:"{retries} \u6B21\u91CD\u8BD5 \xB7 {base} \u2192 \xD7{factor}",serversStart:"\u542F\u52A8",serversStop:"\u505C\u6B62",serversRestart:"\u91CD\u542F",serversWorkspace:"\u5DE5\u4F5C\u533A",serversAdd:"\u6DFB\u52A0\u670D\u52A1\u5668",serversEdit:"\u7F16\u8F91",serversEditTitle:"\u7F16\u8F91 {id}",serversCreateTitle:"\u6DFB\u52A0\u670D\u52A1\u5668",serversEditorHint:"\u53EA\u5199\u5165\u4F60\u6539\u52A8\u7684\u5B57\u6BB5\u3002\u8FD9\u91CC\u53EA\u5217\u51FA\u5E38\u7528\u5B57\u6BB5\u2014\u2014\u4E0A\u65B9\u9762\u677F\u94FE\u63A5\u53EF\u7F16\u8F91\u5168\u90E8\u5B57\u6BB5\uFF0C\u5305\u62EC\u5F15\u5BFC\u547D\u4EE4\u3001\u73AF\u5883\u53D8\u91CF\u6587\u4EF6\u3001\u8D44\u6E90\u9650\u5236\u4E0E\u91CD\u542F\u7B56\u7565\u3002",serversCreate:"\u521B\u5EFA",serversSave:"\u4FDD\u5B58",serversDelete:"\u5220\u9664",serversDeleteTitle:"\u5220\u9664 {id}\uFF1F",serversDeleteBody:"\u8FD9\u4F1A\u4ECE\u5DE5\u4F5C\u533A {workspace} \u4E2D\u79FB\u9664\u8BE5\u6761\u76EE\uFF0C\u8FD0\u884C\u4E2D\u7684\u670D\u52A1\u5668\u4E5F\u4F1A\u968F\u4E4B\u505C\u6B62\u3002",serversDeleteGo:"\u5220\u9664",serversFreePort:"\u91CA\u653E\u7AEF\u53E3",serversFreePortTitle:"\u91CA\u653E\u7AEF\u53E3 {port}\uFF1F",serversFreePortBody:"\u505C\u6B62\u5360\u7528\u8BE5\u7AEF\u53E3\u7684\u8FDB\u7A0B\uFF0C\u9664\u975E\u5B83\u7531\u9762\u677F\u76D1\u7BA1\u3002\u8FDB\u7A0B\u5148\u6536\u5230 SIGTERM\uFF0C\u4E4B\u540E\u4F1A\u88AB\u5F3A\u5236\u505C\u6B62\u3002",serversFreePortGo:"\u91CA\u653E",serversPortFreed:"\u7AEF\u53E3 {port} \u5DF2\u91CA\u653E\u3002",serversPortHeld:"\u7AEF\u53E3 {port} \u4ECD\u88AB\u5360\u7528\u3002",serversPortSkipped:"\u8BE5\u76D1\u542C\u8005\u5C5E\u4E8E\u9762\u677F\u76D1\u7BA1\u7684\u670D\u52A1\u5668\uFF0C\u56E0\u6B64\u672A\u88AB\u52A8\u5B83\u3002",serversPortRefused:"\u7AEF\u53E3\u672A\u80FD\u91CA\u653E\uFF1A{message}",fieldId:"Id",fieldIdHint:"\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u3001`_` \u548C `-`\uFF1B\u5728\u5DE5\u4F5C\u533A\u5185\u552F\u4E00\u3002",fieldIdInvalid:"id \u4EE5\u5C0F\u5199\u5B57\u6BCD\u6216\u6570\u5B57\u5F00\u5934\uFF0C\u53EA\u80FD\u5305\u542B a-z\u30010-9\u3001_ \u548C -\u3002",fieldLabel:"\u6807\u7B7E",fieldCommand:"\u547D\u4EE4",fieldArgs:"\u53C2\u6570",fieldArgsHint:"\u6BCF\u884C\u4E00\u4E2A\u53C2\u6570\u3002",fieldCwd:"\u5DE5\u4F5C\u76EE\u5F55",fieldPort:"\u7AEF\u53E3",fieldPortHint:"\u7559\u7A7A\u8868\u793A\u8BE5\u6761\u76EE\u6CA1\u6709\u7AEF\u53E3\u3002",fieldPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\uFF0C\u6216\u7559\u7A7A\u3002",fieldAutostart:"\u968F\u9762\u677F\u542F\u52A8",fieldOnPortConflict:"\u7AEF\u53E3\u51B2\u7A81\u65F6",fieldInherit:"\u7EE7\u627F",fieldRequired:"Id \u548C\u547D\u4EE4\u4E3A\u5FC5\u586B\u3002"};function ln(e,t){return t===void 0?e:e.replace(/\{(\w+)\}/g,(n,r)=>Object.prototype.hasOwnProperty.call(t,r)?String(t[r]):n)}var Ke=(e,t)=>ln(Be[e]??e,t);function Ye(e){if(e!==void 0)try{let t=e.bind(Te);if(typeof t=="function")return t}catch{}return Ke}function qe(e,t=Ke){return e===void 0?t:(n,r)=>{let o;try{o=e(n,r)}catch{o=void 0}return o===void 0||o.length===0||o===n?t(n,r):o}}var _=require("react");var se=require("react");var Je="/home-hosted";var Ze="default";function ne(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}var Xe=["block","warn","follow","reclaim","kill"];var ue=["status","workspaces_list","servers_list","servers_lifecycle","servers_edit","autostart_manage","ui_manage","panel_logs"],Qe=["servers_lifecycle","servers_edit","autostart_manage","ui_manage"],cn=3,Xn={version:cn,autostart:{enabled:!1,mechanism:"auto"},manageDsh:!1,entries:[],agentTools:{enabled:!0,allow:[...ue]},panel:{port:null},authNotice:!0,reclaimToken:!0,instancesNotice:!0,uiStyle:"detailed",cli:{prefer:"pinned"}};var dn="/api";function oe(e,t,n){return{ok:!1,error:n===void 0?{code:e,message:t}:{code:e,message:t,detail:n}}}function pn(e){return e instanceof Error?e.message:String(e)}function hn(e){if(!ne(e))return oe("bad-response","The panel returned a non-object response");if(typeof e.v=="number"&&e.v!==1)return oe("version-mismatch",`Response protocol v${e.v} does not match the expected v${1}`);let t=e.result;if(!ne(t))return oe("bad-response","The panel returned no result");if(t.ok===!0)return"value"in t?{ok:!0,value:t.value}:oe("bad-response","A successful response carried no value");if(t.ok===!1){let n=t.error;return ne(n)&&typeof n.message=="string"?oe(typeof n.code=="string"?n.code:"error",n.message,n.detail):oe("error","The panel reported a failure without a message")}return oe("bad-response","The panel returned an unrecognised result")}async function E(e,t,n={}){let r=n.fetch??globalThis.fetch;if(typeof r!="function")return oe("no-fetch","No fetch implementation is available");let o={v:1,endpoint:e,payload:t},a;try{a=await r(`${dn}${Je}`,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(o)})}catch(s){return oe("network",pn(s))}if(!a.ok){let s=a.statusText.length>0?` ${a.statusText}`:"";return oe("http",`HTTP ${a.status}${s}`)}let i;try{i=await a.json()}catch{return oe("bad-json","The panel returned invalid JSON")}return hn(i)}function et(e,t={}){return E("settings.update",{patch:e},t)}var un=5e3;function tt(e=un){let[t,n]=(0,se.useState)(null),[r,o]=(0,se.useState)(null),[a,i]=(0,se.useState)(!0),s=(0,se.useRef)(!0),p=(0,se.useCallback)(async()=>{let d=await E("status",{});s.current&&(d.ok?(n(d.value),o(null)):o(d.error),i(!1))},[]);return(0,se.useEffect)(()=>{s.current=!0,p();let d=setInterval(()=>{p()},e);return()=>{s.current=!1,clearInterval(d)}},[p,e]),{data:t,error:r,loading:a,refresh:p}}var v=require("react/jsx-runtime");function re({size:e=14,children:t}){return(0,v.jsx)("svg",{width:e,height:e,viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",focusable:"false",children:t})}var De="M2.6 6.9 8 2.6l5.4 4.3M3.9 6.4v6.2a.6.6 0 0 0 .6.6h2.1V9.9h2.8v3.3h2.1a.6.6 0 0 0 .6-.6V6.4";function nt(e){return(0,v.jsx)(re,{...e,children:(0,v.jsx)("path",{d:De})})}function ot(e){return(0,v.jsxs)(re,{...e,children:[(0,v.jsx)("rect",{x:"2.2",y:"3",width:"11.6",height:"7.6",rx:"1.6"}),(0,v.jsx)("path",{d:"M6.6 13.4h2.8M8 10.6v2.8"})]})}function rt(e){return(0,v.jsxs)(re,{...e,children:[(0,v.jsx)("path",{d:"M8 2.4v5.2"}),(0,v.jsx)("path",{d:"M11.6 4.4a5 5 0 1 1-7.2 0"})]})}function at(e){return(0,v.jsxs)(re,{...e,children:[(0,v.jsx)("rect",{x:"2.2",y:"2.8",width:"11.6",height:"10.4",rx:"1.6"}),(0,v.jsx)("path",{d:"M5.2 6.9l1.8 1.8-1.8 1.8M8.7 10.5h2.2"})]})}function it(e){return(0,v.jsxs)(re,{...e,children:[(0,v.jsx)("path",{d:"M2.4 5.4h11.2M2.4 10.6h11.2"}),(0,v.jsx)("circle",{cx:"6",cy:"5.4",r:"1.6",fill:"currentColor",stroke:"none"}),(0,v.jsx)("circle",{cx:"10.4",cy:"10.6",r:"1.6",fill:"currentColor",stroke:"none"})]})}function Pe(e){return(0,v.jsxs)(re,{...e,children:[(0,v.jsx)("path",{d:"M8 2.3l5.4 2.9L8 8.1 2.6 5.2z"}),(0,v.jsx)("path",{d:"M2.6 8.6l5.4 2.9 5.4-2.9"}),(0,v.jsx)("path",{d:"M2.6 11.4l5.4 2.9 5.4-2.9"})]})}function st(e){return(0,v.jsxs)(re,{...e,children:[(0,v.jsx)("path",{d:"M13.4 9.4A5.5 5.5 0 1 1 12.2 4.4"}),(0,v.jsx)("path",{d:"M12.8 1.7v2.9h-2.9"})]})}function lt(e){return(0,v.jsx)(re,{...e,children:(0,v.jsx)("path",{d:"M6.2 3.8L10.4 8l-4.2 4.2"})})}function ct(e){return(0,v.jsxs)(re,{...e,children:[(0,v.jsx)("path",{d:"M6.6 3.4H3.4v9.2h9.2V9.4"}),(0,v.jsx)("path",{d:"M9.4 3.4h3.2v3.2M12.6 3.4L7.8 8.2"})]})}function Ce(e){return(0,v.jsxs)(re,{...e,children:[(0,v.jsx)("path",{d:"M8 2.6l5.7 10.2H2.3z"}),(0,v.jsx)("path",{d:"M8 6.4v3.1M8 11.5h.01"})]})}function dt(e){return(0,v.jsx)(re,{...e,children:(0,v.jsx)("path",{d:"M3 8.4l3.3 3.3L13 5"})})}var K="\u2014";function A(e){if(e==null)return K;let t=String(e);return t.length>0?t:K}function pt(e){return e.length>0?e.map(gn).join(", "):K}function gn(e){let t=e.replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").trim().toLowerCase();return t.length===0?e:t.charAt(0).toUpperCase()+t.slice(1)}function _e(e){return Qe.includes(e)}var Ue={status:"agentToolStatus",workspaces_list:"agentToolWorkspacesList",servers_list:"agentToolServersList",servers_lifecycle:"agentToolServersLifecycle",servers_edit:"agentToolServersEdit",autostart_manage:"agentToolAutostartManage",ui_manage:"agentToolUiManage",panel_logs:"agentToolPanelLogs"},ht={status:"agentToolDescStatus",workspaces_list:"agentToolDescWorkspacesList",servers_list:"agentToolDescServersList",servers_lifecycle:"agentToolDescServersLifecycle",servers_edit:"agentToolDescServersEdit",autostart_manage:"agentToolDescAutostartManage",ui_manage:"agentToolDescUiManage",panel_logs:"agentToolDescPanelLogs"},ut={api:"writeViaApi",file:"writeViaFile",none:"writeViaNone"},gt={enrolled:"tokenEnrolled",present:"tokenPresent",absent:"tokenAbsent",stale:"tokenStale",unknown:"tokenUnknown"},Ne={"not-installed":"bootStateNotInstalled","installed-disabled":"bootStateInstalledDisabled","enabled-running":"bootStateEnabledRunning","enabled-failing":"bootStateEnabledFailing",unsupported:"bootStateUnsupported"},mt={config:"panelCliConfig",dependency:"panelCliDependency",path:"panelCliPathSource",none:"panelCliMissing"};function Ee(e,t=52){if(e.length<=t)return e;let n=e.includes("\\")?"\\":"/",r=e.split(/[\\/]/).filter(s=>s.length>0);if(r.length<4)return e;let o=/^[A-Za-z]:$/.test(r[0]??"")?3:2;if(r.length<=o)return e;let i=`${/^[\\/]/.test(e)?n:""}${r.slice(0,o).join(n)}${n}\u2026${n}${r.slice(-2).join(n)}`;return i.length<e.length?i:e}function ft(e){let t=n=>e.source===n&&e.path!==null?{source:n,path:e.path,version:e.version}:null;return{dependency:e.dependency??t("dependency"),global:e.global??t("path")}}function mn(e,t){if(Object.is(e,t))return!0;try{return JSON.stringify(e)===JSON.stringify(t)}catch{return!1}}function vt(e,t){let n={};for(let r of Object.keys(t)){let o=e[r],a=t[r];if(ne(o)&&ne(a)){let i=vt(o,a);Object.keys(i).length>0&&(n[r]=i)}else mn(o,a)||(n[r]=a)}return n}function bt(e,t){return vt(e,t)}function yt(e,t,n){let r=new Set(e);return n?r.add(t):r.delete(t),ue.filter(o=>r.has(o))}var St=require("react");async function xt(e){try{if(typeof navigator<"u"&&navigator.clipboard!==void 0)return await navigator.clipboard.writeText(e),!0}catch{}return!1}var h=require("react/jsx-runtime");function fn(...e){return e.filter(t=>typeof t=="string"&&t.length>0).join(" ")}function Y({icon:e,title:t,action:n,children:r}){return(0,h.jsxs)("section",{className:"hh-section",children:[(0,h.jsxs)("header",{className:"hh-section-head",children:[e===void 0?null:(0,h.jsx)("span",{className:"hh-section-icon",children:e}),(0,h.jsx)("h3",{className:"hh-section-title",children:t}),(0,h.jsx)("span",{className:"hh-section-rule","aria-hidden":"true"}),n===void 0?null:(0,h.jsx)("span",{className:"hh-section-action",children:n})]}),(0,h.jsx)("div",{className:"hh-section-body",children:r})]})}function P({label:e,children:t}){return(0,h.jsxs)("div",{className:"hh-spec",children:[(0,h.jsx)("span",{className:"hh-spec-label",children:e}),(0,h.jsx)("span",{className:"hh-spec-value",children:t})]})}function ae({children:e}){return(0,h.jsx)("code",{className:"hh-code",children:e})}function m({children:e}){return typeof e=="string"&&e.length===0?null:(0,h.jsx)("p",{className:"hh-hint",children:e})}function D({tone:e,children:t}){return(0,h.jsx)("span",{className:"hh-chip","data-tone":e??"idle",children:t})}function pe({href:e,children:t}){return(0,h.jsxs)("a",{className:"hh-link",href:e,target:"_blank",rel:"noreferrer noopener",children:[t??e,(0,h.jsx)("span",{className:"hh-link-icon","aria-hidden":"true",children:(0,h.jsx)(ct,{size:11})})]})}function le({label:e,open:t=!1,children:n}){return(0,h.jsxs)("details",{className:"hh-details",open:t||void 0,children:[(0,h.jsxs)("summary",{className:"hh-summary",children:[(0,h.jsx)("span",{className:"hh-chevron","aria-hidden":"true",children:(0,h.jsx)(lt,{size:12})}),e]}),(0,h.jsx)("div",{className:"hh-details-body",children:n})]})}function W({tone:e="bad",icon:t=!0,title:n,children:r}){return(0,h.jsxs)("div",{className:"hh-note","data-tone":e,role:e==="bad"?"alert":"note",children:[t?(0,h.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,h.jsx)(Ce,{size:13})}):null,(0,h.jsxs)("div",{className:"hh-note-body",children:[n===void 0?null:(0,h.jsx)("span",{className:"hh-note-title",children:n}),typeof r=="string"?(0,h.jsx)("p",{children:r}):r]})]})}function Re({title:e,detail:t}){return(0,h.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,h.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,h.jsx)(Ce,{size:13})}),(0,h.jsxs)("div",{className:"hh-note-body",children:[(0,h.jsx)("strong",{children:e}),t.length>0?(0,h.jsx)("p",{children:t}):null]})]})}function Se({error:e,title:t}){return e===null?null:(0,h.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,h.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,h.jsx)(Ce,{size:13})}),(0,h.jsxs)("div",{className:"hh-note-body",children:[(0,h.jsx)("strong",{children:t}),(0,h.jsxs)("p",{children:[(0,h.jsx)("code",{children:e.code})," \u2014 ",e.message]})]})]})}function vn(){return(0,h.jsx)("span",{className:"hh-spinner","aria-hidden":"true"})}function b({children:e,onClick:t,disabled:n,busy:r,variant:o="default",icon:a,title:i}){let s=n===!0||r===!0;return(0,h.jsxs)("button",{type:"button",className:fn("hh-btn",o!=="default"&&`hh-btn-${o}`),onClick:t,disabled:s,title:i,children:[r===!0?(0,h.jsx)(vn,{}):a,e]})}function ve({label:e,checked:t,disabled:n,onChange:r}){return(0,h.jsxs)("button",{type:"button",role:"switch",className:"hh-switch","aria-checked":t,disabled:n,onClick:()=>r(!t),children:[(0,h.jsx)("span",{className:"hh-switch-track","aria-hidden":"true",children:(0,h.jsx)("span",{className:"hh-switch-knob"})}),(0,h.jsx)("span",{className:"hh-check-label",children:e})]})}function wt({label:e,checked:t,disabled:n,onChange:r}){return(0,h.jsxs)("label",{className:"hh-check",children:[(0,h.jsx)("input",{type:"checkbox",checked:t,disabled:n,onChange:o=>r(o.target.checked)}),(0,h.jsx)("span",{className:"hh-check-label",children:e})]})}function fe({value:e,options:t,disabled:n,label:r,onChange:o}){return(0,h.jsx)("select",{className:"hh-select",value:e,disabled:n,"aria-label":r,onChange:a=>o(a.target.value),children:t.map(a=>(0,h.jsx)("option",{value:a.value,children:a.label},a.value))})}function we({label:e,meta:t,path:n,hint:r,checked:o,disabled:a,onChange:i}){return(0,h.jsxs)("label",{className:"hh-choice-option","data-disabled":a===!0,children:[(0,h.jsx)("input",{type:"radio",checked:o,disabled:a,onChange:()=>i()}),(0,h.jsxs)("span",{className:"hh-choice-label",children:[(0,h.jsx)("span",{children:e}),r]}),t===void 0?null:(0,h.jsx)("span",{className:"hh-choice-meta",children:t}),n===void 0?null:(0,h.jsx)("span",{className:"hh-choice-path",title:n,children:Ee(n)})]})}function Ae({children:e}){return(0,h.jsxs)(D,{tone:"accent",children:[(0,h.jsx)(dt,{size:10}),e]})}function ke({text:e,copyLabel:t,copiedLabel:n}){let[r,o]=(0,St.useState)(!1);return(0,h.jsxs)("div",{className:"hh-code-box",children:[(0,h.jsx)("textarea",{className:"hh-code-text",readOnly:!0,value:e,rows:Math.min(e.split(`
`).length,4)}),(0,h.jsx)("div",{className:"hh-btn-row",children:(0,h.jsx)(b,{variant:"ghost",onClick:()=>{xt(e).then(o)},children:r?n:t})})]})}var k=require("react/jsx-runtime");function kt({t:e,status:t,updateSettings:n,busy:r,uiStyle:o}){let a=t.settings.agentTools,i=a.allow??[],s=ue.filter(d=>i.includes(d)).length,p=(d,g)=>{n(x=>({...x,agentTools:{...x.agentTools,allow:yt(x.agentTools.allow??[],d,g)}}))};return(0,k.jsxs)(Y,{icon:(0,k.jsx)(it,{}),title:e("agentTitle"),action:(0,k.jsx)(D,{children:e("agentCount",{enabled:s,total:ue.length})}),children:[(0,k.jsx)(ve,{label:e("agentMaster"),checked:a.enabled,disabled:r==="settings",onChange:d=>n(g=>({...g,agentTools:{...g.agentTools,enabled:d}}))}),(0,k.jsxs)("div",{className:"hh-field-block",children:[(0,k.jsx)(ve,{label:e("reclaimAutoLabel"),checked:t.settings.reclaimToken!==!1,disabled:r==="settings",onChange:d=>n(g=>({...g,reclaimToken:d}))}),(0,k.jsx)(m,{children:e("reclaimAutoHint")})]}),(0,k.jsxs)("div",{className:"hh-field-block",children:[(0,k.jsx)(ve,{label:e("instancesNoticeLabel"),checked:t.settings.instancesNotice!==!1,disabled:r==="settings",onChange:d=>n(g=>({...g,instancesNotice:d}))}),(0,k.jsx)(m,{children:e("instancesNoticeHint")})]}),(0,k.jsx)(m,{children:e("agentApproval")}),o==="detailed"?(0,k.jsx)("div",{className:"hh-tool-cards",children:ue.map(d=>(0,k.jsxs)("label",{className:"hh-tool-card",children:[(0,k.jsx)("input",{type:"checkbox",checked:i.includes(d),disabled:!a.enabled,onChange:g=>p(d,g.target.checked)}),(0,k.jsxs)("span",{className:"hh-tool-card-body",children:[(0,k.jsxs)("span",{className:"hh-tool-card-head",children:[(0,k.jsx)("span",{className:"hh-tool-card-name",children:e(Ue[d])}),_e(d)?(0,k.jsx)(D,{tone:"warn",children:e("agentApprovalBadge")}):null]}),(0,k.jsx)("span",{className:"hh-tool-card-desc",children:e(ht[d])})]})]},d))}):(0,k.jsx)("div",{className:"hh-tools",children:ue.map(d=>(0,k.jsx)(wt,{label:(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)("span",{className:"hh-check-text",children:e(Ue[d])}),_e(d)?(0,k.jsx)(D,{tone:"warn",children:e("agentApprovalBadge")}):null]}),checked:i.includes(d),disabled:!a.enabled,onChange:g=>p(d,g)},d))})]})}var At=require("react");function Tt(e){return Array.isArray(e)?e.filter(t=>typeof t=="string"):[]}function Pt(e){if(typeof e!="object"||e===null)return null;let t=e.result;if(typeof t!="object"||t===null)return null;let{ok:n,detail:r,commands:o}=t;return n!==!1?null:{detail:typeof r=="string"?r:"",commands:Tt(o)}}function Ct(e){return typeof e!="object"||e===null||Array.isArray(e)?null:{ok:e.ok===!0,action:e.action==="uninstall"?"uninstall":"install",detail:typeof e.detail=="string"?e.detail:"",commands:Tt(e.commands),mechanism:e.mechanism??null}}var bn=["enabled-running","enabled-failing","installed-disabled"];function Nt(e,t){let n=e.filter(a=>a.available).map(a=>a.mechanism),r=n.filter(a=>a!=="unsupported"),o=["auto",...r.length>0?r:n];return o.includes(t)||o.push(t),o}function Et(e,t){return e!==null&&e!==t}function yn(e,t){return e===null||e.ok?!1:e.action==="install"?bn.includes(t):t==="not-installed"}function Rt(e,t,n,r){return e!==null&&e.state===n&&e.mechanism===r?e:t!==null&&t.mechanism!==r||yn(t,n)?null:t}var y=require("react/jsx-runtime");function It({t:e,status:t,run:n,updateSettings:r,busy:o,uiStyle:a}){let i=t.boot,s=t.settings.autostart,p=i.candidates??[],d=i.commands??[],[g,x]=(0,At.useState)(null),$=o==="boot.install"||o==="boot.uninstall",J=Nt(p,s.mechanism).map(I=>({value:I,label:I==="auto"?e("bootMechanismAuto"):I})),L=Et(i.mechanism,s.mechanism),Z=I=>p.find(N=>N.mechanism===I)?.reason??null,U=typeof i.recommended=="string"&&i.recommended.length>0&&i.recommended!==i.mechanism?i.recommended:null,S=U===null?e("bootMechanismAutoHint"):`${e("bootMechanismAutoHint")} ${e("bootMechanismAutoPicks",{mechanism:U})}`,H=s.mechanism==="auto"?S:Z(s.mechanism),G=i.mechanism===null?null:Z(i.mechanism),z=i.mechanism!==null,ie=t.panel.reachable&&!L&&!z,X=t.panel.reachable&&L,de=I=>e(I==="install"?"bootActionInstall":"bootActionUninstall"),Q=async I=>{let N=await n(`boot.${I}`,async()=>I==="install"?E("boot.install",s.mechanism==="auto"?{}:{mechanism:s.mechanism}):E("boot.uninstall",{}));if(!N.ok){x(null);return}let F=Pt(N.value);x(F===null?null:{ok:!1,action:I,detail:F.detail,commands:F.commands,state:i.state,mechanism:i.mechanism})},ee=Ct(s.lastAttempt),C=Rt(g,ee,i.state,i.mechanism);return(0,y.jsxs)(Y,{icon:(0,y.jsx)(rt,{}),title:e("bootTitle"),action:(0,y.jsx)(fe,{value:s.mechanism,options:J,label:e("bootMechanism"),disabled:o==="settings"||$,onChange:I=>r(N=>({...N,autostart:{...N.autostart,mechanism:I}}))}),children:[H!==null&&H.length>0?(0,y.jsx)(m,{children:H}):null,ie?(0,y.jsx)(m,{children:e("bootHandover")}):null,X?(0,y.jsx)(W,{tone:"warn",children:e("bootSwitchRetires")}):null,(0,y.jsxs)("div",{className:"hh-btn-row",children:[(0,y.jsx)(b,{variant:z?"default":"primary",disabled:s.mechanism==="unsupported",busy:o==="boot.install",onClick:()=>{Q("install")},children:e(L?"bootSwitchMode":"bootEnabled")}),(0,y.jsx)(b,{disabled:!z,busy:o==="boot.uninstall",onClick:()=>{Q("uninstall")},children:e("bootUninstall")}),(0,y.jsx)(b,{variant:"ghost",busy:o==="boot.verify",onClick:()=>{n("boot.verify",()=>E("boot.verify",{}))},children:e("bootRecheck")})]}),s.enabled&&i.state==="not-installed"?(0,y.jsx)(W,{tone:"warn",children:e("bootRequestedNotInstalled")}):null,C!==null&&!C.ok?(0,y.jsxs)("div",{className:"hh-section-body",children:[(0,y.jsx)(Re,{title:e("bootAttemptFailed",{action:de(C.action)}),detail:C.detail.length>0?C.detail:e("bootAttemptNoDetail")}),C.commands.length>0?(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(m,{children:e("bootAttemptCommands")}),(0,y.jsx)(ke,{text:C.commands.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null]}):null,C!==null&&C.ok?(0,y.jsx)(m,{children:e("bootAttemptSucceeded",{action:de(C.action),detail:C.detail})}):null,d.length>0?(0,y.jsxs)(le,{label:e("bootCommandsLabel"),open:a==="detailed",children:[(0,y.jsx)(m,{children:e("bootCommandsExplain")}),(0,y.jsx)(ke,{text:d.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null,(0,y.jsxs)(le,{label:e("details"),open:a==="detailed",children:[(0,y.jsx)(P,{label:e("bootState"),children:e(Ne[i.state]??"bootStateUnsupported")}),(0,y.jsx)(P,{label:e("bootBootCapable"),children:i.bootCapable?e("yes"):e("no")}),(0,y.jsx)(P,{label:e("bootPrivileged"),children:i.privileged?e("yes"):e("no")}),(0,y.jsx)(P,{label:e("bootUnitPath"),children:(0,y.jsx)(ae,{children:A(i.unitPath)})}),(0,y.jsx)(P,{label:e("bootMechanism"),children:A(i.mechanism)}),G===null?null:(0,y.jsx)(m,{children:G}),i.detail.length>0?(0,y.jsx)(m,{children:i.detail}):null]})]})}var B=require("react/jsx-runtime");function xn(e){return e.defaultEntryId??"dsh"}function Ht({t:e,status:t,run:n,busy:r}){let o=t.entries??[],a=t.settings.manageDsh===!0,i=t.boot.platform==="win32",s=t.surface==="desktop",p=xn(t),d=g=>{if(g){let x={id:p,autostart:!0};n("entries.apply",()=>E("entries.apply",{intents:[x]}))}else n("entries.remove",()=>E("entries.remove",{id:p}))};return(0,B.jsxs)(Y,{icon:(0,B.jsx)(at,{}),title:e("entriesTitle"),children:[(0,B.jsx)(ve,{label:e("entriesManage",{id:p}),checked:s?!1:a,disabled:r!==null||s,onChange:d}),s?(0,B.jsx)(W,{tone:"warn",children:e("entriesManageDesktop",{id:p})}):(0,B.jsx)(m,{children:e("entriesManageNote",{id:p})}),i?(0,B.jsx)(W,{tone:"warn",children:e("entriesManageWinWarning",{id:p})}):null,o.length===0?(0,B.jsx)(m,{children:e("entriesEmpty",{id:p})}):(0,B.jsx)("div",{className:"hh-list",children:o.map(g=>{let x=g.live;return(0,B.jsxs)("div",{className:"hh-item",children:[(0,B.jsxs)("span",{className:"hh-item-main",children:[(0,B.jsx)("span",{className:"hh-item-name",children:g.intent.id}),(0,B.jsx)(D,{tone:g.exists?"ok":"bad",children:g.exists?e("entriesExists"):e("entriesMissing")}),(0,B.jsx)(D,{children:g.managed?e("entriesManaged"):e("entriesUnmanaged")}),g.drift.length>0?(0,B.jsx)(D,{tone:"warn",children:`${e("entriesDrift")} ${pt(g.drift)}`}):null]}),(0,B.jsx)("span",{className:"hh-item-spacer"}),(0,B.jsx)("span",{className:"hh-item-meta",children:x===null?e("entriesNotRunning"):`${A(x.status)}${x.pid===null?"":` \xB7 pid ${x.pid}`}`})]},g.intent.id)})})]})}var ce=require("react");var c=require("react/jsx-runtime"),Sn={absent:"panelTokenWarnAbsent",present:"panelTokenWarnPresent",stale:"panelTokenWarnStale"};function wn(e){if(e.token!=="enrolled")return e.token!=="unknown"?Sn[e.token]:e.url===null?void 0:"panelTokenWarnUnreachable"}function kn(e,t){if(!e.ok)return t("panelTokenRegenerateFailed",{message:e.error.message});let n=e.value?.panel;return n!==void 0&&n.detail.length>0?n.detail:t("panelTokenRegenerated")}var Tn=new Set(["network","no-fetch","client"]);function Pn(e,t){return e.ok?e.value?.detail||t("panelStopped"):Tn.has(e.error.code)?t("panelStopping"):t("panelStopFailed",{message:e.error.message})}function Mt(e,t,n){let r=n==="start"?"panelStartFailed":"panelReplaceFailed";if(!e.ok)return t(r,{message:e.error.message});let o=e.value;return o?.ok===!1?t(r,{message:o.detail??""}):o?.detail&&o.detail.length>0?o.detail:null}function Cn({value:e,label:t,hint:n,invalidLabel:r,placeholder:o,disabled:a,onChange:i}){let[s,p]=(0,ce.useState)(e===null?"":String(e));(0,ce.useEffect)(()=>{p(e===null?"":String(e))},[e]);let d=s.trim()===""?null:Number(s),g=d!==null&&(!Number.isInteger(d)||d<1||d>65535),x=()=>{if(g){p(e===null?"":String(e));return}d!==e&&i(d)};return(0,c.jsxs)("div",{className:"hh-field-block",children:[(0,c.jsxs)("div",{className:"hh-field",children:[(0,c.jsx)("label",{className:"hh-field-label",htmlFor:"hh-panel-port",children:t}),(0,c.jsx)("input",{id:"hh-panel-port",className:"hh-input",type:"number",value:s,placeholder:o,disabled:a,onChange:$=>p($.target.value),onBlur:x,onKeyDown:$=>{$.key==="Enter"&&x()}})]}),(0,c.jsx)(m,{children:g?r:n})]})}function Lt({t:e,status:t,run:n,updateSettings:r,busy:o,uiStyle:a}){let i=t.panel,s=t.cli,p=t.instances??[],d=s?.prefer??t.settings.cli?.prefer??"pinned",[g,x]=(0,ce.useState)(!1),[$,M]=(0,ce.useState)(null),[J,L]=(0,ce.useState)(null),[Z,U]=(0,ce.useState)(!1),[S,H]=(0,ce.useState)(null),[G,z]=(0,ce.useState)(null),ie=wn(i),X=s?.version??null,de=X!==null&&i.version!==null,Q=i.reachable&&de&&X!==i.version,{dependency:ee,global:C}=s===void 0?{dependency:null,global:null}:ft(s),I=s===void 0?[]:[`pnpm add -g home-hosted@${s.expectedRange}`,`npm install -g home-hosted@${s.expectedRange}`],N=T=>{r(O=>({...O,cli:{...O.cli,prefer:T}}))},F=async()=>{let T=await n("cli.installGlobal",()=>E("cli.installGlobal",{}));if(!T.ok){M(e("panelInstallFailed",{message:T.error.message}));return}let O=T.value;O?.ok===!1?M(O.output&&O.output.length>0?O.output:e("panelInstallFailed",{message:O.detail??""})):M(typeof O?.output=="string"?O.output:null)},V=async()=>{L(kn(await n("panel.reclaimToken",()=>E("panel.reclaimToken",{})),e))},u=async()=>{z(Mt(await n("panel.start",()=>E("panel.start",{})),e,"start"))},te=async()=>{x(!1),z(Mt(await n("panel.takeover",()=>E("panel.takeover",{})),e,"replace"))},R=async()=>{U(!1),H(e("panelStopping")),H(Pn(await n("panel.stop",()=>E("panel.stop",{})),e))};return(0,c.jsxs)(Y,{icon:(0,c.jsx)(ot,{}),title:e("panelTitle"),children:[ie===void 0?null:(0,c.jsxs)(W,{tone:"warn",title:e("panelTokenWarningTitle"),children:[(0,c.jsx)("p",{children:e(ie)}),i.reachable||i.token==="unknown"?null:(0,c.jsx)("p",{children:e("panelTokenWarnPanelDown")}),(0,c.jsx)("div",{className:"hh-note-actions",children:(0,c.jsx)(b,{variant:"primary",busy:o==="panel.reclaimToken",onClick:()=>{V()},children:e("panelTokenRegenerate")})})]}),J===null?null:(0,c.jsx)(m,{children:J}),s===void 0?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsxs)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("panelCopy"),children:[(0,c.jsx)(we,{label:e("optionsPreferPinned"),hint:(0,c.jsx)(Ae,{children:e("optionsRecommended")}),meta:ee===null?void 0:A(ee.version),path:ee?.path??void 0,checked:d==="pinned",disabled:ee===null||o==="settings",onChange:()=>N("pinned")}),(0,c.jsx)(we,{label:e("optionsPreferGlobal"),meta:C===null?void 0:A(C.version),path:C?.path??void 0,checked:d==="global",disabled:C===null||o==="settings",onChange:()=>N("global")})]}),(0,c.jsx)(m,{children:e("panelCopyHint")}),s.source==="config"?(0,c.jsx)(m,{children:e("optionsConfigOverride")}):null,s.source==="path"&&d!=="global"?(0,c.jsx)(m,{children:e("panelCliNotPinned",{range:s.expectedRange})}):null,s.supported?null:(0,c.jsx)(W,{tone:"warn",children:e("panelCliUnsupported")}),s.launcherPath!=null&&s.launcherVersion==null?(0,c.jsx)(W,{tone:"warn",children:e("panelCliLauncherFailed")}):null]}),(0,c.jsx)(Cn,{value:t.settings.panel?.port??null,label:e("panelPort"),hint:i.reachable?e("panelPortHint"):e("panelPortFree"),invalidLabel:e("panelPortInvalid"),placeholder:i.configPort==null?void 0:String(i.configPort),disabled:i.reachable||o!==null,onChange:T=>r(O=>({...O,panel:{...O.panel,port:T}}))}),t.panelRootSource!=="legacy"?null:(0,c.jsx)(m,{children:e("panelRootLegacy")}),p.length<=1?null:(0,c.jsxs)(le,{label:e("panelInstances",{count:p.length}),open:a==="detailed",children:[p.map(T=>(0,c.jsxs)(P,{label:T.managed?e("panelInstanceManaged"):e("panelInstanceOther"),children:[(0,c.jsx)(ae,{children:T.home}),T.url===null?null:(0,c.jsxs)(c.Fragment,{children:[" \xB7 ",(0,c.jsx)(pe,{href:T.url,children:T.url})]}),` \xB7 ${T.running?e("stateAnswering"):e("stateNotAnswering")}`,T.version===null?null:` \xB7 ${T.version}`,T.hosting?` \xB7 ${e("panelInstanceHosts")}`:null]},T.home)),(0,c.jsx)(m,{children:e("panelInstancesHint")})]}),Q?(0,c.jsx)(m,{children:e("panelOutdated")}):null,(0,c.jsxs)("div",{className:"hh-btn-row",children:[i.reachable?null:(0,c.jsx)(b,{variant:"primary",busy:o==="panel.start",onClick:()=>{u()},children:e("panelStart")}),i.reachable?(0,c.jsx)(b,{variant:"danger",disabled:o!==null,onClick:()=>U(!0),children:e("panelStop")}):null,Q&&!g?(0,c.jsx)(b,{variant:"primary",onClick:()=>x(!0),children:e("panelReplace",{copy:e(d==="global"?"panelCopyGlobal":"panelCopyPinned")})}):null]}),S===null?null:(0,c.jsx)(m,{children:S}),G===null?null:(0,c.jsx)(m,{children:G}),Z?(0,c.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelStopTitle"),children:(0,c.jsxs)("div",{className:"hh-note-body",children:[(0,c.jsx)("strong",{children:e("panelStopTitle")}),(0,c.jsx)("p",{children:e("panelStopBody")}),(0,c.jsxs)("div",{className:"hh-note-actions",children:[(0,c.jsx)(b,{onClick:()=>U(!1),children:e("confirmCancel")}),(0,c.jsx)(b,{variant:"danger",busy:o==="panel.stop",onClick:()=>{R()},children:e("confirmStop")})]})]})}):null,Q&&g?(0,c.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelTakeoverTitle"),children:(0,c.jsxs)("div",{className:"hh-note-body",children:[(0,c.jsx)("strong",{children:e("panelTakeoverTitle")}),(0,c.jsx)("p",{children:e("panelTakeoverBody",{id:t.defaultEntryId??"dsh"})}),(0,c.jsxs)("div",{className:"hh-note-actions",children:[(0,c.jsx)(b,{onClick:()=>x(!1),children:e("confirmCancel")}),(0,c.jsx)(b,{variant:"danger",busy:o==="panel.takeover",onClick:()=>{te()},children:e("confirmReplace")})]})]})}):null,s!==void 0&&C===null?(0,c.jsxs)(le,{label:e("optionsInstallLabel"),open:a==="detailed",children:[(0,c.jsx)(m,{children:e("optionsInstallHint")}),(0,c.jsx)(ke,{text:I.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")}),(0,c.jsx)("div",{className:"hh-btn-row",children:(0,c.jsx)(b,{busy:o==="cli.installGlobal",onClick:()=>{F()},children:e("optionsInstall")})}),$===null?null:(0,c.jsx)("pre",{className:"hh-output",children:$})]}):null,(0,c.jsxs)(le,{label:e("details"),open:a==="detailed",children:[(0,c.jsxs)(P,{label:e("panelHome"),children:[(0,c.jsx)(ae,{children:i.home}),t.bootUnitName===void 0?null:(0,c.jsxs)(c.Fragment,{children:[" \xB7 ",t.bootUnitName]})]}),(0,c.jsx)(P,{label:e("panelUrl"),children:i.url===null?A(i.url):(0,c.jsx)(pe,{href:i.url,children:i.url})}),(0,c.jsx)(P,{label:e("panelVersion"),children:A(i.version)}),(0,c.jsx)(P,{label:e("panelPid"),children:A(i.pid)}),(0,c.jsx)(P,{label:e("panelWriteVia"),children:e(ut[i.writeVia]??"writeViaNone")}),(0,c.jsx)(P,{label:e("panelToken"),children:e(gt[i.token]??"tokenUnknown")}),s===void 0?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(P,{label:e("panelCliSource"),children:`${e(mt[s.source]??"panelCliMissing")} \xB7 ${A(s.version)}`}),(0,c.jsx)(P,{label:e("panelCliPath"),children:(0,c.jsx)(ae,{children:A(s.path)})})]}),i.detail.length>0?(0,c.jsx)(m,{children:i.detail}):null]})]})}var me=require("react");var Ft=require("react");var w=require("react/jsx-runtime");function Ve(e){return{id:e.id,label:e.label??"",command:e.command??"",args:(e.args??[]).join(`
`),cwd:e.cwd??"",port:e.port===null||e.port===void 0?"":String(e.port),autostart:e.autostart===void 0?"inherit":e.autostart?"on":"off",onPortConflict:e.onPortConflict??""}}function Bt(e){return e.split(`
`).map(t=>t.trim()).filter(t=>t.length>0)}function We(e){let t=e.trim();if(t.length===0)return null;let n=Number(t);return!Number.isInteger(n)||n<1||n>65535?"invalid":n}function Ot(e){return/^[a-z0-9][a-z0-9_-]*$/.test(e)}function Nn(e,t){return e.length===t.length&&e.every((n,r)=>n===t[r])}function Dt(e){let t=e.id.trim(),n=e.command.trim();if(!Ot(t)||n.length===0)return null;let r={id:t,command:n},o=e.label.trim();o.length>0&&(r.label=o);let a=Bt(e.args);a.length>0&&(r.args=a);let i=e.cwd.trim();i.length>0&&(r.cwd=i);let s=We(e.port);return s!=="invalid"&&s!==null&&(r.port=s),e.autostart==="on"&&(r.autostart=!0),e.onPortConflict!==""&&(r.onPortConflict=e.onPortConflict),r}function _t(e,t){let n={},r=t.label.trim();r!==(e.label??"")&&(n.label=r.length>0?r:null);let o=t.command.trim();o.length>0&&o!==(e.command??"")&&(n.command=o);let a=Bt(t.args);Nn(a,e.args??[])||(n.args=a);let i=t.cwd.trim();i.length>0&&i!==(e.cwd??"")&&(n.cwd=i);let s=We(t.port);if(s!=="invalid"&&s!==(e.port??null)&&(n.port=s),t.autostart!=="inherit"){let p=t.autostart==="on";e.autostart!==p&&(n.autostart=p)}return t.onPortConflict!==""&&t.onPortConflict!==e.onPortConflict&&(n.onPortConflict=t.onPortConflict),Object.keys(n).length>0?n:null}function ge({label:e,hint:t,children:n}){return(0,w.jsxs)("div",{className:"hh-field-block",children:[(0,w.jsxs)("div",{className:"hh-field",children:[(0,w.jsx)("span",{className:"hh-field-label",children:e}),n]}),t===void 0?null:(0,w.jsx)(m,{children:t})]})}function $e({t:e,title:t,initial:n,submitLabel:r,busy:o,lockId:a,onSubmit:i,onCancel:s}){let[p,d]=(0,Ft.useState)(n),g=(S,H)=>d(G=>({...G,[S]:H})),x=p.id.trim(),$=!a&&x.length>0&&!Ot(x),M=We(p.port),J=!a&&x.length===0,L=p.command.trim().length===0,Z=o||J||L||$||M==="invalid",U=e(J||L?"fieldRequired":$?"fieldIdInvalid":"fieldPortInvalid");return(0,w.jsx)("div",{className:"hh-note",role:"group","aria-label":t,children:(0,w.jsxs)("div",{className:"hh-note-body",children:[(0,w.jsx)("strong",{children:t}),(0,w.jsx)(ge,{label:e("fieldId"),hint:e("fieldIdHint"),children:(0,w.jsx)("input",{className:"hh-input",value:p.id,readOnly:a,disabled:o,onChange:S=>g("id",S.target.value)})}),(0,w.jsx)(ge,{label:e("fieldCommand"),children:(0,w.jsx)("input",{className:"hh-input",value:p.command,disabled:o,onChange:S=>g("command",S.target.value)})}),(0,w.jsx)(ge,{label:e("fieldArgs"),hint:e("fieldArgsHint"),children:(0,w.jsx)("textarea",{className:"hh-input",rows:3,value:p.args,disabled:o,onChange:S=>g("args",S.target.value)})}),(0,w.jsx)(ge,{label:e("fieldCwd"),children:(0,w.jsx)("input",{className:"hh-input",value:p.cwd,disabled:o,onChange:S=>g("cwd",S.target.value)})}),(0,w.jsx)(ge,{label:e("fieldLabel"),children:(0,w.jsx)("input",{className:"hh-input",value:p.label,disabled:o,onChange:S=>g("label",S.target.value)})}),(0,w.jsx)(ge,{label:e("fieldPort"),hint:e("fieldPortHint"),children:(0,w.jsx)("input",{className:"hh-input",type:"number",value:p.port,placeholder:"\u2014",disabled:o,onChange:S=>g("port",S.target.value)})}),(0,w.jsx)(ge,{label:e("fieldAutostart"),children:(0,w.jsx)(fe,{value:p.autostart,label:e("fieldAutostart"),disabled:o,options:[{value:"inherit",label:e("fieldInherit")},{value:"on",label:e("yes")},{value:"off",label:e("no")}],onChange:S=>g("autostart",S)})}),(0,w.jsx)(ge,{label:e("fieldOnPortConflict"),children:(0,w.jsx)(fe,{value:p.onPortConflict,label:e("fieldOnPortConflict"),disabled:o,options:[{value:"",label:e("fieldInherit")},...Xe.map(S=>({value:S,label:S}))],onChange:S=>g("onPortConflict",S)})}),(0,w.jsx)(m,{children:e("serversEditorHint")}),Z&&!o?(0,w.jsx)(m,{children:U}):null,(0,w.jsxs)("div",{className:"hh-btn-row",children:[(0,w.jsx)(b,{variant:"primary",busy:o,disabled:Z,onClick:()=>i(p),children:r}),(0,w.jsx)(b,{variant:"ghost",disabled:o,onClick:s,children:e("confirmCancel")})]})]})})}var En=5e3;function be(e,t){let n=e[t];return typeof n=="number"&&Number.isFinite(n)?n:null}function Ut(e,t){let n=e[t];return typeof n=="string"&&n.length>0?n:null}function Vt(e){let t=e/1e3;return`${Number.isInteger(t)?t:t.toFixed(1)}s`}function Wt(e,t,n){if(!ne(e))return K;if(e.enabled!==!0)return n("serversDisabled");let r=Ut(e,"mode"),o=ne(e.http)?e.http:null,a;if(r==="http"||r===null&&o!==null){let s=(o===null?null:Ut(o,"path"))??"/",p=o===null?null:be(o,"expectStatus"),d=o===null?null:be(o,"expectStatusBelow");a=p!==null?n("serversHealthHttp",{status:p,path:s}):d!==null?n("serversHealthHttpBelow",{status:d,path:s}):n("serversHealthHttpProbe",{path:s})}else t!==null?a=n("serversHealthPort",{port:t}):a=n("serversHealthProbe");let i=be(e,"intervalMs");return i!==null&&i!==En?`${a} \xB7 ${n("serversHealthEvery",{seconds:Vt(i)})}`:a}function $t(e,t){if(!ne(e))return K;if(e.enabled===!1)return t("serversDisabled");let n=be(e,"maxRetries"),r=be(e,"baseDelayMs"),o=be(e,"factor");return n===null||r===null||o===null?t("serversEnabled"):t("serversRestartSummary",{retries:n,base:Vt(r),factor:o})}var Rn={"not-installed":"idle","installed-disabled":"warn","enabled-running":"ok","enabled-failing":"bad",unsupported:"idle"};function An(...e){return e.filter(t=>t!==null&&t.length>0).join(" \xB7 ")}function In(e,t){let{panel:n}=e;return n.reachable?{key:"panel",tone:"ok",name:t("sigPanel"),state:t("stateAnswering"),meta:A(n.version),href:n.url}:{key:"panel",tone:e.lastError===null?"idle":"bad",name:t("sigPanel"),state:t("stateNotAnswering"),meta:n.home,href:null}}function Hn(e,t){let{boot:n}=e,o=e.settings.autostart.enabled&&n.state==="not-installed"?"warn":Rn[n.state]??"idle",a=n.mechanism??(e.settings.autostart.mechanism==="auto"?null:e.settings.autostart.mechanism);return{key:"autostart",tone:o,name:t("sigAutostart"),state:t(Ne[n.state]??"bootStateUnsupported"),meta:a??"",href:null}}function Mn(e,t){let n=e.entries??[],r=t("sigEntry",{id:e.defaultEntryId??"dsh"}),o=e.settings.manageDsh===!0,a=e.surface==="desktop",i=n.filter(g=>!g.exists).length,s=n.filter(g=>g.drift.length>0).length,p=n.find(g=>g.live!==null)?.live??null;return{key:"entry",tone:a?"idle":o?i>0?"bad":s>0?"warn":p!==null?"ok":"warn":"idle",name:r,state:t(a?"stateWebOnly":o?"stateManaged":"stateNotManaged"),meta:p===null?t("entriesNotRunning"):An(A(p.status),p.pid===null?null:`pid ${p.pid}`),href:null}}function jt(e,t){return[In(e,t),Hn(e,t),Mn(e,t)]}function zt(e,t){let n=e.filter(r=>r.status==="running").length;return t("serversCount",{running:n,total:e.length})}var l=require("react/jsx-runtime");function He(e,t){return{workspace:e,id:t}}function Ln(e,t){return{workspace:e,entry:t}}function Fn(e,t,n){return{workspace:e,id:t,patch:n}}function Bn(e,t){return{workspace:e,id:t}}function q(e,t,n){return`${t}:${e}/${n}`}function Ie(e,t){return t!==null&&t.workspace===e?t.value:null}function On({t:e,workspace:t,server:n,run:r,busy:o,offline:a,onEdit:i,onDelete:s,onFreePort:p}){let d=n.status==="running";return(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(b,{variant:"ghost",disabled:a||d,busy:o===q(t,"servers.start",n.id),onClick:()=>{r(q(t,"servers.start",n.id),()=>E("servers.start",He(t,n.id)))},children:e("serversStart")}),(0,l.jsx)(b,{variant:"ghost",disabled:a||!d,busy:o===q(t,"servers.stop",n.id),onClick:()=>{r(q(t,"servers.stop",n.id),()=>E("servers.stop",He(t,n.id)))},children:e("serversStop")}),(0,l.jsx)(b,{variant:"ghost",disabled:a||!d,busy:o===q(t,"servers.restart",n.id),onClick:()=>{r(q(t,"servers.restart",n.id),()=>E("servers.restart",He(t,n.id)))},children:e("serversRestart")}),(0,l.jsx)(b,{variant:"ghost",disabled:a,onClick:i,children:e("serversEdit")}),(0,l.jsx)(b,{variant:"ghost",disabled:a,onClick:s,children:e("serversDelete")}),n.config.port==null?null:(0,l.jsx)(b,{variant:"ghost",disabled:a,onClick:p,children:e("serversFreePort")})]})}function Gt({t:e,server:t}){return t.stoppedByPanel===!0&&t.status==="stopped"?(0,l.jsx)("span",{title:e("serversStoppedByPanel"),children:(0,l.jsx)(D,{tone:"warn",children:e("serversStopped")})}):(0,l.jsx)(D,{tone:t.status==="running"?"ok":"idle",children:t.status})}function Dn({text:e}){return e.length===0?(0,l.jsx)(l.Fragment,{children:K}):(0,l.jsx)("span",{className:"hh-nowrap",title:e,children:(0,l.jsx)(ae,{children:e})})}function Kt({t:e,status:t,run:n,busy:r,uiStyle:o,workspace:a,servers:i,serversError:s}){let p=!t.panel.reachable||r!==null,d=new Map(a===t.workspace?(t.entries??[]).map(u=>[u.intent.id,u.intent]):[]),[g,x]=(0,me.useState)(!1),[$,M]=(0,me.useState)(null),[J,L]=(0,me.useState)(null),[Z,U]=(0,me.useState)(null),[S,H]=(0,me.useState)(null),G=Ie(a,$),z=Ie(a,J),ie=Ie(a,Z),X=Ie(a,S),de=()=>{x(!0),M(null),L(null),U(null)},Q=u=>{x(!1),M({workspace:a,value:u}),L(null),U(null)},ee=()=>{x(!1),M(null)},C=async u=>{let te=Dt(u);if(te===null)return;(await n("servers.create",()=>E("servers.create",Ln(a,te)))).ok&&ee()},I=async(u,te,R)=>{let T=_t(R.config,te);if(T===null){M(null);return}(await n(q(a,"servers.update",u),()=>E("servers.update",Fn(a,u,T)))).ok&&M(null)},N=async u=>{L(null),await n(q(a,"servers.delete",u),()=>E("servers.delete",Bn(a,u)))},F=async u=>{U(null);let te=await n(q(a,"servers.freePort",u.id),()=>E("servers.freePort",He(a,u.id)));if(!te.ok){H({workspace:a,value:e("serversPortRefused",{message:te.error.message})});return}let R=te.value,T=R?.port??u.config.port??K;if(R?.free===!0){H({workspace:a,value:e("serversPortFreed",{port:T})});return}H({workspace:a,value:R?.skipped!==void 0&&R.skipped.length>0?e("serversPortSkipped"):e("serversPortHeld",{port:T})})},V=ie===null?null:i.find(u=>u.id===ie)??null;return(0,l.jsxs)(Y,{icon:(0,l.jsx)(Pe,{}),title:e("serversTitle"),action:(0,l.jsx)(D,{children:zt(i,e)}),children:[(0,l.jsxs)(m,{children:[`${e("serversWorkspace")} `,(0,l.jsx)(ae,{children:a})," \xB7 ",t.panel.url===null?e("serversHintNoPanel"):(0,l.jsxs)(l.Fragment,{children:[`${e("serversHintPanel")} `,(0,l.jsx)(pe,{href:t.panel.url,children:t.panel.url})]})]}),s===null?null:(0,l.jsx)(Re,{title:e("errorTitle"),detail:`${s.code} \u2014 ${s.message}`}),(0,l.jsx)("div",{className:"hh-btn-row",children:(0,l.jsx)(b,{variant:"primary",disabled:p||g,onClick:de,children:e("serversAdd")})}),g?(0,l.jsx)($e,{t:e,title:e("serversCreateTitle"),initial:Ve({id:"",command:""}),submitLabel:e("serversCreate"),busy:r==="servers.create",lockId:!1,onSubmit:u=>{C(u)},onCancel:ee},"create"):null,V===null?null:(0,l.jsxs)(W,{tone:"warn",title:e("serversFreePortTitle",{port:A(V.config.port)}),children:[(0,l.jsx)("p",{children:e("serversFreePortBody")}),(0,l.jsxs)("div",{className:"hh-note-actions",children:[(0,l.jsx)(b,{onClick:()=>U(null),children:e("confirmCancel")}),(0,l.jsx)(b,{variant:"danger",busy:r===q(a,"servers.freePort",V.id),onClick:()=>{F(V)},children:e("serversFreePortGo")})]})]}),X===null?null:(0,l.jsx)(m,{children:X}),i.length===0?(0,l.jsx)(m,{children:e("serversEmpty")}):(0,l.jsx)("div",{className:o==="detailed"?"hh-cards":"hh-list",children:i.map(u=>{let te=u.status==="running",R=u.config,T=G===u.id?(0,l.jsx)($e,{t:e,title:e("serversEditTitle",{id:u.id}),initial:Ve(R),submitLabel:e("serversSave"),busy:r===q(a,"servers.update",u.id),lockId:!0,onSubmit:Me=>{I(u.id,Me,u)},onCancel:()=>M(null)},`edit:${u.id}`):null,O=z===u.id?(0,l.jsxs)(W,{tone:"warn",title:e("serversDeleteTitle",{id:u.id}),children:[(0,l.jsx)("p",{children:e("serversDeleteBody",{workspace:a})}),(0,l.jsxs)("div",{className:"hh-note-actions",children:[(0,l.jsx)(b,{onClick:()=>L(null),children:e("confirmCancel")}),(0,l.jsx)(b,{variant:"danger",busy:r===q(a,"servers.delete",u.id),onClick:()=>{N(u.id)},children:e("serversDeleteGo")})]})]}):null,ze=(0,l.jsx)(On,{t:e,workspace:a,server:u,run:n,busy:r,offline:p,onEdit:()=>Q(u.id),onDelete:()=>{L({workspace:a,value:u.id}),M(null),x(!1)},onFreePort:()=>{U({workspace:a,value:u.id}),M(null),x(!1)}});if(o==="detailed"){let Me=(R.args??[]).join(" "),Le=R.cwd??"",en=d.get(u.id)?.persistent;return(0,l.jsxs)("article",{className:"hh-card",children:[(0,l.jsxs)("div",{className:"hh-card-head",children:[(0,l.jsx)("span",{className:"hh-item-name",children:u.id}),(0,l.jsx)(Gt,{t:e,server:u}),en===!0?(0,l.jsx)("span",{title:e("serversPersistentHint"),children:(0,l.jsx)(D,{tone:"accent",children:e("serversPersistent")})}):null,(0,l.jsx)("span",{className:"hh-item-spacer"}),(0,l.jsx)("span",{className:"hh-item-actions",children:ze})]}),(0,l.jsxs)("div",{className:"hh-card-facts",children:[(0,l.jsx)(P,{label:e("serversUrl"),children:u.url===null?A(u.url):(0,l.jsx)(pe,{href:u.url,children:u.url})}),(0,l.jsx)(P,{label:e("serversPid"),children:A(u.pid)}),(0,l.jsx)(P,{label:e("serversPort"),children:A(R.port)}),(0,l.jsx)(P,{label:e("serversAutostart"),children:R.autostart===void 0?K:R.autostart?e("yes"):e("no")})]}),(0,l.jsxs)(le,{label:e("serversConfiguration"),children:[(0,l.jsx)(P,{label:e("serversCommand"),children:R.command===void 0||R.command.length===0?K:(0,l.jsx)("span",{className:"hh-nowrap",title:R.command,children:(0,l.jsx)(ae,{children:R.command})})}),(0,l.jsx)(P,{label:e("serversArgs"),children:(0,l.jsx)(Dn,{text:Me})}),(0,l.jsx)(P,{label:e("serversCwd"),children:Le.length===0?K:(0,l.jsx)("span",{className:"hh-nowrap",title:Le,children:(0,l.jsx)(ae,{children:Ee(Le)})})}),(0,l.jsx)(P,{label:e("serversOnPortConflict"),children:A(R.onPortConflict)}),(0,l.jsx)(P,{label:e("serversHealth"),children:Wt(R.health,R.port??null,e)}),(0,l.jsx)(P,{label:e("serversRestartPolicy"),children:$t(R.restart,e)})]}),(0,l.jsx)(le,{label:e("serversRawConfig"),children:(0,l.jsx)("pre",{className:"hh-output",children:JSON.stringify(R,null,2)})}),T,O]},u.id)}return(0,l.jsxs)(me.Fragment,{children:[(0,l.jsxs)("div",{className:"hh-item",children:[(0,l.jsxs)("span",{className:"hh-item-main",children:[(0,l.jsx)("span",{className:"hh-item-name",children:u.id}),(0,l.jsx)(Gt,{t:e,server:u}),u.url===null?null:(0,l.jsx)(pe,{href:u.url,children:u.url})]}),(0,l.jsx)("span",{className:"hh-item-spacer"}),u.pid===null?null:(0,l.jsx)("span",{className:"hh-item-meta",children:`${e("serversPid")} ${u.pid}`}),(0,l.jsx)("span",{className:"hh-item-actions",children:ze})]}),T,O]},u.id)})})]})}var j=require("react/jsx-runtime");function _n(e){let t=typeof e.label=="string"?e.label.trim():"";return t.length===0||t===e.id?e.id:`${e.id} \u2014 ${t}`}function Un(e,t){return e.source==="file"?t("workspacesCountsFile",{servers:e.servers}):t("workspacesCounts",{servers:e.servers,running:e.running})}function Yt({t:e,status:t,viewing:n,onView:r}){let o=t.workspaces??[],a=t.workspace??Ze,i=t.defaultEntryId??"dsh",s=t.legacyRoot===!0||(t.lastError??"").includes("pre-0.7"),p=o.some(d=>d.source==="file");return(0,j.jsxs)(Y,{icon:(0,j.jsx)(Pe,{}),title:e("workspacesTitle"),action:(0,j.jsx)(D,{tone:"accent",children:n}),children:[(0,j.jsx)(m,{children:e("workspacesHint",{id:i})}),o.length===0?(0,j.jsx)(m,{children:e("workspacesEmpty")}):(0,j.jsx)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("workspacesViewLabel"),children:o.map(d=>{let g=d.id===a?(0,j.jsx)(Ae,{children:e("workspacesManagedTag")}):d.id===n?(0,j.jsx)(D,{tone:"accent",children:e("workspacesViewingTag")}):void 0;return(0,j.jsx)(we,{label:_n(d),meta:Un(d,e),hint:g,checked:d.id===n,onChange:()=>r(d.id)},d.id)})}),p?(0,j.jsx)(W,{tone:"warn",children:e("workspacesDegraded")}):null,s?(0,j.jsx)(W,{tone:"warn",title:e("workspaceLegacyTitle"),children:(0,j.jsx)("p",{children:e("workspaceLegacyBody")})}):null]})}var je=`
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

.hh-head-icon {
  display: inline-flex;
  flex: none;
  color: var(--hh-faint);
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
`;var f=require("react/jsx-runtime");function Vn({signal:e}){return(0,f.jsxs)("div",{className:"hh-signal","data-tone":e.tone,children:[(0,f.jsx)("span",{className:"hh-signal-dot","aria-hidden":"true"}),(0,f.jsx)("span",{className:"hh-signal-name",children:e.name}),(0,f.jsx)("span",{className:"hh-signal-state",children:e.state}),e.meta.length===0&&e.href===null?null:(0,f.jsxs)("span",{className:"hh-signal-meta",children:[e.meta,e.href===null?null:(0,f.jsxs)(f.Fragment,{children:[e.meta.length===0?null:" \xB7 ",(0,f.jsx)(pe,{href:e.href,children:e.href})]})]})]})}function qt(e){let t=qe(e.t),{data:n,error:r,loading:o,refresh:a}=tt(),[i,s]=(0,_.useState)(null),[p,d]=(0,_.useState)(null),[g,x]=(0,_.useState)(null),[$,M]=(0,_.useState)([]),[J,L]=(0,_.useState)(null),[Z,U]=(0,_.useState)(0),S=(0,_.useRef)(null),H=g??n?.workspace??null,G=(0,_.useCallback)(async N=>{let F=await E("servers.list",{workspace:N});F.ok?(M(F.value),L(null)):L(F.error)},[]);(0,_.useEffect)(()=>{H!==null&&(S.current!==H&&(S.current=H,M([]),L(null)),G(H))},[H,Z,G]);let z=(0,_.useCallback)((N,F)=>(d(N),s(null),(async()=>{try{let V=await F();return V.ok||s(V.error),V}catch(V){let u={code:"client",message:V instanceof Error?V.message:String(V)};return s(u),{ok:!1,error:u}}finally{d(null),await a(),U(V=>V+1)}})()),[a]),ie=(0,_.useCallback)(N=>{if(n===null)return;let F=bt(n.settings,N(n.settings));Object.keys(F).length!==0&&z("settings",()=>et(F))},[n,z]),X=n?.settings.uiStyle??"detailed",[de,Q]=(0,_.useState)(X);(0,_.useEffect)(()=>{Q(X)},[X]);let ee=N=>{Q(N),ie(F=>({...F,uiStyle:N}))};if(n===null)return(0,f.jsxs)("div",{className:"hh-root",children:[(0,f.jsx)("style",{children:je}),o?(0,f.jsx)(m,{children:t("loading")}):(0,f.jsxs)(f.Fragment,{children:[(0,f.jsx)(Se,{error:r??{code:"status",message:t("statusUnavailable")},title:t("errorTitle")}),(0,f.jsx)("div",{className:"hh-btn-row",children:(0,f.jsx)(b,{onClick:()=>{a()},children:t("retry")})})]})]});let C={t,status:n,run:z,updateSettings:ie,busy:p,uiStyle:de},I=H??n.workspace??"default";return(0,f.jsxs)("div",{className:"hh-root",children:[(0,f.jsx)("style",{children:je}),(0,f.jsxs)("header",{className:"hh-head",children:[(0,f.jsx)("span",{className:"hh-head-icon",children:(0,f.jsx)(nt,{})}),(0,f.jsx)("h2",{className:"hh-title",children:t("tab")}),(0,f.jsx)("span",{className:"hh-head-spacer"}),(0,f.jsx)(fe,{value:de,label:t("uiStyleLabel"),disabled:p==="settings",options:[{value:"detailed",label:t("uiStyleDetailed")},{value:"compact",label:t("uiStyleCompact")}],onChange:N=>ee(N)}),(0,f.jsx)(b,{variant:"ghost",icon:(0,f.jsx)(st,{size:13}),busy:p==="status.refresh",onClick:()=>{z("status.refresh",()=>E("status",{refresh:!0}))},children:t("refresh")})]}),(0,f.jsx)("div",{className:"hh-signals","data-busy":p!==null,children:jt(n,t).map(N=>(0,f.jsx)(Vn,{signal:N},N.key))}),n.lastError===null?null:(0,f.jsx)(Se,{error:{code:"panel",message:n.lastError},title:t("errorTitle")}),(0,f.jsx)(Se,{error:r,title:t("errorTitle")}),(0,f.jsx)(Se,{error:i,title:t("errorTitle")}),(0,f.jsx)(Lt,{...C}),(0,f.jsx)(It,{...C}),(0,f.jsx)(Ht,{...C}),(0,f.jsx)(kt,{...C}),(0,f.jsx)(Yt,{...C,viewing:I,onView:x}),(0,f.jsx)(Kt,{...C,workspace:I,servers:$,serversError:J})]})}var xe="data-dsh-home-hosted-nav-icon",Wn='[role="dialog"] nav button',ye=16;function $n(){return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${De}"/></svg>`}function jn(){return`data:image/svg+xml,${encodeURIComponent($n())}`}function zn(e,t){let n=String(t??"").trim();return n.length===0?!1:String(e??"").trim()===n}function Gn(e){return[`[${xe}] > svg { display: none; }`,`[${xe}]::before {`,"  content: '';","  flex: none;",`  width: ${ye}px;`,`  height: ${ye}px;`,"  background-color: currentColor;",`  -webkit-mask-image: url("${e}");`,"  -webkit-mask-repeat: no-repeat;","  -webkit-mask-position: center;",`  -webkit-mask-size: ${ye}px ${ye}px;`,`  mask-image: url("${e}");`,"  mask-repeat: no-repeat;","  mask-position: center;",`  mask-size: ${ye}px ${ye}px;`,"}"].join(`
`)}function Jt(e,t){if(typeof document>"u")return;let n=()=>{let r=document.createElement("style");r.setAttribute("data-plugin-css","dsh-home-hosted/settings-nav-icon"),r.textContent=Gn(jn()),document.head.append(r);let o=()=>{let i=t(),s=document.querySelectorAll(Wn),p=null;for(let d=0;d<s.length;d+=1){let g=s.item(d);g!==null&&(p===null&&zn(g.textContent,i)?p=g:g.removeAttribute(xe))}p?.setAttribute(xe,"")};o();let a=new MutationObserver(o);return a.observe(document.body,{childList:!0,subtree:!0,characterData:!0}),()=>{a.disconnect();let i=document.querySelectorAll(`[${xe}]`);for(let s=0;s<i.length;s+=1)i.item(s)?.removeAttribute(xe);r.remove()}};typeof e.effect=="function"?e.effect(n,"dsh-home-hosted: settings nav icon"):n()}var Kn=["slots","locale"],Zt="[dsh-home-hosted]";function he(e,t){t===void 0?console.warn(`${Zt} ${e}`):console.warn(`${Zt} ${e}`,t)}function Xt(e,t){try{let n=e.get?.(t);if(n!=null)return n}catch{}try{let n=e[t];if(n!=null)return n}catch{}}function Qt(e,t,n){if(typeof e.effect=="function")try{e.effect(t,n);return}catch(r){he(`registering the effect "${n}" failed`,r);return}try{t()}catch(r){he(`the effect "${n}" failed`,r)}}function Yn(e){try{let t=Xt(e,"locale"),n=Ye(t);Jt(e,()=>n("tab")),t===void 0?he("the locale service is unavailable; the page keeps its bundled English copy"):Qt(e,()=>{let o=[];try{o.push(t.register(Te,{en:Be,zh:Ge}))}catch(a){he("registering the dictionaries failed",a)}return()=>{for(let a of o)try{a()}catch(i){he("disposing a dictionary failed",i)}}},"dsh-home-hosted: dictionaries");let r=Xt(e,"slots");if(r===void 0){he("the slots service is unavailable; the settings section was not registered");return}Qt(e,()=>{try{return r.inject("settings.section",()=>{try{return r.register({name:"settings.section",id:"home-hosted",order:60,label:()=>n("tab"),locale:Te,inject:()=>({t:n})},qt)}catch(o){return he("registering the settings section failed",o),()=>{}}})}catch(o){return he("injecting into settings.section failed",o),()=>{}}},"dsh-home-hosted: settings section")}catch(t){he("client bootstrap failed",t)}}

return module.exports; } });
