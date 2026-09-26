window.__ModuleLoader__.load({ id: "dsh-home-hosted", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";var se=Object.defineProperty;var bt=Object.getOwnPropertyDescriptor;var vt=Object.getOwnPropertyNames;var yt=Object.prototype.hasOwnProperty;var xt=(e,t)=>{for(var n in t)se(e,n,{get:t[n],enumerable:!0})},wt=(e,t,n,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of vt(t))!yt.call(e,o)&&o!==n&&se(e,o,{get:()=>t[o],enumerable:!(a=bt(t,o))||a.enumerable});return e};var St=e=>wt(se({},"__esModule",{value:!0}),e);var Gt={};xt(Gt,{apply:()=>zt,inject:()=>jt});module.exports=St(Gt);var ee="homeHosted",le={tab:"Home Hosted",loading:"Loading\u2026",refresh:"Refresh",retry:"Retry",errorTitle:"Error",statusUnavailable:"The panel did not answer.",yes:"Yes",no:"No",copy:"Copy",copied:"Copied",details:"Details",uiStyleLabel:"Page style",uiStyleDetailed:"Detailed",uiStyleCompact:"Compact",sigPanel:"Panel",sigAutostart:"Autostart",sigEntry:"{id} entry",stateAnswering:"answering",stateNotAnswering:"not answering",stateManaged:"managed",stateNotManaged:"not managed",panelTitle:"Panel",panelCopy:"Which copy runs the panel",panelCopyHint:"The pinned copy ships with this plugin; the global one is on PATH.",optionsPreferPinned:"Pinned dependency",optionsPreferGlobal:"Global install",optionsRecommended:"recommended",optionsConfigOverride:"The plugin row sets homeHostedCommand, and that always wins.",optionsInstallLabel:"Install a global copy",optionsInstallHint:"No global install was found. Install the pinned range, then choose it above:",optionsInstall:"Install globally",panelHome:"$HHOSTED_HOME",panelUrl:"URL",panelVersion:"Version",panelPid:"PID",panelWriteVia:"Writes via",panelToken:"API token",panelCliSource:"CLI",panelCliPath:"CLI path",panelCliConfig:"configured command",panelCliDependency:"pinned dependency",panelCliPathSource:"global install (PATH)",panelCliMissing:"not found",panelCliNotPinned:"This host resolved a global home-hosted instead of the pinned copy ({range}).",panelCliUnsupported:"This home-hosted is older than the oldest release the plugin supports.",panelCliLauncherFailed:"The boot launcher did not answer, so a boot entry may fail to start the panel.",panelPort:"Panel port",panelPortHint:"Only changeable while the panel is stopped.",panelPortFree:"Leave empty to use the port in the config.",panelPortInvalid:"Enter a port between 1 and 65535.",panelStart:"Start the panel",panelReplace:"Replace with {copy}",panelCopyPinned:"pinned dependency",panelCopyGlobal:"global install",panelTakeoverTitle:"Replace the running panel?",panelTakeoverBody:"This stops the panel and every server it supervises \u2014 this session included, so the page disconnects. It needs the {id} entry adopted with autostart on.",confirmCancel:"Cancel",confirmReplace:"Replace",writeViaApi:"authenticated API",writeViaFile:"config file",writeViaNone:"unavailable",tokenEnrolled:"enrolled",tokenPresent:"present",tokenAbsent:"absent",tokenUnknown:"unknown",bootTitle:"Autostart",bootEnabled:"Enable autostart",bootUninstall:"Uninstall",bootSwitchMode:"Switch autostart",bootRecheck:"Re-check",bootMechanism:"Mechanism",bootMechanismAuto:"Automatic",bootState:"State",bootStateNotInstalled:"not installed",bootStateInstalledDisabled:"installed, off",bootStateEnabledRunning:"enabled, running",bootStateEnabledFailing:"enabled, failing",bootStateUnsupported:"unsupported",bootBootCapable:"Starts before login",bootPrivileged:"This process can install it",bootUnitPath:"Unit path",bootCommandsLabel:"Install by hand",bootCommandsExplain:"This process cannot elevate. Run these commands to install autostart:",bootRequestedNotInstalled:"Autostart is requested, but no boot entry is installed.",bootActionInstall:"install",bootActionUninstall:"uninstall",bootAttemptFailed:"{action} failed",bootAttemptSucceeded:"{action} succeeded \u2014 {detail}",bootAttemptNoDetail:"The host did not explain the refusal.",bootAttemptCommands:"Run these yourself:",entriesTitle:"Managed entry",entriesManage:"Manage {id}",entriesManageNote:"Hands {id} to home-hosted: boot autostart, panel control, port reclaim.",entriesManageWinWarning:"On Windows, `{id}` is managed via the `kill` onPortConflict policy, so when it is restarted detached by another plugin it may briefly fail to boot while home-hosted reclaims the process and port.",entriesEmpty:"{id} is not managed yet.",entriesExists:"exists",entriesMissing:"missing",entriesManaged:"managed",entriesUnmanaged:"unmanaged",entriesDrift:"drift",entriesNotRunning:"not running",agentTitle:"Agent tools",agentCount:"{enabled} of {total} on",agentMaster:"Let the agent use these tools",agentApproval:"Tools that change something ask for approval first.",agentApprovalBadge:"approval",agentToolStatus:"Status",agentToolServersList:"List servers",agentToolServersLifecycle:"Start, stop, restart",agentToolServersEdit:"Create, update, delete",agentToolAutostartManage:"Manage boot autostart",agentToolUiManage:"Manage Panel UI",agentToolDescStatus:"Read the panel, the CLI copy in use and the managed entry. Nothing changes.",agentToolDescServersList:"List the servers the panel supervises, with status, port and URL.",agentToolDescServersLifecycle:"Start, stop and restart supervised servers.",agentToolDescServersEdit:"Create, update and delete the panel's server entries.",agentToolDescAutostartManage:"Install or remove the boot entry that starts the panel.",agentToolDescUiManage:"Inspect, update, revert or switch the panel's own UI build.",serversTitle:"Servers",serversCount:"{running} of {total} running",serversHintPanel:"Entries are managed in the home-hosted panel:",serversHintNoPanel:"Entries cannot be managed right now: the panel is not running.",serversEmpty:"The panel reports no servers.",serversPid:"PID",serversUrl:"URL",serversCommand:"Command",serversArgs:"Args",serversCwd:"Working dir",serversPort:"Port",serversOnPortConflict:"On port conflict",serversAutostart:"Autostart",serversPersistent:"Persistent",serversPersistentHint:"Run by home-hosted's own nanny, so stopping or restarting the panel leaves it alive.",serversHealth:"Health",serversRestartPolicy:"Restart",serversConfiguration:"Configuration",serversRawConfig:"Raw config",serversDisabled:"disabled",serversEnabled:"enabled",serversHealthHttp:"HTTP {status} on {path}",serversHealthHttpBelow:"HTTP <{status} on {path}",serversHealthHttpProbe:"HTTP probe on {path}",serversHealthPort:"port {port}",serversHealthProbe:"port probe",serversHealthEvery:"every {seconds}",serversRestartSummary:"{retries} retries \xB7 {base} \u2192 \xD7{factor}",serversStart:"Start",serversStop:"Stop",serversRestart:"Restart"},fe={tab:"Home Hosted",loading:"\u52A0\u8F7D\u4E2D\u2026",refresh:"\u5237\u65B0",retry:"\u91CD\u8BD5",errorTitle:"\u9519\u8BEF",statusUnavailable:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\u3002",yes:"\u662F",no:"\u5426",copy:"\u590D\u5236",copied:"\u5DF2\u590D\u5236",details:"\u8BE6\u60C5",uiStyleLabel:"\u9875\u9762\u6837\u5F0F",uiStyleDetailed:"\u8BE6\u7EC6",uiStyleCompact:"\u7D27\u51D1",sigPanel:"\u9762\u677F",sigAutostart:"\u5F00\u673A\u81EA\u542F",sigEntry:"{id} \u6761\u76EE",stateAnswering:"\u54CD\u5E94\u4E2D",stateNotAnswering:"\u672A\u54CD\u5E94",stateManaged:"\u5DF2\u63A5\u7BA1",stateNotManaged:"\u672A\u63A5\u7BA1",panelTitle:"\u9762\u677F",panelCopy:"\u7531\u54EA\u4E2A\u526F\u672C\u8FD0\u884C\u9762\u677F",panelCopyHint:"\u56FA\u5B9A\u526F\u672C\u968F\u63D2\u4EF6\u4E00\u8D77\u5B89\u88C5\uFF1B\u5168\u5C40\u526F\u672C\u6765\u81EA PATH\u3002",optionsPreferPinned:"\u56FA\u5B9A\u4F9D\u8D56",optionsPreferGlobal:"\u5168\u5C40\u5B89\u88C5",optionsRecommended:"\u63A8\u8350",optionsConfigOverride:"\u63D2\u4EF6\u884C\u4E2D\u7684 homeHostedCommand \u4F18\u5148\u7EA7\u6700\u9AD8\uFF0C\u59CB\u7EC8\u751F\u6548\u3002",optionsInstallLabel:"\u5B89\u88C5\u5168\u5C40\u526F\u672C",optionsInstallHint:"\u672A\u627E\u5230\u5168\u5C40\u5B89\u88C5\u3002\u5B89\u88C5\u56FA\u5B9A\u7248\u672C\u8303\u56F4\u540E\uFF0C\u5728\u4E0A\u65B9\u9009\u62E9\u5B83\uFF1A",optionsInstall:"\u5168\u5C40\u5B89\u88C5",panelHome:"$HHOSTED_HOME",panelUrl:"URL",panelVersion:"\u7248\u672C",panelPid:"PID",panelWriteVia:"\u5199\u5165\u65B9\u5F0F",panelToken:"API \u4EE4\u724C",panelCliSource:"CLI",panelCliPath:"CLI \u8DEF\u5F84",panelCliConfig:"\u914D\u7F6E\u7684\u547D\u4EE4",panelCliDependency:"\u56FA\u5B9A\u7684\u4F9D\u8D56\u7248\u672C",panelCliPathSource:"\u5168\u5C40\u5B89\u88C5\uFF08PATH\uFF09",panelCliMissing:"\u672A\u627E\u5230",panelCliNotPinned:"\u6B64\u5BBF\u4E3B\u89E3\u6790\u5230\u7684\u662F\u5168\u5C40 home-hosted\uFF0C\u800C\u4E0D\u662F\u56FA\u5B9A\u526F\u672C\uFF08{range}\uFF09\u3002",panelCliUnsupported:"\u6B64 home-hosted \u65E9\u4E8E\u63D2\u4EF6\u652F\u6301\u7684\u6700\u8001\u7248\u672C\u3002",panelCliLauncherFailed:"\u5F00\u673A\u542F\u52A8\u5668\u6CA1\u6709\u5E94\u7B54\uFF0C\u5F00\u673A\u9879\u53EF\u80FD\u65E0\u6CD5\u542F\u52A8\u9762\u677F\u3002",panelPort:"\u9762\u677F\u7AEF\u53E3",panelPortHint:"\u4EC5\u5728\u9762\u677F\u505C\u6B62\u65F6\u53EF\u4FEE\u6539\u3002",panelPortFree:"\u7559\u7A7A\u5219\u4F7F\u7528\u914D\u7F6E\u6587\u4EF6\u4E2D\u7684\u7AEF\u53E3\u3002",panelPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\u3002",panelStart:"\u542F\u52A8\u9762\u677F",panelReplace:"\u66FF\u6362\u4E3A{copy}",panelCopyPinned:"\u56FA\u5B9A\u4F9D\u8D56",panelCopyGlobal:"\u5168\u5C40\u5B89\u88C5",panelTakeoverTitle:"\u66FF\u6362\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelTakeoverBody:"\u8FD9\u4F1A\u505C\u6B62\u9762\u677F\u4EE5\u53CA\u5B83\u76D1\u7BA1\u7684\u6240\u6709\u670D\u52A1\u5668\u2014\u2014\u5305\u62EC\u672C\u4F1A\u8BDD\uFF0C\u56E0\u6B64\u672C\u9875\u9762\u4F1A\u65AD\u5F00\u8FDE\u63A5\u3002\u4EC5\u5F53 {id} \u6761\u76EE\u5DF2\u88AB\u63A5\u7BA1\u4E14\u542F\u7528\u81EA\u542F\u65F6\u624D\u53EF\u7528\u3002",confirmCancel:"\u53D6\u6D88",confirmReplace:"\u66FF\u6362",writeViaApi:"\u5DF2\u8BA4\u8BC1 API",writeViaFile:"\u914D\u7F6E\u6587\u4EF6",writeViaNone:"\u4E0D\u53EF\u7528",tokenEnrolled:"\u5DF2\u767B\u8BB0",tokenPresent:"\u5DF2\u5B58\u5728",tokenAbsent:"\u4E0D\u5B58\u5728",tokenUnknown:"\u672A\u77E5",bootTitle:"\u5F00\u673A\u81EA\u542F",bootEnabled:"\u542F\u7528\u5F00\u673A\u81EA\u542F",bootUninstall:"\u5378\u8F7D",bootSwitchMode:"\u5207\u6362\u81EA\u542F\u673A\u5236",bootRecheck:"\u91CD\u65B0\u68C0\u67E5",bootMechanism:"\u673A\u5236",bootMechanismAuto:"\u81EA\u52A8",bootState:"\u72B6\u6001",bootStateNotInstalled:"\u672A\u5B89\u88C5",bootStateInstalledDisabled:"\u5DF2\u5B89\u88C5\uFF0C\u672A\u542F\u7528",bootStateEnabledRunning:"\u5DF2\u542F\u7528\uFF0C\u8FD0\u884C\u4E2D",bootStateEnabledFailing:"\u5DF2\u542F\u7528\uFF0C\u542F\u52A8\u5931\u8D25",bootStateUnsupported:"\u4E0D\u652F\u6301",bootBootCapable:"\u767B\u5F55\u524D\u542F\u52A8",bootPrivileged:"\u672C\u8FDB\u7A0B\u53EF\u5B89\u88C5",bootUnitPath:"\u5355\u5143\u6587\u4EF6\u8DEF\u5F84",bootCommandsLabel:"\u624B\u52A8\u5B89\u88C5",bootCommandsExplain:"\u672C\u8FDB\u7A0B\u65E0\u6CD5\u63D0\u6743\u3002\u8BF7\u81EA\u884C\u6267\u884C\u4EE5\u4E0B\u547D\u4EE4\u6765\u5B89\u88C5\u81EA\u542F\uFF1A",bootRequestedNotInstalled:"\u5DF2\u8BF7\u6C42\u5F00\u673A\u81EA\u542F\uFF0C\u4F46\u5C1A\u672A\u5B89\u88C5\u4EFB\u4F55\u5F00\u673A\u9879\u3002",bootActionInstall:"\u5B89\u88C5",bootActionUninstall:"\u5378\u8F7D",bootAttemptFailed:"{action}\u5931\u8D25",bootAttemptSucceeded:"{action}\u6210\u529F \u2014 {detail}",bootAttemptNoDetail:"\u5BBF\u4E3B\u6CA1\u6709\u8BF4\u660E\u5931\u8D25\u539F\u56E0\u3002",bootAttemptCommands:"\u4F60\u53EF\u4EE5\u81EA\u884C\u8FD0\u884C\u4EE5\u4E0B\u547D\u4EE4\uFF1A",entriesTitle:"\u53D7\u7BA1\u6761\u76EE",entriesManage:"\u63A5\u7BA1 {id}",entriesManageNote:"\u628A {id} \u4EA4\u7ED9 home-hosted\uFF1A\u5F00\u673A\u81EA\u542F\u3001\u9762\u677F\u63A7\u5236\u3001\u7AEF\u53E3\u56DE\u6536\u3002",entriesManageWinWarning:"\u5728 Windows \u4E0A\uFF0C`{id}` \u901A\u8FC7 `kill` \u7AEF\u53E3\u51B2\u7A81\u7B56\u7565\u7BA1\u7406\uFF1B\u5F53\u5B83\u88AB\u5176\u4ED6\u63D2\u4EF6\u4EE5\u5206\u79BB\u65B9\u5F0F\u91CD\u542F\u65F6\uFF0Chome-hosted \u56DE\u6536\u8FDB\u7A0B\u4E0E\u7AEF\u53E3\u671F\u95F4\u53EF\u80FD\u77ED\u6682\u65E0\u6CD5\u542F\u52A8\u3002",entriesEmpty:"\u5C1A\u672A\u63A5\u7BA1 {id}\u3002",entriesExists:"\u5B58\u5728",entriesMissing:"\u7F3A\u5931",entriesManaged:"\u5DF2\u63A5\u7BA1",entriesUnmanaged:"\u672A\u63A5\u7BA1",entriesDrift:"\u6F02\u79FB",entriesNotRunning:"\u672A\u8FD0\u884C",agentTitle:"Agent \u5DE5\u5177",agentCount:"\u5DF2\u5F00\u542F {enabled}/{total}",agentMaster:"\u5141\u8BB8 Agent \u8C03\u7528\u8FD9\u4E9B\u5DE5\u5177",agentApproval:"\u4F1A\u6539\u53D8\u72B6\u6001\u7684\u5DE5\u5177\u5728\u8FD0\u884C\u524D\u4F1A\u8BF7\u6C42\u6279\u51C6\u3002",agentApprovalBadge:"\u9700\u6279\u51C6",agentToolStatus:"\u67E5\u770B\u72B6\u6001",agentToolServersList:"\u5217\u51FA\u670D\u52A1\u5668",agentToolServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u3001\u91CD\u542F",agentToolServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u3001\u5220\u9664",agentToolAutostartManage:"\u7BA1\u7406\u5F00\u673A\u81EA\u542F",agentToolUiManage:"\u7BA1\u7406\u9762\u677F UI",agentToolDescStatus:"\u8BFB\u53D6\u9762\u677F\u3001\u6B63\u5728\u4F7F\u7528\u7684 CLI \u526F\u672C\u548C\u53D7\u7BA1\u6761\u76EE\u3002\u4E0D\u6539\u53D8\u4EFB\u4F55\u72B6\u6001\u3002",agentToolDescServersList:"\u5217\u51FA\u9762\u677F\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u53CA\u5176\u72B6\u6001\u3001\u7AEF\u53E3\u548C URL\u3002",agentToolDescServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u548C\u91CD\u542F\u53D7\u76D1\u7BA1\u7684\u670D\u52A1\u5668\u3002",agentToolDescServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u548C\u5220\u9664\u9762\u677F\u7684\u670D\u52A1\u5668\u6761\u76EE\u3002",agentToolDescAutostartManage:"\u5B89\u88C5\u6216\u79FB\u9664\u542F\u52A8\u9762\u677F\u7684\u5F00\u673A\u9879\u3002",agentToolDescUiManage:"\u67E5\u770B\u3001\u66F4\u65B0\u3001\u56DE\u9000\u6216\u5207\u6362\u9762\u677F\u81EA\u8EAB\u7684 UI \u6784\u5EFA\u3002",serversTitle:"\u670D\u52A1\u5668",serversCount:"{total} \u4E2A\u4E2D {running} \u4E2A\u8FD0\u884C\u4E2D",serversHintPanel:"\u5728 home-hosted \u9762\u677F\u4E2D\u7BA1\u7406\u6761\u76EE\uFF1A",serversHintNoPanel:"\u5F53\u524D\u65E0\u6CD5\u7BA1\u7406\u6761\u76EE\uFF1A\u9762\u677F\u6CA1\u6709\u8FD0\u884C\u3002",serversEmpty:"\u9762\u677F\u672A\u62A5\u544A\u4EFB\u4F55\u670D\u52A1\u5668\u3002",serversPid:"PID",serversUrl:"URL",serversCommand:"\u547D\u4EE4",serversArgs:"\u53C2\u6570",serversCwd:"\u5DE5\u4F5C\u76EE\u5F55",serversPort:"\u7AEF\u53E3",serversOnPortConflict:"\u7AEF\u53E3\u51B2\u7A81\u65F6",serversAutostart:"\u81EA\u542F",serversPersistent:"\u6301\u4E45\u5316",serversPersistentHint:"\u7531 home-hosted \u81EA\u5E26\u7684 nanny \u6258\u7BA1\uFF0C\u505C\u6B62\u6216\u91CD\u542F\u9762\u677F\u4E0D\u4F1A\u505C\u6B62\u5B83\u3002",serversHealth:"\u5065\u5EB7\u68C0\u67E5",serversRestartPolicy:"\u91CD\u542F",serversConfiguration:"\u914D\u7F6E",serversRawConfig:"\u539F\u59CB\u914D\u7F6E",serversDisabled:"\u5DF2\u505C\u7528",serversEnabled:"\u5DF2\u542F\u7528",serversHealthHttp:"HTTP {status} \u4E8E {path}",serversHealthHttpBelow:"HTTP <{status} \u4E8E {path}",serversHealthHttpProbe:"HTTP \u63A2\u6D4B {path}",serversHealthPort:"\u7AEF\u53E3 {port}",serversHealthProbe:"\u7AEF\u53E3\u63A2\u6D4B",serversHealthEvery:"\u6BCF {seconds}",serversRestartSummary:"{retries} \u6B21\u91CD\u8BD5 \xB7 {base} \u2192 \xD7{factor}",serversStart:"\u542F\u52A8",serversStop:"\u505C\u6B62",serversRestart:"\u91CD\u542F"};function kt(e,t){return t===void 0?e:e.replace(/\{(\w+)\}/g,(n,a)=>Object.prototype.hasOwnProperty.call(t,a)?String(t[a]):n)}var be=(e,t)=>kt(le[e]??e,t);function ve(e){if(e!==void 0)try{let t=e.bind(ee);if(typeof t=="function")return t}catch{}return be}function ye(e,t=be){return e===void 0?t:(n,a)=>{let o;try{o=e(n,a)}catch{o=void 0}return o===void 0||o.length===0||o===n?t(n,a):o}}var F=require("react");var B=require("react");var xe="/home-hosted";var j=["status","servers_list","servers_lifecycle","servers_edit","autostart_manage","ui_manage"],we=["servers_lifecycle","servers_edit","autostart_manage","ui_manage"],Ct=2,Yt={version:Ct,autostart:{enabled:!1,mechanism:"auto"},manageDsh:!1,entries:[],agentTools:{enabled:!0,allow:[...j]},panel:{port:null},authNotice:!0,uiStyle:"detailed",cli:{prefer:"pinned"}};var Tt="/api";function I(e,t,n){return{ok:!1,error:n===void 0?{code:e,message:t}:{code:e,message:t,detail:n}}}function ce(e){return typeof e=="object"&&e!==null}function Pt(e){return e instanceof Error?e.message:String(e)}function Nt(e){if(!ce(e))return I("bad-response","The panel returned a non-object response");if(typeof e.v=="number"&&e.v!==1)return I("version-mismatch",`Response protocol v${e.v} does not match the expected v${1}`);let t=e.result;if(!ce(t))return I("bad-response","The panel returned no result");if(t.ok===!0)return"value"in t?{ok:!0,value:t.value}:I("bad-response","A successful response carried no value");if(t.ok===!1){let n=t.error;return ce(n)&&typeof n.message=="string"?I(typeof n.code=="string"?n.code:"error",n.message,n.detail):I("error","The panel reported a failure without a message")}return I("bad-response","The panel returned an unrecognised result")}async function k(e,t,n={}){let a=n.fetch??globalThis.fetch;if(typeof a!="function")return I("no-fetch","No fetch implementation is available");let o={v:1,endpoint:e,payload:t},r;try{r=await a(`${Tt}${xe}`,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(o)})}catch(i){return I("network",Pt(i))}if(!r.ok){let i=r.statusText.length>0?` ${r.statusText}`:"";return I("http",`HTTP ${r.status}${i}`)}let l;try{l=await r.json()}catch{return I("bad-json","The panel returned invalid JSON")}return Nt(l)}function Se(e,t={}){return k("settings.update",{patch:e},t)}var Et=5e3;function ke(e=Et){let[t,n]=(0,B.useState)(null),[a,o]=(0,B.useState)(null),[r,l]=(0,B.useState)(!0),i=(0,B.useRef)(!0),s=(0,B.useCallback)(async()=>{let h=await k("status",{});i.current&&(h.ok?(n(h.value),o(null)):o(h.error),l(!1))},[]);return(0,B.useEffect)(()=>{i.current=!0,s();let h=setInterval(()=>{s()},e);return()=>{i.current=!1,clearInterval(h)}},[s,e]),{data:t,error:a,loading:r,refresh:s}}var m=require("react/jsx-runtime");function O({size:e=14,children:t}){return(0,m.jsx)("svg",{width:e,height:e,viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",focusable:"false",children:t})}function Ce(e){return(0,m.jsxs)(O,{...e,children:[(0,m.jsx)("rect",{x:"2.2",y:"3",width:"11.6",height:"7.6",rx:"1.6"}),(0,m.jsx)("path",{d:"M6.6 13.4h2.8M8 10.6v2.8"})]})}function Te(e){return(0,m.jsxs)(O,{...e,children:[(0,m.jsx)("path",{d:"M8 2.4v5.2"}),(0,m.jsx)("path",{d:"M11.6 4.4a5 5 0 1 1-7.2 0"})]})}function Pe(e){return(0,m.jsxs)(O,{...e,children:[(0,m.jsx)("rect",{x:"2.2",y:"2.8",width:"11.6",height:"10.4",rx:"1.6"}),(0,m.jsx)("path",{d:"M5.2 6.9l1.8 1.8-1.8 1.8M8.7 10.5h2.2"})]})}function Ne(e){return(0,m.jsxs)(O,{...e,children:[(0,m.jsx)("path",{d:"M2.4 5.4h11.2M2.4 10.6h11.2"}),(0,m.jsx)("circle",{cx:"6",cy:"5.4",r:"1.6",fill:"currentColor",stroke:"none"}),(0,m.jsx)("circle",{cx:"10.4",cy:"10.6",r:"1.6",fill:"currentColor",stroke:"none"})]})}function Ee(e){return(0,m.jsxs)(O,{...e,children:[(0,m.jsx)("path",{d:"M8 2.3l5.4 2.9L8 8.1 2.6 5.2z"}),(0,m.jsx)("path",{d:"M2.6 8.6l5.4 2.9 5.4-2.9"}),(0,m.jsx)("path",{d:"M2.6 11.4l5.4 2.9 5.4-2.9"})]})}function Re(e){return(0,m.jsxs)(O,{...e,children:[(0,m.jsx)("path",{d:"M13.4 9.4A5.5 5.5 0 1 1 12.2 4.4"}),(0,m.jsx)("path",{d:"M12.8 1.7v2.9h-2.9"})]})}function Ae(e){return(0,m.jsx)(O,{...e,children:(0,m.jsx)("path",{d:"M6.2 3.8L10.4 8l-4.2 4.2"})})}function He(e){return(0,m.jsxs)(O,{...e,children:[(0,m.jsx)("path",{d:"M6.6 3.4H3.4v9.2h9.2V9.4"}),(0,m.jsx)("path",{d:"M9.4 3.4h3.2v3.2M12.6 3.4L7.8 8.2"})]})}function te(e){return(0,m.jsxs)(O,{...e,children:[(0,m.jsx)("path",{d:"M8 2.6l5.7 10.2H2.3z"}),(0,m.jsx)("path",{d:"M8 6.4v3.1M8 11.5h.01"})]})}function Me(e){return(0,m.jsx)(O,{...e,children:(0,m.jsx)("path",{d:"M3 8.4l3.3 3.3L13 5"})})}var L="\u2014";function v(e){if(e==null)return L;let t=String(e);return t.length>0?t:L}function Ie(e){return e.length>0?e.join(", "):L}function he(e){return we.includes(e)}var pe={status:"agentToolStatus",servers_list:"agentToolServersList",servers_lifecycle:"agentToolServersLifecycle",servers_edit:"agentToolServersEdit",autostart_manage:"agentToolAutostartManage",ui_manage:"agentToolUiManage"},Le={status:"agentToolDescStatus",servers_list:"agentToolDescServersList",servers_lifecycle:"agentToolDescServersLifecycle",servers_edit:"agentToolDescServersEdit",autostart_manage:"agentToolDescAutostartManage",ui_manage:"agentToolDescUiManage"},Be={api:"writeViaApi",file:"writeViaFile",none:"writeViaNone"},Oe={enrolled:"tokenEnrolled",present:"tokenPresent",absent:"tokenAbsent",unknown:"tokenUnknown"},ne={"not-installed":"bootStateNotInstalled","installed-disabled":"bootStateInstalledDisabled","enabled-running":"bootStateEnabledRunning","enabled-failing":"bootStateEnabledFailing",unsupported:"bootStateUnsupported"},_e={config:"panelCliConfig",dependency:"panelCliDependency",path:"panelCliPathSource",none:"panelCliMissing"};function oe(e,t=52){if(e.length<=t)return e;let n=e.includes("\\")?"\\":"/",a=e.split(/[\\/]/).filter(i=>i.length>0);if(a.length<4)return e;let o=/^[A-Za-z]:$/.test(a[0]??"")?3:2;if(a.length<=o)return e;let l=`${/^[\\/]/.test(e)?n:""}${a.slice(0,o).join(n)}${n}\u2026${n}${a.slice(-2).join(n)}`;return l.length<e.length?l:e}function Ue(e){let t=n=>e.source===n&&e.path!==null?{source:n,path:e.path,version:e.version}:null;return{dependency:e.dependency??t("dependency"),global:e.global??t("path")}}function De(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Rt(e,t){if(Object.is(e,t))return!0;try{return JSON.stringify(e)===JSON.stringify(t)}catch{return!1}}function Fe(e,t){let n={};for(let a of Object.keys(t)){let o=e[a],r=t[a];if(De(o)&&De(r)){let l=Fe(o,r);Object.keys(l).length>0&&(n[a]=l)}else Rt(o,r)||(n[a]=r)}return n}function Ve(e,t){return Fe(e,t)}function $e(e,t,n){let a=new Set(e);return n?a.add(t):a.delete(t),j.filter(o=>a.has(o))}var ze=require("react");async function je(e){try{if(typeof navigator<"u"&&navigator.clipboard!==void 0)return await navigator.clipboard.writeText(e),!0}catch{}return!1}var c=require("react/jsx-runtime");function At(...e){return e.filter(t=>typeof t=="string"&&t.length>0).join(" ")}function _({icon:e,title:t,action:n,children:a}){return(0,c.jsxs)("section",{className:"hh-section",children:[(0,c.jsxs)("header",{className:"hh-section-head",children:[e===void 0?null:(0,c.jsx)("span",{className:"hh-section-icon",children:e}),(0,c.jsx)("h3",{className:"hh-section-title",children:t}),(0,c.jsx)("span",{className:"hh-section-rule","aria-hidden":"true"}),n===void 0?null:(0,c.jsx)("span",{className:"hh-section-action",children:n})]}),(0,c.jsx)("div",{className:"hh-section-body",children:a})]})}function b({label:e,children:t}){return(0,c.jsxs)("div",{className:"hh-spec",children:[(0,c.jsx)("span",{className:"hh-spec-label",children:e}),(0,c.jsx)("span",{className:"hh-spec-value",children:t})]})}function U({children:e}){return(0,c.jsx)("code",{className:"hh-code",children:e})}function y({children:e}){return typeof e=="string"&&e.length===0?null:(0,c.jsx)("p",{className:"hh-hint",children:e})}function E({tone:e,children:t}){return(0,c.jsx)("span",{className:"hh-chip","data-tone":e??"idle",children:t})}function z({href:e,children:t}){return(0,c.jsxs)("a",{className:"hh-link",href:e,target:"_blank",rel:"noreferrer noopener",children:[t??e,(0,c.jsx)("span",{className:"hh-link-icon","aria-hidden":"true",children:(0,c.jsx)(He,{size:11})})]})}function D({label:e,open:t=!1,children:n}){return(0,c.jsxs)("details",{className:"hh-details",open:t||void 0,children:[(0,c.jsxs)("summary",{className:"hh-summary",children:[(0,c.jsx)("span",{className:"hh-chevron","aria-hidden":"true",children:(0,c.jsx)(Ae,{size:12})}),e]}),(0,c.jsx)("div",{className:"hh-details-body",children:n})]})}function G({tone:e="bad",icon:t=!0,title:n,children:a}){return(0,c.jsxs)("div",{className:"hh-note","data-tone":e,role:e==="bad"?"alert":"note",children:[t?(0,c.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,c.jsx)(te,{size:13})}):null,(0,c.jsxs)("div",{className:"hh-note-body",children:[n===void 0?null:(0,c.jsx)("span",{className:"hh-note-title",children:n}),typeof a=="string"?(0,c.jsx)("p",{children:a}):a]})]})}function Ge({title:e,detail:t}){return(0,c.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,c.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,c.jsx)(te,{size:13})}),(0,c.jsxs)("div",{className:"hh-note-body",children:[(0,c.jsx)("strong",{children:e}),t.length>0?(0,c.jsx)("p",{children:t}):null]})]})}function Z({error:e,title:t}){return e===null?null:(0,c.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,c.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,c.jsx)(te,{size:13})}),(0,c.jsxs)("div",{className:"hh-note-body",children:[(0,c.jsx)("strong",{children:t}),(0,c.jsxs)("p",{children:[(0,c.jsx)("code",{children:e.code})," \u2014 ",e.message]})]})]})}function Ht(){return(0,c.jsx)("span",{className:"hh-spinner","aria-hidden":"true"})}function T({children:e,onClick:t,disabled:n,busy:a,variant:o="default",icon:r,title:l}){let i=n===!0||a===!0;return(0,c.jsxs)("button",{type:"button",className:At("hh-btn",o!=="default"&&`hh-btn-${o}`),onClick:t,disabled:i,title:l,children:[a===!0?(0,c.jsx)(Ht,{}):r,e]})}function ae({label:e,checked:t,disabled:n,onChange:a}){return(0,c.jsxs)("button",{type:"button",role:"switch",className:"hh-switch","aria-checked":t,disabled:n,onClick:()=>a(!t),children:[(0,c.jsx)("span",{className:"hh-switch-track","aria-hidden":"true",children:(0,c.jsx)("span",{className:"hh-switch-knob"})}),(0,c.jsx)("span",{className:"hh-check-label",children:e})]})}function Ke({label:e,checked:t,disabled:n,onChange:a}){return(0,c.jsxs)("label",{className:"hh-check",children:[(0,c.jsx)("input",{type:"checkbox",checked:t,disabled:n,onChange:o=>a(o.target.checked)}),(0,c.jsx)("span",{className:"hh-check-label",children:e})]})}function re({value:e,options:t,disabled:n,label:a,onChange:o}){return(0,c.jsx)("select",{className:"hh-select",value:e,disabled:n,"aria-label":a,onChange:r=>o(r.target.value),children:t.map(r=>(0,c.jsx)("option",{value:r.value,children:r.label},r.value))})}function ue({label:e,meta:t,path:n,hint:a,checked:o,disabled:r,onChange:l}){return(0,c.jsxs)("label",{className:"hh-choice-option","data-disabled":r===!0,children:[(0,c.jsx)("input",{type:"radio",checked:o,disabled:r,onChange:()=>l()}),(0,c.jsxs)("span",{className:"hh-choice-label",children:[(0,c.jsx)("span",{children:e}),a]}),t===void 0?null:(0,c.jsx)("span",{className:"hh-choice-meta",children:t}),n===void 0?null:(0,c.jsx)("span",{className:"hh-choice-path",title:n,children:oe(n)})]})}function We({children:e}){return(0,c.jsxs)(E,{tone:"accent",children:[(0,c.jsx)(Me,{size:10}),e]})}function Q({text:e,copyLabel:t,copiedLabel:n}){let[a,o]=(0,ze.useState)(!1);return(0,c.jsxs)("div",{className:"hh-code-box",children:[(0,c.jsx)("textarea",{className:"hh-code-text",readOnly:!0,value:e,rows:Math.min(e.split(`
`).length,4)}),(0,c.jsx)("div",{className:"hh-btn-row",children:(0,c.jsx)(T,{variant:"ghost",onClick:()=>{je(e).then(o)},children:a?n:t})})]})}var x=require("react/jsx-runtime");function Ye({t:e,status:t,updateSettings:n,uiStyle:a}){let o=t.settings.agentTools,r=o.allow??[],l=j.filter(s=>r.includes(s)).length,i=(s,h)=>{n(u=>({...u,agentTools:{...u.agentTools,allow:$e(u.agentTools.allow??[],s,h)}}))};return(0,x.jsxs)(_,{icon:(0,x.jsx)(Ne,{}),title:e("agentTitle"),action:(0,x.jsx)(E,{children:e("agentCount",{enabled:l,total:j.length})}),children:[(0,x.jsx)(ae,{label:e("agentMaster"),checked:o.enabled,onChange:s=>n(h=>({...h,agentTools:{...h.agentTools,enabled:s}}))}),(0,x.jsx)(y,{children:e("agentApproval")}),a==="detailed"?(0,x.jsx)("div",{className:"hh-tool-cards",children:j.map(s=>(0,x.jsxs)("label",{className:"hh-tool-card",children:[(0,x.jsx)("input",{type:"checkbox",checked:r.includes(s),disabled:!o.enabled,onChange:h=>i(s,h.target.checked)}),(0,x.jsxs)("span",{className:"hh-tool-card-body",children:[(0,x.jsxs)("span",{className:"hh-tool-card-head",children:[(0,x.jsx)("span",{className:"hh-tool-card-name",children:e(pe[s])}),he(s)?(0,x.jsx)(E,{tone:"warn",children:e("agentApprovalBadge")}):null]}),(0,x.jsx)("span",{className:"hh-tool-card-desc",children:e(Le[s])})]})]},s))}):(0,x.jsx)("div",{className:"hh-tools",children:j.map(s=>(0,x.jsx)(Ke,{label:(0,x.jsxs)(x.Fragment,{children:[(0,x.jsx)("span",{className:"hh-check-text",children:e(pe[s])}),he(s)?(0,x.jsx)(E,{tone:"warn",children:e("agentApprovalBadge")}):null]}),checked:r.includes(s),disabled:!o.enabled,onChange:h=>i(s,h)},s))})]})}var tt=require("react");function qe(e){return Array.isArray(e)?e.filter(t=>typeof t=="string"):[]}function Je(e){if(typeof e!="object"||e===null)return null;let t=e.result;if(typeof t!="object"||t===null)return null;let{ok:n,detail:a,commands:o}=t;return n!==!1?null:{detail:typeof a=="string"?a:"",commands:qe(o)}}function Xe(e){return e===void 0?null:{ok:e.ok===!0,action:e.action==="uninstall"?"uninstall":"install",detail:typeof e.detail=="string"?e.detail:"",commands:qe(e.commands)}}var Mt=["enabled-running","enabled-failing","installed-disabled"];function Ze(e,t){let n=e.filter(r=>r.available).map(r=>r.mechanism),a=n.filter(r=>r!=="unsupported"),o=["auto",...a.length>0?a:n];return o.includes(t)||o.push(t),o}function Qe(e,t){return e!==null&&e!==t}function et(e,t){return e===null||e.ok?!1:e.action==="install"?Mt.includes(t):t==="not-installed"}var f=require("react/jsx-runtime");function nt({t:e,status:t,run:n,updateSettings:a,busy:o,uiStyle:r}){let l=t.boot,i=t.settings.autostart,s=l.candidates??[],h=l.commands??[],[u,R]=(0,tt.useState)(null),N=o==="boot.install"||o==="boot.uninstall",K=Ze(s,i.mechanism).map(S=>({value:S,label:S==="auto"?e("bootMechanismAuto"):S})),W=Qe(l.mechanism,i.mechanism),A=l.mechanism!==null,w=S=>e(S==="install"?"bootActionInstall":"bootActionUninstall"),M=async S=>{let X=await n(`boot.${S}`,async()=>S==="install"?k("boot.install",i.mechanism==="auto"?{}:{mechanism:i.mechanism}):k("boot.uninstall",{}));if(!X.ok){R(null);return}let ie=Je(X.value);R(ie===null?null:{ok:!1,action:S,detail:ie.detail,commands:ie.commands})},H=Xe(i.lastAttempt),Y=et(H,l.state),C=u??(Y?null:H);return(0,f.jsxs)(_,{icon:(0,f.jsx)(Te,{}),title:e("bootTitle"),action:(0,f.jsx)(re,{value:i.mechanism,options:K,label:e("bootMechanism"),disabled:o==="settings"||N,onChange:S=>a(X=>({...X,autostart:{...X.autostart,mechanism:S}}))}),children:[(0,f.jsxs)("div",{className:"hh-btn-row",children:[(0,f.jsx)(T,{variant:A?"default":"primary",disabled:i.mechanism==="unsupported",busy:o==="boot.install",onClick:()=>{M("install")},children:e(W?"bootSwitchMode":"bootEnabled")}),(0,f.jsx)(T,{disabled:!A,busy:o==="boot.uninstall",onClick:()=>{M("uninstall")},children:e("bootUninstall")}),(0,f.jsx)(T,{variant:"ghost",busy:o==="boot.verify",onClick:()=>{n("boot.verify",()=>k("boot.verify",{}))},children:e("bootRecheck")})]}),i.enabled&&l.state==="not-installed"?(0,f.jsx)(G,{tone:"warn",children:e("bootRequestedNotInstalled")}):null,C!==null&&!C.ok?(0,f.jsxs)("div",{className:"hh-section-body",children:[(0,f.jsx)(Ge,{title:e("bootAttemptFailed",{action:w(C.action)}),detail:C.detail.length>0?C.detail:e("bootAttemptNoDetail")}),C.commands.length>0?(0,f.jsxs)(f.Fragment,{children:[(0,f.jsx)(y,{children:e("bootAttemptCommands")}),(0,f.jsx)(Q,{text:C.commands.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null]}):null,C!==null&&C.ok?(0,f.jsx)(y,{children:e("bootAttemptSucceeded",{action:w(C.action),detail:C.detail})}):null,h.length>0?(0,f.jsxs)(D,{label:e("bootCommandsLabel"),open:r==="detailed",children:[(0,f.jsx)(y,{children:e("bootCommandsExplain")}),(0,f.jsx)(Q,{text:h.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null,(0,f.jsxs)(D,{label:e("details"),open:r==="detailed",children:[(0,f.jsx)(b,{label:e("bootState"),children:e(ne[l.state]??"bootStateUnsupported")}),(0,f.jsx)(b,{label:e("bootBootCapable"),children:l.bootCapable?e("yes"):e("no")}),(0,f.jsx)(b,{label:e("bootPrivileged"),children:l.privileged?e("yes"):e("no")}),(0,f.jsx)(b,{label:e("bootUnitPath"),children:(0,f.jsx)(U,{children:v(l.unitPath)})}),l.detail.length>0?(0,f.jsx)(y,{children:l.detail}):null]})]})}var P=require("react/jsx-runtime");function It(e){return e.defaultEntryId??"dsh"}function ot({t:e,status:t,run:n,busy:a}){let o=t.entries??[],r=t.settings.manageDsh===!0,l=t.boot.platform==="win32",i=It(t),s=h=>{if(h){let u={id:i,autostart:!0};n("entries.apply",()=>k("entries.apply",{intents:[u]}))}else n("entries.remove",()=>k("entries.remove",{id:i}))};return(0,P.jsxs)(_,{icon:(0,P.jsx)(Pe,{}),title:e("entriesTitle"),children:[(0,P.jsx)(ae,{label:e("entriesManage",{id:i}),checked:r,disabled:a!==null,onChange:s}),(0,P.jsx)(y,{children:e("entriesManageNote",{id:i})}),l?(0,P.jsx)(G,{tone:"warn",children:e("entriesManageWinWarning",{id:i})}):null,o.length===0?(0,P.jsx)(y,{children:e("entriesEmpty",{id:i})}):(0,P.jsx)("div",{className:"hh-list",children:o.map(h=>{let u=h.live;return(0,P.jsxs)("div",{className:"hh-item",children:[(0,P.jsxs)("span",{className:"hh-item-main",children:[(0,P.jsx)("span",{className:"hh-item-name",children:h.intent.id}),(0,P.jsx)(E,{tone:h.exists?"ok":"bad",children:h.exists?e("entriesExists"):e("entriesMissing")}),(0,P.jsx)(E,{children:h.managed?e("entriesManaged"):e("entriesUnmanaged")}),h.drift.length>0?(0,P.jsx)(E,{tone:"warn",children:`${e("entriesDrift")} ${Ie(h.drift)}`}):null]}),(0,P.jsx)("span",{className:"hh-item-spacer"}),(0,P.jsx)("span",{className:"hh-item-meta",children:u===null?e("entriesNotRunning"):`${v(u.status)}${u.pid===null?"":` \xB7 pid ${u.pid}`}`})]},h.intent.id)})})]})}var q=require("react");var p=require("react/jsx-runtime");function Lt({value:e,label:t,hint:n,invalidLabel:a,placeholder:o,disabled:r,onChange:l}){let[i,s]=(0,q.useState)(e===null?"":String(e));(0,q.useEffect)(()=>{s(e===null?"":String(e))},[e]);let h=i.trim()===""?null:Number(i),u=h!==null&&(!Number.isInteger(h)||h<1||h>65535),R=()=>{if(u){s(e===null?"":String(e));return}h!==e&&l(h)};return(0,p.jsxs)("div",{className:"hh-field-block",children:[(0,p.jsxs)("div",{className:"hh-field",children:[(0,p.jsx)("label",{className:"hh-field-label",htmlFor:"hh-panel-port",children:t}),(0,p.jsx)("input",{id:"hh-panel-port",className:"hh-input",type:"number",value:i,placeholder:o,disabled:r,onChange:N=>s(N.target.value),onBlur:R,onKeyDown:N=>{N.key==="Enter"&&R()}})]}),(0,p.jsx)(y,{children:u?a:n})]})}function at({t:e,status:t,run:n,updateSettings:a,busy:o,uiStyle:r}){let l=t.panel,i=t.cli,s=i?.prefer??t.settings.cli?.prefer??"pinned",[h,u]=(0,q.useState)(!1),[R,N]=(0,q.useState)(null),$=i?.version??null,K=$!==null&&l.version!==null,W=l.reachable&&K&&$!==l.version,{dependency:A,global:w}=i===void 0?{dependency:null,global:null}:Ue(i),M=i===void 0?[]:[`pnpm add -g home-hosted@${i.expectedRange}`,`npm install -g home-hosted@${i.expectedRange}`],H=C=>{a(S=>({...S,cli:{...S.cli,prefer:C}}))},Y=async()=>{let C=await n("cli.installGlobal",()=>k("cli.installGlobal",{}));if(!C.ok)return;let S=C.value;N(typeof S?.output=="string"?S.output:null)};return(0,p.jsxs)(_,{icon:(0,p.jsx)(Ce,{}),title:e("panelTitle"),children:[i===void 0?null:(0,p.jsxs)(p.Fragment,{children:[(0,p.jsxs)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("panelCopy"),children:[(0,p.jsx)(ue,{label:e("optionsPreferPinned"),hint:(0,p.jsx)(We,{children:e("optionsRecommended")}),meta:A===null?void 0:v(A.version),path:A?.path??void 0,checked:s==="pinned",disabled:A===null||o==="settings",onChange:()=>H("pinned")}),(0,p.jsx)(ue,{label:e("optionsPreferGlobal"),meta:w===null?void 0:v(w.version),path:w?.path??void 0,checked:s==="global",disabled:w===null||o==="settings",onChange:()=>H("global")})]}),(0,p.jsx)(y,{children:e("panelCopyHint")}),i.source==="config"?(0,p.jsx)(y,{children:e("optionsConfigOverride")}):null,i.source==="path"&&s!=="global"?(0,p.jsx)(y,{children:e("panelCliNotPinned",{range:i.expectedRange})}):null,i.supported?null:(0,p.jsx)(G,{tone:"warn",children:e("panelCliUnsupported")}),i.launcherPath!=null&&i.launcherVersion==null?(0,p.jsx)(G,{tone:"warn",children:e("panelCliLauncherFailed")}):null]}),(0,p.jsx)(Lt,{value:t.settings.panel?.port??null,label:e("panelPort"),hint:l.reachable?e("panelPortHint"):e("panelPortFree"),invalidLabel:e("panelPortInvalid"),placeholder:l.configPort==null?void 0:String(l.configPort),disabled:l.reachable||o!==null,onChange:C=>a(S=>({...S,panel:{...S.panel,port:C}}))}),(0,p.jsxs)("div",{className:"hh-btn-row",children:[l.reachable?null:(0,p.jsx)(T,{variant:"primary",busy:o==="panel.start",onClick:()=>{n("panel.start",()=>k("panel.start",{}))},children:e("panelStart")}),W&&!h?(0,p.jsx)(T,{variant:"primary",onClick:()=>u(!0),children:e("panelReplace",{copy:e(s==="global"?"panelCopyGlobal":"panelCopyPinned")})}):null]}),W&&h?(0,p.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelTakeoverTitle"),children:(0,p.jsxs)("div",{className:"hh-note-body",children:[(0,p.jsx)("strong",{children:e("panelTakeoverTitle")}),(0,p.jsx)("p",{children:e("panelTakeoverBody",{id:t.defaultEntryId??"dsh"})}),(0,p.jsxs)("div",{className:"hh-note-actions",children:[(0,p.jsx)(T,{onClick:()=>u(!1),children:e("confirmCancel")}),(0,p.jsx)(T,{variant:"danger",busy:o==="panel.takeover",onClick:()=>{u(!1),n("panel.takeover",()=>k("panel.takeover",{}))},children:e("confirmReplace")})]})]})}):null,i!==void 0&&w===null?(0,p.jsxs)(D,{label:e("optionsInstallLabel"),open:r==="detailed",children:[(0,p.jsx)(y,{children:e("optionsInstallHint")}),(0,p.jsx)(Q,{text:M.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")}),(0,p.jsx)("div",{className:"hh-btn-row",children:(0,p.jsx)(T,{busy:o==="cli.installGlobal",onClick:()=>{Y()},children:e("optionsInstall")})}),R===null?null:(0,p.jsx)("pre",{className:"hh-output",children:R})]}):null,(0,p.jsxs)(D,{label:e("details"),open:r==="detailed",children:[(0,p.jsx)(b,{label:e("panelHome"),children:(0,p.jsx)(U,{children:l.home})}),(0,p.jsx)(b,{label:e("panelUrl"),children:l.url===null?v(l.url):(0,p.jsx)(z,{href:l.url,children:l.url})}),(0,p.jsx)(b,{label:e("panelVersion"),children:v(l.version)}),(0,p.jsx)(b,{label:e("panelPid"),children:v(l.pid)}),(0,p.jsx)(b,{label:e("panelWriteVia"),children:e(Be[l.writeVia]??"writeViaNone")}),(0,p.jsx)(b,{label:e("panelToken"),children:e(Oe[l.token]??"tokenUnknown")}),i===void 0?null:(0,p.jsxs)(p.Fragment,{children:[(0,p.jsx)(b,{label:e("panelCliSource"),children:`${e(_e[i.source]??"panelCliMissing")} \xB7 ${v(i.version)}`}),(0,p.jsx)(b,{label:e("panelCliPath"),children:(0,p.jsx)(U,{children:v(i.path)})})]}),l.detail.length>0?(0,p.jsx)(y,{children:l.detail}):null]})]})}var Bt=5e3;function ge(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function J(e,t){let n=e[t];return typeof n=="number"&&Number.isFinite(n)?n:null}function rt(e,t){let n=e[t];return typeof n=="string"&&n.length>0?n:null}function it(e){let t=e/1e3;return`${Number.isInteger(t)?t:t.toFixed(1)}s`}function st(e,t,n){if(!ge(e))return L;if(e.enabled!==!0)return n("serversDisabled");let a=rt(e,"mode"),o=ge(e.http)?e.http:null,r;if(a==="http"||a===null&&o!==null){let i=(o===null?null:rt(o,"path"))??"/",s=o===null?null:J(o,"expectStatus"),h=o===null?null:J(o,"expectStatusBelow");r=s!==null?n("serversHealthHttp",{status:s,path:i}):h!==null?n("serversHealthHttpBelow",{status:h,path:i}):n("serversHealthHttpProbe",{path:i})}else t!==null?r=n("serversHealthPort",{port:t}):r=n("serversHealthProbe");let l=J(e,"intervalMs");return l!==null&&l!==Bt?`${r} \xB7 ${n("serversHealthEvery",{seconds:it(l)})}`:r}function lt(e,t){if(!ge(e))return L;if(e.enabled===!1)return t("serversDisabled");let n=J(e,"maxRetries"),a=J(e,"baseDelayMs"),o=J(e,"factor");return n===null||a===null||o===null?t("serversEnabled"):t("serversRestartSummary",{retries:n,base:it(a),factor:o})}var Ot={"not-installed":"idle","installed-disabled":"warn","enabled-running":"ok","enabled-failing":"bad",unsupported:"idle"};function _t(...e){return e.filter(t=>t!==null&&t.length>0).join(" \xB7 ")}function Ut(e,t){let{panel:n}=e;return n.reachable?{key:"panel",tone:"ok",name:t("sigPanel"),state:t("stateAnswering"),meta:v(n.version),href:n.url}:{key:"panel",tone:e.lastError===null?"idle":"bad",name:t("sigPanel"),state:t("stateNotAnswering"),meta:n.home,href:null}}function Dt(e,t){let{boot:n}=e,o=e.settings.autostart.enabled&&n.state==="not-installed"?"warn":Ot[n.state]??"idle",r=n.mechanism??(e.settings.autostart.mechanism==="auto"?null:e.settings.autostart.mechanism);return{key:"autostart",tone:o,name:t("sigAutostart"),state:t(ne[n.state]??"bootStateUnsupported"),meta:r??"",href:null}}function Ft(e,t){let n=e.entries??[],a=t("sigEntry",{id:e.defaultEntryId??"dsh"}),o=e.settings.manageDsh===!0,r=n.filter(h=>!h.exists).length,l=n.filter(h=>h.drift.length>0).length,i=n.find(h=>h.live!==null)?.live??null;return{key:"entry",tone:o?r>0?"bad":l>0?"warn":i!==null?"ok":"warn":"idle",name:a,state:t(o?"stateManaged":"stateNotManaged"),meta:i===null?t("entriesNotRunning"):_t(v(i.status),i.pid===null?null:`pid ${i.pid}`),href:null}}function ct(e,t){return[Ut(e,t),Dt(e,t),Ft(e,t)]}function dt(e,t){let n=e.filter(a=>a.status==="running").length;return t("serversCount",{running:n,total:e.length})}var d=require("react/jsx-runtime");function ht({t:e,server:t,run:n,busy:a,offline:o}){let r=t.status==="running";return(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(T,{variant:"ghost",disabled:o||r,busy:a===`servers.start:${t.id}`,onClick:()=>{n(`servers.start:${t.id}`,()=>k("servers.start",{id:t.id}))},children:e("serversStart")}),(0,d.jsx)(T,{variant:"ghost",disabled:o||!r,busy:a===`servers.stop:${t.id}`,onClick:()=>{n(`servers.stop:${t.id}`,()=>k("servers.stop",{id:t.id}))},children:e("serversStop")}),(0,d.jsx)(T,{variant:"ghost",disabled:o||!r,busy:a===`servers.restart:${t.id}`,onClick:()=>{n(`servers.restart:${t.id}`,()=>k("servers.restart",{id:t.id}))},children:e("serversRestart")})]})}function Vt({text:e}){return e.length===0?(0,d.jsx)(d.Fragment,{children:L}):(0,d.jsx)("span",{className:"hh-nowrap",title:e,children:(0,d.jsx)(U,{children:e})})}function pt({t:e,status:t,run:n,busy:a,uiStyle:o}){let r=t.servers??[],l=!t.panel.reachable||a!==null,i=new Map((t.entries??[]).map(s=>[s.intent.id,s.intent]));return(0,d.jsxs)(_,{icon:(0,d.jsx)(Ee,{}),title:e("serversTitle"),action:(0,d.jsx)(E,{children:dt(r,e)}),children:[(0,d.jsx)(y,{children:t.panel.url===null?e("serversHintNoPanel"):(0,d.jsxs)(d.Fragment,{children:[`${e("serversHintPanel")} `,(0,d.jsx)(z,{href:t.panel.url,children:t.panel.url})]})}),r.length===0?(0,d.jsx)(y,{children:e("serversEmpty")}):(0,d.jsx)("div",{className:o==="detailed"?"hh-cards":"hh-list",children:r.map(s=>{let h=s.status==="running",u=s.config;if(o==="detailed"){let R=(u.args??[]).join(" "),N=u.cwd??"",$=i.get(s.id)?.persistent;return(0,d.jsxs)("article",{className:"hh-card",children:[(0,d.jsxs)("div",{className:"hh-card-head",children:[(0,d.jsx)("span",{className:"hh-item-name",children:s.id}),(0,d.jsx)(E,{tone:h?"ok":"idle",children:v(s.status)}),$===!0?(0,d.jsx)("span",{title:e("serversPersistentHint"),children:(0,d.jsx)(E,{tone:"accent",children:e("serversPersistent")})}):null,(0,d.jsx)("span",{className:"hh-item-spacer"}),(0,d.jsx)("span",{className:"hh-item-actions",children:(0,d.jsx)(ht,{t:e,server:s,run:n,busy:a,offline:l})})]}),(0,d.jsxs)("div",{className:"hh-card-facts",children:[(0,d.jsx)(b,{label:e("serversUrl"),children:s.url===null?v(s.url):(0,d.jsx)(z,{href:s.url,children:s.url})}),(0,d.jsx)(b,{label:e("serversPid"),children:v(s.pid)}),(0,d.jsx)(b,{label:e("serversPort"),children:v(u.port)}),(0,d.jsx)(b,{label:e("serversAutostart"),children:u.autostart===void 0?L:u.autostart?e("yes"):e("no")})]}),(0,d.jsxs)(D,{label:e("serversConfiguration"),children:[(0,d.jsx)(b,{label:e("serversCommand"),children:u.command===void 0||u.command.length===0?L:(0,d.jsx)("span",{className:"hh-nowrap",title:u.command,children:(0,d.jsx)(U,{children:u.command})})}),(0,d.jsx)(b,{label:e("serversArgs"),children:(0,d.jsx)(Vt,{text:R})}),(0,d.jsx)(b,{label:e("serversCwd"),children:N.length===0?L:(0,d.jsx)("span",{className:"hh-nowrap",title:N,children:(0,d.jsx)(U,{children:oe(N)})})}),(0,d.jsx)(b,{label:e("serversOnPortConflict"),children:v(u.onPortConflict)}),(0,d.jsx)(b,{label:e("serversHealth"),children:st(u.health,u.port??null,e)}),(0,d.jsx)(b,{label:e("serversRestartPolicy"),children:lt(u.restart,e)})]}),(0,d.jsx)(D,{label:e("serversRawConfig"),children:(0,d.jsx)("pre",{className:"hh-output",children:JSON.stringify(u,null,2)})})]},s.id)}return(0,d.jsxs)("div",{className:"hh-item",children:[(0,d.jsxs)("span",{className:"hh-item-main",children:[(0,d.jsx)("span",{className:"hh-item-name",children:s.id}),(0,d.jsx)(E,{tone:h?"ok":"idle",children:v(s.status)}),s.url===null?null:(0,d.jsx)(z,{href:s.url,children:s.url})]}),(0,d.jsx)("span",{className:"hh-item-spacer"}),s.pid===null?null:(0,d.jsx)("span",{className:"hh-item-meta",children:`${e("serversPid")} ${s.pid}`}),(0,d.jsx)("span",{className:"hh-item-actions",children:(0,d.jsx)(ht,{t:e,server:s,run:n,busy:a,offline:l})})]},s.id)})})]})}var me=`
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
`;var g=require("react/jsx-runtime");function $t({signal:e}){return(0,g.jsxs)("div",{className:"hh-signal","data-tone":e.tone,children:[(0,g.jsx)("span",{className:"hh-signal-dot","aria-hidden":"true"}),(0,g.jsx)("span",{className:"hh-signal-name",children:e.name}),(0,g.jsx)("span",{className:"hh-signal-state",children:e.state}),e.meta.length===0&&e.href===null?null:(0,g.jsxs)("span",{className:"hh-signal-meta",children:[e.meta,e.href===null?null:(0,g.jsxs)(g.Fragment,{children:[e.meta.length===0?null:" \xB7 ",(0,g.jsx)(z,{href:e.href,children:e.href})]})]})]})}function ut(e){let t=ye(e.t),{data:n,error:a,loading:o,refresh:r}=ke(),[l,i]=(0,F.useState)(null),[s,h]=(0,F.useState)(null),u=(0,F.useCallback)((w,M)=>(h(w),i(null),(async()=>{try{let H=await M();return H.ok||i(H.error),H}catch(H){let Y={code:"client",message:H instanceof Error?H.message:String(H)};return i(Y),{ok:!1,error:Y}}finally{h(null),await r()}})()),[r]),R=(0,F.useCallback)(w=>{if(n===null)return;let M=Ve(n.settings,w(n.settings));Object.keys(M).length!==0&&u("settings",()=>Se(M))},[n,u]),N=n?.settings.uiStyle??"detailed",[$,K]=(0,F.useState)(N);(0,F.useEffect)(()=>{K(N)},[N]);let W=w=>{K(w),R(M=>({...M,uiStyle:w}))};if(n===null)return(0,g.jsxs)("div",{className:"hh-root",children:[(0,g.jsx)("style",{children:me}),o?(0,g.jsx)(y,{children:t("loading")}):(0,g.jsxs)(g.Fragment,{children:[(0,g.jsx)(Z,{error:a??{code:"status",message:t("statusUnavailable")},title:t("errorTitle")}),(0,g.jsx)("div",{className:"hh-btn-row",children:(0,g.jsx)(T,{onClick:()=>{r()},children:t("retry")})})]})]});let A={t,status:n,run:u,updateSettings:R,busy:s,uiStyle:$};return(0,g.jsxs)("div",{className:"hh-root",children:[(0,g.jsx)("style",{children:me}),(0,g.jsxs)("header",{className:"hh-head",children:[(0,g.jsx)("h2",{className:"hh-title",children:t("tab")}),(0,g.jsx)("span",{className:"hh-head-spacer"}),(0,g.jsx)(re,{value:$,label:t("uiStyleLabel"),disabled:s==="settings",options:[{value:"detailed",label:t("uiStyleDetailed")},{value:"compact",label:t("uiStyleCompact")}],onChange:w=>W(w)}),(0,g.jsx)(T,{variant:"ghost",icon:(0,g.jsx)(Re,{size:13}),busy:s==="status.refresh",onClick:()=>{u("status.refresh",()=>k("status",{refresh:!0}))},children:t("refresh")})]}),(0,g.jsx)("div",{className:"hh-signals","data-busy":s!==null,children:ct(n,t).map(w=>(0,g.jsx)($t,{signal:w},w.key))}),n.lastError===null?null:(0,g.jsx)(Z,{error:{code:"panel",message:n.lastError},title:t("errorTitle")}),(0,g.jsx)(Z,{error:a,title:t("errorTitle")}),(0,g.jsx)(Z,{error:l,title:t("errorTitle")}),(0,g.jsx)(at,{...A}),(0,g.jsx)(nt,{...A}),(0,g.jsx)(ot,{...A}),(0,g.jsx)(Ye,{...A}),(0,g.jsx)(pt,{...A})]})}var jt=["slots","locale"],gt="[dsh-home-hosted]";function V(e,t){t===void 0?console.warn(`${gt} ${e}`):console.warn(`${gt} ${e}`,t)}function mt(e,t){try{let n=e.get?.(t);if(n!=null)return n}catch{}try{let n=e[t];if(n!=null)return n}catch{}}function ft(e,t,n){if(typeof e.effect=="function")try{e.effect(t,n);return}catch(a){V(`registering the effect "${n}" failed`,a);return}try{t()}catch(a){V(`the effect "${n}" failed`,a)}}function zt(e){try{let t=mt(e,"locale"),n=ve(t);t===void 0?V("the locale service is unavailable; the page keeps its bundled English copy"):ft(e,()=>{let o=[];try{o.push(t.register(ee,{en:le,zh:fe}))}catch(r){V("registering the dictionaries failed",r)}return()=>{for(let r of o)try{r()}catch(l){V("disposing a dictionary failed",l)}}},"dsh-home-hosted: dictionaries");let a=mt(e,"slots");if(a===void 0){V("the slots service is unavailable; the settings section was not registered");return}ft(e,()=>{try{return a.inject("settings.section",()=>{try{return a.register({name:"settings.section",id:"home-hosted",order:60,label:()=>n("tab"),locale:ee,inject:()=>({t:n})},ut)}catch(o){return V("registering the settings section failed",o),()=>{}}})}catch(o){return V("injecting into settings.section failed",o),()=>{}}},"dsh-home-hosted: settings section")}catch(t){V("client bootstrap failed",t)}}

return module.exports; } });
