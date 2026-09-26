window.__ModuleLoader__.load({ id: "dsh-home-hosted", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";var ne=Object.defineProperty;var lt=Object.getOwnPropertyDescriptor;var dt=Object.getOwnPropertyNames;var ct=Object.prototype.hasOwnProperty;var ht=(e,t)=>{for(var n in t)ne(e,n,{get:t[n],enumerable:!0})},pt=(e,t,n,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of dt(t))!ct.call(e,r)&&r!==n&&ne(e,r,{get:()=>t[r],enumerable:!(a=lt(t,r))||a.enumerable});return e};var ut=e=>pt(ne({},"__esModule",{value:!0}),e);var Bt={};ht(Bt,{apply:()=>Ht,inject:()=>Mt});module.exports=ut(Bt);var X="homeHosted",oe={tab:"Home Hosted",loading:"Loading\u2026",refresh:"Refresh",retry:"Retry",errorTitle:"Error",statusUnavailable:"The panel did not answer.",yes:"Yes",no:"No",copy:"Copy",copied:"Copied",details:"Details",sigPanel:"Panel",sigAutostart:"Autostart",sigEntry:"{id} entry",stateAnswering:"answering",stateNotAnswering:"not answering",stateManaged:"managed",stateNotManaged:"not managed",panelTitle:"Panel",panelCopy:"Which copy runs the panel",panelCopyHint:"The pinned copy ships with this plugin; the global one is on PATH.",optionsPreferPinned:"Pinned dependency",optionsPreferGlobal:"Global install",optionsRecommended:"recommended",optionsConfigOverride:"The plugin row sets homeHostedCommand, and that always wins.",optionsInstallLabel:"Install a global copy",optionsInstallHint:"No global install was found. Install the pinned range, then choose it above:",optionsInstall:"Install globally",panelHome:"$HHOSTED_HOME",panelUrl:"URL",panelVersion:"Version",panelPid:"PID",panelWriteVia:"Writes via",panelToken:"API token",panelCliSource:"CLI",panelCliPath:"CLI path",panelCliConfig:"configured command",panelCliDependency:"pinned dependency",panelCliPathSource:"global install (PATH)",panelCliMissing:"not found",panelCliNotPinned:"This host resolved a global home-hosted instead of the pinned copy ({range}).",panelCliUnsupported:"This home-hosted is older than the oldest release the plugin supports.",panelCliLauncherFailed:"The boot launcher did not answer, so a boot entry may fail to start the panel.",panelPort:"Panel port",panelPortHint:"Only changeable while the panel is stopped.",panelPortFree:"Leave empty to use the port in the config.",panelPortInvalid:"Enter a port between 1 and 65535.",panelStart:"Start the panel",panelReplace:"Replace with {version}",panelAlreadyPreferred:"The running panel is already the preferred copy.",panelTakeoverTitle:"Replace the running panel?",panelTakeoverBody:"This stops the panel and every server it supervises \u2014 this session included, so the page disconnects. It needs the {id} entry adopted with autostart on.",confirmCancel:"Cancel",confirmReplace:"Replace",writeViaApi:"authenticated API",writeViaFile:"config file",writeViaNone:"unavailable",tokenEnrolled:"enrolled",tokenPresent:"present",tokenAbsent:"absent",tokenUnknown:"unknown",bootTitle:"Autostart",bootEnabled:"Enable autostart",bootUninstall:"Uninstall",bootSwitchMode:"Switch autostart",bootRecheck:"Re-check",bootMechanism:"Mechanism",bootMechanismAuto:"Automatic",bootState:"State",bootStateNotInstalled:"not installed",bootStateInstalledDisabled:"installed, off",bootStateEnabledRunning:"enabled, running",bootStateEnabledFailing:"enabled, failing",bootStateUnsupported:"unsupported",bootBootCapable:"Starts before login",bootPrivileged:"This process can install it",bootUnitPath:"Unit path",bootCommandsLabel:"Install by hand",bootCommandsExplain:"This process cannot elevate. Run these commands to install autostart:",bootRequestedNotInstalled:"Autostart is requested, but no boot entry is installed.",bootActionInstall:"install",bootActionUninstall:"uninstall",bootAttemptFailed:"{action} failed",bootAttemptSucceeded:"{action} succeeded \u2014 {detail}",bootAttemptNoDetail:"The host did not explain the refusal.",bootAttemptCommands:"Run these yourself:",entriesTitle:"Managed entry",entriesManage:"Manage {id}",entriesManageNote:"Hands {id} to home-hosted: boot autostart, panel control, port reclaim.",entriesManageWinWarning:"On Windows, `{id}` is managed via the `kill` onPortConflict policy, so when it is restarted detached by another plugin it may briefly fail to boot while home-hosted reclaims the process and port.",entriesEmpty:"{id} is not managed yet.",entriesExists:"exists",entriesMissing:"missing",entriesManaged:"managed",entriesUnmanaged:"unmanaged",entriesDrift:"drift",entriesNotRunning:"not running",agentTitle:"Agent tools",agentCount:"{enabled} of {total} on",agentMaster:"Let the agent use these tools",agentApproval:"Tools that change something ask for approval first.",agentApprovalBadge:"approval",agentToolStatus:"Status",agentToolServersList:"List servers",agentToolServersLifecycle:"Start, stop, restart",agentToolServersEdit:"Create, update, delete",agentToolAutostartManage:"Boot autostart",agentToolUiManage:"Panel UI",serversTitle:"Servers",serversCount:"{running} of {total} running",serversHintPanel:"Entries are managed in the home-hosted panel:",serversHintNoPanel:"Entries cannot be managed right now: the panel is not running.",serversEmpty:"The panel reports no servers.",serversPid:"PID",serversStart:"Start",serversStop:"Stop",serversRestart:"Restart"},de={tab:"Home Hosted",loading:"\u52A0\u8F7D\u4E2D\u2026",refresh:"\u5237\u65B0",retry:"\u91CD\u8BD5",errorTitle:"\u9519\u8BEF",statusUnavailable:"\u9762\u677F\u6CA1\u6709\u54CD\u5E94\u3002",yes:"\u662F",no:"\u5426",copy:"\u590D\u5236",copied:"\u5DF2\u590D\u5236",details:"\u8BE6\u60C5",sigPanel:"\u9762\u677F",sigAutostart:"\u5F00\u673A\u81EA\u542F",sigEntry:"{id} \u6761\u76EE",stateAnswering:"\u54CD\u5E94\u4E2D",stateNotAnswering:"\u672A\u54CD\u5E94",stateManaged:"\u5DF2\u63A5\u7BA1",stateNotManaged:"\u672A\u63A5\u7BA1",panelTitle:"\u9762\u677F",panelCopy:"\u7531\u54EA\u4E2A\u526F\u672C\u8FD0\u884C\u9762\u677F",panelCopyHint:"\u56FA\u5B9A\u526F\u672C\u968F\u63D2\u4EF6\u4E00\u8D77\u5B89\u88C5\uFF1B\u5168\u5C40\u526F\u672C\u6765\u81EA PATH\u3002",optionsPreferPinned:"\u56FA\u5B9A\u4F9D\u8D56",optionsPreferGlobal:"\u5168\u5C40\u5B89\u88C5",optionsRecommended:"\u63A8\u8350",optionsConfigOverride:"\u63D2\u4EF6\u884C\u4E2D\u7684 homeHostedCommand \u4F18\u5148\u7EA7\u6700\u9AD8\uFF0C\u59CB\u7EC8\u751F\u6548\u3002",optionsInstallLabel:"\u5B89\u88C5\u5168\u5C40\u526F\u672C",optionsInstallHint:"\u672A\u627E\u5230\u5168\u5C40\u5B89\u88C5\u3002\u5B89\u88C5\u56FA\u5B9A\u7248\u672C\u8303\u56F4\u540E\uFF0C\u5728\u4E0A\u65B9\u9009\u62E9\u5B83\uFF1A",optionsInstall:"\u5168\u5C40\u5B89\u88C5",panelHome:"$HHOSTED_HOME",panelUrl:"URL",panelVersion:"\u7248\u672C",panelPid:"PID",panelWriteVia:"\u5199\u5165\u65B9\u5F0F",panelToken:"API \u4EE4\u724C",panelCliSource:"CLI",panelCliPath:"CLI \u8DEF\u5F84",panelCliConfig:"\u914D\u7F6E\u7684\u547D\u4EE4",panelCliDependency:"\u56FA\u5B9A\u7684\u4F9D\u8D56\u7248\u672C",panelCliPathSource:"\u5168\u5C40\u5B89\u88C5\uFF08PATH\uFF09",panelCliMissing:"\u672A\u627E\u5230",panelCliNotPinned:"\u6B64\u5BBF\u4E3B\u89E3\u6790\u5230\u7684\u662F\u5168\u5C40 home-hosted\uFF0C\u800C\u4E0D\u662F\u56FA\u5B9A\u526F\u672C\uFF08{range}\uFF09\u3002",panelCliUnsupported:"\u6B64 home-hosted \u65E9\u4E8E\u63D2\u4EF6\u652F\u6301\u7684\u6700\u8001\u7248\u672C\u3002",panelCliLauncherFailed:"\u5F00\u673A\u542F\u52A8\u5668\u6CA1\u6709\u5E94\u7B54\uFF0C\u5F00\u673A\u9879\u53EF\u80FD\u65E0\u6CD5\u542F\u52A8\u9762\u677F\u3002",panelPort:"\u9762\u677F\u7AEF\u53E3",panelPortHint:"\u4EC5\u5728\u9762\u677F\u505C\u6B62\u65F6\u53EF\u4FEE\u6539\u3002",panelPortFree:"\u7559\u7A7A\u5219\u4F7F\u7528\u914D\u7F6E\u6587\u4EF6\u4E2D\u7684\u7AEF\u53E3\u3002",panelPortInvalid:"\u8BF7\u8F93\u5165 1 \u5230 65535 \u4E4B\u95F4\u7684\u7AEF\u53E3\u3002",panelStart:"\u542F\u52A8\u9762\u677F",panelReplace:"\u66FF\u6362\u4E3A {version}",panelAlreadyPreferred:"\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\u5DF2\u7ECF\u662F\u9996\u9009\u526F\u672C\u3002",panelTakeoverTitle:"\u66FF\u6362\u6B63\u5728\u8FD0\u884C\u7684\u9762\u677F\uFF1F",panelTakeoverBody:"\u8FD9\u4F1A\u505C\u6B62\u9762\u677F\u4EE5\u53CA\u5B83\u76D1\u7BA1\u7684\u6240\u6709\u670D\u52A1\u5668\u2014\u2014\u5305\u62EC\u672C\u4F1A\u8BDD\uFF0C\u56E0\u6B64\u672C\u9875\u9762\u4F1A\u65AD\u5F00\u8FDE\u63A5\u3002\u4EC5\u5F53 {id} \u6761\u76EE\u5DF2\u88AB\u63A5\u7BA1\u4E14\u542F\u7528\u81EA\u542F\u65F6\u624D\u53EF\u7528\u3002",confirmCancel:"\u53D6\u6D88",confirmReplace:"\u66FF\u6362",writeViaApi:"\u5DF2\u8BA4\u8BC1 API",writeViaFile:"\u914D\u7F6E\u6587\u4EF6",writeViaNone:"\u4E0D\u53EF\u7528",tokenEnrolled:"\u5DF2\u767B\u8BB0",tokenPresent:"\u5DF2\u5B58\u5728",tokenAbsent:"\u4E0D\u5B58\u5728",tokenUnknown:"\u672A\u77E5",bootTitle:"\u5F00\u673A\u81EA\u542F",bootEnabled:"\u542F\u7528\u5F00\u673A\u81EA\u542F",bootUninstall:"\u5378\u8F7D",bootSwitchMode:"\u5207\u6362\u81EA\u542F\u673A\u5236",bootRecheck:"\u91CD\u65B0\u68C0\u67E5",bootMechanism:"\u673A\u5236",bootMechanismAuto:"\u81EA\u52A8",bootState:"\u72B6\u6001",bootStateNotInstalled:"\u672A\u5B89\u88C5",bootStateInstalledDisabled:"\u5DF2\u5B89\u88C5\uFF0C\u672A\u542F\u7528",bootStateEnabledRunning:"\u5DF2\u542F\u7528\uFF0C\u8FD0\u884C\u4E2D",bootStateEnabledFailing:"\u5DF2\u542F\u7528\uFF0C\u542F\u52A8\u5931\u8D25",bootStateUnsupported:"\u4E0D\u652F\u6301",bootBootCapable:"\u767B\u5F55\u524D\u542F\u52A8",bootPrivileged:"\u672C\u8FDB\u7A0B\u53EF\u5B89\u88C5",bootUnitPath:"\u5355\u5143\u6587\u4EF6\u8DEF\u5F84",bootCommandsLabel:"\u624B\u52A8\u5B89\u88C5",bootCommandsExplain:"\u672C\u8FDB\u7A0B\u65E0\u6CD5\u63D0\u6743\u3002\u8BF7\u81EA\u884C\u6267\u884C\u4EE5\u4E0B\u547D\u4EE4\u6765\u5B89\u88C5\u81EA\u542F\uFF1A",bootRequestedNotInstalled:"\u5DF2\u8BF7\u6C42\u5F00\u673A\u81EA\u542F\uFF0C\u4F46\u5C1A\u672A\u5B89\u88C5\u4EFB\u4F55\u5F00\u673A\u9879\u3002",bootActionInstall:"\u5B89\u88C5",bootActionUninstall:"\u5378\u8F7D",bootAttemptFailed:"{action}\u5931\u8D25",bootAttemptSucceeded:"{action}\u6210\u529F \u2014 {detail}",bootAttemptNoDetail:"\u5BBF\u4E3B\u6CA1\u6709\u8BF4\u660E\u5931\u8D25\u539F\u56E0\u3002",bootAttemptCommands:"\u4F60\u53EF\u4EE5\u81EA\u884C\u8FD0\u884C\u4EE5\u4E0B\u547D\u4EE4\uFF1A",entriesTitle:"\u53D7\u7BA1\u6761\u76EE",entriesManage:"\u63A5\u7BA1 {id}",entriesManageNote:"\u628A {id} \u4EA4\u7ED9 home-hosted\uFF1A\u5F00\u673A\u81EA\u542F\u3001\u9762\u677F\u63A7\u5236\u3001\u7AEF\u53E3\u56DE\u6536\u3002",entriesManageWinWarning:"\u5728 Windows \u4E0A\uFF0C`{id}` \u901A\u8FC7 `kill` \u7AEF\u53E3\u51B2\u7A81\u7B56\u7565\u7BA1\u7406\uFF1B\u5F53\u5B83\u88AB\u5176\u4ED6\u63D2\u4EF6\u4EE5\u5206\u79BB\u65B9\u5F0F\u91CD\u542F\u65F6\uFF0Chome-hosted \u56DE\u6536\u8FDB\u7A0B\u4E0E\u7AEF\u53E3\u671F\u95F4\u53EF\u80FD\u77ED\u6682\u65E0\u6CD5\u542F\u52A8\u3002",entriesEmpty:"\u5C1A\u672A\u63A5\u7BA1 {id}\u3002",entriesExists:"\u5B58\u5728",entriesMissing:"\u7F3A\u5931",entriesManaged:"\u5DF2\u63A5\u7BA1",entriesUnmanaged:"\u672A\u63A5\u7BA1",entriesDrift:"\u6F02\u79FB",entriesNotRunning:"\u672A\u8FD0\u884C",agentTitle:"Agent \u5DE5\u5177",agentCount:"\u5DF2\u5F00\u542F {enabled}/{total}",agentMaster:"\u5141\u8BB8 Agent \u8C03\u7528\u8FD9\u4E9B\u5DE5\u5177",agentApproval:"\u4F1A\u6539\u53D8\u72B6\u6001\u7684\u5DE5\u5177\u5728\u8FD0\u884C\u524D\u4F1A\u8BF7\u6C42\u6279\u51C6\u3002",agentApprovalBadge:"\u9700\u6279\u51C6",agentToolStatus:"\u67E5\u770B\u72B6\u6001",agentToolServersList:"\u5217\u51FA\u670D\u52A1\u5668",agentToolServersLifecycle:"\u542F\u52A8\u3001\u505C\u6B62\u3001\u91CD\u542F",agentToolServersEdit:"\u521B\u5EFA\u3001\u66F4\u65B0\u3001\u5220\u9664",agentToolAutostartManage:"\u5F00\u673A\u81EA\u542F",agentToolUiManage:"\u9762\u677F UI",serversTitle:"\u670D\u52A1\u5668",serversCount:"{total} \u4E2A\u4E2D {running} \u4E2A\u8FD0\u884C\u4E2D",serversHintPanel:"\u5728 home-hosted \u9762\u677F\u4E2D\u7BA1\u7406\u6761\u76EE\uFF1A",serversHintNoPanel:"\u5F53\u524D\u65E0\u6CD5\u7BA1\u7406\u6761\u76EE\uFF1A\u9762\u677F\u6CA1\u6709\u8FD0\u884C\u3002",serversEmpty:"\u9762\u677F\u672A\u62A5\u544A\u4EFB\u4F55\u670D\u52A1\u5668\u3002",serversPid:"PID",serversStart:"\u542F\u52A8",serversStop:"\u505C\u6B62",serversRestart:"\u91CD\u542F"};function gt(e,t){return t===void 0?e:e.replace(/\{(\w+)\}/g,(n,a)=>Object.prototype.hasOwnProperty.call(t,a)?String(t[a]):n)}var ce=(e,t)=>gt(oe[e]??e,t);function he(e){if(e!==void 0)try{let t=e.bind(X);if(typeof t=="function")return t}catch{}return ce}function pe(e,t=ce){return e===void 0?t:(n,a)=>{let r;try{r=e(n,a)}catch{r=void 0}return r===void 0||r.length===0||r===n?t(n,a):r}}var G=require("react");var H=require("react");var ue="/home-hosted";var V=["status","servers_list","servers_lifecycle","servers_edit","autostart_manage","ui_manage"],ge=["servers_lifecycle","servers_edit","autostart_manage","ui_manage"],mt=2,_t={version:mt,autostart:{enabled:!1,mechanism:"auto"},manageDsh:!1,entries:[],agentTools:{enabled:!0,allow:[...V]},panel:{port:null},cli:{prefer:"pinned"}};var ft="/api";function A(e,t,n){return{ok:!1,error:n===void 0?{code:e,message:t}:{code:e,message:t,detail:n}}}function ae(e){return typeof e=="object"&&e!==null}function bt(e){return e instanceof Error?e.message:String(e)}function vt(e){if(!ae(e))return A("bad-response","The panel returned a non-object response");if(typeof e.v=="number"&&e.v!==1)return A("version-mismatch",`Response protocol v${e.v} does not match the expected v${1}`);let t=e.result;if(!ae(t))return A("bad-response","The panel returned no result");if(t.ok===!0)return"value"in t?{ok:!0,value:t.value}:A("bad-response","A successful response carried no value");if(t.ok===!1){let n=t.error;return ae(n)&&typeof n.message=="string"?A(typeof n.code=="string"?n.code:"error",n.message,n.detail):A("error","The panel reported a failure without a message")}return A("bad-response","The panel returned an unrecognised result")}async function v(e,t,n={}){let a=n.fetch??globalThis.fetch;if(typeof a!="function")return A("no-fetch","No fetch implementation is available");let r={v:1,endpoint:e,payload:t},o;try{o=await a(`${ft}${ue}`,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(r)})}catch(d){return A("network",bt(d))}if(!o.ok){let d=o.statusText.length>0?` ${o.statusText}`:"";return A("http",`HTTP ${o.status}${d}`)}let i;try{i=await o.json()}catch{return A("bad-json","The panel returned invalid JSON")}return vt(i)}function me(e,t={}){return v("settings.update",{patch:e},t)}var xt=5e3;function fe(e=xt){let[t,n]=(0,H.useState)(null),[a,r]=(0,H.useState)(null),[o,i]=(0,H.useState)(!0),d=(0,H.useRef)(!0),g=(0,H.useCallback)(async()=>{let c=await v("status",{});d.current&&(c.ok?(n(c.value),r(null)):r(c.error),i(!1))},[]);return(0,H.useEffect)(()=>{d.current=!0,g();let c=setInterval(()=>{g()},e);return()=>{d.current=!1,clearInterval(c)}},[g,e]),{data:t,error:a,loading:o,refresh:g}}var p=require("react/jsx-runtime");function B({size:e=14,children:t}){return(0,p.jsx)("svg",{width:e,height:e,viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:1.4,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",focusable:"false",children:t})}function be(e){return(0,p.jsxs)(B,{...e,children:[(0,p.jsx)("rect",{x:"2.2",y:"3",width:"11.6",height:"7.6",rx:"1.6"}),(0,p.jsx)("path",{d:"M6.6 13.4h2.8M8 10.6v2.8"})]})}function ve(e){return(0,p.jsxs)(B,{...e,children:[(0,p.jsx)("path",{d:"M8 2.4v5.2"}),(0,p.jsx)("path",{d:"M11.6 4.4a5 5 0 1 1-7.2 0"})]})}function xe(e){return(0,p.jsxs)(B,{...e,children:[(0,p.jsx)("rect",{x:"2.2",y:"2.8",width:"11.6",height:"10.4",rx:"1.6"}),(0,p.jsx)("path",{d:"M5.2 6.9l1.8 1.8-1.8 1.8M8.7 10.5h2.2"})]})}function ye(e){return(0,p.jsxs)(B,{...e,children:[(0,p.jsx)("path",{d:"M2.4 5.4h11.2M2.4 10.6h11.2"}),(0,p.jsx)("circle",{cx:"6",cy:"5.4",r:"1.6",fill:"currentColor",stroke:"none"}),(0,p.jsx)("circle",{cx:"10.4",cy:"10.6",r:"1.6",fill:"currentColor",stroke:"none"})]})}function we(e){return(0,p.jsxs)(B,{...e,children:[(0,p.jsx)("path",{d:"M8 2.3l5.4 2.9L8 8.1 2.6 5.2z"}),(0,p.jsx)("path",{d:"M2.6 8.6l5.4 2.9 5.4-2.9"}),(0,p.jsx)("path",{d:"M2.6 11.4l5.4 2.9 5.4-2.9"})]})}function Se(e){return(0,p.jsxs)(B,{...e,children:[(0,p.jsx)("path",{d:"M13.4 9.4A5.5 5.5 0 1 1 12.2 4.4"}),(0,p.jsx)("path",{d:"M12.8 1.7v2.9h-2.9"})]})}function ke(e){return(0,p.jsx)(B,{...e,children:(0,p.jsx)("path",{d:"M6.2 3.8L10.4 8l-4.2 4.2"})})}function Ce(e){return(0,p.jsxs)(B,{...e,children:[(0,p.jsx)("path",{d:"M6.6 3.4H3.4v9.2h9.2V9.4"}),(0,p.jsx)("path",{d:"M9.4 3.4h3.2v3.2M12.6 3.4L7.8 8.2"})]})}function Z(e){return(0,p.jsxs)(B,{...e,children:[(0,p.jsx)("path",{d:"M8 2.6l5.7 10.2H2.3z"}),(0,p.jsx)("path",{d:"M8 6.4v3.1M8 11.5h.01"})]})}function Te(e){return(0,p.jsx)(B,{...e,children:(0,p.jsx)("path",{d:"M3 8.4l3.3 3.3L13 5"})})}var ie="\u2014";function w(e){if(e==null)return ie;let t=String(e);return t.length>0?t:ie}function Pe(e){return e.length>0?e.join(", "):ie}function Ne(e){return ge.includes(e)}var Ee={status:"agentToolStatus",servers_list:"agentToolServersList",servers_lifecycle:"agentToolServersLifecycle",servers_edit:"agentToolServersEdit",autostart_manage:"agentToolAutostartManage",ui_manage:"agentToolUiManage"},Re={api:"writeViaApi",file:"writeViaFile",none:"writeViaNone"},Ae={enrolled:"tokenEnrolled",present:"tokenPresent",absent:"tokenAbsent",unknown:"tokenUnknown"},Q={"not-installed":"bootStateNotInstalled","installed-disabled":"bootStateInstalledDisabled","enabled-running":"bootStateEnabledRunning","enabled-failing":"bootStateEnabledFailing",unsupported:"bootStateUnsupported"},Ie={config:"panelCliConfig",dependency:"panelCliDependency",path:"panelCliPathSource",none:"panelCliMissing"};function Me(e,t=52){if(e.length<=t)return e;let n=e.includes("\\")?"\\":"/",a=e.split(/[\\/]/).filter(d=>d.length>0);if(a.length<4)return e;let r=/^[A-Za-z]:$/.test(a[0]??"")?3:2;if(a.length<=r)return e;let i=`${/^[\\/]/.test(e)?n:""}${a.slice(0,r).join(n)}${n}\u2026${n}${a.slice(-2).join(n)}`;return i.length<e.length?i:e}function He(e){let t=n=>e.source===n&&e.path!==null?{source:n,path:e.path,version:e.version}:null;return{dependency:e.dependency??t("dependency"),global:e.global??t("path")}}function Be(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function yt(e,t){if(Object.is(e,t))return!0;try{return JSON.stringify(e)===JSON.stringify(t)}catch{return!1}}function Le(e,t){let n={};for(let a of Object.keys(t)){let r=e[a],o=t[a];if(Be(r)&&Be(o)){let i=Le(r,o);Object.keys(i).length>0&&(n[a]=i)}else yt(r,o)||(n[a]=o)}return n}function Oe(e,t){return Le(e,t)}function _e(e,t,n){let a=new Set(e);return n?a.add(t):a.delete(t),V.filter(r=>a.has(r))}var Fe=require("react");async function Ue(e){try{if(typeof navigator<"u"&&navigator.clipboard!==void 0)return await navigator.clipboard.writeText(e),!0}catch{}return!1}var s=require("react/jsx-runtime");function wt(...e){return e.filter(t=>typeof t=="string"&&t.length>0).join(" ")}function L({icon:e,title:t,action:n,children:a}){return(0,s.jsxs)("section",{className:"hh-section",children:[(0,s.jsxs)("header",{className:"hh-section-head",children:[e===void 0?null:(0,s.jsx)("span",{className:"hh-section-icon",children:e}),(0,s.jsx)("h3",{className:"hh-section-title",children:t}),(0,s.jsx)("span",{className:"hh-section-rule","aria-hidden":"true"}),n===void 0?null:(0,s.jsx)("span",{className:"hh-section-action",children:n})]}),(0,s.jsx)("div",{className:"hh-section-body",children:a})]})}function T({label:e,children:t}){return(0,s.jsxs)("div",{className:"hh-spec",children:[(0,s.jsx)("span",{className:"hh-spec-label",children:e}),(0,s.jsx)("span",{className:"hh-spec-value",children:t})]})}function W({children:e}){return(0,s.jsx)("code",{className:"hh-code",children:e})}function m({children:e}){return typeof e=="string"&&e.length===0?null:(0,s.jsx)("p",{className:"hh-hint",children:e})}function I({tone:e,children:t}){return(0,s.jsx)("span",{className:"hh-chip","data-tone":e??"idle",children:t})}function $({href:e,children:t}){return(0,s.jsxs)("a",{className:"hh-link",href:e,target:"_blank",rel:"noreferrer noopener",children:[t??e,(0,s.jsx)("span",{className:"hh-link-icon","aria-hidden":"true",children:(0,s.jsx)(Ce,{size:11})})]})}function j({label:e,children:t}){return(0,s.jsxs)("details",{className:"hh-details",children:[(0,s.jsxs)("summary",{className:"hh-summary",children:[(0,s.jsx)("span",{className:"hh-chevron","aria-hidden":"true",children:(0,s.jsx)(ke,{size:12})}),e]}),(0,s.jsx)("div",{className:"hh-details-body",children:t})]})}function z({tone:e="bad",icon:t=!0,title:n,children:a}){return(0,s.jsxs)("div",{className:"hh-note","data-tone":e,role:e==="bad"?"alert":"note",children:[t?(0,s.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,s.jsx)(Z,{size:13})}):null,(0,s.jsxs)("div",{className:"hh-note-body",children:[n===void 0?null:(0,s.jsx)("span",{className:"hh-note-title",children:n}),typeof a=="string"?(0,s.jsx)("p",{children:a}):a]})]})}function Ve({title:e,detail:t}){return(0,s.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,s.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,s.jsx)(Z,{size:13})}),(0,s.jsxs)("div",{className:"hh-note-body",children:[(0,s.jsx)("strong",{children:e}),t.length>0?(0,s.jsx)("p",{children:t}):null]})]})}function K({error:e,title:t}){return e===null?null:(0,s.jsxs)("div",{className:"hh-note",role:"alert",children:[(0,s.jsx)("span",{className:"hh-note-icon","aria-hidden":"true",children:(0,s.jsx)(Z,{size:13})}),(0,s.jsxs)("div",{className:"hh-note-body",children:[(0,s.jsx)("strong",{children:t}),(0,s.jsxs)("p",{children:[(0,s.jsx)("code",{children:e.code})," \u2014 ",e.message]})]})]})}function St(){return(0,s.jsx)("span",{className:"hh-spinner","aria-hidden":"true"})}function y({children:e,onClick:t,disabled:n,busy:a,variant:r="default",icon:o,title:i}){let d=n===!0||a===!0;return(0,s.jsxs)("button",{type:"button",className:wt("hh-btn",r!=="default"&&`hh-btn-${r}`),onClick:t,disabled:d,title:i,children:[a===!0?(0,s.jsx)(St,{}):o,e]})}function ee({label:e,checked:t,disabled:n,onChange:a}){return(0,s.jsxs)("button",{type:"button",role:"switch",className:"hh-switch","aria-checked":t,disabled:n,onClick:()=>a(!t),children:[(0,s.jsx)("span",{className:"hh-switch-track","aria-hidden":"true",children:(0,s.jsx)("span",{className:"hh-switch-knob"})}),(0,s.jsx)("span",{className:"hh-check-label",children:e})]})}function $e({label:e,checked:t,disabled:n,onChange:a}){return(0,s.jsxs)("label",{className:"hh-check",children:[(0,s.jsx)("input",{type:"checkbox",checked:t,disabled:n,onChange:r=>a(r.target.checked)}),(0,s.jsx)("span",{className:"hh-check-label",children:e})]})}function ze({value:e,options:t,disabled:n,label:a,onChange:r}){return(0,s.jsx)("select",{className:"hh-select",value:e,disabled:n,"aria-label":a,onChange:o=>r(o.target.value),children:t.map(o=>(0,s.jsx)("option",{value:o.value,children:o.label},o.value))})}function se({label:e,meta:t,path:n,hint:a,checked:r,disabled:o,onChange:i}){return(0,s.jsxs)("label",{className:"hh-choice-option","data-disabled":o===!0,children:[(0,s.jsx)("input",{type:"radio",checked:r,disabled:o,onChange:()=>i()}),(0,s.jsxs)("span",{className:"hh-choice-label",children:[(0,s.jsx)("span",{children:e}),a]}),t===void 0?null:(0,s.jsx)("span",{className:"hh-choice-meta",children:t}),n===void 0?null:(0,s.jsx)("span",{className:"hh-choice-path",title:n,children:Me(n)})]})}function je({children:e}){return(0,s.jsxs)(I,{tone:"accent",children:[(0,s.jsx)(Te,{size:10}),e]})}function Y({text:e,copyLabel:t,copiedLabel:n}){let[a,r]=(0,Fe.useState)(!1);return(0,s.jsxs)("div",{className:"hh-code-box",children:[(0,s.jsx)("textarea",{className:"hh-code-text",readOnly:!0,value:e,rows:Math.min(e.split(`
`).length,4)}),(0,s.jsx)("div",{className:"hh-btn-row",children:(0,s.jsx)(y,{variant:"ghost",onClick:()=>{Ue(e).then(r)},children:a?n:t})})]})}var P=require("react/jsx-runtime");function De({t:e,status:t,updateSettings:n}){let a=t.settings.agentTools,r=a.allow??[],o=V.filter(i=>r.includes(i)).length;return(0,P.jsxs)(L,{icon:(0,P.jsx)(ye,{}),title:e("agentTitle"),action:(0,P.jsx)(I,{children:e("agentCount",{enabled:o,total:V.length})}),children:[(0,P.jsx)(ee,{label:e("agentMaster"),checked:a.enabled,onChange:i=>n(d=>({...d,agentTools:{...d.agentTools,enabled:i}}))}),(0,P.jsx)(m,{children:e("agentApproval")}),(0,P.jsx)("div",{className:"hh-tools",children:V.map(i=>(0,P.jsx)($e,{label:(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)("span",{className:"hh-check-text",children:e(Ee[i])}),Ne(i)?(0,P.jsx)(I,{tone:"warn",children:e("agentApprovalBadge")}):null]}),checked:r.includes(i),disabled:!a.enabled,onChange:d=>n(g=>({...g,agentTools:{...g.agentTools,allow:_e(g.agentTools.allow??[],i,d)}}))},i))})]})}var Xe=require("react");function Ge(e){return Array.isArray(e)?e.filter(t=>typeof t=="string"):[]}function We(e){if(typeof e!="object"||e===null)return null;let t=e.result;if(typeof t!="object"||t===null)return null;let{ok:n,detail:a,commands:r}=t;return n!==!1?null:{detail:typeof a=="string"?a:"",commands:Ge(r)}}function Ke(e){return e===void 0?null:{ok:e.ok===!0,action:e.action==="uninstall"?"uninstall":"install",detail:typeof e.detail=="string"?e.detail:"",commands:Ge(e.commands)}}var kt=["enabled-running","enabled-failing","installed-disabled"];function Ye(e,t){let n=e.filter(o=>o.available).map(o=>o.mechanism),a=n.filter(o=>o!=="unsupported"),r=["auto",...a.length>0?a:n];return r.includes(t)||r.push(t),r}function qe(e,t){return e!==null&&e!==t}function Je(e,t){return e===null||e.ok?!1:e.action==="install"?kt.includes(t):t==="not-installed"}var u=require("react/jsx-runtime");function Ze({t:e,status:t,run:n,updateSettings:a,busy:r}){let o=t.boot,i=t.settings.autostart,d=o.candidates??[],g=o.commands??[],[c,b]=(0,Xe.useState)(null),_=r==="boot.install"||r==="boot.uninstall",R=Ye(d,i.mechanism).map(x=>({value:x,label:x==="auto"?e("bootMechanismAuto"):x})),U=qe(o.mechanism,i.mechanism),N=o.mechanism!==null,M=x=>e(x==="install"?"bootActionInstall":"bootActionUninstall"),F=async x=>{let C=await n(`boot.${x}`,async()=>x==="install"?v("boot.install",i.mechanism==="auto"?{}:{mechanism:i.mechanism}):v("boot.uninstall",{}));if(!C.ok){b(null);return}let te=We(C.value);b(te===null?null:{ok:!1,action:x,detail:te.detail,commands:te.commands})},q=Ke(i.lastAttempt),J=Je(q,o.state),E=c??(J?null:q);return(0,u.jsxs)(L,{icon:(0,u.jsx)(ve,{}),title:e("bootTitle"),action:(0,u.jsx)(ze,{value:i.mechanism,options:R,label:e("bootMechanism"),disabled:r==="settings"||_,onChange:x=>a(C=>({...C,autostart:{...C.autostart,mechanism:x}}))}),children:[(0,u.jsxs)("div",{className:"hh-btn-row",children:[(0,u.jsx)(y,{variant:N?"default":"primary",disabled:i.mechanism==="unsupported",busy:r==="boot.install",onClick:()=>{F("install")},children:e(U?"bootSwitchMode":"bootEnabled")}),(0,u.jsx)(y,{disabled:!N,busy:r==="boot.uninstall",onClick:()=>{F("uninstall")},children:e("bootUninstall")}),(0,u.jsx)(y,{variant:"ghost",busy:r==="boot.verify",onClick:()=>{n("boot.verify",()=>v("boot.verify",{}))},children:e("bootRecheck")})]}),i.enabled&&o.state==="not-installed"?(0,u.jsx)(z,{tone:"warn",children:e("bootRequestedNotInstalled")}):null,E!==null&&!E.ok?(0,u.jsxs)("div",{className:"hh-section-body",children:[(0,u.jsx)(Ve,{title:e("bootAttemptFailed",{action:M(E.action)}),detail:E.detail.length>0?E.detail:e("bootAttemptNoDetail")}),E.commands.length>0?(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(m,{children:e("bootAttemptCommands")}),(0,u.jsx)(Y,{text:E.commands.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null]}):null,E!==null&&E.ok?(0,u.jsx)(m,{children:e("bootAttemptSucceeded",{action:M(E.action),detail:E.detail})}):null,g.length>0?(0,u.jsxs)(j,{label:e("bootCommandsLabel"),children:[(0,u.jsx)(m,{children:e("bootCommandsExplain")}),(0,u.jsx)(Y,{text:g.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")})]}):null,(0,u.jsxs)(j,{label:e("details"),children:[(0,u.jsx)(T,{label:e("bootState"),children:e(Q[o.state]??"bootStateUnsupported")}),(0,u.jsx)(T,{label:e("bootBootCapable"),children:o.bootCapable?e("yes"):e("no")}),(0,u.jsx)(T,{label:e("bootPrivileged"),children:o.privileged?e("yes"):e("no")}),(0,u.jsx)(T,{label:e("bootUnitPath"),children:(0,u.jsx)(W,{children:w(o.unitPath)})}),o.detail.length>0?(0,u.jsx)(m,{children:o.detail}):null]})]})}var S=require("react/jsx-runtime");function Ct(e){return e.defaultEntryId??"dsh"}function Qe({t:e,status:t,run:n,busy:a}){let r=t.entries??[],o=t.settings.manageDsh===!0,i=t.boot.platform==="win32",d=Ct(t),g=c=>{if(c){let b={id:d,autostart:!0};n("entries.apply",()=>v("entries.apply",{intents:[b]}))}else n("entries.remove",()=>v("entries.remove",{id:d}))};return(0,S.jsxs)(L,{icon:(0,S.jsx)(xe,{}),title:e("entriesTitle"),children:[(0,S.jsx)(ee,{label:e("entriesManage",{id:d}),checked:o,disabled:a!==null,onChange:g}),(0,S.jsx)(m,{children:e("entriesManageNote",{id:d})}),i?(0,S.jsx)(z,{tone:"warn",children:e("entriesManageWinWarning",{id:d})}):null,r.length===0?(0,S.jsx)(m,{children:e("entriesEmpty",{id:d})}):(0,S.jsx)("div",{className:"hh-list",children:r.map(c=>{let b=c.live;return(0,S.jsxs)("div",{className:"hh-item",children:[(0,S.jsxs)("span",{className:"hh-item-main",children:[(0,S.jsx)("span",{className:"hh-item-name",children:c.intent.id}),(0,S.jsx)(I,{tone:c.exists?"ok":"bad",children:c.exists?e("entriesExists"):e("entriesMissing")}),(0,S.jsx)(I,{children:c.managed?e("entriesManaged"):e("entriesUnmanaged")}),c.drift.length>0?(0,S.jsx)(I,{tone:"warn",children:`${e("entriesDrift")} ${Pe(c.drift)}`}):null]}),(0,S.jsx)("span",{className:"hh-item-spacer"}),(0,S.jsx)("span",{className:"hh-item-meta",children:b===null?e("entriesNotRunning"):`${w(b.status)}${b.pid===null?"":` \xB7 pid ${b.pid}`}`})]},c.intent.id)})})]})}var D=require("react");var l=require("react/jsx-runtime");function Tt({value:e,label:t,hint:n,invalidLabel:a,placeholder:r,disabled:o,onChange:i}){let[d,g]=(0,D.useState)(e===null?"":String(e));(0,D.useEffect)(()=>{g(e===null?"":String(e))},[e]);let c=d.trim()===""?null:Number(d),b=c!==null&&(!Number.isInteger(c)||c<1||c>65535),_=()=>{if(b){g(e===null?"":String(e));return}c!==e&&i(c)};return(0,l.jsxs)("div",{className:"hh-field-block",children:[(0,l.jsxs)("div",{className:"hh-field",children:[(0,l.jsx)("label",{className:"hh-field-label",htmlFor:"hh-panel-port",children:t}),(0,l.jsx)("input",{id:"hh-panel-port",className:"hh-input",type:"number",value:d,placeholder:r,disabled:o,onChange:k=>g(k.target.value),onBlur:_,onKeyDown:k=>{k.key==="Enter"&&_()}})]}),(0,l.jsx)(m,{children:b?a:n})]})}function et({t:e,status:t,run:n,updateSettings:a,busy:r}){let o=t.panel,i=t.cli,d=i?.prefer??t.settings.cli?.prefer??"pinned",[g,c]=(0,D.useState)(!1),[b,_]=(0,D.useState)(null),k=i?.version??null,R=k!==null&&o.version!==null,U=o.reachable&&R&&k===o.version,N=o.reachable&&R&&k!==o.version,{dependency:M,global:F}=i===void 0?{dependency:null,global:null}:He(i),q=i===void 0?[]:[`pnpm add -g home-hosted@${i.expectedRange}`,`npm install -g home-hosted@${i.expectedRange}`],J=x=>{a(C=>({...C,cli:{...C.cli,prefer:x}}))},E=async()=>{let x=await n("cli.installGlobal",()=>v("cli.installGlobal",{}));if(!x.ok)return;let C=x.value;_(typeof C?.output=="string"?C.output:null)};return(0,l.jsxs)(L,{icon:(0,l.jsx)(be,{}),title:e("panelTitle"),children:[i===void 0?null:(0,l.jsxs)(l.Fragment,{children:[(0,l.jsxs)("div",{className:"hh-choice",role:"radiogroup","aria-label":e("panelCopy"),children:[(0,l.jsx)(se,{label:e("optionsPreferPinned"),hint:(0,l.jsx)(je,{children:e("optionsRecommended")}),meta:M===null?void 0:w(M.version),path:M?.path??void 0,checked:d==="pinned",disabled:M===null||r==="settings",onChange:()=>J("pinned")}),(0,l.jsx)(se,{label:e("optionsPreferGlobal"),meta:F===null?void 0:w(F.version),path:F?.path??void 0,checked:d==="global",disabled:F===null||r==="settings",onChange:()=>J("global")})]}),(0,l.jsx)(m,{children:e("panelCopyHint")}),i.source==="config"?(0,l.jsx)(m,{children:e("optionsConfigOverride")}):null,i.source==="path"&&d!=="global"?(0,l.jsx)(m,{children:e("panelCliNotPinned",{range:i.expectedRange})}):null,i.supported?null:(0,l.jsx)(z,{tone:"warn",children:e("panelCliUnsupported")}),i.launcherPath!=null&&i.launcherVersion==null?(0,l.jsx)(z,{tone:"warn",children:e("panelCliLauncherFailed")}):null]}),(0,l.jsx)(Tt,{value:t.settings.panel?.port??null,label:e("panelPort"),hint:o.reachable?e("panelPortHint"):e("panelPortFree"),invalidLabel:e("panelPortInvalid"),placeholder:o.configPort==null?void 0:String(o.configPort),disabled:o.reachable||r!==null,onChange:x=>a(C=>({...C,panel:{...C.panel,port:x}}))}),(0,l.jsxs)("div",{className:"hh-btn-row",children:[o.reachable?null:(0,l.jsx)(y,{variant:"primary",busy:r==="panel.start",onClick:()=>{n("panel.start",()=>v("panel.start",{}))},children:e("panelStart")}),N&&!g?(0,l.jsx)(y,{variant:"primary",onClick:()=>c(!0),children:e("panelReplace",{version:k})}):null]}),U?(0,l.jsx)(m,{children:e("panelAlreadyPreferred")}):null,N&&g?(0,l.jsx)("div",{className:"hh-note",role:"alertdialog","aria-label":e("panelTakeoverTitle"),children:(0,l.jsxs)("div",{className:"hh-note-body",children:[(0,l.jsx)("strong",{children:e("panelTakeoverTitle")}),(0,l.jsx)("p",{children:e("panelTakeoverBody",{id:t.defaultEntryId??"dsh"})}),(0,l.jsxs)("div",{className:"hh-note-actions",children:[(0,l.jsx)(y,{onClick:()=>c(!1),children:e("confirmCancel")}),(0,l.jsx)(y,{variant:"danger",busy:r==="panel.takeover",onClick:()=>{c(!1),n("panel.takeover",()=>v("panel.takeover",{}))},children:e("confirmReplace")})]})]})}):null,i!==void 0&&F===null?(0,l.jsxs)(j,{label:e("optionsInstallLabel"),children:[(0,l.jsx)(m,{children:e("optionsInstallHint")}),(0,l.jsx)(Y,{text:q.join(`
`),copyLabel:e("copy"),copiedLabel:e("copied")}),(0,l.jsx)("div",{className:"hh-btn-row",children:(0,l.jsx)(y,{busy:r==="cli.installGlobal",onClick:()=>{E()},children:e("optionsInstall")})}),b===null?null:(0,l.jsx)("pre",{className:"hh-output",children:b})]}):null,(0,l.jsxs)(j,{label:e("details"),children:[(0,l.jsx)(T,{label:e("panelHome"),children:(0,l.jsx)(W,{children:o.home})}),(0,l.jsx)(T,{label:e("panelUrl"),children:o.url===null?w(o.url):(0,l.jsx)($,{href:o.url,children:o.url})}),(0,l.jsx)(T,{label:e("panelVersion"),children:w(o.version)}),(0,l.jsx)(T,{label:e("panelPid"),children:w(o.pid)}),(0,l.jsx)(T,{label:e("panelWriteVia"),children:e(Re[o.writeVia]??"writeViaNone")}),(0,l.jsx)(T,{label:e("panelToken"),children:e(Ae[o.token]??"tokenUnknown")}),i===void 0?null:(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(T,{label:e("panelCliSource"),children:`${e(Ie[i.source]??"panelCliMissing")} \xB7 ${w(i.version)}`}),(0,l.jsx)(T,{label:e("panelCliPath"),children:(0,l.jsx)(W,{children:w(i.path)})})]}),o.detail.length>0?(0,l.jsx)(m,{children:o.detail}):null]})]})}var Pt={"not-installed":"idle","installed-disabled":"warn","enabled-running":"ok","enabled-failing":"bad",unsupported:"idle"};function Nt(...e){return e.filter(t=>t!==null&&t.length>0).join(" \xB7 ")}function Et(e,t){let{panel:n}=e;return n.reachable?{key:"panel",tone:"ok",name:t("sigPanel"),state:t("stateAnswering"),meta:w(n.version),href:n.url}:{key:"panel",tone:e.lastError===null?"idle":"bad",name:t("sigPanel"),state:t("stateNotAnswering"),meta:n.home,href:null}}function Rt(e,t){let{boot:n}=e,r=e.settings.autostart.enabled&&n.state==="not-installed"?"warn":Pt[n.state]??"idle",o=n.mechanism??(e.settings.autostart.mechanism==="auto"?null:e.settings.autostart.mechanism);return{key:"autostart",tone:r,name:t("sigAutostart"),state:t(Q[n.state]??"bootStateUnsupported"),meta:o??"",href:null}}function At(e,t){let n=e.entries??[],a=t("sigEntry",{id:e.defaultEntryId??"dsh"}),r=e.settings.manageDsh===!0,o=n.filter(c=>!c.exists).length,i=n.filter(c=>c.drift.length>0).length,d=n.find(c=>c.live!==null)?.live??null;return{key:"entry",tone:r?o>0?"bad":i>0?"warn":d!==null?"ok":"warn":"idle",name:a,state:t(r?"stateManaged":"stateNotManaged"),meta:d===null?t("entriesNotRunning"):Nt(w(d.status),d.pid===null?null:`pid ${d.pid}`),href:null}}function tt(e,t){return[Et(e,t),Rt(e,t),At(e,t)]}function nt(e,t){let n=e.filter(a=>a.status==="running").length;return t("serversCount",{running:n,total:e.length})}var f=require("react/jsx-runtime");function ot({t:e,status:t,run:n,busy:a}){let r=t.servers??[];return(0,f.jsxs)(L,{icon:(0,f.jsx)(we,{}),title:e("serversTitle"),action:(0,f.jsx)(I,{children:nt(r,e)}),children:[(0,f.jsx)(m,{children:t.panel.url===null?e("serversHintNoPanel"):(0,f.jsxs)(f.Fragment,{children:[`${e("serversHintPanel")} `,(0,f.jsx)($,{href:t.panel.url,children:t.panel.url})]})}),r.length===0?(0,f.jsx)(m,{children:e("serversEmpty")}):(0,f.jsx)("div",{className:"hh-list",children:r.map(o=>{let i=o.status==="running",d=!t.panel.reachable||a!==null;return(0,f.jsxs)("div",{className:"hh-item",children:[(0,f.jsxs)("span",{className:"hh-item-main",children:[(0,f.jsx)("span",{className:"hh-item-name",children:o.id}),(0,f.jsx)(I,{tone:i?"ok":"idle",children:w(o.status)}),o.url===null?null:(0,f.jsx)($,{href:o.url,children:o.url})]}),(0,f.jsx)("span",{className:"hh-item-spacer"}),o.pid===null?null:(0,f.jsx)("span",{className:"hh-item-meta",children:`${e("serversPid")} ${o.pid}`}),(0,f.jsxs)("span",{className:"hh-item-actions",children:[(0,f.jsx)(y,{variant:"ghost",disabled:d||i,busy:a===`servers.start:${o.id}`,onClick:()=>{n(`servers.start:${o.id}`,()=>v("servers.start",{id:o.id}))},children:e("serversStart")}),(0,f.jsx)(y,{variant:"ghost",disabled:d||!i,busy:a===`servers.stop:${o.id}`,onClick:()=>{n(`servers.stop:${o.id}`,()=>v("servers.stop",{id:o.id}))},children:e("serversStop")}),(0,f.jsx)(y,{variant:"ghost",disabled:d||!i,busy:a===`servers.restart:${o.id}`,onClick:()=>{n(`servers.restart:${o.id}`,()=>v("servers.restart",{id:o.id}))},children:e("serversRestart")})]})]},o.id)})})]})}var le=`
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
}
`;var h=require("react/jsx-runtime");function It({signal:e}){return(0,h.jsxs)("div",{className:"hh-signal","data-tone":e.tone,children:[(0,h.jsx)("span",{className:"hh-signal-dot","aria-hidden":"true"}),(0,h.jsx)("span",{className:"hh-signal-name",children:e.name}),(0,h.jsx)("span",{className:"hh-signal-state",children:e.state}),e.meta.length===0&&e.href===null?null:(0,h.jsxs)("span",{className:"hh-signal-meta",children:[e.meta,e.href===null?null:(0,h.jsxs)(h.Fragment,{children:[e.meta.length===0?null:" \xB7 ",(0,h.jsx)($,{href:e.href,children:e.href})]})]})]})}function at(e){let t=pe(e.t),{data:n,error:a,loading:r,refresh:o}=fe(),[i,d]=(0,G.useState)(null),[g,c]=(0,G.useState)(null),b=(0,G.useCallback)((R,U)=>(c(R),d(null),(async()=>{try{let N=await U();return N.ok||d(N.error),N}catch(N){let M={code:"client",message:N instanceof Error?N.message:String(N)};return d(M),{ok:!1,error:M}}finally{c(null),await o()}})()),[o]),_=(0,G.useCallback)(R=>{if(n===null)return;let U=Oe(n.settings,R(n.settings));Object.keys(U).length!==0&&b("settings",()=>me(U))},[n,b]);if(n===null)return(0,h.jsxs)("div",{className:"hh-root",children:[(0,h.jsx)("style",{children:le}),r?(0,h.jsx)(m,{children:t("loading")}):(0,h.jsxs)(h.Fragment,{children:[(0,h.jsx)(K,{error:a??{code:"status",message:t("statusUnavailable")},title:t("errorTitle")}),(0,h.jsx)("div",{className:"hh-btn-row",children:(0,h.jsx)(y,{onClick:()=>{o()},children:t("retry")})})]})]});let k={t,status:n,run:b,updateSettings:_,busy:g};return(0,h.jsxs)("div",{className:"hh-root",children:[(0,h.jsx)("style",{children:le}),(0,h.jsxs)("header",{className:"hh-head",children:[(0,h.jsx)("h2",{className:"hh-title",children:t("tab")}),(0,h.jsx)("span",{className:"hh-head-spacer"}),(0,h.jsx)(y,{variant:"ghost",icon:(0,h.jsx)(Se,{size:13}),busy:g==="status.refresh",onClick:()=>{b("status.refresh",()=>v("status",{refresh:!0}))},children:t("refresh")})]}),(0,h.jsx)("div",{className:"hh-signals","data-busy":g!==null,children:tt(n,t).map(R=>(0,h.jsx)(It,{signal:R},R.key))}),n.lastError===null?null:(0,h.jsx)(K,{error:{code:"panel",message:n.lastError},title:t("errorTitle")}),(0,h.jsx)(K,{error:a,title:t("errorTitle")}),(0,h.jsx)(K,{error:i,title:t("errorTitle")}),(0,h.jsx)(et,{...k}),(0,h.jsx)(Ze,{...k}),(0,h.jsx)(Qe,{...k}),(0,h.jsx)(De,{...k}),(0,h.jsx)(ot,{...k})]})}var Mt=["slots","locale"],rt="[dsh-home-hosted]";function O(e,t){t===void 0?console.warn(`${rt} ${e}`):console.warn(`${rt} ${e}`,t)}function it(e,t){try{let n=e.get?.(t);if(n!=null)return n}catch{}try{let n=e[t];if(n!=null)return n}catch{}}function st(e,t,n){if(typeof e.effect=="function")try{e.effect(t,n);return}catch(a){O(`registering the effect "${n}" failed`,a);return}try{t()}catch(a){O(`the effect "${n}" failed`,a)}}function Ht(e){try{let t=it(e,"locale"),n=he(t);t===void 0?O("the locale service is unavailable; the page keeps its bundled English copy"):st(e,()=>{let r=[];try{r.push(t.register(X,{en:oe,zh:de}))}catch(o){O("registering the dictionaries failed",o)}return()=>{for(let o of r)try{o()}catch(i){O("disposing a dictionary failed",i)}}},"dsh-home-hosted: dictionaries");let a=it(e,"slots");if(a===void 0){O("the slots service is unavailable; the settings section was not registered");return}st(e,()=>{try{return a.inject("settings.section",()=>{try{return a.register({name:"settings.section",id:"home-hosted",order:60,label:()=>n("tab"),locale:X,inject:()=>({t:n})},at)}catch(r){return O("registering the settings section failed",r),()=>{}}})}catch(r){return O("injecting into settings.section failed",r),()=>{}}},"dsh-home-hosted: settings section")}catch(t){O("client bootstrap failed",t)}}

return module.exports; } });
