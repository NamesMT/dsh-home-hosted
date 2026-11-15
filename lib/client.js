window.__ModuleLoader__.load({ id: "dsh-home-hosted", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";var Oe=Object.defineProperty;var nn=Object.getOwnPropertyDescriptor;var on=Object.getOwnPropertyNames;var rn=Object.prototype.hasOwnProperty;var an=(e,t)=>{for(var n in t)Oe(e,n,{get:t[n],enumerable:!0})},sn=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of on(t))!rn.call(e,o)&&o!==n&&Oe(e,o,{get:()=>t[o],enumerable:!(r=nn(t,o))||r.enumerable});return e};var ln=e=>sn(Oe({},"__esModule",{value:!0}),e);var Jn={};an(Jn,{apply:()=>qn,inject:()=>Yn});module.exports=ln(Jn);var b=require("react/jsx-runtime");function te({size:e=14,children:t}){return(0,b.jsx)("svg",{width:e,height:e,viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",focusable:"false",children:t})}var De="M2.6 6.9 8 2.6l5.4 4.3M3.9 6.4v6.2a.6.6 0 0 0 .6.6h2.1V9.9h2.8v3.3h2.1a.6.6 0 0 0 .6-.6V6.4";function Ne(e){return(0,b.jsx)(te,{...e,children:(0,b.jsx)("path",{d:De})})}function Ye(e){return(0,b.jsxs)(te,{...e,children:[(0,b.jsx)("rect",{x:"2.2",y:"3",width:"11.6",height:"7.6",rx:"1.6"}),(0,b.jsx)("path",{d:"M6.6 13.4h2.8M8 10.6v2.8"})]})}function qe(e){return(0,b.jsxs)(te,{...e,children:[(0,b.jsx)("path",{d:"M8 2.4v5.2"}),(0,b.jsx)("path",{d:"M11.6 4.4a5 5 0 1 1-7.2 0"})]})}function Je(e){return(0,b.jsxs)(te,{...e,children:[(0,b.jsx)("rect",{x:"2.2",y:"2.8",width:"11.6",height:"10.4",rx:"1.6"}),(0,b.jsx)("path",{d:"M5.2 6.9l1.8 1.8-1.8 1.8M8.7 10.5h2.2"})]})}function Ze(e){return(0,b.jsxs)(te,{...e,children:[(0,b.jsx)("path",{d:"M2.4 5.4h11.2M2.4 10.6h11.2"}),(0,b.jsx)("circle",{cx:"6",cy:"5.4",r:"1.6",fill:"currentColor",stroke:"none"}),(0,b.jsx)("circle",{cx:"10.4",cy:"10.6",r:"1.6",fill:"currentColor",stroke:"none"})]})}function Ee(e){return(0,b.jsxs)(te,{...e,children:[(0,b.jsx)("path",{d:"M8 2.3l5.4 2.9L8 8.1 2.6 5.2z"}),(0,b.jsx)("path",{d:"M2.6 8.6l5.4 2.9 5.4-2.9"}),(0,b.jsx)("path",{d:"M2.6 11.4l5.4 2.9 5.4-2.9"})]})}function Xe(e){return(0,b.jsxs)(te,{...e,children:[(0,b.jsx)("path",{d:"M13.4 9.4A5.5 5.5 0 1 1 12.2 4.4"}),(0,b.jsx)("path",{d:"M12.8 1.7v2.9h-2.9"})]})}function Qe(e){return(0,b.jsx)(te,{...e,children:(0,b.jsx)("path",{d:"M6.2 3.8L10.4 8l-4.2 4.2"})})}function et(e){return(0,b.jsxs)(te,{...e,children:[(0,b.jsx)("path",{d:"M6.6 3.4H3.4v9.2h9.2V9.4"}),(0,b.jsx)("path",{d:"M9.4 3.4h3.2v3.2M12.6 3.4L7.8 8.2"})]})}function Re(e){return(0,b.jsxs)(te,{...e,children:[(0,b.jsx)("path",{d:"M8 2.6l5.7 10.2H2.3z"}),(0,b.jsx)("path",{d:"M8 6.4v3.1M8 11.5h.01"})]})}function tt(e){return(0,b.jsx)(te,{...e,children:(0,b.jsx)("path",{d:"M3 8.4l3.3 3.3L13 5"})})}var Ae="homeHosted",_e={tab:"Home Hosted",loading:"Loading\u2026",refresh:"Refresh",retry:"Retry",errorTitle:"Error",statusUnavailable:"The panel did not answer.",yes:"Yes",no:"No",copy:"Copy",copied:"Copied",details:"Details",uiStyleLabel:"Page style",uiStyleDetailed:"Detailed",uiStyleCompact:"Compact",workspacesTitle:"Workspaces",workspacesHint:"Every workspace this panel serves. Viewing one decides what this page lists.",workspacesViewLabel:"Workspace to view",workspacesEmpty:"The panel reports no workspaces yet.",workspacesManagedTag:"managed by the plugin",workspacesViewingTag:"viewing",workspacesCounts:"{servers} servers \xB7 {running} running",workspacesCountsFile:"{servers} in the config files",workspacesDegraded:"The panel is not answering, so these counts \u2014 and the entry list below \u2014 come from the workspace config files, not from live state.",workspaceLegacyTitle:"This state root still uses the pre-0.7 layout",workspaceLegacyBody:"home-hosted 0.8 no longer relocates it, and the plugin cannot read or write these files until they move into .hh. Install the latest 0.7.x once \u2014 its first run does the move \u2014 then start this release. Nothing has been changed or deleted.",sigPanel:"Panel",sigAutostart:"Autostart",sigEntry:"{id} entry",stateAnswering:"answering",stateNotAnswering:"not answering",stateManaged:"managed",stateNotManaged:"not managed",stateWebOnly:"web only",panelTitle:"Panel",panelCopy:"Which copy runs the panel",panelCopyHint:"The pinned copy ships with this plugin; the global one is on PATH.",optionsPreferPinned:"Pinned dependency",optionsPreferGlobal:"Global install",optionsRecommended:"recommended",optionsConfigOverride:"The plugin row sets homeHostedCommand, and that always wins.",optionsInstallLabel:"Install a global copy",optionsInstallHint:"No global install was found. Install the pinned range, then choose it above:",optionsInstall:"Install globally",panelHome:"Panel root",panelUrl:"URL",panelVersion:"Version",panelPid:"PID",panelWriteVia:"Writes via",panelToken:"API token",panelCliSource:"CLI",panelCliPath:"CLI path",panelCliConfig:"configured command",panelCliDependency:"pinned dependency",panelCliPathSource:"global install (PATH)",panelCliMissing:"not found",panelCliNotPinned:"This host resolved a global home-hosted instead of the pinned copy ({range}).",panelCliUnsupported:"This home-hosted is older than the oldest release the plugin supports.",panelCliLauncherFailed:"The boot launcher did not answer, so a boot entry may fail to start the panel.",panelPort:"Panel port",panelPortHint:"Only changeable while the panel is stopped.",panelPortFree:"Leave empty to use the port in the config.",panelPortInvalid:"Enter a port between 1 and 65535.",panelStart:"Start the panel",panelStop:"Stop the panel",panelStopTitle:"Stop the running panel?",panelStopBody:"Stops the panel and every non-persistent server it supervises. Persistent entries keep running. If an autostart entry is installed, it stops the panel itself, so it stays down.",panelStopping:"Stopping the panel\u2026",panelStopped:"The panel stopped.",panelStopFailed:"The panel did not stop: {message}",panelStartFailed:"The panel did not start: {message}",panelReplaceFailed:"The panel was not replaced: {message}",panelInstallFailed:"Installing home-hosted globally failed: {message}",panelRootLegacy:"Adopted from ~/.home-hosted. Set HHOSTED_HOME to give this dsh its own panel.",confirmStop:"Stop",panelOutdated:"Outdated panel",panelReplace:"Restart with {copy}",panelCopyPinned:"pinned dependency",panelCopyGlobal:"global install",panelTakeoverTitle:"Restart the running panel?",panelTakeoverBody:"Stops the panel and every non-persistent server it supervises. Persistent entries keep running. Needs the {id} entry adopted with autostart on.",confirmCancel:"Cancel",confirmReplace:"Restart",writeViaApi:"authenticated API",writeViaFile:"config file",writeViaNone:"unavailable",tokenEnrolled:"enrolled",tokenPresent:"present",tokenAbsent:"absent",tokenStale:"stale",tokenUnknown:"unknown",panelTokenWarningTitle:"The panel API token is missing or refused",panelTokenWarnAbsent:"This plugin has no API token for the panel, so it cannot read or write the panel; regenerate one.",panelTokenWarnPresent:"home-hosted holds an API token this plugin does not have, so the plugin cannot authenticate; regenerate one to replace it.",panelTokenWarnStale:"The panel refused this plugin's API token; regenerate it.",panelTokenWarnUnreachable:"The plugin could not reach the panel to check its API token, so it cannot read or write the panel; the panel may need starting.",panelTokenWarnPanelDown:"The panel is not answering right now, so it may need starting too.",panelTokenRegenerate:"Regenerate token",panelTokenRegenerated:"A fresh API token was enrolled for the panel.",panelTokenRegenerateFailed:"The token was not replaced: {message}",panelFirstRunPasswordTitle:"The panel is still using its first-run password",panelFirstRunPasswordBody:"home-hosted generated this password when the panel first started and prints it once, on the machine that started the panel. This plugin started it for you, so here it is.",panelFirstRunPasswordLost:"The generated password is still in use, but its text is no longer recorded \u2014 a restored backup keeps the hash, not always the text \u2014 so it cannot be read back. Set a new one below; you do not need a terminal.",panelPasswordReset:"Set a new password",panelPasswordResetTitle:"New panel password",panelPasswordResetBody:"This password is now the panel's. Sign in with it \u2014 the panel picks it up immediately, and anyone already signed in was signed out.",panelPasswordResetOnce:"Copy it now: it is shown once and is not stored anywhere.",panelFirstRunPasswordChange:"Change it in Global settings \u2192 Authentication once you are signed in.",panelInstances:"{count} panels found",panelInstanceManaged:"managed by this plugin",panelInstanceOther:"another panel",panelInstanceHosts:"hosts this dsh",panelInstancesHint:"This plugin drives only the managed one; the others are read from their state roots and never written to.",bootTitle:"Autostart",bootEnabled:"Enable autostart",bootUninstall:"Uninstall",bootSwitchMode:"Switch autostart",bootRecheck:"Re-check",bootMechanism:"Mechanism",bootMechanismAuto:"Automatic",bootMechanismAutoHint:"Picked from what this machine can actually use, preferring a mechanism that starts before you log in.",bootMechanismAutoPicks:"The next install would use {mechanism}.",bootState:"State",bootStateNotInstalled:"not installed",bootStateInstalledDisabled:"installed, off",bootStateEnabledRunning:"enabled, running",bootStateEnabledFailing:"enabled, failing",bootStateUnsupported:"unsupported",bootBootCapable:"Starts before login",bootPrivileged:"This process can install it",bootUnitPath:"Unit path",bootCommandsLabel:"Install by hand",bootCommandsExplain:"This process cannot elevate. Run these commands to install autostart:",bootRequestedNotInstalled:"Autostart is requested, but no boot entry is installed.",bootHandover:"Stops the panel this plugin started and starts it through the entry instead. Persistent entries keep running, so this session stays up; the page shows the panel again once it answers.",bootSwitchRetires:"Stops the panel and removes the previous autostart entry. Persistent entries keep running, so this session stays up; the page shows the panel again once the entry starts one.",bootActionInstall:"install",bootActionUninstall:"uninstall",bootAttemptFailed:"{action} failed",bootAttemptSucceeded:"{action} succeeded \u2014 {detail}",bootAttemptNoDetail:"The host did not explain the refusal.",bootAttemptCommands:"Run these yourself:",entriesTitle:"Managed entry",entriesManage:"Manage {id}",entriesManageNote:"Hands {id} to home-hosted: boot autostart, panel control, port reclaim.",entriesManageDesktop:"Available for dsh web only. Desktop starts its own profile, so it is never one of the panel's entries \u2014 servers are still managed here.",entriesManageWinWarning:"On Windows, `{id}` is managed via the `kill` onPortConflict policy, so when it is restarted detached by another plugin it may briefly fail to boot while home-hosted reclaims the process and port.",entriesEmpty:"{id} is not managed yet.",entriesExists:"exists",entriesMissing:"missing",entriesManaged:"managed",entriesUnmanaged:"unmanaged",entriesDrift:"drift",entriesNotRunning:"not running",agentTitle:"Agent tools",agentCount:"{enabled} of {total} on",agentMaster:"Let the agent use these tools",agentApproval:"Tools that change something ask for approval first.",agentApprovalBadge:"approval",reclaimAutoLabel:"Regenerate token automatically",reclaimAutoHint:"A tool call that finds a refused token re-enrols one and retries instead of failing.",instancesNoticeLabel:"Tell the agent about other panels",instancesNoticeHint:"Adds the panel inventory to the agent's context, and asks which panel to act on when several exist.",agentToolStatus:"Status",agentToolWorkspacesList:"List workspaces",agentToolServersList:"List servers",agentToolServersLifecycle:"Start, stop, restart",agentToolServersEdit:"Create, update, delete",agentToolAutostartManage:"Manage boot autostart",agentToolUiManage:"Manage Panel UI",agentToolPanelLogs:"Panel Logs",agentToolDescStatus:"Read the panel, the CLI copy in use and the managed entry. Nothing changes.",agentToolDescWorkspacesList:"List every workspace the panel serves, with its entry and running counts. A server id is only unique inside a workspace.",agentToolDescServersList:"List the servers of one workspace, with status, port and URL.",agentToolDescServersLifecycle:"Start, stop and restart supervised servers.",agentToolDescServersEdit:"Create, update and delete server entries.",agentToolDescAutostartManage:"Install or remove the boot entry that starts the panel.",agentToolDescUiManage:"Inspect, update, revert or install an official UI build.",agentToolDescPanelLogs:"Read the panel's own console output. Needs no API token, so it works when the panel is up but not answering.",serversTitle:"Servers",serversCount:"{running} of {total} running",serversHintPanel:"Entries are managed in the home-hosted panel:",serversHintNoPanel:"Entries cannot be managed right now: the panel is not running.",serversEmpty:"The panel reports no servers.",serversStopped:"Stopped by the panel",serversStoppedByPanel:"The panel gave up on this entry because it never passed its health check. Starting it again clears the flag.",serversPid:"PID",serversUrl:"URL",serversCommand:"Command",serversArgs:"Args",serversCwd:"Working dir",serversPort:"Port",serversOnPortConflict:"On port conflict",serversAutostart:"Autostart",serversPersistent:"Persistent",serversPersistentHint:"Run by home-hosted's own nanny, so stopping or restarting the panel leaves it alive.",serversHealth:"Health",serversRestartPolicy:"Restart",serversConfiguration:"Configuration",serversRawConfig:"Raw config",serversDisabled:"disabled",serversEnabled:"enabled",serversHealthHttp:"HTTP {status} on {path}",serversHealthHttpBelow:"HTTP <{status} on {path}",serversHealthHttpProbe:"HTTP probe on {path}",serversHealthPort:"port {port}",serversHealthProbe:"port probe",serversHealthEvery:"every {seconds}",serversRestartSummary:"{retries} retries \xB7 {base} \u2192 \xD7{factor}",serversStart:"Start",serversStop:"Stop",serversRestart:"Restart",serversWorkspace:"Workspace",serversAdd:"Add server",serversEdit:"Edit",serversEditTitle:"Edit {id}",serversCreateTitle:"Add a server",serversEditorHint:"Only the fields you change are written. These are the common ones \u2014 the panel link above edits every field, including bootstrap, env files, resources and restart policy.",serversCreate:"Create",serversSave:"Save",serversDelete:"Delete",serversDeleteTitle:"Delete {id}?",serversDeleteBody:"This removes the entry from workspace {workspace}. A running server is stopped with it.",serversDeleteGo:"Delete",serversFreePort:"Free port",serversFreePortTitle:"Free port {port}?",serversFreePortBody:"Stops whatever holds the port, unless the panel supervises it. Processes get SIGTERM first, then a forced stop.",serversFreePortGo:"Free",serversPortFreed:"Port {port} is free.",serversPortHeld:"Port {port} is still held.",serversPortSkipped:"The listener belongs to a server the panel supervises, so it was left alone.",serversPortRefused:"The port was not freed: {message}",fieldId:"Id",fieldIdHint:"Lowercase letters, digits, `_` and `-`; unique inside the workspace.",fieldIdInvalid:"An id starts with a lowercase letter or digit and uses only a-z, 0-9, _ and -.",fieldLabel:"Label",fieldCommand:"Command",fieldArgs:"Arguments",fieldArgsHint:"One argument per line.",fieldCwd:"Working directory",fieldPort:"Port",fieldPortHint:"Empty means the entry has no port.",fieldPortInvalid:"Enter a port between 1 and 65535, or leave it empty.",fieldAutostart:"Start with the panel",fieldOnPortConflict:"On port conflict",fieldInherit:"Inherit",fieldRequired:"Id and command are required."},nt={tab:"Home Hosted",loading:"\u52A0\u8F7D\u4E2D\u2026",refresh:"\u5237\u65B0",retry:"\u91CD\u8BD5",errorTitle:"\u9519\u8BEF",statusUnavailable:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\u3002",yes:"\u662F",no:"\u5426",copy:"\u590D\u5236",copied:"\u5DF2\u590D\u5236",details:"\u8BE6\u60C5",uiStyleLabel:"\u9875\u9762\u6837\u5F0F",uiStyleDetailed:"\u8BE6\u7EC6",uiStyleCompact:"\u7D27\u51D1",workspacesTitle:"\u5DE5\u4F5C\u533A",workspacesHint:"\u6B64\u9762\u677F\u63D0\u4F9B\u7684\u6240\u6709\u5DE5\u4F5C\u533A\u3002\u67E5\u770B\u54EA\u4E2A\u5C31\u5217\u51FA\u54EA\u4E2A\u3002",workspacesViewLabel:"\u8981\u67E5\u770B\u7684\u5DE5\u4F5C\u533A",workspacesEmpty:"\u9762\u677F\u5C1A\u672A\u62A5\u544A\u4EFB\u4F55\u5DE5\u4F5C\u533A\u3002",workspacesManagedTag:"\u7531\u63D2\u4EF6\u7BA1\u7406",workspacesViewingTag:"\u6B63\u5728\u67E5\u770B",workspacesCounts:"{servers} \u4E2A\u670D\u52A1\u5668 \xB7 {running} \u4E2A\u8FD0\u884C\u4E2D",workspacesCountsFile:"\u914D\u7F6E\u6587\u4EF6\u4E2D {servers} \u4E2A",workspacesDegraded:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\uFF0C\u56E0\u6B64\u8FD9\u4E9B\u8BA1\u6570\u2014\u2014\u4EE5\u53CA\u4E0B\u65B9\u7684\u6761\u76EE\u5217\u8868\u2014\u2014\u6765\u81EA\u5DE5\u4F5C\u533A\u914D\u7F6E\u6587\u4EF6\uFF0C\u800C\u4E0D\u662F\u5B9E\u65F6\u72B6\u6001\u3002",workspaceLegacyTitle:"\u8BE5\u72B6\u6001\u76EE\u5F55\u4ECD\u662F 0.7 \u4E4B\u524D\u7684\u5E03\u5C40",workspaceLegacyBody:"home-hosted 0.8 \u4E0D\u518D\u8FC1\u79FB\u8BE5\u5E03\u5C40\uFF0C\u5728\u8FD9\u4E9B\u6587\u4EF6\u79FB\u5165 .hh \u4E4B\u524D\uFF0C\u63D2\u4EF6\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u5B83\u4EEC\u3002\u8BF7\u5148\u5B89\u88C5\u5E76\u8FD0\u884C\u4E00\u6B21\u6700\u65B0\u7684 0.7.x\u2014\u2014\u5B83\u9996\u6B21\u8FD0\u884C\u5373\u5B8C\u6210\u8FC1\u79FB\u2014\u2014\u7136\u540E\u542F\u52A8\u672C\u7248\u672C\u3002\u4E0D\u4F1A\u6539\u52A8\u6216\u5220\u9664\u4EFB\u4F55\u5185\u5BB9\u3002",sigPanel:"\u9762\u677F",sigAutostart:"\u5F00\u673A\u81EA\u542F",sigEntry:"{id} \u6761\u76EE",stateAnswering:"\u54CD\u5E94\u4E2D",stateNotAnswering:"\u672A\u54CD\u5E94",stateManaged:"\u5DF2\u63A5\u7BA1",stateNotManaged:"\u672A\u63A5\u7BA1",stateWebOnly:"\u4EC5 web",panelTitle:"\u9762\u677F",panelCopy:"\u7531\u54EA\u4E2A\u526F\u672C\u8FD0\u884C\u9762\u677F",panelCopyHint:"\u56FA\u5B9A\u526F\u672C\u968F\u63D2\u4EF6\u4E00\u8D77\u5B89\u88C5\uFF1B\u5168\u5C40\u526F\u672C\u6765\u81EA PATH\u3002",optionsPreferPinned:"\u56FA\u5B9A\u4F9D\u8D56",optionsPreferGlobal:"\u5168\u5C40\u5B89\u88C5",optionsRecommended:"\u63A8\u8350",optionsConfigOverride:"\u63D2\u4EF6\u884C\u4E2D\u7684 homeHostedCommand \u4F18\u5148\u7EA7\u6700\u9AD8\uFF0C\u59CB\u7EC8\u751F\u6548\u3002",optionsInstallLabel:"\u5B89\u88C5\u5168\u5C40\u526F\u672C",optionsInstallHint:"\u672A\u627E\u5230\u5168\u5C40\u5B89\u88C5\u3002\u5B89\u88C5\u56FA\u5B9A\u7248\u672C\u8303\u56F4\u540E\uFF0C\u5728\u4E0A\u65B9\u9009\u62E9\u5B83\uFF1A",optionsInstall:"\u5168\u5C40\u5B89\u88C5",panelHome:"\u9762\u677F\u6839\u76EE\u5F55",panelUrl:"URL",panelVersion:"\u7248\u672C",panelPid:"PID",panelWriteVia:"\u5199\u5165\u65B9\u5F0F",panelToken:"API \u4EE4\u724C",panelCliSource:"CLI",panelCliPath:"CLI \u8DEF\u5F84",panelCliConfig:"\u914D\u7F6E\u7684\u547D\u4EE4",panelCliDependency:"\u56FA\u5B9A\u7684\u4F9D\u8D56\u7248\u672C",panelCliPathSource:"\u5168\u5C40\u5B89\u88C5\uFF08PATH\uFF09",panelCliMissing:"\u672A\u627E\u5230",panelCliNotPinned:"\u6B64\u5BBF\u4E3B\u89E3\u6790\u5230\u7684\u662F\u5168\u5C40 home-hosted\uFF0C\u800C\u4E0D\u662F\u56FA\u5B9A\u526F\u672C\uFF08{range}\uFF09\u3002",panelCliUnsupported:"\u6B64 home-hosted \u65E9\u4E8E\u63D2\u4EF6\u652F\u6301\u7684\u6700\u8001\u7248\u672C\u3002",panelCliLauncherFailed:"\u5F00\u673A\u542F\u52A8\u5668\u6CA1\u6709\u5E94\u7B54\uFF0C\u5F00\u673A\u9879\u53EF\u80FD\u65E0\u6CD5\u542F\u52A8\u9762\u677F\u3002",panelPort:"\u9762\u677F\u7AEF\u53E3",panelPortHint:"\u4EC5\u5728\u9762\u677F\u505C\u6B62\u65F6\u53EF\u4FEE\u6539\u3002",panelPortFree:"\u7559\u7A7A\u5219\u4F7F\u7528\u914D\u7F6E\u6587\u4EF6\u4E2D\u7684\u7AEF\u53E3\u3002",panelPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\u3002",panelStart:"\u542F\u52A8\u9762\u677F",panelStop:"\u505C\u6B62\u9762\u677F",panelStopTitle:"\u505C\u6B62\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelStopBody:"\u505C\u6B62\u9762\u677F\u53CA\u5176\u76D1\u7BA1\u7684\u6240\u6709\u975E\u6301\u4E45\u5316\u670D\u52A1\u5668\uFF1B\u6301\u4E45\u5316\u6761\u76EE\u4F1A\u7EE7\u7EED\u8FD0\u884C\u3002\u82E5\u5DF2\u5B89\u88C5\u81EA\u542F\u6761\u76EE\uFF0C\u505C\u6B62\u7531\u8BE5\u6761\u76EE\u6267\u884C\uFF0C\u56E0\u6B64\u4E0D\u4F1A\u518D\u88AB\u62C9\u8D77\u3002",panelStopping:"\u6B63\u5728\u505C\u6B62\u9762\u677F\u2026",panelStopped:"\u9762\u677F\u5DF2\u505C\u6B62\u3002",panelStopFailed:"\u9762\u677F\u672A\u80FD\u505C\u6B62\uFF1A{message}",panelStartFailed:"\u9762\u677F\u672A\u80FD\u542F\u52A8\uFF1A{message}",panelReplaceFailed:"\u9762\u677F\u672A\u80FD\u66FF\u6362\uFF1A{message}",panelInstallFailed:"\u5168\u5C40\u5B89\u88C5 home-hosted \u5931\u8D25\uFF1A{message}",panelRootLegacy:"\u6CBF\u7528\u4E86 ~/.home-hosted\u3002\u8BBE\u7F6E HHOSTED_HOME \u53EF\u8BA9\u6B64 dsh \u4F7F\u7528\u81EA\u5DF1\u7684\u9762\u677F\u3002",confirmStop:"\u505C\u6B62",panelOutdated:"\u9762\u677F\u5DF2\u8FC7\u65F6",panelReplace:"\u4F7F\u7528{copy}\u91CD\u542F",panelCopyPinned:"\u56FA\u5B9A\u4F9D\u8D56",panelCopyGlobal:"\u5168\u5C40\u5B89\u88C5",panelTakeoverTitle:"\u91CD\u542F\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelTakeoverBody:"\u505C\u6B62\u9762\u677F\u53CA\u5176\u76D1\u7BA1\u7684\u6240\u6709\u975E\u6301\u4E45\u5316\u670D\u52A1\u5668\uFF1B\u6301\u4E45\u5316\u6761\u76EE\u4F1A\u7EE7\u7EED\u8FD0\u884C\u3002\u9700\u8981 {id} \u6761\u76EE\u5DF2\u88AB\u63A5\u7BA1\u4E14\u5DF2\u542F\u7528\u81EA\u542F\u3002",confirmCancel:"\u53D6\u6D88",confirmReplace:"\u91CD\u542F",writeViaApi:"\u5DF2\u8BA4\u8BC1 API",writeViaFile:"\u914D\u7F6E\u6587\u4EF6",writeViaNone:"\u4E0D\u53EF\u7528",tokenEnrolled:"\u5DF2\u767B\u8BB0",tokenPresent:"\u5DF2\u5B58\u5728",tokenAbsent:"\u4E0D\u5B58\u5728",tokenStale:"\u5DF2\u5931\u6548",tokenUnknown:"\u672A\u77E5",panelTokenWarningTitle:"\u9762\u677F API \u4EE4\u724C\u7F3A\u5931\u6216\u5DF2\u88AB\u62D2\u7EDD",panelTokenWarnAbsent:"\u672C\u63D2\u4EF6\u6CA1\u6709\u6B64\u9762\u677F\u7684 API \u4EE4\u724C\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u9762\u677F\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u4E00\u4E2A\u3002",panelTokenWarnPresent:"home-hosted \u6301\u6709\u4E00\u4E2A\u672C\u63D2\u4EF6\u6CA1\u6709\u7684 API \u4EE4\u724C\uFF0C\u63D2\u4EF6\u65E0\u6CD5\u901A\u8FC7\u8BA4\u8BC1\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u4E00\u4E2A\u4EE5\u66FF\u6362\u5B83\u3002",panelTokenWarnStale:"\u9762\u677F\u62D2\u7EDD\u4E86\u672C\u63D2\u4EF6\u7684 API \u4EE4\u724C\uFF1B\u8BF7\u91CD\u65B0\u751F\u6210\u3002",panelTokenWarnUnreachable:"\u672C\u63D2\u4EF6\u65E0\u6CD5\u8BBF\u95EE\u9762\u677F\u4EE5\u68C0\u67E5\u5176 API \u4EE4\u724C\uFF0C\u56E0\u6B64\u65E0\u6CD5\u8BFB\u53D6\u6216\u5199\u5165\u9762\u677F\uFF1B\u9762\u677F\u53EF\u80FD\u8FD8\u9700\u8981\u5148\u542F\u52A8\u3002",panelTokenWarnPanelDown:"\u9762\u677F\u5F53\u524D\u6CA1\u6709\u54CD\u5E94\uFF0C\u53EF\u80FD\u8FD8\u9700\u8981\u5148\u542F\u52A8\u9762\u677F\u3002",panelTokenRegenerate:"\u91CD\u65B0\u751F\u6210\u4EE4\u724C",panelTokenRegenerated:"\u5DF2\u4E3A\u9762\u677F\u767B\u8BB0\u65B0\u4EE4\u724C\u3002",panelTokenRegenerateFailed:"\u4EE4\u724C\u672A\u66FF\u6362\uFF1A{message}",panelFirstRunPasswordTitle:"\u9762\u677F\u4ECD\u5728\u4F7F\u7528\u9996\u6B21\u8FD0\u884C\u5BC6\u7801",panelFirstRunPasswordBody:"home-hosted \u5728\u9762\u677F\u9996\u6B21\u542F\u52A8\u65F6\u751F\u6210\u4E86\u6B64\u5BC6\u7801\uFF0C\u5E76\u4E14\u53EA\u5728\u542F\u52A8\u9762\u677F\u7684\u90A3\u53F0\u673A\u5668\u4E0A\u663E\u793A\u4E00\u6B21\u3002\u672C\u6B21\u662F\u7531\u672C\u63D2\u4EF6\u4E3A\u4F60\u542F\u52A8\u7684\uFF0C\u6240\u4EE5\u8FD9\u91CC\u663E\u793A\u51FA\u6765\u3002",panelFirstRunPasswordLost:"\u751F\u6210\u5BC6\u7801\u4ECD\u5728\u4F7F\u7528\uFF0C\u4F46\u5176\u660E\u6587\u5DF2\u4E0D\u518D\u8BB0\u5F55\u2014\u2014\u4ECE\u5907\u4EFD\u6062\u590D\u4F1A\u4FDD\u7559\u54C8\u5E0C\uFF0C\u4F46\u4E0D\u4E00\u5B9A\u4FDD\u7559\u660E\u6587\u2014\u2014\u56E0\u6B64\u65E0\u6CD5\u518D\u8BFB\u53D6\u3002\u8BF7\u5728\u4E0B\u65B9\u8BBE\u7F6E\u65B0\u5BC6\u7801\uFF0C\u65E0\u9700\u4F7F\u7528\u7EC8\u7AEF\u3002",panelPasswordReset:"\u8BBE\u7F6E\u65B0\u5BC6\u7801",panelPasswordResetTitle:"\u65B0\u7684\u9762\u677F\u5BC6\u7801",panelPasswordResetBody:"\u6B64\u5BC6\u7801\u73B0\u5728\u5373\u4E3A\u9762\u677F\u5BC6\u7801\uFF0C\u8BF7\u7528\u5B83\u767B\u5F55\u2014\u2014\u9762\u677F\u4F1A\u7ACB\u5373\u751F\u6548\uFF0C\u5DF2\u767B\u5F55\u7684\u7528\u6237\u5747\u5DF2\u88AB\u767B\u51FA\u3002",panelPasswordResetOnce:"\u8BF7\u7ACB\u5373\u590D\u5236\uFF1A\u5B83\u53EA\u663E\u793A\u4E00\u6B21\uFF0C\u4E0D\u4F1A\u4FDD\u5B58\u5728\u4EFB\u4F55\u5730\u65B9\u3002",panelFirstRunPasswordChange:"\u767B\u5F55\u540E\u8BF7\u5728\u300C\u5168\u5C40\u8BBE\u7F6E \u2192 \u8EAB\u4EFD\u9A8C\u8BC1\u300D\u4E2D\u4FEE\u6539\u5B83\u3002",panelInstances:"\u53D1\u73B0 {count} \u4E2A\u9762\u677F",panelInstanceManaged:"\u7531\u672C\u63D2\u4EF6\u7BA1\u7406",panelInstanceOther:"\u5176\u4ED6\u9762\u677F",panelInstanceHosts:"\u6258\u7BA1\u5F53\u524D dsh",panelInstancesHint:"\u672C\u63D2\u4EF6\u53EA\u9A71\u52A8\u88AB\u7BA1\u7406\u7684\u90A3\u4E00\u4E2A\uFF1B\u5176\u4ED6\u9762\u677F\u4EC5\u4ECE\u5176\u72B6\u6001\u76EE\u5F55\u8BFB\u53D6\uFF0C\u7EDD\u4E0D\u5199\u5165\u3002",bootTitle:"\u5F00\u673A\u81EA\u542F",bootEnabled:"\u542F\u7528\u5F00\u673A\u81EA\u542F",bootUninstall:"\u5378\u8F7D",bootSwitchMode:"\u5207\u6362\u81EA\u542F\u673A\u5236",bootRecheck:"\u91CD\u65B0\u68C0\u67E5",bootMechanism:"\u673A\u5236",bootMechanismAuto:"\u81EA\u52A8",bootMechanismAutoHint:"\u6839\u636E\u672C\u673A\u5B9E\u9645\u53EF\u7528\u7684\u65B9\u5F0F\u81EA\u52A8\u9009\u62E9\uFF0C\u4F18\u5148\u9009\u62E9\u5728\u767B\u5F55\u524D\u5373\u53EF\u542F\u52A8\u7684\u673A\u5236\u3002",bootMechanismAutoPicks:"\u4E0B\u6B21\u5B89\u88C5\u5C06\u4F7F\u7528 {mechanism}\u3002",bootState:"\u72B6\u6001",bootStateNotInstalled:"\u672A\u5B89\u88C5",bootStateInstalledDisabled:"\u5DF2\u5B89\u88C5\uFF0C\u672A\u542F\u7528",bootStateEnabledRunning:"\u5DF2\u542F\u7528\uFF0C\u8FD0\u884C\u4E2D",bootStateEnabledFailing:"\u5DF2\u542F\u7528\uFF0C\u542F\u52A8\u5931\u8D25",bootStateUnsupported:"\u4E0D\u652F\u6301",bootBootCapable:"\u767B\u5F55\u524D\u542F\u52A8",bootPrivileged:"\u672C\u8FDB\u7A0B\u53EF\u5B89\u88C5",bootUnitPath:"\u5355\u5143\u6587\u4EF6\u8DEF\u5F84",bootCommandsLabel:"\u624B\u52A8\u5B89\u88C5",bootCommandsExplain:"\u672C\u8FDB\u7A0B\u65E0\u6CD5\u63D0\u6743\u3002\u8BF7\u81EA\u884C\u6267\u884C\u4EE5\u4E0B\u547D\u4EE4\u6765\u5B89\u88C5\u81EA\u542F\uFF1A",bootRequestedNotInstalled:"\u5DF2\u8BF7\u6C42\u5F00\u673A\u81EA\u542F\uFF0C\u4F46\u5C1A\u672A\u5B89\u88C5\u4EFB\u4F55\u5F00\u673A\u9879\u3002",bootHandover:"\u505C\u6B62\u672C\u63D2\u4EF6\u542F\u52A8\u7684\u9762\u677F\uFF0C\u6539\u7531\u8BE5\u5F00\u673A\u9879\u542F\u52A8\u3002\u6301\u4E45\u5316\u6761\u76EE\u4F1A\u7EE7\u7EED\u8FD0\u884C\uFF0C\u672C\u4F1A\u8BDD\u4E0D\u53D7\u5F71\u54CD\uFF1B\u9762\u677F\u6062\u590D\u5E94\u7B54\u540E\u9875\u9762\u4F1A\u91CD\u65B0\u663E\u793A\u5B83\u3002",bootSwitchRetires:"\u505C\u6B62\u9762\u677F\u5E76\u79FB\u9664\u5148\u524D\u7684\u81EA\u542F\u9879\u3002\u6301\u4E45\u5316\u6761\u76EE\u4F1A\u7EE7\u7EED\u8FD0\u884C\uFF0C\u672C\u4F1A\u8BDD\u4E0D\u53D7\u5F71\u54CD\uFF1B\u8BE5\u5F00\u673A\u9879\u542F\u52A8\u65B0\u9762\u677F\u540E\u9875\u9762\u4F1A\u91CD\u65B0\u663E\u793A\u5B83\u3002",bootActionInstall:"\u5B89\u88C5",bootActionUninstall:"\u5378\u8F7D",bootAttemptFailed:"{action}\u5931\u8D25",bootAttemptSucceeded:"{action}\u6210\u529F \u2014 {detail}",bootAttemptNoDetail:"\u5BBF\u4E3B\u6CA1\u6709\u8BF4\u660E\u5931\u8D25\u539F\u56E0\u3002",bootAttemptCommands:"\u4F60\u53EF\u4EE5\u81EA\u884C\u8FD0\u884C\u4EE5\u4E0B\u547D\u4EE4\uFF1A",entriesTitle:"\u53D7\u7BA1\u6761\u76EE",entriesManage:"\u63A5\u7BA1 {id}",entriesManageNote:"\u628A {id} \u4EA4\u7ED9 home-hosted\uFF1A\u5F00\u673A\u81EA\u542F\u3001\u9762\u677F\u63A7\u5236\u3001\u7AEF\u53E3\u56DE\u6536\u3002",entriesManageDesktop:"\u4EC5\u9002\u7528\u4E8E dsh web\u3002Desktop \u542F\u52A8\u81EA\u5DF1\u7684 profile\uFF0C\u56E0\u6B64\u5B83\u6C38\u8FDC\u4E0D\u4F1A\u6210\u4E3A\u9762\u677F\u4E2D\u7684\u6761\u76EE\u2014\u2014\u670D\u52A1\u5668\u4ECD\u53EF\u5728\u6B64\u7BA1\u7406\u3002",entriesManageWinWarning:"\u5728 Windows \u4E0A\uFF0C`{id}` \u901A\u8FC7 `kill` \u7AEF\u53E3\u51B2\u7A81\u7B56\u7565\u7BA1\u7406\uFF1B\u5F53\u5B83\u88AB\u5176\u4ED6\u63D2\u4EF6\u4EE5\u5206\u79BB\u65B9\u5F0F\u91CD\u542F\u65F6\uFF0Chome-hosted \u56DE\u6536\u8FDB\u7A0B\u4E0E\u7AEF\u53E3\u671F\u95F4\u53EF\u80FD\u77ED\u6682\u65E0\u6CD5\u542F\u52A8\u3002",entriesEmpty:"\u5C1A\u672A\u63A5\u7BA1 {id}\u3002",entriesExists:"\u5B58\u5728",entriesMissing:"\u7F3A\u5931",entriesManaged:"\u5DF2\u63A5\u7BA1",entriesUnmanaged:"\u672A\u63A5\u7BA1",entriesDrift:"\u6F02\u79FB",entriesNotRunning:"\u672A\u8FD0\u884C",agentTitle:"Agent \u5DE5\u5177",agentCount:"\u5DF2\u5F00\u542F {enabled}/{total}",agentMaster:"\u5141\u8BB8 Agent \u8C03\u7528\u8FD9\u4E9B\u5DE5\u5177",agentApproval:"\u4F1A\u6539\u53D8\u72B6\u6001\u7684\u5DE5\u5177\u5728\u8FD0\u884C\u524D\u4F1A\u8BF7\u6C42\u6279\u51C6\u3002",agentApprovalBadge:"\u9700\u6279\u51C6",reclaimAutoLabel:"\u88AB\u62D2\u7EDD\u65F6\u81EA\u52A8\u91CD\u65B0\u751F\u6210\u4EE4\u724C",reclaimAutoHint:"\u5DE5\u5177\u8C03\u7528\u9047\u5230\u88AB\u62D2\u7EDD\u7684\u4EE4\u724C\u65F6\u4F1A\u91CD\u65B0\u767B\u8BB0\u5E76\u91CD\u8BD5\uFF0C\u800C\u4E0D\u662F\u76F4\u63A5\u5931\u8D25\u3002",instancesNoticeLabel:"\u5411 Agent \u8BF4\u660E\u5176\u4ED6\u9762\u677F",instancesNoticeHint:"\u628A\u9762\u677F\u6E05\u5355\u52A0\u5165 Agent \u4E0A\u4E0B\u6587\uFF1B\u5B58\u5728\u591A\u4E2A\u9762\u677F\u65F6\u4F1A\u5148\u8BE2\u95EE\u8981\u64CD\u4F5C\u54EA\u4E00\u4E2A\u3002",agentToolStatus:"\u67E5\u770B\u72B6\u6001",agentToolWorkspacesList:"\u5217\u51FA\u5DE5\u4F5C\u533A",agentToolServersList:"\u5217\u51FA\u670D\u52A1\u5668",agentToolServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u3001\u91CD\u542F",agentToolServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u3001\u5220\u9664",agentToolAutostartManage:"\u7BA1\u7406\u5F00\u673A\u81EA\u542F",agentToolUiManage:"\u7BA1\u7406\u9762\u677F UI",agentToolPanelLogs:"\u9762\u677F\u65E5\u5FD7",agentToolDescStatus:"\u8BFB\u53D6\u9762\u677F\u3001\u6B63\u5728\u4F7F\u7528\u7684 CLI \u526F\u672C\u548C\u53D7\u7BA1\u6761\u76EE\u3002\u4E0D\u6539\u53D8\u4EFB\u4F55\u72B6\u6001\u3002",agentToolDescWorkspacesList:"\u5217\u51FA\u9762\u677F\u63D0\u4F9B\u7684\u6240\u6709\u5DE5\u4F5C\u533A\u53CA\u5176\u6761\u76EE\u6570\u548C\u8FD0\u884C\u6570\u3002\u670D\u52A1\u5668 id \u53EA\u5728\u5DE5\u4F5C\u533A\u5185\u552F\u4E00\u3002",agentToolDescServersList:"\u5217\u51FA\u67D0\u4E2A\u5DE5\u4F5C\u533A\u4E2D\u88AB\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u53CA\u5176\u72B6\u6001\u3001\u7AEF\u53E3\u548C URL\u3002",agentToolDescServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u548C\u91CD\u542F\u53D7\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u3002",agentToolDescServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u548C\u5220\u9664\u670D\u52A1\u5668\u6761\u76EE\u3002",agentToolDescAutostartManage:"\u5B89\u88C5\u6216\u79FB\u9664\u542F\u52A8\u9762\u677F\u7684\u5F00\u673A\u9879\u3002",agentToolDescUiManage:"\u67E5\u770B\u3001\u66F4\u65B0\u3001\u56DE\u9000\u6216\u5B89\u88C5\u5B98\u65B9 UI \u6784\u5EFA\u3002",agentToolDescPanelLogs:"\u8BFB\u53D6\u9762\u677F\u81EA\u8EAB\u7684\u63A7\u5236\u53F0\u8F93\u51FA\u3002\u65E0\u9700 API \u4EE4\u724C\uFF0C\u56E0\u6B64\u9762\u677F\u5728\u8FD0\u884C\u4F46\u65E0\u54CD\u5E94\u65F6\u4E5F\u80FD\u4F7F\u7528\u3002",serversTitle:"\u670D\u52A1\u5668",serversCount:"{total} \u4E2A\u4E2D {running} \u4E2A\u8FD0\u884C\u4E2D",serversHintPanel:"\u5728 home-hosted \u9762\u677F\u4E2D\u7BA1\u7406\u6761\u76EE\uFF1A",serversHintNoPanel:"\u5F53\u524D\u65E0\u6CD5\u7BA1\u7406\u6761\u76EE\uFF1A\u9762\u677F\u6CA1\u6709\u8FD0\u884C\u3002",serversEmpty:"\u9762\u677F\u672A\u62A5\u544A\u4EFB\u4F55\u670D\u52A1\u5668\u3002",serversStopped:"\u88AB\u9762\u677F\u505C\u6B62",serversStoppedByPanel:"\u8BE5\u6761\u76EE\u59CB\u7EC8\u672A\u901A\u8FC7\u5065\u5EB7\u68C0\u67E5\uFF0C\u9762\u677F\u5DF2\u653E\u5F03\u5B83\u3002\u91CD\u65B0\u542F\u52A8\u5373\u53EF\u6E05\u9664\u6B64\u6807\u8BB0\u3002",serversPid:"PID",serversUrl:"URL",serversCommand:"\u547D\u4EE4",serversArgs:"\u53C2\u6570",serversCwd:"\u5DE5\u4F5C\u76EE\u5F55",serversPort:"\u7AEF\u53E3",serversOnPortConflict:"\u7AEF\u53E3\u51B2\u7A81\u65F6",serversAutostart:"\u81EA\u542F",serversPersistent:"\u6301\u4E45\u5316",serversPersistentHint:"\u7531 home-hosted \u81EA\u5E26\u7684 nanny \u6258\u7BA1\uFF0C\u505C\u6B62\u6216\u91CD\u542F\u9762\u677F\u4E0D\u4F1A\u505C\u6B62\u5B83\u3002",serversHealth:"\u5065\u5EB7\u68C0\u67E5",serversRestartPolicy:"\u91CD\u542F",serversConfiguration:"\u914D\u7F6E",serversRawConfig:"\u539F\u59CB\u914D\u7F6E",serversDisabled:"\u5DF2\u505C\u7528",serversEnabled:"\u5DF2\u542F\u7528",serversHealthHttp:"HTTP {status} \u4E8E {path}",serversHealthHttpBelow:"HTTP <{status} \u4E8E {path}",serversHealthHttpProbe:"HTTP \u63A2\u6D4B {path}",serversHealthPort:"\u7AEF\u53E3 {port}",serversHealthProbe:"\u7AEF\u53E3\u63A2\u6D4B",serversHealthEvery:"\u6BCF {seconds}",serversRestartSummary:"{retries} \u6B21\u91CD\u8BD5 \xB7 {base} \u2192 \xD7{factor}",serversStart:"\u542F\u52A8",serversStop:"\u505C\u6B62",serversRestart:"\u91CD\u542F",serversWorkspace:"\u5DE5\u4F5C\u533A",serversAdd:"\u6DFB\u52A0\u670D\u52A1\u5668",serversEdit:"\u7F16\u8F91",serversEditTitle:"\u7F16\u8F91 {id}",serversCreateTitle:"\u6DFB\u52A0\u670D\u52A1\u5668",serversEditorHint:"\u53EA\u5199\u5165\u4F60\u6539\u52A8\u7684\u5B57\u6BB5\u3002\u8FD9\u91CC\u53EA\u5217\u51FA\u5E38\u7528\u5B57\u6BB5\u2014\u2014\u4E0A\u65B9\u9762\u677F\u94FE\u63A5\u53EF\u7F16\u8F91\u5168\u90E8\u5B57\u6BB5\uFF0C\u5305\u62EC\u5F15\u5BFC\u547D\u4EE4\u3001\u73AF\u5883\u53D8\u91CF\u6587\u4EF6\u3001\u8D44\u6E90\u9650\u5236\u4E0E\u91CD\u542F\u7B56\u7565\u3002",serversCreate:"\u521B\u5EFA",serversSave:"\u4FDD\u5B58",serversDelete:"\u5220\u9664",serversDeleteTitle:"\u5220\u9664 {id}\uFF1F",serversDeleteBody:"\u8FD9\u4F1A\u4ECE\u5DE5\u4F5C\u533A {workspace} \u4E2D\u79FB\u9664\u8BE5\u6761\u76EE\uFF0C\u8FD0\u884C\u4E2D\u7684\u670D\u52A1\u5668\u4E5F\u4F1A\u968F\u4E4B\u505C\u6B62\u3002",serversDeleteGo:"\u5220\u9664",serversFreePort:"\u91CA\u653E\u7AEF\u53E3",serversFreePortTitle:"\u91CA\u653E\u7AEF\u53E3 {port}\uFF1F",serversFreePortBody:"\u505C\u6B62\u5360\u7528\u8BE5\u7AEF\u53E3\u7684\u8FDB\u7A0B\uFF0C\u9664\u975E\u5B83\u7531\u9762\u677F\u76D1\u7BA1\u3002\u8FDB\u7A0B\u5148\u6536\u5230 SIGTERM\uFF0C\u4E4B\u540E\u4F1A\u88AB\u5F3A\u5236\u505C\u6B62\u3002",serversFreePortGo:"\u91CA\u653E",serversPortFreed:"\u7AEF\u53E3 {port} \u5DF2\u91CA\u653E\u3002",serversPortHeld:"\u7AEF\u53E3 {port} \u4ECD\u88AB\u5360\u7528\u3002",serversPortSkipped:"\u8BE5\u76D1\u542C\u8005\u5C5E\u4E8E\u9762\u677F\u76D1\u7BA1\u7684\u670D\u52A1\u5668\uFF0C\u56E0\u6B64\u672A\u88AB\u52A8\u5B83\u3002",serversPortRefused:"\u7AEF\u53E3\u672A\u80FD\u91CA\u653E\uFF1A{message}",fieldId:"Id",fieldIdHint:"\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u3001`_` \u548C `-`\uFF1B\u5728\u5DE5\u4F5C\u533A\u5185\u552F\u4E00\u3002",fieldIdInvalid:"id \u4EE5\u5C0F\u5199\u5B57\u6BCD\u6216\u6570\u5B57\u5F00\u5934\uFF0C\u53EA\u80FD\u5305\u542B a-z\u30010-9\u3001_ \u548C -\u3002",fieldLabel:"\u6807\u7B7E",fieldCommand:"\u547D\u4EE4",fieldArgs:"\u53C2\u6570",fieldArgsHint:"\u6BCF\u884C\u4E00\u4E2A\u53C2\u6570\u3002",fieldCwd:"\u5DE5\u4F5C\u76EE\u5F55",fieldPort:"\u7AEF\u53E3",fieldPortHint:"\u7559\u7A7A\u8868\u793A\u8BE5\u6761\u76EE\u6CA1\u6709\u7AEF\u53E3\u3002",fieldPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\uFF0C\u6216\u7559\u7A7A\u3002",fieldAutostart:"\u968F\u9762\u677F\u542F\u52A8",fieldOnPortConflict:"\u7AEF\u53E3\u51B2\u7A81\u65F6",fieldInherit:"\u7EE7\u627F",fieldRequired:"Id \u548C\u547D\u4EE4\u4E3A\u5FC5\u586B\u3002"};function dn(e,t){return t===void 0?e:e.replace(/\{(\w+)\}/g,(n,r)=>Object.prototype.hasOwnProperty.call(t,r)?String(t[r]):n)}var ot=(e,t)=>dn(_e[e]??e,t);function rt(e){if(e!==void 0)try{let t=e.bind(Ae);if(typeof t=="function")return t}catch{}return ot}function at(e,t=ot){return e===void 0?t:(n,r)=>{let o;try{o=e(n,r)}catch{o=void 0}return o===void 0||o.length===0||o===n?t(n,r):o}}var V=require("react");var ce=require("react");var st="/home-hosted";var it="default";function ne(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}var lt=["block","warn","follow","reclaim","kill"];var ge=["status","workspaces_list","servers_list","servers_lifecycle","servers_edit","autostart_manage","ui_manage","panel_logs"],dt=["servers_lifecycle","servers_edit","autostart_manage","ui_manage"],cn=3,eo={version:cn,autostart:{enabled:!1,mechanism:"auto"},manageDsh:!1,entries:[],agentTools:{enabled:!0,allow:[...ge]},panel:{port:null},authNotice:!0,reclaimToken:!0,instancesNotice:!0,uiStyle:"detailed",cli:{prefer:"pinned"}};var pn="/api";function oe(e,t,n){return{ok:!1,error:n===void 0?{code:e,message:t}:{code:e,message:t,detail:n}}}function hn(e){return e instanceof Error?e.message:String(e)}function un(e){if(!ne(e))return oe("bad-response","The panel returned a non-object response");if(typeof e.v=="number"&&e.v!==1)return oe("version-mismatch",`Response protocol v${e.v} does not match the expected v${1}`);let t=e.result;if(!ne(t))return oe("bad-response","The panel returned no result");if(t.ok===!0)return"value"in t?{ok:!0,value:t.value}:oe("bad-response","A successful response carried no value");if(t.ok===!1){let n=t.error;return ne(n)&&typeof n.message=="string"?oe(typeof n.code=="string"?n.code:"error",n.message,n.detail):oe("error","The panel reported a failure without a message")}return oe("bad-response","The panel returned an unrecognised result")}async function T(e,t,n={}){let r=n.fetch??globalThis.fetch;if(typeof r!="function")return oe("no-fetch","No fetch implementation is available");let o={v:1,endpoint:e,payload:t},a;try{a=await r(`${pn}${st}`,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(o)})}catch(i){return oe("network",hn(i))}if(!a.ok){let i=a.statusText.length>0?` ${a.statusText}`:"";return oe("http",`HTTP ${a.status}${i}`)}let s;try{s=await a.json()}catch{return oe("bad-json","The panel returned invalid JSON")}return un(s)}function ct(e,t={}){return T("settings.update",{patch:e},t)}var gn=5e3;function pt(e=gn){let[t,n]=(0,ce.useState)(null),[r,o]=(0,ce.useState)(null),[a,s]=(0,ce.useState)(!0),i=(0,ce.useRef)(!0),p=(0,ce.useCallback)(async()=>{let c=await T("status",{});i.current&&(c.ok?(n(c.value),o(null)):o(c.error),s(!1))},[]);return(0,ce.useEffect)(()=>{i.current=!0,p();let c=setInterval(()=>{p()},e);return()=>{i.current=!1,clearInterval(c)}},[p,e]),{data:t,error:r,loading:a,refresh:p}}var K="\u2014";function I(e){if(e==null)return K;let t=String(e);return t.length>0?t:K}function ht(e){return e.length>0?e.map(mn).join(", "):K}function mn(e){let t=e.replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").trim().toLowerCase();return t.length===0?e:t.charAt(0).toUpperCase()+t.slice(1)}function Ve(e){return dt.includes(e)}var We={status:"agentToolStatus",workspaces_list:"agentToolWorkspacesList",servers_list:"agentToolServersList",servers_lifecycle:"agentToolServersLifecycle",servers_edit:"agentToolServersEdit",autostart_manage:"agentToolAutostartManage",ui_manage:"agentToolUiManage",panel_logs:"agentToolPanelLogs"},ut={status:"agentToolDescStatus",workspaces_list:"agentToolDescWorkspacesList",servers_list:"agentToolDescServersList",servers_lifecycle:"agentToolDescServersLifecycle",servers_edit:"agentToolDescServersEdit",autostart_manage:"agentToolDescAutostartManage",ui_manage:"agentToolDescUiManage",panel_logs:"agentToolDescPanelLogs"},gt={api:"writeViaApi",file:"writeViaFile",none:"writeViaNone"},mt={enrolled:"tokenEnrolled",present:"tokenPresent",absent:"tokenAbsent",stale:"tokenStale",unknown:"tokenUnknown"},Ie={"not-installed":"bootStateNotInstalled","installed-disabled":"bootStateInstalledDisabled","enabled-running":"bootStateEnabledRunning","enabled-failing":"bootStateEnabledFailing",unsupported:"bootStateUnsupported"},ft={config:"panelCliConfig",dependency:"panelCliDependency",path:"panelCliPathSource",none:"panelCliMissing"};function He(e,t=52){if(e.length<=t)return e;let n=e.includes("\\")?"\\":"/",r=e.split(/[\\/]/).filter(i=>i.length>0);if(r.length<4)return e;let o=/^[A-Za-z]:$/.test(r[0]??"")?3:2;if(r.length<=o)return e;let s=`${/^[\\/]/.test(e)?n:""}${r.slice(0,o).join(n)}${n}\u2026${n}${r.slice(-2).join(n)}`;return s.length<e.length?s:e}function vt(e){let t=n=>e.source===n&&e.path!==null?{source:n,path:e.path,version:e.version}:null;return{dependency:e.dependency??t("dependency"),global:e.global??t("path")}}function fn(e,t){if(Object.is(e,t))return!0;try{return JSON.stringify(e)===JSON.stringify(t)}catch{return!1}}function bt(e,t){let n={};for(let r of Object.keys(t)){let o=e[r],a=t[r];if(ne(o)&&ne(a)){let s=bt(o,a);Object.keys(s).length>0&&(n[r]=s)}else fn(o,a)||(n[r]=a)}return n}function yt(e,t){return bt(e,t)}function wt(e,t,n){let r=new Set(e);return n?r.add(t):r.delete(t),ge.filter(o=>r.has(o))}var xt=require("react");async function St(e){try{if(typeof navigator<"u"&&navigator.clipboard!==void 0)return await navigator.clipboard.writeText(e),!0}catch{}return!1}var h=require("react/jsx-runtime");function vn(...e){return e.filter(t=>typeof t=="string"&&t.length>0).join(" ")}function Y({icon:e,title:t,action:n,children:r}){return(0,h.jsxs)("section",{className:"hh-section",children:[(0,h.jsxs)("header",{className:"hh-section-head",children:[e===void 0?null:(0,h.jsx)("span",{className:"hh-section-icon",children:e}),(0,h.jsx)("h3",{className:"hh-section-title",children:t}),(0,h.jsx)("span",{className:"hh-section-rule","aria-hidden":"true"}),n===void 0?null:(0,h.jsx)("span",{className:"hh-section-action",children:n})]}),(0,h.jsx)("div",{className:"hh-section-body",children:r})]})}function C({label:e,children:t}){return(0,h.jsxs)("div",{className:"hh-spec",children:[(0,h.jsx)("span",{className:"hh-spec-label",children:e}),(0,h.jsx)("span",{className:"hh-spec-value",children:t})]})}function re({children:e}){return(0,h.jsx)("code",{className:"hh-code",children:e})}function m({children:e}){return typeof e=="string"&&e.length===0?null:(0,h.jsx)("p",{className:"hh-hint",children:e})}function U({tone:e,children:t}){return(0,h.jsx)("span",{className:"hh-chip","data-tone":e??"idle",children:t})}function he({href:e,children:t}){return(0,h.jsxs)("a",{className:"hh-link",href:e,target:"_blank",rel:"noreferrer noopener",children:[t??e,(0,h.jsx)("span",{className:"hh-link-icon","aria-hidden":"true",children:(0,h.jsx)(et,{size:11})})]})}function pe({label:e,open:t=!1,children:n}){return(0,h.jsxs)("details",{className:"hh-details",open:t||void 0,children:[(0,h.jsxs)("summary",{className:"hh-summary",children:[(0,h.jsx)("span",{className:"hh-chevron","aria-hidden":"true",children:(0,h.jsx)(Qe,{size:12})}),e]}),(0,h.jsx)("div",{className:"hh-details-body",children:n})]})}function O({tone:e="bad",icon:t=!0,title:n,children:r}){return(0,h.jsxs)("div",{className:"hh-note","data-tone":e,role:e==="bad"?"alert":"note",children:[t?(0,h.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,h.jsx)(Re,{size:13})}):null,(0,h.jsxs)("div",{className:"hh-note-body",children:[n===void 0?null:(0,h.jsx)("span",{className:"hh-note-title",children:n}),typeof r=="string"?(0,h.jsx)("p",{children:r}):r]})]})}function Le({title:e,detail:t}){return(0,h.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,h.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,h.jsx)(Re,{size:13})}),(0,h.jsxs)("div",{className:"hh-note-body",children:[(0,h.jsx)("strong",{children:e}),t.length>0?(0,h.jsx)("p",{children:t}):null]})]})}function Pe({error:e,title:t}){return e===null?null:(0,h.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,h.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,h.jsx)(Re,{size:13})}),(0,h.jsxs)("div",{className:"hh-note-body",children:[(0,h.jsx)("strong",{children:t}),(0,h.jsxs)("p",{children:[(0,h.jsx)("code",{children:e.code})," \u2014 ",e.message]})]})]})}function bn(){return(0,h.jsx)("span",{className:"hh-spinner","aria-hidden":"true"})}function y({children:e,onClick:t,disabled:n,busy:r,variant:o="default",icon:a,title:s}){let i=n===!0||r===!0;return(0,h.jsxs)("button",{type:"button",className:vn("hh-btn",o!=="default"&&`hh-btn-${o}`),onClick:t,disabled:i,title:s,children:[r===!0?(0,h.jsx)(bn,{}):a,e]})}function we({label:e,checked:t,disabled:n,onChange:r}){return(0,h.jsxs)("button",{type:"button",role:"switch",className:"hh-switch","aria-checked":t,disabled:n,onClick:()=>r(!t),children:[(0,h.jsx)("span",{className:"hh-switch-track","aria-hidden":"true",children:(0,h.jsx)("span",{className:"hh-switch-knob"})}),(0,h.jsx)("span",{className:"hh-check-label",children:e})]})}function kt({label:e,checked:t,disabled:n,onChange:r}){return(0,h.jsxs)("label",{className:"hh-check",children:[(0,h.jsx)("input",{type:"checkbox",checked:t,disabled:n,onChange:o=>r(o.target.checked)}),(0,h.jsx)("span",{className:"hh-check-label",children:e})]})}function be({value:e,options:t,disabled:n,label:r,onChange:o}){return(0,h.jsx)("select",{className:"hh-select",value:e,disabled:n,"aria-label":r,onChange:a=>o(a.target.value),children:t.map(a=>(0,h.jsx)("option",{value:a.value,children:a.label},a.value))})}function Te({label:e,meta:t,path:n,hint:r,checked:o,disabled:a,onChange:s}){return(0,h.jsxs)("label",{className:"hh-choice-option","data-disabled":a===!0,children:[(0,h.jsx)("input",{type:"radio",checked:o,disabled:a,onChange:()=>s()}),(0,h.jsxs)("span",{className:"hh-choice-label",children:[(0,h.jsx)("span",{children:e}),r]}),t===void 0?null:(0,h.jsx)("span",{className:"hh-choice-meta",children:t}),n===void 0?null:(0,h.jsx)("span",{className:"hh-choice-path",title:n,children:He(n)})]})}function Fe({children:e}){return(0,h.jsxs)(U,{tone:"accent",children:[(0,h.jsx)(tt,{size:10}),e]})}function ye({text:e,copyLabel:t,copiedLabel:n}){let[r,o]=(0,xt.useState)(!1);return(0,h.jsxs)("div",{className:"hh-code-box",children:[(0,h.jsx)("textarea",{className:"hh-code-text",readOnly:!0,value:e,rows:Math.min(e.split(`
`).length,4)}),(0,h.jsx)("div",{className:"hh-btn-row",children:(0,h.jsx)(y,{variant:"ghost",onClick:()=>{St(e).then(o)},children:r?n:t})})]})}var P=require("react/jsx-runtime");function Pt({t:e,status:t,updateSettings:n,busy:r,uiStyle:o}){let a=t.settings.agentTools,s=a.allow??[],i=ge.filter(c=>s.includes(c)).length,p=(c,g)=>{n(v=>({...v,agentTools:{...v.agentTools,allow:wt(v.agentTools.allow??[],c,g)}}))};return(0,P.jsxs)(Y,{icon:(0,P.jsx)(Ze,{}),title:e("agentTitle"),action:(0,P.jsx)(U,{children:e("agentCount",{enabled:i,total:ge.length})}),children:[(0,P.jsx)(we,{label:e("agentMaster"),checked:a.enabled,disabled:r==="settings",onChange:c=>n(g=>({...g,agentTools:{...g.agentTools,enabled:c}}))}),(0,P.jsxs)("div",{className:"hh-field-block",children:[(0,P.jsx)(we,{label:e("reclaimAutoLabel"),checked:t.settings.reclaimToken!==!1,disabled:r==="settings",onChange:c=>n(g=>({...g,reclaimToken:c}))}),(0,P.jsx)(m,{children:e("reclaimAutoHint")})]}),(0,P.jsxs)("div",{className:"hh-field-block",children:[(0,P.jsx)(we,{label:e("instancesNoticeLabel"),checked:t.settings.instancesNotice!==!1,disabled:r==="settings",onChange:c=>n(g=>({...g,instancesNotice:c}))}),(0,P.jsx)(m,{children:e("instancesNoticeHint")})]}),(0,P.jsx)(m,{children:e("agentApproval")}),o==="detailed"?(0,P.jsx)("div",{className:"hh-tool-cards",children:ge.map(c=>(0,P.jsxs)("label",{className:"hh-tool-card",children:[(0,P.jsx)("input",{type:"checkbox",checked:s.includes(c),disabled:!a.enabled,onChange:g=>p(c,g.target.checked)}),(0,P.jsxs)("span",{className:"hh-tool-card-body",children:[(0,P.jsxs)("span",{className:"hh-tool-card-head",children:[(0,P.jsx)("span",{className:"hh-tool-card-name",children:e(We[c])}),Ve(c)?(0,P.jsx)(U,{tone:"warn",children:e("agentApprovalBadge")}):null]}),(0,P.jsx)("span",{className:"hh-tool-card-desc",children:e(ut[c])})]})]},c))}):(0,P.jsx)("div",{className:"hh-tools",children:ge.map(c=>(0,P.jsx)(kt,{label:(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)("span",{className:"hh-check-text",children:e(We[c])}),Ve(c)?(0,P.jsx)(U,{tone:"warn",children:e("agentApprovalBadge")}):null]}),checked:s.includes(c),disabled:!a.enabled,onChange:g=>p(c,g)},c))})]})}var It=require("react");function Tt(e){return Array.isArray(e)?e.filter(t=>typeof t=="string"):[]}function Ct(e){if(typeof e!="object"||e===null)return null;let t=e.result;if(typeof t!="object"||t===null)return null;let{ok:n,detail:r,commands:o}=t;return n!==!1?null:{detail:typeof r=="string"?r:"",commands:Tt(o)}}function Nt(e){return typeof e!="object"||e===null||Array.isArray(e)?null:{ok:e.ok===!0,action:e.action==="uninstall"?"uninstall":"install",detail:typeof e.detail=="string"?e.detail:"",commands:Tt(e.commands),mechanism:e.mechanism??null}}var yn=["enabled-running","enabled-failing","installed-disabled"];function Et(e,t){let n=e.filter(a=>a.available).map(a=>a.mechanism),r=n.filter(a=>a!=="unsupported"),o=["auto",...r.length>0?r:n];return o.includes(t)||o.push(t),o}function Rt(e,t){return e!==null&&e!==t}function wn(e,t){return e===null||e.ok?!1:e.action==="install"?yn.includes(t):t==="not-installed"}function At(e,t,n,r){return e!==null&&e.state===n&&e.mechanism===r?e:t!==null&&t.mechanism!==r||wn(t,n)?null:t}var w=require("react/jsx-runtime");function Ht({t:e,status:t,run:n,updateSettings:r,busy:o,uiStyle:a}){let s=t.boot,i=t.settings.autostart,p=s.candidates??[],c=s.commands??[],[g,v]=(0,It.useState)(null),$=o==="boot.install"||o==="boot.uninstall",Z=Et(p,i.mechanism).map(A=>({value:A,label:A==="auto"?e("bootMechanismAuto"):A})),M=Rt(s.mechanism,i.mechanism),X=A=>p.find(k=>k.mechanism===A)?.reason??null,W=typeof s.recommended=="string"&&s.recommended.length>0&&s.recommended!==s.mechanism?s.recommended:null,S=W===null?e("bootMechanismAutoHint"):`${e("bootMechanismAutoHint")} ${e("bootMechanismAutoPicks",{mechanism:W})}`,L=i.mechanism==="auto"?S:X(i.mechanism),G=s.mechanism===null?null:X(s.mechanism),j=s.mechanism!==null,se=t.panel.reachable&&!M&&!j,Q=t.panel.reachable&&M,ie=A=>e(A==="install"?"bootActionInstall":"bootActionUninstall"),le=async A=>{let k=await n(`boot.${A}`,async()=>A==="install"?T("boot.install",i.mechanism==="auto"?{}:{mechanism:i.mechanism}):T("boot.uninstall",{}));if(!k.ok){v(null);return}let B=Ct(k.value);v(B===null?null:{ok:!1,action:A,detail:B.detail,commands:B.commands,state:s.state,mechanism:s.mechanism})},ue=Nt(i.lastAttempt),R=At(g,ue,s.state,s.mechanism);return(0,w.jsxs)(Y,{icon:(0,w.jsx)(qe,{}),title:e("bootTitle"),action:(0,w.jsx)(be,{value:i.mechanism,options:Z,label:e("bootMechanism"),disabled:o==="settings"||$,onChange:A=>r(k=>({...k,autostart:{...k.autostart,mechanism:A}}))}),children:[L!==null&&L.length>0?(0,w.jsx)(m,{children:L}):null,se?(0,w.jsx)(m,{children:e("bootHandover")}):null,Q?(0,w.jsx)(O,{tone:"warn",children:e("bootSwitchRetires")}):null,(0,w.jsxs)("div",{className:"hh-btn-row",children:[(0,w.jsx)(y,{variant:j?"default":"primary",disabled:i.mechanism==="unsupported",busy:o==="boot.install",onClick:()=>{le("install")},children:e(M?"bootSwitchMode":"bootEnabled")}),(0,w.jsx)(y,{disabled:!j,busy:o==="boot.uninstall",onClick:()=>{le("uninstall")},children:e("bootUninstall")}),(0,w.jsx)(y,{variant:"ghost",busy:o==="boot.verify",onClick:()=>{n("boot.verify",()=>T("boot.verify",{}))},children:e("bootRecheck")})]}),i.enabled&&s.state==="not-installed"?(0,w.jsx)(O,{tone:"warn",children:e("bootRequestedNotInstalled")}):null,R!==null&&!R.ok?(0,w.jsxs)("div",{className:"hh-section-body",children:[(0,w.jsx)(Le,{title:e("bootAttemptFailed",{action:ie(R.action)}),detail:R.detail.length>0?R.detail:e("bootAttemptNoDetail")}),R.commands.length>0?(0,w.jsxs)(w.Fragment,{children:[(0,w.jsx)(m,{children:e("bootAttemptCommands")}),(0,w.jsx)(ye,{text:R.commands.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null]}):null,R!==null&&R.ok?(0,w.jsx)(m,{children:e("bootAttemptSucceeded",{action:ie(R.action),detail:R.detail})}):null,c.length>0?(0,w.jsxs)(pe,{label:e("bootCommandsLabel"),open:a==="detailed",children:[(0,w.jsx)(m,{children:e("bootCommandsExplain")}),(0,w.jsx)(ye,{text:c.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null,(0,w.jsxs)(pe,{label:e("details"),open:a==="detailed",children:[(0,w.jsx)(C,{label:e("bootState"),children:e(Ie[s.state]??"bootStateUnsupported")}),(0,w.jsx)(C,{label:e("bootBootCapable"),children:s.bootCapable?e("yes"):e("no")}),(0,w.jsx)(C,{label:e("bootPrivileged"),children:s.privileged?e("yes"):e("no")}),(0,w.jsx)(C,{label:e("bootUnitPath"),children:(0,w.jsx)(re,{children:I(s.unitPath)})}),(0,w.jsx)(C,{label:e("bootMechanism"),children:I(s.mechanism)}),G===null?null:(0,w.jsx)(m,{children:G}),s.detail.length>0?(0,w.jsx)(m,{children:s.detail}):null]})]})}var D=require("react/jsx-runtime");function Sn(e){return e.defaultEntryId??"dsh"}function Lt({t:e,status:t,run:n,busy:r}){let o=t.entries??[],a=t.settings.manageDsh===!0,s=t.boot.platform==="win32",i=t.surface==="desktop",p=Sn(t),c=g=>{if(g){let v={id:p,autostart:!0};n("entries.apply",()=>T("entries.apply",{intents:[v]}))}else n("entries.remove",()=>T("entries.remove",{id:p}))};return(0,D.jsxs)(Y,{icon:(0,D.jsx)(Je,{}),title:e("entriesTitle"),children:[(0,D.jsx)(we,{label:e("entriesManage",{id:p}),checked:i?!1:a,disabled:r!==null||i,onChange:c}),i?(0,D.jsx)(O,{tone:"warn",children:e("entriesManageDesktop",{id:p})}):(0,D.jsx)(m,{children:e("entriesManageNote",{id:p})}),s&&!i?(0,D.jsx)(O,{tone:"warn",children:e("entriesManageWinWarning",{id:p})}):null,o.length===0?(0,D.jsx)(m,{children:e("entriesEmpty",{id:p})}):(0,D.jsx)("div",{className:"hh-list",children:o.map(g=>{let v=g.live;return(0,D.jsxs)("div",{className:"hh-item",children:[(0,D.jsxs)("span",{className:"hh-item-main",children:[(0,D.jsx)("span",{className:"hh-item-name",children:g.intent.id}),(0,D.jsx)(U,{tone:g.exists?"ok":"bad",children:g.exists?e("entriesExists"):e("entriesMissing")}),(0,D.jsx)(U,{children:g.managed?e("entriesManaged"):e("entriesUnmanaged")}),g.drift.length>0?(0,D.jsx)(U,{tone:"warn",children:`${e("entriesDrift")} ${ht(g.drift)}`}):null]}),(0,D.jsx)("span",{className:"hh-item-spacer"}),(0,D.jsx)("span",{className:"hh-item-meta",children:v===null?e("entriesNotRunning"):`${I(v.status)}${v.pid===null?"":` \xB7 pid ${v.pid}`}`})]},g.intent.id)})})]})}var ae=require("react");var l=require("react/jsx-runtime"),xn={absent:"panelTokenWarnAbsent",present:"panelTokenWarnPresent",stale:"panelTokenWarnStale"};function kn(e){if(e.token!=="enrolled")return e.token!=="unknown"?xn[e.token]:e.url===null?void 0:"panelTokenWarnUnreachable"}function Pn(e,t){if(!e.ok)return t("panelTokenRegenerateFailed",{message:e.error.message});let n=e.value?.panel;return n!==void 0&&n.detail.length>0?n.detail:t("panelTokenRegenerated")}var Tn=new Set(["network","no-fetch","client"]);function Cn(e,t){return e.ok?e.value?.detail||t("panelStopped"):Tn.has(e.error.code)?t("panelStopping"):t("panelStopFailed",{message:e.error.message})}function Ft(e,t,n){let r=n==="start"?"panelStartFailed":"panelReplaceFailed";if(!e.ok)return t(r,{message:e.error.message});let o=e.value;return o?.ok===!1?t(r,{message:o.detail??""}):o?.detail&&o.detail.length>0?o.detail:null}function Nn({value:e,label:t,hint:n,invalidLabel:r,placeholder:o,disabled:a,onChange:s}){let[i,p]=(0,ae.useState)(e===null?"":String(e));(0,ae.useEffect)(()=>{p(e===null?"":String(e))},[e]);let c=i.trim()===""?null:Number(i),g=c!==null&&(!Number.isInteger(c)||c<1||c>65535),v=()=>{if(g){p(e===null?"":String(e));return}c!==e&&s(c)};return(0,l.jsxs)("div",{className:"hh-field-block",children:[(0,l.jsxs)("div",{className:"hh-field",children:[(0,l.jsx)("label",{className:"hh-field-label",htmlFor:"hh-panel-port",children:t}),(0,l.jsx)("input",{id:"hh-panel-port",className:"hh-input",type:"number",value:i,placeholder:o,disabled:a,onChange:$=>p($.target.value),onBlur:v,onKeyDown:$=>{$.key==="Enter"&&v()}})]}),(0,l.jsx)(m,{children:g?r:n})]})}function Mt({t:e,status:t,run:n,updateSettings:r,busy:o,uiStyle:a}){let s=t.panel,i=t.cli,p=t.instances??[],c=i?.prefer??t.settings.cli?.prefer??"pinned",[g,v]=(0,ae.useState)(!1),[$,F]=(0,ae.useState)(null),[Z,M]=(0,ae.useState)(null),[X,W]=(0,ae.useState)(!1),[S,L]=(0,ae.useState)(null),[G,j]=(0,ae.useState)(null),[se,Q]=(0,ae.useState)(null),ie=kn(s),le=i?.version??null,ue=le!==null&&s.version!==null,R=s.reachable&&ue&&le!==s.version,{dependency:A,global:k}=i===void 0?{dependency:null,global:null}:vt(i),B=i===void 0?[]:[`pnpm add -g home-hosted@${i.expectedRange}`,`npm install -g home-hosted@${i.expectedRange}`],_=N=>{r(H=>({...H,cli:{...H.cli,prefer:N}}))},u=async()=>{let N=await n("cli.installGlobal",()=>T("cli.installGlobal",{}));if(!N.ok){F(e("panelInstallFailed",{message:N.error.message}));return}let H=N.value;H?.ok===!1?F(H.output&&H.output.length>0?H.output:e("panelInstallFailed",{message:H.detail??""})):F(typeof H?.output=="string"?H.output:null)},ee=async()=>{M(Pn(await n("panel.reclaimToken",()=>T("panel.reclaimToken",{})),e))},E=async()=>{let N=await n("panel.resetPassword",()=>T("panel.resetPassword",{}));if(!N.ok){Q(null),j(N.error.message);return}let H=N.value;Q(typeof H?.password=="string"?H.password:null),j(null)},de=async()=>{j(Ft(await n("panel.start",()=>T("panel.start",{})),e,"start"))},ke=async()=>{v(!1),j(Ft(await n("panel.takeover",()=>T("panel.takeover",{})),e,"replace"))},Ce=async()=>{W(!1),L(e("panelStopping")),L(Cn(await n("panel.stop",()=>T("panel.stop",{})),e))};return(0,l.jsxs)(Y,{icon:(0,l.jsx)(Ye,{}),title:e("panelTitle"),children:[ie===void 0?null:(0,l.jsxs)(O,{tone:"warn",title:e("panelTokenWarningTitle"),children:[(0,l.jsx)("p",{children:e(ie)}),s.reachable||s.token==="unknown"?null:(0,l.jsx)("p",{children:e("panelTokenWarnPanelDown")}),(0,l.jsx)("div",{className:"hh-note-actions",children:(0,l.jsx)(y,{variant:"primary",busy:o==="panel.reclaimToken",onClick:()=>{ee()},children:e("panelTokenRegenerate")})})]}),Z===null?null:(0,l.jsx)(m,{children:Z}),se===null?null:(0,l.jsxs)(O,{tone:"warn",title:e("panelPasswordResetTitle"),children:[(0,l.jsx)("p",{children:e("panelPasswordResetBody")}),(0,l.jsx)(ye,{text:se,copyLabel:e("copy"),copiedLabel:e("copied")}),(0,l.jsx)("p",{children:e("panelPasswordResetOnce")})]}),s.firstRunPassword===void 0?null:(0,l.jsx)(O,{tone:"warn",title:e("panelFirstRunPasswordTitle"),children:s.firstRunPassword.state==="recorded"?(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)("p",{children:e("panelFirstRunPasswordBody")}),(0,l.jsx)(ye,{text:s.firstRunPassword.password,copyLabel:e("copy"),copiedLabel:e("copied")}),(0,l.jsx)("p",{children:e("panelFirstRunPasswordChange")})]}):(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)("p",{children:e("panelFirstRunPasswordLost")}),(0,l.jsx)("div",{className:"hh-note-actions",children:(0,l.jsx)(y,{variant:"primary",busy:o==="panel.resetPassword",onClick:()=>{E()},children:e("panelPasswordReset")})})]})}),i===void 0?null:(0,l.jsxs)(l.Fragment,{children:[(0,l.jsxs)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("panelCopy"),children:[(0,l.jsx)(Te,{label:e("optionsPreferPinned"),hint:(0,l.jsx)(Fe,{children:e("optionsRecommended")}),meta:A===null?void 0:I(A.version),path:A?.path??void 0,checked:c==="pinned",disabled:A===null||o==="settings",onChange:()=>_("pinned")}),(0,l.jsx)(Te,{label:e("optionsPreferGlobal"),meta:k===null?void 0:I(k.version),path:k?.path??void 0,checked:c==="global",disabled:k===null||o==="settings",onChange:()=>_("global")})]}),(0,l.jsx)(m,{children:e("panelCopyHint")}),i.source==="config"?(0,l.jsx)(m,{children:e("optionsConfigOverride")}):null,i.source==="path"&&c!=="global"?(0,l.jsx)(m,{children:e("panelCliNotPinned",{range:i.expectedRange})}):null,i.supported?null:(0,l.jsx)(O,{tone:"warn",children:e("panelCliUnsupported")}),i.launcherPath!=null&&i.launcherVersion==null?(0,l.jsx)(O,{tone:"warn",children:e("panelCliLauncherFailed")}):null]}),(0,l.jsx)(Nn,{value:t.settings.panel?.port??null,label:e("panelPort"),hint:s.reachable?e("panelPortHint"):e("panelPortFree"),invalidLabel:e("panelPortInvalid"),placeholder:s.configPort==null?void 0:String(s.configPort),disabled:s.reachable||o!==null,onChange:N=>r(H=>({...H,panel:{...H.panel,port:N}}))}),t.panelRootSource!=="legacy"?null:(0,l.jsx)(m,{children:e("panelRootLegacy")}),p.length<=1?null:(0,l.jsxs)(pe,{label:e("panelInstances",{count:p.length}),open:a==="detailed",children:[p.map(N=>(0,l.jsxs)(C,{label:N.managed?e("panelInstanceManaged"):e("panelInstanceOther"),children:[(0,l.jsx)(re,{children:N.home}),N.url===null?null:(0,l.jsxs)(l.Fragment,{children:[" \xB7 ",(0,l.jsx)(he,{href:N.url,children:N.url})]}),` \xB7 ${N.running?e("stateAnswering"):e("stateNotAnswering")}`,N.version===null?null:` \xB7 ${N.version}`,N.hosting?` \xB7 ${e("panelInstanceHosts")}`:null]},N.home)),(0,l.jsx)(m,{children:e("panelInstancesHint")})]}),R?(0,l.jsx)(m,{children:e("panelOutdated")}):null,(0,l.jsxs)("div",{className:"hh-btn-row",children:[s.reachable?null:(0,l.jsx)(y,{variant:"primary",busy:o==="panel.start",onClick:()=>{de()},children:e("panelStart")}),s.reachable?(0,l.jsx)(y,{variant:"danger",disabled:o!==null,onClick:()=>W(!0),children:e("panelStop")}):null,R&&!g?(0,l.jsx)(y,{variant:"primary",onClick:()=>v(!0),children:e("panelReplace",{copy:e(c==="global"?"panelCopyGlobal":"panelCopyPinned")})}):null]}),S===null?null:(0,l.jsx)(m,{children:S}),G===null?null:(0,l.jsx)(m,{children:G}),X?(0,l.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelStopTitle"),children:(0,l.jsxs)("div",{className:"hh-note-body",children:[(0,l.jsx)("strong",{children:e("panelStopTitle")}),(0,l.jsx)("p",{children:e("panelStopBody")}),(0,l.jsxs)("div",{className:"hh-note-actions",children:[(0,l.jsx)(y,{onClick:()=>W(!1),children:e("confirmCancel")}),(0,l.jsx)(y,{variant:"danger",busy:o==="panel.stop",onClick:()=>{Ce()},children:e("confirmStop")})]})]})}):null,R&&g?(0,l.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelTakeoverTitle"),children:(0,l.jsxs)("div",{className:"hh-note-body",children:[(0,l.jsx)("strong",{children:e("panelTakeoverTitle")}),(0,l.jsx)("p",{children:e("panelTakeoverBody",{id:t.defaultEntryId??"dsh"})}),(0,l.jsxs)("div",{className:"hh-note-actions",children:[(0,l.jsx)(y,{onClick:()=>v(!1),children:e("confirmCancel")}),(0,l.jsx)(y,{variant:"danger",busy:o==="panel.takeover",onClick:()=>{ke()},children:e("confirmReplace")})]})]})}):null,i!==void 0&&k===null?(0,l.jsxs)(pe,{label:e("optionsInstallLabel"),open:a==="detailed",children:[(0,l.jsx)(m,{children:e("optionsInstallHint")}),(0,l.jsx)(ye,{text:B.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")}),(0,l.jsx)("div",{className:"hh-btn-row",children:(0,l.jsx)(y,{busy:o==="cli.installGlobal",onClick:()=>{u()},children:e("optionsInstall")})}),$===null?null:(0,l.jsx)("pre",{className:"hh-output",children:$})]}):null,(0,l.jsxs)(pe,{label:e("details"),open:a==="detailed",children:[(0,l.jsxs)(C,{label:e("panelHome"),children:[(0,l.jsx)(re,{children:s.home}),t.bootUnitName===void 0?null:(0,l.jsxs)(l.Fragment,{children:[" \xB7 ",t.bootUnitName]})]}),(0,l.jsx)(C,{label:e("panelUrl"),children:s.url===null?I(s.url):(0,l.jsx)(he,{href:s.url,children:s.url})}),(0,l.jsx)(C,{label:e("panelVersion"),children:I(s.version)}),(0,l.jsx)(C,{label:e("panelPid"),children:I(s.pid)}),(0,l.jsx)(C,{label:e("panelWriteVia"),children:e(gt[s.writeVia]??"writeViaNone")}),(0,l.jsx)(C,{label:e("panelToken"),children:e(mt[s.token]??"tokenUnknown")}),i===void 0?null:(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(C,{label:e("panelCliSource"),children:`${e(ft[i.source]??"panelCliMissing")} \xB7 ${I(i.version)}`}),(0,l.jsx)(C,{label:e("panelCliPath"),children:(0,l.jsx)(re,{children:I(i.path)})}),i.detail.length>0?(0,l.jsx)(m,{children:i.detail}):null]}),s.detail.length>0?(0,l.jsx)(m,{children:s.detail}):null]})]})}var fe=require("react");var Bt=require("react");var x=require("react/jsx-runtime");function $e(e){return{id:e.id,label:e.label??"",command:e.command??"",args:(e.args??[]).join(`
`),cwd:e.cwd??"",port:e.port===null||e.port===void 0?"":String(e.port),autostart:e.autostart===void 0?"inherit":e.autostart?"on":"off",onPortConflict:e.onPortConflict??""}}function Ot(e){return e.split(`
`).map(t=>t.trim()).filter(t=>t.length>0)}function je(e){let t=e.trim();if(t.length===0)return null;let n=Number(t);return!Number.isInteger(n)||n<1||n>65535?"invalid":n}function Dt(e){return/^[a-z0-9][a-z0-9_-]*$/.test(e)}function En(e,t){return e.length===t.length&&e.every((n,r)=>n===t[r])}function _t(e){let t=e.id.trim(),n=e.command.trim();if(!Dt(t)||n.length===0)return null;let r={id:t,command:n},o=e.label.trim();o.length>0&&(r.label=o);let a=Ot(e.args);a.length>0&&(r.args=a);let s=e.cwd.trim();s.length>0&&(r.cwd=s);let i=je(e.port);return i!=="invalid"&&i!==null&&(r.port=i),e.autostart==="on"&&(r.autostart=!0),e.onPortConflict!==""&&(r.onPortConflict=e.onPortConflict),r}function Ut(e,t){let n={},r=t.label.trim();r!==(e.label??"")&&(n.label=r.length>0?r:null);let o=t.command.trim();o.length>0&&o!==(e.command??"")&&(n.command=o);let a=Ot(t.args);En(a,e.args??[])||(n.args=a);let s=t.cwd.trim();s.length>0&&s!==(e.cwd??"")&&(n.cwd=s);let i=je(t.port);if(i!=="invalid"&&i!==(e.port??null)&&(n.port=i),t.autostart!=="inherit"){let p=t.autostart==="on";e.autostart!==p&&(n.autostart=p)}return t.onPortConflict!==""&&t.onPortConflict!==e.onPortConflict&&(n.onPortConflict=t.onPortConflict),Object.keys(n).length>0?n:null}function me({label:e,hint:t,children:n}){return(0,x.jsxs)("div",{className:"hh-field-block",children:[(0,x.jsxs)("div",{className:"hh-field",children:[(0,x.jsx)("span",{className:"hh-field-label",children:e}),n]}),t===void 0?null:(0,x.jsx)(m,{children:t})]})}function ze({t:e,title:t,initial:n,submitLabel:r,busy:o,lockId:a,onSubmit:s,onCancel:i}){let[p,c]=(0,Bt.useState)(n),g=(S,L)=>c(G=>({...G,[S]:L})),v=p.id.trim(),$=!a&&v.length>0&&!Dt(v),F=je(p.port),Z=!a&&v.length===0,M=p.command.trim().length===0,X=o||Z||M||$||F==="invalid",W=e(Z||M?"fieldRequired":$?"fieldIdInvalid":"fieldPortInvalid");return(0,x.jsx)("div",{className:"hh-note",role:"group","aria-label":t,children:(0,x.jsxs)("div",{className:"hh-note-body",children:[(0,x.jsx)("strong",{children:t}),(0,x.jsx)(me,{label:e("fieldId"),hint:e("fieldIdHint"),children:(0,x.jsx)("input",{className:"hh-input",value:p.id,readOnly:a,disabled:o,onChange:S=>g("id",S.target.value)})}),(0,x.jsx)(me,{label:e("fieldCommand"),children:(0,x.jsx)("input",{className:"hh-input",value:p.command,disabled:o,onChange:S=>g("command",S.target.value)})}),(0,x.jsx)(me,{label:e("fieldArgs"),hint:e("fieldArgsHint"),children:(0,x.jsx)("textarea",{className:"hh-input",rows:3,value:p.args,disabled:o,onChange:S=>g("args",S.target.value)})}),(0,x.jsx)(me,{label:e("fieldCwd"),children:(0,x.jsx)("input",{className:"hh-input",value:p.cwd,disabled:o,onChange:S=>g("cwd",S.target.value)})}),(0,x.jsx)(me,{label:e("fieldLabel"),children:(0,x.jsx)("input",{className:"hh-input",value:p.label,disabled:o,onChange:S=>g("label",S.target.value)})}),(0,x.jsx)(me,{label:e("fieldPort"),hint:e("fieldPortHint"),children:(0,x.jsx)("input",{className:"hh-input",type:"number",value:p.port,placeholder:"\u2014",disabled:o,onChange:S=>g("port",S.target.value)})}),(0,x.jsx)(me,{label:e("fieldAutostart"),children:(0,x.jsx)(be,{value:p.autostart,label:e("fieldAutostart"),disabled:o,options:[{value:"inherit",label:e("fieldInherit")},{value:"on",label:e("yes")},{value:"off",label:e("no")}],onChange:S=>g("autostart",S)})}),(0,x.jsx)(me,{label:e("fieldOnPortConflict"),children:(0,x.jsx)(be,{value:p.onPortConflict,label:e("fieldOnPortConflict"),disabled:o,options:[{value:"",label:e("fieldInherit")},...lt.map(S=>({value:S,label:S}))],onChange:S=>g("onPortConflict",S)})}),(0,x.jsx)(m,{children:e("serversEditorHint")}),X&&!o?(0,x.jsx)(m,{children:W}):null,(0,x.jsxs)("div",{className:"hh-btn-row",children:[(0,x.jsx)(y,{variant:"primary",busy:o,disabled:X,onClick:()=>s(p),children:r}),(0,x.jsx)(y,{variant:"ghost",disabled:o,onClick:i,children:e("confirmCancel")})]})]})})}var Rn=5e3;function Se(e,t){let n=e[t];return typeof n=="number"&&Number.isFinite(n)?n:null}function Vt(e,t){let n=e[t];return typeof n=="string"&&n.length>0?n:null}function Wt(e){let t=e/1e3;return`${Number.isInteger(t)?t:t.toFixed(1)}s`}function $t(e,t,n){if(!ne(e))return K;if(e.enabled!==!0)return n("serversDisabled");let r=Vt(e,"mode"),o=ne(e.http)?e.http:null,a;if(r==="http"||r===null&&o!==null){let i=(o===null?null:Vt(o,"path"))??"/",p=o===null?null:Se(o,"expectStatus"),c=o===null?null:Se(o,"expectStatusBelow");a=p!==null?n("serversHealthHttp",{status:p,path:i}):c!==null?n("serversHealthHttpBelow",{status:c,path:i}):n("serversHealthHttpProbe",{path:i})}else t!==null?a=n("serversHealthPort",{port:t}):a=n("serversHealthProbe");let s=Se(e,"intervalMs");return s!==null&&s!==Rn?`${a} \xB7 ${n("serversHealthEvery",{seconds:Wt(s)})}`:a}function jt(e,t){if(!ne(e))return K;if(e.enabled===!1)return t("serversDisabled");let n=Se(e,"maxRetries"),r=Se(e,"baseDelayMs"),o=Se(e,"factor");return n===null||r===null||o===null?t("serversEnabled"):t("serversRestartSummary",{retries:n,base:Wt(r),factor:o})}var An={"not-installed":"idle","installed-disabled":"warn","enabled-running":"ok","enabled-failing":"bad",unsupported:"idle"};function In(...e){return e.filter(t=>t!==null&&t.length>0).join(" \xB7 ")}function Hn(e,t){let{panel:n}=e;return n.reachable?{key:"panel",tone:"ok",name:t("sigPanel"),state:t("stateAnswering"),meta:I(n.version),href:n.url}:{key:"panel",tone:e.lastError===null?"idle":"bad",name:t("sigPanel"),state:t("stateNotAnswering"),meta:n.home,href:null}}function Ln(e,t){let{boot:n}=e,o=e.settings.autostart.enabled&&n.state==="not-installed"?"warn":An[n.state]??"idle",a=n.mechanism??(e.settings.autostart.mechanism==="auto"?null:e.settings.autostart.mechanism);return{key:"autostart",tone:o,name:t("sigAutostart"),state:t(Ie[n.state]??"bootStateUnsupported"),meta:a??"",href:null}}function Fn(e,t){let n=e.entries??[],r=t("sigEntry",{id:e.defaultEntryId??"dsh"}),o=e.settings.manageDsh===!0,a=e.surface==="desktop",s=n.filter(g=>!g.exists).length,i=n.filter(g=>g.drift.length>0).length,p=n.find(g=>g.live!==null)?.live??null;return{key:"entry",tone:a?"idle":o?s>0?"bad":i>0?"warn":p!==null?"ok":"warn":"idle",name:r,state:t(a?"stateWebOnly":o?"stateManaged":"stateNotManaged"),meta:p===null?t("entriesNotRunning"):In(I(p.status),p.pid===null?null:`pid ${p.pid}`),href:null}}function zt(e,t){return[Hn(e,t),Ln(e,t),Fn(e,t)]}function Gt(e,t){let n=e.filter(r=>r.status==="running").length;return t("serversCount",{running:n,total:e.length})}var d=require("react/jsx-runtime");function Be(e,t){return{workspace:e,id:t}}function Mn(e,t){return{workspace:e,entry:t}}function Bn(e,t,n){return{workspace:e,id:t,patch:n}}function On(e,t){return{workspace:e,id:t}}function q(e,t,n){return`${t}:${e}/${n}`}function Me(e,t){return t!==null&&t.workspace===e?t.value:null}function Dn({t:e,workspace:t,server:n,run:r,busy:o,offline:a,onEdit:s,onDelete:i,onFreePort:p}){let c=n.status==="running";return(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(y,{variant:"ghost",disabled:a||c,busy:o===q(t,"servers.start",n.id),onClick:()=>{r(q(t,"servers.start",n.id),()=>T("servers.start",Be(t,n.id)))},children:e("serversStart")}),(0,d.jsx)(y,{variant:"ghost",disabled:a||!c,busy:o===q(t,"servers.stop",n.id),onClick:()=>{r(q(t,"servers.stop",n.id),()=>T("servers.stop",Be(t,n.id)))},children:e("serversStop")}),(0,d.jsx)(y,{variant:"ghost",disabled:a||!c,busy:o===q(t,"servers.restart",n.id),onClick:()=>{r(q(t,"servers.restart",n.id),()=>T("servers.restart",Be(t,n.id)))},children:e("serversRestart")}),(0,d.jsx)(y,{variant:"ghost",disabled:a,onClick:s,children:e("serversEdit")}),(0,d.jsx)(y,{variant:"ghost",disabled:a,onClick:i,children:e("serversDelete")}),n.config.port==null?null:(0,d.jsx)(y,{variant:"ghost",disabled:a,onClick:p,children:e("serversFreePort")})]})}function Kt({t:e,server:t}){return t.stoppedByPanel===!0&&t.status==="stopped"?(0,d.jsx)("span",{title:e("serversStoppedByPanel"),children:(0,d.jsx)(U,{tone:"warn",children:e("serversStopped")})}):(0,d.jsx)(U,{tone:t.status==="running"?"ok":"idle",children:t.status})}function _n({text:e}){return e.length===0?(0,d.jsx)(d.Fragment,{children:K}):(0,d.jsx)("span",{className:"hh-nowrap",title:e,children:(0,d.jsx)(re,{children:e})})}function Yt({t:e,status:t,run:n,busy:r,uiStyle:o,workspace:a,servers:s,serversError:i}){let p=!t.panel.reachable||r!==null,c=new Map(a===t.workspace?(t.entries??[]).map(u=>[u.intent.id,u.intent]):[]),[g,v]=(0,fe.useState)(!1),[$,F]=(0,fe.useState)(null),[Z,M]=(0,fe.useState)(null),[X,W]=(0,fe.useState)(null),[S,L]=(0,fe.useState)(null),G=Me(a,$),j=Me(a,Z),se=Me(a,X),Q=Me(a,S),ie=()=>{v(!0),F(null),M(null),W(null)},le=u=>{v(!1),F({workspace:a,value:u}),M(null),W(null)},ue=()=>{v(!1),F(null)},R=async u=>{let ee=_t(u);if(ee===null)return;(await n("servers.create",()=>T("servers.create",Mn(a,ee)))).ok&&ue()},A=async(u,ee,E)=>{let de=Ut(E.config,ee);if(de===null){F(null);return}(await n(q(a,"servers.update",u),()=>T("servers.update",Bn(a,u,de)))).ok&&F(null)},k=async u=>{M(null),await n(q(a,"servers.delete",u),()=>T("servers.delete",On(a,u)))},B=async u=>{W(null);let ee=await n(q(a,"servers.freePort",u.id),()=>T("servers.freePort",Be(a,u.id)));if(!ee.ok){L({workspace:a,value:e("serversPortRefused",{message:ee.error.message})});return}let E=ee.value,de=E?.port??u.config.port??K;if(E?.free===!0){L({workspace:a,value:e("serversPortFreed",{port:de})});return}L({workspace:a,value:E?.skipped!==void 0&&E.skipped.length>0?e("serversPortSkipped"):e("serversPortHeld",{port:de})})},_=se===null?null:s.find(u=>u.id===se)??null;return(0,d.jsxs)(Y,{icon:(0,d.jsx)(Ee,{}),title:e("serversTitle"),action:(0,d.jsx)(U,{children:Gt(s,e)}),children:[(0,d.jsxs)(m,{children:[`${e("serversWorkspace")} `,(0,d.jsx)(re,{children:a})," \xB7 ",t.panel.url===null?e("serversHintNoPanel"):(0,d.jsxs)(d.Fragment,{children:[`${e("serversHintPanel")} `,(0,d.jsx)(he,{href:t.panel.url,children:t.panel.url})]})]}),i===null?null:(0,d.jsx)(Le,{title:e("errorTitle"),detail:`${i.code} \u2014 ${i.message}`}),(0,d.jsx)("div",{className:"hh-btn-row",children:(0,d.jsx)(y,{variant:"primary",disabled:p||g,onClick:ie,children:e("serversAdd")})}),g?(0,d.jsx)(ze,{t:e,title:e("serversCreateTitle"),initial:$e({id:"",command:""}),submitLabel:e("serversCreate"),busy:r==="servers.create",lockId:!1,onSubmit:u=>{R(u)},onCancel:ue},"create"):null,_===null?null:(0,d.jsxs)(O,{tone:"warn",title:e("serversFreePortTitle",{port:I(_.config.port)}),children:[(0,d.jsx)("p",{children:e("serversFreePortBody")}),(0,d.jsxs)("div",{className:"hh-note-actions",children:[(0,d.jsx)(y,{onClick:()=>W(null),children:e("confirmCancel")}),(0,d.jsx)(y,{variant:"danger",busy:r===q(a,"servers.freePort",_.id),onClick:()=>{B(_)},children:e("serversFreePortGo")})]})]}),Q===null?null:(0,d.jsx)(m,{children:Q}),s.length===0?(0,d.jsx)(m,{children:e("serversEmpty")}):(0,d.jsx)("div",{className:o==="detailed"?"hh-cards":"hh-list",children:s.map(u=>{let ee=u.status==="running",E=u.config,de=G===u.id?(0,d.jsx)(ze,{t:e,title:e("serversEditTitle",{id:u.id}),initial:$e(E),submitLabel:e("serversSave"),busy:r===q(a,"servers.update",u.id),lockId:!0,onSubmit:N=>{A(u.id,N,u)},onCancel:()=>F(null)},`edit:${u.id}`):null,ke=j===u.id?(0,d.jsxs)(O,{tone:"warn",title:e("serversDeleteTitle",{id:u.id}),children:[(0,d.jsx)("p",{children:e("serversDeleteBody",{workspace:a})}),(0,d.jsxs)("div",{className:"hh-note-actions",children:[(0,d.jsx)(y,{onClick:()=>M(null),children:e("confirmCancel")}),(0,d.jsx)(y,{variant:"danger",busy:r===q(a,"servers.delete",u.id),onClick:()=>{k(u.id)},children:e("serversDeleteGo")})]})]}):null,Ce=(0,d.jsx)(Dn,{t:e,workspace:a,server:u,run:n,busy:r,offline:p,onEdit:()=>le(u.id),onDelete:()=>{M({workspace:a,value:u.id}),F(null),v(!1)},onFreePort:()=>{W({workspace:a,value:u.id}),F(null),v(!1)}});if(o==="detailed"){let N=(E.args??[]).join(" "),H=E.cwd??"",tn=c.get(u.id)?.persistent;return(0,d.jsxs)("article",{className:"hh-card",children:[(0,d.jsxs)("div",{className:"hh-card-head",children:[(0,d.jsx)("span",{className:"hh-item-name",children:u.id}),(0,d.jsx)(Kt,{t:e,server:u}),tn===!0?(0,d.jsx)("span",{title:e("serversPersistentHint"),children:(0,d.jsx)(U,{tone:"accent",children:e("serversPersistent")})}):null,(0,d.jsx)("span",{className:"hh-item-spacer"}),(0,d.jsx)("span",{className:"hh-item-actions",children:Ce})]}),(0,d.jsxs)("div",{className:"hh-card-facts",children:[(0,d.jsx)(C,{label:e("serversUrl"),children:u.url===null?I(u.url):(0,d.jsx)(he,{href:u.url,children:u.url})}),(0,d.jsx)(C,{label:e("serversPid"),children:I(u.pid)}),(0,d.jsx)(C,{label:e("serversPort"),children:I(E.port)}),(0,d.jsx)(C,{label:e("serversAutostart"),children:E.autostart===void 0?K:E.autostart?e("yes"):e("no")})]}),(0,d.jsxs)(pe,{label:e("serversConfiguration"),children:[(0,d.jsx)(C,{label:e("serversCommand"),children:E.command===void 0||E.command.length===0?K:(0,d.jsx)("span",{className:"hh-nowrap",title:E.command,children:(0,d.jsx)(re,{children:E.command})})}),(0,d.jsx)(C,{label:e("serversArgs"),children:(0,d.jsx)(_n,{text:N})}),(0,d.jsx)(C,{label:e("serversCwd"),children:H.length===0?K:(0,d.jsx)("span",{className:"hh-nowrap",title:H,children:(0,d.jsx)(re,{children:He(H)})})}),(0,d.jsx)(C,{label:e("serversOnPortConflict"),children:I(E.onPortConflict)}),(0,d.jsx)(C,{label:e("serversHealth"),children:$t(E.health,E.port??null,e)}),(0,d.jsx)(C,{label:e("serversRestartPolicy"),children:jt(E.restart,e)})]}),(0,d.jsx)(pe,{label:e("serversRawConfig"),children:(0,d.jsx)("pre",{className:"hh-output",children:JSON.stringify(E,null,2)})}),de,ke]},u.id)}return(0,d.jsxs)(fe.Fragment,{children:[(0,d.jsxs)("div",{className:"hh-item",children:[(0,d.jsxs)("span",{className:"hh-item-main",children:[(0,d.jsx)("span",{className:"hh-item-name",children:u.id}),(0,d.jsx)(Kt,{t:e,server:u}),u.url===null?null:(0,d.jsx)(he,{href:u.url,children:u.url})]}),(0,d.jsx)("span",{className:"hh-item-spacer"}),u.pid===null?null:(0,d.jsx)("span",{className:"hh-item-meta",children:`${e("serversPid")} ${u.pid}`}),(0,d.jsx)("span",{className:"hh-item-actions",children:Ce})]}),de,ke]},u.id)})})]})}var z=require("react/jsx-runtime");function Un(e){let t=typeof e.label=="string"?e.label.trim():"";return t.length===0||t===e.id?e.id:`${e.id} \u2014 ${t}`}function Vn(e,t){return e.source==="file"?t("workspacesCountsFile",{servers:e.servers}):t("workspacesCounts",{servers:e.servers,running:e.running})}function qt({t:e,status:t,viewing:n,onView:r}){let o=t.workspaces??[],a=t.workspace??it,s=t.defaultEntryId??"dsh",i=t.legacyRoot===!0||(t.lastError??"").includes("pre-0.7"),p=o.some(c=>c.source==="file");return(0,z.jsxs)(Y,{icon:(0,z.jsx)(Ee,{}),title:e("workspacesTitle"),action:(0,z.jsx)(U,{tone:"accent",children:n}),children:[(0,z.jsx)(m,{children:e("workspacesHint",{id:s})}),o.length===0?(0,z.jsx)(m,{children:e("workspacesEmpty")}):(0,z.jsx)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("workspacesViewLabel"),children:o.map(c=>{let g=c.id===a?(0,z.jsx)(Fe,{children:e("workspacesManagedTag")}):c.id===n?(0,z.jsx)(U,{tone:"accent",children:e("workspacesViewingTag")}):void 0;return(0,z.jsx)(Te,{label:Un(c),meta:Vn(c,e),hint:g,checked:c.id===n,onChange:()=>r(c.id)},c.id)})}),p?(0,z.jsx)(O,{tone:"warn",children:e("workspacesDegraded")}):null,i?(0,z.jsx)(O,{tone:"warn",title:e("workspaceLegacyTitle"),children:(0,z.jsx)("p",{children:e("workspaceLegacyBody")})}):null]})}var Ge=`
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
`;var f=require("react/jsx-runtime");function Wn({signal:e}){return(0,f.jsxs)("div",{className:"hh-signal","data-tone":e.tone,children:[(0,f.jsx)("span",{className:"hh-signal-dot","aria-hidden":"true"}),(0,f.jsx)("span",{className:"hh-signal-name",children:e.name}),(0,f.jsx)("span",{className:"hh-signal-state",children:e.state}),e.meta.length===0&&e.href===null?null:(0,f.jsxs)("span",{className:"hh-signal-meta",children:[e.meta,e.href===null?null:(0,f.jsxs)(f.Fragment,{children:[e.meta.length===0?null:" \xB7 ",(0,f.jsx)(he,{href:e.href,children:e.href})]})]})]})}function Jt(e){let t=at(e.t),{data:n,error:r,loading:o,refresh:a}=pt(),[s,i]=(0,V.useState)(null),[p,c]=(0,V.useState)(null),[g,v]=(0,V.useState)(null),[$,F]=(0,V.useState)([]),[Z,M]=(0,V.useState)(null),[X,W]=(0,V.useState)(0),S=(0,V.useRef)(null),L=g??n?.workspace??null,G=(0,V.useCallback)(async k=>{let B=await T("servers.list",{workspace:k});B.ok?(F(B.value),M(null)):M(B.error)},[]);(0,V.useEffect)(()=>{L!==null&&(S.current!==L&&(S.current=L,F([]),M(null)),G(L))},[L,X,G]);let j=(0,V.useCallback)((k,B)=>(c(k),i(null),(async()=>{try{let _=await B();return _.ok||i(_.error),_}catch(_){let u={code:"client",message:_ instanceof Error?_.message:String(_)};return i(u),{ok:!1,error:u}}finally{c(null),await a(),W(_=>_+1)}})()),[a]),se=(0,V.useCallback)(k=>{if(n===null)return;let B=yt(n.settings,k(n.settings));Object.keys(B).length!==0&&j("settings",()=>ct(B))},[n,j]),Q=n?.settings.uiStyle??"detailed",[ie,le]=(0,V.useState)(Q);(0,V.useEffect)(()=>{le(Q)},[Q]);let ue=k=>{le(k),se(B=>({...B,uiStyle:k}))};if(n===null)return(0,f.jsxs)("div",{className:"hh-root",children:[(0,f.jsx)("style",{children:Ge}),o?(0,f.jsx)(m,{children:t("loading")}):(0,f.jsxs)(f.Fragment,{children:[(0,f.jsx)(Pe,{error:r??{code:"status",message:t("statusUnavailable")},title:t("errorTitle")}),(0,f.jsx)("div",{className:"hh-btn-row",children:(0,f.jsx)(y,{onClick:()=>{a()},children:t("retry")})})]})]});let R={t,status:n,run:j,updateSettings:se,busy:p,uiStyle:ie},A=L??n.workspace??"default";return(0,f.jsxs)("div",{className:"hh-root",children:[(0,f.jsx)("style",{children:Ge}),(0,f.jsxs)("header",{className:"hh-head",children:[(0,f.jsx)("span",{className:"hh-head-icon",children:(0,f.jsx)(Ne,{})}),(0,f.jsx)("h2",{className:"hh-title",children:t("tab")}),(0,f.jsx)("span",{className:"hh-head-spacer"}),(0,f.jsx)(be,{value:ie,label:t("uiStyleLabel"),disabled:p==="settings",options:[{value:"detailed",label:t("uiStyleDetailed")},{value:"compact",label:t("uiStyleCompact")}],onChange:k=>ue(k)}),(0,f.jsx)(y,{variant:"ghost",icon:(0,f.jsx)(Xe,{size:13}),busy:p==="status.refresh",onClick:()=>{j("status.refresh",()=>T("status",{refresh:!0}))},children:t("refresh")})]}),(0,f.jsx)("div",{className:"hh-signals","data-busy":p!==null,children:zt(n,t).map(k=>(0,f.jsx)(Wn,{signal:k},k.key))}),n.lastError===null?null:(0,f.jsx)(Pe,{error:{code:"panel",message:n.lastError},title:t("errorTitle")}),(0,f.jsx)(Pe,{error:r,title:t("errorTitle")}),(0,f.jsx)(Pe,{error:s,title:t("errorTitle")}),(0,f.jsx)(Mt,{...R}),(0,f.jsx)(Ht,{...R}),(0,f.jsx)(Lt,{...R}),(0,f.jsx)(Pt,{...R}),(0,f.jsx)(qt,{...R,viewing:A,onView:v}),(0,f.jsx)(Yt,{...R,workspace:A,servers:$,serversError:Z})]})}var xe="data-dsh-home-hosted-nav-icon",$n='[role="dialog"] nav button',ve=16;function jn(){return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${De}"/></svg>`}function zn(){return`data:image/svg+xml,${encodeURIComponent(jn())}`}function Gn(e,t){let n=String(t??"").trim();return n.length===0?!1:String(e??"").trim()===n}function Kn(e){return[`[${xe}] svg { display: none; }`,`[${xe}]::before {`,"  content: '';","  flex: none;",`  width: ${ve}px;`,`  height: ${ve}px;`,"  background-color: currentColor;",`  -webkit-mask-image: url("${e}");`,"  -webkit-mask-repeat: no-repeat;","  -webkit-mask-position: center;",`  -webkit-mask-size: ${ve}px ${ve}px;`,`  mask-image: url("${e}");`,"  mask-repeat: no-repeat;","  mask-position: center;",`  mask-size: ${ve}px ${ve}px;`,"}"].join(`
`)}function Zt(e,t){if(typeof document>"u")return()=>{};let n=()=>{let o=document.createElement("style");o.setAttribute("data-plugin-css","dsh-home-hosted/settings-nav-icon"),o.textContent=Kn(zn()),document.head.append(o);let a=()=>{let i=t(),p=document.querySelectorAll($n),c=null;for(let g=0;g<p.length;g+=1){let v=p.item(g);v!==null&&(c===null&&Gn(v.textContent,i)?c=v:v.removeAttribute(xe))}c?.setAttribute(xe,"")};a();let s=new MutationObserver(a);return s.observe(document.body,{childList:!0,subtree:!0,characterData:!0}),()=>{s.disconnect();let i=document.querySelectorAll(`[${xe}]`);for(let p=0;p<i.length;p+=1)i.item(p)?.removeAttribute(xe);o.remove()}},r=()=>{};return typeof e.effect=="function"?e.effect(()=>{r=n()},"dsh-home-hosted: settings nav icon"):r=n(),()=>r()}var en=require("react/jsx-runtime"),Yn=["slots","locale"],Xt="[dsh-home-hosted]";function J(e,t){t===void 0?console.warn(`${Xt} ${e}`):console.warn(`${Xt} ${e}`,t)}function Qt(e,t){try{let n=e.get?.(t);if(n!=null)return n}catch{}try{let n=e[t];if(n!=null)return n}catch{}}function Ke(e,t,n){if(typeof e.effect=="function")try{e.effect(t,n);return}catch(r){J(`registering the effect "${n}" failed`,r);return}try{t()}catch(r){J(`the effect "${n}" failed`,r)}}function qn(e){try{let t=Qt(e,"locale"),n=rt(t);t===void 0?J("the locale service is unavailable; the page keeps its bundled English copy"):Ke(e,()=>{let s=[];try{s.push(t.register(Ae,{en:_e,zh:nt}))}catch(i){J("registering the dictionaries failed",i)}return()=>{for(let i of s)try{i()}catch(p){J("disposing a dictionary failed",p)}}},"dsh-home-hosted: dictionaries");let r=Qt(e,"slots");if(r===void 0){J("the slots service is unavailable; the settings section was not registered");return}Ke(e,()=>{try{return r.inject("settings.section",()=>{try{return r.register({name:"settings.section",id:"home-hosted",order:60,label:()=>n("tab"),locale:Ae,inject:()=>({t:n})},Jt)}catch(s){return J("registering the settings section failed",s),()=>{}}})}catch(s){return J("injecting into settings.section failed",s),()=>{}}},"dsh-home-hosted: settings section");let o,a=!1;Ke(e,()=>{let s=()=>{};try{s=r.inject("settings.section.icon",()=>{a=!0,o?.(),o=void 0;try{return r.register({name:"settings.section.icon",id:"home-hosted",order:60},(i={})=>(0,en.jsx)(Ne,{size:i.size??ve}))}catch(i){return J("registering the settings nav icon failed",i),()=>{}}})}catch(i){J("injecting into settings.section.icon failed",i)}return()=>{try{s()}catch(i){J("disposing the settings nav icon failed",i)}}},"dsh-home-hosted: settings nav icon"),a||(o=Zt(e,()=>n("tab")))}catch(t){J("client bootstrap failed",t)}}

return module.exports; } });
