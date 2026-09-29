window.__ModuleLoader__.load({ id: "dsh-home-hosted", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";var de=Object.defineProperty;var Ct=Object.getOwnPropertyDescriptor;var Pt=Object.getOwnPropertyNames;var Nt=Object.prototype.hasOwnProperty;var Et=(e,t)=>{for(var n in t)de(e,n,{get:t[n],enumerable:!0})},Rt=(e,t,n,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of Pt(t))!Nt.call(e,o)&&o!==n&&de(e,o,{get:()=>t[o],enumerable:!(a=Ct(t,o))||a.enumerable});return e};var At=e=>Rt(de({},"__esModule",{value:!0}),e);var an={};Et(an,{apply:()=>on,inject:()=>nn});module.exports=At(an);var re="homeHosted",pe={tab:"Home Hosted",loading:"Loading\u2026",refresh:"Refresh",retry:"Retry",errorTitle:"Error",statusUnavailable:"The panel did not answer.",yes:"Yes",no:"No",copy:"Copy",copied:"Copied",details:"Details",uiStyleLabel:"Page style",uiStyleDetailed:"Detailed",uiStyleCompact:"Compact",sigPanel:"Panel",sigAutostart:"Autostart",sigEntry:"{id} entry",stateAnswering:"answering",stateNotAnswering:"not answering",stateManaged:"managed",stateNotManaged:"not managed",panelTitle:"Panel",panelCopy:"Which copy runs the panel",panelCopyHint:"The pinned copy ships with this plugin; the global one is on PATH.",optionsPreferPinned:"Pinned dependency",optionsPreferGlobal:"Global install",optionsRecommended:"recommended",optionsConfigOverride:"The plugin row sets homeHostedCommand, and that always wins.",optionsInstallLabel:"Install a global copy",optionsInstallHint:"No global install was found. Install the pinned range, then choose it above:",optionsInstall:"Install globally",panelHome:"Panel root",panelUrl:"URL",panelVersion:"Version",panelPid:"PID",panelWriteVia:"Writes via",panelToken:"API token",panelCliSource:"CLI",panelCliPath:"CLI path",panelCliConfig:"configured command",panelCliDependency:"pinned dependency",panelCliPathSource:"global install (PATH)",panelCliMissing:"not found",panelCliNotPinned:"This host resolved a global home-hosted instead of the pinned copy ({range}).",panelCliUnsupported:"This home-hosted is older than the oldest release the plugin supports.",panelCliLauncherFailed:"The boot launcher did not answer, so a boot entry may fail to start the panel.",panelPort:"Panel port",panelPortHint:"Only changeable while the panel is stopped.",panelPortFree:"Leave empty to use the port in the config.",panelPortInvalid:"Enter a port between 1 and 65535.",panelStart:"Start the panel",panelStop:"Stop the panel",panelStopTitle:"Stop the running panel?",panelStopBody:"This stops the panel and every server it supervises \u2014 this session included, so the page may disconnect. An autostart entry starts them again at the next panel start.",panelStopping:"Stopping the panel\u2026",panelStopped:"The panel stopped.",panelStopFailed:"The panel did not stop: {message}",panelRootLegacy:"Adopted from ~/.home-hosted. Set HHOSTED_HOME to give this dsh its own panel.",confirmStop:"Stop",panelOutdated:"Outdated panel",panelReplace:"Restart with {copy}",panelCopyPinned:"pinned dependency",panelCopyGlobal:"global install",panelTakeoverTitle:"Restart the running panel?",panelTakeoverBody:"This stops the panel and every server it supervises \u2014 this session included, so the page disconnects. It needs the {id} entry adopted with autostart on.",confirmCancel:"Cancel",confirmReplace:"Restart",writeViaApi:"authenticated API",writeViaFile:"config file",writeViaNone:"unavailable",tokenEnrolled:"enrolled",tokenPresent:"present",tokenAbsent:"absent",tokenStale:"stale",tokenUnknown:"unknown",panelTokenWarningTitle:"The panel API token is missing or refused",panelTokenWarnAbsent:"This plugin has no API token for the panel, so it cannot read or write the panel; regenerate one.",panelTokenWarnPresent:"home-hosted holds an API token this plugin does not have, so the plugin cannot authenticate; regenerate one to replace it.",panelTokenWarnStale:"The panel refused this plugin's API token; regenerate it.",panelTokenWarnUnreachable:"The plugin could not reach the panel to check its API token, so it cannot read or write the panel; the panel may need starting.",panelTokenWarnPanelDown:"The panel is not answering right now, so it may need starting too.",panelTokenRegenerate:"Regenerate token",panelTokenRegenerated:"A fresh API token was enrolled for the panel.",panelTokenRegenerateFailed:"The token was not replaced: {message}",panelInstances:"{count} panels found",panelInstanceManaged:"managed by this plugin",panelInstanceOther:"another panel",panelInstanceHosts:"hosts this dsh",panelInstancesHint:"This plugin drives only the managed one; the others are read from their state roots and never written to.",bootTitle:"Autostart",bootEnabled:"Enable autostart",bootUninstall:"Uninstall",bootSwitchMode:"Switch autostart",bootRecheck:"Re-check",bootMechanism:"Mechanism",bootMechanismAuto:"Automatic",bootState:"State",bootStateNotInstalled:"not installed",bootStateInstalledDisabled:"installed, off",bootStateEnabledRunning:"enabled, running",bootStateEnabledFailing:"enabled, failing",bootStateUnsupported:"unsupported",bootBootCapable:"Starts before login",bootPrivileged:"This process can install it",bootUnitPath:"Unit path",bootCommandsLabel:"Install by hand",bootCommandsExplain:"This process cannot elevate. Run these commands to install autostart:",bootRequestedNotInstalled:"Autostart is requested, but no boot entry is installed.",bootActionInstall:"install",bootActionUninstall:"uninstall",bootAttemptFailed:"{action} failed",bootAttemptSucceeded:"{action} succeeded \u2014 {detail}",bootAttemptNoDetail:"The host did not explain the refusal.",bootAttemptCommands:"Run these yourself:",entriesTitle:"Managed entry",entriesManage:"Manage {id}",entriesManageNote:"Hands {id} to home-hosted: boot autostart, panel control, port reclaim.",entriesManageWinWarning:"On Windows, `{id}` is managed via the `kill` onPortConflict policy, so when it is restarted detached by another plugin it may briefly fail to boot while home-hosted reclaims the process and port.",entriesEmpty:"{id} is not managed yet.",entriesExists:"exists",entriesMissing:"missing",entriesManaged:"managed",entriesUnmanaged:"unmanaged",entriesDrift:"drift",entriesNotRunning:"not running",agentTitle:"Agent tools",agentCount:"{enabled} of {total} on",agentMaster:"Let the agent use these tools",agentApproval:"Tools that change something ask for approval first.",agentApprovalBadge:"approval",reclaimAutoLabel:"Regenerate token automatically",reclaimAutoHint:"A tool call that finds a refused token re-enrols one and retries instead of failing.",instancesNoticeLabel:"Tell the agent about other panels",instancesNoticeHint:"Adds the panel inventory to the agent's context, and asks which panel to act on when several exist.",agentToolStatus:"Status",agentToolServersList:"List servers",agentToolServersLifecycle:"Start, stop, restart",agentToolServersEdit:"Create, update, delete",agentToolAutostartManage:"Manage boot autostart",agentToolUiManage:"Manage Panel UI",agentToolDescStatus:"Read the panel, the CLI copy in use and the managed entry. Nothing changes.",agentToolDescServersList:"List the servers the panel supervises, with status, port and URL.",agentToolDescServersLifecycle:"Start, stop and restart supervised servers.",agentToolDescServersEdit:"Create, update and delete the panel's server entries.",agentToolDescAutostartManage:"Install or remove the boot entry that starts the panel.",agentToolDescUiManage:"Inspect, update, revert or switch the panel's own UI build.",serversTitle:"Servers",serversCount:"{running} of {total} running",serversHintPanel:"Entries are managed in the home-hosted panel:",serversHintNoPanel:"Entries cannot be managed right now: the panel is not running.",serversEmpty:"The panel reports no servers.",serversPid:"PID",serversUrl:"URL",serversCommand:"Command",serversArgs:"Args",serversCwd:"Working dir",serversPort:"Port",serversOnPortConflict:"On port conflict",serversAutostart:"Autostart",serversPersistent:"Persistent",serversPersistentHint:"Run by home-hosted's own nanny, so stopping or restarting the panel leaves it alive.",serversHealth:"Health",serversRestartPolicy:"Restart",serversConfiguration:"Configuration",serversRawConfig:"Raw config",serversDisabled:"disabled",serversEnabled:"enabled",serversHealthHttp:"HTTP {status} on {path}",serversHealthHttpBelow:"HTTP <{status} on {path}",serversHealthHttpProbe:"HTTP probe on {path}",serversHealthPort:"port {port}",serversHealthProbe:"port probe",serversHealthEvery:"every {seconds}",serversRestartSummary:"{retries} retries \xB7 {base} \u2192 \xD7{factor}",serversStart:"Start",serversStop:"Stop",serversRestart:"Restart"},xe={tab:"Home Hosted",loading:"\u52A0\u8F7D\u4E2D\u2026",refresh:"\u5237\u65B0",retry:"\u91CD\u8BD5",errorTitle:"\u9519\u8BEF",statusUnavailable:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\u3002",yes:"\u662F",no:"\u5426",copy:"\u590D\u5236",copied:"\u5DF2\u590D\u5236",details:"\u8BE6\u60C5",uiStyleLabel:"\u9875\u9762\u6837\u5F0F",uiStyleDetailed:"\u8BE6\u7EC6",uiStyleCompact:"\u7D27\u51D1",sigPanel:"\u9762\u677F",sigAutostart:"\u5F00\u673A\u81EA\u542F",sigEntry:"{id} \u6761\u76EE",stateAnswering:"\u54CD\u5E94\u4E2D",stateNotAnswering:"\u672A\u54CD\u5E94",stateManaged:"\u5DF2\u63A5\u7BA1",stateNotManaged:"\u672A\u63A5\u7BA1",panelTitle:"\u9762\u677F",panelCopy:"\u7531\u54EA\u4E2A\u526F\u672C\u8FD0\u884C\u9762\u677F",panelCopyHint:"\u56FA\u5B9A\u526F\u672C\u968F\u63D2\u4EF6\u4E00\u8D77\u5B89\u88C5\uFF1B\u5168\u5C40\u526F\u672C\u6765\u81EA PATH\u3002",optionsPreferPinned:"\u56FA\u5B9A\u4F9D\u8D56",optionsPreferGlobal:"\u5168\u5C40\u5B89\u88C5",optionsRecommended:"\u63A8\u8350",optionsConfigOverride:"\u63D2\u4EF6\u884C\u4E2D\u7684 homeHostedCommand \u4F18\u5148\u7EA7\u6700\u9AD8\uFF0C\u59CB\u7EC8\u751F\u6548\u3002",optionsInstallLabel:"\u5B89\u88C5\u5168\u5C40\u526F\u672C",optionsInstallHint:"\u672A\u627E\u5230\u5168\u5C40\u5B89\u88C5\u3002\u5B89\u88C5\u56FA\u5B9A\u7248\u672C\u8303\u56F4\u540E\uFF0C\u5728\u4E0A\u65B9\u9009\u62E9\u5B83\uFF1A",optionsInstall:"\u5168\u5C40\u5B89\u88C5",panelHome:"\u9762\u677F\u6839\u76EE\u5F55",panelUrl:"URL",panelVersion:"\u7248\u672C",panelPid:"PID",panelWriteVia:"\u5199\u5165\u65B9\u5F0F",panelToken:"API \u4EE4\u724C",panelCliSource:"CLI",panelCliPath:"CLI \u8DEF\u5F84",panelCliConfig:"\u914D\u7F6E\u7684\u547D\u4EE4",panelCliDependency:"\u56FA\u5B9A\u7684\u4F9D\u8D56\u7248\u672C",panelCliPathSource:"\u5168\u5C40\u5B89\u88C5\uFF08PATH\uFF09",panelCliMissing:"\u672A\u627E\u5230",panelCliNotPinned:"\u6B64\u5BBF\u4E3B\u89E3\u6790\u5230\u7684\u662F\u5168\u5C40 home-hosted\uFF0C\u800C\u4E0D\u662F\u56FA\u5B9A\u526F\u672C\uFF08{range}\uFF09\u3002",panelCliUnsupported:"\u6B64 home-hosted \u65E9\u4E8E\u63D2\u4EF6\u652F\u6301\u7684\u6700\u8001\u7248\u672C\u3002",panelCliLauncherFailed:"\u5F00\u673A\u542F\u52A8\u5668\u6CA1\u6709\u5E94\u7B54\uFF0C\u5F00\u673A\u9879\u53EF\u80FD\u65E0\u6CD5\u542F\u52A8\u9762\u677F\u3002",panelPort:"\u9762\u677F\u7AEF\u53E3",panelPortHint:"\u4EC5\u5728\u9762\u677F\u505C\u6B62\u65F6\u53EF\u4FEE\u6539\u3002",panelPortFree:"\u7559\u7A7A\u5219\u4F7F\u7528\u914D\u7F6E\u6587\u4EF6\u4E2D\u7684\u7AEF\u53E3\u3002",panelPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\u3002",panelStart:"\u542F\u52A8\u9762\u677F",panelStop:"\u505C\u6B62\u9762\u677F",panelStopTitle:"\u505C\u6B62\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelStopBody:"\u8FD9\u4F1A\u505C\u6B62\u9762\u677F\u4EE5\u53CA\u5B83\u76D1\u7BA1\u7684\u6240\u6709\u670D\u52A1\u5668\u2014\u2014\u5305\u62EC\u672C\u4F1A\u8BDD\uFF0C\u56E0\u6B64\u672C\u9875\u9762\u53EF\u80FD\u4F1A\u65AD\u5F00\u8FDE\u63A5\u3002\u5E26\u6709\u81EA\u542F\u7684\u6761\u76EE\u4F1A\u5728\u4E0B\u6B21\u542F\u52A8\u9762\u677F\u65F6\u91CD\u65B0\u542F\u52A8\u3002",panelStopping:"\u6B63\u5728\u505C\u6B62\u9762\u677F\u2026",panelStopped:"\u9762\u677F\u5DF2\u505C\u6B62\u3002",panelStopFailed:"\u9762\u677F\u672A\u80FD\u505C\u6B62\uFF1A{message}",panelRootLegacy:"\u6CBF\u7528\u4E86 ~/.home-hosted\u3002\u8BBE\u7F6E HHOSTED_HOME \u53EF\u8BA9\u6B64 dsh \u4F7F\u7528\u81EA\u5DF1\u7684\u9762\u677F\u3002",confirmStop:"\u505C\u6B62",panelOutdated:"\u9762\u677F\u5DF2\u8FC7\u65F6",panelReplace:"\u4F7F\u7528{copy}\u91CD\u542F",panelCopyPinned:"\u56FA\u5B9A\u4F9D\u8D56",panelCopyGlobal:"\u5168\u5C40\u5B89\u88C5",panelTakeoverTitle:"\u91CD\u542F\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelTakeoverBody:"\u8FD9\u4F1A\u505C\u6B62\u9762\u677F\u4EE5\u53CA\u5B83\u76D1\u7BA1\u7684\u6240\u6709\u670D\u52A1\u5668\u2014\u2014\u5305\u62EC\u672C\u4F1A\u8BDD\uFF0C\u56E0\u6B64\u672C\u9875\u9762\u4F1A\u65AD\u5F00\u8FDE\u63A5\u3002\u4EC5\u5F53 {id} \u6761\u76EE\u5DF2\u88AB\u63A5\u7BA1\u4E14\u542F\u7528\u81EA\u542F\u65F6\u624D\u53EF\u7528\u3002",confirmCancel:"\u53D6\u6D88",confirmReplace:"\u91CD\u542F",writeViaApi:"\u5DF2\u8BA4\u8BC1 API",writeViaFile:"\u914D\u7F6E\u6587\u4EF6",writeViaNone:"\u4E0D\u53EF\u7528",tokenEnrolled:"\u5DF2\u767B\u8BB0",tokenPresent:"\u5DF2\u5B58\u5728",tokenAbsent:"\u4E0D\u5B58\u5728",tokenStale:"\u5DF2\u5931\u6548",tokenUnknown:"\u672A\u77E5",panelTokenWarningTitle:"\u9762\u677F API \u4EE4\u724C\u7F3A\u5931\u6216\u5DF2\u88AB\u62D2\u7EDD",panelTokenWarnAbsent:"\u672C\u63D2\u4EF6\u6CA1\u6709\u6B64\u9762\u677F\u7684 API \u4EE4\u724C\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u9762\u677F\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u4E00\u4E2A\u3002",panelTokenWarnPresent:"home-hosted \u6301\u6709\u4E00\u4E2A\u672C\u63D2\u4EF6\u6CA1\u6709\u7684 API \u4EE4\u724C\uFF0C\u63D2\u4EF6\u65E0\u6CD5\u901A\u8FC7\u8BA4\u8BC1\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u4E00\u4E2A\u4EE5\u66FF\u6362\u5B83\u3002",panelTokenWarnStale:"\u9762\u677F\u62D2\u7EDD\u4E86\u672C\u63D2\u4EF6\u7684 API \u4EE4\u724C\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u3002",panelTokenWarnUnreachable:"\u672C\u63D2\u4EF6\u65E0\u6CD5\u8BBF\u95EE\u9762\u677F\u4EE5\u68C0\u67E5\u5176 API \u4EE4\u724C\uFF0C\u56E0\u6B64\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u9762\u677F\uFF1B\u9762\u677F\u53EF\u80FD\u8FD8\u9700\u8981\u5148\u542F\u52A8\u3002",panelTokenWarnPanelDown:"\u9762\u677F\u5F53\u524D\u6CA1\u6709\u54CD\u5E94\uFF0C\u53EF\u80FD\u8FD8\u9700\u8981\u5148\u542F\u52A8\u9762\u677F\u3002",panelTokenRegenerate:"\u91CD\u65B0\u751F\u6210\u4EE4\u724C",panelTokenRegenerated:"\u5DF2\u4E3A\u9762\u677F\u767B\u8BB0\u65B0\u4EE4\u724C\u3002",panelTokenRegenerateFailed:"\u4EE4\u724C\u672A\u66FF\u6362\uFF1A{message}",panelInstances:"\u53D1\u73B0 {count} \u4E2A\u9762\u677F",panelInstanceManaged:"\u7531\u672C\u63D2\u4EF6\u7BA1\u7406",panelInstanceOther:"\u5176\u4ED6\u9762\u677F",panelInstanceHosts:"\u6258\u7BA1\u5F53\u524D dsh",panelInstancesHint:"\u672C\u63D2\u4EF6\u53EA\u9A71\u52A8\u88AB\u7BA1\u7406\u7684\u90A3\u4E00\u4E2A\uFF1B\u5176\u4ED6\u9762\u677F\u4EC5\u4ECE\u5176\u72B6\u6001\u76EE\u5F55\u8BFB\u53D6\uFF0C\u7EDD\u4E0D\u5199\u5165\u3002",bootTitle:"\u5F00\u673A\u81EA\u542F",bootEnabled:"\u542F\u7528\u5F00\u673A\u81EA\u542F",bootUninstall:"\u5378\u8F7D",bootSwitchMode:"\u5207\u6362\u81EA\u542F\u673A\u5236",bootRecheck:"\u91CD\u65B0\u68C0\u67E5",bootMechanism:"\u673A\u5236",bootMechanismAuto:"\u81EA\u52A8",bootState:"\u72B6\u6001",bootStateNotInstalled:"\u672A\u5B89\u88C5",bootStateInstalledDisabled:"\u5DF2\u5B89\u88C5\uFF0C\u672A\u542F\u7528",bootStateEnabledRunning:"\u5DF2\u542F\u7528\uFF0C\u8FD0\u884C\u4E2D",bootStateEnabledFailing:"\u5DF2\u542F\u7528\uFF0C\u542F\u52A8\u5931\u8D25",bootStateUnsupported:"\u4E0D\u652F\u6301",bootBootCapable:"\u767B\u5F55\u524D\u542F\u52A8",bootPrivileged:"\u672C\u8FDB\u7A0B\u53EF\u5B89\u88C5",bootUnitPath:"\u5355\u5143\u6587\u4EF6\u8DEF\u5F84",bootCommandsLabel:"\u624B\u52A8\u5B89\u88C5",bootCommandsExplain:"\u672C\u8FDB\u7A0B\u65E0\u6CD5\u63D0\u6743\u3002\u8BF7\u81EA\u884C\u6267\u884C\u4EE5\u4E0B\u547D\u4EE4\u6765\u5B89\u88C5\u81EA\u542F\uFF1A",bootRequestedNotInstalled:"\u5DF2\u8BF7\u6C42\u5F00\u673A\u81EA\u542F\uFF0C\u4F46\u5C1A\u672A\u5B89\u88C5\u4EFB\u4F55\u5F00\u673A\u9879\u3002",bootActionInstall:"\u5B89\u88C5",bootActionUninstall:"\u5378\u8F7D",bootAttemptFailed:"{action}\u5931\u8D25",bootAttemptSucceeded:"{action}\u6210\u529F \u2014 {detail}",bootAttemptNoDetail:"\u5BBF\u4E3B\u6CA1\u6709\u8BF4\u660E\u5931\u8D25\u539F\u56E0\u3002",bootAttemptCommands:"\u4F60\u53EF\u4EE5\u81EA\u884C\u8FD0\u884C\u4EE5\u4E0B\u547D\u4EE4\uFF1A",entriesTitle:"\u53D7\u7BA1\u6761\u76EE",entriesManage:"\u63A5\u7BA1 {id}",entriesManageNote:"\u628A {id} \u4EA4\u7ED9 home-hosted\uFF1A\u5F00\u673A\u81EA\u542F\u3001\u9762\u677F\u63A7\u5236\u3001\u7AEF\u53E3\u56DE\u6536\u3002",entriesManageWinWarning:"\u5728 Windows \u4E0A\uFF0C`{id}` \u901A\u8FC7 `kill` \u7AEF\u53E3\u51B2\u7A81\u7B56\u7565\u7BA1\u7406\uFF1B\u5F53\u5B83\u88AB\u5176\u4ED6\u63D2\u4EF6\u4EE5\u5206\u79BB\u65B9\u5F0F\u91CD\u542F\u65F6\uFF0Chome-hosted \u56DE\u6536\u8FDB\u7A0B\u4E0E\u7AEF\u53E3\u671F\u95F4\u53EF\u80FD\u77ED\u6682\u65E0\u6CD5\u542F\u52A8\u3002",entriesEmpty:"\u5C1A\u672A\u63A5\u7BA1 {id}\u3002",entriesExists:"\u5B58\u5728",entriesMissing:"\u7F3A\u5931",entriesManaged:"\u5DF2\u63A5\u7BA1",entriesUnmanaged:"\u672A\u63A5\u7BA1",entriesDrift:"\u6F02\u79FB",entriesNotRunning:"\u672A\u8FD0\u884C",agentTitle:"Agent \u5DE5\u5177",agentCount:"\u5DF2\u5F00\u542F {enabled}/{total}",agentMaster:"\u5141\u8BB8 Agent \u8C03\u7528\u8FD9\u4E9B\u5DE5\u5177",agentApproval:"\u4F1A\u6539\u53D8\u72B6\u6001\u7684\u5DE5\u5177\u5728\u8FD0\u884C\u524D\u4F1A\u8BF7\u6C42\u6279\u51C6\u3002",agentApprovalBadge:"\u9700\u6279\u51C6",reclaimAutoLabel:"\u88AB\u62D2\u7EDD\u65F6\u81EA\u52A8\u91CD\u65B0\u751F\u6210\u4EE4\u724C",reclaimAutoHint:"\u5DE5\u5177\u8C03\u7528\u9047\u5230\u88AB\u62D2\u7EDD\u7684\u4EE4\u724C\u65F6\u4F1A\u91CD\u65B0\u767B\u8BB0\u5E76\u91CD\u8BD5\uFF0C\u800C\u4E0D\u662F\u76F4\u63A5\u5931\u8D25\u3002",instancesNoticeLabel:"\u5411 Agent \u8BF4\u660E\u5176\u4ED6\u9762\u677F",instancesNoticeHint:"\u628A\u9762\u677F\u6E05\u5355\u52A0\u5165 Agent \u4E0A\u4E0B\u6587\uFF1B\u5B58\u5728\u591A\u4E2A\u9762\u677F\u65F6\u4F1A\u5148\u8BE2\u95EE\u8981\u64CD\u4F5C\u54EA\u4E00\u4E2A\u3002",agentToolStatus:"\u67E5\u770B\u72B6\u6001",agentToolServersList:"\u5217\u51FA\u670D\u52A1\u5668",agentToolServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u3001\u91CD\u542F",agentToolServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u3001\u5220\u9664",agentToolAutostartManage:"\u7BA1\u7406\u5F00\u673A\u81EA\u542F",agentToolUiManage:"\u7BA1\u7406\u9762\u677F UI",agentToolDescStatus:"\u8BFB\u53D6\u9762\u677F\u3001\u6B63\u5728\u4F7F\u7528\u7684 CLI \u526F\u672C\u548C\u53D7\u7BA1\u6761\u76EE\u3002\u4E0D\u6539\u53D8\u4EFB\u4F55\u72B6\u6001\u3002",agentToolDescServersList:"\u5217\u51FA\u9762\u677F\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u53CA\u5176\u72B6\u6001\u3001\u7AEF\u53E3\u548C URL\u3002",agentToolDescServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u548C\u91CD\u542F\u53D7\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u3002",agentToolDescServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u548C\u5220\u9664\u9762\u677F\u7684\u670D\u52A1\u5668\u6761\u76EE\u3002",agentToolDescAutostartManage:"\u5B89\u88C5\u6216\u79FB\u9664\u542F\u52A8\u9762\u677F\u7684\u5F00\u673A\u9879\u3002",agentToolDescUiManage:"\u67E5\u770B\u3001\u66F4\u65B0\u3001\u56DE\u9000\u6216\u5207\u6362\u9762\u677F\u81EA\u8EAB\u7684 UI \u6784\u5EFA\u3002",serversTitle:"\u670D\u52A1\u5668",serversCount:"{total} \u4E2A\u4E2D {running} \u4E2A\u8FD0\u884C\u4E2D",serversHintPanel:"\u5728 home-hosted \u9762\u677F\u4E2D\u7BA1\u7406\u6761\u76EE\uFF1A",serversHintNoPanel:"\u5F53\u524D\u65E0\u6CD5\u7BA1\u7406\u6761\u76EE\uFF1A\u9762\u677F\u6CA1\u6709\u8FD0\u884C\u3002",serversEmpty:"\u9762\u677F\u672A\u62A5\u544A\u4EFB\u4F55\u670D\u52A1\u5668\u3002",serversPid:"PID",serversUrl:"URL",serversCommand:"\u547D\u4EE4",serversArgs:"\u53C2\u6570",serversCwd:"\u5DE5\u4F5C\u76EE\u5F55",serversPort:"\u7AEF\u53E3",serversOnPortConflict:"\u7AEF\u53E3\u51B2\u7A81\u65F6",serversAutostart:"\u81EA\u542F",serversPersistent:"\u6301\u4E45\u5316",serversPersistentHint:"\u7531 home-hosted \u81EA\u5E26\u7684 nanny \u6258\u7BA1\uFF0C\u505C\u6B62\u6216\u91CD\u542F\u9762\u677F\u4E0D\u4F1A\u505C\u6B62\u5B83\u3002",serversHealth:"\u5065\u5EB7\u68C0\u67E5",serversRestartPolicy:"\u91CD\u542F",serversConfiguration:"\u914D\u7F6E",serversRawConfig:"\u539F\u59CB\u914D\u7F6E",serversDisabled:"\u5DF2\u505C\u7528",serversEnabled:"\u5DF2\u542F\u7528",serversHealthHttp:"HTTP {status} \u4E8E {path}",serversHealthHttpBelow:"HTTP <{status} \u4E8E {path}",serversHealthHttpProbe:"HTTP \u63A2\u6D4B {path}",serversHealthPort:"\u7AEF\u53E3 {port}",serversHealthProbe:"\u7AEF\u53E3\u63A2\u6D4B",serversHealthEvery:"\u6BCF {seconds}",serversRestartSummary:"{retries} \u6B21\u91CD\u8BD5 \xB7 {base} \u2192 \xD7{factor}",serversStart:"\u542F\u52A8",serversStop:"\u505C\u6B62",serversRestart:"\u91CD\u542F"};function Ht(e,t){return t===void 0?e:e.replace(/\{(\w+)\}/g,(n,a)=>Object.prototype.hasOwnProperty.call(t,a)?String(t[a]):n)}var Se=(e,t)=>Ht(pe[e]??e,t);function we(e){if(e!==void 0)try{let t=e.bind(re);if(typeof t=="function")return t}catch{}return Se}function ke(e,t=Se){return e===void 0?t:(n,a)=>{let o;try{o=e(n,a)}catch{o=void 0}return o===void 0||o.length===0||o===n?t(n,a):o}}var j=require("react");var O=require("react");var Te="/home-hosted";var W=["status","servers_list","servers_lifecycle","servers_edit","autostart_manage","ui_manage"],Ce=["servers_lifecycle","servers_edit","autostart_manage","ui_manage"],It=3,ln={version:It,autostart:{enabled:!1,mechanism:"auto"},manageDsh:!1,entries:[],agentTools:{enabled:!0,allow:[...W]},panel:{port:null},authNotice:!0,reclaimToken:!0,instancesNotice:!0,uiStyle:"detailed",cli:{prefer:"pinned"}};var Mt="/api";function M(e,t,n){return{ok:!1,error:n===void 0?{code:e,message:t}:{code:e,message:t,detail:n}}}function he(e){return typeof e=="object"&&e!==null}function Lt(e){return e instanceof Error?e.message:String(e)}function Bt(e){if(!he(e))return M("bad-response","The panel returned a non-object response");if(typeof e.v=="number"&&e.v!==1)return M("version-mismatch",`Response protocol v${e.v} does not match the expected v${1}`);let t=e.result;if(!he(t))return M("bad-response","The panel returned no result");if(t.ok===!0)return"value"in t?{ok:!0,value:t.value}:M("bad-response","A successful response carried no value");if(t.ok===!1){let n=t.error;return he(n)&&typeof n.message=="string"?M(typeof n.code=="string"?n.code:"error",n.message,n.detail):M("error","The panel reported a failure without a message")}return M("bad-response","The panel returned an unrecognised result")}async function w(e,t,n={}){let a=n.fetch??globalThis.fetch;if(typeof a!="function")return M("no-fetch","No fetch implementation is available");let o={v:1,endpoint:e,payload:t},s;try{s=await a(`${Mt}${Te}`,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(o)})}catch(l){return M("network",Lt(l))}if(!s.ok){let l=s.statusText.length>0?` ${s.statusText}`:"";return M("http",`HTTP ${s.status}${l}`)}let i;try{i=await s.json()}catch{return M("bad-json","The panel returned invalid JSON")}return Bt(i)}function Pe(e,t={}){return w("settings.update",{patch:e},t)}var Ot=5e3;function Ne(e=Ot){let[t,n]=(0,O.useState)(null),[a,o]=(0,O.useState)(null),[s,i]=(0,O.useState)(!0),l=(0,O.useRef)(!0),h=(0,O.useCallback)(async()=>{let c=await w("status",{});l.current&&(c.ok?(n(c.value),o(null)):o(c.error),i(!1))},[]);return(0,O.useEffect)(()=>{l.current=!0,h();let c=setInterval(()=>{h()},e);return()=>{l.current=!1,clearInterval(c)}},[h,e]),{data:t,error:a,loading:s,refresh:h}}var m=require("react/jsx-runtime");function _({size:e=14,children:t}){return(0,m.jsx)("svg",{width:e,height:e,viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",focusable:"false",children:t})}function Ee(e){return(0,m.jsxs)(_,{...e,children:[(0,m.jsx)("rect",{x:"2.2",y:"3",width:"11.6",height:"7.6",rx:"1.6"}),(0,m.jsx)("path",{d:"M6.6 13.4h2.8M8 10.6v2.8"})]})}function Re(e){return(0,m.jsxs)(_,{...e,children:[(0,m.jsx)("path",{d:"M8 2.4v5.2"}),(0,m.jsx)("path",{d:"M11.6 4.4a5 5 0 1 1-7.2 0"})]})}function Ae(e){return(0,m.jsxs)(_,{...e,children:[(0,m.jsx)("rect",{x:"2.2",y:"2.8",width:"11.6",height:"10.4",rx:"1.6"}),(0,m.jsx)("path",{d:"M5.2 6.9l1.8 1.8-1.8 1.8M8.7 10.5h2.2"})]})}function He(e){return(0,m.jsxs)(_,{...e,children:[(0,m.jsx)("path",{d:"M2.4 5.4h11.2M2.4 10.6h11.2"}),(0,m.jsx)("circle",{cx:"6",cy:"5.4",r:"1.6",fill:"currentColor",stroke:"none"}),(0,m.jsx)("circle",{cx:"10.4",cy:"10.6",r:"1.6",fill:"currentColor",stroke:"none"})]})}function Ie(e){return(0,m.jsxs)(_,{...e,children:[(0,m.jsx)("path",{d:"M8 2.3l5.4 2.9L8 8.1 2.6 5.2z"}),(0,m.jsx)("path",{d:"M2.6 8.6l5.4 2.9 5.4-2.9"}),(0,m.jsx)("path",{d:"M2.6 11.4l5.4 2.9 5.4-2.9"})]})}function Me(e){return(0,m.jsxs)(_,{...e,children:[(0,m.jsx)("path",{d:"M13.4 9.4A5.5 5.5 0 1 1 12.2 4.4"}),(0,m.jsx)("path",{d:"M12.8 1.7v2.9h-2.9"})]})}function Le(e){return(0,m.jsx)(_,{...e,children:(0,m.jsx)("path",{d:"M6.2 3.8L10.4 8l-4.2 4.2"})})}function Be(e){return(0,m.jsxs)(_,{...e,children:[(0,m.jsx)("path",{d:"M6.6 3.4H3.4v9.2h9.2V9.4"}),(0,m.jsx)("path",{d:"M9.4 3.4h3.2v3.2M12.6 3.4L7.8 8.2"})]})}function ie(e){return(0,m.jsxs)(_,{...e,children:[(0,m.jsx)("path",{d:"M8 2.6l5.7 10.2H2.3z"}),(0,m.jsx)("path",{d:"M8 6.4v3.1M8 11.5h.01"})]})}function Oe(e){return(0,m.jsx)(_,{...e,children:(0,m.jsx)("path",{d:"M3 8.4l3.3 3.3L13 5"})})}var L="\u2014";function x(e){if(e==null)return L;let t=String(e);return t.length>0?t:L}function _e(e){return e.length>0?e.join(", "):L}function ge(e){return Ce.includes(e)}var me={status:"agentToolStatus",servers_list:"agentToolServersList",servers_lifecycle:"agentToolServersLifecycle",servers_edit:"agentToolServersEdit",autostart_manage:"agentToolAutostartManage",ui_manage:"agentToolUiManage"},Ue={status:"agentToolDescStatus",servers_list:"agentToolDescServersList",servers_lifecycle:"agentToolDescServersLifecycle",servers_edit:"agentToolDescServersEdit",autostart_manage:"agentToolDescAutostartManage",ui_manage:"agentToolDescUiManage"},Fe={api:"writeViaApi",file:"writeViaFile",none:"writeViaNone"},De={enrolled:"tokenEnrolled",present:"tokenPresent",absent:"tokenAbsent",stale:"tokenStale",unknown:"tokenUnknown"},se={"not-installed":"bootStateNotInstalled","installed-disabled":"bootStateInstalledDisabled","enabled-running":"bootStateEnabledRunning","enabled-failing":"bootStateEnabledFailing",unsupported:"bootStateUnsupported"},Ve={config:"panelCliConfig",dependency:"panelCliDependency",path:"panelCliPathSource",none:"panelCliMissing"};function le(e,t=52){if(e.length<=t)return e;let n=e.includes("\\")?"\\":"/",a=e.split(/[\\/]/).filter(l=>l.length>0);if(a.length<4)return e;let o=/^[A-Za-z]:$/.test(a[0]??"")?3:2;if(a.length<=o)return e;let i=`${/^[\\/]/.test(e)?n:""}${a.slice(0,o).join(n)}${n}\u2026${n}${a.slice(-2).join(n)}`;return i.length<e.length?i:e}function $e(e){let t=n=>e.source===n&&e.path!==null?{source:n,path:e.path,version:e.version}:null;return{dependency:e.dependency??t("dependency"),global:e.global??t("path")}}function je(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function _t(e,t){if(Object.is(e,t))return!0;try{return JSON.stringify(e)===JSON.stringify(t)}catch{return!1}}function ze(e,t){let n={};for(let a of Object.keys(t)){let o=e[a],s=t[a];if(je(o)&&je(s)){let i=ze(o,s);Object.keys(i).length>0&&(n[a]=i)}else _t(o,s)||(n[a]=s)}return n}function Ge(e,t){return ze(e,t)}function We(e,t,n){let a=new Set(e);return n?a.add(t):a.delete(t),W.filter(o=>a.has(o))}var Ye=require("react");async function Ke(e){try{if(typeof navigator<"u"&&navigator.clipboard!==void 0)return await navigator.clipboard.writeText(e),!0}catch{}return!1}var d=require("react/jsx-runtime");function Ut(...e){return e.filter(t=>typeof t=="string"&&t.length>0).join(" ")}function U({icon:e,title:t,action:n,children:a}){return(0,d.jsxs)("section",{className:"hh-section",children:[(0,d.jsxs)("header",{className:"hh-section-head",children:[e===void 0?null:(0,d.jsx)("span",{className:"hh-section-icon",children:e}),(0,d.jsx)("h3",{className:"hh-section-title",children:t}),(0,d.jsx)("span",{className:"hh-section-rule","aria-hidden":"true"}),n===void 0?null:(0,d.jsx)("span",{className:"hh-section-action",children:n})]}),(0,d.jsx)("div",{className:"hh-section-body",children:a})]})}function y({label:e,children:t}){return(0,d.jsxs)("div",{className:"hh-spec",children:[(0,d.jsx)("span",{className:"hh-spec-label",children:e}),(0,d.jsx)("span",{className:"hh-spec-value",children:t})]})}function F({children:e}){return(0,d.jsx)("code",{className:"hh-code",children:e})}function f({children:e}){return typeof e=="string"&&e.length===0?null:(0,d.jsx)("p",{className:"hh-hint",children:e})}function A({tone:e,children:t}){return(0,d.jsx)("span",{className:"hh-chip","data-tone":e??"idle",children:t})}function V({href:e,children:t}){return(0,d.jsxs)("a",{className:"hh-link",href:e,target:"_blank",rel:"noreferrer noopener",children:[t??e,(0,d.jsx)("span",{className:"hh-link-icon","aria-hidden":"true",children:(0,d.jsx)(Be,{size:11})})]})}function D({label:e,open:t=!1,children:n}){return(0,d.jsxs)("details",{className:"hh-details",open:t||void 0,children:[(0,d.jsxs)("summary",{className:"hh-summary",children:[(0,d.jsx)("span",{className:"hh-chevron","aria-hidden":"true",children:(0,d.jsx)(Le,{size:12})}),e]}),(0,d.jsx)("div",{className:"hh-details-body",children:n})]})}function K({tone:e="bad",icon:t=!0,title:n,children:a}){return(0,d.jsxs)("div",{className:"hh-note","data-tone":e,role:e==="bad"?"alert":"note",children:[t?(0,d.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,d.jsx)(ie,{size:13})}):null,(0,d.jsxs)("div",{className:"hh-note-body",children:[n===void 0?null:(0,d.jsx)("span",{className:"hh-note-title",children:n}),typeof a=="string"?(0,d.jsx)("p",{children:a}):a]})]})}function qe({title:e,detail:t}){return(0,d.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,d.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,d.jsx)(ie,{size:13})}),(0,d.jsxs)("div",{className:"hh-note-body",children:[(0,d.jsx)("strong",{children:e}),t.length>0?(0,d.jsx)("p",{children:t}):null]})]})}function ne({error:e,title:t}){return e===null?null:(0,d.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,d.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,d.jsx)(ie,{size:13})}),(0,d.jsxs)("div",{className:"hh-note-body",children:[(0,d.jsx)("strong",{children:t}),(0,d.jsxs)("p",{children:[(0,d.jsx)("code",{children:e.code})," \u2014 ",e.message]})]})]})}function Ft(){return(0,d.jsx)("span",{className:"hh-spinner","aria-hidden":"true"})}function S({children:e,onClick:t,disabled:n,busy:a,variant:o="default",icon:s,title:i}){let l=n===!0||a===!0;return(0,d.jsxs)("button",{type:"button",className:Ut("hh-btn",o!=="default"&&`hh-btn-${o}`),onClick:t,disabled:l,title:i,children:[a===!0?(0,d.jsx)(Ft,{}):s,e]})}function Z({label:e,checked:t,disabled:n,onChange:a}){return(0,d.jsxs)("button",{type:"button",role:"switch",className:"hh-switch","aria-checked":t,disabled:n,onClick:()=>a(!t),children:[(0,d.jsx)("span",{className:"hh-switch-track","aria-hidden":"true",children:(0,d.jsx)("span",{className:"hh-switch-knob"})}),(0,d.jsx)("span",{className:"hh-check-label",children:e})]})}function Je({label:e,checked:t,disabled:n,onChange:a}){return(0,d.jsxs)("label",{className:"hh-check",children:[(0,d.jsx)("input",{type:"checkbox",checked:t,disabled:n,onChange:o=>a(o.target.checked)}),(0,d.jsx)("span",{className:"hh-check-label",children:e})]})}function ce({value:e,options:t,disabled:n,label:a,onChange:o}){return(0,d.jsx)("select",{className:"hh-select",value:e,disabled:n,"aria-label":a,onChange:s=>o(s.target.value),children:t.map(s=>(0,d.jsx)("option",{value:s.value,children:s.label},s.value))})}function fe({label:e,meta:t,path:n,hint:a,checked:o,disabled:s,onChange:i}){return(0,d.jsxs)("label",{className:"hh-choice-option","data-disabled":s===!0,children:[(0,d.jsx)("input",{type:"radio",checked:o,disabled:s,onChange:()=>i()}),(0,d.jsxs)("span",{className:"hh-choice-label",children:[(0,d.jsx)("span",{children:e}),a]}),t===void 0?null:(0,d.jsx)("span",{className:"hh-choice-meta",children:t}),n===void 0?null:(0,d.jsx)("span",{className:"hh-choice-path",title:n,children:le(n)})]})}function Xe({children:e}){return(0,d.jsxs)(A,{tone:"accent",children:[(0,d.jsx)(Oe,{size:10}),e]})}function oe({text:e,copyLabel:t,copiedLabel:n}){let[a,o]=(0,Ye.useState)(!1);return(0,d.jsxs)("div",{className:"hh-code-box",children:[(0,d.jsx)("textarea",{className:"hh-code-text",readOnly:!0,value:e,rows:Math.min(e.split(`
`).length,4)}),(0,d.jsx)("div",{className:"hh-btn-row",children:(0,d.jsx)(S,{variant:"ghost",onClick:()=>{Ke(e).then(o)},children:a?n:t})})]})}var b=require("react/jsx-runtime");function Ze({t:e,status:t,updateSettings:n,busy:a,uiStyle:o}){let s=t.settings.agentTools,i=s.allow??[],l=W.filter(c=>i.includes(c)).length,h=(c,u)=>{n(k=>({...k,agentTools:{...k.agentTools,allow:We(k.agentTools.allow??[],c,u)}}))};return(0,b.jsxs)(U,{icon:(0,b.jsx)(He,{}),title:e("agentTitle"),action:(0,b.jsx)(A,{children:e("agentCount",{enabled:l,total:W.length})}),children:[(0,b.jsx)(Z,{label:e("agentMaster"),checked:s.enabled,onChange:c=>n(u=>({...u,agentTools:{...u.agentTools,enabled:c}}))}),(0,b.jsxs)("div",{className:"hh-field-block",children:[(0,b.jsx)(Z,{label:e("reclaimAutoLabel"),checked:t.settings.reclaimToken!==!1,disabled:a==="settings",onChange:c=>n(u=>({...u,reclaimToken:c}))}),(0,b.jsx)(f,{children:e("reclaimAutoHint")})]}),(0,b.jsxs)("div",{className:"hh-field-block",children:[(0,b.jsx)(Z,{label:e("instancesNoticeLabel"),checked:t.settings.instancesNotice!==!1,disabled:a==="settings",onChange:c=>n(u=>({...u,instancesNotice:c}))}),(0,b.jsx)(f,{children:e("instancesNoticeHint")})]}),(0,b.jsx)(f,{children:e("agentApproval")}),o==="detailed"?(0,b.jsx)("div",{className:"hh-tool-cards",children:W.map(c=>(0,b.jsxs)("label",{className:"hh-tool-card",children:[(0,b.jsx)("input",{type:"checkbox",checked:i.includes(c),disabled:!s.enabled,onChange:u=>h(c,u.target.checked)}),(0,b.jsxs)("span",{className:"hh-tool-card-body",children:[(0,b.jsxs)("span",{className:"hh-tool-card-head",children:[(0,b.jsx)("span",{className:"hh-tool-card-name",children:e(me[c])}),ge(c)?(0,b.jsx)(A,{tone:"warn",children:e("agentApprovalBadge")}):null]}),(0,b.jsx)("span",{className:"hh-tool-card-desc",children:e(Ue[c])})]})]},c))}):(0,b.jsx)("div",{className:"hh-tools",children:W.map(c=>(0,b.jsx)(Je,{label:(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)("span",{className:"hh-check-text",children:e(me[c])}),ge(c)?(0,b.jsx)(A,{tone:"warn",children:e("agentApprovalBadge")}):null]}),checked:i.includes(c),disabled:!s.enabled,onChange:u=>h(c,u)},c))})]})}var rt=require("react");function Qe(e){return Array.isArray(e)?e.filter(t=>typeof t=="string"):[]}function et(e){if(typeof e!="object"||e===null)return null;let t=e.result;if(typeof t!="object"||t===null)return null;let{ok:n,detail:a,commands:o}=t;return n!==!1?null:{detail:typeof a=="string"?a:"",commands:Qe(o)}}function tt(e){return e===void 0?null:{ok:e.ok===!0,action:e.action==="uninstall"?"uninstall":"install",detail:typeof e.detail=="string"?e.detail:"",commands:Qe(e.commands)}}var Dt=["enabled-running","enabled-failing","installed-disabled"];function nt(e,t){let n=e.filter(s=>s.available).map(s=>s.mechanism),a=n.filter(s=>s!=="unsupported"),o=["auto",...a.length>0?a:n];return o.includes(t)||o.push(t),o}function ot(e,t){return e!==null&&e!==t}function Vt(e,t){return e===null||e.ok?!1:e.action==="install"?Dt.includes(t):t==="not-installed"}function at(e,t,n,a){return e!==null&&e.state===n&&e.mechanism===a?e:Vt(t,n)?null:t}var v=require("react/jsx-runtime");function it({t:e,status:t,run:n,updateSettings:a,busy:o,uiStyle:s}){let i=t.boot,l=t.settings.autostart,h=i.candidates??[],c=i.commands??[],[u,k]=(0,rt.useState)(null),E=o==="boot.install"||o==="boot.uninstall",q=nt(h,l.mechanism).map(R=>({value:R,label:R==="auto"?e("bootMechanismAuto"):R})),ee=ot(i.mechanism,l.mechanism),B=i.mechanism!==null,T=R=>e(R==="install"?"bootActionInstall":"bootActionUninstall"),H=async R=>{let J=await n(`boot.${R}`,async()=>R==="install"?w("boot.install",l.mechanism==="auto"?{}:{mechanism:l.mechanism}):w("boot.uninstall",{}));if(!J.ok){k(null);return}let X=et(J.value);k(X===null?null:{ok:!1,action:R,detail:X.detail,commands:X.commands,state:i.state,mechanism:i.mechanism})},I=tt(l.lastAttempt),C=at(u,I,i.state,i.mechanism);return(0,v.jsxs)(U,{icon:(0,v.jsx)(Re,{}),title:e("bootTitle"),action:(0,v.jsx)(ce,{value:l.mechanism,options:q,label:e("bootMechanism"),disabled:o==="settings"||E,onChange:R=>a(J=>({...J,autostart:{...J.autostart,mechanism:R}}))}),children:[(0,v.jsxs)("div",{className:"hh-btn-row",children:[(0,v.jsx)(S,{variant:B?"default":"primary",disabled:l.mechanism==="unsupported",busy:o==="boot.install",onClick:()=>{H("install")},children:e(ee?"bootSwitchMode":"bootEnabled")}),(0,v.jsx)(S,{disabled:!B,busy:o==="boot.uninstall",onClick:()=>{H("uninstall")},children:e("bootUninstall")}),(0,v.jsx)(S,{variant:"ghost",busy:o==="boot.verify",onClick:()=>{n("boot.verify",()=>w("boot.verify",{}))},children:e("bootRecheck")})]}),l.enabled&&i.state==="not-installed"?(0,v.jsx)(K,{tone:"warn",children:e("bootRequestedNotInstalled")}):null,C!==null&&!C.ok?(0,v.jsxs)("div",{className:"hh-section-body",children:[(0,v.jsx)(qe,{title:e("bootAttemptFailed",{action:T(C.action)}),detail:C.detail.length>0?C.detail:e("bootAttemptNoDetail")}),C.commands.length>0?(0,v.jsxs)(v.Fragment,{children:[(0,v.jsx)(f,{children:e("bootAttemptCommands")}),(0,v.jsx)(oe,{text:C.commands.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null]}):null,C!==null&&C.ok?(0,v.jsx)(f,{children:e("bootAttemptSucceeded",{action:T(C.action),detail:C.detail})}):null,c.length>0?(0,v.jsxs)(D,{label:e("bootCommandsLabel"),open:s==="detailed",children:[(0,v.jsx)(f,{children:e("bootCommandsExplain")}),(0,v.jsx)(oe,{text:c.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null,(0,v.jsxs)(D,{label:e("details"),open:s==="detailed",children:[(0,v.jsx)(y,{label:e("bootState"),children:e(se[i.state]??"bootStateUnsupported")}),(0,v.jsx)(y,{label:e("bootBootCapable"),children:i.bootCapable?e("yes"):e("no")}),(0,v.jsx)(y,{label:e("bootPrivileged"),children:i.privileged?e("yes"):e("no")}),(0,v.jsx)(y,{label:e("bootUnitPath"),children:(0,v.jsx)(F,{children:x(i.unitPath)})}),i.detail.length>0?(0,v.jsx)(f,{children:i.detail}):null]})]})}var N=require("react/jsx-runtime");function $t(e){return e.defaultEntryId??"dsh"}function st({t:e,status:t,run:n,busy:a}){let o=t.entries??[],s=t.settings.manageDsh===!0,i=t.boot.platform==="win32",l=$t(t),h=c=>{if(c){let u={id:l,autostart:!0};n("entries.apply",()=>w("entries.apply",{intents:[u]}))}else n("entries.remove",()=>w("entries.remove",{id:l}))};return(0,N.jsxs)(U,{icon:(0,N.jsx)(Ae,{}),title:e("entriesTitle"),children:[(0,N.jsx)(Z,{label:e("entriesManage",{id:l}),checked:s,disabled:a!==null,onChange:h}),(0,N.jsx)(f,{children:e("entriesManageNote",{id:l})}),i?(0,N.jsx)(K,{tone:"warn",children:e("entriesManageWinWarning",{id:l})}):null,o.length===0?(0,N.jsx)(f,{children:e("entriesEmpty",{id:l})}):(0,N.jsx)("div",{className:"hh-list",children:o.map(c=>{let u=c.live;return(0,N.jsxs)("div",{className:"hh-item",children:[(0,N.jsxs)("span",{className:"hh-item-main",children:[(0,N.jsx)("span",{className:"hh-item-name",children:c.intent.id}),(0,N.jsx)(A,{tone:c.exists?"ok":"bad",children:c.exists?e("entriesExists"):e("entriesMissing")}),(0,N.jsx)(A,{children:c.managed?e("entriesManaged"):e("entriesUnmanaged")}),c.drift.length>0?(0,N.jsx)(A,{tone:"warn",children:`${e("entriesDrift")} ${_e(c.drift)}`}):null]}),(0,N.jsx)("span",{className:"hh-item-spacer"}),(0,N.jsx)("span",{className:"hh-item-meta",children:u===null?e("entriesNotRunning"):`${x(u.status)}${u.pid===null?"":` \xB7 pid ${u.pid}`}`})]},c.intent.id)})})]})}var $=require("react");var r=require("react/jsx-runtime"),jt={absent:"panelTokenWarnAbsent",present:"panelTokenWarnPresent",stale:"panelTokenWarnStale"};function zt(e){if(e.token!=="enrolled")return e.token!=="unknown"?jt[e.token]:e.url===null?void 0:"panelTokenWarnUnreachable"}function Gt(e,t){if(!e.ok)return t("panelTokenRegenerateFailed",{message:e.error.message});let n=e.value?.panel;return n!==void 0&&n.detail.length>0?n.detail:t("panelTokenRegenerated")}function Wt(e,t){return e.ok?e.value?.detail||t("panelStopped"):e.error.code==="client"?t("panelStopping"):t("panelStopFailed",{message:e.error.message})}function Kt({value:e,label:t,hint:n,invalidLabel:a,placeholder:o,disabled:s,onChange:i}){let[l,h]=(0,$.useState)(e===null?"":String(e));(0,$.useEffect)(()=>{h(e===null?"":String(e))},[e]);let c=l.trim()===""?null:Number(l),u=c!==null&&(!Number.isInteger(c)||c<1||c>65535),k=()=>{if(u){h(e===null?"":String(e));return}c!==e&&i(c)};return(0,r.jsxs)("div",{className:"hh-field-block",children:[(0,r.jsxs)("div",{className:"hh-field",children:[(0,r.jsx)("label",{className:"hh-field-label",htmlFor:"hh-panel-port",children:t}),(0,r.jsx)("input",{id:"hh-panel-port",className:"hh-input",type:"number",value:l,placeholder:o,disabled:s,onChange:E=>h(E.target.value),onBlur:k,onKeyDown:E=>{E.key==="Enter"&&k()}})]}),(0,r.jsx)(f,{children:u?a:n})]})}function lt({t:e,status:t,run:n,updateSettings:a,busy:o,uiStyle:s}){let i=t.panel,l=t.cli,h=t.instances??[],c=l?.prefer??t.settings.cli?.prefer??"pinned",[u,k]=(0,$.useState)(!1),[E,Y]=(0,$.useState)(null),[q,ee]=(0,$.useState)(null),[B,T]=(0,$.useState)(!1),[H,I]=(0,$.useState)(null),C=zt(i),R=l?.version??null,J=R!==null&&i.version!==null,X=i.reachable&&J&&R!==i.version,{dependency:ae,global:te}=l===void 0?{dependency:null,global:null}:$e(l),St=l===void 0?[]:[`pnpm add -g home-hosted@${l.expectedRange}`,`npm install -g home-hosted@${l.expectedRange}`],ye=P=>{a(G=>({...G,cli:{...G.cli,prefer:P}}))},wt=async()=>{let P=await n("cli.installGlobal",()=>w("cli.installGlobal",{}));if(!P.ok)return;let G=P.value;Y(typeof G?.output=="string"?G.output:null)},kt=async()=>{ee(Gt(await n("panel.reclaimToken",()=>w("panel.reclaimToken",{})),e))},Tt=async()=>{T(!1),I(e("panelStopping")),I(Wt(await n("panel.stop",()=>w("panel.stop",{})),e))};return(0,r.jsxs)(U,{icon:(0,r.jsx)(Ee,{}),title:e("panelTitle"),children:[C===void 0?null:(0,r.jsxs)(K,{tone:"warn",title:e("panelTokenWarningTitle"),children:[(0,r.jsx)("p",{children:e(C)}),i.reachable||i.token==="unknown"?null:(0,r.jsx)("p",{children:e("panelTokenWarnPanelDown")}),(0,r.jsx)("div",{className:"hh-note-actions",children:(0,r.jsx)(S,{variant:"primary",busy:o==="panel.reclaimToken",onClick:()=>{kt()},children:e("panelTokenRegenerate")})})]}),q===null?null:(0,r.jsx)(f,{children:q}),l===void 0?null:(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("panelCopy"),children:[(0,r.jsx)(fe,{label:e("optionsPreferPinned"),hint:(0,r.jsx)(Xe,{children:e("optionsRecommended")}),meta:ae===null?void 0:x(ae.version),path:ae?.path??void 0,checked:c==="pinned",disabled:ae===null||o==="settings",onChange:()=>ye("pinned")}),(0,r.jsx)(fe,{label:e("optionsPreferGlobal"),meta:te===null?void 0:x(te.version),path:te?.path??void 0,checked:c==="global",disabled:te===null||o==="settings",onChange:()=>ye("global")})]}),(0,r.jsx)(f,{children:e("panelCopyHint")}),l.source==="config"?(0,r.jsx)(f,{children:e("optionsConfigOverride")}):null,l.source==="path"&&c!=="global"?(0,r.jsx)(f,{children:e("panelCliNotPinned",{range:l.expectedRange})}):null,l.supported?null:(0,r.jsx)(K,{tone:"warn",children:e("panelCliUnsupported")}),l.launcherPath!=null&&l.launcherVersion==null?(0,r.jsx)(K,{tone:"warn",children:e("panelCliLauncherFailed")}):null]}),(0,r.jsx)(Kt,{value:t.settings.panel?.port??null,label:e("panelPort"),hint:i.reachable?e("panelPortHint"):e("panelPortFree"),invalidLabel:e("panelPortInvalid"),placeholder:i.configPort==null?void 0:String(i.configPort),disabled:i.reachable||o!==null,onChange:P=>a(G=>({...G,panel:{...G.panel,port:P}}))}),t.panelRootSource!=="legacy"?null:(0,r.jsx)(f,{children:e("panelRootLegacy")}),h.length<=1?null:(0,r.jsxs)(D,{label:e("panelInstances",{count:h.length}),open:s==="detailed",children:[h.map(P=>(0,r.jsxs)(y,{label:P.managed?e("panelInstanceManaged"):e("panelInstanceOther"),children:[(0,r.jsx)(F,{children:P.home}),P.url===null?null:(0,r.jsxs)(r.Fragment,{children:[" \xB7 ",(0,r.jsx)(V,{href:P.url,children:P.url})]}),` \xB7 ${P.running?e("stateAnswering"):e("stateNotAnswering")}`,P.version===null?null:` \xB7 ${P.version}`,P.hosting?` \xB7 ${e("panelInstanceHosts")}`:null]},P.home)),(0,r.jsx)(f,{children:e("panelInstancesHint")})]}),X?(0,r.jsx)(f,{children:e("panelOutdated")}):null,(0,r.jsxs)("div",{className:"hh-btn-row",children:[i.reachable?null:(0,r.jsx)(S,{variant:"primary",busy:o==="panel.start",onClick:()=>{n("panel.start",()=>w("panel.start",{}))},children:e("panelStart")}),i.reachable?(0,r.jsx)(S,{variant:"danger",disabled:o!==null,onClick:()=>T(!0),children:e("panelStop")}):null,X&&!u?(0,r.jsx)(S,{variant:"primary",onClick:()=>k(!0),children:e("panelReplace",{copy:e(c==="global"?"panelCopyGlobal":"panelCopyPinned")})}):null]}),H===null?null:(0,r.jsx)(f,{children:H}),B?(0,r.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelStopTitle"),children:(0,r.jsxs)("div",{className:"hh-note-body",children:[(0,r.jsx)("strong",{children:e("panelStopTitle")}),(0,r.jsx)("p",{children:e("panelStopBody")}),(0,r.jsxs)("div",{className:"hh-note-actions",children:[(0,r.jsx)(S,{onClick:()=>T(!1),children:e("confirmCancel")}),(0,r.jsx)(S,{variant:"danger",busy:o==="panel.stop",onClick:()=>{Tt()},children:e("confirmStop")})]})]})}):null,X&&u?(0,r.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelTakeoverTitle"),children:(0,r.jsxs)("div",{className:"hh-note-body",children:[(0,r.jsx)("strong",{children:e("panelTakeoverTitle")}),(0,r.jsx)("p",{children:e("panelTakeoverBody",{id:t.defaultEntryId??"dsh"})}),(0,r.jsxs)("div",{className:"hh-note-actions",children:[(0,r.jsx)(S,{onClick:()=>k(!1),children:e("confirmCancel")}),(0,r.jsx)(S,{variant:"danger",busy:o==="panel.takeover",onClick:()=>{k(!1),n("panel.takeover",()=>w("panel.takeover",{}))},children:e("confirmReplace")})]})]})}):null,l!==void 0&&te===null?(0,r.jsxs)(D,{label:e("optionsInstallLabel"),open:s==="detailed",children:[(0,r.jsx)(f,{children:e("optionsInstallHint")}),(0,r.jsx)(oe,{text:St.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")}),(0,r.jsx)("div",{className:"hh-btn-row",children:(0,r.jsx)(S,{busy:o==="cli.installGlobal",onClick:()=>{wt()},children:e("optionsInstall")})}),E===null?null:(0,r.jsx)("pre",{className:"hh-output",children:E})]}):null,(0,r.jsxs)(D,{label:e("details"),open:s==="detailed",children:[(0,r.jsxs)(y,{label:e("panelHome"),children:[(0,r.jsx)(F,{children:i.home}),t.bootUnitName===void 0?null:(0,r.jsxs)(r.Fragment,{children:[" \xB7 ",t.bootUnitName]})]}),(0,r.jsx)(y,{label:e("panelUrl"),children:i.url===null?x(i.url):(0,r.jsx)(V,{href:i.url,children:i.url})}),(0,r.jsx)(y,{label:e("panelVersion"),children:x(i.version)}),(0,r.jsx)(y,{label:e("panelPid"),children:x(i.pid)}),(0,r.jsx)(y,{label:e("panelWriteVia"),children:e(Fe[i.writeVia]??"writeViaNone")}),(0,r.jsx)(y,{label:e("panelToken"),children:e(De[i.token]??"tokenUnknown")}),l===void 0?null:(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(y,{label:e("panelCliSource"),children:`${e(Ve[l.source]??"panelCliMissing")} \xB7 ${x(l.version)}`}),(0,r.jsx)(y,{label:e("panelCliPath"),children:(0,r.jsx)(F,{children:x(l.path)})})]}),i.detail.length>0?(0,r.jsx)(f,{children:i.detail}):null]})]})}var Yt=5e3;function be(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Q(e,t){let n=e[t];return typeof n=="number"&&Number.isFinite(n)?n:null}function ct(e,t){let n=e[t];return typeof n=="string"&&n.length>0?n:null}function dt(e){let t=e/1e3;return`${Number.isInteger(t)?t:t.toFixed(1)}s`}function pt(e,t,n){if(!be(e))return L;if(e.enabled!==!0)return n("serversDisabled");let a=ct(e,"mode"),o=be(e.http)?e.http:null,s;if(a==="http"||a===null&&o!==null){let l=(o===null?null:ct(o,"path"))??"/",h=o===null?null:Q(o,"expectStatus"),c=o===null?null:Q(o,"expectStatusBelow");s=h!==null?n("serversHealthHttp",{status:h,path:l}):c!==null?n("serversHealthHttpBelow",{status:c,path:l}):n("serversHealthHttpProbe",{path:l})}else t!==null?s=n("serversHealthPort",{port:t}):s=n("serversHealthProbe");let i=Q(e,"intervalMs");return i!==null&&i!==Yt?`${s} \xB7 ${n("serversHealthEvery",{seconds:dt(i)})}`:s}function ht(e,t){if(!be(e))return L;if(e.enabled===!1)return t("serversDisabled");let n=Q(e,"maxRetries"),a=Q(e,"baseDelayMs"),o=Q(e,"factor");return n===null||a===null||o===null?t("serversEnabled"):t("serversRestartSummary",{retries:n,base:dt(a),factor:o})}var qt={"not-installed":"idle","installed-disabled":"warn","enabled-running":"ok","enabled-failing":"bad",unsupported:"idle"};function Jt(...e){return e.filter(t=>t!==null&&t.length>0).join(" \xB7 ")}function Xt(e,t){let{panel:n}=e;return n.reachable?{key:"panel",tone:"ok",name:t("sigPanel"),state:t("stateAnswering"),meta:x(n.version),href:n.url}:{key:"panel",tone:e.lastError===null?"idle":"bad",name:t("sigPanel"),state:t("stateNotAnswering"),meta:n.home,href:null}}function Zt(e,t){let{boot:n}=e,o=e.settings.autostart.enabled&&n.state==="not-installed"?"warn":qt[n.state]??"idle",s=n.mechanism??(e.settings.autostart.mechanism==="auto"?null:e.settings.autostart.mechanism);return{key:"autostart",tone:o,name:t("sigAutostart"),state:t(se[n.state]??"bootStateUnsupported"),meta:s??"",href:null}}function Qt(e,t){let n=e.entries??[],a=t("sigEntry",{id:e.defaultEntryId??"dsh"}),o=e.settings.manageDsh===!0,s=n.filter(c=>!c.exists).length,i=n.filter(c=>c.drift.length>0).length,l=n.find(c=>c.live!==null)?.live??null;return{key:"entry",tone:o?s>0?"bad":i>0?"warn":l!==null?"ok":"warn":"idle",name:a,state:t(o?"stateManaged":"stateNotManaged"),meta:l===null?t("entriesNotRunning"):Jt(x(l.status),l.pid===null?null:`pid ${l.pid}`),href:null}}function ut(e,t){return[Xt(e,t),Zt(e,t),Qt(e,t)]}function gt(e,t){let n=e.filter(a=>a.status==="running").length;return t("serversCount",{running:n,total:e.length})}var p=require("react/jsx-runtime");function mt({t:e,server:t,run:n,busy:a,offline:o}){let s=t.status==="running";return(0,p.jsxs)(p.Fragment,{children:[(0,p.jsx)(S,{variant:"ghost",disabled:o||s,busy:a===`servers.start:${t.id}`,onClick:()=>{n(`servers.start:${t.id}`,()=>w("servers.start",{id:t.id}))},children:e("serversStart")}),(0,p.jsx)(S,{variant:"ghost",disabled:o||!s,busy:a===`servers.stop:${t.id}`,onClick:()=>{n(`servers.stop:${t.id}`,()=>w("servers.stop",{id:t.id}))},children:e("serversStop")}),(0,p.jsx)(S,{variant:"ghost",disabled:o||!s,busy:a===`servers.restart:${t.id}`,onClick:()=>{n(`servers.restart:${t.id}`,()=>w("servers.restart",{id:t.id}))},children:e("serversRestart")})]})}function en({text:e}){return e.length===0?(0,p.jsx)(p.Fragment,{children:L}):(0,p.jsx)("span",{className:"hh-nowrap",title:e,children:(0,p.jsx)(F,{children:e})})}function ft({t:e,status:t,run:n,busy:a,uiStyle:o}){let s=t.servers??[],i=!t.panel.reachable||a!==null,l=new Map((t.entries??[]).map(h=>[h.intent.id,h.intent]));return(0,p.jsxs)(U,{icon:(0,p.jsx)(Ie,{}),title:e("serversTitle"),action:(0,p.jsx)(A,{children:gt(s,e)}),children:[(0,p.jsx)(f,{children:t.panel.url===null?e("serversHintNoPanel"):(0,p.jsxs)(p.Fragment,{children:[`${e("serversHintPanel")} `,(0,p.jsx)(V,{href:t.panel.url,children:t.panel.url})]})}),s.length===0?(0,p.jsx)(f,{children:e("serversEmpty")}):(0,p.jsx)("div",{className:o==="detailed"?"hh-cards":"hh-list",children:s.map(h=>{let c=h.status==="running",u=h.config;if(o==="detailed"){let k=(u.args??[]).join(" "),E=u.cwd??"",Y=l.get(h.id)?.persistent;return(0,p.jsxs)("article",{className:"hh-card",children:[(0,p.jsxs)("div",{className:"hh-card-head",children:[(0,p.jsx)("span",{className:"hh-item-name",children:h.id}),(0,p.jsx)(A,{tone:c?"ok":"idle",children:x(h.status)}),Y===!0?(0,p.jsx)("span",{title:e("serversPersistentHint"),children:(0,p.jsx)(A,{tone:"accent",children:e("serversPersistent")})}):null,(0,p.jsx)("span",{className:"hh-item-spacer"}),(0,p.jsx)("span",{className:"hh-item-actions",children:(0,p.jsx)(mt,{t:e,server:h,run:n,busy:a,offline:i})})]}),(0,p.jsxs)("div",{className:"hh-card-facts",children:[(0,p.jsx)(y,{label:e("serversUrl"),children:h.url===null?x(h.url):(0,p.jsx)(V,{href:h.url,children:h.url})}),(0,p.jsx)(y,{label:e("serversPid"),children:x(h.pid)}),(0,p.jsx)(y,{label:e("serversPort"),children:x(u.port)}),(0,p.jsx)(y,{label:e("serversAutostart"),children:u.autostart===void 0?L:u.autostart?e("yes"):e("no")})]}),(0,p.jsxs)(D,{label:e("serversConfiguration"),children:[(0,p.jsx)(y,{label:e("serversCommand"),children:u.command===void 0||u.command.length===0?L:(0,p.jsx)("span",{className:"hh-nowrap",title:u.command,children:(0,p.jsx)(F,{children:u.command})})}),(0,p.jsx)(y,{label:e("serversArgs"),children:(0,p.jsx)(en,{text:k})}),(0,p.jsx)(y,{label:e("serversCwd"),children:E.length===0?L:(0,p.jsx)("span",{className:"hh-nowrap",title:E,children:(0,p.jsx)(F,{children:le(E)})})}),(0,p.jsx)(y,{label:e("serversOnPortConflict"),children:x(u.onPortConflict)}),(0,p.jsx)(y,{label:e("serversHealth"),children:pt(u.health,u.port??null,e)}),(0,p.jsx)(y,{label:e("serversRestartPolicy"),children:ht(u.restart,e)})]}),(0,p.jsx)(D,{label:e("serversRawConfig"),children:(0,p.jsx)("pre",{className:"hh-output",children:JSON.stringify(u,null,2)})})]},h.id)}return(0,p.jsxs)("div",{className:"hh-item",children:[(0,p.jsxs)("span",{className:"hh-item-main",children:[(0,p.jsx)("span",{className:"hh-item-name",children:h.id}),(0,p.jsx)(A,{tone:c?"ok":"idle",children:x(h.status)}),h.url===null?null:(0,p.jsx)(V,{href:h.url,children:h.url})]}),(0,p.jsx)("span",{className:"hh-item-spacer"}),h.pid===null?null:(0,p.jsx)("span",{className:"hh-item-meta",children:`${e("serversPid")} ${h.pid}`}),(0,p.jsx)("span",{className:"hh-item-actions",children:(0,p.jsx)(mt,{t:e,server:h,run:n,busy:a,offline:i})})]},h.id)})})]})}var ve=`
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
`;var g=require("react/jsx-runtime");function tn({signal:e}){return(0,g.jsxs)("div",{className:"hh-signal","data-tone":e.tone,children:[(0,g.jsx)("span",{className:"hh-signal-dot","aria-hidden":"true"}),(0,g.jsx)("span",{className:"hh-signal-name",children:e.name}),(0,g.jsx)("span",{className:"hh-signal-state",children:e.state}),e.meta.length===0&&e.href===null?null:(0,g.jsxs)("span",{className:"hh-signal-meta",children:[e.meta,e.href===null?null:(0,g.jsxs)(g.Fragment,{children:[e.meta.length===0?null:" \xB7 ",(0,g.jsx)(V,{href:e.href,children:e.href})]})]})]})}function bt(e){let t=ke(e.t),{data:n,error:a,loading:o,refresh:s}=Ne(),[i,l]=(0,j.useState)(null),[h,c]=(0,j.useState)(null),u=(0,j.useCallback)((T,H)=>(c(T),l(null),(async()=>{try{let I=await H();return I.ok||l(I.error),I}catch(I){let C={code:"client",message:I instanceof Error?I.message:String(I)};return l(C),{ok:!1,error:C}}finally{c(null),await s()}})()),[s]),k=(0,j.useCallback)(T=>{if(n===null)return;let H=Ge(n.settings,T(n.settings));Object.keys(H).length!==0&&u("settings",()=>Pe(H))},[n,u]),E=n?.settings.uiStyle??"detailed",[Y,q]=(0,j.useState)(E);(0,j.useEffect)(()=>{q(E)},[E]);let ee=T=>{q(T),k(H=>({...H,uiStyle:T}))};if(n===null)return(0,g.jsxs)("div",{className:"hh-root",children:[(0,g.jsx)("style",{children:ve}),o?(0,g.jsx)(f,{children:t("loading")}):(0,g.jsxs)(g.Fragment,{children:[(0,g.jsx)(ne,{error:a??{code:"status",message:t("statusUnavailable")},title:t("errorTitle")}),(0,g.jsx)("div",{className:"hh-btn-row",children:(0,g.jsx)(S,{onClick:()=>{s()},children:t("retry")})})]})]});let B={t,status:n,run:u,updateSettings:k,busy:h,uiStyle:Y};return(0,g.jsxs)("div",{className:"hh-root",children:[(0,g.jsx)("style",{children:ve}),(0,g.jsxs)("header",{className:"hh-head",children:[(0,g.jsx)("h2",{className:"hh-title",children:t("tab")}),(0,g.jsx)("span",{className:"hh-head-spacer"}),(0,g.jsx)(ce,{value:Y,label:t("uiStyleLabel"),disabled:h==="settings",options:[{value:"detailed",label:t("uiStyleDetailed")},{value:"compact",label:t("uiStyleCompact")}],onChange:T=>ee(T)}),(0,g.jsx)(S,{variant:"ghost",icon:(0,g.jsx)(Me,{size:13}),busy:h==="status.refresh",onClick:()=>{u("status.refresh",()=>w("status",{refresh:!0}))},children:t("refresh")})]}),(0,g.jsx)("div",{className:"hh-signals","data-busy":h!==null,children:ut(n,t).map(T=>(0,g.jsx)(tn,{signal:T},T.key))}),n.lastError===null?null:(0,g.jsx)(ne,{error:{code:"panel",message:n.lastError},title:t("errorTitle")}),(0,g.jsx)(ne,{error:a,title:t("errorTitle")}),(0,g.jsx)(ne,{error:i,title:t("errorTitle")}),(0,g.jsx)(lt,{...B}),(0,g.jsx)(it,{...B}),(0,g.jsx)(st,{...B}),(0,g.jsx)(Ze,{...B}),(0,g.jsx)(ft,{...B})]})}var nn=["slots","locale"],vt="[dsh-home-hosted]";function z(e,t){t===void 0?console.warn(`${vt} ${e}`):console.warn(`${vt} ${e}`,t)}function yt(e,t){try{let n=e.get?.(t);if(n!=null)return n}catch{}try{let n=e[t];if(n!=null)return n}catch{}}function xt(e,t,n){if(typeof e.effect=="function")try{e.effect(t,n);return}catch(a){z(`registering the effect "${n}" failed`,a);return}try{t()}catch(a){z(`the effect "${n}" failed`,a)}}function on(e){try{let t=yt(e,"locale"),n=we(t);t===void 0?z("the locale service is unavailable; the page keeps its bundled English copy"):xt(e,()=>{let o=[];try{o.push(t.register(re,{en:pe,zh:xe}))}catch(s){z("registering the dictionaries failed",s)}return()=>{for(let s of o)try{s()}catch(i){z("disposing a dictionary failed",i)}}},"dsh-home-hosted: dictionaries");let a=yt(e,"slots");if(a===void 0){z("the slots service is unavailable; the settings section was not registered");return}xt(e,()=>{try{return a.inject("settings.section",()=>{try{return a.register({name:"settings.section",id:"home-hosted",order:60,label:()=>n("tab"),locale:re,inject:()=>({t:n})},bt)}catch(o){return z("registering the settings section failed",o),()=>{}}})}catch(o){return z("injecting into settings.section failed",o),()=>{}}},"dsh-home-hosted: settings section")}catch(t){z("client bootstrap failed",t)}}

return module.exports; } });
