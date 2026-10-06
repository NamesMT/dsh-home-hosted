// src/index.ts
import path17 from "node:path";

// src/config.ts
import z from "@deepseek-ai/schemastery";
var Config = z.object({
  stateDir: z.string().description("Plugin state directory; defaults to $DSH_HOME/dsh-home-hosted"),
  homeHostedCommand: z.string().description("home-hosted executable to put in a generated autostart entry"),
  defaultEntryId: z.string().default("dsh").description("Server entry id used for the running harness"),
  instanceRoots: z.array(z.string()).default([]).description("Other home-hosted state roots (--home) to report as other panels")
});

// src/shared/contracts.ts
var RPC_PATH = "/home-hosted";
var RPC_VERSION = 1;
var DEFAULT_WORKSPACE = "default";
var WORKSPACE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
function isWorkspaceId(value) {
  return typeof value === "string" && WORKSPACE_ID_PATTERN.test(value);
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var FOREIGN_MECHANISMS = {
  "servers.list": ["file", "api"],
  "servers.create": ["file", "api"],
  "servers.update": ["file", "api"],
  "servers.delete": ["file", "api"],
  "servers.start": ["cli", "api"],
  "servers.stop": ["cli", "api"],
  "servers.restart": ["cli", "api"],
  "ui.manage": ["cli"]
};
var ON_PORT_CONFLICT_POLICIES = ["block", "warn", "follow", "reclaim", "kill"];
function isOnPortConflict(value) {
  return typeof value === "string" && ON_PORT_CONFLICT_POLICIES.includes(value);
}
var AGENT_TOOL_NAMES = [
  "status",
  "workspaces_list",
  "servers_list",
  "servers_lifecycle",
  "servers_edit",
  "autostart_manage",
  "ui_manage",
  "panel_logs"
];
var MUTATING_AGENT_TOOLS = [
  "servers_lifecycle",
  "servers_edit",
  "autostart_manage",
  "ui_manage"
];
var SETTINGS_VERSION = 3;
var DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  autostart: { enabled: false, mechanism: "auto" },
  manageDsh: false,
  entries: [],
  // Every tool on by default; the session's own permission mode is what gates them.
  agentTools: { enabled: true, allow: [...AGENT_TOOL_NAMES] },
  panel: { port: null },
  authNotice: true,
  reclaimToken: true,
  instancesNotice: true,
  uiStyle: "detailed",
  cli: { prefer: "pinned" }
};

// src/service.ts
import { Service } from "@deepseek-ai/cordis";
import fs17 from "node:fs";
import path16 from "node:path";
import process10 from "node:process";
import { fileURLToPath } from "node:url";

// src/boot/common.ts
import fs2 from "node:fs";
import os from "node:os";
import path2 from "node:path";

// src/util/fsx.ts
import fs from "node:fs";
import path from "node:path";
import process2 from "node:process";
function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}
function readJson(file) {
  const text = readText(file);
  if (text === null)
    return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function ensureDir(dir, mode = 448) {
  fs.mkdirSync(dir, { recursive: true, mode });
}
function writeFileAtomic(file, data, mode) {
  ensureDir(path.dirname(file));
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process2.pid}.${Date.now()}.tmp`);
  const fd = fs.openSync(temp, "w", mode ?? 420);
  try {
    fs.writeFileSync(fd, data, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  if (mode !== void 0)
    fs.chmodSync(temp, mode);
  fs.renameSync(temp, file);
}
function writeJsonAtomic(file, value, mode) {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}
`, mode);
}

// src/boot/common.ts
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function existsOf(ctx, file) {
  return ctx.exists ? ctx.exists(file) : fs2.existsSync(file);
}
function posixJoin(...parts) {
  return path2.posix.join(...parts);
}
function configHome(ctx) {
  const xdg = ctx.env.XDG_CONFIG_HOME?.trim();
  return xdg ? path2.posix.resolve(xdg) : posixJoin(ctx.home, ".config");
}
function localAppData(ctx) {
  const value = ctx.env.LOCALAPPDATA?.trim();
  return value ? value : path2.join(ctx.home, "AppData", "Local");
}
function tempDir(ctx) {
  const value = ctx.env.TMPDIR?.trim() || ctx.env.TEMP?.trim() || ctx.env.TMP?.trim();
  return value || os.tmpdir();
}
function parsePasswd(text) {
  return text.split("\n").map((line) => {
    const fields = line.split(":");
    const uidText = fields[2] ?? "";
    const uid = /^\d+$/.test(uidText.trim()) ? Number.parseInt(uidText.trim(), 10) : Number.NaN;
    return fields.length < 6 || !Number.isSafeInteger(uid) || (fields[0] ?? "").length === 0 ? null : { name: fields[0] ?? "", uid, home: fields[5] ?? "" };
  }).filter((entry) => entry !== null);
}
function readPasswd() {
  try {
    return parsePasswd(fs2.readFileSync("/etc/passwd", "utf8"));
  } catch {
    return [];
  }
}
function numberFrom(value) {
  const text = value?.trim();
  if (text === void 0 || text.length === 0)
    return null;
  return /^\d+$/.test(text) ? Number.parseInt(text, 10) : null;
}
function accountFrom(row, ambientHome) {
  const home = row.home.length > 0 ? row.home : ambientHome?.trim() || null;
  return { name: row.name, uid: row.uid, home, root: row.uid === 0, verified: true };
}
function declaredName(env) {
  const value = env.SUDO_USER?.trim() || env.PKEXEC_USER?.trim();
  return value !== void 0 && value.length > 0 ? value : null;
}
function sessionName(env) {
  const value = env.LOGNAME?.trim() || env.USER?.trim() || env.USERNAME?.trim();
  return value !== void 0 && value.length > 0 ? value : null;
}
function ownerAccount(paths, passwd) {
  for (const path18 of paths ?? []) {
    try {
      const uid = fs2.statSync(path18).uid;
      if (uid === 0)
        continue;
      const row = passwd.find((entry) => entry.uid === uid);
      if (row !== void 0)
        return accountFrom(row);
    } catch {
    }
  }
  return null;
}
function accountOf(input) {
  const passwd = input.passwd ?? readPasswd();
  const byUid = (uid) => uid === null ? null : passwd.find((entry) => entry.uid === uid) ?? null;
  const byName = (name2) => name2 === null ? null : passwd.find((entry) => entry.name === name2) ?? null;
  const elevatedUid = numberFrom(input.env.SUDO_UID) ?? numberFrom(input.env.PKEXEC_UID);
  const elevatedName = declaredName(input.env);
  if (elevatedUid !== null || elevatedName !== null) {
    const row = byUid(elevatedUid) ?? byName(elevatedName);
    if (row !== null)
      return accountFrom(row);
    if (elevatedUid !== null && elevatedUid !== 0 && elevatedName !== null)
      return { name: elevatedName, uid: elevatedUid, home: null, root: false, verified: false };
  }
  const euid = input.uid === void 0 ? process.getuid?.() ?? null : input.uid;
  const ownUid = euid ?? numberFrom(input.env.UID);
  const session = sessionName(input.env);
  if (session !== null && session.toLowerCase() !== "root") {
    const sessionRow = byName(session);
    if (sessionRow !== null)
      return accountFrom(sessionRow, input.env.HOME);
    const uidRow = byUid(ownUid === 0 ? null : ownUid);
    if (uidRow !== null)
      return accountFrom(uidRow, input.env.HOME);
    return { name: session, uid: ownUid, home: input.env.HOME?.trim() || null, root: false, verified: false };
  }
  const ownRow = ownUid === 0 ? null : byUid(ownUid);
  if (ownRow !== null)
    return accountFrom(ownRow);
  const owner = ownerAccount(input.ownerPaths, passwd);
  if (owner !== null)
    return owner;
  if (ownUid === 0 || session?.toLowerCase() === "root")
    return { name: "root", uid: 0, home: input.env.HOME?.trim() || "/root", root: true, verified: true };
  return null;
}
function currentUser(ctx) {
  const account = accountOf(ctx);
  if (account !== null && !account.root)
    return account.name;
  const value = sessionName(ctx.env);
  return value !== null && value.toLowerCase() !== "root" ? value : null;
}
function bootUserName(ctx) {
  const account = accountOf(ctx);
  if (account === null) {
    warnAccount(ctx, "no account could be resolved for the entry, so a system unit would run the panel as root. Install it from the account that should own the panel, or set User= yourself.");
    return null;
  }
  if (account.root) {
    warnAccount(ctx, "the only account available is root; a system unit would run the panel as root. Install it from the account that should own the panel, or set User= yourself.");
    return null;
  }
  if (!isUserName(account.name)) {
    warnAccount(ctx, `the account name ${JSON.stringify(account.name)} is not a usable user name, so no User= line was written`);
    return null;
  }
  if (!account.verified) {
    warnAccount(ctx, `the account ${JSON.stringify(account.name)} could not be found in the user database, so no User= line was written: systemd would refuse to start the unit (status=217/USER). Set User= yourself if that account resolves through LDAP or NIS.`);
    return null;
  }
  return account.name;
}
function isUserName(name2) {
  return /^[A-Za-z_][A-Za-z0-9._-]*$/.test(name2);
}
function warnAccount(ctx, message2) {
  try {
    (ctx.warn ?? ((line) => console.warn(`[dsh-home-hosted] ${line}`)))(message2);
  } catch {
  }
}
function uidOf(ctx) {
  const uid = ctx.uid === void 0 ? process.getuid?.() ?? null : ctx.uid;
  if (uid !== null)
    return String(uid);
  const configured = numberFrom(ctx.env.UID);
  return configured === null ? null : String(configured);
}
function inspectOwned(file, marker) {
  if (!fs2.existsSync(file))
    return { exists: false, owned: false, text: null, reason: null };
  const text = readText(file);
  if (text === null)
    return { exists: true, owned: false, text: null, reason: `${file} exists but is unreadable, so it cannot be proven to be ours` };
  if (!text.includes(marker))
    return { exists: true, owned: false, text, reason: `${file} exists and does not carry this plugin's marker (${marker}); refusing to touch an artifact we did not write` };
  return { exists: true, owned: true, text, reason: null };
}
function writeOwned(file, marker, content, mode = 420) {
  const own = inspectOwned(file, marker);
  if (own.exists && !own.owned)
    return { changed: false, refusal: own.reason };
  if (own.exists && own.text === content)
    return { changed: false, refusal: null };
  writeFileAtomic(file, content, mode);
  return { changed: true, refusal: null };
}
function removeOwned(file, marker) {
  const own = inspectOwned(file, marker);
  if (!own.exists)
    return { removed: false, refusal: null };
  if (!own.owned)
    return { removed: false, refusal: own.reason };
  try {
    fs2.rmSync(file, { force: true });
    return { removed: true, refusal: null };
  } catch (error) {
    return { removed: false, refusal: `could not delete ${file}: ${errorMessage(error)}` };
  }
}
function failed(detail, extra = {}) {
  return { ok: false, changed: false, detail, commands: [], needsPrivilege: false, ...extra };
}
function bootState(installed, enabled, failing) {
  if (!installed)
    return "not-installed";
  if (!enabled)
    return "installed-disabled";
  return failing ? "enabled-failing" : "enabled-running";
}
function isInstalledState(state) {
  return state === "installed-disabled" || state === "enabled-running" || state === "enabled-failing";
}

// src/boot/ladder.ts
import os2 from "node:os";
import process3 from "node:process";

// src/util/exec.ts
import { spawn } from "node:child_process";
async function run(command, args = [], options = {}) {
  const maxBytes = options.maxBytes ?? 256 * 1024;
  const timeoutMs = options.timeoutMs ?? 2e4;
  return await new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const finish = (result) => {
      if (settled)
        return;
      settled = true;
      resolve({
        command,
        args,
        code: result.code ?? null,
        signal: result.signal ?? null,
        stdout: result.stdout ?? stdout,
        stderr: result.stderr ?? stderr,
        timedOut,
        error: result.error ?? null
      });
    };
    let child;
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      finish({ error: error instanceof Error ? error.message : String(error) });
      return;
    }
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout?.on("data", (chunk) => {
      if (stdout.length < maxBytes)
        stdout += chunk.toString("utf8").slice(0, maxBytes - stdout.length);
    });
    child.stderr?.on("data", (chunk) => {
      if (stderr.length < maxBytes)
        stderr += chunk.toString("utf8").slice(0, maxBytes - stderr.length);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      finish({ error: error.message });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      finish({ code, signal });
    });
  });
}
async function sudoAvailable() {
  if (process.getuid?.() === 0)
    return true;
  const result = await run("sudo", ["-n", "true"], { timeoutMs: 5e3 });
  return result.code === 0;
}

// src/boot/systemd.ts
import fs3 from "node:fs";

// src/boot/escape.ts
var CONTROL = /[\u0000-\u001F\u007F]/;
function assertNoControl(value, what) {
  if (CONTROL.test(value))
    throw new Error(`${what} must not contain control characters or newlines`);
  return value;
}
function assertUnitName(name2) {
  if (!/^[A-Za-z0-9._@-]+$/.test(name2))
    throw new Error(`unit name ${JSON.stringify(name2)} must match ^[A-Za-z0-9._@-]+$`);
  if (name2.startsWith("-") || name2.startsWith(".") || name2.includes(".."))
    throw new Error(`unit name ${JSON.stringify(name2)} must not be option-like or traverse paths`);
  return name2;
}
function assertMarker(marker) {
  if (marker.trim() === "")
    throw new Error("marker must not be empty");
  return assertNoControl(marker, "marker");
}
function assertUserName(name2) {
  if (!/^[A-Za-z_][A-Za-z0-9._-]*$/.test(name2))
    throw new Error(`user name ${JSON.stringify(name2)} must match ^[A-Za-z_][A-Za-z0-9._-]*$`);
  return name2;
}
function assertEnvKey(key) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
    throw new Error(`environment key ${JSON.stringify(key)} is not a valid name`);
  return key;
}
function isAbsolutePath(value) {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\");
}
function assertAbsolute(value, what) {
  if (!isAbsolutePath(value))
    throw new Error(`${what} must be absolute, got ${JSON.stringify(value)}`);
  return assertNoControl(value, what);
}
function assertLabel(value) {
  if (value.trim() === "")
    throw new Error("label must not be empty");
  return assertNoControl(value, "label");
}
function assertArg(value, what = "argument") {
  return assertNoControl(value, what);
}
function replaceAll(value, pairs) {
  let out = value;
  for (const [from, to] of pairs)
    out = out.split(from).join(to);
  return out;
}
function shellQuote(value) {
  if (value !== "" && /^[A-Za-z0-9._/:=@%+,-]+$/.test(value))
    return value;
  return `'${value.split("'").join("'\\''")}'`;
}
function shellCommand(program, args) {
  return [program, ...args].map(shellQuote).join(" ");
}
function systemdExecWord(value) {
  assertNoControl(value, "ExecStart word");
  const escaped = replaceAll(value, [["\\", "\\\\"], ['"', '\\"'], ["$", "$$"], ["%", "%%"]]);
  return escaped !== value || /[\s"';]/.test(value) ? `"${escaped}"` : value;
}
function systemdText(value) {
  assertNoControl(value, "unit setting");
  const escaped = value.split("%").join("%%");
  return escaped.endsWith("\\") ? `${escaped} ` : escaped;
}
function systemdPath(value, what = "path") {
  assertAbsolute(value, what);
  assertNoControl(value, what);
  if (value.includes('"'))
    throw new Error(`${what} must not contain a double quote: ${JSON.stringify(value)}`);
  const escaped = value.split("%").join("%%");
  return escaped.endsWith("\\") ? `${escaped} ` : escaped;
}
function systemdEnvLine(key, value) {
  assertEnvKey(key);
  assertNoControl(value, `environment value for ${key}`);
  const escaped = replaceAll(value, [["\\", "\\\\"], ['"', '\\"'], ["%", "%%"]]);
  return escaped !== value || /[\s"']/.test(value) ? `"${key}=${escaped}"` : `${key}=${value}`;
}
function xmlEscape(value) {
  assertNoControl(value, "xml value");
  return replaceAll(value, [["&", "&amp;"], ["<", "&lt;"], [">", "&gt;"], ['"', "&quot;"], ["'", "&apos;"]]);
}
function xmlUnescape(value) {
  return replaceAll(value, [["&lt;", "<"], ["&gt;", ">"], ["&quot;", '"'], ["&apos;", "'"], ["&amp;", "&"]]);
}
function assertXmlCommentSafe(value) {
  if (value.includes("--"))
    throw new Error("marker must not contain `--` when it is written inside an XML comment");
  return value;
}
var DESKTOP_RESERVED = /[\s"'\\><~|&;$*?#()`]/;
function desktopValueEscape(value) {
  assertNoControl(value, "desktop value");
  return value.split("\\").join("\\\\");
}
function desktopWord(value) {
  assertNoControl(value, "desktop Exec word");
  const escaped = replaceAll(value, [["\\", "\\\\"], ['"', '\\"'], ["`", "\\`"], ["$", "\\$"], ["%", "%%"]]);
  const word = DESKTOP_RESERVED.test(value) || escaped !== value ? `"${escaped}"` : value;
  return desktopValueEscape(word);
}
function desktopExec(program, args) {
  return [program, ...args].map(desktopWord).join(" ");
}
function desktopValue(key, value) {
  assertNoControl(value, `desktop ${key}`);
  if (key.includes("=") || key.includes("\n"))
    throw new Error(`desktop key ${JSON.stringify(key)} is not valid`);
  return `${key}=${desktopValueEscape(value)}`;
}
function crtQuote(value) {
  let out = '"';
  let backslashes = 0;
  for (const char of value) {
    if (char === "\\") {
      backslashes += 1;
      continue;
    }
    if (char === '"') {
      out += `${"\\".repeat(backslashes * 2 + 1)}"`;
      backslashes = 0;
      continue;
    }
    out += `${"\\".repeat(backslashes)}${char}`;
    backslashes = 0;
  }
  out += `${"\\".repeat(backslashes * 2)}"`;
  return out;
}
function windowsArg(value) {
  assertNoControl(value, "windows argument");
  if (value !== "" && !/[\s"]/.test(value))
    return value;
  return crtQuote(value);
}
function windowsCommandLine(program, args) {
  return [program, ...args].map(windowsArg).join(" ");
}
function batchCommandLine(program, args) {
  return batchEscape(windowsCommandLine(program, args));
}
function batchEscape(line) {
  assertNoControl(line, "batch command line");
  return replaceAll(line, [
    ["^", "^^"],
    ["&", "^&"],
    ["|", "^|"],
    ["<", "^<"],
    [">", "^>"],
    ["(", "^("],
    [")", "^)"],
    ["%", "%%"]
  ]);
}
function powershellLiteral(value) {
  assertNoControl(value, "powershell value");
  return `'${value.split("'").join("''")}'`;
}
function cmdQuote(value) {
  assertNoControl(value, "cmd argument");
  if (value !== "" && !/[\s"&|<>^]/.test(value))
    return value;
  return crtQuote(value);
}
function windowsDisplayCommand(program, args) {
  return [program, ...args].map(cmdQuote).join(" ");
}
function assertRegistryValueName(name2) {
  if (name2.trim() === "")
    throw new Error("registry value name must not be empty");
  return assertNoControl(name2, "registry value name");
}

// src/boot/systemd.ts
var ENABLED_UNIT_STATES = /* @__PURE__ */ new Set(["enabled", "enabled-runtime", "alias", "static", "indirect", "generated", "transient"]);
var FAILED_RESULTS = /* @__PURE__ */ new Set(["failed", "exit-code", "signal", "timeout", "core-dump", "watchdog", "start-limit-hit", "oom-kill"]);
function validate(spec) {
  assertUnitName(spec.unitName);
  assertMarker(spec.marker);
  assertLabel(spec.label);
  assertAbsolute(spec.command, "spec.command");
  assertAbsolute(spec.cwd, "spec.cwd");
  assertAbsolute(spec.logDir, "spec.logDir");
  for (const arg of spec.args)
    assertArg(arg);
  for (const key of Object.keys(spec.env))
    assertEnvKey(key);
}
function envLines(spec) {
  return Object.entries(spec.env).map(([key, value]) => `Environment=${systemdEnvLine(key, value)}`);
}
var MANAGED = (spec) => `# Managed by ${spec.marker}`;
function codeOf(result) {
  return result.error ? null : result.code;
}
function accountNote(own, ctx) {
  if (!own.owned || own.text === null)
    return "";
  const declared = /^User=(.*)$/m.exec(own.text)?.[1]?.trim() ?? "";
  return declared === "" || declared === "root" ? "; the unit names no other user, so the panel runs as root \u2014 install again from the account that should own it" : "";
}
function systemdUserUnit(spec) {
  validate(spec);
  return `${[
    MANAGED(spec),
    "[Unit]",
    `Description=${systemdText(spec.label)}`,
    "After=network-online.target",
    "",
    "[Service]",
    "Type=exec",
    `ExecStart=${[spec.command, ...spec.args].map(systemdExecWord).join(" ")}`,
    `WorkingDirectory=${systemdPath(spec.cwd, "spec.cwd")}`,
    // A persistent entry survives a panel restart only because its nanny is not
    // the panel. The nanny is spawned `detached`, which gives it its own session —
    // but *not* its own cgroup, so the default `KillMode=control-group` kills it
    // with the panel and takes the entry down too, quietly falsifying what
    // `persistent: true` promises. `process` signals the panel alone. (An ordinary
    // entry is spawned detached as well, so this keeps every supervised server, not
    // only the nannies — the panel re-adopts such a survivor by its port.)
    "KillMode=process",
    "Restart=always",
    "RestartSec=5",
    ...envLines(spec),
    "",
    "[Install]",
    "WantedBy=default.target",
    ""
  ].join("\n")}`;
}
function systemdSystemUnit(spec, user = null) {
  validate(spec);
  return `${[
    MANAGED(spec),
    "[Unit]",
    `Description=${systemdText(spec.label)}`,
    "After=network-online.target",
    "StartLimitIntervalSec=60",
    "StartLimitBurst=5",
    "",
    "[Service]",
    ...user === null || user === "" || user === "root" ? [] : [`User=${assertUserName(user)}`],
    "Type=exec",
    `ExecStart=${[spec.command, ...spec.args].map(systemdExecWord).join(" ")}`,
    `WorkingDirectory=${systemdPath(spec.cwd, "spec.cwd")}`,
    // See the user unit: `control-group` would kill the nannies too.
    "KillMode=process",
    "Restart=always",
    "RestartSec=5",
    ...envLines(spec),
    "",
    "[Install]",
    "WantedBy=multi-user.target",
    ""
  ].join("\n")}`;
}
function parseKeyValues(stdout) {
  const out = {};
  for (const line of stdout.split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0)
      out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}
async function readUnit(ctx, unit, scope) {
  const scopeArgs = scope === "user" ? ["--user"] : [];
  const show = await ctx.run("systemctl", [...scopeArgs, "show", "-p", "UnitFileState", "-p", "ActiveState", "-p", "Result", "-p", "NRestarts", unit]);
  const props = parseKeyValues(show.stdout);
  const isEnabled = await ctx.run("systemctl", [...scopeArgs, "is-enabled", unit]);
  const enabledCode = codeOf(isEnabled);
  const unitFileState = props.UnitFileState ?? "";
  const knownState = unitFileState !== "" && unitFileState !== "not-found";
  const enabled = enabledCode === 0 || ENABLED_UNIT_STATES.has(unitFileState);
  const installed = enabled || knownState;
  const result = props.Result ?? "";
  return {
    unitFileState,
    activeState: props.ActiveState ?? "",
    result,
    enabled,
    installed,
    reachable: show.error === void 0 || show.error === null,
    detail: `UnitFileState=${unitFileState || "(none)"} ActiveState=${props.ActiveState || "(none)"} Result=${result || "(none)"} NRestarts=${props.NRestarts ?? "0"}`
  };
}
async function userScopeReachable(ctx) {
  const probe = await ctx.run("systemctl", ["--user", "is-system-running"]);
  if (probe.error)
    return { reachable: false, reason: `systemctl --user is not available here (${probe.error})` };
  if (`${probe.stdout}
${probe.stderr}`.includes("Failed to connect to user scope bus"))
    return { reachable: false, reason: "systemctl --user cannot reach a user manager: Failed to connect to user scope bus" };
  return { reachable: true, reason: "" };
}
async function lingerEnabled(ctx) {
  const user = currentUser(ctx);
  if (!user)
    return false;
  const probe = await ctx.run("loginctl", ["show-user", user, "--property=Linger"]);
  if (codeOf(probe) !== 0)
    return false;
  return /(^|\n)Linger=yes(\n|$)/.test(probe.stdout);
}
function problem(run2, command) {
  const code = codeOf(run2);
  if (code === 0)
    return null;
  if (code === null)
    return run2.error ? `${command}: ${run2.error}` : `${command}: no exit code`;
  return `${command} exited ${code}: ${(run2.stderr || run2.stdout).trim() || "(no output)"}`;
}
function createSystemdUserProvider(ctx) {
  const mechanism = "systemd-user";
  const unitOf = (spec) => `${assertUnitName(spec.unitName)}.service`;
  const pathOf = (spec) => posixJoin(configHome(ctx), "systemd", "user", unitOf(spec));
  return {
    mechanism,
    async detect() {
      if (ctx.platform !== "linux")
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: "systemd is Linux-only" };
      const bus = await userScopeReachable(ctx);
      if (!bus.reachable)
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: bus.reason };
      const linger = await lingerEnabled(ctx);
      const privileged = linger || await ctx.sudo();
      return {
        mechanism,
        available: true,
        bootCapable: linger,
        privileged,
        reason: linger ? "a systemd user manager is reachable and linger is on, so the unit starts at boot" : "a systemd user manager is reachable, but linger is off: the unit starts at login until `loginctl enable-linger` succeeds"
      };
    },
    async status(spec) {
      try {
        const unit = unitOf(spec);
        const file = pathOf(spec);
        const own = inspectOwned(file, assertMarker(spec.marker));
        if (own.exists && !own.owned)
          return { state: "not-installed", unitPath: file, detail: own.reason ?? "foreign file", commands: [] };
        const probe = await readUnit(ctx, unit, "user");
        const installed = own.owned || probe.installed;
        const state = bootState(installed, probe.enabled, FAILED_RESULTS.has(probe.result));
        const user = currentUser(ctx);
        const linger = await lingerEnabled(ctx);
        const commands = [];
        if (!linger && user)
          commands.push(shellCommand("sudo", ["loginctl", "enable-linger", user]));
        const detail = `${probe.detail}; ${linger ? "linger is on (boot-capable)" : "linger is off (login-scoped)"}`;
        return { state, unitPath: file, detail, commands };
      } catch (error) {
        return { state: "not-installed", unitPath: null, detail: errorMessage(error), commands: [] };
      }
    },
    async install(spec) {
      try {
        validate(spec);
        const unit = unitOf(spec);
        const file = pathOf(spec);
        const write = writeOwned(file, spec.marker, systemdUserUnit(spec), 420);
        if (write.refusal)
          return failed(write.refusal);
        const before = await readUnit(ctx, unit, "user");
        let changed = write.changed;
        if (write.changed || !before.enabled) {
          const reloadCommand = shellCommand("systemctl", ["--user", "daemon-reload"]);
          const reload = await ctx.run("systemctl", ["--user", "daemon-reload"]);
          const reloadProblem = problem(reload, reloadCommand);
          if (reloadProblem)
            return failed(reloadProblem, { changed, commands: [reloadCommand] });
          const enableCommand = shellCommand("systemctl", ["--user", "enable", "--now", unit]);
          const enable = await ctx.run("systemctl", ["--user", "enable", "--now", unit]);
          const enableProblem = problem(enable, enableCommand);
          if (enableProblem)
            return failed(enableProblem, { changed: true, commands: [enableCommand] });
          changed = true;
        }
        const after = await readUnit(ctx, unit, "user");
        if (!after.enabled)
          return failed(`unit ${unit} is not enabled after install (${after.detail})`, { changed });
        let linger = await lingerEnabled(ctx);
        const user = currentUser(ctx);
        const commands = [];
        if (!linger && user) {
          const res = await ctx.run("loginctl", ["enable-linger", user]);
          if (codeOf(res) === 0) {
            linger = true;
            changed = true;
          } else {
            commands.push(shellCommand("sudo", ["loginctl", "enable-linger", user]));
          }
        }
        const detail = linger ? `${file} installed and enabled; linger is on, so ${unit} starts at boot` : `${file} installed and enabled, but linger is off: ${unit} starts at login only. ${commands.length ? `Run \`${commands[0]}\` to make it boot-capable.` : "No target user could be determined to enable linger for."}`;
        return { ok: true, changed, detail, commands, needsPrivilege: !linger };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    async uninstall(spec) {
      try {
        validate(spec);
        const unit = unitOf(spec);
        const file = pathOf(spec);
        const own = inspectOwned(file, spec.marker);
        if (own.exists && !own.owned)
          return failed(own.reason ?? "foreign file");
        const before = await readUnit(ctx, unit, "user");
        if (!before.reachable && !own.exists) {
          return { ok: true, changed: false, detail: `no unit file at ${file} and systemctl is unavailable; nothing to remove`, commands: [], needsPrivilege: false };
        }
        if (!own.owned && !own.exists && before.installed)
          return failed(`a unit named ${unit} exists but no unit file of ours is at ${file}; refusing to disable a unit this plugin did not install`);
        if (own.owned && before.reachable) {
          const disableCommand = shellCommand("systemctl", ["--user", "disable", "--now", unit]);
          const disable = await ctx.run("systemctl", ["--user", "disable", "--now", unit]);
          const disableCode = codeOf(disable);
          if (disableCode !== 0 && disableCode !== 1 && disableCode !== 4)
            return failed(problem(disable, disableCommand) ?? "disable failed", { commands: [disableCommand] });
        }
        const remove = removeOwned(file, spec.marker);
        if (remove.refusal)
          return failed(remove.refusal);
        let changed = remove.removed;
        if (before.installed || remove.removed) {
          await ctx.run("systemctl", ["--user", "daemon-reload"]);
          changed = true;
        }
        const after = await readUnit(ctx, unit, "user");
        if (after.installed)
          return failed(`unit ${unit} is still known to systemd after removal (${after.detail})`, { changed });
        return {
          ok: true,
          changed,
          detail: remove.removed ? `disabled and removed ${file}` : `${file} was already gone`,
          commands: [],
          needsPrivilege: false
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    /**
     * `restart` stops the panel and starts it again under the unit, so nothing
     * else may stop it first: stopping it from outside would race this call.
     *
     * The proof is that the entry is *installed and enabled*, never that it is
     * already active: `enable --now` just started it while the panel still holds
     * `run.json`, and home-hosted refuses a second panel (`already running (pid
     * …)`), so the unit is `activating`/`failed` at exactly the moment this plan
     * runs. Requiring `is-active` therefore refuses every handover.
     */
    async activate(spec) {
      const unit = unitOf(spec);
      return {
        commands: [["systemctl", "--user", "restart", unit]],
        requires: { commands: [["systemctl", "--user", "is-enabled", unit]], files: [pathOf(spec)] },
        display: [shellCommand("systemctl", ["--user", "restart", unit])]
      };
    },
    /** Stops the panel the unit supervises, keeping the unit enabled. */
    async stopCommands(spec) {
      return [["systemctl", "--user", "stop", unitOf(spec)]];
    },
    /**
     * No `--now`: the panel is already down when a switch runs this.
     *
     * Only our own artifact is retired. `status()` reports a unit as installed from
     * its name alone (`installed = own.owned || probe.installed`), so a
     * `home-hosted.service` somebody else wrote anywhere on the search path would
     * otherwise reach `disable` here — and `home-hosted` is the generic name the
     * machine-default install uses. The marker is what proves it is ours.
     */
    async retireCommands(spec) {
      const unit = unitOf(spec);
      const file = pathOf(spec);
      if (!inspectOwned(file, spec.marker).owned)
        return { commands: [], display: [] };
      return {
        commands: [
          ["systemctl", "--user", "disable", unit],
          ["rm", "-f", file],
          ["systemctl", "--user", "daemon-reload"]
        ],
        display: [
          shellCommand("systemctl", ["--user", "disable", unit]),
          shellCommand("rm", ["-f", file]),
          shellCommand("systemctl", ["--user", "daemon-reload"])
        ]
      };
    }
  };
}
function stageUnit(ctx, unit, content) {
  const staged = posixJoin(tempDir(ctx), `home-hosted-${unit}`);
  fs3.writeFileSync(staged, content, { mode: 420 });
  return staged;
}
function createSystemdSystemProvider(ctx) {
  const mechanism = "systemd-system";
  const unitOf = (spec) => `${assertUnitName(spec.unitName)}.service`;
  const pathOf = (spec) => posixJoin("/etc", "systemd", "system", unitOf(spec));
  const contentOf = (spec) => systemdSystemUnit(spec, bootUserName(ctx));
  const installCommands = (staged, file, unit) => [
    shellCommand("sudo", ["install", "-m", "0644", staged, file]),
    shellCommand("sudo", ["systemctl", "daemon-reload"]),
    shellCommand("sudo", ["systemctl", "enable", "--now", unit])
  ];
  return {
    mechanism,
    async detect() {
      if (ctx.platform !== "linux")
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: "systemd is Linux-only" };
      if (!existsOf(ctx, "/run/systemd/system"))
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: "systemd is not the init system here (no /run/systemd/system)" };
      const privileged = ctx.isRoot || await ctx.sudo();
      const who = accountOf(ctx);
      const scope = who === null || who.root ? "no account was resolved for the entry, so it would run the panel as root" : `the entry runs the panel as ${who.name}`;
      return {
        mechanism,
        available: privileged,
        bootCapable: privileged,
        privileged,
        reason: privileged ? `systemd is PID 1 and this process can use root, so a system unit starts at boot; ${scope}` : "systemd is PID 1, but installing a system unit needs root or passwordless sudo"
      };
    },
    async status(spec) {
      try {
        const unit = unitOf(spec);
        const file = pathOf(spec);
        const own = inspectOwned(file, assertMarker(spec.marker));
        if (own.exists && !own.owned)
          return { state: "not-installed", unitPath: file, detail: own.reason ?? "foreign file", commands: [] };
        const probe = await readUnit(ctx, unit, "system");
        const installed = own.owned || probe.installed;
        const state = bootState(installed, probe.enabled, FAILED_RESULTS.has(probe.result));
        const privileged = ctx.isRoot || await ctx.sudo();
        const commands = [];
        if (installed && !probe.enabled && !privileged)
          commands.push(shellCommand("sudo", ["systemctl", "enable", "--now", unit]));
        return {
          state,
          unitPath: file,
          detail: `${probe.detail}${privileged ? "" : "; needs root to change"}${accountNote(own, ctx)}`,
          commands
        };
      } catch (error) {
        return { state: "not-installed", unitPath: null, detail: errorMessage(error), commands: [] };
      }
    },
    async install(spec) {
      try {
        validate(spec);
        const unit = unitOf(spec);
        const file = pathOf(spec);
        const content = contentOf(spec);
        const own = inspectOwned(file, spec.marker);
        if (own.exists && !own.owned)
          return failed(own.reason ?? "foreign file");
        const before = await readUnit(ctx, unit, "system");
        const changed = !own.exists || own.text !== content;
        if (!ctx.isRoot && !await ctx.sudo()) {
          const staged = stageUnit(ctx, unit, content);
          return failed(`installing a system unit needs root; the unit is staged at ${staged}`, {
            changed: false,
            needsPrivilege: true,
            commands: installCommands(staged, file, unit)
          });
        }
        if (ctx.isRoot) {
          const write = writeOwned(file, spec.marker, content, 420);
          if (write.refusal)
            return failed(write.refusal);
        } else {
          const staged = stageUnit(ctx, unit, content);
          const installCommand = shellCommand("sudo", ["install", "-m", "0644", staged, file]);
          const install = await ctx.run("sudo", ["-n", "install", "-m", "0644", staged, file]);
          const installProblem = problem(install, installCommand);
          if (installProblem)
            return failed(installProblem, { needsPrivilege: true, commands: installCommands(staged, file, unit) });
          fs3.rmSync(staged, { force: true });
        }
        if (changed || !before.enabled) {
          const sudoPrefix = ctx.isRoot ? [] : ["-n"];
          const reloadCommand = shellCommand("sudo", ["systemctl", "daemon-reload"]);
          const reload = await ctx.run("sudo", [...sudoPrefix, "systemctl", "daemon-reload"]);
          const reloadProblem = problem(reload, reloadCommand);
          if (reloadProblem)
            return failed(reloadProblem, { changed, needsPrivilege: !ctx.isRoot, commands: [reloadCommand] });
          const enableCommand = shellCommand("sudo", ["systemctl", "enable", "--now", unit]);
          const enable = await ctx.run("sudo", [...sudoPrefix, "systemctl", "enable", "--now", unit]);
          const enableProblem = problem(enable, enableCommand);
          if (enableProblem)
            return failed(enableProblem, { changed: true, needsPrivilege: !ctx.isRoot, commands: [enableCommand] });
        }
        const after = await readUnit(ctx, unit, "system");
        if (!after.enabled)
          return failed(`unit ${unit} is not enabled after install (${after.detail})`, { changed });
        return {
          ok: true,
          changed: changed || !before.enabled,
          detail: `${file} installed and enabled as a system unit (${after.detail})`,
          commands: [],
          needsPrivilege: !ctx.isRoot
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    async uninstall(spec) {
      try {
        const unit = unitOf(spec);
        const file = pathOf(spec);
        const own = inspectOwned(file, spec.marker);
        if (own.exists && !own.owned)
          return failed(own.reason ?? "foreign file");
        const privileged = ctx.isRoot || await ctx.sudo();
        if (!privileged) {
          if (!own.exists)
            return { ok: true, changed: false, detail: `no unit file at ${file} and no privilege to change systemd; nothing to remove`, commands: [], needsPrivilege: false };
          return failed("removing a system unit needs root", {
            needsPrivilege: true,
            commands: [
              shellCommand("sudo", ["systemctl", "disable", "--now", unit]),
              shellCommand("sudo", ["rm", "-f", file]),
              shellCommand("sudo", ["systemctl", "daemon-reload"])
            ]
          });
        }
        const prefix = ctx.isRoot ? [] : ["-n"];
        if (!own.exists && !own.owned)
          return failed(`no unit file of ours at ${file}; refusing to disable a unit this plugin did not install`);
        const disableCommand = shellCommand("sudo", ["systemctl", "disable", "--now", unit]);
        const disable = await ctx.run("sudo", [...prefix, "systemctl", "disable", "--now", unit]);
        const disableCode = codeOf(disable);
        if (disableCode !== 0 && disableCode !== 1 && disableCode !== 4)
          return failed(problem(disable, disableCommand) ?? "disable failed", { needsPrivilege: !ctx.isRoot, commands: [disableCommand] });
        if (own.exists) {
          if (ctx.isRoot) {
            const remove = removeOwned(file, spec.marker);
            if (remove.refusal)
              return failed(remove.refusal);
          } else {
            if (!own.owned)
              return failed(own.reason ?? "foreign file");
            const rmCommand = shellCommand("sudo", ["rm", "-f", file]);
            const rm = await ctx.run("sudo", ["-n", "rm", "-f", file]);
            const rmProblem = problem(rm, rmCommand);
            if (rmProblem)
              return failed(rmProblem, { needsPrivilege: true, commands: [rmCommand] });
          }
        }
        await ctx.run("sudo", [...prefix, "systemctl", "daemon-reload"]);
        const after = await readUnit(ctx, unit, "system");
        if (after.installed)
          return failed(`unit ${unit} is still known to systemd after removal (${after.detail})`, { changed: true, needsPrivilege: !ctx.isRoot });
        return {
          ok: true,
          changed: own.exists || disableCode === 0,
          detail: own.exists ? `disabled and removed ${file}` : `${file} was already gone`,
          commands: [],
          needsPrivilege: !ctx.isRoot
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    /**
     * `restart` stops the panel and starts it again under the unit, so nothing
     * else may stop it first. A system unit needs root; `sudo -n` never prompts,
     * which is the only elevation a detached helper can get.
     *
     * Installed-and-enabled is the proof, not active — see the user unit's
     * `activate` for why a freshly enabled unit can never be active here.
     */
    async activate(spec) {
      const unit = unitOf(spec);
      const elevate = (args) => ctx.isRoot ? args : ["sudo", "-n", ...args];
      return {
        commands: [elevate(["systemctl", "restart", unit])],
        requires: { commands: [elevate(["systemctl", "is-enabled", unit])], files: [pathOf(spec)] },
        display: [shellCommand("sudo", ["systemctl", "restart", unit])]
      };
    },
    /**
     * Stops the panel the unit supervises. Without this a switch would lose the
     * race: `Restart=always` brings the panel back as soon as the CLI's `down`
     * ends, before the new entry starts one.
     */
    async stopCommands(spec) {
      const elevate = (args) => ctx.isRoot ? args : ["sudo", "-n", ...args];
      return [elevate(["systemctl", "stop", unitOf(spec)])];
    },
    /**
     * The retirement for a switch. Deliberately no `--now`: this runs in the
     * helper *after* the panel is already down, and `--now` here would race the
     * start command that follows.
     */
    async retireCommands(spec) {
      const unit = unitOf(spec);
      const file = pathOf(spec);
      if (!inspectOwned(file, spec.marker).owned)
        return { commands: [], display: [] };
      const elevate = (args) => ctx.isRoot ? args : ["sudo", "-n", ...args];
      return {
        commands: [
          elevate(["systemctl", "disable", unit]),
          elevate(["rm", "-f", file]),
          elevate(["systemctl", "daemon-reload"])
        ],
        display: [
          shellCommand("sudo", ["systemctl", "disable", unit]),
          shellCommand("sudo", ["rm", "-f", file]),
          shellCommand("sudo", ["systemctl", "daemon-reload"])
        ]
      };
    }
  };
}

// src/boot/launchd.ts
import fs4 from "node:fs";
import path3 from "node:path";
var LAUNCHD_LABEL_PREFIX = "dev.home-hosted.";
var LAUNCHCTL_ALREADY_LOADED = 5;
var LAUNCHCTL_NOT_LOADED = 113;
var LAUNCHCTL_NO_SUCH_PROCESS = 3;
function validate2(spec) {
  assertUnitName(spec.unitName);
  assertMarker(spec.marker);
  assertLabel(spec.label);
  assertAbsolute(spec.command, "spec.command");
  assertAbsolute(spec.cwd, "spec.cwd");
  assertAbsolute(spec.logDir, "spec.logDir");
  for (const arg of spec.args)
    assertArg(arg);
  for (const key of Object.keys(spec.env))
    assertEnvKey(key);
}
function launchdLabel(spec) {
  return `${LAUNCHD_LABEL_PREFIX}${assertUnitName(spec.unitName)}`;
}
function launchdPlist(spec, options = {}) {
  validate2(spec);
  const label = launchdLabel(spec);
  const named = options.userName?.trim();
  const userName = named === void 0 || named.length === 0 ? void 0 : assertUserName(named);
  const out = path3.posix.join(spec.logDir, `${label}.out.log`);
  const err = path3.posix.join(spec.logDir, `${label}.err.log`);
  const envKeys = Object.keys(spec.env);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "	<key>Label</key>",
    `	<string>${xmlEscape(label)}</string>`,
    ...userName === void 0 || userName.length === 0 ? [] : ["	<key>UserName</key>", `	<string>${xmlEscape(userName)}</string>`],
    "	<key>ProgramArguments</key>",
    "	<array>",
    ...[spec.command, ...spec.args].map((arg) => `		<string>${xmlEscape(arg)}</string>`),
    "	</array>",
    "	<key>RunAtLoad</key>",
    "	<true/>",
    "	<key>KeepAlive</key>",
    "	<dict>",
    "		<key>SuccessfulExit</key>",
    "		<false/>",
    "	</dict>",
    "	<key>ThrottleInterval</key>",
    "	<integer>10</integer>",
    "	<key>WorkingDirectory</key>",
    `	<string>${xmlEscape(spec.cwd)}</string>`,
    ...envKeys.length ? [
      "	<key>EnvironmentVariables</key>",
      "	<dict>",
      ...envKeys.flatMap((key) => [`		<key>${xmlEscape(key)}</key>`, `		<string>${xmlEscape(spec.env[key] ?? "")}</string>`]),
      "	</dict>"
    ] : [],
    "	<key>StandardOutPath</key>",
    `	<string>${xmlEscape(out)}</string>`,
    "	<key>StandardErrorPath</key>",
    `	<string>${xmlEscape(err)}</string>`,
    `	<!-- Managed by ${assertXmlCommentSafe(spec.marker)} -->`,
    "</dict>",
    "</plist>",
    ""
  ];
  return lines.join("\n");
}
function codeOf2(result) {
  return result.error ? null : result.code;
}
function problem2(run2, command) {
  const code = codeOf2(run2);
  if (code === 0)
    return null;
  if (code === null)
    return run2.error ? `${command}: ${run2.error}` : `${command}: no exit code`;
  return `${command} exited ${code}: ${(run2.stderr || run2.stdout).trim() || "(no output)"}`;
}
function ensureDirQuiet(dir) {
  try {
    fs4.mkdirSync(dir, { recursive: true });
  } catch {
  }
}
function createLaunchdProvider(ctx, mode) {
  const mechanism = mode === "agent" ? "launchd-agent" : "launchd-daemon";
  const pathOf = (spec) => mode === "agent" ? posixJoin(ctx.home, "Library", "LaunchAgents", `${launchdLabel(spec)}.plist`) : posixJoin("/Library", "LaunchDaemons", `${launchdLabel(spec)}.plist`);
  const domainOf = async () => {
    if (mode === "daemon")
      return "system";
    const uid = uidOf(ctx);
    if (!uid)
      return null;
    const gui = `gui/${uid}`;
    if (codeOf2(await ctx.run("launchctl", ["print", gui])) === 0)
      return gui;
    const user = `user/${uid}`;
    if (codeOf2(await ctx.run("launchctl", ["print", user])) === 0)
      return user;
    return null;
  };
  const privileged = async () => mode === "agent" ? true : ctx.isRoot || await ctx.sudo();
  const runPrivileged = async (program, args) => mode === "agent" || ctx.isRoot ? await ctx.run(program, args) : await ctx.run("sudo", ["-n", program, ...args]);
  const commands = (file, label) => mode === "agent" ? [] : [
    shellCommand("sudo", ["launchctl", "bootstrap", "system", file]),
    shellCommand("sudo", ["launchctl", "enable", `system/${label}`])
  ];
  return {
    mechanism,
    async detect() {
      if (ctx.platform !== "darwin")
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: "launchd is macOS-only" };
      if (mode === "agent") {
        const domain = await domainOf();
        return {
          mechanism,
          // A plist in ~/Library/LaunchAgents is loaded at login whether or not
          // this process can reach launchd right now, so an unreachable domain
          // is a diagnostic, not a reason to refuse.
          available: true,
          bootCapable: false,
          privileged: true,
          reason: domain === null ? `a LaunchAgent loads at login; launchd's domain is not reachable from this process for uid ${uidOf(ctx) ?? "?"} right now, so it is loaded at the next login` : `launchd ${domain} domain is reachable; a LaunchAgent loads at login, not at boot`
        };
      }
      const canElevate = ctx.isRoot || await ctx.sudo();
      return {
        mechanism,
        // Always selectable: without root the plugin stages the plist and hands
        // over the three sudo commands, which is the only way to start before
        // login on a Mac that has no passwordless sudo.
        available: true,
        bootCapable: true,
        privileged: canElevate,
        reason: canElevate ? "this process can write /Library/LaunchDaemons, so a LaunchDaemon starts at boot" : "a LaunchDaemon starts at boot but needs root here, so the plugin stages the plist and shows the sudo commands"
      };
    },
    async status(spec) {
      try {
        const file = pathOf(spec);
        const label = launchdLabel(spec);
        const own = inspectOwned(file, assertMarker(spec.marker));
        if (own.exists && !own.owned)
          return { state: "not-installed", unitPath: file, detail: own.reason ?? "foreign file", commands: [] };
        const domain = await domainOf();
        if (!own.owned)
          return { state: "not-installed", unitPath: file, detail: `no plist at ${file}`, commands: [] };
        if (domain === null)
          return { state: "enabled-running", unitPath: file, detail: `${file} is present; launchd has no reachable domain for uid ${uidOf(ctx) ?? "?"}, so it loads at the next login`, commands: [] };
        const probe = await ctx.run("launchctl", ["print", `${domain}/${label}`]);
        const loaded = codeOf2(probe) === 0;
        const state = bootState(true, true, false);
        return {
          state,
          unitPath: file,
          detail: `${file} is present; ${loaded ? `loaded in ${domain}` : `not loaded right now (RunAtLoad loads it at the next login)`}`,
          commands: []
        };
      } catch (error) {
        return { state: "not-installed", unitPath: null, detail: errorMessage(error), commands: [] };
      }
    },
    async install(spec) {
      try {
        validate2(spec);
        const file = pathOf(spec);
        const label = launchdLabel(spec);
        const content = launchdPlist(spec, mode === "daemon" ? { userName: bootUserName(ctx) } : {});
        const own = inspectOwned(file, spec.marker);
        if (own.exists && !own.owned)
          return failed(own.reason ?? "foreign file");
        const staged = posixJoin(tempDir(ctx), `${label}.plist`);
        if (!await privileged()) {
          ensureDirQuiet(path3.posix.dirname(staged));
          fs4.writeFileSync(staged, content, { mode: 420 });
          return failed("writing /Library/LaunchDaemons needs root; the plist is staged for you to install", {
            needsPrivilege: true,
            commands: [
              shellCommand("sudo", ["install", "-m", "0644", staged, file]),
              shellCommand("sudo", ["launchctl", "bootstrap", "system", file]),
              shellCommand("sudo", ["launchctl", "enable", `system/${label}`])
            ]
          });
        }
        const domain = await domainOf();
        ensureDirQuiet(path3.posix.dirname(file));
        ensureDirQuiet(spec.logDir);
        const loaded = domain !== null && codeOf2(await ctx.run("launchctl", ["print", `${domain}/${label}`])) === 0;
        const before = { text: own.text, exists: own.exists };
        let changed = false;
        if (mode === "agent" || ctx.isRoot) {
          const write = writeOwned(file, spec.marker, content, 420);
          if (write.refusal)
            return failed(write.refusal);
          changed = write.changed;
        } else {
          ensureDirQuiet(path3.dirname(staged));
          fs4.writeFileSync(staged, content, { mode: 420 });
          changed = !before.exists || before.text !== content;
          if (!changed) {
            fs4.rmSync(staged, { force: true });
          } else {
            const installCommand = shellCommand("sudo", ["install", "-m", "0644", staged, file]);
            const install = await runPrivileged("install", ["-m", "0644", staged, file]);
            if (codeOf2(install) !== 0)
              return failed(problem2(install, installCommand) ?? "launchctl failed", { needsPrivilege: true, commands: [installCommand] });
            fs4.rmSync(staged, { force: true });
          }
        }
        const lint = await runPrivileged("plutil", ["-lint", file]);
        if (codeOf2(lint) !== 0)
          return failed(`plutil -lint rejected the generated plist: ${(lint.stderr || lint.stdout).trim() || "no output"}`, { changed, commands: commands(file, label) });
        if (domain === null) {
          return {
            ok: true,
            changed,
            detail: `${file} is in place; launchd's domain is not reachable from this process, so it loads at the next login`,
            commands: [],
            needsPrivilege: false
          };
        }
        if (loaded && changed) {
          const bootout = await runPrivileged("launchctl", ["bootout", `${domain}/${label}`]);
          const bootoutCode = codeOf2(bootout);
          if (bootoutCode !== 0 && bootoutCode !== LAUNCHCTL_NO_SUCH_PROCESS && bootoutCode !== LAUNCHCTL_NOT_LOADED)
            return failed(problem2(bootout, shellCommand("launchctl", ["bootout", `${domain}/${label}`])) ?? "launchctl failed", { changed, commands: commands(file, label) });
        }
        if (changed || !loaded) {
          const boot = await runPrivileged("launchctl", ["bootstrap", domain, file]);
          const bootCode = codeOf2(boot);
          if (bootCode !== 0 && bootCode !== LAUNCHCTL_ALREADY_LOADED)
            return failed(problem2(boot, shellCommand("launchctl", ["bootstrap", domain, file])) ?? "launchctl failed", { changed, commands: commands(file, label) });
          if (bootCode === 0)
            changed = true;
          const enable = await runPrivileged("launchctl", ["enable", `${domain}/${label}`]);
          if (codeOf2(enable) !== 0)
            return failed(problem2(enable, shellCommand("launchctl", ["enable", `${domain}/${label}`])) ?? "launchctl failed", { changed, commands: commands(file, label) });
        }
        const verify = await runPrivileged("launchctl", ["print", `${domain}/${label}`]);
        if (codeOf2(verify) !== 0)
          return failed(`launchctl print ${domain}/${label} did not confirm the job (exit ${String(codeOf2(verify))})`, { changed, commands: commands(file, label) });
        return {
          ok: true,
          changed,
          detail: `${file} installed and loaded in ${domain}`,
          commands: [],
          needsPrivilege: mode === "daemon" && !ctx.isRoot
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    async uninstall(spec) {
      try {
        const file = pathOf(spec);
        const label = launchdLabel(spec);
        const own = inspectOwned(file, spec.marker);
        if (own.exists && !own.owned)
          return failed(own.reason ?? "foreign file");
        if (mode === "daemon" && !ctx.isRoot && !await ctx.sudo()) {
          if (!own.exists)
            return { ok: true, changed: false, detail: `no plist at ${file} and no privilege to change launchd; nothing to remove`, commands: [], needsPrivilege: false };
          return failed("removing a LaunchDaemon needs root", {
            needsPrivilege: true,
            commands: [
              shellCommand("sudo", ["launchctl", "bootout", `system/${label}`]),
              shellCommand("sudo", ["rm", "-f", file])
            ]
          });
        }
        const domain = await domainOf();
        if (!own.exists && !own.owned)
          return failed(`no plist of ours at ${file}; refusing to unload a job this plugin did not install`);
        let changed = false;
        if (domain !== null) {
          const bootout = await runPrivileged("launchctl", ["bootout", `${domain}/${label}`]);
          const bootoutCode = codeOf2(bootout);
          if (bootoutCode === 0)
            changed = true;
          else if (bootoutCode !== LAUNCHCTL_NO_SUCH_PROCESS && bootoutCode !== LAUNCHCTL_NOT_LOADED)
            return failed(problem2(bootout, shellCommand("launchctl", ["bootout", `${domain}/${label}`])) ?? "launchctl failed", { commands: commands(file, label) });
        }
        if (own.exists) {
          if (mode === "agent" || ctx.isRoot) {
            const remove = removeOwned(file, spec.marker);
            if (remove.refusal)
              return failed(remove.refusal);
            if (remove.removed)
              changed = true;
          } else {
            if (!own.owned)
              return failed(own.reason ?? "foreign file");
            const rmCommand = shellCommand("sudo", ["rm", "-f", file]);
            const rm = await runPrivileged("rm", ["-f", file]);
            if (codeOf2(rm) !== 0)
              return failed(problem2(rm, rmCommand) ?? "launchctl failed", { needsPrivilege: true, commands: [rmCommand] });
            changed = true;
          }
        }
        if (domain !== null) {
          const verify = await runPrivileged("launchctl", ["print", `${domain}/${label}`]);
          if (codeOf2(verify) === 0)
            return failed(`${label} is still loaded in ${domain} after bootout`, { changed });
        }
        return {
          ok: true,
          changed,
          detail: own.exists ? `unloaded and removed ${file}` : `no plist at ${file} (already gone)`,
          commands: [],
          needsPrivilege: mode === "daemon" && !ctx.isRoot
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    /**
     * A LaunchAgent that was written but never booted is exactly the state an
     * install leaves behind, and nothing else can start it: `kickstart -k` needs
     * the label loaded first, so loading it is part of the start.
     */
    async activate(spec) {
      const file = pathOf(spec);
      const label = launchdLabel(spec);
      const domain = await domainOf();
      if (domain === null)
        return null;
      const job = `${domain}/${label}`;
      if (mode === "daemon") {
        return {
          commands: [
            ["sudo", "-n", "launchctl", "bootstrap", "system", file],
            ["sudo", "-n", "launchctl", "kickstart", "-k", job]
          ],
          requires: { commands: [], files: [file] },
          display: [
            shellCommand("sudo", ["launchctl", "bootstrap", "system", file]),
            shellCommand("sudo", ["launchctl", "kickstart", "-k", job])
          ]
        };
      }
      const loaded = codeOf2(await ctx.run("launchctl", ["print", job])) === 0;
      return {
        commands: [
          ...loaded ? [] : [["launchctl", "bootstrap", domain, file]],
          ["launchctl", "kickstart", "-k", job]
        ],
        requires: { commands: [], files: [file] },
        display: [
          ...loaded ? [] : [shellCommand("launchctl", ["bootstrap", domain, file])],
          shellCommand("launchctl", ["kickstart", "-k", job])
        ]
      };
    },
    /** `KeepAlive` would resurrect the panel, so the job itself has to stop it. */
    async stopCommands(spec) {
      const label = launchdLabel(spec);
      const domain = await domainOf();
      if (domain === null)
        return [];
      const job = `${domain}/${label}`;
      return mode === "daemon" ? [["sudo", "-n", "launchctl", "kill", "SIGTERM", job]] : [["launchctl", "kill", "SIGTERM", job]];
    },
    /**
     * launchd has no "unload but leave running": `bootout` always stops the job.
     * That is why retirement is handed to the caller instead of run during the
     * install — here it runs once the panel is already down, and the entry being
     * started is a different mechanism's, so stopping this job is harmless.
     */
    async retireCommands(spec) {
      const file = pathOf(spec);
      const label = launchdLabel(spec);
      const domain = await domainOf();
      const bootout = mode === "daemon" ? ["sudo", "-n", "launchctl", "bootout", `system/${label}`] : domain === null ? null : ["launchctl", "bootout", `${domain}/${label}`];
      const remove = mode === "daemon" ? ["sudo", "-n", "rm", "-f", file] : ["rm", "-f", file];
      return {
        commands: [...bootout === null ? [] : [bootout], remove],
        // The display mirrors the command that actually runs: an agent's bootout is
        // unprivileged and names the agent's own domain, so printing the `system/`
        // form with `sudo` showed a person a command this plugin never runs.
        display: [
          ...bootout === null ? [] : [shellCommand(bootout[0], bootout.slice(1))],
          shellCommand(remove[0], remove.slice(1))
        ]
      };
    }
  };
}
function createLaunchdAgentProvider(ctx) {
  return createLaunchdProvider(ctx, "agent");
}
function createLaunchdDaemonProvider(ctx) {
  return createLaunchdProvider(ctx, "daemon");
}

// src/boot/xdg.ts
import fs5 from "node:fs";
import path4 from "node:path";
function validate3(spec) {
  assertUnitName(spec.unitName);
  assertMarker(spec.marker);
  assertLabel(spec.label);
  assertAbsolute(spec.command, "spec.command");
  assertAbsolute(spec.cwd, "spec.cwd");
  for (const arg of spec.args)
    assertArg(arg);
  for (const key of Object.keys(spec.env))
    assertEnvKey(key);
}
function fileMarker(spec) {
  return desktopValueEscape(assertMarker(spec.marker));
}
function xdgDesktopEntry(spec) {
  validate3(spec);
  return `${[
    "[Desktop Entry]",
    "Type=Application",
    desktopValue("Name", spec.label),
    desktopValue("Comment", `home-hosted daemon, managed by ${spec.marker}`),
    `Exec=${desktopExec(spec.command, spec.args)}`,
    desktopValue("Path", spec.cwd),
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    desktopValue("X-HomeHosted-Marker", spec.marker),
    ""
  ].join("\n")}`;
}
function desktopFlag(text, key) {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}=`))
      return trimmed.slice(key.length + 1).trim();
  }
  return null;
}
function createXdgAutostartProvider(ctx) {
  const mechanism = "xdg-autostart";
  const unitOf = (spec) => `${assertUnitName(spec.unitName)}.desktop`;
  const pathOf = (spec) => posixJoin(configHome(ctx), "autostart", unitOf(spec));
  return {
    mechanism,
    async detect() {
      if (ctx.platform !== "linux")
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: "XDG autostart is Linux-only" };
      return {
        mechanism,
        available: true,
        bootCapable: false,
        privileged: true,
        reason: `a .desktop entry under ${posixJoin(configHome(ctx), "autostart")} needs no privilege, but it starts at login rather than at boot`
      };
    },
    async status(spec) {
      try {
        const file = pathOf(spec);
        const own = inspectOwned(file, fileMarker(spec));
        if (own.exists && !own.owned)
          return { state: "not-installed", unitPath: file, detail: own.reason ?? "foreign file", commands: [] };
        if (!own.owned || own.text === null)
          return { state: "not-installed", unitPath: file, detail: `no autostart entry at ${file}`, commands: [] };
        const enabled = desktopFlag(own.text, "X-GNOME-Autostart-enabled") !== "false" && desktopFlag(own.text, "Hidden") !== "true";
        const state = bootState(true, enabled, false);
        return {
          state,
          unitPath: file,
          detail: `${file} is present; ${enabled ? "it starts at login" : "it is disabled"} (login scope, not boot)`,
          commands: []
        };
      } catch (error) {
        return { state: "not-installed", unitPath: null, detail: errorMessage(error), commands: [] };
      }
    },
    async install(spec) {
      try {
        validate3(spec);
        const file = pathOf(spec);
        fs5.mkdirSync(path4.dirname(file), { recursive: true });
        const write = writeOwned(file, fileMarker(spec), xdgDesktopEntry(spec), 420);
        if (write.refusal)
          return failed(write.refusal);
        const text = inspectOwned(file, fileMarker(spec)).text;
        const enabled = text !== null && desktopFlag(text, "X-GNOME-Autostart-enabled") !== "false" && desktopFlag(text, "Hidden") !== "true";
        if (!enabled)
          return failed(`${file} was written but does not read back as enabled`, { changed: write.changed });
        return {
          ok: true,
          changed: write.changed,
          detail: write.changed ? `${file} installed; it starts at login (not at boot)` : `${file} was already installed and enabled`,
          commands: [],
          needsPrivilege: false
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    async uninstall(spec) {
      try {
        const file = pathOf(spec);
        const own = inspectOwned(file, fileMarker(spec));
        if (own.exists && !own.owned)
          return failed(own.reason ?? "foreign file");
        const remove = removeOwned(file, fileMarker(spec));
        if (remove.refusal)
          return failed(remove.refusal);
        return {
          ok: true,
          changed: remove.removed,
          detail: remove.removed ? `removed ${file}` : `${file} was already gone`,
          commands: [],
          needsPrivilege: false
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    /**
     * A `.desktop` entry has no launcher of its own: the desktop session reads
     * the file at login. Nothing here can start the panel, and claiming a start
     * command would be a fiction, so the caller falls back to the CLI.
     */
    async activate() {
      return null;
    },
    /** A file the session reads at login: deleting it stops nothing. */
    async retireCommands(spec) {
      const file = pathOf(spec);
      return { commands: [["rm", "-f", file]], display: [shellCommand("rm", ["-f", file])] };
    }
  };
}

// src/boot/windows.ts
import fs6 from "node:fs";
import path5 from "node:path";
var RUN_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
var MARKER_KEY = "HKCU\\Software\\home-hosted";
var RUN_VALUE_LIMIT = 260;
function validate4(spec) {
  assertUnitName(spec.unitName);
  assertMarker(spec.marker);
  assertLabel(spec.label);
  assertAbsolute(spec.command, "spec.command");
  assertAbsolute(spec.cwd, "spec.cwd");
  for (const arg of spec.args)
    assertArg(arg);
  for (const key of Object.keys(spec.env))
    assertEnvKey(key);
}
function codeOf3(result) {
  return result.error ? null : result.code;
}
function problem3(run2, command) {
  const code = codeOf3(run2);
  if (code === 0)
    return null;
  if (code === null)
    return run2.error ? `${command}: ${run2.error}` : `${command}: no exit code`;
  return `${command} exited ${code}: ${(run2.stderr || run2.stdout).trim() || "(no output)"}`;
}
async function queryReg(ctx, key, name2) {
  const res = await ctx.run("reg.exe", ["query", key, "/v", name2]);
  if (res.error || res.code !== 0)
    return { exists: false, data: null };
  for (const line of res.stdout.split(/\r?\n/)) {
    const match = /^\s{2,}(.+?)\s{2,}(REG_[A-Z_]+)\s{2,}(.*)$/.exec(line);
    if (match && match[1]?.trim() === name2)
      return { exists: true, data: (match[3] ?? "").trim() };
  }
  return { exists: false, data: null };
}
function windowsRunPayload(ctx, spec) {
  validate4(spec);
  const direct = windowsCommandLine(spec.command, spec.args);
  if (direct.length <= RUN_VALUE_LIMIT)
    return { data: direct, wrapperPath: null, wrapperContent: null };
  const wrapperPath = path5.join(localAppData(ctx), "home-hosted", `${spec.unitName}.cmd`);
  return {
    data: `cmd.exe /c ${windowsArg(wrapperPath)}`,
    wrapperPath,
    wrapperContent: `@echo off\r
rem ${spec.marker}\r
${batchCommandLine(spec.command, spec.args)}\r
`
  };
}
function createWindowsRunProviderImpl(ctx) {
  const mechanism = "windows-run";
  const nameOf = (spec) => assertRegistryValueName(assertUnitName(spec.unitName));
  const addValue = (key, name2, data) => ctx.run("reg.exe", ["add", key, "/v", name2, "/t", "REG_SZ", "/d", data, "/f"]);
  return {
    mechanism,
    async detect() {
      if (ctx.platform !== "win32")
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: "the Run key is Windows-only" };
      return {
        mechanism,
        available: true,
        bootCapable: false,
        privileged: true,
        reason: `HKCU\\\u2026\\Run needs no admin, but it starts at login rather than at boot`
      };
    },
    async status(spec) {
      try {
        const name2 = nameOf(spec);
        const marker = assertMarker(spec.marker);
        const value = await queryReg(ctx, RUN_KEY, name2);
        if (!value.exists)
          return { state: "not-installed", unitPath: RUN_KEY, detail: `no ${RUN_KEY}\\${name2} value`, commands: [] };
        const markerValue = await queryReg(ctx, MARKER_KEY, name2);
        const owned = markerValue.data?.includes(marker) === true;
        if (!owned)
          return { state: "not-installed", unitPath: RUN_KEY, detail: `${name2} exists under ${RUN_KEY} but is not marked as ours; refusing to treat it as this plugin's entry`, commands: [] };
        const state = bootState(true, true, false);
        return { state, unitPath: RUN_KEY, detail: `${RUN_KEY}\\${name2} starts at login (not at boot)`, commands: [] };
      } catch (error) {
        return { state: "not-installed", unitPath: RUN_KEY, detail: errorMessage(error), commands: [] };
      }
    },
    async install(spec) {
      try {
        validate4(spec);
        const name2 = nameOf(spec);
        const marker = assertMarker(spec.marker);
        const payload = windowsRunPayload(ctx, spec);
        const wrapperExists = payload.wrapperPath !== null && fs6.existsSync(payload.wrapperPath);
        const wrapperOwn = payload.wrapperPath ? inspectOwned(payload.wrapperPath, marker) : null;
        if (wrapperOwn?.exists && !wrapperOwn.owned)
          return failed(wrapperOwn.reason ?? "foreign wrapper");
        const markerValue = await queryReg(ctx, MARKER_KEY, name2);
        const owned = markerValue.data?.includes(marker) === true;
        const current = await queryReg(ctx, RUN_KEY, name2);
        if (current.exists && !owned)
          return failed(`${RUN_KEY}\\${name2} already exists and was not written by this plugin; refusing to overwrite it`);
        const commands = [
          windowsDisplayCommand("reg.exe", ["add", RUN_KEY, "/v", name2, "/t", "REG_SZ", "/d", payload.data, "/f"])
        ];
        let changed = false;
        if (payload.wrapperPath && payload.wrapperContent) {
          const write = writeOwned(payload.wrapperPath, marker, payload.wrapperContent, 420);
          if (write.refusal)
            return failed(write.refusal);
          changed = write.changed || changed;
        }
        if (!current.exists || current.data !== payload.data) {
          const add = await addValue(RUN_KEY, name2, payload.data);
          const addProblem = problem3(add, commands[0] ?? "reg.exe add");
          if (addProblem)
            return failed(addProblem, { changed, commands });
          changed = true;
        }
        if (!owned) {
          const mark = await addValue(MARKER_KEY, name2, marker);
          const markProblem = problem3(mark, windowsDisplayCommand("reg.exe", ["add", MARKER_KEY, "/v", name2, "/t", "REG_SZ", "/d", marker, "/f"]));
          if (markProblem)
            return failed(markProblem, { changed, commands });
          changed = true;
        }
        const after = await queryReg(ctx, RUN_KEY, name2);
        if (after.data !== payload.data)
          return failed(`${RUN_KEY}\\${name2} does not read back as the value that was written`, { changed, commands });
        if (!payload.wrapperPath && wrapperExists && wrapperOwn?.owned) {
          removeOwned(path5.join(localAppData(ctx), "home-hosted", `${spec.unitName}.cmd`), marker);
        }
        return {
          ok: true,
          changed,
          detail: changed ? `${RUN_KEY}\\${name2} installed; it starts at login (not at boot)` : `${RUN_KEY}\\${name2} was already installed`,
          commands: [],
          needsPrivilege: false
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    async uninstall(spec) {
      try {
        const name2 = nameOf(spec);
        const marker = assertMarker(spec.marker);
        const current = await queryReg(ctx, RUN_KEY, name2);
        const markerValue = await queryReg(ctx, MARKER_KEY, name2);
        const owned = markerValue.data?.includes(marker) === true;
        if (current.exists && !owned) {
          const payload2 = windowsRunPayload(ctx, spec);
          const wrapperOwned = payload2.wrapperPath !== null ? inspectOwned(payload2.wrapperPath, marker).owned : false;
          if (current.data !== payload2.data && !wrapperOwned)
            return failed(`${RUN_KEY}\\${name2} is not marked as ours; refusing to delete a foreign Run value`);
        }
        let changed = false;
        if (current.exists) {
          const del = await ctx.run("reg.exe", ["delete", RUN_KEY, "/v", name2, "/f"]);
          const delCode = codeOf3(del);
          if (delCode !== 0 && delCode !== 1)
            return failed(problem3(del, windowsDisplayCommand("reg.exe", ["delete", RUN_KEY, "/v", name2, "/f"])) ?? "reg.exe delete failed");
          changed = delCode === 0;
        }
        if (owned) {
          await ctx.run("reg.exe", ["delete", MARKER_KEY, "/v", name2, "/f"]);
          changed = true;
        }
        const payload = windowsRunPayload(ctx, spec);
        if (payload.wrapperPath) {
          const remove = removeOwned(payload.wrapperPath, marker);
          if (remove.refusal)
            return failed(remove.refusal);
          changed = remove.removed || changed;
        }
        const stale = path5.join(localAppData(ctx), "home-hosted", `${spec.unitName}.cmd`);
        const staleRemove = removeOwned(stale, marker);
        if (staleRemove.refusal)
          return failed(staleRemove.refusal);
        changed = staleRemove.removed || changed;
        const after = await queryReg(ctx, RUN_KEY, name2);
        if (after.exists)
          return failed(`${RUN_KEY}\\${name2} still exists after removal`, { changed });
        return {
          ok: true,
          changed,
          detail: changed ? `removed ${RUN_KEY}\\${name2}` : `${RUN_KEY}\\${name2} was already gone`,
          commands: [],
          needsPrivilege: false
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    /**
     * The `Run` key is read by the shell at logon; there is no way to make it
     * start something now. Reporting none is what sends the caller back to the
     * CLI, which is the only honest way to bring the panel up here.
     */
    async activate() {
      return null;
    },
    /** Deleting the value and its marker stops nothing that is already running. */
    async retireCommands(spec) {
      const name2 = nameOf(spec);
      return {
        commands: [
          ["reg.exe", "delete", RUN_KEY, "/v", name2, "/f"],
          ["reg.exe", "delete", MARKER_KEY, "/v", name2, "/f"]
        ],
        display: [
          windowsDisplayCommand("reg.exe", ["delete", RUN_KEY, "/v", name2, "/f"]),
          windowsDisplayCommand("reg.exe", ["delete", MARKER_KEY, "/v", name2, "/f"])
        ]
      };
    }
  };
}
function scheduledTaskXml(spec) {
  validate4(spec);
  const args = spec.args.map(windowsArg).join(" ");
  return `${[
    '<?xml version="1.0" encoding="UTF-16"?>',
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
    "<RegistrationInfo>",
    `<Description>${xmlEscape(spec.marker)}</Description>`,
    "</RegistrationInfo>",
    "<Triggers>",
    "<LogonTrigger>",
    "<Enabled>true</Enabled>",
    "</LogonTrigger>",
    "</Triggers>",
    "<Principals>",
    '<Principal id="Author">',
    "<LogonType>InteractiveToken</LogonType>",
    "<RunLevel>LeastPrivilege</RunLevel>",
    "</Principal>",
    "</Principals>",
    "<Settings>",
    "<MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>",
    "<DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>",
    "<StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>",
    "<StartWhenAvailable>true</StartWhenAvailable>",
    "<RestartOnFailure>",
    "<Interval>PT1M</Interval>",
    "<Count>3</Count>",
    "</RestartOnFailure>",
    "<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>",
    "</Settings>",
    '<Actions Context="Author">',
    "<Exec>",
    `<Command>${xmlEscape(spec.command)}</Command>`,
    `<Arguments>${xmlEscape(args)}</Arguments>`,
    `<WorkingDirectory>${xmlEscape(spec.cwd)}</WorkingDirectory>`,
    "</Exec>",
    "</Actions>",
    "</Task>",
    ""
  ].join("\r\n")}`;
}
function registerTaskScript(spec) {
  validate4(spec);
  const args = spec.args.map(windowsArg).join(" ");
  return [
    `$action = New-ScheduledTaskAction -Execute ${powershellLiteral(spec.command)} -Argument ${powershellLiteral(args)} -WorkingDirectory ${powershellLiteral(spec.cwd)}`,
    "$trigger = New-ScheduledTaskTrigger -AtLogOn",
    "$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries",
    `Register-ScheduledTask -TaskName ${powershellLiteral(spec.unitName)} -Action $action -Trigger $trigger -Settings $settings -Description ${powershellLiteral(spec.marker)} -Force | Out-Null`
  ].join("; ");
}
function unregisterTaskScript(name2) {
  return `Unregister-ScheduledTask -TaskName ${powershellLiteral(assertUnitName(name2))} -Confirm:$false`;
}
function xmlTag(xml, tag) {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match?.[1] === void 0 ? null : xmlUnescape(match[1].trim());
}
function createWindowsTaskProvider(ctx) {
  const mechanism = "windows-task";
  const nameOf = (spec) => assertUnitName(spec.unitName);
  const query = async (name2) => {
    const res = await ctx.run("schtasks.exe", ["/Query", "/TN", name2, "/XML"]);
    if (res.error || res.code !== 0)
      return { exists: false, xml: null };
    return { exists: true, xml: res.stdout };
  };
  const inspect = async (spec) => {
    const found = await query(nameOf(spec));
    if (!found.exists || found.xml === null)
      return { exists: false, xml: null, marked: false, matches: false };
    const marked = xmlUnescape(found.xml).includes(spec.marker);
    const args = spec.args.map(windowsArg).join(" ");
    const matches = marked && xmlTag(found.xml, "Command") === spec.command && xmlTag(found.xml, "Arguments") === args && (xmlTag(found.xml, "WorkingDirectory") ?? spec.cwd) === spec.cwd;
    return { exists: true, xml: found.xml, marked, matches };
  };
  const hasRegisterCmdlet = async () => {
    const probe = await ctx.run("powershell.exe", ["-NoProfile", "-Command", "Get-Command Register-ScheduledTask"]);
    return probe.error === void 0 || probe.error === null ? /Register-ScheduledTask/.test(probe.stdout) : false;
  };
  const isElevated = async () => {
    const script = "([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)";
    const probe = await ctx.run("powershell.exe", ["-NoProfile", "-Command", script]);
    return probe.error === void 0 || probe.error === null ? /^true$/im.test(probe.stdout.trim()) : false;
  };
  return {
    mechanism,
    async detect() {
      if (ctx.platform !== "win32")
        return { mechanism, available: false, bootCapable: false, privileged: false, reason: "scheduled tasks are Windows-only" };
      const elevated = await isElevated();
      return {
        mechanism,
        available: elevated,
        bootCapable: false,
        privileged: elevated,
        reason: elevated ? "administrator rights are available; the task is registered for logon (not for boot)" : "registering a scheduled task needs an elevated process"
      };
    },
    async status(spec) {
      try {
        const name2 = nameOf(spec);
        const info = await inspect(spec);
        if (!info.exists)
          return { state: "not-installed", unitPath: null, detail: `no scheduled task named ${name2}`, commands: [] };
        if (!info.marked)
          return { state: "not-installed", unitPath: null, detail: `task ${name2} exists but does not carry this plugin's marker; refusing to treat it as this plugin's entry`, commands: [] };
        const state = bootState(true, true, false);
        return { state, unitPath: null, detail: `scheduled task ${name2} is registered (runs at logon, not at boot)`, commands: [] };
      } catch (error) {
        return { state: "not-installed", unitPath: null, detail: errorMessage(error), commands: [] };
      }
    },
    async install(spec) {
      try {
        validate4(spec);
        const name2 = nameOf(spec);
        const info = await inspect(spec);
        if (info.exists && !info.marked)
          return failed(`scheduled task ${name2} already exists and was not written by this plugin; refusing to overwrite it`);
        if (!await isElevated())
          return failed("registering a scheduled task needs an elevated process", { needsPrivilege: true });
        const elevatedCommands = [
          windowsDisplayCommand("powershell.exe", ["-NoProfile", "-Command", unregisterTaskScript(name2)]),
          windowsDisplayCommand("schtasks.exe", ["/Query", "/TN", name2, "/XML"])
        ];
        if (info.exists && info.matches) {
          const verify = await query(name2);
          if (verify.exists)
            return { ok: true, changed: false, detail: `scheduled task ${name2} is already registered`, commands: [], needsPrivilege: true };
        }
        const cmdlet = await hasRegisterCmdlet();
        if (cmdlet) {
          const script = registerTaskScript(spec);
          const res = await ctx.run("powershell.exe", ["-NoProfile", "-Command", script]);
          if (codeOf3(res) !== 0)
            return failed(problem3(res, windowsDisplayCommand("powershell.exe", ["-NoProfile", "-Command", script])) ?? "Register-ScheduledTask failed", { needsPrivilege: true, commands: elevatedCommands });
        } else {
          const xmlFile = path5.join(tempDir(ctx), `${name2}.xml`);
          fs6.mkdirSync(path5.dirname(xmlFile), { recursive: true });
          fs6.writeFileSync(xmlFile, Buffer.from(`\uFEFF${scheduledTaskXml(spec)}`, "utf16le"));
          const createCommand = windowsDisplayCommand("schtasks.exe", ["/Create", "/TN", name2, "/XML", xmlFile, "/F"]);
          const create = await ctx.run("schtasks.exe", ["/Create", "/TN", name2, "/XML", xmlFile, "/F"]);
          if (codeOf3(create) !== 0)
            return failed(problem3(create, createCommand) ?? "schtasks /Create failed", { needsPrivilege: true, commands: [createCommand] });
          fs6.rmSync(xmlFile, { force: true });
        }
        const after = await query(name2);
        if (!after.exists)
          return failed(`scheduled task ${name2} was not found after registration`, { changed: true, needsPrivilege: true, commands: elevatedCommands });
        return {
          ok: true,
          changed: true,
          detail: `scheduled task ${name2} registered (runs at logon, not at boot)`,
          commands: [],
          needsPrivilege: true
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    async uninstall(spec) {
      try {
        const name2 = nameOf(spec);
        const info = await inspect(spec);
        if (!info.exists)
          return { ok: true, changed: false, detail: `no scheduled task named ${name2}; already gone`, commands: [], needsPrivilege: false };
        if (!info.marked)
          return failed(`scheduled task ${name2} is not marked as ours; refusing to delete a foreign task`);
        if (!await isElevated())
          return failed("deleting a scheduled task needs an elevated process", { needsPrivilege: true });
        const cmdlet = await hasRegisterCmdlet();
        const res = cmdlet ? await ctx.run("powershell.exe", ["-NoProfile", "-Command", unregisterTaskScript(name2)]) : await ctx.run("schtasks.exe", ["/Delete", "/TN", name2, "/F"]);
        const code = codeOf3(res);
        if (code !== 0 && code !== 1)
          return failed(problem3(res, cmdlet ? "powershell.exe Unregister-ScheduledTask" : windowsDisplayCommand("schtasks.exe", ["/Delete", "/TN", name2, "/F"])) ?? "unregistering the task failed", { needsPrivilege: true });
        const after = await query(name2);
        if (after.exists)
          return failed(`scheduled task ${name2} still exists after removal`, { changed: true, needsPrivilege: true });
        return {
          ok: true,
          changed: true,
          detail: `unregistered scheduled task ${name2}`,
          commands: [],
          needsPrivilege: true
        };
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
    /**
     * `/Run` starts the registered task now, and the query proves the task is
     * really registered before the panel is touched. A task does not restart a
     * panel it does not own, so the caller stops the one it drove first.
     */
    async activate(spec) {
      const name2 = nameOf(spec);
      return {
        commands: [["schtasks.exe", "/Run", "/TN", name2]],
        requires: { commands: [["schtasks.exe", "/Query", "/TN", name2]], files: [] },
        display: [windowsDisplayCommand("schtasks.exe", ["/Run", "/TN", name2])]
      };
    },
    /** Unregistering a task stops nothing that is already running. */
    async retireCommands(spec) {
      const name2 = nameOf(spec);
      const cmdlet = await hasRegisterCmdlet();
      return {
        commands: [cmdlet ? ["powershell.exe", "-NoProfile", "-Command", unregisterTaskScript(name2)] : ["schtasks.exe", "/Delete", "/TN", name2, "/F"]],
        display: [windowsDisplayCommand("schtasks.exe", ["/Delete", "/TN", name2, "/F"])]
      };
    }
  };
}
function createWindowsRunProvider(ctx) {
  return createWindowsRunProviderImpl(ctx);
}

// src/boot/fallback.ts
var RESTART_POLICY = "use the container restart policy instead: `docker run --restart unless-stopped`, or `restart: unless-stopped` in a compose file";
function detectContainer(ctx) {
  if (existsOf(ctx, "/.dockerenv"))
    return "Docker (/.dockerenv)";
  if (existsOf(ctx, "/run/.containerenv"))
    return "Podman (/run/.containerenv)";
  if (ctx.env.container?.trim())
    return `container environment (container=${ctx.env.container.trim()})`;
  const cgroup = existsOf(ctx, "/proc/1/cgroup") ? readText("/proc/1/cgroup") : null;
  if (cgroup) {
    if (cgroup.includes("kubepods"))
      return "Kubernetes (cgroup kubepods)";
    if (cgroup.includes("docker"))
      return "Docker (cgroup docker)";
    if (cgroup.includes("lxc"))
      return "LXC (cgroup lxc)";
    if (cgroup.includes("containerd"))
      return "containerd (cgroup)";
  }
  return null;
}
function createContainerProvider(ctx) {
  const mechanism = "container";
  return {
    mechanism,
    async detect() {
      const container = detectContainer(ctx);
      return {
        mechanism,
        available: container !== null,
        bootCapable: false,
        privileged: false,
        reason: container === null ? "this process does not look like it is inside a container" : `this process runs inside ${container}; an OS boot entry would live on the host, not here`
      };
    },
    async status() {
      const container = detectContainer(ctx);
      return {
        state: "unsupported",
        unitPath: null,
        detail: container === null ? "no container detected" : `running inside ${container}; ${RESTART_POLICY}`,
        commands: []
      };
    },
    async install() {
      const container = detectContainer(ctx);
      return failed(
        container === null ? `no container detected; ${RESTART_POLICY}` : `this process runs inside ${container}; an OS boot entry would be installed outside the container \u2014 ${RESTART_POLICY}`
      );
    },
    async uninstall() {
      return failed("nothing to uninstall: this plugin installed no OS boot entry for a container; the container restart policy is what starts it");
    },
    async activate() {
      return null;
    }
  };
}
function createUnsupportedProvider(platform) {
  const mechanism = "unsupported";
  const reason = `no boot mechanism is known for ${platform}`;
  return {
    mechanism,
    async detect() {
      return { mechanism, available: true, bootCapable: false, privileged: false, reason };
    },
    async status(_spec) {
      return { state: "unsupported", unitPath: null, detail: reason, commands: [] };
    },
    async install(_spec) {
      return failed(`this plugin has no boot mechanism for ${platform}; start home-hosted from your platform's own service manager`);
    },
    async uninstall(_spec) {
      return failed(`this plugin has no boot mechanism for ${platform}, so it installed nothing to remove`);
    },
    async activate() {
      return null;
    }
  };
}

// src/boot/ladder.ts
function platformKind(platform) {
  if (platform === "linux" || platform === "darwin" || platform === "win32")
    return platform;
  return "other";
}
function bootProviders(ctx, platform = ctx.platform) {
  const container = createContainerProvider(ctx);
  const unsupported = createUnsupportedProvider(platform);
  switch (platform) {
    case "linux":
      return [createSystemdUserProvider(ctx), createSystemdSystemProvider(ctx), createXdgAutostartProvider(ctx), container, unsupported];
    case "darwin":
      return [createLaunchdAgentProvider(ctx), createLaunchdDaemonProvider(ctx), unsupported];
    case "win32":
      return [createWindowsRunProvider(ctx), createWindowsTaskProvider(ctx), unsupported];
    default:
      return [container, unsupported];
  }
}
function createBootLadder(options = {}) {
  const platform = options.platform ?? process3.platform;
  const uid = options.uid === void 0 ? process3.getuid?.() ?? null : options.uid;
  const isRoot = uid === 0;
  const ctx = {
    platform,
    home: options.home ?? os2.homedir(),
    env: options.env ?? process3.env,
    run: options.run ?? run,
    sudo: options.sudo ?? (async () => isRoot ? true : await sudoAvailable()),
    isRoot,
    uid: options.uid,
    ownerPaths: options.ownerPaths,
    passwd: options.passwd,
    warn: options.warn,
    exists: options.exists
  };
  const providers = bootProviders(ctx, platform);
  const kind = platformKind(platform);
  async function detectAll() {
    const candidates = await Promise.all(providers.map(async (provider) => {
      try {
        return await provider.detect();
      } catch (error) {
        return {
          mechanism: provider.mechanism,
          available: false,
          bootCapable: false,
          privileged: false,
          reason: `detection failed: ${errorMessage(error)}`
        };
      }
    }));
    return { platform: kind, candidates };
  }
  async function safeStatus(provider, spec) {
    try {
      return await provider.status(spec);
    } catch (error) {
      return { state: "not-installed", unitPath: null, detail: errorMessage(error), commands: [] };
    }
  }
  function recommend(candidates) {
    const byMechanism = new Map(candidates.map((candidate) => [candidate.mechanism, candidate]));
    const available = providers.map((provider) => provider.mechanism).filter((mechanism) => byMechanism.get(mechanism)?.available === true);
    const usable = (mechanism) => mechanism !== "container" && mechanism !== "unsupported";
    if (available.includes("container"))
      return "container";
    const readyBoot = available.find((mechanism) => usable(mechanism) && byMechanism.get(mechanism)?.bootCapable === true && byMechanism.get(mechanism)?.privileged === true);
    if (readyBoot)
      return readyBoot;
    const ready = available.find((mechanism) => usable(mechanism) && byMechanism.get(mechanism)?.privileged === true);
    if (ready)
      return ready;
    const bootCapable = available.find((mechanism) => usable(mechanism) && byMechanism.get(mechanism)?.bootCapable === true);
    if (bootCapable)
      return bootCapable;
    return available.find((mechanism) => mechanism !== "unsupported") ?? available[0] ?? null;
  }
  async function buildStatus(spec, mechanism) {
    const { candidates } = await detectAll();
    const byMechanism = new Map(candidates.map((candidate2) => [candidate2.mechanism, candidate2]));
    const statuses = /* @__PURE__ */ new Map();
    for (const [provider, status2] of await Promise.all(providers.map(async (provider2) => [provider2, await safeStatus(provider2, spec)])))
      statuses.set(provider.mechanism, status2);
    const explicit = mechanism ? providers.find((provider) => provider.mechanism === mechanism) : void 0;
    const installedProvider = providers.find((provider) => {
      const status2 = statuses.get(provider.mechanism);
      return status2 !== void 0 && isInstalledState(status2.state);
    });
    const recommended = recommend(candidates);
    const target = explicit ?? installedProvider ?? (recommended ? providers.find((provider) => provider.mechanism === recommended) : void 0);
    const explicitStatus = explicit ? statuses.get(explicit.mechanism) : void 0;
    const installedMechanism = explicit && explicitStatus && isInstalledState(explicitStatus.state) ? explicit.mechanism : installedProvider?.mechanism ?? null;
    const common = { platform: kind, mechanism: installedMechanism, recommended, candidates };
    if (!target) {
      return {
        ...common,
        state: "unsupported",
        bootCapable: false,
        privileged: false,
        unitPath: null,
        commands: [],
        detail: `no boot mechanism is available on ${platform}`
      };
    }
    const status = statuses.get(target.mechanism);
    const candidate = byMechanism.get(target.mechanism);
    const alsoInstalled = providers.filter((provider) => provider.mechanism !== target.mechanism && isInstalledState(statuses.get(provider.mechanism)?.state ?? "unsupported")).map((provider) => provider.mechanism);
    return {
      ...common,
      state: status?.state ?? "unsupported",
      bootCapable: candidate?.bootCapable ?? false,
      privileged: candidate?.privileged ?? false,
      unitPath: status?.unitPath ?? null,
      commands: status?.commands ?? [],
      detail: `${status?.detail ?? "no detail"}${alsoInstalled.length ? `; also installed: ${alsoInstalled.join(", ")}` : ""}`
    };
  }
  async function safeInstall(provider, spec) {
    try {
      return await provider.install(spec);
    } catch (error) {
      return failed(errorMessage(error));
    }
  }
  async function safeUninstall(provider, spec) {
    try {
      return await provider.uninstall(spec);
    } catch (error) {
      return failed(errorMessage(error));
    }
  }
  async function safeActivate(provider, spec) {
    if (provider.activate === void 0)
      return null;
    try {
      return await provider.activate(spec);
    } catch {
      return null;
    }
  }
  async function safeRetirement(provider, spec) {
    if (provider.retireCommands === void 0)
      return null;
    try {
      return await provider.retireCommands(spec);
    } catch {
      return null;
    }
  }
  async function safeStop(provider, spec) {
    if (provider.stopCommands === void 0)
      return [];
    try {
      return await provider.stopCommands(spec);
    } catch {
      return [];
    }
  }
  async function installedMechanisms(spec) {
    const probes = await Promise.all(providers.map(async (provider) => [provider, await safeStatus(provider, spec)]));
    return probes.filter(([, status]) => isInstalledState(status.state)).map(([provider]) => provider);
  }
  function pick(status, mechanism) {
    return pickOf(mechanism ?? status.mechanism);
  }
  function pickOf(mechanism) {
    return mechanism === null || mechanism === void 0 ? void 0 : providers.find((provider) => provider.mechanism === mechanism);
  }
  return {
    providers,
    detect: detectAll,
    status: buildStatus,
    async install(spec, mechanism) {
      const before = await buildStatus(spec, mechanism);
      const target = pickOf(mechanism ?? before.mechanism ?? before.recommended);
      if (!target) {
        return {
          ...failed(`no boot mechanism is available on ${platform}`),
          mechanism: null,
          status: before
        };
      }
      const result = await safeInstall(target, spec);
      const status = await buildStatus(spec, mechanism);
      return {
        ...result,
        mechanism: result.ok ? target.mechanism : status.mechanism,
        status
      };
    },
    async uninstall(spec, mechanism) {
      const before = await buildStatus(spec, mechanism);
      const target = pick(before, mechanism);
      if (!target) {
        return {
          ok: true,
          changed: false,
          detail: "no OS boot entry is installed for this plugin, so there is nothing to uninstall",
          commands: [],
          needsPrivilege: false,
          status: before
        };
      }
      const result = await safeUninstall(target, spec);
      const status = await buildStatus(spec, mechanism);
      return { ...result, status };
    },
    /**
     * The start steps for the installed mechanism, plus the retirement of every
     * other entry on this machine.
     *
     * A switch is the whole reason this exists: the old entry has to go, and it
     * can only go after the panel is down — retiring it first would stop the
     * panel, and the plugin with it, before the new entry was ever told to
     * start. So both halves are handed to one caller that runs them in order,
     * detached. Nothing is stopped here.
     *
     * `from` is the mechanism being left, which the caller knows and this cannot
     * infer: `install()` has already run, so the *target* reads as installed too
     * and the mechanism that is actually holding the panel is no longer the first
     * installed one. Without it there is nothing to detach — stopping the target
     * would be a no-op while the previous entry's restart policy revived the
     * panel the moment the CLI's `down` returned.
     */
    async activate(spec, mechanism, from) {
      const status = await buildStatus(spec, mechanism);
      const target = pick(status, mechanism);
      if (!target)
        return null;
      const start = await safeActivate(target, spec);
      if (start === null)
        return null;
      const others = (await installedMechanisms(spec)).filter((provider) => provider.mechanism !== target.mechanism);
      const retirements = await Promise.all(others.map(async (provider) => [provider, await safeRetirement(provider, spec)]));
      const usable = retirements.filter((pair) => pair[1] !== null);
      const supervised = from === void 0 || from === null ? void 0 : providers.find((provider) => provider.mechanism === from);
      const stop = supervised === void 0 ? [] : await safeStop(supervised, spec);
      return {
        ...start,
        stop,
        // A mechanism whose entry cannot be removed without stopping the panel is
        // left alone here: one stale entry is better than a panel nothing starts.
        retire: usable.flatMap(([, retirement]) => retirement.commands),
        retired: usable.map(([provider]) => provider.mechanism),
        retireDisplay: usable.flatMap(([, retirement]) => retirement.display)
      };
    }
  };
}

// src/home-hosted/config-file.ts
import fs8 from "node:fs";

// src/home-hosted/layout.ts
import fs7 from "node:fs";
import path6 from "node:path";
var HH_DIR = ".hh";
function hhDir(home) {
  return path6.join(home, HH_DIR);
}
function globalSettingsFile(home) {
  return path6.join(hhDir(home), "settings.json");
}
function workspacesFile(home) {
  return path6.join(hhDir(home), "workspaces.json");
}
function secretsFile(home) {
  return path6.join(hhDir(home), ".control-secrets.json");
}
function runFile(home) {
  return path6.join(hhDir(home), "run.json");
}
function workspaceDir(home, workspace) {
  return path6.join(hhDir(home), workspace);
}
function serversFile(home, workspace) {
  return path6.join(workspaceDir(home, workspace), "servers.config.json");
}
function readWorkspaces(home) {
  const file = workspacesFile(home);
  if (!fs7.existsSync(file))
    return { workspaces: [], error: null };
  let parsed;
  try {
    parsed = JSON.parse(fs7.readFileSync(file, "utf8"));
  } catch {
    return { workspaces: [], error: `${path6.relative(home, file)} could not be parsed` };
  }
  const list = isRecord(parsed) && Array.isArray(parsed.workspaces) ? parsed.workspaces : null;
  if (list === null)
    return { workspaces: [], error: `${path6.relative(home, file)} has no workspaces list` };
  const workspaces = [];
  for (const entry of list) {
    if (!isRecord(entry) || typeof entry.id !== "string" || entry.id.length === 0)
      return { workspaces: [], error: `${path6.relative(home, file)} has an entry without an id` };
    workspaces.push({ id: entry.id, label: typeof entry.label === "string" && entry.label.length > 0 ? entry.label : entry.id });
  }
  return { workspaces, error: null };
}
function defaultWorkspace(home) {
  const { workspaces } = readWorkspaces(home);
  return workspaces.find((entry) => entry.id === DEFAULT_WORKSPACE)?.id ?? workspaces[0]?.id ?? DEFAULT_WORKSPACE;
}
function isHhRoot(home) {
  return fs7.existsSync(workspacesFile(home)) || fs7.existsSync(globalSettingsFile(home));
}
function isLegacyRoot(home) {
  if (isHhRoot(home))
    return false;
  return ["servers.config.json", ".control-secrets.json", "run.json", ".state"].some((name2) => fs7.existsSync(path6.join(home, name2)));
}
function migrationRefusal(home) {
  if (!isLegacyRoot(home))
    return null;
  return `${home} still uses the pre-0.7 layout (state at the top level). Start the panel once on home-hosted 0.7 \u2014 it moves everything into .hh \u2014 or run \`home-hosted migrate --yes --home ${home}\`.`;
}

// src/home-hosted/config-file.ts
var ConfigLayoutError = class extends Error {
  name = "ConfigLayoutError";
};
var ConfigPatchError = class extends Error {
  name = "ConfigPatchError";
};
function readConfig(home, workspace = DEFAULT_WORKSPACE) {
  const refusal = migrationRefusal(home);
  if (refusal !== null)
    return { raw: null, exists: false, error: refusal };
  const file = serversFile(home, workspace);
  const raw = readJson(file);
  if (raw === null) {
    const exists = fs8.existsSync(file);
    return { raw: null, exists, error: exists ? "the workspace config file could not be parsed" : null };
  }
  if (!isRecord(raw))
    return { raw: null, exists: true, error: "the workspace config file does not contain a JSON object" };
  if (!Array.isArray(raw.servers) && raw.servers !== void 0)
    return { raw: null, exists: true, error: "the workspace config file has a servers field that is not an array" };
  if (Array.isArray(raw.servers)) {
    const index = raw.servers.findIndex((entry) => !isRecord(entry));
    if (index >= 0)
      return { raw: null, exists: true, error: `the workspace config file has an entry at servers[${index}] that is not an object` };
  }
  return { raw, exists: true, error: null };
}
function writeConfig(home, raw, writtenBy = "dsh-home-hosted", workspace = DEFAULT_WORKSPACE) {
  refuseUnmigrated(home);
  const meta = { ...raw.meta ?? {}, writtenBy };
  const next = { ...raw, meta };
  writeFileAtomic(serversFile(home, workspace), `${JSON.stringify(next, null, 2)}
`);
}
function readGlobalSettings(home) {
  const refusal = migrationRefusal(home);
  if (refusal !== null)
    return { raw: null, exists: false, error: refusal };
  const file = globalSettingsFile(home);
  const raw = readJson(file);
  if (raw === null) {
    const exists = fs8.existsSync(file);
    return { raw: null, exists, error: exists ? "the panel settings file could not be parsed" : null };
  }
  if (!isRecord(raw))
    return { raw: null, exists: true, error: "the panel settings file does not contain a JSON object" };
  if (raw.control !== void 0 && !isRecord(raw.control))
    return { raw: null, exists: true, error: "the panel settings file has a control field that is not an object" };
  return { raw, exists: true, error: null };
}
function writeGlobalSettings(home, raw, writtenBy = "dsh-home-hosted") {
  refuseUnmigrated(home);
  const meta = { ...raw.meta ?? {}, writtenBy };
  writeFileAtomic(globalSettingsFile(home), `${JSON.stringify({ ...raw, meta }, null, 2)}
`);
}
function setControl(home, patch, writtenBy = "dsh-home-hosted") {
  const read = readGlobalSettings(home);
  if (read.error !== null)
    throw new ConfigLayoutError(read.error);
  writeGlobalSettings(home, patchControl(read.raw ?? {}, patch), writtenBy);
}
function refuseUnmigrated(home) {
  const refusal = migrationRefusal(home);
  if (refusal !== null)
    throw new ConfigLayoutError(refusal);
}
function findEntry(raw, id) {
  return (raw.servers ?? []).find((entry) => entry.id === id) ?? null;
}
function upsertEntry(raw, entry) {
  const servers = [...raw.servers ?? []];
  const index = servers.findIndex((candidate) => candidate.id === entry.id);
  if (index >= 0)
    servers[index] = entry;
  else
    servers.push(entry);
  return { ...raw, servers };
}
var SERVER_MERGE_KEYS = /* @__PURE__ */ new Set(["restart", "health", "stop"]);
var CONTROL_MERGE_KEYS = /* @__PURE__ */ new Set(["auth", "tls"]);
function mergeGroup(target, patch) {
  const merged = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === void 0)
      continue;
    if (value === null) {
      delete merged[key];
      continue;
    }
    if (isRecord(value) && isRecord(merged[key])) {
      merged[key] = mergeGroup(merged[key], value);
      continue;
    }
    merged[key] = value;
  }
  return merged;
}
function patchEntry(raw, id, patch) {
  for (const key of SERVER_MERGE_KEYS) {
    if (patch[key] === null)
      throw new ConfigPatchError(`${key} must be an object (was null): the panel refuses to boot a config that carries it`);
  }
  const servers = (raw.servers ?? []).map((entry) => {
    if (entry.id !== id)
      return entry;
    const merged = { ...entry };
    for (const [key, value] of Object.entries(patch)) {
      if (value === void 0)
        continue;
      if (SERVER_MERGE_KEYS.has(key) && isRecord(value) && isRecord(merged[key]))
        merged[key] = mergeGroup(merged[key], value);
      else
        merged[key] = value;
    }
    return merged;
  });
  return { ...raw, servers };
}
function patchControl(raw, patch) {
  const control = { ...raw.control ?? {} };
  for (const [key, value] of Object.entries(patch)) {
    if (value === void 0)
      continue;
    if (CONTROL_MERGE_KEYS.has(key) && isRecord(value) && isRecord(control[key]))
      control[key] = mergeGroup(control[key], value);
    else
      control[key] = value;
  }
  return { ...raw, control };
}
function removeEntry(raw, id) {
  return { ...raw, servers: (raw.servers ?? []).filter((entry) => entry.id !== id) };
}

// src/home-hosted/dsh-entry.ts
import fs13 from "node:fs";
import path11 from "node:path";
import process7 from "node:process";

// src/util/paths.ts
import crypto from "node:crypto";
import fs9 from "node:fs";
import os3 from "node:os";
import path7 from "node:path";
function expandHome(value) {
  if (value === "~")
    return os3.homedir();
  if (value.startsWith("~/") || value.startsWith("~\\"))
    return path7.join(os3.homedir(), value.slice(2));
  return value;
}
function resolveUnder(value, homeDir) {
  if (value === "~")
    return path7.resolve(homeDir);
  if (value.startsWith("~/") || value.startsWith("~\\"))
    return path7.resolve(path7.join(homeDir, value.slice(2)));
  return path7.isAbsolute(value) ? path7.resolve(value) : path7.resolve(homeDir, value);
}
function dshHome() {
  const configured = process.env.DSH_HOME?.trim();
  return configured ? path7.resolve(expandHome(configured)) : path7.join(os3.homedir(), ".dsh");
}
function resolveHomeHostedHome(stateDir, env = process.env, homeDir = os3.homedir()) {
  const configured = env.HHOSTED_HOME?.trim();
  if (configured)
    return { home: resolveUnder(configured, homeDir), source: "env" };
  const state = resolveUnder(stateDir, homeDir);
  const own = path7.join(state, "panel");
  if (fs9.existsSync(own))
    return { home: own, source: "instance" };
  const legacy = path7.join(homeDir, ".home-hosted");
  if (isEstablishedInstance(state, homeDir) && hasLivePanel(legacy))
    return { home: legacy, source: "legacy" };
  return { home: own, source: "instance" };
}
function isEstablishedInstance(stateDir, homeDir) {
  if (stateDir === path7.join(homeDir, ".dsh", "dsh-home-hosted"))
    return true;
  try {
    return fs9.statSync(path7.join(stateDir, "settings.json")).isFile();
  } catch {
    return false;
  }
}
function hasLivePanel(home) {
  if (isHhRoot(home) || fs9.existsSync(path7.join(home, "servers.config.json")))
    return true;
  for (const file of [runFile(home), path7.join(home, "run.json")]) {
    try {
      const raw = JSON.parse(fs9.readFileSync(file, "utf8"));
      if (typeof raw.pid !== "number")
        continue;
      process.kill(raw.pid, 0);
      return true;
    } catch {
    }
  }
  return false;
}
function bootUnitName(stateDir) {
  if (isMachineDefaultStateDir(stateDir))
    return "home-hosted";
  const key = path7.resolve(expandHome(stateDir?.trim() ?? ""));
  return `home-hosted-${crypto.createHash("sha256").update(key).digest("hex").slice(0, 8)}`;
}
function isMachineDefaultStateDir(stateDir) {
  const bare = stateDir?.trim();
  if (bare === void 0 || bare.length === 0)
    return true;
  return path7.resolve(expandHome(bare)) === path7.join(os3.homedir(), ".dsh", "dsh-home-hosted");
}
function pluginStateDir(override) {
  const configured = override?.trim();
  if (configured)
    return path7.resolve(expandHome(configured));
  return path7.join(dshHome(), "dsh-home-hosted");
}

// src/home-hosted/launch.ts
import fs10 from "node:fs";
import path8 from "node:path";
import process4 from "node:process";
var LEGACY_BOOT_UNIT_NAME = "home-hosted";
async function which(command) {
  const probe = process4.platform === "win32" ? "where.exe" : "which";
  const result = await run(probe, [command], { timeoutMs: 5e3 });
  if (result.code !== 0)
    return null;
  const first = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0];
  return first ?? null;
}
function resolveShimmedCli(absolute, nodePath = process4.execPath) {
  if (!fs10.existsSync(absolute))
    return null;
  if (/\.(?:mjs|cjs|js)$/.test(absolute))
    return { program: nodePath, args: [absolute], cliEntry: absolute, shimPath: null, source: "entry" };
  const shimTarget = /^#\s*cmd-shim-target=(.+)$/m.exec(readText(absolute) ?? "")?.[1]?.trim();
  if (shimTarget !== void 0 && fs10.existsSync(shimTarget))
    return { program: nodePath, args: [shimTarget], cliEntry: shimTarget, shimPath: absolute, source: "shim-target" };
  return { program: absolute, args: [], cliEntry: null, shimPath: absolute, source: "shim" };
}
function homeHostedEnv(facts, launch, extra = {}) {
  const source = facts.env ?? process4.env;
  const dirs = [
    launch.shimPath === null ? null : path8.dirname(launch.shimPath),
    path8.dirname(process4.execPath),
    ...(source.PATH ?? "").split(path8.delimiter),
    "/usr/local/bin",
    "/usr/bin",
    "/bin"
  ].filter((dir) => typeof dir === "string" && dir.length > 0);
  const seen = /* @__PURE__ */ new Set();
  const pathValue = dirs.filter((dir) => {
    if (seen.has(dir))
      return false;
    seen.add(dir);
    return true;
  }).join(path8.delimiter);
  const env = {
    PATH: pathValue,
    HOME: source.HOME ?? source.USERPROFILE ?? "",
    HHOSTED_HOME: facts.home,
    ...extra
  };
  const accountHome = facts.accountHome?.trim();
  if (accountHome !== void 0 && accountHome.length > 0) {
    if (accountHome !== env.HOME)
      env.HOME = accountHome;
  } else if (facts.accountHome === null) {
    delete env.HOME;
  }
  if (facts.projectDir)
    env.HHOSTED_PROJECT = facts.projectDir;
  return env;
}
function buildHomeHostedBootSpec(facts, launch, options) {
  const logDir = path8.join(facts.home, ".logs");
  fs10.mkdirSync(logDir, { recursive: true });
  const args = [...launch.args, "up", "--foreground", "--home", facts.home];
  if (facts.projectDir)
    args.push("--project", facts.projectDir);
  return {
    command: launch.program,
    args,
    cwd: facts.projectDir ?? facts.home,
    env: homeHostedEnv(
      {
        ...facts,
        // `undefined` means the option was not given; `null` is a decision (an
        // account whose home is unknowable), and `??` would erase it.
        accountHome: options.accountHome === void 0 ? facts.accountHome : options.accountHome,
        env: options.env ?? facts.env
      },
      launch
    ),
    marker: options.marker ?? "managed by dsh-home-hosted",
    // One artifact per state root, so two plugin instances cannot overwrite or
    // delete each other's entry. The machine-default install keeps the old name.
    unitName: options.unitName ?? bootUnitName(options.stateDir),
    label: "home-hosted control panel",
    logDir
  };
}

// src/home-hosted/resolve.ts
import { createRequire } from "node:module";
import fs11 from "node:fs";
import path9 from "node:path";
import process5 from "node:process";
var EXPECTED_RANGE = "^0.7.3";
var MIN_SUPPORTED_VERSION = "0.7.0";
function pinnedManifestPath() {
  try {
    return createRequire(import.meta.url).resolve("home-hosted/package.json");
  } catch {
    return null;
  }
}
function binEntryFromManifest(manifestPath) {
  try {
    const manifest = JSON.parse(fs11.readFileSync(manifestPath, "utf8"));
    const declared = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.["home-hosted"] ?? Object.values(manifest.bin ?? {})[0];
    return typeof declared === "string" && declared.length > 0 ? path9.resolve(path9.dirname(manifestPath), declared) : null;
  } catch {
    return null;
  }
}
function parseVersion(output) {
  const match = /(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(output ?? "");
  return match === null ? null : `${match[1]}.${match[2]}.${match[3]}${match[4] === void 0 ? "" : `-${match[4]}`}`;
}
function compareVersions(a, b) {
  const split = (value) => {
    const [core, pre = null] = value.split("-", 2);
    return { parts: (core ?? "").split(".").map((part) => Number.parseInt(part, 10) || 0), pre };
  };
  const left = split(a);
  const right = split(b);
  for (let index = 0; index < 3; index += 1) {
    const diff = (left.parts[index] ?? 0) - (right.parts[index] ?? 0);
    if (diff !== 0)
      return diff < 0 ? -1 : 1;
  }
  if (left.pre === right.pre)
    return 0;
  if (left.pre === null)
    return 1;
  if (right.pre === null)
    return -1;
  return left.pre < right.pre ? -1 : 1;
}
function detailFor(source, version, supported, prefer, unusableOverride = null) {
  const shown = version ?? "unknown version";
  switch (source) {
    case "config":
      return unusableOverride === null ? `from the configured command (${shown})` : `the configured command could not be used: ${unusableOverride} does not exist (or is not a file this plugin can run); fix homeHostedCommand, or clear it to let the plugin choose`;
    case "dependency":
      return supported ? `the pinned dependency (${shown})` : `the pinned dependency is below the oldest supported release (${MIN_SUPPORTED_VERSION})`;
    case "path":
      if (!supported)
        return `the global install on PATH (${shown}) is below the oldest supported release (${MIN_SUPPORTED_VERSION})`;
      return prefer === "global" ? `the global install on PATH (${shown})` : `a global install on PATH (${shown}), not the pinned dependency ${EXPECTED_RANGE}`;
    default:
      return "no home-hosted CLI found: install the plugin with its dependencies, or put home-hosted on PATH";
  }
}
async function defaultReadVersion(launch, timeoutMs) {
  const result = await run(launch.program, [...launch.args, "--version"], { timeoutMs });
  return parseVersion(result.stdout) ?? parseVersion(result.stderr);
}
async function resolveCli(options = {}) {
  const timeoutMs = options.timeoutMs ?? 5e3;
  const prefer = options.prefer ?? "pinned";
  const readVersion = options.readVersion ?? ((launch) => defaultReadVersion(launch, timeoutMs));
  const locate = options.findOnPath ?? which;
  const override = options.override?.trim();
  let unusableOverride = null;
  if (override !== void 0 && override.length > 0) {
    const launch = resolveShimmedCli(path9.resolve(override));
    if (launch === null) {
      unusableOverride = override;
    } else {
      const version2 = await readVersion(launch);
      const supported2 = version2 === null || compareVersions(version2, MIN_SUPPORTED_VERSION) >= 0;
      return {
        launch,
        status: {
          source: "config",
          path: launch.cliEntry ?? launch.shimPath ?? launch.program,
          version: version2,
          expectedRange: EXPECTED_RANGE,
          supported: supported2,
          prefer,
          dependency: null,
          global: null,
          detail: detailFor("config", version2, supported2, prefer)
        }
      };
    }
  }
  const manifest = (options.packageManifest ?? pinnedManifestPath)();
  const dependencyEntry = manifest === null ? null : binEntryFromManifest(manifest);
  let dependency = null;
  if (dependencyEntry !== null && fs11.existsSync(dependencyEntry)) {
    let version2 = null;
    try {
      version2 = JSON.parse(fs11.readFileSync(manifest, "utf8")).version ?? null;
    } catch {
      version2 = null;
    }
    dependency = {
      candidate: { source: "dependency", path: dependencyEntry, version: version2 },
      launch: { program: process5.execPath, args: [dependencyEntry], cliEntry: dependencyEntry, shimPath: null, source: "entry" }
    };
  }
  let global = null;
  const found = await locate("home-hosted") ?? await locate("hh");
  if (found !== null) {
    const launch = resolveShimmedCli(path9.resolve(found));
    if (launch !== null) {
      global = {
        candidate: { source: "path", path: launch.cliEntry ?? launch.shimPath ?? launch.program, version: await readVersion(launch) },
        launch
      };
    }
  }
  const order = prefer === "global" ? [global, dependency] : [dependency, global];
  const chosen = order.find((item) => item !== null) ?? null;
  const dependencySummary = dependency?.candidate ?? null;
  const globalSummary = global?.candidate ?? null;
  if (unusableOverride !== null) {
    return {
      launch: null,
      status: {
        source: "config",
        path: unusableOverride,
        version: null,
        expectedRange: EXPECTED_RANGE,
        supported: false,
        prefer,
        dependency: dependencySummary,
        global: globalSummary,
        detail: detailFor("config", null, false, prefer, unusableOverride)
      }
    };
  }
  if (chosen === null) {
    return {
      launch: null,
      status: {
        source: "none",
        path: null,
        version: null,
        expectedRange: EXPECTED_RANGE,
        supported: false,
        prefer,
        dependency: dependencySummary,
        global: globalSummary,
        detail: detailFor("none", null, false, prefer)
      }
    };
  }
  const version = chosen.candidate.version;
  const supported = version === null || compareVersions(version, MIN_SUPPORTED_VERSION) >= 0;
  return {
    launch: chosen.launch,
    status: {
      source: chosen.candidate.source,
      path: chosen.candidate.path,
      version,
      expectedRange: EXPECTED_RANGE,
      supported,
      prefer,
      dependency: dependencySummary,
      global: globalSummary,
      detail: detailFor(chosen.candidate.source, version, supported, prefer)
    }
  };
}

// src/home-hosted/launcher.ts
import fs12 from "node:fs";
import path10 from "node:path";
import process6 from "node:process";
function launcherDir(stateDir) {
  return path10.join(stateDir, "bin");
}
function launcherPath(stateDir) {
  return path10.join(launcherDir(stateDir), "home-hosted.mjs");
}
var LAUNCH_CHILD = `function launchChild(program, argv, useShell) {
  const child = spawn(program, argv, { stdio: 'inherit', shell: useShell })
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGQUIT', 'SIGHUP'])
    process.on(signal, () => { try { child.kill(signal) } catch {} })
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
  child.on('error', (error) => {
    console.error('[dsh-home-hosted] could not start ' + program + ': ' + error.message)
    process.exit(1)
  })
}`;
function launcherRecordPath(stateDir) {
  return path10.join(launcherDir(stateDir), "resolved.json");
}
var COMPARE_VERSIONS_SOURCE = String.raw`function compare(a, b) {
  const split = value => {
    const [core, pre = null] = String(value).split('-', 2)
    return { parts: core.split('.').map(part => Number.parseInt(part, 10) || 0), pre }
  }
  const left = split(a); const right = split(b)
  for (let i = 0; i < 3; i += 1) {
    const diff = (left.parts[i] ?? 0) - (right.parts[i] ?? 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  if (left.pre === right.pre) return 0
  if (left.pre === null) return 1
  if (right.pre === null) return -1
  return left.pre < right.pre ? -1 : 1
}`;
function buildLauncherSource(options) {
  const marker = options.marker ?? "managed by dsh-home-hosted";
  const record = launcherRecordPath(options.stateDir);
  return `#!/usr/bin/env node
// ${marker} \u2014 rewritten on every plugin start; do not edit.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'

const DSH_HOME = ${JSON.stringify(options.dshHome)}
const RECORD = ${JSON.stringify(record)}
const MIN_VERSION = ${JSON.stringify(options.minVersion)}
const PLUGIN_ROOT = ${JSON.stringify(options.pluginRoot ?? null)}

${LAUNCH_CHILD}

/** A package-manager shim's real target, as the shim itself records it. */
const SHIM_TARGET = /^#\\s*cmd-shim-target=(.+)$/m

function readRecord() {
  try { return JSON.parse(fs.readFileSync(RECORD, 'utf8')) } catch { return null }
}

/**
 * The version of the package a CLI entry belongs to, following a package-manager
 * shim to the file it actually runs.
 *
 * A pnpm/npm shim is a shell script whose 'cmd-shim-target' comment names the real
 * entry \u2014 and it lives *inside* the plugin's own package, so walking up from the
 * shim reads this plugin's package.json and reports the plugin's version for the
 * CLI. That is not cosmetic: 'choose' sorts by version, so the plugin's own number
 * let a PATH fallback outrank the recorded pinned copy and boot a different
 * home-hosted than this plugin shipped.
 */
function versionOf(entry) {
  let target = entry
  try {
    if (fs.statSync(entry).isFile()) {
      const shimTarget = SHIM_TARGET.exec(fs.readFileSync(entry, 'utf8'))?.[1]?.trim()
      if (shimTarget !== undefined && shimTarget.length > 0) target = shimTarget
    }
  } catch {}
  let dir = path.dirname(target)
  for (let hop = 0; hop < 4; hop += 1) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
      if (typeof manifest.version === 'string') return manifest.version
    } catch {}
    dir = path.dirname(dir)
  }
  return null
}

${COMPARE_VERSIONS_SOURCE}

function collect(out, entry, tier) {
  if (typeof entry === 'string' && entry.length > 0 && fs.existsSync(entry)) out.push({ entry, tier })
}

function collectRoot(root, out, tier) {
  collect(out, path.join(root, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'), tier)
  const store = path.join(root, 'node_modules', '.pnpm')
  let names = []
  try { names = fs.readdirSync(store) } catch { return }
  for (const name of names) {
    if (name.startsWith('home-hosted@') || name.startsWith('dsh-home-hosted@'))
      collect(out, path.join(store, name, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'), tier)
  }
}

/**
 * Where a copy can come from, best first. A plain version sort let a copy of the
 * plugin's own version \u2014 read from the package-manager shim, or an unrelated
 * global install \u2014 outrank the copy the plugin actually pinned. A recorded pin is
 * an instruction; PATH is a hope.
 */
const TIER_RECORD = 0
const TIER_LOCAL = 1
const TIER_PATH = 2

function candidates() {
  const out = []
  const record = readRecord()
  if (record && typeof record.entry === 'string') collect(out, record.entry, TIER_RECORD)
  if (PLUGIN_ROOT !== null) collectRoot(PLUGIN_ROOT, out, TIER_LOCAL)
  try {
    for (const name of fs.readdirSync(path.join(DSH_HOME, 'profiles')))
      collectRoot(path.join(DSH_HOME, 'profiles', name), out, TIER_LOCAL)
  } catch {}
  collectRoot(path.join(DSH_HOME), out, TIER_LOCAL)
  // Last resort: a global install on the entry's own PATH.
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    if (dir.length === 0) continue
    collect(out, path.join(dir, 'home-hosted'), TIER_PATH)
    collect(out, path.join(dir, 'home-hosted.cmd'), TIER_PATH)
  }
  return out
}

/** The best copy within a tier: the highest version, first-found when equal. */
function bestOfTier(items) {
  const known = items.filter(item => item.version !== null)
  const pool = known.length === 0 ? items : known
  return [...pool].sort((a, b) => compare(b.version ?? '0.0.0', a.version ?? '0.0.0'))[0] ?? null
}

function choose() {
  const found = candidates().map(item => ({ ...item, version: versionOf(item.entry) }))
  const supported = found.filter(item => item.version !== null && compare(item.version, MIN_VERSION) >= 0)
  for (const tier of [TIER_RECORD, TIER_LOCAL, TIER_PATH]) {
    const best = bestOfTier(supported.filter(item => item.tier === tier))
    if (best !== null) return best.entry
  }
  // Nothing supported: a too-old copy still beats no panel at all.
  for (const tier of [TIER_RECORD, TIER_LOCAL, TIER_PATH]) {
    const best = bestOfTier(found.filter(item => item.tier === tier))
    if (best !== null) return best.entry
  }
  return null
}

const entry = choose()
if (entry === null) {
  console.error('[dsh-home-hosted] no home-hosted CLI found (looked in ' + DSH_HOME + ' and PATH). Reinstall the plugin with its dependencies, or set homeHostedCommand in the plugin row.')
  process.exit(1)
}

const args = process.argv.slice(2)
const isScript = /\\.(mjs|cjs|js)$/.test(entry)
if (isScript)
  launchChild(process.execPath, [entry, ...args], false)
else
  launchChild(entry, args, process.platform === 'win32' && /\\.(cmd|bat)$/i.test(entry))
`;
}
function writeLauncher(options) {
  const file = launcherPath(options.stateDir);
  const source = buildLauncherSource(options);
  const previous = fs12.existsSync(file) ? fs12.readFileSync(file, "utf8") : null;
  const changed = previous !== source;
  if (changed) {
    writeFileAtomic(file, source, 493);
    fs12.chmodSync(file, 493);
  }
  writeJsonAtomic(launcherRecordPath(options.stateDir), {
    entry: options.resolvedEntry,
    version: options.resolvedVersion ?? null,
    pluginRoot: options.pluginRoot ?? null,
    writtenAt: Date.now()
  }, 384);
  return { path: file, changed };
}
async function preflightLauncher(stateDir, timeoutMs = 1e4, env) {
  const file = launcherPath(stateDir);
  if (!fs12.existsSync(file))
    return null;
  const result = process6.platform === "win32" ? await run(process6.execPath, [file, "--version"], { timeoutMs, ...env === void 0 ? {} : { env } }) : await run(file, ["--version"], { timeoutMs, ...env === void 0 ? {} : { env } });
  return parseVersion(result.stdout) ?? parseVersion(result.stderr);
}
function dshLauncherRecordPath(stateDir) {
  return path10.join(launcherDir(stateDir), "dsh-resolved.json");
}
function dshLauncherPath(stateDir, entryExtension) {
  const extension = (entryExtension ?? "").toLowerCase() === ".cjs" ? ".cjs" : ".mjs";
  return path10.join(launcherDir(stateDir), `dsh${extension}`);
}
function readDshLauncherRecord(stateDir) {
  return readJson(dshLauncherRecordPath(stateDir));
}
function buildDshLauncherSource(options) {
  const esm = (options.entryExtension ?? "").toLowerCase() !== ".cjs";
  const prelude = esm ? `import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'` : `const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')
const { spawn } = require('node:child_process')`;
  const searchRoots = [
    options.resolvedEntry === null ? null : dshSearchRoot(options.resolvedEntry),
    options.pinnedEntry === null || options.pinnedEntry === void 0 ? null : dshSearchRoot(options.pinnedEntry),
    ...options.searchRoots ?? []
  ].filter((root) => typeof root === "string" && root.length > 0);
  return `#!/usr/bin/env node
// managed by dsh-home-hosted \u2014 rewritten on every plugin start; do not edit.
${prelude}

const DSH_HOME = ${JSON.stringify(options.dshHome)}
const RECORD = ${JSON.stringify(dshLauncherRecordPath(options.stateDir))}
const SEARCH_ROOTS = ${JSON.stringify([...new Set(searchRoots)])}
// The image this plugin was installed on, when the record had one to carry.
const PINNED = ${JSON.stringify(options.pinnedEntry ?? null)}

${LAUNCH_CHILD}

function readRecord() {
  try { return JSON.parse(fs.readFileSync(RECORD, 'utf8')) } catch { return null }
}

function isFile(file) {
  let stat = null
  try { stat = fs.statSync(file) } catch { return false }
  return stat.isFile()
}

// One identity per file: a recorded path and a candidate reached through a
// symlink must compare equal, or a macOS clone would look like a different copy.
function canon(file) {
  try { return fs.realpathSync(file) } catch { return file }
}

// Keep what can actually boot: a JavaScript entry, or a shim whose recorded
// target is one. A bare shim found on PATH is not a script, so requiring the
// extension would silently drop the last resort.
//
// Each candidate carries how it was found, which is what ordering uses:
//   TIER_REAL   a dsh by construction (a manifest, or node_modules/dsh)
//   TIER_PROBE  a root that merely offers a build file \u2014 any package may
//   TIER_PATH   a dsh executable found on PATH
const TIER_REAL = 2
const TIER_PROBE = 1
const TIER_PATH = 0

function collect(out, entry, source, tier) {
  const argument = typeof source === 'string' && source.length > 0 ? source : entry
  const file = typeof entry === 'string' && isFile(entry) ? canon(entry) : null
  if (file !== null && /\\.(?:mjs|cjs|js)$/.test(file)) {
    if (!out.has(file) || (out.get(file) ?? 0) < tier) out.set(file, tier)
    return
  }
  // Anything else is a shim: only its recorded target can boot, and a shim
  // without one is not a candidate at all (never a second pass over itself).
  if (typeof argument !== 'string' || !isFile(argument)) return
  let text = ''
  try { text = fs.readFileSync(argument, 'utf8') } catch { return }
  const marker = 'cmd-shim-target='
  const at = text.indexOf(marker)
  if (at === -1) return
  const target = text.slice(at + marker.length).split('\\n')[0].trim()
  if (target.length === 0) return
  const real = canon(target)
  if (!/\\.(?:mjs|cjs|js)$/.test(real)) return
  if (!out.has(real) || (out.get(real) ?? 0) < tier) out.set(real, tier)
}

function collectStore(root, out) {
  const store = path.join(root, 'node_modules', '.pnpm')
  let names = []
  try { names = fs.readdirSync(store) } catch { return }
  for (const name of names) {
    if (!name.startsWith('dsh@') && !name.startsWith('@deepseek-ai+dsh@')) continue
    collect(out, path.join(store, name, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), null, TIER_REAL)
    collect(out, path.join(store, name, 'node_modules', 'dsh', 'bin', 'dsh.js'), null, TIER_REAL)
  }
}

function collectRoot(root, out) {
  collect(out, path.join(root, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), null, TIER_REAL)
  collect(out, path.join(root, 'node_modules', 'dsh', 'bin', 'dsh.js'), null, TIER_REAL)
  collectStore(root, out)
  // A clone keeps its build output at its own root, not under node_modules.
  for (const entry of ['lib/bin.js', 'lib/bin.mjs', 'lib/bin.cjs', 'dist/bin.js'])
    collect(out, path.join(root, entry), null, TIER_PROBE)
}

function candidates(skipPath) {
  const out = new Map()
  const record = readRecord()
  if (record && typeof record.entry === 'string') collect(out, record.entry, record.entry, TIER_REAL)
  for (const root of [...(Array.isArray(record?.roots) ? record.roots : []), ...SEARCH_ROOTS]) collectRoot(root, out)
  collectRoot(DSH_HOME, out)
  let profiles = []
  try { profiles = fs.readdirSync(path.join(DSH_HOME, 'profiles')) } catch {}
  for (const name of profiles) collectRoot(path.join(DSH_HOME, 'profiles', name), out)
  // Last resort: a dsh on the entry's own PATH. It is no longer an equal
  // candidate: a copy found there is only booted when nothing else answers.
  if (skipPath) return out
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const shim = path.join(dir, 'dsh')
    collect(out, shim, shim, TIER_PATH)
    collect(out, path.join(dir, 'dsh.cmd'), path.join(dir, 'dsh.cmd'), TIER_PATH)
  }
  return out
}

function versionOf(entry) {
  let dir = path.dirname(entry)
  for (let hop = 0; hop < 4; hop += 1) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
      if (typeof manifest.version === 'string') return manifest.version
    } catch {}
    dir = path.dirname(dir)
  }
  return null
}

${COMPARE_VERSIONS_SOURCE}

function findPin(pin, found) {
  if (typeof pin !== 'string' || pin.length === 0) return null
  const real = canon(pin)
  return found.find(item => item.entry === real)?.entry ?? null
}

// A root that only offers a build file (lib/bin.js) is a guess: any package may
// have one. Those stay usable but never outrank a copy that is dsh by
// construction, or a dsh executable from PATH below them.
function bestOfTier(found, tier) {
  const at = found.filter(item => item.tier >= tier)
  const known = at.filter(item => item.version !== null)
  if (known.length > 0) {
    known.sort((a, b) => compare(b.version, a.version))
    return known[0].entry
  }
  return at[0]?.entry ?? null
}

// Choose the image this plugin was installed on, and only then fall back to a
// version sort: a higher version elsewhere is not an invitation to boot it.
function choose() {
  const record = readRecord()
  const pin = typeof record?.pinned === 'string' && record.pinned.length > 0 ? record.pinned : PINNED
  const found = [...candidates(true)].map(([entry, tier]) => ({ entry, tier, version: versionOf(entry) }))
  const pinned = findPin(pin, found)
  if (pinned !== null) return pinned
  // Real dsh installs first; a bare build-file guess only when nothing else
  // exists; PATH only when nothing local answered at all.
  return bestOfTier(found, TIER_REAL)
    ?? bestOfTier(found, TIER_PROBE)
    ?? bestOfTier([...candidates(false)].map(([entry, tier]) => ({ entry, tier, version: versionOf(entry) })), TIER_PATH)
}

const entry = choose()
if (entry === null) {
  console.error('[dsh-home-hosted] no dsh entry found for ' + DSH_HOME + ' (pinned path, recorded path, $DSH_HOME node_modules, profiles/*, PATH). Reinstall dsh, or restart: dsh web')
  process.exit(1)
}

const args = process.argv.slice(2)
if (/\\.(mjs|cjs|js)$/.test(entry))
  launchChild(process.execPath, [entry, ...args], false)
else
  launchChild(entry, args, process.platform === 'win32' && /\\.(cmd|bat)$/i.test(entry))
`;
}
function writeDshLauncher(options) {
  const file = dshLauncherPath(options.stateDir, options.entryExtension);
  const previousRecord = readDshLauncherRecord(options.stateDir);
  const recordedPin = existingEntry(previousRecord?.pinned);
  const offered = existingEntry(options.pinnedEntry);
  const pinned = options.repin === true ? offered ?? recordedPin : recordedPin ?? offered;
  const source = buildDshLauncherSource({
    ...options,
    pinnedEntry: pinned === null ? options.pinnedEntry ?? null : pinned
  });
  const changed = (fs12.existsSync(file) ? fs12.readFileSync(file, "utf8") : null) !== source;
  if (changed) {
    writeFileAtomic(file, source, 493);
    fs12.chmodSync(file, 493);
  }
  const raw = [dshSearchRoot(options.resolvedEntry), dshSearchRoot(pinned), ...options.searchRoots ?? [], ...previousRecord?.roots ?? []];
  const known = raw.filter((root) => typeof root === "string" && root.length > 0 && dshRootUsable(root));
  const roots = [...new Set(known)];
  writeJsonAtomic(dshLauncherRecordPath(options.stateDir), {
    entry: options.resolvedEntry,
    pinned,
    pinnedAt: pinned === null ? null : pinned === recordedPin ? previousRecord?.pinnedAt ?? Date.now() : Date.now(),
    roots,
    writtenAt: Date.now()
  }, 384);
  return { path: file, changed };
}
function existingEntry(file) {
  if (typeof file !== "string" || file.length === 0)
    return null;
  if (!fs12.existsSync(file))
    return null;
  try {
    return fs12.realpathSync(file);
  } catch {
    return null;
  }
}
function dshCandidatesUnder(root) {
  const out = [];
  for (const entry of [
    path10.join(root, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js"),
    path10.join(root, "node_modules", "dsh", "bin", "dsh.js")
  ]) {
    if (fs12.existsSync(entry))
      out.push(entry);
  }
  const store = path10.join(root, "node_modules", ".pnpm");
  if (fs12.existsSync(store)) {
    for (const name2 of fs12.readdirSync(store)) {
      if (!name2.startsWith("dsh@") && !name2.startsWith("@deepseek-ai+dsh@"))
        continue;
      for (const entry of [
        path10.join(store, name2, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js"),
        path10.join(store, name2, "node_modules", "dsh", "bin", "dsh.js")
      ]) {
        if (fs12.existsSync(entry))
          out.push(entry);
      }
    }
  }
  return out;
}
function dshSearchRoot(entry) {
  if (typeof entry !== "string" || entry.length === 0)
    return null;
  const parts = entry.split(path10.sep);
  const store = parts.lastIndexOf(".pnpm");
  const modules = parts.lastIndexOf("node_modules");
  const root = store > 0 ? parts.lastIndexOf("node_modules", store) : modules;
  if (root > 0)
    return parts.slice(0, root).join(path10.sep);
  return ownerRoot(entry) ?? (parts.length > 2 ? parts.slice(0, -2).join(path10.sep) : null);
}
function ownerRoot(entry) {
  let dir = path10.dirname(entry);
  for (let hop = 0; hop < 4; hop += 1) {
    const manifestPath = path10.join(dir, "package.json");
    const manifest = readJson(manifestPath);
    if (manifest !== null) {
      const declared = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.["dsh"] ?? Object.values(manifest.bin ?? {})[0];
      if (typeof declared === "string" && path10.resolve(path10.dirname(manifestPath), declared) === entry)
        return dir;
    }
    const parent = path10.dirname(dir);
    if (parent === dir)
      break;
    dir = parent;
  }
  return null;
}
function dshRootUsable(root) {
  return dshCandidatesUnder(root).length > 0 || fs12.existsSync(path10.join(root, "node_modules", ".pnpm")) || ["lib/bin.js", "lib/bin.mjs", "lib/bin.cjs", "dist/bin.js"].some((entry) => fs12.existsSync(path10.join(root, entry)));
}

// src/home-hosted/dsh-entry.ts
function detectProfile(argv, env = {}) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--profile" && typeof argv[index + 1] === "string" && !argv[index + 1].startsWith("-"))
      return argv[index + 1];
    if (arg?.startsWith("--profile="))
      return arg.slice("--profile=".length);
  }
  const dir = env.DSH_PROFILE_DIR;
  if (typeof dir === "string" && dir.length > 0) {
    const base = path11.basename(dir);
    if (base.length > 0 && base !== "." && base !== path11.sep)
      return base;
  }
  const app = argv.slice(2).find((candidate) => candidate !== void 0 && !candidate.startsWith("-"));
  if (app !== void 0 && app.length > 0)
    return app;
  const fromEnv = env.DSH_PROFILE;
  return typeof fromEnv === "string" && fromEnv.length > 0 ? fromEnv : "web";
}
function versionOf(entry) {
  let dir = path11.dirname(entry);
  for (let hop = 0; hop < 4; hop += 1) {
    const manifest = readJson(path11.join(dir, "package.json"));
    if (typeof manifest?.version === "string")
      return manifest.version;
    dir = path11.dirname(dir);
  }
  return null;
}
function isEntry(file) {
  return /\.[cm]?js$/.test(file) && fs13.existsSync(file) && !fs13.statSync(file).isDirectory();
}
function realPath(file) {
  try {
    return fs13.realpathSync(file);
  } catch {
    return file;
  }
}
function cloneEntryFrom(argv1) {
  if (!isEntry(argv1))
    return null;
  const root = path11.dirname(path11.dirname(argv1));
  for (const candidate of [
    path11.join(root, "lib", "bin.js"),
    path11.join(root, "lib", "bin.mjs"),
    path11.join(root, "lib", "bin.cjs"),
    path11.join(root, "dist", "bin.js"),
    path11.join(root, "bin", "dsh.js"),
    path11.join(root, "bin", "dsh.mjs")
  ]) {
    if (isEntry(candidate))
      return candidate;
  }
  return argv1;
}
function launchedEntry(argv1) {
  const real = realPath(argv1);
  const direct = cloneEntryFrom(real);
  if (direct !== null)
    return direct;
  const shimmed = resolveShimmedCli(real, process7.execPath);
  return shimmed?.cliEntry == null ? null : cloneEntryFrom(shimmed.cliEntry);
}
function findDshEntry(dshHome2) {
  const found = [];
  found.push(...dshCandidatesUnder(dshHome2));
  for (const name2 of readdirNames(path11.join(dshHome2, "profiles")))
    found.push(...dshCandidatesUnder(path11.join(dshHome2, "profiles", name2)));
  const withVersion = found.map((entry) => ({ entry, version: versionOf(entry) }));
  withVersion.sort((a, b) => compareVersions(b.version ?? "0.0.0", a.version ?? "0.0.0"));
  return withVersion[0]?.entry ?? null;
}
function readdirNames(dir) {
  try {
    return fs13.readdirSync(dir);
  } catch {
    return [];
  }
}
function projectDshEntry(dir, depth = 4) {
  let current = resolveDir(dir);
  for (let hop = 0; hop <= depth; hop += 1) {
    const shim = path11.join(current, "node_modules", ".bin", "dsh");
    const shimmed = resolveShimmedCli(shim, process7.execPath);
    if (shimmed?.cliEntry != null && isEntry(shimmed.cliEntry))
      return shimmed.cliEntry;
    const found = dshCandidatesUnder(current).map((entry) => ({ entry, version: versionOf(entry) })).sort((a, b) => compareVersions(b.version ?? "0.0.0", a.version ?? "0.0.0"));
    if (found[0] !== void 0)
      return found[0].entry;
    const parent = path11.dirname(current);
    if (parent === current)
      break;
    current = parent;
  }
  return null;
}
function resolveDir(dir) {
  try {
    return fs13.realpathSync(dir);
  } catch {
    return path11.resolve(dir);
  }
}
async function resolveDshLaunch(options = {}) {
  const argv1 = options.argv1 === void 0 ? process7.argv[1] : options.argv1;
  const dshHome2 = options.dshHome ?? dshHome();
  const stateDir = options.stateDir ?? pluginStateDir();
  const projectDir = options.projectDir === void 0 ? process7.cwd() : options.projectDir;
  const declared = projectDir === null || projectDir.trim().length === 0 ? null : projectDshEntry(projectDir);
  if (declared !== null && realPath(declared) !== realPath(launcherFor(stateDir, declared))) {
    const launcher = writeDshLauncher({
      stateDir,
      dshHome: dshHome2,
      resolvedEntry: declared,
      pinnedEntry: declared,
      repin: true,
      entryExtension: path11.extname(declared),
      searchRoots: [dshSearchRoot(declared), projectDir].filter((root) => typeof root === "string" && root.length > 0)
    });
    return { program: process7.execPath, args: [declared], cliEntry: declared, shimPath: null, source: "entry", launcherPath: launcher.path };
  }
  const local = typeof argv1 === "string" && argv1.length > 0 ? launchedEntry(argv1) : null;
  if (local !== null && realPath(local) !== realPath(dshLauncherPath(stateDir, path11.extname(local)))) {
    const launcher = writeDshLauncher({
      stateDir,
      dshHome: dshHome2,
      resolvedEntry: local,
      // The running image is the one a boot entry must keep running: a global
      // copy that reports a higher version is not an upgrade of this install.
      pinnedEntry: local,
      repin: true,
      entryExtension: path11.extname(local),
      // Where this install sits, so a rebuilt/moved copy is found next boot.
      searchRoots: [dshSearchRoot(local)].filter((root) => root !== null)
    });
    return { program: process7.execPath, args: [local], cliEntry: local, shimPath: null, source: "entry", launcherPath: launcher.path };
  }
  if (argv1 !== void 0 && argv1 !== null && realPath(argv1) === realPath(dshLauncherPath(stateDir, path11.extname(local ?? argv1)))) {
    const pinned = readDshLauncherRecord(stateDir)?.pinned ?? null;
    if (pinned !== null) {
      const launcher = dshLauncherPath(stateDir, path11.extname(pinned));
      const launch2 = resolveShimmedCli(pinned, process7.execPath);
      const cliEntry = launch2?.cliEntry ?? pinned;
      if (readDshLauncherRecord(stateDir)?.entry !== pinned)
        writeDshLauncher({ stateDir, dshHome: dshHome2, resolvedEntry: cliEntry, pinnedEntry: pinned, entryExtension: path11.extname(pinned) });
      return { program: process7.execPath, args: [launcher], cliEntry, shimPath: null, source: "entry", launcherPath: launcher };
    }
  }
  const installed = findDshEntry(dshHome2);
  if (installed !== null) {
    const launcher = writeDshLauncher({ stateDir, dshHome: dshHome2, resolvedEntry: installed, entryExtension: path11.extname(installed) });
    return { program: process7.execPath, args: [installed], cliEntry: installed, shimPath: null, source: "entry", launcherPath: launcher.path };
  }
  const found = await (options.findOnPath ?? which)("dsh");
  if (found === null)
    return null;
  if (readDshLauncherRecord(stateDir)?.pinned != null)
    return null;
  const launch = resolveShimmedCli(found, process7.execPath);
  return launch === null ? null : { ...launch, launcherPath: null };
}
function launcherFor(stateDir, entry) {
  return dshLauncherPath(stateDir, path11.extname(entry));
}
function buildCommand(launch, launcherPath2) {
  if (launcherPath2 !== null && launcherPath2.length > 0)
    return { command: process7.execPath, entryArgs: [launcherPath2] };
  return { command: launch.program, entryArgs: launch.args };
}
function entryScript(config) {
  const program = config.command;
  if (typeof program !== "string" || program.length === 0)
    return null;
  if (!path11.isAbsolute(program))
    return program;
  const rest = config.args ?? [];
  return rest.find((arg) => path11.isAbsolute(arg)) ?? program;
}
function localDshCommand(projectDir, entry) {
  if (typeof projectDir !== "string" || projectDir.trim().length === 0 || entry === null)
    return null;
  const shim = resolveShimmedCli(path11.join(projectDir, "node_modules", ".bin", "dsh"))?.cliEntry ?? null;
  if (shim === null)
    return null;
  return realPath(shim) === realPath(entry) ? "dsh" : null;
}
function pinnedScriptFor(launch, projectDir) {
  if (launch === null)
    return null;
  const entry = launch.cliEntry ?? launch.args.find((arg) => path11.isAbsolute(arg)) ?? null;
  if (localDshCommand(projectDir, entry) === "dsh")
    return "dsh";
  const launcher = launch.launcherPath;
  if (launcher !== null && launcher.length > 0)
    return launcher;
  return entry;
}
function isBareCommand(stored) {
  return !/[/\\]/.test(stored) && (stored === "dsh" || /^dsh\.(?:cmd|exe)$/i.test(stored));
}
function needsLauncherRepair(config) {
  const program = config.command;
  if (typeof program !== "string" || program.length === 0)
    return false;
  if (path11.isAbsolute(program))
    return true;
  if (isBareCommand(program))
    return true;
  return (config.args ?? []).some((arg) => path11.isAbsolute(arg));
}
function argsWithoutScript(config, storedBare, pinned) {
  const args = config.args ?? [];
  const script = storedBare ? -1 : args.findIndex((arg) => path11.isAbsolute(arg) || arg === pinned);
  return script === -1 ? args : args.filter((_, index) => index !== script);
}
function launcherRepair(config, launch, options = {}) {
  const pinned = pinnedScriptFor(launch, options.projectDir);
  if (pinned === null || launch === null)
    return null;
  const targetBare = pinned === "dsh";
  const storedBare = isBareCommand(entryScript(config) ?? "");
  const stored = entryScript(config);
  if (stored === null)
    return null;
  const program = config.command ?? "";
  const programDrift = options.ownedCommand === true && !targetBare && (!path11.isAbsolute(program) || path11.resolve(program) !== path11.resolve(process7.execPath));
  if (stored === pinned && !programDrift)
    return null;
  if (!storedBare && options.ownedCommand !== true) {
    const target = resolveShimmedCli(stored, process7.execPath)?.cliEntry ?? stored;
    if (target !== launch.cliEntry && target !== pinned)
      return null;
  }
  const rest = argsWithoutScript(config, storedBare, pinned);
  return targetBare ? { command: "dsh", args: rest, ...typeof options.projectDir === "string" && options.projectDir.length > 0 ? { cwd: options.projectDir } : {} } : { command: process7.execPath, args: [pinned, ...rest] };
}
function buildDshEntry(facts) {
  const launch = facts.launch;
  const profile = facts.profile === null || facts.profile === void 0 ? "web" : facts.profile;
  const appArgs = [];
  if (facts.port !== null) {
    appArgs.push(
      "--port",
      "{port}",
      "--host",
      "127.0.0.1",
      "--no-open",
      "--trusted-host",
      `localhost:{port}`
    );
  }
  const launcherArgs = profile === "web" ? ["web"] : ["--profile", profile];
  const projectDir = facts.projectDir === void 0 || facts.projectDir === null ? process7.cwd() : facts.projectDir;
  const local = launch === null ? null : localDshCommand(projectDir, launch.cliEntry);
  const generated = launch === null || local === "dsh" ? { command: "dsh", entryArgs: [] } : buildCommand(launch, facts.launcherPath ?? null);
  return {
    id: facts.id,
    label: "DSH web",
    enabled: true,
    autostart: true,
    command: generated.command,
    args: [...generated.entryArgs, ...launcherArgs, ...appArgs],
    bind: "local",
    port: facts.port,
    cwd: projectDir,
    env: {},
    dataEnvs: { DSH_HOME: facts.dshHome },
    onPortConflict: "kill",
    stop: { killPortHolders: true },
    health: {
      enabled: true,
      mode: "http",
      // 401 is normal here: the panel answers the login route when auth is on.
      http: { path: "/", method: "GET", expectStatusBelow: 500, expectBody: "" }
    }
  };
}

// src/home-hosted/instances.ts
import fs14 from "node:fs";
import os4 from "node:os";
import path12 from "node:path";

// src/home-hosted/runtime.ts
import http from "node:http";
import https from "node:https";
import process8 from "node:process";
function readRuntime(home) {
  const raw = readJson(runFile(home));
  if (raw === null)
    return null;
  const url = typeof raw.url === "string" ? raw.url : null;
  const pid = typeof raw.pid === "number" ? raw.pid : null;
  if (url === null || pid === null)
    return null;
  return {
    version: typeof raw.version === "string" ? raw.version : "unknown",
    pid,
    url: url.replace(/\/+$/, ""),
    probeUrl: typeof raw.probeUrl === "string" ? raw.probeUrl : void 0,
    protocol: typeof raw.protocol === "string" ? raw.protocol : void 0,
    port: typeof raw.port === "number" ? raw.port : 0,
    bindHost: typeof raw.bindHost === "string" ? raw.bindHost : void 0,
    projectDir: typeof raw.projectDir === "string" ? raw.projectDir : void 0,
    dataRoot: typeof raw.dataRoot === "string" ? raw.dataRoot : void 0,
    configPath: typeof raw.configPath === "string" ? raw.configPath : void 0,
    logFile: typeof raw.logFile === "string" ? raw.logFile : void 0
  };
}
function pidAlive(pid) {
  try {
    process8.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}
async function probePanel(url, timeoutMs = 2e3) {
  const target = `${url.replace(/\/+$/, "")}/healthz`;
  return await new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled)
        return;
      settled = true;
      resolve(value);
    };
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      done(false);
      return;
    }
    const transport = parsed.protocol === "https:" ? https : http;
    const request = transport.get(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        timeout: timeoutMs,
        rejectUnauthorized: false
      },
      (response) => {
        response.resume();
        done(typeof response.statusCode === "number");
      }
    );
    request.on("timeout", () => {
      request.destroy();
      done(false);
    });
    request.on("error", () => done(false));
  });
}

// src/home-hosted/instances.ts
var SIBLING_PATTERN = /^\.home-hosted(?:[._-].*)?$/;
function canonicalPath(value) {
  const resolved = path12.resolve(expandHome(value));
  try {
    return fs14.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}
function defaultListDir(dir) {
  try {
    return fs14.readdirSync(dir);
  } catch {
    return null;
  }
}
function isStateRoot(home) {
  try {
    if (!fs14.statSync(home).isDirectory())
      return false;
  } catch {
    return false;
  }
  if (isHhRoot(home) || isLegacyRoot(home))
    return true;
  return fs14.existsSync(runFile(home));
}
function viewOf(candidate, managed, envHome, hosting, alive) {
  const runtime = readRuntime(candidate.home);
  const read = readConfig(candidate.home, defaultWorkspace(candidate.home));
  return {
    home: candidate.home,
    managed: candidate.home === managed,
    hosting: hosting && candidate.home === envHome,
    url: runtime?.url ?? null,
    port: runtime?.port ?? null,
    pid: runtime?.pid ?? null,
    version: runtime?.version ?? null,
    // A `run.json` names the process that wrote it; a recycled pid is not worth
    // chasing here, because a stale one only mislabels a panel nobody acts on.
    running: runtime !== null && alive(runtime.pid),
    projectDir: runtime?.projectDir ?? null,
    servers: read.error === null ? (read.raw?.servers ?? []).length : null,
    source: candidate.source
  };
}
function discoverInstances(options) {
  const managed = canonicalPath(options.managedHome);
  const listDir = options.listDir ?? defaultListDir;
  const alive = options.alive ?? pidAlive;
  const envRaw = options.envHome?.trim();
  const envHome = envRaw !== void 0 && envRaw.length > 0 ? canonicalPath(envRaw) : null;
  const hostingEntryId = options.hostingEntryId?.trim() ?? "";
  const candidates = [{ home: managed, source: "managed" }];
  if (envHome !== null)
    candidates.push({ home: envHome, source: "env" });
  for (const root of options.extraRoots ?? []) {
    if (root.trim().length > 0)
      candidates.push({ home: canonicalPath(root), source: "configured" });
  }
  const homeDir = options.homeDir ?? os4.homedir();
  for (const name2 of listDir(homeDir) ?? []) {
    if (SIBLING_PATTERN.test(name2))
      candidates.push({ home: canonicalPath(path12.join(homeDir, name2)), source: "sibling" });
  }
  const seen = /* @__PURE__ */ new Set();
  const views = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.home))
      continue;
    seen.add(candidate.home);
    if (candidate.source !== "managed" && !isStateRoot(candidate.home))
      continue;
    views.push(viewOf(candidate, managed, envHome, hostingEntryId.length > 0, alive));
  }
  views.sort((left, right) => left.managed === right.managed ? left.home.localeCompare(right.home) : left.managed ? -1 : 1);
  return views;
}
function describeInstance(instance) {
  if (instance.url === null)
    return `${instance.home} (no runtime)`;
  return `${instance.home} (${instance.url}${instance.running ? "" : ", stopped"})`;
}
function instancesNoticeText(instances) {
  const managed = instances.find((instance) => instance.managed);
  const others = instances.filter((instance) => !instance.managed);
  if (managed === void 0 || others.length === 0)
    return null;
  return [
    `home-hosted: ${instances.length} panels were found on this machine, and this plugin manages only ${describeInstance(managed)}.`,
    `Other panels: ${others.map(describeInstance).join("; ")}.`,
    'Act on the managed panel unless the user names another; a home_hosted_* call takes "instance" to name one.',
    "Naming another panel is allowed for methods that can reach it: the plugin asks the user how, then edits that panel's config file, runs the CLI against its state root, or \u2014 only if they choose it \u2014 mints a token for that panel and uses its API."
  ].join(" ");
}

// src/home-hosted/entries.ts
function defaultOnPortConflict(platform = process.platform) {
  return platform === "win32" ? "kill" : "follow";
}
function defaultIntent(id, platform = process.platform) {
  return {
    id,
    autostart: true,
    onPortConflict: defaultOnPortConflict(platform),
    stopKillPortHolders: true,
    persistent: true
  };
}
function ownedPatch(intent, live) {
  const stop = live?.stop ?? {};
  return {
    autostart: intent.autostart,
    onPortConflict: intent.onPortConflict,
    persistent: intent.persistent,
    stop: { ...stop, killPortHolders: intent.stopKillPortHolders }
  };
}
function ownedDrift(live, intent) {
  if (live === null)
    return ["missing entry"];
  const drift = [];
  if (live.autostart !== intent.autostart)
    drift.push("autostart");
  if (live.onPortConflict !== intent.onPortConflict)
    drift.push("onPortConflict");
  if ((live.persistent ?? false) !== intent.persistent)
    drift.push("persistent");
  const killPortHolders = live.stop?.killPortHolders;
  if (killPortHolders !== intent.stopKillPortHolders)
    drift.push("stop.killPortHolders");
  return drift;
}
function isCreatedEntry(snapshot) {
  if (snapshot === void 0)
    return false;
  return Object.keys(snapshot).length === 1 && typeof snapshot.id === "string";
}
function snapshotOwned(live) {
  const killPortHolders = live.stop?.killPortHolders;
  return {
    id: live.id,
    autostart: typeof live.autostart === "boolean" ? live.autostart : false,
    onPortConflict: isOnPortConflict(live.onPortConflict) ? live.onPortConflict : "block",
    persistent: live.persistent === true,
    stop: { killPortHolders: typeof killPortHolders === "boolean" ? killPortHolders : false }
  };
}
function restorePatch(live, snapshot) {
  const stop = live.stop ?? {};
  const previous = snapshot?.stop ?? {};
  return {
    autostart: snapshot?.autostart ?? false,
    onPortConflict: snapshot?.onPortConflict ?? "block",
    persistent: snapshot?.persistent === true,
    stop: {
      ...stop,
      killPortHolders: typeof previous.killPortHolders === "boolean" ? previous.killPortHolders : false
    }
  };
}

// src/home-hosted/panel-control.ts
import { spawn as spawn2 } from "node:child_process";
import fs15 from "node:fs";
import path13 from "node:path";
import process9 from "node:process";
function cliArgs(deps, command) {
  const args = [...deps.launch?.args ?? [], command, "--home", deps.home];
  if (deps.projectDir)
    args.push("--project", deps.projectDir);
  return args;
}
async function runCli(deps, command) {
  const args = cliArgs(deps, command);
  if (deps.exec !== void 0)
    return await deps.exec(args, deps.env);
  const launch = deps.launch;
  if (launch === null)
    return { code: null, stdout: "", stderr: "no home-hosted CLI is available", error: null };
  return await run(launch.program, args, {
    env: deps.env,
    timeoutMs: deps.timeoutMs ?? 9e4
  });
}
async function startPanel(deps) {
  const result = await runCli(deps, "up");
  if (result.code !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `the CLI exited ${String(result.code)}`;
    return { ok: false, detail };
  }
  const match = /https?:\/\/[^\s]+/.exec(result.stdout);
  return { ok: true, detail: "the panel is answering", url: match?.[0] ?? null };
}
async function stopPanel(deps) {
  const result = await runCli(deps, "down");
  if (result.code !== 0) {
    const detail = result.error ?? (result.stderr.trim() || result.stdout.trim() || `the CLI exited ${String(result.code)}`);
    return { ok: false, detail: `the panel did not stop: ${detail}` };
  }
  return { ok: true, detail: "the panel stopped; the servers it supervised stopped with it" };
}
function takeoverHelperPath(stateDir) {
  return path13.join(launcherDir(stateDir), "panel-takeover.mjs");
}
function takeoverLogPath(stateDir) {
  return path13.join(launcherDir(stateDir), "panel-takeover.log");
}
function activationHelperPath(stateDir) {
  return path13.join(launcherDir(stateDir), "panel-activate.mjs");
}
function activationLogPath(stateDir) {
  return path13.join(launcherDir(stateDir), "panel-activate.log");
}
function buildActivationSource(plan, marker = "managed by dsh-home-hosted") {
  return `#!/usr/bin/env node
// ${marker} \u2014 starts the panel through its autostart entry; do not edit.
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const STEPS = ${JSON.stringify(plan.commands)}
const REQUIRES = ${JSON.stringify(plan.requires)}
const FILES = ${JSON.stringify(plan.files)}
const STOP = ${JSON.stringify(plan.stop)}
const DETACH = ${JSON.stringify(plan.detach)}
const OLD_PID = ${JSON.stringify(plan.oldPid)}
const RETIRE = ${JSON.stringify(plan.retire)}
const LOG = ${JSON.stringify(plan.logPath)}

function log(line) {
  try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + line + '\\n') } catch {}
}

function fail(line) {
  log(line)
  process.exit(1)
}

function alive(pid) {
  if (typeof pid !== 'number') return false
  // EPERM means the pid exists and is not ours to signal; treating it as gone
  // would skip the escalation and start a second panel over a live one.
  try { process.kill(pid, 0); return true } catch (error) { return error?.code === 'EPERM' }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Everything is proven while the panel is still answering: a start that could
// never work must not be attempted after the old panel is already gone.
for (const file of FILES) {
  if (!fs.existsSync(file))
    fail('refusing to stop the panel: ' + file + ' is not there')
}
for (const probe of REQUIRES) {
  const result = spawnSync(probe[0], probe.slice(1), { stdio: 'ignore' })
  if (result.error || result.status !== 0)
    fail('refusing to stop the panel: ' + probe.join(' ') + ' did not confirm (' + String(result.status ?? result.error) + ')')
}

// A panel the previous mechanism supervises must be stopped through that
// mechanism first: its restart policy would revive it the moment 'down' ends.
for (const step of DETACH) {
  log('detaching from the previous autostart entry: ' + step.join(' '))
  const result = spawnSync(step[0], step.slice(1), { stdio: 'ignore' })
  log('exited ' + String(result.status ?? result.error))
}

// The panel has to be gone before the entry runs: home-hosted refuses to start a
// second panel while run.json names a live pid, so starting over a running one
// leaves the entry failed while the old panel keeps the port.
log('stopping the answering panel: ' + STOP.join(' '))
const stopped = spawnSync(STOP[0], STOP.slice(1), { stdio: 'ignore', timeout: 90000 })
log('down exited ' + String(stopped.status ?? stopped.error))

if (alive(OLD_PID)) {
  log('the panel is still alive; sending SIGTERM')
  try { process.kill(OLD_PID, 'SIGTERM') } catch {}
  for (let i = 0; i < 40 && alive(OLD_PID); i += 1)
    await sleep(250)
}

if (alive(OLD_PID)) {
  log('still alive; sending SIGKILL')
  try { process.kill(OLD_PID, 'SIGKILL') } catch {}
  for (let i = 0; i < 20 && alive(OLD_PID); i += 1)
    await sleep(250)
}

for (const step of STEPS) {
  log('running ' + step.join(' '))
  const result = spawnSync(step[0], step.slice(1), { stdio: 'ignore' })
  log('exited ' + String(result.status ?? result.error))
  if (result.error || result.status !== 0)
    fail(step.join(' ') + ' did not succeed, so the panel is down')
}

// Only now: the entry being removed may be the one that just started the panel,
// and a failure to remove it is logged rather than fatal \u2014 the panel is up.
for (const step of RETIRE) {
  log('retiring ' + step.join(' '))
  const result = spawnSync(step[0], step.slice(1), { stdio: 'ignore' })
  log('exited ' + String(result.status ?? result.error))
}

log('the autostart entry was told to start the panel')
`;
}
function buildTakeoverSource(deps, oldPid, marker = "managed by dsh-home-hosted") {
  const program = deps.launch?.program ?? process9.execPath;
  const args = deps.launch === null ? [] : [...deps.launch.args, "up", "--home", deps.home, ...deps.projectDir ? ["--project", deps.projectDir] : []];
  const downArgs = [...deps.launch?.args ?? [], "down", "--home", deps.home];
  return `#!/usr/bin/env node
// ${marker} \u2014 replaces the panel; do not edit.
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const OLD_PID = ${JSON.stringify(oldPid)}
const DOWN_ARGS = ${JSON.stringify(downArgs)}
const PROGRAM = ${JSON.stringify(program)}
const ARGS = ${JSON.stringify(args)}
const ENV = ${JSON.stringify(deps.env)}
const LOG = ${JSON.stringify(takeoverLogPath(deps.stateDir))}

function log(line) {
  try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + line + '\\n') } catch {}
}

function alive(pid) {
  if (typeof pid !== 'number') return false
  // EPERM means the pid exists and is not ours to signal; treating it as gone
  // would skip the escalation and start a second panel over a live one.
  try { process.kill(pid, 0); return true } catch (error) { return error?.code === 'EPERM' }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

log('stopping the answering panel: ' + PROGRAM + ' ' + DOWN_ARGS.join(' '))
const down = spawnSync(PROGRAM, DOWN_ARGS, { env: { ...process.env, ...ENV }, stdio: 'ignore' })
log('down exited ' + String(down.status))

for (let i = 0; i < 40 && alive(OLD_PID); i += 1)
  await sleep(250)

if (alive(OLD_PID)) {
  log('still alive; sending SIGTERM')
  try { process.kill(OLD_PID, 'SIGTERM') } catch {}
  for (let i = 0; i < 40 && alive(OLD_PID); i += 1)
    await sleep(250)
}

if (alive(OLD_PID)) {
  log('still alive; sending SIGKILL')
  try { process.kill(OLD_PID, 'SIGKILL') } catch {}
  for (let i = 0; i < 20 && alive(OLD_PID); i += 1)
    await sleep(250)
}

log('starting ' + PROGRAM + ' ' + ARGS.join(' '))
const result = spawnSync(PROGRAM, ARGS, { env: { ...process.env, ...ENV }, stdio: 'ignore' })
log('started with exit ' + String(result.status))
`;
}
function writeTakeoverHelper(deps, oldPid) {
  const file = takeoverHelperPath(deps.stateDir);
  writeFileAtomic(file, buildTakeoverSource(deps, oldPid), 493);
  fs15.chmodSync(file, 493);
  return file;
}
function writeActivationHelper(stateDir, plan) {
  const file = activationHelperPath(stateDir);
  writeFileAtomic(file, buildActivationSource(plan), 493);
  fs15.chmodSync(file, 493);
  return file;
}
function spawnActivation(stateDir, plan, spawnChild = spawnDetached) {
  const helper = writeActivationHelper(stateDir, plan);
  let child;
  try {
    child = spawnChild(process9.execPath, [helper]);
  } catch (error) {
    return { ok: false, detail: `could not start the autostart helper: ${error instanceof Error ? error.message : String(error)}` };
  }
  child.on("error", () => {
  });
  child.unref();
  return {
    ok: true,
    detail: `starting the panel through its autostart entry now; this page disconnects and comes back when it answers`
  };
}
function spawnDetached(program, args) {
  return spawn2(program, args, { detached: true, stdio: "ignore" });
}
function spawnTakeover(deps, oldPid, spawnChild = spawnDetached) {
  const helper = writeTakeoverHelper(deps, oldPid);
  let child;
  try {
    child = spawnChild(process9.execPath, [helper]);
  } catch (error) {
    return { ok: false, detail: `could not start the panel-replacement helper: ${error instanceof Error ? error.message : String(error)}` };
  }
  child.on("error", () => {
  });
  child.unref();
  return {
    ok: true,
    detail: "replacing the panel now; this page will disconnect and come back under the preferred copy"
  };
}
async function installGlobal(range, options = {}) {
  const execute = options.run ?? run;
  const usePnpm = options.pnpm ?? true;
  const result = usePnpm ? await execute("pnpm", ["add", "-g", `home-hosted@${range}`], { timeoutMs: 3e5 }) : await execute("npm", ["install", "-g", `home-hosted@${range}`], { timeoutMs: 3e5 });
  const output = `${result.stdout}
${result.stderr}`.trim();
  if (result.code !== 0)
    return { ok: false, detail: result.error ?? `the installer exited ${String(result.code)}`, output };
  return { ok: true, detail: `installed home-hosted@${range} globally`, output };
}

// src/home-hosted/panel.ts
var PanelError = class extends Error {
  constructor(message2, code, status = null, detail = void 0) {
    super(message2);
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.name = "PanelError";
  }
};
var PanelClient = class {
  baseUrl;
  token;
  timeoutMs;
  workspace;
  constructor(options) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? 1e4;
    this.workspace = options.workspace ?? null;
  }
  /**
   * A server path for one workspace. Server ids are only unique inside a
   * workspace, so `?workspace=` is what selects which one is meant; omitting it
   * on a panel that predates workspaces changes nothing.
   */
  /**
   * The panel names a server's workspace `workspaceId`; the plugin's view calls it
   * `workspace`. One mapping, so a caller never has to know both spellings.
   */
  view(raw, workspace) {
    const { workspaceId, ...rest } = raw;
    return { ...rest, workspace: workspaceId ?? workspace ?? this.workspace ?? "" };
  }
  /**
   * A `POST`/`PATCH` answer.
   *
   * The real panel answers the stored entry *flat* here — no `config` wrapper, no
   * `workspaceId`, no live status — while `GET` answers a view. Both are accepted:
   * a body that already carries a `config` object is a view, and anything else is
   * the entry itself. Reading a flat entry as a view is what made `created.config`
   * `undefined`, so the shape is decided here rather than assumed.
   *
   * A flat entry carries no live status, so it is reported as `unknown`: the panel
   * has not said. Callers that need one re-read the list.
   */
  written(raw, workspace) {
    const record = raw;
    if (isRecord(record.config))
      return this.view(raw, workspace);
    const { workspaceId, id, ...config } = record;
    return {
      id: typeof id === "string" ? id : "",
      workspace: typeof workspaceId === "string" ? workspaceId : workspace ?? this.workspace ?? "",
      status: "unknown",
      pid: null,
      url: null,
      config
    };
  }
  ws(path18, workspace) {
    const id = workspace ?? this.workspace;
    if (id === null || id === void 0 || id.length === 0)
      return path18;
    return `${path18}${path18.includes("?") ? "&" : "?"}workspace=${encodeURIComponent(id)}`;
  }
  async request(method, path18, body) {
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path18}`, {
        method,
        headers: {
          authorization: `Bearer ${this.token}`,
          ...body === void 0 ? {} : { "content-type": "application/json" }
        },
        body: body === void 0 ? void 0 : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      throw new PanelError(
        error instanceof Error ? error.message : String(error),
        "PANEL_UNREACHABLE"
      );
    }
    const text = await response.text();
    let parsed = null;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      throw new PanelError(`the panel answered ${response.status} with a non-JSON body`, "PANEL_BAD_RESPONSE", response.status);
    }
    if (!response.ok) {
      const record = parsed;
      const message2 = typeof record?.message === "string" ? record.message : typeof record?.error === "string" ? record.error : `the panel answered ${response.status}`;
      const code = typeof record?.code === "string" ? record.code : "PANEL_ERROR";
      throw new PanelError(message2, code, response.status, record?.detail);
    }
    return parsed;
  }
  async listServers(workspace) {
    const answer2 = await this.request("GET", this.ws("/api/servers", workspace));
    return answer2.servers.map((server) => this.view(server, workspace));
  }
  async getServer(id, workspace) {
    const answer2 = await this.request("GET", this.ws(`/api/servers/${encodeURIComponent(id)}`, workspace));
    return this.view(answer2.server, workspace);
  }
  async createServer(entry, workspace) {
    const answer2 = await this.request("POST", this.ws("/api/servers", workspace), entry);
    return this.written(answer2.server, workspace);
  }
  async updateServer(id, patch, workspace) {
    const answer2 = await this.request("PATCH", this.ws(`/api/servers/${encodeURIComponent(id)}`, workspace), patch);
    return this.written(answer2.server, workspace);
  }
  async deleteServer(id, workspace) {
    await this.request("DELETE", this.ws(`/api/servers/${encodeURIComponent(id)}`, workspace));
  }
  async startServer(id, workspace) {
    await this.request("POST", this.ws(`/api/servers/${encodeURIComponent(id)}/start`, workspace));
  }
  async stopServer(id, workspace) {
    await this.request("POST", this.ws(`/api/servers/${encodeURIComponent(id)}/stop`, workspace));
  }
  async restartServer(id, workspace) {
    await this.request("POST", this.ws(`/api/servers/${encodeURIComponent(id)}/restart`, workspace));
  }
  /** The workspaces this panel serves, as its registry reports them. */
  async listWorkspaces() {
    const answer2 = await this.request("GET", "/api/workspaces");
    return answer2.workspaces;
  }
  /** The panel's own settings: `control` is the listener block a port change edits. */
  async settings() {
    return await this.request("GET", "/api/settings");
  }
  /**
   * Re-list the port's listeners and stop what is not the panel's own tree.
   *
   * The page reads `free`, `port` and `skipped`; `stopped` is what the panel
   * answers today. Declared as the shared contract so both halves agree on it.
   */
  async freePort(id, workspace) {
    return await this.request("POST", this.ws(`/api/servers/${encodeURIComponent(id)}/free-port`, workspace));
  }
};
async function probeToken(baseUrl, token, timeoutMs = 5e3) {
  try {
    await new PanelClient({ baseUrl, token, timeoutMs }).listServers();
    return "ok";
  } catch (error) {
    if (error instanceof PanelError && (error.code === "AUTH_REQUIRED" || error.status === 401 || error.status === 403))
      return "refused";
    return "unreachable";
  }
}
async function verifyToken(baseUrl, token, timeoutMs = 5e3) {
  return await probeToken(baseUrl, token, timeoutMs) === "ok";
}

// src/home-hosted/panel-console.ts
import fs16 from "node:fs";
import path14 from "node:path";
function panelConsolePath(home) {
  return path14.join(hhDir(home), ".logs", "home-hosted.log");
}
function readPanelConsole(home, options = {}) {
  const file = panelConsolePath(home);
  const limit = options.lines ?? 50;
  const current = limit > 0 ? readTail(file, limit) : readWhole(file);
  if (current.error !== null)
    return { path: file, lines: [], error: current.error };
  if (limit <= 0) {
    const rotated2 = readWhole(`${file}.1`);
    return { path: file, lines: joinRotation(rotated2, current.lines), error: null };
  }
  if (current.newlines >= limit + 1)
    return { path: file, lines: current.lines.slice(-limit), error: null };
  const rotated = readWhole(`${file}.1`);
  return { path: file, lines: joinRotation(rotated, current.lines).slice(-limit), error: null };
}
function joinRotation(rotated, current) {
  if (!rotated.unterminated || rotated.lines.length === 0 || current.length === 0)
    return [...rotated.lines, ...current];
  return [...rotated.lines.slice(0, -1), `${rotated.lines[rotated.lines.length - 1]}${current[0]}`, ...current.slice(1)];
}
function readWhole(file) {
  if (!fs16.existsSync(file))
    return { lines: [], newlines: 0, unterminated: false, error: null };
  try {
    const text = fs16.readFileSync(file, "utf8");
    return { lines: splitLines(text), newlines: countNewlines(text), unterminated: text.length > 0 && !text.endsWith("\n"), error: null };
  } catch (error) {
    return { lines: [], newlines: 0, unterminated: false, error: message(error) };
  }
}
var TAIL_BLOCK_BYTES = 64 * 1024;
function countNewlines(text) {
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10)
      count += 1;
  }
  return count;
}
function readTail(file, limit) {
  if (!fs16.existsSync(file))
    return { lines: [], newlines: 0, unterminated: false, error: null };
  let fd;
  try {
    fd = fs16.openSync(file, "r");
  } catch (error) {
    return { lines: [], newlines: 0, unterminated: false, error: message(error) };
  }
  try {
    const size = fs16.fstatSync(fd).size;
    if (size === 0)
      return { lines: [], newlines: 0, unterminated: false, error: null };
    let end = size;
    let text = "";
    let newlines = 0;
    while (end > 0 && newlines < limit + 1) {
      const start = Math.max(0, end - TAIL_BLOCK_BYTES);
      const length = end - start;
      const buffer = Buffer.alloc(length);
      fs16.readSync(fd, buffer, 0, length, start);
      const block = buffer.toString("utf8");
      newlines += countNewlines(block);
      text = block + text;
      end = start;
    }
    return { lines: splitLines(text).slice(-limit), newlines, unterminated: false, error: null };
  } catch (error) {
    return { lines: [], newlines: 0, unterminated: false, error: message(error) };
  } finally {
    fs16.closeSync(fd);
  }
}
function splitLines(text) {
  const lines = text.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "")
    lines.pop();
  return lines;
}
function message(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/home-hosted/token.ts
import { createHash, randomBytes } from "node:crypto";
import path15 from "node:path";
function tokenSlot(home) {
  return createHash("sha256").update(path15.resolve(home)).digest("hex").slice(0, 16);
}
function storedTokenPath(stateDir, slot) {
  return slot === void 0 ? path15.join(stateDir, "panel-token") : path15.join(stateDir, "panel-tokens", `${slot}.token`);
}
function readStoredToken(stateDir, slot) {
  const text = readText(storedTokenPath(stateDir, slot))?.trim();
  return text !== void 0 && text.length > 0 ? text : null;
}
function storeToken(stateDir, token, slot) {
  writeFileAtomic(storedTokenPath(stateDir, slot), `${token}
`, 384);
}
function generateToken() {
  return randomBytes(32).toString("base64url");
}
function apiTokenEnrolled(home) {
  const secrets = readJson(secretsFile(home));
  return secrets !== null && secrets.apiToken !== null && secrets.apiToken !== void 0;
}
var queue = /* @__PURE__ */ new Map();
function serialised(stateDir, slot, work) {
  const key = `${path15.resolve(stateDir)}\0${slot ?? ""}`;
  const previous = queue.get(key) ?? Promise.resolve();
  const next = previous.then(work, work);
  const settled = next.then(() => void 0, () => void 0);
  queue.set(key, settled);
  void settled.then(() => {
    if (queue.get(key) === settled) queue.delete(key);
  });
  return next;
}
async function ensureToken(options) {
  return await serialised(options.stateDir, options.slot, async () => await enrollToken(options));
}
async function reclaimToken(options) {
  return await serialised(options.stateDir, options.slot, async () => await enrollFreshToken(options));
}
async function runCli2(exec, args, env) {
  try {
    const result = await exec(args, env);
    if (result.code !== 0) {
      return {
        failure: result.error?.trim() || result.stderr.trim() || result.stdout.trim() || `exit ${String(result.code)}`
      };
    }
    return { result };
  } catch (error) {
    return { failure: error instanceof Error ? error.message : String(error) };
  }
}
async function enrollToken(options) {
  const stored = readStoredToken(options.stateDir, options.slot);
  if (stored !== null)
    return { token: stored, enrolled: false, detail: "using the stored panel token" };
  if (apiTokenEnrolled(options.home)) {
    return {
      token: null,
      enrolled: false,
      detail: "home-hosted already has an API token, and this plugin does not have it; run `home-hosted set-token --generate` and store that token, or clear it and re-enable"
    };
  }
  const token = generateToken();
  const enrolled = await runCli2(options.exec, ["--home", options.home, "set-token"], { HHOSTED_TOKEN: token });
  if (enrolled.result === void 0) {
    return {
      token: null,
      enrolled: false,
      detail: `could not enrol an API token: ${enrolled.failure ?? "the CLI did not answer"}`
    };
  }
  storeToken(options.stateDir, token, options.slot);
  return { token, enrolled: true, detail: "enrolled a new panel API token" };
}
async function enrollFreshToken(options) {
  const token = generateToken();
  const enrolled = await runCli2(options.exec, ["--home", options.home, "set-token"], { HHOSTED_TOKEN: token });
  if (enrolled.result === void 0) {
    return {
      token: null,
      detail: `could not enrol a fresh API token: ${enrolled.failure ?? "the CLI did not answer"}; the previously stored token was kept`
    };
  }
  storeToken(options.stateDir, token, options.slot);
  return { token, detail: "enrolled a fresh panel API token" };
}

// src/service.ts
var ENTRY_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
var TOKEN_PROBE_TIMEOUT_MS = 3e3;
var CONSOLE_DEFAULT_LINES = 50;
var CONSOLE_MAX_LINES = 5e3;
var ENTRY_RECOVERY_INTERVAL_MS = 3e4;
var INSTANCES_CACHE_MS = 1e4;
function pluginRoot() {
  try {
    return path16.dirname(path16.dirname(fileURLToPath(import.meta.url)));
  } catch {
    return null;
  }
}
var HomeHostedError = class extends Error {
  constructor(message2, code) {
    super(message2);
    this.code = code;
    this.name = "HomeHostedError";
  }
};
function unknownCommand(result) {
  const text = `${result.stderr}
${result.stdout}
${result.error ?? ""}`;
  return /does not know this command|unknown command:|Unexpected argument/i.test(text);
}
function foreignView(entry, workspace) {
  return { id: entry.id, workspace, status: "unknown", pid: null, url: null, config: entry };
}
var HomeHostedService = class extends Service {
  constructor(ctx, options) {
    super(ctx, "homeHosted");
    this.options = options;
    this.snapshotsFile = path16.join(options.stateDir, "snapshots.json");
  }
  clientCache = null;
  /** The last token this service proved against a panel, so a poll does not re-probe it. */
  tokenProof = null;
  tokenDetail = "";
  /** When a missing managed entry was last put back, so a poll cannot become a write loop. */
  entryRecoveryAt = 0;
  /** When a managed row was last re-pointed at the pinned dsh, for the same reason. */
  commandRepairAt = 0;
  /** The last panel inventory, so a model-step assembly never reads the disk. */
  instanceCache = null;
  snapshotsFile;
  projectDir() {
    return this.options.projectDir ?? process10.cwd();
  }
  /**
   * The workspace this plugin manages. Fixed to the panel's own default: one
   * workspace is what its intent (reconcile, the harness entry, snapshots) is
   * about, and a setting for it bought nothing but a way to write into the wrong
   * one. Every other workspace is still reachable per call.
   */
  managedWorkspace() {
    return DEFAULT_WORKSPACE;
  }
  async resolveDsh(dshHome2, projectDir = this.projectDir()) {
    return await (this.options.resolveDsh ?? ((options) => resolveDshLaunch(options)))({
      dshHome: dshHome2,
      stateDir: this.options.stateDir,
      projectDir
    });
  }
  // -------------------------------------------------------------------------
  // Panels on this machine
  // -------------------------------------------------------------------------
  /**
   * The panel inventory, cached for a short while: the page polls status and
   * the prompt provider reads it at every assembly. `refresh` (or an expired
   * cache) re-reads the disk.
   */
  async instances(refresh = false) {
    if (refresh || this.instanceCache === null || Date.now() - this.instanceCache.at >= INSTANCES_CACHE_MS)
      return this.measureInstances();
    return this.instanceCache.list;
  }
  /**
   * The inventory for a caller that cannot await — a prompt provider runs
   * synchronously before a model step. Discovery is synchronous too, so this
   * re-measures a stale cache in place and never blocks the step.
   */
  instancesNow() {
    if (this.instanceCache !== null && Date.now() - this.instanceCache.at < INSTANCES_CACHE_MS)
      return this.instanceCache.list;
    return this.measureInstances();
  }
  measureInstances() {
    const now = Date.now();
    try {
      this.instanceCache = {
        at: now,
        list: discoverInstances({
          managedHome: this.options.home,
          extraRoots: this.options.instanceRoots,
          envHome: this.options.envHome === void 0 ? process10.env.HHOSTED_HOME ?? null : this.options.envHome,
          homeDir: this.options.homeDir,
          hostingEntryId: this.selfEntryId()
        })
      };
    } catch {
      this.instanceCache = { at: now, list: [] };
    }
    return this.instanceCache.list;
  }
  /** The inventory as last measured, without touching the disk. */
  instancesSnapshot() {
    return this.instanceCache?.list ?? [];
  }
  // -------------------------------------------------------------------------
  // Acting on another panel
  // -------------------------------------------------------------------------
  /**
   * The state root a call targets: the managed one unless it names another panel
   * discovery reported. A caller-supplied path is never acted on directly, so a
   * stray string cannot become a way to write anywhere on the disk.
   */
  async targetHome(requested) {
    if (requested === void 0 || requested === null || requested === "")
      return { home: this.options.home, foreign: false };
    if (typeof requested !== "string")
      throw new HomeHostedError("a panel target must be a state root path", "INSTANCE_INVALID");
    if (requested.trim().length === 0)
      return { home: this.options.home, foreign: false };
    const home = canonicalPath(requested);
    if (home === canonicalPath(this.options.home))
      return { home: this.options.home, foreign: false };
    const instances = await this.instances();
    if (!instances.some((instance) => instance.home === home && !instance.managed))
      throw new HomeHostedError(`"${requested}" is not a home-hosted panel this machine reports`, "INSTANCE_UNKNOWN");
    return { home, foreign: true };
  }
  /**
   * How a call reaches another panel. `via` names it; without one the endpoint's
   * least invasive mechanism is used, which is the order the shared list keeps.
   */
  mechanismFor(endpoint, requested) {
    const allowed = FOREIGN_MECHANISMS[endpoint];
    if (allowed === void 0)
      throw new HomeHostedError(`"${endpoint}" cannot be aimed at another panel`, "INSTANCE_UNSUPPORTED");
    if (requested === void 0 || requested === null)
      return allowed[0];
    if (typeof requested === "string" && allowed.includes(requested))
      return requested;
    throw new HomeHostedError(
      `"${String(requested)}" is not a way to reach another panel for ${endpoint}; use one of ${allowed.join(", ")}`,
      "MECHANISM_UNSUPPORTED"
    );
  }
  /** Whether a token this plugin already holds for a panel still works. */
  async foreignTokenWorks(home) {
    const runtime = readRuntime(home);
    if (runtime === null || runtime.url.length === 0)
      return false;
    const stored = readStoredToken(this.options.stateDir, tokenSlot(home));
    return stored !== null && await verifyToken(runtime.url, stored);
  }
  /**
   * A client for another panel: the plugin's own credential for that state root,
   * minted and enrolled the first time it is needed, proved against the panel,
   * and replaced when the panel no longer accepts it.
   *
   * home-hosted keeps only a hash, so an existing token this plugin does not hold
   * can only be replaced — which is what choosing this mechanism means.
   */
  async foreignClient(home) {
    const runtime = readRuntime(home);
    if (runtime === null || runtime.url.length === 0)
      throw new HomeHostedError(`no panel is running at ${home}, so its API cannot be used`, "PANEL_UNAVAILABLE");
    const slot = tokenSlot(home);
    const exec = async (args, env) => await this.cliExec(args, env);
    const stored = readStoredToken(this.options.stateDir, slot);
    if (stored !== null && await verifyToken(runtime.url, stored))
      return new PanelClient({ baseUrl: runtime.url, token: stored, workspace: this.managedWorkspace() });
    const enrolled = stored !== null || apiTokenEnrolled(home) ? await reclaimToken({ home, stateDir: this.options.stateDir, exec, slot }) : await ensureToken({ home, stateDir: this.options.stateDir, exec, slot });
    if (enrolled.token === null)
      throw new HomeHostedError(enrolled.detail, "TOKEN_UNAVAILABLE");
    return new PanelClient({ baseUrl: runtime.url, token: enrolled.token, workspace: this.managedWorkspace() });
  }
  /**
   * Another panel's own entries. Its managed workspace is not knowable from here,
   * so its default one is read and written.
   */
  readForeignConfig(home, workspace = defaultWorkspace(home)) {
    const read = readConfig(home, workspace);
    if (read.error !== null || read.raw === null)
      throw new HomeHostedError(read.error ?? `no servers config in ${home}`, "CONFIG_UNREADABLE");
    return read.raw;
  }
  /**
   * Every workspace a panel serves, with counts. The running panel answers with
   * live numbers; otherwise the registry plus each workspace's config file is
   * enough to name them and count their entries.
   */
  async workspaceSummaries(home, foreign) {
    const registry = readWorkspaces(home);
    const fromFile = registry.workspaces.map((entry) => ({
      id: entry.id,
      label: entry.label,
      servers: (readConfig(home, entry.id).raw?.servers ?? []).length,
      running: 0,
      source: "file"
    }));
    try {
      const client = foreign ? await this.foreignTokenWorks(home) ? await this.foreignClient(home) : null : await this.tryClient();
      if (client !== null) {
        const live = await client.listWorkspaces();
        return live.map((entry) => ({ id: entry.id, label: entry.label, servers: entry.serverCount, running: entry.runningCount, source: "api" }));
      }
    } catch {
    }
    return fromFile;
  }
  /** Another panel's entries as its config holds them: live status needs its API token. */
  listForeign(home, workspace = defaultWorkspace(home)) {
    return (this.readForeignConfig(home, workspace).servers ?? []).map((entry) => foreignView(entry, workspace));
  }
  /**
   * A workspace's entries read from disk, for when no panel client is available.
   * The page shows them with `status: 'unknown'`, which is the truth: nothing is
   * supervising them from this process's point of view.
   */
  fileServers(home, workspace) {
    const read = readConfig(home, workspace);
    return {
      servers: (read.raw?.servers ?? []).map((entry) => foreignView(entry, workspace)),
      error: read.error
    };
  }
  createForeign(home, entry, workspace = defaultWorkspace(home)) {
    const raw = this.readForeignConfig(home, workspace);
    if (findEntry(raw, entry.id) !== null)
      throw new HomeHostedError(`"${entry.id}" already exists in ${serversFile(home, workspace)}`, "DUPLICATE_SERVER");
    writeConfig(home, upsertEntry(raw, { ...entry, autostart: false }), this.writtenBy(home), workspace);
    const added = this.readForeignConfig(home, workspace);
    writeConfig(home, patchEntry(added, entry.id, { autostart: entry.autostart === true }), this.writtenBy(home), workspace);
    return this.writtenForeignEntry(home, entry.id, workspace);
  }
  updateForeign(home, id, patch, workspace = defaultWorkspace(home)) {
    const raw = this.readForeignConfig(home, workspace);
    if (findEntry(raw, id) === null)
      throw new HomeHostedError(`no server "${id}" exists in ${serversFile(home, workspace)}`, "UNKNOWN_SERVER");
    const next = patchEntry(raw, id, { ...patch, id });
    writeConfig(home, next, this.writtenBy(home), workspace);
    return this.writtenForeignEntry(home, id, workspace);
  }
  /** What a write actually left on disk, never what it was asked to write. */
  writtenForeignEntry(home, id, workspace = defaultWorkspace(home)) {
    const entry = findEntry(this.readForeignConfig(home, workspace), id);
    if (entry === null)
      throw new HomeHostedError(`the write to ${serversFile(home, workspace)} did not take`, "FOREIGN_WRITE_LOST");
    return foreignView(entry, workspace);
  }
  deleteForeign(home, id, workspace = defaultWorkspace(home)) {
    const raw = this.readForeignConfig(home, workspace);
    if (findEntry(raw, id) === null)
      throw new HomeHostedError(`no server "${id}" exists in ${serversFile(home, workspace)}`, "UNKNOWN_SERVER");
    writeConfig(home, removeEntry(raw, id), this.writtenBy(home), workspace);
    return { id, home, via: "file" };
  }
  /**
   * Start, stop or restart one entry through that panel's own CLI: this plugin
   * holds no API token for a panel it does not manage, and a config edit cannot
   * start anything.
   *
   * `restart <id>` is one command from home-hosted 0.7.13, and it is what the UI
   * itself does. The stop-then-start pair it replaces was never equivalent: it is
   * not atomic, and a stop that is not followed by a start left the entry **down**
   * — the failure was reported only after it had already happened. A local panel
   * older than that release is a real scenario, so an unknown-command refusal
   * degrades to the pair, and says so in the result.
   */
  async lifecycleForeign(home, action, id, workspace = defaultWorkspace(home)) {
    const once = async (command) => {
      const result = await this.cliExec([command, id, "--workspace", workspace, "--home", home], { ...process10.env, HHOSTED_HOME: home });
      if (result.code === 0)
        return { unknown: false };
      const output = [result.stderr, result.stdout, result.error].filter((part) => typeof part === "string" && part.trim().length > 0).join("\n").trim();
      const failure = new HomeHostedError(output.length > 0 ? output : `home-hosted ${command} ${id} exited ${String(result.code)}`, "CLI_FAILED");
      if (unknownCommand(result))
        return { unknown: true };
      throw failure;
    };
    if (action !== "restart") {
      await once(action);
      return { home, workspace, id, action, via: "cli" };
    }
    const attempt = await once("restart");
    if (!attempt.unknown)
      return { home, workspace, id, action, via: "cli" };
    await once("stop");
    await once("start");
    return { home, workspace, id, action, via: "cli", downgraded: true };
  }
  // -------------------------------------------------------------------------
  // Facts
  // -------------------------------------------------------------------------
  runtime() {
    return readRuntime(this.options.home);
  }
  /** The entry id this very process was started as, when the panel supervises us. */
  selfEntryId() {
    const id = process10.env.HHOSTED_SERVER_ID;
    return id !== void 0 && id.length > 0 ? id : null;
  }
  /** What the config's `meta.writtenBy` names: the panel release when we can read it. */
  writtenBy(home = this.options.home) {
    return readRuntime(home)?.version ?? "dsh-home-hosted";
  }
  webServer() {
    const service = this.ctx.get("webServer");
    const port = typeof service?.port === "number" ? service.port : null;
    return { port };
  }
  cliCache = null;
  /**
   * Resolve the preferred CLI, refresh the stable launcher a boot entry runs, and
   * preflight that launcher the same way the entry will invoke it.
   */
  async cli() {
    const prefer = this.options.settings.get().cli.prefer;
    if (this.cliCache !== null && this.cliCache.until > Date.now() && this.cliCache.prefer === prefer)
      return this.cliCache;
    const resolution = await resolveCli({ override: this.options.homeHostedCommand, prefer });
    let launcher = null;
    let launcherVersion = null;
    if (resolution.launch !== null) {
      launcher = writeLauncher({
        stateDir: this.options.stateDir,
        dshHome: dshHome(),
        resolvedEntry: resolution.launch.cliEntry ?? resolution.launch.shimPath ?? null,
        resolvedVersion: resolution.status.version,
        pluginRoot: pluginRoot(),
        minVersion: MIN_SUPPORTED_VERSION
      }).path;
      launcherVersion = await preflightLauncher(this.options.stateDir);
    }
    this.cliCache = { prefer, resolution, launcher, launcherVersion, until: Date.now() + 6e4 };
    return this.cliCache;
  }
  async panelControlDeps() {
    const { resolution } = await this.cli();
    const launch = resolution.launch;
    const projectDir = process10.env.HHOSTED_PROJECT ?? this.runtime()?.projectDir ?? null;
    return {
      launch,
      home: this.options.home,
      projectDir,
      stateDir: this.options.stateDir,
      env: launch === null ? {} : homeHostedEnv({ home: this.options.home, projectDir }, launch),
      exec: this.options.execCli
    };
  }
  async cliExec(args, env) {
    if (this.options.execCli !== void 0)
      return await this.options.execCli(args, env);
    const { resolution } = await this.cli();
    const launch = resolution.launch;
    if (launch === null)
      throw new HomeHostedError(resolution.status.detail, "CLI_NOT_FOUND");
    return await run(launch.program, [...launch.args, ...args], { env, timeoutMs: 3e4 });
  }
  // -------------------------------------------------------------------------
  // Panel
  // -------------------------------------------------------------------------
  /** The panel page showing this session's log, where its tokenised URL is. */
  panelLogUrl() {
    const url = this.runtime()?.url;
    if (url === void 0 || url.length === 0)
      return null;
    return `${url.replace(/\/+$/, "")}/w/${encodeURIComponent(this.managedWorkspace())}/logs?server=${encodeURIComponent(this.options.defaultEntryId)}`;
  }
  /**
   * Relocate a pre-0.7 root into `.hh`. `up` does this on its own, but a person
   * looking at a root this plugin cannot write needs the one step that fixes it;
   * `migrate` is the CLI that does exactly that, non-interactively with `--yes`.
   */
  async migrateRoot() {
    if (!isLegacyRoot(this.options.home))
      return { ok: true, detail: `${this.options.home} is already on the .hh layout` };
    const result = await this.cliExec(["migrate", "--yes", "--home", this.options.home], { ...process10.env, HHOSTED_HOME: this.options.home });
    if (result.code !== 0) {
      const output = [result.stderr, result.stdout, result.error].filter((part) => typeof part === "string" && part.trim().length > 0).join("\n").trim();
      return { ok: false, detail: output.length > 0 ? output : `home-hosted migrate exited ${String(result.code)}` };
    }
    return { ok: true, detail: `${this.options.home} was moved to the .hh layout` };
  }
  /** The port the panel's settings hold, without touching a running panel. */
  configuredPort() {
    const control = readGlobalSettings(this.options.home).raw?.control;
    return typeof control?.port === "number" ? control.port : null;
  }
  /** Write the chosen panel port into the state the panel boots from. */
  applyPanelPort() {
    const port = this.options.settings.get().panel.port;
    if (port === null || port === this.configuredPort())
      return;
    setControl(this.options.home, { port }, this.writtenBy());
  }
  /** Whether this exact token was already proved against this exact panel. */
  tokenProven(url, token) {
    return this.tokenProof !== null && this.tokenProof.until > Date.now() && this.tokenProof.url === url && this.tokenProof.token === token;
  }
  proveToken(url, token) {
    this.tokenProof = { url, token, until: Date.now() + 3e4 };
  }
  async panelStatus() {
    const runtime = this.runtime();
    const stored = readStoredToken(this.options.stateDir);
    const enrolledOnDisk = apiTokenEnrolled(this.options.home);
    const reachable = runtime !== null && (pidAlive(runtime.pid) || await probePanel(runtime.url));
    const answered = runtime !== null && await probePanel(runtime.url);
    let token = "unknown";
    let tokenVerified = false;
    if (answered) {
      if (stored === null) {
        token = enrolledOnDisk ? "present" : "absent";
      } else if (this.tokenProven(runtime.url, stored)) {
        token = "enrolled";
        tokenVerified = true;
      } else {
        const probe = await probeToken(runtime.url, stored, TOKEN_PROBE_TIMEOUT_MS);
        if (probe === "ok") {
          token = "enrolled";
          tokenVerified = true;
          this.proveToken(runtime.url, stored);
        } else if (probe === "refused") {
          token = "stale";
          tokenVerified = true;
        }
      }
    }
    const writeVia = token === "enrolled" ? "api" : "file";
    return {
      home: this.options.home,
      reachable: answered,
      configPort: this.configuredPort(),
      url: runtime?.url ?? null,
      version: runtime?.version ?? null,
      pid: runtime?.pid ?? null,
      writeVia,
      token,
      tokenVerified,
      detail: answered ? token === "enrolled" ? this.tokenDetail || "the panel is answering and this plugin holds a token" : token === "stale" ? "the panel refused this plugin's API token, so writes go straight to the workspace config file; regenerate the token" : token === "present" ? "the panel is answering, but home-hosted already holds an API token this plugin does not have" : token === "absent" ? "the panel is answering but no API token is enrolled for it yet; writes go to the workspace config file until one is" : "the panel answered, but the plugin's token could not be checked" : runtime === null ? "no .hh/run.json: the panel is not running, so entries are written straight to the workspace config file" : token === "present" || token === "stale" ? "the panel process is up but does not answer with this plugin's API token, so this page cannot reach it" : "the panel process is alive but is not answering"
    };
  }
  /**
   * Replace the panel's API token with a fresh one and prove it.
   *
   * home-hosted keeps only a hash, so a token this plugin does not hold cannot
   * be recovered: a new token replaces the old hash in one CLI write, and it is
   * proved against the answering panel before being reported.
   *
   * The panel is not required to be *answering*: a missing or refused token is a
   * common reason it cannot be reached at all, and refusing the repair for that
   * reason would leave no way out from the page. Only a panel that was never
   * started is refused — there is nothing to enrol a token against yet.
   */
  async reclaimPanelToken() {
    const runtime = this.runtime();
    if (runtime === null) {
      throw new HomeHostedError(
        "the panel has not been started, so there is nothing to enrol a token against; start it first",
        "PANEL_UNAVAILABLE"
      );
    }
    const answering = await probePanel(runtime.url);
    const result = await reclaimToken({
      home: this.options.home,
      stateDir: this.options.stateDir,
      exec: (args, env) => this.cliExec(args, env)
    });
    this.clientCache = null;
    this.tokenProof = null;
    this.tokenDetail = result.detail;
    if (result.token === null)
      throw new HomeHostedError(result.detail, "TOKEN_RECLAIM_FAILED");
    if (!answering) {
      this.tokenDetail = `${result.detail}; the panel is not answering, so it could not be proved yet`;
      return await this.status();
    }
    const probe = await probeToken(runtime.url, result.token, TOKEN_PROBE_TIMEOUT_MS);
    if (probe !== "ok") {
      throw new HomeHostedError(
        probe === "refused" ? "a fresh token was enrolled, but the panel refused it; check the panel log before trying again" : "a fresh token was enrolled, but the panel stopped answering before it could be verified",
        "TOKEN_RECLAIM_UNVERIFIED"
      );
    }
    this.proveToken(runtime.url, result.token);
    return await this.status();
  }
  async tryClient() {
    if (this.clientCache !== null && this.clientCache.until > Date.now())
      return this.clientCache.client;
    const runtime = this.runtime();
    if (runtime === null || !await probePanel(runtime.url))
      return null;
    const ensured = await ensureToken({
      home: this.options.home,
      stateDir: this.options.stateDir,
      exec: (args, env) => this.cliExec(args, env)
    });
    this.tokenDetail = ensured.detail;
    if (ensured.token === null)
      return null;
    if (!await verifyToken(runtime.url, ensured.token))
      return null;
    const client = new PanelClient({ baseUrl: runtime.url, token: ensured.token, workspace: this.managedWorkspace() });
    this.clientCache = { client, until: Date.now() + 3e4 };
    this.proveToken(runtime.url, ensured.token);
    return client;
  }
  async requireClient() {
    const client = await this.tryClient();
    if (client === null) {
      const status = await this.panelStatus();
      throw new HomeHostedError(status.detail, "PANEL_UNAVAILABLE");
    }
    return client;
  }
  // -------------------------------------------------------------------------
  // Snapshot bookkeeping
  // -------------------------------------------------------------------------
  /**
   * What an adopted entry looked like before this plugin touched it, keyed by id
   * inside the workspace those snapshots belong to. A file from another workspace
   * is ignored: ids repeat across workspaces, and restoring the wrong one would
   * rewrite an entry this plugin never adopted.
   */
  snapshots() {
    const raw = readJson(this.snapshotsFile);
    if (raw === null)
      return {};
    if (raw.version === 2 && isRecord(raw.entries))
      return raw.workspace === this.managedWorkspace() ? raw.entries : {};
    return this.managedWorkspace() === DEFAULT_WORKSPACE ? raw : {};
  }
  saveSnapshots(snapshots) {
    writeJsonAtomic(this.snapshotsFile, { version: 2, workspace: this.managedWorkspace(), entries: snapshots }, 384);
  }
  // -------------------------------------------------------------------------
  // Entries
  // -------------------------------------------------------------------------
  async liveEntries() {
    const map = /* @__PURE__ */ new Map();
    const client = await this.tryClient();
    if (client !== null) {
      try {
        for (const view of await client.listServers())
          map.set(view.id, { view, config: view.config });
        return map;
      } catch {
      }
    }
    const workspace = this.managedWorkspace();
    const read = readConfig(this.options.home, workspace);
    for (const entry of read.raw?.servers ?? [])
      map.set(entry.id, { view: foreignView(entry, workspace), config: entry });
    return map;
  }
  async createEntry(intent, patch) {
    if (intent.id !== this.options.defaultEntryId)
      return null;
    const harnessHome = process10.env.DSH_HOME ?? dshHome();
    const dsh = await this.resolveDsh(harnessHome);
    const { port } = this.webServer();
    const generated = buildDshEntry({
      id: intent.id,
      port,
      profile: detectProfile(process10.argv, process10.env),
      dshHome: harnessHome,
      launch: dsh,
      launcherPath: dsh?.launcherPath ?? null,
      projectDir: this.projectDir()
    });
    return { ...generated, ...patch };
  }
  /**
   * An entry written before the launcher existed still runs a clone's build
   * output directly. Point it at the stable launcher, or the fix would only
   * ever apply to freshly created entries — the plugin never rewrites an
   * existing entry's command.
   */
  async dshCommandRepair(live) {
    if (live === null || !needsLauncherRepair(live))
      return null;
    const harnessHome = process10.env.DSH_HOME ?? dshHome();
    const dsh = await this.resolveDsh(harnessHome);
    const owned = isCreatedEntry(this.snapshots()[live.id]);
    return launcherRepair(live, dsh, { ownedCommand: owned, projectDir: this.projectDir() });
  }
  async writeOwned(intent) {
    const live = (await this.liveEntries()).get(intent.id) ?? null;
    const snapshots = this.snapshots();
    if (snapshots[intent.id] === void 0) {
      snapshots[intent.id] = live === null ? { id: intent.id } : snapshotOwned(live.config);
      this.saveSnapshots(snapshots);
    }
    const patch = ownedPatch(intent, live?.config ?? null);
    const repair = intent.id === this.options.defaultEntryId ? await this.dshCommandRepair(live?.config ?? null) : null;
    const client = await this.tryClient();
    if (client !== null) {
      if (live !== null) {
        await client.updateServer(intent.id, { ...patch, ...repair ?? {} });
        return;
      }
      const entry2 = await this.createEntry(intent, patch);
      if (entry2 === null) {
        throw new HomeHostedError(
          `no server "${intent.id}" exists; create it first, then this plugin can adopt its autostart and conflict policy`,
          "ENTRY_MISSING"
        );
      }
      await client.createServer(entry2);
      return;
    }
    const workspace = this.managedWorkspace();
    const read = readConfig(this.options.home, workspace);
    if (read.error !== null)
      throw new HomeHostedError(read.error, "CONFIG_UNREADABLE");
    let raw = read.raw ?? {};
    if (findEntry(raw, intent.id) !== null) {
      writeConfig(this.options.home, patchEntry(raw, intent.id, { ...patch, ...repair ?? {} }), this.writtenBy(), workspace);
      return;
    }
    const entry = await this.createEntry(intent, patch);
    if (entry === null)
      throw new HomeHostedError(`no server "${intent.id}" exists in ${serversFile(this.options.home, workspace)}`, "ENTRY_MISSING");
    if (await this.panelRunning()) {
      writeConfig(this.options.home, upsertEntry(raw, { ...entry, autostart: false }), this.writtenBy(), workspace);
      raw = readConfig(this.options.home, workspace).raw ?? raw;
      writeConfig(this.options.home, patchEntry(raw, intent.id, { autostart: intent.autostart }), this.writtenBy(), workspace);
      return;
    }
    writeConfig(this.options.home, upsertEntry(raw, entry), this.writtenBy(), workspace);
  }
  async panelRunning() {
    const runtime = this.runtime();
    return runtime !== null && (pidAlive(runtime.pid) || await probePanel(runtime.url));
  }
  /**
   * The refusal a harness-entry mutation gets in Desktop, or null when the
   * surface can manage one. Desktop boots its own reserved profile, so there is
   * nothing for a server entry to start: `dsh --profile desktop` is refused by
   * the CLI, and dsh has no separate Desktop binary — Desktop *is* the web
   * surface, carried in Electron. A row this plugin wrote there could only ever
   * crash-loop. Server management is untouched.
   */
  desktopEntryRefusal() {
    if (this.options.surface !== "desktop")
      return null;
    return new HomeHostedError(
      `the "${this.options.defaultEntryId}" entry is available for dsh web only, and this is the dsh Desktop client. Desktop starts its own profile, so it is never one of the panel's server entries; server management is unaffected.`,
      "DESKTOP_ENTRY_UNSUPPORTED"
    );
  }
  async applyIntents(intents) {
    for (const raw of intents) {
      if (!ENTRY_ID_PATTERN.test(raw.id))
        throw new HomeHostedError(`"${raw.id}" is not a valid server id`, "INVALID_ID");
      if (raw.id === this.options.defaultEntryId) {
        const refusal = this.desktopEntryRefusal();
        if (refusal !== null)
          throw refusal;
      }
      const requested = raw.onPortConflict;
      if (requested !== void 0 && requested !== null && !isOnPortConflict(requested))
        throw new HomeHostedError(
          `"${String(requested)}" is not a port-conflict policy; use one of ${ON_PORT_CONFLICT_POLICIES.join(", ")}`,
          "INVALID_POLICY"
        );
      const fallback = defaultIntent(raw.id);
      const intent = {
        id: raw.id,
        autostart: raw.autostart === true,
        onPortConflict: isOnPortConflict(requested) ? requested : fallback.onPortConflict,
        stopKillPortHolders: raw.stopKillPortHolders ?? fallback.stopKillPortHolders,
        persistent: raw.persistent ?? fallback.persistent
      };
      await this.writeOwned(intent);
      const current = this.options.settings.get();
      const entries = current.entries.filter((entry) => entry.id !== intent.id);
      entries.push(intent);
      this.options.settings.update({
        // The page's toggle reads this flag, so managing the harness has to record
        // itself; restoring or removing that entry clears it again. A paused intent
        // (`autostart: false`) is not management, or the toggle could never go off.
        ...intent.id === this.options.defaultEntryId ? { manageDsh: intent.autostart } : {},
        entries
      });
    }
    return await this.entriesStatus();
  }
  /**
   * Stop managing an entry: restore what it was when we only adopted it, or
   * remove it when this plugin created it. Removing an entry the panel
   * supervises stops that process — which may be this session.
   */
  async removeManagedEntry(id) {
    if (id === this.options.defaultEntryId) {
      const refusal = this.desktopEntryRefusal();
      if (refusal !== null)
        throw refusal;
    }
    const snapshots = this.snapshots();
    const snapshot = snapshots[id];
    const adopted = snapshot !== void 0 && Object.keys(snapshot).some((key) => key !== "id");
    if (adopted)
      return await this.restoreEntry(id);
    if (id === this.selfEntryId())
      return await this.pauseManagedEntry(id);
    const client = await this.tryClient();
    if (client !== null) {
      try {
        await client.deleteServer(id);
      } catch (error) {
        const missing = error instanceof PanelError && (error.status === 404 || error.code === "UNKNOWN_SERVER");
        if (!missing)
          throw error;
      }
    } else {
      const read = readConfig(this.options.home, this.managedWorkspace());
      if (read.error !== null || read.raw === null)
        throw new HomeHostedError(read.error ?? "the config file is unreadable", "CONFIG_UNREADABLE");
      writeConfig(this.options.home, removeEntry(read.raw, id), this.writtenBy(), this.managedWorkspace());
    }
    delete snapshots[id];
    this.saveSnapshots(snapshots);
    const current = this.options.settings.get();
    this.options.settings.update({
      // Only the harness entry drives the page's manage toggle.
      ...id === this.options.defaultEntryId ? { manageDsh: false } : {},
      entries: current.entries.filter((entry) => entry.id !== id)
    });
    return await this.entriesStatus();
  }
  /** Turn off the autostart intent for one entry, keeping the entry itself. */
  async pauseManagedEntry(id) {
    const intent = this.options.settings.intentFor(id);
    await this.applyIntents([{ ...intent, autostart: false }]);
    const current = this.options.settings.get();
    this.options.settings.update({
      ...id === this.options.defaultEntryId ? { manageDsh: false } : {},
      entries: current.entries
    });
    return await this.entriesStatus();
  }
  /**
   * Drive the panel's own UI through its CLI, and report what is installed.
   *
   * `ui-switch --asset` is preferred over a local zip for an official UI: the
   * panel's own CLI picks the release for its version, matches the asset name
   * and downloads it, so nothing here has to reimplement a GitHub lookup or
   * guess which release belongs to the running panel.
   */
  async uiManage(action, options = {}, target) {
    const home = target ?? this.options.home;
    const cli = action === "status" ? null : await this.cli();
    const runUi = async (args) => {
      const launch = cli?.resolution.launch ?? null;
      if (launch === null)
        throw new HomeHostedError(cli?.resolution.status.detail ?? "no home-hosted CLI could be resolved", "CLI_NOT_FOUND");
      const full = [...launch.args, ...args, "--home", home];
      const env = { ...process10.env, HHOSTED_HOME: home };
      const result = this.options.execCli !== void 0 ? await this.options.execCli(full, env) : await run(launch.program, full, { env, timeoutMs: 3e5 });
      const output = [result.error, result.stdout, result.stderr].filter((part) => typeof part === "string" && part.trim().length > 0).join("\n").trim();
      return { code: result.code, output };
    };
    const active = () => {
      const meta = readJson(path16.join(home, ".ui", "ui.json"));
      return meta === null ? null : { name: meta.name ?? null, version: meta.version ?? null, repo: meta.repo ?? null, tag: meta.tag ?? null };
    };
    const releaseFlags = () => [
      ...options.repo === void 0 ? [] : ["--repo", options.repo],
      ...options.tag === void 0 ? [] : ["--tag", options.tag]
    ];
    switch (action) {
      case "status": {
        const ui = active();
        return { ok: true, ui, detail: ui === null ? "the panel is using its stock UI" : `${ui.name ?? "a custom UI"}${ui.version === null ? "" : ` ${ui.version}`}` };
      }
      case "update": {
        const result = await runUi(["ui-update", "--yes", ...releaseFlags()]);
        return { ok: result.code === 0, detail: result.code === 0 ? "the panel UI is up to date" : "the update did not run", ui: active(), output: result.output };
      }
      case "revert": {
        const result = await runUi(["ui-revert"]);
        return { ok: result.code === 0, detail: result.code === 0 ? "back to the stock UI" : "the revert did not run", ui: active(), output: result.output };
      }
      case "switch": {
        const file = options.file?.trim();
        const asset = options.asset?.trim();
        if (file === void 0 || file.length === 0) {
          if (asset === void 0 || asset.length === 0)
            throw new HomeHostedError("switching the UI needs an asset name or a local zip", "UI_SOURCE_REQUIRED");
          const result2 = await runUi(["ui-switch", "--asset", asset, "--yes", ...releaseFlags()]);
          return { ok: result2.code === 0, detail: result2.code === 0 ? `installed the ${asset} UI` : "the switch did not run", ui: active(), output: result2.output };
        }
        if (!fs17.existsSync(file))
          throw new HomeHostedError(`no file at ${file}`, "UI_FILE_MISSING");
        const result = await runUi(["ui-switch", "--file", file, "--yes"]);
        return { ok: result.code === 0, detail: result.code === 0 ? "the UI was replaced" : "the switch did not run", ui: active(), output: result.output };
      }
      default:
        throw new HomeHostedError(`unknown ui action "${String(action)}"`, "UNKNOWN_UI_ACTION");
    }
  }
  async restoreEntry(id) {
    if (id === this.options.defaultEntryId) {
      const refusal = this.desktopEntryRefusal();
      if (refusal !== null)
        throw refusal;
    }
    const live = (await this.liveEntries()).get(id) ?? null;
    if (live === null)
      throw new HomeHostedError(`no server "${id}" exists`, "ENTRY_MISSING");
    const snapshots = this.snapshots();
    if (snapshots[id] === void 0)
      throw new HomeHostedError(`"${id}" was never adopted by this plugin, so there is nothing to restore; adopt it first`, "NOT_ADOPTED");
    const patch = restorePatch(live.config, snapshots[id] ?? null);
    const client = await this.tryClient();
    if (client !== null)
      await client.updateServer(id, patch);
    else {
      const read = readConfig(this.options.home, this.managedWorkspace());
      if (read.error !== null || read.raw === null)
        throw new HomeHostedError(read.error ?? "the config file is unreadable", "CONFIG_UNREADABLE");
      writeConfig(this.options.home, patchEntry(read.raw, id, patch), this.writtenBy(), this.managedWorkspace());
    }
    delete snapshots[id];
    this.saveSnapshots(snapshots);
    const current = this.options.settings.get();
    this.options.settings.update({
      ...id === this.options.defaultEntryId ? { manageDsh: false } : {},
      entries: current.entries.filter((entry) => entry.id !== id)
    });
    return await this.entriesStatus();
  }
  async entriesStatus() {
    const settings = this.options.settings.get();
    const live = await this.liveEntries();
    const snapshots = this.snapshots();
    const ids = /* @__PURE__ */ new Set([this.options.defaultEntryId, ...settings.entries.map((entry) => entry.id)]);
    return [...ids].map((id) => {
      const intent = this.options.settings.intentFor(id);
      const entry = live.get(id) ?? null;
      return {
        intent,
        exists: entry !== null,
        managed: snapshots[id] !== void 0,
        drift: entry === null ? ["missing entry"] : ownedDrift(entry.config, intent),
        live: entry?.view ?? null,
        snapshot: snapshots[id] ?? null
      };
    });
  }
  // -------------------------------------------------------------------------
  // Boot autostart
  // -------------------------------------------------------------------------
  /**
   * Everything account resolution reads.
   *
   * The state paths matter: they name the person the panel belongs to, so a root
   * process launched at boot (a system unit that names no `User=`) can still be
   * told whose panel it is running.
   */
  /** This process's environment, from the test seam when one is supplied. */
  processEnv() {
    return this.options.env ?? process10.env;
  }
  accountFacts() {
    return {
      env: this.processEnv(),
      uid: this.options.uid,
      ownerPaths: [this.options.home, this.options.stateDir],
      passwd: this.options.passwd
    };
  }
  /**
   * The ladder resolves the account per provider, and the spec below resolves it
   * for the entry's environment. Both are handed the *same* facts, so the `User=`
   * line and the `HOME=` line can never describe two different people.
   */
  ladder() {
    if (this.options.createLadder !== void 0)
      return this.options.createLadder();
    return createBootLadder(this.accountFacts());
  }
  async bootSpec() {
    const { resolution, launcher } = await this.cli();
    const launch = resolution.launch;
    if (launch === null)
      return null;
    const runtime = this.runtime();
    const account = accountOf(this.accountFacts());
    const spec = buildHomeHostedBootSpec(
      {
        home: this.options.home,
        projectDir: process10.env.HHOSTED_PROJECT ?? runtime?.projectDir ?? null,
        version: runtime?.version ?? null
      },
      launch,
      {
        stateDir: this.options.stateDir,
        unitName: bootUnitName(this.options.stateDir),
        // `undefined` when no account was resolved: the entry then runs as this
        // process (or as root), and this process's own HOME is the right one. A
        // spec that merely repeats this environment stays byte-identical, so
        // reconcile does not rewrite the entry on every start.
        accountHome: account === null ? void 0 : account.home,
        env: this.processEnv()
      }
    );
    if (launcher !== null) {
      const cliArgs2 = spec.args.slice(launch.args.length);
      if (process10.platform === "win32") {
        spec.command = process10.execPath;
        spec.args = [launcher, ...cliArgs2];
      } else {
        spec.command = launcher;
        spec.args = cliArgs2;
      }
    }
    return spec;
  }
  async bootStatus(mechanism) {
    const platform = process10.platform === "linux" ? "linux" : process10.platform === "darwin" ? "darwin" : process10.platform === "win32" ? "win32" : "other";
    const spec = await this.bootSpec();
    if (spec === null) {
      return {
        platform,
        mechanism: null,
        recommended: null,
        state: "unsupported",
        bootCapable: false,
        privileged: false,
        unitPath: null,
        commands: [],
        detail: "no home-hosted CLI is available, so no boot entry can be generated; install the plugin with its dependencies",
        candidates: []
      };
    }
    const settings = this.options.settings.get();
    const requested = mechanism ?? (settings.autostart.mechanism === "auto" ? void 0 : settings.autostart.mechanism);
    return await this.ladder().status(spec, requested);
  }
  async installBoot(mechanism) {
    const spec = await this.bootSpec();
    if (spec === null)
      throw new HomeHostedError((await this.cli()).resolution.status.detail, "CLI_NOT_FOUND");
    const panel = await this.panelStatus();
    const before = await this.bootStatus(mechanism);
    const result = await this.ladder().install(spec, mechanism);
    if (result.ok)
      await this.retireLegacyBootEntry(spec, mechanism);
    const installed = mechanism ?? result.mechanism ?? null;
    const handover = result.ok ? await this.bootHandoverPlan(spec, installed ?? void 0, panel, before.mechanism) : { detail: null, commands: [], stateDir: null, plan: null, display: [] };
    const detail = [result.detail, handover.detail].filter((line) => line !== null).join("; ");
    const commands = [...result.commands, ...handover.commands];
    const current = this.options.settings.get().autostart;
    this.options.settings.update({
      autostart: {
        // The preference follows the outcome for a real install, and the last
        // attempt is recorded either way so a failure is visible after a reload.
        enabled: result.ok ? true : current.enabled,
        mechanism: result.ok ? mechanism ?? result.mechanism ?? current.mechanism : current.mechanism,
        lastAttempt: {
          ok: result.ok,
          action: "install",
          mechanism: result.mechanism ?? mechanism ?? null,
          detail,
          commands,
          at: Date.now()
        }
      }
    });
    if (handover.plan !== null && handover.stateDir !== null) {
      const spawned = (this.options.spawnActivation ?? spawnActivation)(handover.stateDir, handover.plan);
      this.clientCache = null;
      this.tokenProof = null;
      return {
        result: {
          ...result,
          detail: `${detail}; ${spawned.detail}`,
          // A helper that never started leaves the panel up, so a person needs the
          // exact steps to do it by hand.
          commands: spawned.ok ? commands : [...commands, ...handover.display]
        },
        status: await this.bootStatus(mechanism)
      };
    }
    return {
      result: { ...result, detail, commands },
      status: await this.bootStatus(mechanism)
    };
  }
  /**
   * The hand-over this install needs, if any: the plan for a detached helper, or
   * just the note explaining why the panel is being left alone.
   *
   * An install alone proves nothing: the panel the plugin drove keeps running, so
   * nothing shows whether the entry would ever start one. Starting it is the only
   * way to know. Nothing is spawned here — the caller persists the intent first,
   * because the helper stops the panel and this process may not outlive it.
   *
   * When the mechanism cannot start anything (a `Run` value, a `.desktop` file the
   * session reads at login), nothing is stopped: leaving a working panel up beats
   * killing it for an entry that would not bring it back.
   */
  async bootHandoverPlan(spec, mechanism, panel, previousMechanism) {
    const activation = await this.ladder().activate(spec, mechanism, previousMechanism);
    if (activation === null) {
      return {
        detail: panel.reachable ? `${mechanism ?? "this mechanism"} cannot start the panel itself, so it was left running rather than stopped with nothing to bring it back` : null,
        commands: [],
        stateDir: null,
        plan: null,
        display: []
      };
    }
    if (!panel.reachable) {
      return {
        detail: "no panel is answering, so the entry was not started now; it starts the panel at boot or login",
        commands: [],
        stateDir: null,
        plan: null,
        display: []
      };
    }
    if (previousMechanism !== null && previousMechanism === mechanism) {
      return {
        detail: `the panel is already running under ${mechanism}, so it was left alone`,
        commands: [],
        stateDir: null,
        plan: null,
        display: []
      };
    }
    const deps = await this.panelControlDeps();
    if (deps.launch === null)
      throw new HomeHostedError((await this.cli()).resolution.status.detail, "CLI_NOT_FOUND");
    const retire = activation.retired.length > 0 ? `; retiring ${activation.retired.join(", ")}` : "";
    return {
      detail: `handing the panel to ${mechanism ?? "the entry"} now; this page disconnects and comes back when it answers${retire}`,
      commands: [],
      stateDir: deps.stateDir,
      display: [...activation.display, ...activation.retireDisplay],
      plan: {
        commands: activation.commands,
        requires: activation.requires.commands,
        files: activation.requires.files,
        // The CLI's own `down`, never the mechanism's `restart`: home-hosted
        // refuses to start a second panel while `run.json` names a live pid, so
        // the old one has to be gone first or the entry just fails while the
        // orphan keeps the port.
        stop: [...deps.launch.args, "down", "--home", deps.home],
        detach: activation.stop,
        oldPid: panel.pid,
        retire: activation.retire,
        logPath: activationLogPath(deps.stateDir)
      }
    };
  }
  async uninstallBoot(mechanism) {
    const spec = await this.bootSpec();
    if (spec === null)
      throw new HomeHostedError((await this.cli()).resolution.status.detail, "CLI_NOT_FOUND");
    const result = await this.ladder().uninstall(spec, mechanism);
    if (result.ok)
      await this.retireLegacyBootEntry(spec, mechanism);
    const current = this.options.settings.get().autostart;
    this.options.settings.update({
      autostart: {
        ...current,
        enabled: result.ok ? false : current.enabled,
        lastAttempt: {
          ok: result.ok,
          action: "uninstall",
          mechanism: result.mechanism ?? mechanism ?? null,
          detail: result.detail,
          commands: result.commands,
          at: Date.now()
        }
      }
    });
    return { result, status: await this.bootStatus(mechanism) };
  }
  /**
   * Remove the pre-per-instance artifact once this state root has its own.
   *
   * An install that used to write `home-hosted` now writes `home-hosted-<hash>`,
   * and a machine left with both would autostart the panel twice — or keep
   * starting it from an entry the page no longer reports. Only an artifact
   * carrying this plugin's marker is touched, so somebody else's unit survives.
   */
  async retireLegacyBootEntry(spec, mechanism) {
    if (spec.unitName === LEGACY_BOOT_UNIT_NAME)
      return;
    const legacy = { ...spec, unitName: LEGACY_BOOT_UNIT_NAME };
    try {
      const status = await this.ladder().status(legacy, mechanism);
      if (status.unitPath === null || status.state === "not-installed" || status.state === "unsupported")
        return;
      if (path16.isAbsolute(status.unitPath) && !fs17.existsSync(status.unitPath))
        return;
      await this.ladder().uninstall(legacy, status.mechanism ?? mechanism);
    } catch {
    }
  }
  // -------------------------------------------------------------------------
  // Panel lifecycle
  // -------------------------------------------------------------------------
  /** Out-of-the-box start: run the preferred CLI's `up`, which detaches itself. */
  async startPanelNow() {
    const { resolution } = await this.cli();
    const deps = await this.panelControlDeps();
    if (deps.launch === null)
      throw new HomeHostedError(resolution.status.detail, "CLI_NOT_FOUND");
    const runtime = this.runtime();
    if (runtime !== null && await probePanel(runtime.url)) {
      return { ok: true, detail: "a panel is already answering", url: runtime.url, version: runtime.version };
    }
    this.applyPanelPort();
    const result = await startPanel(deps);
    this.clientCache = null;
    return result;
  }
  /**
   * Stop the panel the plugin drives, and every server it supervises with it.
   *
   * Deliberately not a replacement for the takeover guard: stopping is safe to
   * lose (an `autostart` entry comes back), while replacing is not. If this
   * process is one of those servers the answer may never arrive, so the page
   * treats a dropped call as "the panel is stopping" rather than a failure.
   */
  async stopPanelNow() {
    const { resolution } = await this.cli();
    const runtime = this.runtime();
    if (runtime === null || !await probePanel(runtime.url)) {
      return { ok: true, detail: "no panel is answering, so there was nothing to stop" };
    }
    const deps = await this.panelControlDeps();
    if (deps.launch === null)
      throw new HomeHostedError(resolution.status.detail, "CLI_NOT_FOUND");
    const result = await stopPanel(deps);
    this.clientCache = null;
    this.tokenProof = null;
    return result;
  }
  /**
   * Replace an answering panel with the preferred copy.
   *
   * That stops the servers the old panel supervises — this process included — so
   * the work is handed to a detached helper and the guard demands that this
   * session is an adopted, autostarting entry the new panel will bring back.
   */
  async takeoverPanel(force = false) {
    const { resolution } = await this.cli();
    const deps = await this.panelControlDeps();
    if (deps.launch === null)
      throw new HomeHostedError(resolution.status.detail, "CLI_NOT_FOUND");
    const runtime = this.runtime();
    if (runtime === null || !await probePanel(runtime.url))
      return await this.startPanelNow();
    if (runtime.version !== null && resolution.status.version !== null && runtime.version === resolution.status.version) {
      return { ok: true, detail: `the answering panel is already ${runtime.version}`, url: runtime.url, version: runtime.version };
    }
    if (!force) {
      const id = this.selfEntryId();
      const live = id === null ? null : (await this.liveEntries()).get(id) ?? null;
      if (id === null || live === null || live.config.autostart !== true) {
        throw new HomeHostedError(
          "replacing the panel stops every server it supervises, including this session, and nothing would start it again: adopt this entry with autostart first, or pass force",
          "TAKEOVER_UNSAFE"
        );
      }
    }
    return spawnTakeover(deps, runtime.pid);
  }
  /** Install the pinned range globally, so the `global` preference has a copy to run. */
  async installGlobalCli() {
    const result = await installGlobal(EXPECTED_RANGE);
    this.cliCache = null;
    return { ok: result.ok, detail: result.detail, output: result.output };
  }
  /** Re-assert an entry that is already installed: a node or CLI upgrade moves the
   * paths a unit was written with, and the fix is to rewrite it.
   *
   * Never installs one that is not there. Installing is a deliberate act — it can
   * need root and it makes this machine start something at boot — so it happens on
   * an explicit click or an approved tool call, not as a side effect of startup.
   */
  async reconcile() {
    if (this.options.surface === "desktop") {
      await this.repairBootEntry();
      await this.migrateBootEntryName();
      return;
    }
    await this.ensureManagedEntry();
    await this.repairManagedCommand();
    await this.repairBootEntry();
    await this.migrateBootEntryName();
  }
  /**
   * An upgrade from a release that named every artifact `home-hosted` leaves
   * that one behind while this state root now writes its own name. Once our own
   * artifact is in place, the old one is retired — otherwise the machine
   * autostarts the panel twice, or from an entry the page no longer reports.
   */
  async migrateBootEntryName() {
    if (!this.options.settings.get().autostart.enabled)
      return;
    const spec = await this.bootSpec();
    if (spec === null || spec.unitName === LEGACY_BOOT_UNIT_NAME)
      return;
    try {
      const own = await this.bootStatus();
      if (own.state !== "enabled-running" && own.state !== "enabled-failing" && own.state !== "installed-disabled")
        return;
      await this.retireLegacyBootEntry(spec, own.mechanism ?? void 0);
    } catch {
    }
  }
  /**
   * Put back a managed entry that no longer exists, while its intent still wants
   * autostart. A paused intent is a deliberate stop and is left alone.
   *
   * Called from startup `reconcile()` as well as the status read, because a person
   * who deletes the entry from the panel is looking at the page right then — not
   * at the next plugin start. A failed attempt is not repeated for a while, so a
   * config that cannot be written does not turn every poll into a write.
   */
  async ensureManagedEntry() {
    const { settings } = this.options;
    const id = this.options.defaultEntryId;
    if (this.options.surface === "desktop")
      return;
    if (!settings.get().manageDsh || !settings.intentFor(id).autostart)
      return;
    const now = Date.now();
    if (now - this.entryRecoveryAt < ENTRY_RECOVERY_INTERVAL_MS)
      return;
    this.entryRecoveryAt = now;
    if ((await this.entriesStatus()).every((entry) => entry.intent.id !== id || entry.exists))
      return;
    try {
      await this.writeOwned({ ...settings.intentFor(id), autostart: true });
    } catch {
    }
  }
  /**
   * Re-point a managed `dsh` row that runs the wrong dsh.
   *
   * A row created before the launcher existed, or by an older release that took
   * whatever PATH answered, keeps starting that copy — and no click would fix
   * it, because the plugin only writes the row when the toggle is applied. So
   * the drift is repaired where the entry's existence is already checked, under
   * the same throttle, and only for a row this plugin owns.
   */
  async repairManagedCommand() {
    const id = this.options.defaultEntryId;
    if (this.options.surface === "desktop")
      return;
    if (!this.options.settings.get().manageDsh || !this.options.settings.intentFor(id).autostart)
      return;
    const now = Date.now();
    if (now - this.commandRepairAt < ENTRY_RECOVERY_INTERVAL_MS)
      return;
    const live = (await this.liveEntries()).get(id)?.config ?? null;
    if (live === null || this.snapshots()[id] === void 0 || !needsLauncherRepair(live))
      return;
    const repair = await this.dshCommandRepair(live);
    if (repair === null)
      return;
    this.commandRepairAt = now;
    try {
      await this.writeOwned({ ...this.options.settings.intentFor(id), autostart: true });
    } catch {
    }
  }
  /** Re-assert the boot entry when the OS still has it but it stopped working. */
  async repairBootEntry() {
    if (!this.options.settings.get().autostart.enabled)
      return;
    const status = await this.bootStatus();
    if (status.state !== "enabled-failing" && status.state !== "installed-disabled")
      return;
    const fileBacked = status.mechanism === "systemd-user" || status.mechanism === "systemd-system" || status.mechanism === "xdg-autostart" || status.mechanism === "launchd-agent" || status.mechanism === "launchd-daemon";
    if (fileBacked && (status.unitPath === null || !fs17.existsSync(status.unitPath)))
      return;
    try {
      await this.installBoot();
    } catch {
    }
  }
  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------
  async status(refresh = false) {
    let client = null;
    let clientError = null;
    try {
      client = await this.tryClient();
    } catch (error) {
      clientError = error instanceof Error ? error.message : String(error);
    }
    const panel = await this.panelStatus();
    const { resolution, launcher, launcherVersion } = await this.cli();
    const cliDetail = resolution.status.detail;
    const panelVersion = this.runtime()?.version ?? null;
    const cli = {
      ...resolution.status,
      launcherPath: launcher,
      launcherVersion,
      // A panel left running from an older install is the usual reason to see
      // two versions on this page; say so instead of leaving it ambiguous.
      detail: panelVersion !== null && resolution.status.version !== null && panelVersion !== resolution.status.version ? `${cliDetail}; the running panel is ${panelVersion}` : cliDetail
    };
    let servers = [];
    let lastError = null;
    if (client !== null) {
      try {
        servers = await client.listServers(this.managedWorkspace());
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    } else {
      if (panel.reachable)
        lastError = clientError ?? panel.detail;
      const read = this.fileServers(this.options.home, this.managedWorkspace());
      servers = read.servers;
      if (read.error !== null)
        lastError ??= read.error;
    }
    return {
      defaultEntryId: this.options.defaultEntryId,
      surface: this.options.surface ?? "web",
      workspace: this.managedWorkspace(),
      workspaces: await this.workspaceSummaries(this.options.home, false).catch(() => []),
      legacyRoot: isLegacyRoot(this.options.home),
      panel,
      panelRoot: this.options.home,
      panelRootSource: this.options.panelHomeSource ?? "instance",
      bootUnitName: bootUnitName(this.options.stateDir),
      instances: await this.instances(refresh),
      boot: await this.bootStatus(),
      // A deleted managed entry is put back here as well as at startup: whoever
      // deleted it is looking at the page that reports it missing.
      entries: await this.ensureManagedEntry().then(async () => await this.repairManagedCommand()).then(async () => await this.entriesStatus()),
      servers,
      settings: this.options.settings.get(),
      cli,
      lastError
    };
  }
  // -------------------------------------------------------------------------
  // Endpoint dispatch
  // -------------------------------------------------------------------------
  /**
   * Which workspace an endpoint call acts on. A caller may name any workspace the
   * panel serves; omitted means the one this plugin manages, which for another
   * panel is its default.
   */
  callWorkspace(input, home, foreign) {
    const named = typeof input.workspace === "string" ? input.workspace.trim() : "";
    if (named.length > 0) {
      if (!isWorkspaceId(named))
        throw new HomeHostedError(`"${named}" is not a workspace id (expected ^[a-z0-9][a-z0-9_-]*$)`, "INVALID_WORKSPACE");
      return named;
    }
    return foreign ? defaultWorkspace(home) : this.managedWorkspace();
  }
  async call(endpoint, payload) {
    const input = payload ?? {};
    if (typeof input.home === "string" && input.home.trim().length > 0 && FOREIGN_MECHANISMS[endpoint] === void 0) {
      throw new HomeHostedError(
        `"${endpoint}" is about the panel this plugin manages and cannot be aimed at another one`,
        "INSTANCE_UNSUPPORTED"
      );
    }
    switch (endpoint) {
      case "status":
        return await this.status(input.refresh === true);
      case "settings.update": {
        const patch = input.patch ?? {};
        this.options.settings.update(patch);
        return await this.status();
      }
      case "panel.migrate":
        return await this.migrateRoot();
      case "workspaces.list": {
        const target = await this.targetHome(input.home);
        return await this.workspaceSummaries(target.home, target.foreign);
      }
      case "servers.list": {
        const target = await this.targetHome(input.home);
        const workspace = this.callWorkspace(input, target.home, target.foreign);
        if (!target.foreign) {
          const client = await this.tryClient();
          return client === null ? this.fileServers(target.home, workspace).servers : await client.listServers(workspace);
        }
        const via = this.mechanismFor("servers.list", input.via);
        if (via === "api" || input.via === void 0 && await this.foreignTokenWorks(target.home))
          return await (await this.foreignClient(target.home)).listServers(workspace);
        return this.listForeign(target.home, workspace);
      }
      case "servers.get":
        return await (await this.requireClient()).getServer(String(input.id), this.callWorkspace(input, this.options.home, false));
      case "servers.create": {
        const entry = input.entry;
        if (typeof entry?.id !== "string" || !ENTRY_ID_PATTERN.test(entry.id))
          throw new HomeHostedError("a server entry needs an id matching ^[a-z0-9][a-z0-9_-]*$", "INVALID_ID");
        const target = await this.targetHome(input.home);
        const workspace = this.callWorkspace(input, target.home, target.foreign);
        if (!target.foreign)
          return await (await this.requireClient()).createServer(entry, workspace);
        return this.mechanismFor("servers.create", input.via) === "api" ? await (await this.foreignClient(target.home)).createServer(entry, workspace) : this.createForeign(target.home, entry, workspace);
      }
      case "servers.update": {
        const target = await this.targetHome(input.home);
        const id = String(input.id);
        const patch = input.patch ?? {};
        for (const key of ["restart", "health", "stop"]) {
          if (patch[key] === null)
            throw new HomeHostedError(`${key} must be an object (was null)`, "INVALID_PATCH");
        }
        const workspace = this.callWorkspace(input, target.home, target.foreign);
        if (!target.foreign)
          return await (await this.requireClient()).updateServer(id, patch, workspace);
        return this.mechanismFor("servers.update", input.via) === "api" ? await (await this.foreignClient(target.home)).updateServer(id, patch, workspace) : this.updateForeign(target.home, id, patch, workspace);
      }
      case "servers.delete": {
        const id = String(input.id);
        const target = await this.targetHome(input.home);
        const workspace = this.callWorkspace(input, target.home, target.foreign);
        if (target.foreign) {
          return this.mechanismFor("servers.delete", input.via) === "api" ? await (await this.foreignClient(target.home)).deleteServer(id, workspace).then(() => ({ id, workspace, home: target.home, via: "api" })) : this.deleteForeign(target.home, id, workspace);
        }
        if (id === this.selfEntryId()) {
          throw new HomeHostedError(
            `"${id}" is the entry this very process runs as, and deleting it stops this session; pause it (autostart off) or restore it instead`,
            "SELF_ENTRY"
          );
        }
        await (await this.requireClient()).deleteServer(id, workspace);
        return { id, workspace };
      }
      case "servers.start": {
        const target = await this.targetHome(input.home);
        const id = String(input.id);
        const workspace = this.callWorkspace(input, target.home, target.foreign);
        if (target.foreign) {
          if (this.mechanismFor("servers.start", input.via) === "api") {
            await (await this.foreignClient(target.home)).startServer(id, workspace);
            return { home: target.home, workspace, id, action: "start", via: "api" };
          }
          return await this.lifecycleForeign(target.home, "start", id, workspace);
        }
        await (await this.requireClient()).startServer(id, workspace);
        return await this.entriesStatus();
      }
      case "servers.stop": {
        const target = await this.targetHome(input.home);
        const id = String(input.id);
        const workspace = this.callWorkspace(input, target.home, target.foreign);
        if (target.foreign) {
          if (this.mechanismFor("servers.stop", input.via) === "api") {
            await (await this.foreignClient(target.home)).stopServer(id, workspace);
            return { home: target.home, workspace, id, action: "stop", via: "api" };
          }
          return await this.lifecycleForeign(target.home, "stop", id, workspace);
        }
        await (await this.requireClient()).stopServer(id, workspace);
        return await this.entriesStatus();
      }
      case "servers.restart": {
        const target = await this.targetHome(input.home);
        const id = String(input.id);
        const workspace = this.callWorkspace(input, target.home, target.foreign);
        if (target.foreign) {
          if (this.mechanismFor("servers.restart", input.via) === "api") {
            await (await this.foreignClient(target.home)).restartServer(id, workspace);
            return { home: target.home, workspace, id, action: "restart", via: "api" };
          }
          return await this.lifecycleForeign(target.home, "restart", id, workspace);
        }
        await (await this.requireClient()).restartServer(id, workspace);
        return await this.entriesStatus();
      }
      case "servers.freePort":
        return await (await this.requireClient()).freePort(String(input.id), this.callWorkspace(input, this.options.home, false));
      case "entries.apply": {
        const intents = Array.isArray(input.intents) ? input.intents : [];
        return await this.applyIntents(intents);
      }
      case "entries.remove":
        return await this.removeManagedEntry(String(input.id));
      case "entries.restore":
        return await this.restoreEntry(String(input.id));
      case "ui.manage": {
        const target = await this.targetHome(input.home);
        if (target.foreign)
          this.mechanismFor("ui.manage", input.via);
        return await this.uiManage(
          input.action,
          {
            file: typeof input.file === "string" ? input.file : void 0,
            asset: typeof input.asset === "string" ? input.asset : void 0,
            repo: typeof input.repo === "string" ? input.repo : void 0,
            tag: typeof input.tag === "string" ? input.tag : void 0
          },
          target.foreign ? target.home : void 0
        );
      }
      case "boot.install":
        return await this.installBoot(input.mechanism);
      case "boot.uninstall":
        return await this.uninstallBoot(input.mechanism);
      case "boot.verify":
        return await this.bootStatus();
      case "panel.start":
        return await this.startPanelNow();
      case "panel.stop":
        return await this.stopPanelNow();
      case "panel.takeover":
        return await this.takeoverPanel(input.force === true);
      case "panel.reclaimToken":
        return await this.reclaimPanelToken();
      /**
       * The panel's console, read from disk: no session, no API token, and no
       * dependence on the panel answering. This is the diagnostic that still works
       * in the case it exists for — a panel that is up but misbehaving.
       */
      case "panel.console": {
        const requested = typeof input.lines === "number" ? input.lines : Number.NaN;
        const lines = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 0), CONSOLE_MAX_LINES) : CONSOLE_DEFAULT_LINES;
        return readPanelConsole(this.options.home, { lines });
      }
      case "cli.installGlobal":
        return await this.installGlobalCli();
      default:
        throw new HomeHostedError(`unknown endpoint "${String(endpoint)}"`, "UNKNOWN_ENDPOINT");
    }
  }
};

// src/rpc.ts
function answer(endpoint, result) {
  return Response.json({ v: RPC_VERSION, endpoint, result });
}
function registerRpc(ctx, service) {
  ctx.inject(["connection"], (scoped) => {
    const connection = scoped.connection;
    if (connection?.fetch?.register === void 0)
      return;
    scoped.effect(() => {
      let dispose;
      try {
        dispose = connection.fetch.register({
          // The exact-route registry is keyed by the full request path, so the
          // `/api` prefix belongs here; the page composes the same URL from
          // API_BASE + RPC_PATH.
          path: `/api${RPC_PATH}`,
          methods: ["POST"],
          requestBody: "buffered",
          fetch: async (request) => {
            let body;
            try {
              body = await request.json();
            } catch {
              return Response.json({ error: "the request body is not JSON" }, { status: 400 });
            }
            if (body === null || typeof body !== "object" || body.v !== RPC_VERSION) {
              return Response.json(
                { error: `this page and the host disagree on the protocol version (expected ${String(RPC_VERSION)})` },
                { status: 409 }
              );
            }
            try {
              const value = await service.call(body.endpoint, body.payload);
              return answer(body.endpoint, { ok: true, value });
            } catch (error) {
              const code = error instanceof HomeHostedError ? error.code : "INTERNAL";
              const message2 = error instanceof Error ? error.message : String(error);
              const detail = error?.detail;
              return answer(body.endpoint, { ok: false, error: { code, message: message2, ...detail === void 0 ? {} : { detail } } });
            }
          }
        });
      } catch (error) {
        const logger = scoped.logger;
        logger?.warn?.(`[dsh-home-hosted] could not register ${RPC_PATH}: ${error instanceof Error ? error.message : String(error)}`);
        return () => {
        };
      }
      return () => {
        void Promise.resolve(dispose()).catch(() => {
        });
      };
    }, "dsh-home-hosted: rpc route");
  });
}

// src/home-hosted/instances-notice.ts
var INSTANCES_CONTEXT_ORDER = 130;
function instancesContextText(instances, enabled) {
  return enabled ? instancesNoticeText(instances) ?? "" : "";
}
function registerInstancesNotice(ctx, deps) {
  ctx.inject(["systemPrompt"], (scoped) => {
    const prompt = scoped.systemPrompt;
    if (typeof prompt?.context !== "function")
      return;
    scoped.effect(() => prompt.context({
      name: "dsh-home-hosted:instances",
      order: INSTANCES_CONTEXT_ORDER,
      text: () => instancesContextText(deps.instances(), deps.enabled())
    }), "dsh-home-hosted: instance notice");
  });
}

// src/home-hosted/web-notice.ts
var STOCK_UNAUTHORIZED = "dsh web authentication required; reopen the URL printed by dsh web.";
function authNoticeBody(logUrl) {
  if (logUrl === null)
    return `${STOCK_UNAUTHORIZED}
`;
  return `${STOCK_UNAUTHORIZED}
home-hosted: the URL with its token is in the dsh log at ${logUrl}. An authentication plugin can sign you in seamlessly instead.
`;
}
function wrap(auth, logUrlOf) {
  const original = auth.writeUnauthorized.bind(auth);
  auth.writeUnauthorized = (req, res) => {
    const response = res;
    const end = response.end;
    if (typeof end !== "function" || response.writableEnded === true) {
      original(req, res);
      return;
    }
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      try {
        response.end = end;
      } catch {
      }
    };
    try {
      response.end = (...args) => {
        restore();
        const [chunk, ...rest] = args;
        let body = chunk;
        if (typeof chunk === "string" && chunk.trim() === STOCK_UNAUTHORIZED) {
          try {
            body = authNoticeBody(logUrlOf());
          } catch {
            body = chunk;
          }
        }
        return end.call(response, body, ...rest);
      };
    } catch {
      original(req, res);
      return;
    }
    try {
      response.once?.("finish", restore);
      response.once?.("close", restore);
    } catch {
    }
    original(req, res);
  };
  return () => {
    auth.writeUnauthorized = original;
  };
}
function registerAuthNotice(ctx, logUrlOf) {
  ctx.inject(["connection"], (scoped) => {
    scoped.effect(() => {
      const connection = scoped.get("connection");
      const auth = connection?.browserAuth;
      if (typeof auth?.writeUnauthorized !== "function")
        return () => {
        };
      return wrap(auth, logUrlOf);
    }, "dsh-home-hosted: sign-in notice");
  });
}

// src/settings.ts
function knownTool(value) {
  return typeof value === "string" && AGENT_TOOL_NAMES.includes(value);
}
function normalizeIntent(value, fallbackId) {
  const base = defaultIntent(typeof value?.id === "string" && value.id.length > 0 ? value.id : fallbackId);
  return {
    id: base.id,
    autostart: typeof value?.autostart === "boolean" ? value.autostart : base.autostart,
    // Absent means a stored intent from before persistence existed: it wants it.
    persistent: typeof value?.persistent === "boolean" ? value.persistent : base.persistent,
    // Only a policy the panel's own schema parses may reach the config it boots from.
    onPortConflict: isOnPortConflict(value?.onPortConflict) ? value.onPortConflict : base.onPortConflict,
    stopKillPortHolders: typeof value?.stopKillPortHolders === "boolean" ? value.stopKillPortHolders : base.stopKillPortHolders
  };
}
var LEGACY_TOOL_NAMES = {
  servers_start: "servers_lifecycle",
  servers_stop: "servers_lifecycle",
  servers_restart: "servers_lifecycle",
  servers_create: "servers_edit",
  servers_update: "servers_edit",
  servers_delete: "servers_edit",
  autostart_install: "autostart_manage",
  autostart_uninstall: "autostart_manage"
};
function isLegacyDefaultAllowlist(names) {
  return names.length === 2 && names.includes("status") && names.includes("servers_list");
}
var PRE_MERGE_SETTINGS_VERSION = 2;
var BOOT_MECHANISMS = ["auto", "systemd-user", "systemd-system", "launchd-agent", "launchd-daemon", "xdg-autostart", "windows-run", "windows-task", "container", "unsupported"];
function isBootMechanism(value) {
  return typeof value === "string" && BOOT_MECHANISMS.includes(value);
}
function isBootAttempt(value) {
  return isRecord(value);
}
function normalize(raw, fallbackEntryId) {
  const entries = Array.isArray(raw?.entries) ? raw.entries.map((intent) => normalizeIntent(intent, fallbackEntryId)) : [];
  const declared = Array.isArray(raw?.agentTools?.allow) ? raw.agentTools.allow : null;
  const legacyFile = (typeof raw?.version === "number" ? raw.version : 1) < PRE_MERGE_SETTINGS_VERSION;
  const migrated = declared === null ? null : [...new Set(declared.map((name2) => legacyFile ? LEGACY_TOOL_NAMES[name2] ?? name2 : name2).filter(knownTool))];
  const choseNothing = legacyFile && declared !== null && migrated !== null && isLegacyDefaultAllowlist(declared);
  const allow = migrated === null || choseNothing ? [...DEFAULT_SETTINGS.agentTools.allow] : migrated;
  const attempt = raw?.autostart?.lastAttempt;
  return {
    version: SETTINGS_VERSION,
    autostart: {
      enabled: raw?.autostart?.enabled === true,
      mechanism: isBootMechanism(raw?.autostart?.mechanism) ? raw.autostart.mechanism : "auto",
      ...isBootAttempt(attempt) ? { lastAttempt: attempt } : {}
    },
    // A pre-0.2.0 file expressed management only by holding an intent for the
    // harness entry; the page's toggle needs the flag it never had.
    manageDsh: raw?.manageDsh === true || legacyFile && entries.some((entry) => entry.id === fallbackEntryId),
    entries,
    panel: {
      // An integer in range, or nothing: the panel's schema rejects anything else,
      // and a value it cannot parse stops it booting at all.
      port: typeof raw?.panel?.port === "number" && Number.isInteger(raw.panel.port) && raw.panel.port >= 1 && raw.panel.port <= 65535 ? raw.panel.port : null
    },
    authNotice: raw?.authNotice === void 0 ? DEFAULT_SETTINGS.authNotice : raw.authNotice === true,
    // Absent means on: a stale token is a fault to repair, not a setting to opt into.
    reclaimToken: raw?.reclaimToken === void 0 ? DEFAULT_SETTINGS.reclaimToken : raw.reclaimToken === true,
    // Absent means on: a plugin that owns one panel should say so by default.
    instancesNotice: raw?.instancesNotice === void 0 ? DEFAULT_SETTINGS.instancesNotice : raw.instancesNotice === true,
    uiStyle: raw?.uiStyle === "compact" ? "compact" : "detailed",
    agentTools: {
      // Absent means the default (on), and so does the pair the previous
      // release wrote for it; any other explicit false stays false.
      enabled: choseNothing || raw?.agentTools?.enabled === void 0 ? DEFAULT_SETTINGS.agentTools.enabled : raw.agentTools.enabled === true,
      // Absent means every tool; an explicit empty list means none of them.
      allow
    },
    cli: {
      prefer: raw?.cli?.prefer === "global" ? "global" : "pinned"
    }
  };
}
var SettingsStore = class {
  constructor(file, fallbackEntryId) {
    this.file = file;
    this.fallbackEntryId = fallbackEntryId;
    this.current = normalize(readJson(file), fallbackEntryId);
  }
  current;
  listeners = /* @__PURE__ */ new Set();
  get() {
    return this.current;
  }
  /** The intent for an entry, materialising the default when it has none yet. */
  intentFor(id) {
    return this.current.entries.find((entry) => entry.id === id) ?? defaultIntent(id);
  }
  update(patch) {
    const next = normalize({
      // A patch is not a legacy file: the migration belongs to reading one.
      version: SETTINGS_VERSION,
      autostart: { ...this.current.autostart, ...patch.autostart ?? {} },
      manageDsh: patch.manageDsh ?? this.current.manageDsh,
      entries: patch.entries ?? this.current.entries,
      panel: { ...this.current.panel, ...patch.panel ?? {} },
      authNotice: patch.authNotice ?? this.current.authNotice,
      reclaimToken: patch.reclaimToken ?? this.current.reclaimToken,
      instancesNotice: patch.instancesNotice ?? this.current.instancesNotice,
      uiStyle: patch.uiStyle ?? this.current.uiStyle,
      agentTools: { ...this.current.agentTools, ...patch.agentTools ?? {} },
      cli: { ...this.current.cli, ...patch.cli ?? {} }
    }, this.fallbackEntryId);
    this.current = next;
    writeJsonAtomic(this.file, next, 384);
    for (const listener of this.listeners)
      listener(next);
    return next;
  }
  onChange(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
};

// src/tools.ts
import { defineTool } from "@deepseek-ai/dsh-tools";
function sandboxMode(ctx, exec) {
  const policy = ctx.get("sandboxPolicy");
  if (policy?.resolve === void 0)
    return null;
  const session = exec?.agent?.session;
  try {
    return policy.resolve({ ...session === void 0 ? {} : { session } })?.mode ?? null;
  } catch {
    return null;
  }
}
function withTarget(payload, home, via) {
  const target = via === null ? { home } : { home, via };
  return typeof payload === "object" && payload !== null ? { ...payload, ...target } : target;
}
function stringArg(input, key) {
  const value = input[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function requiredWorkspace(input) {
  const workspace = stringArg(input, "workspace");
  if (workspace === null)
    throw new Error("workspace is required; a server id is only unique inside one");
  return workspace;
}
function jsonArg(input, key) {
  const value = input[key];
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function jsonArgError(input, key, purpose) {
  const value = input[key];
  const received = value === void 0 ? "missing" : Array.isArray(value) ? "array" : typeof value;
  return new Error(`${key} must be a JSON object ${purpose} (received: ${received})`);
}
var INSTANCE_PARAM = {
  type: "string",
  description: "Panel state root or URL; omit for the managed panel"
};
var WORKSPACE_PARAM = {
  type: "string",
  required: true,
  description: "Workspace id (^[a-z0-9][a-z0-9_-]*$)"
};
var ENTRY_FIELDS = {
  id: { type: "string", required: true, description: "Entry id, ^[a-z0-9][a-z0-9_-]*$" },
  command: { type: "string", description: "Executable to run" },
  args: { type: "array", items: { type: "string" }, description: "Arguments" },
  cwd: { type: "string", description: "Working directory" },
  label: { type: "string", description: "Human label" },
  enabled: { type: "boolean", description: "Whether the entry may run" },
  autostart: { type: "boolean", description: "Start it when the panel starts" },
  // The panel's schema is `1..65535 | null`, and a patch that clears a port sends it.
  port: { oneOf: [{ type: "number" }, { type: "null" }], description: "Port the panel tracks for this entry, or null" },
  bind: { type: "string", description: "Bind host, or local/lan: a local bind is loopback only" },
  onPortConflict: { type: "string", enum: [...ON_PORT_CONFLICT_POLICIES], description: "Policy when the port is taken" },
  stop: { type: "object", additionalProperties: true, description: "Stop policy: signal, killGroup, graceMs, killPortHolders" },
  health: { type: "object", additionalProperties: true, description: "Health check: enabled, mode (port|http), http {path, method, expectStatus, expectStatusBelow, expectBody}, intervalMs, timeoutMs, unhealthyThreshold, forceRestartAfterMs, startTimeoutMs" },
  restart: { type: "object", additionalProperties: true, description: "Restart policy: enabled, maxRetries, baseDelayMs, factor, maxDelayMs, resetAfterMs" },
  env: { type: "object", additionalProperties: true, description: "Environment variables" },
  dataEnvs: { type: "object", additionalProperties: true, description: "ENV=path pairs: exported to the process and backed up automatically" },
  persistent: { type: "boolean", description: "Run under the panel's nanny, so stopping or restarting the panel leaves this process alive" },
  bootstrap: { oneOf: [{ type: "object", additionalProperties: true }, { type: "null" }], description: "Setup step run before start: command, args, env, timeoutMs, runOnce \u2014 or null" },
  dependsOn: { type: "array", items: { type: "string" }, description: "Ids that must be running (and healthy) first; stopped in reverse order" },
  envFile: { type: "string", description: "KEY=value file loaded at spawn; its values override env" },
  resources: { type: "object", additionalProperties: true, description: "Resource policy: maxRssBytes \u2014 restart when the tree exceeds it; 0 disables" },
  backupPaths: { type: "array", items: { type: "string" }, description: "Paths included in backups for this entry (templates allowed)" },
  logBufferLines: { type: "number", description: "Live log lines kept for this entry, 50..100000" },
  backupIgnoreGenerated: { type: "boolean", description: "Skip build output and dependency directories (node_modules, dist, caches) inside the declared backup paths" }
};
var ENTRY_PARAM = {
  type: "object",
  additionalProperties: true,
  description: "A home-hosted server entry: at least id and command",
  properties: ENTRY_FIELDS
};
var PATCH_PARAM = {
  type: "object",
  additionalProperties: true,
  description: "Fields to change on an existing entry; only the given keys are touched",
  // The same fields, none required and without `id`: the entry patched is the one
  // the `id` argument names, and the panel rejects a patch that carries an id.
  properties: Object.fromEntries(Object.entries(ENTRY_FIELDS).filter(([key]) => key !== "id"))
};
var TOOL_SPECS = {
  status: {
    description: "Report the panel state, the panels found on this machine, its autostart entry, and the entries this plugin manages.",
    parameters: { instance: INSTANCE_PARAM },
    run: () => ({ endpoint: "status", payload: {} })
  },
  workspaces_list: {
    description: "List every workspace the panel serves, with its label, entry count and running count. Read-only.",
    parameters: { instance: INSTANCE_PARAM },
    run: () => ({ endpoint: "workspaces.list", payload: {} })
  },
  servers_list: {
    description: "List the servers home-hosted supervises in one workspace, with status, pid and url.",
    parameters: { instance: INSTANCE_PARAM, workspace: WORKSPACE_PARAM },
    run: (input) => {
      const workspace = requiredWorkspace(input);
      return { endpoint: "servers.list", payload: { workspace } };
    }
  },
  servers_lifecycle: {
    description: "Start, stop or restart a server supervised by home-hosted. Restarting the entry this session runs as ends the session.",
    parameters: {
      instance: INSTANCE_PARAM,
      workspace: WORKSPACE_PARAM,
      action: { type: "string", required: true, description: "start, stop or restart" },
      id: { type: "string", required: true, description: "Server entry id" }
    },
    run: (input) => {
      const action = stringArg(input, "action");
      if (action !== "start" && action !== "stop" && action !== "restart")
        throw new Error("action must be start, stop or restart");
      const id = stringArg(input, "id");
      if (id === null)
        throw new Error("id is required");
      return {
        endpoint: `servers.${action}`,
        payload: { id, workspace: requiredWorkspace(input) }
      };
    }
  },
  servers_edit: {
    description: "Create, update or delete a home-hosted server entry. Delete is refused for the entry this session runs as.",
    parameters: {
      instance: INSTANCE_PARAM,
      workspace: WORKSPACE_PARAM,
      action: { type: "string", required: true, description: "create, update or delete" },
      id: { type: "string", description: "Server entry id (update, delete)" },
      entry: ENTRY_PARAM,
      patch: PATCH_PARAM
    },
    run: (input) => {
      const action = stringArg(input, "action");
      const workspace = requiredWorkspace(input);
      if (action === "create") {
        const entry = jsonArg(input, "entry");
        if (entry === null)
          throw jsonArgError(input, "entry", "to create a server");
        return { endpoint: "servers.create", payload: { entry, workspace } };
      }
      if (action === "update") {
        const id = stringArg(input, "id");
        const patch = jsonArg(input, "patch");
        if (id === null)
          throw new Error("id is required to update a server");
        if (patch === null)
          throw jsonArgError(input, "patch", "to update a server");
        const { id: _key, ...fields } = patch;
        return { endpoint: "servers.update", payload: { id, patch: fields, workspace } };
      }
      if (action === "delete") {
        const id = stringArg(input, "id");
        if (id === null)
          throw new Error("id is required to delete a server");
        return { endpoint: "servers.delete", payload: { id, workspace } };
      }
      throw new Error("action must be create, update or delete");
    }
  },
  autostart_manage: {
    description: "Install or remove the OS entry that starts home-hosted at boot or login. Installing stops the panel (and every server it supervises, which can include this session) and starts it again through that entry.",
    parameters: {
      instance: INSTANCE_PARAM,
      action: { type: "string", required: true, description: "install or uninstall" },
      mechanism: { type: "string", description: "Mechanism, e.g. systemd-system; omit for the plugin setting" }
    },
    run: (input) => {
      const action = stringArg(input, "action");
      if (action !== "install" && action !== "uninstall")
        throw new Error("action must be install or uninstall");
      const mechanism = stringArg(input, "mechanism");
      return { endpoint: `boot.${action}`, payload: mechanism === null ? {} : { mechanism } };
    }
  },
  ui_manage: {
    description: "Inspect or change the panel's own web UI: status, update, revert, or install a UI by release asset or local zip.",
    parameters: {
      instance: INSTANCE_PARAM,
      action: { type: "string", required: true, description: "status, update, revert or switch" },
      asset: { type: "string", description: "Release asset name to install (switch), e.g. noc-console" },
      repo: { type: "string", description: "owner/name the asset lives in (switch/update)" },
      tag: { type: "string", description: "Release tag (switch/update)" },
      file: { type: "string", description: "Absolute path to a local UI zip (switch)" }
    },
    run: (input) => {
      const action = stringArg(input, "action");
      if (action !== "status" && action !== "update" && action !== "revert" && action !== "switch")
        throw new Error("action must be status, update, revert or switch");
      const optional = (key) => {
        const value = stringArg(input, key);
        return value === null ? {} : { [key]: value };
      };
      return {
        endpoint: "ui.manage",
        payload: {
          action,
          ...optional("file"),
          ...optional("asset"),
          ...optional("repo"),
          ...optional("tag")
        }
      };
    }
  },
  /**
   * The one diagnostic that works when the panel's API does not: it reads the
   * console log off disk, so it needs no session and no API token. Read-only, and
   * deliberately not gated behind approval — a token is hardest to come by in
   * exactly the case this exists for.
   */
  panel_logs: {
    description: "Read the panel's own console output \u2014 what home-hosted printed while starting and supervising. Needs no API token, so it still works when the panel is up but not answering.",
    parameters: {
      instance: INSTANCE_PARAM,
      lines: { type: "string", description: "How many trailing lines to read (default 50, `all` for everything)" }
    },
    run: (input) => {
      const raw = stringArg(input, "lines");
      if (raw === null)
        return { endpoint: "panel.console", payload: {} };
      const trimmed = raw.trim();
      if (trimmed.toLowerCase() === "all")
        return { endpoint: "panel.console", payload: { lines: 0 } };
      if (!/^[+-]?\d+$/.test(trimmed))
        throw new Error(`lines must be a decimal integer or \`all\` (received ${JSON.stringify(raw)})`);
      const parsed = Number.parseInt(trimmed, 10);
      if (!Number.isSafeInteger(parsed))
        throw new Error(`lines is out of range (received ${JSON.stringify(raw)})`);
      return { endpoint: "panel.console", payload: { lines: parsed < 0 ? 0 : parsed } };
    }
  }
};
function toolNameFor(name2) {
  return `home_hosted_${name2}`;
}
var READ_ONLY_ACTIONS = {
  ui_manage: (input) => stringArg(input, "action") === "status"
};
var CANCEL_LABEL = "Cancel";
var NO_ANSWERER_CODES = /* @__PURE__ */ new Set(["NO_PROVIDER", "DELEGATED_CALLER", "CALLER_NOT_LIVE"]);
var MECHANISM_WORDING = {
  file: { option: "Edit its config file", phrase: "by editing its servers.config.json" },
  cli: { option: "Run the home-hosted CLI", phrase: "by running the home-hosted CLI against its state root" },
  api: { option: "Generate a token and use its API", phrase: "by enrolling a token for it and using its API" }
};
var NO_FOREIGN_REASON = {
  "status": "home_hosted_status describes the panel this plugin manages, and it already lists every panel found on the machine.",
  "boot.install": "the OS boot entry starts the panel this plugin manages; it is one machine-wide entry and cannot be aimed at another panel.",
  "boot.uninstall": "the OS boot entry is one machine-wide entry and belongs to the panel this plugin manages."
};
async function inventoryOf(service) {
  const reader = service.instances;
  if (typeof reader !== "function")
    return [];
  try {
    return await reader.call(service);
  } catch {
    return [];
  }
}
function matchInstance(instances, wanted) {
  const target = wanted.trim();
  if (target.length === 0)
    return null;
  const asPath = canonicalPath(target);
  return instances.find(
    (instance) => instance.home === asPath || instance.url === target || instance.projectDir !== null && instance.projectDir === target
  ) ?? null;
}
function inventoryText(instances) {
  return instances.map((instance) => `${instance.managed ? "managed: " : ""}${describeInstance(instance)}`).join("; ");
}
function refusalForUnknownPanel(instances, wanted) {
  return `refused: no home-hosted panel at "${wanted}" was found on this machine. Panels found: ${inventoryText(instances)}. Ask the user which panel they mean, or read home_hosted_status for the inventory.`;
}
function refusalForUnreachablePanel(instances, target, endpoint) {
  const reason = NO_FOREIGN_REASON[endpoint] ?? `this plugin has no way to change another panel's state for ${endpoint}`;
  return `refused: ${describeInstance(target)} is another home-hosted panel, and ${reason} Panels found: ${inventoryText(instances)}.`;
}
function answerOf(answer2, id) {
  const item = (Array.isArray(answer2?.answers) ? answer2.answers : []).find((entry) => entry.id === id);
  return {
    selected: Array.isArray(item?.selected) ? item.selected : [],
    custom: typeof item?.custom === "string" && item.custom.trim().length > 0 ? item.custom.trim() : null
  };
}
async function planTarget(service, settings, endpoint, requested, mutating) {
  const instances = await inventoryOf(service);
  if (instances.length === 0) {
    return requested === null ? { ok: true, home: null, ask: null } : { ok: false, text: `refused: this host could not list the home-hosted panels on this machine, so "${requested}" cannot be checked; ask the user, or call without instance to act on the panel this plugin manages.` };
  }
  const managed = instances.find((instance) => instance.managed);
  const mechanisms = FOREIGN_MECHANISMS[endpoint];
  if (requested !== null) {
    const target = matchInstance(instances, requested);
    if (target === null)
      return { ok: false, text: refusalForUnknownPanel(instances, requested) };
    if (target.managed)
      return { ok: true, home: null, ask: null };
    if (mechanisms === void 0)
      return { ok: false, text: refusalForUnreachablePanel(instances, target, endpoint) };
    return mutating ? { ok: true, home: target.home, ask: "foreign", mechanisms } : { ok: true, home: target.home, ask: null };
  }
  if (!mutating || !settings.get().instancesNotice || managed === void 0 || mechanisms === void 0 || instances.length < 2)
    return { ok: true, home: null, ask: null };
  return { ok: true, home: null, ask: "which", mechanisms };
}
async function ask(ctx, exec, questions, item) {
  try {
    const answer2 = await questions.ask({
      questions: [{ id: item.id, header: "home-hosted", question: item.question, detail: item.detail, options: item.options }],
      agent: exec?.agent,
      signal: exec?.signal
    });
    const { selected, custom } = answerOf(answer2, item.id);
    return { ok: true, selected, custom };
  } catch (error) {
    return { ok: false, code: errorCode(error), error };
  }
}
async function askForeignPanel(ctx, exec, instances, target, mechanisms) {
  const questions = ctx.get("userQuestions");
  const first = mechanisms[0];
  if (typeof questions?.ask !== "function")
    return { ok: true, home: target.home, via: first };
  const answer2 = await ask(ctx, exec, questions, {
    id: "home-hosted-foreign-panel",
    question: `${target.home} is not a panel this plugin manages. How should it be changed?`,
    detail: inventoryText(instances),
    options: [
      ...mechanisms.map((mechanism) => ({
        label: MECHANISM_WORDING[mechanism].option,
        description: `${MECHANISM_WORDING[mechanism].phrase}${mechanism === "api" ? "; that mints a token for it, replacing any it had" : "; this plugin holds no API token for that panel"}`
      })),
      { label: CANCEL_LABEL, description: "Change nothing; say which panel you meant instead." }
    ]
  });
  if (!answer2.ok) {
    if (answer2.code === "ASK_ABORTED")
      return { ok: false, text: "cancelled: the user dismissed the panel question to speak instead; stop and wait for their message." };
    if (answer2.code !== null && NO_ANSWERER_CODES.has(answer2.code))
      return { ok: true, home: target.home, via: first };
    return { ok: false, text: `refused: the panel question could not be asked (${messageOf(answer2.error)}); ask the user before changing another panel.` };
  }
  if (answer2.selected.includes(CANCEL_LABEL))
    return { ok: false, text: `cancelled: the user did not confirm changing ${target.home}; ask which panel they meant.` };
  const chosen = answer2.selected.find((label) => label !== CANCEL_LABEL);
  if (chosen !== void 0) {
    const mechanism = mechanisms.find((candidate) => MECHANISM_WORDING[candidate].option === chosen);
    if (mechanism !== void 0)
      return { ok: true, home: target.home, via: mechanism };
  }
  if (chosen === void 0 && answer2.custom !== null) {
    const mechanism = mechanisms.find((candidate) => matchesMechanism(answer2.custom, candidate));
    if (mechanism !== void 0)
      return { ok: true, home: target.home, via: mechanism };
  }
  return { ok: false, text: `cancelled: the user did not confirm changing ${target.home}; ask which panel they meant.` };
}
function matchesMechanism(text, mechanism) {
  const value = text.toLowerCase();
  if (mechanism === "file")
    return /file|config/.test(value);
  if (mechanism === "cli")
    return /cli|command|terminal/.test(value);
  return /api|token/.test(value);
}
async function askWhichPanel(ctx, exec, instances, managed, others, mechanisms) {
  const questions = ctx.get("userQuestions");
  if (typeof questions?.ask !== "function")
    return { ok: true, home: null, via: null };
  const answer2 = await ask(ctx, exec, questions, {
    id: "home-hosted-instance",
    question: `${instances.length} home-hosted panels were found on this machine. Act on the panel this plugin manages?`,
    detail: inventoryText(instances),
    options: [
      { label: managed.home, description: `managed by this plugin${managed.url === null ? "" : ` \xB7 ${managed.url}`}` },
      ...others.map((instance) => ({
        label: instance.home,
        description: `not managed by this plugin${instance.url === null ? "" : ` \xB7 ${instance.url}`} \xB7 ${mechanisms.map((candidate) => MECHANISM_WORDING[candidate].phrase).join(", or ")}`
      })),
      { label: CANCEL_LABEL, description: "Do nothing; say which panel you meant instead." }
    ]
  });
  if (!answer2.ok) {
    if (answer2.code === "ASK_ABORTED")
      return { ok: false, text: "cancelled: the user dismissed the panel question to speak instead; stop and wait for their message." };
    if (answer2.code !== null && NO_ANSWERER_CODES.has(answer2.code))
      return { ok: true, home: null, via: null };
    return { ok: false, text: `refused: the panel question could not be asked (${messageOf(answer2.error)}); ask the user which panel they mean before acting.` };
  }
  if (answer2.selected.includes(CANCEL_LABEL))
    return { ok: false, text: "cancelled: the user chose not to pick a panel; ask them which one they mean." };
  const chosen = answer2.selected.find((label) => label !== CANCEL_LABEL);
  if (chosen !== void 0) {
    const instance = matchInstance(instances, chosen);
    if (instance === null)
      return { ok: false, text: `cancelled: the answer "${chosen}" names no panel; ask the user which panel they mean.` };
    return instance.managed ? { ok: true, home: null, via: null } : { ok: true, home: instance.home, via: null };
  }
  if (answer2.custom !== null) {
    const instance = matchInstance(instances, answer2.custom);
    if (instance?.managed === true)
      return { ok: true, home: null, via: null };
    if (instance !== null)
      return { ok: true, home: instance.home, via: null };
    return { ok: false, text: `cancelled: the user answered "${answer2.custom}", which names no panel; ask them which panel they mean.` };
  }
  return { ok: false, text: "cancelled: the panel question was not answered; ask the user which panel they mean before acting." };
}
async function confirmPlan(ctx, exec, service, plan) {
  if (plan.ask === null)
    return { ok: true, home: plan.home, via: null };
  const instances = await inventoryOf(service);
  const managed = instances.find((instance) => instance.managed);
  if (plan.ask === "foreign") {
    const target = instances.find((instance) => instance.home === plan.home);
    return target === void 0 ? { ok: false, text: refusalForUnknownPanel(instances, plan.home) } : await askForeignPanel(ctx, exec, instances, target, plan.mechanisms);
  }
  if (managed === void 0)
    return { ok: true, home: null, via: null };
  const others = instances.filter((instance) => !instance.managed);
  const picked = await askWhichPanel(ctx, exec, instances, managed, others, plan.mechanisms);
  if (!picked.ok || picked.home === null)
    return picked;
  const chosen = instances.find((instance) => instance.home === picked.home);
  if (chosen === void 0 || chosen.managed)
    return picked;
  return await askForeignPanel(ctx, exec, instances, chosen, plan.mechanisms);
}
var TOKEN_REFUSAL_CODES = /* @__PURE__ */ new Set([
  "AUTH_REQUIRED",
  "AUTH_UNARMED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INVALID_TOKEN",
  "TOKEN_STALE",
  "TOKEN_REFUSED"
]);
function errorCode(error) {
  const code = error?.code;
  return typeof code === "string" ? code : null;
}
function errorStatus(error) {
  const status = error?.status;
  return typeof status === "number" ? status : null;
}
function refusedByPanel(error) {
  const status = errorStatus(error);
  if (status === 401 || status === 403)
    return true;
  const code = errorCode(error);
  return code !== null && TOKEN_REFUSAL_CODES.has(code);
}
async function tokenRefused(service, error) {
  if (refusedByPanel(error))
    return true;
  if (errorCode(error) !== "PANEL_UNAVAILABLE")
    return false;
  try {
    const status = await service.call("status", {});
    return status?.panel.token === "stale";
  } catch {
    return false;
  }
}
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
function failureText(error) {
  return `failed: ${messageOf(error)}`;
}
function registerOne(ctx, service, settings, name2) {
  const spec = TOOL_SPECS[name2];
  const toolName = toolNameFor(name2);
  const mutatingTool = MUTATING_AGENT_TOOLS.includes(name2);
  return ctx.tools.register(defineTool({
    name: toolName,
    description: spec.description,
    parameters: spec.parameters,
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    async execute(args, exec) {
      const input = args ?? {};
      let request;
      try {
        request = spec.run(input);
      } catch (error) {
        return failureText(error);
      }
      const mode = sandboxMode(ctx, exec);
      const mutating = mutatingTool && !(READ_ONLY_ACTIONS[name2]?.(input) ?? false);
      const plan = await planTarget(service, settings, request.endpoint, stringArg(input, "instance"), mutating);
      if (!plan.ok)
        return plan.text;
      if (mutating && mode !== "danger-full-access") {
        const remedy = "Set the session to Full access (danger-full-access), or use a session where approvals can be answered.";
        const approval = ctx.get("approval");
        if (approval?.request === void 0)
          return `refused: this session runs in ${mode ?? "an unknown"} sandbox and the deployment has no approval service. ${remedy}`;
        const outcome = await approval.request({
          agent: exec?.agent,
          toolName,
          reason: `${spec.description} (${JSON.stringify(input)})`
        });
        if (outcome !== "allowed-once")
          return `refused: approval answered "${outcome}" (session sandbox: ${mode ?? "unknown"}). ${remedy}`;
      }
      const target = await confirmPlan(ctx, exec, service, plan);
      if (!target.ok)
        return target.text;
      const payload = target.home === null ? request.payload : withTarget(request.payload, target.home, target.via ?? FOREIGN_MECHANISMS[request.endpoint]?.[0] ?? null);
      const landing = target.home === null ? "" : `

home-hosted: ${plan.ask === null ? "read from" : "acted on"} ${target.home}, not the panel this plugin manages${target.via === null ? "" : `, ${MECHANISM_WORDING[target.via].phrase}`}.`;
      try {
        return `${JSON.stringify(await service.call(request.endpoint, payload), null, 2)}${landing}`;
      } catch (error) {
        if (target.home !== null || !settings.get().reclaimToken || !await tokenRefused(service, error))
          return failureText(error);
        try {
          await service.call("panel.reclaimToken", {});
        } catch (reclaimError) {
          return `${failureText(error)} (token reclaim failed: ${messageOf(reclaimError)})`;
        }
        try {
          return `${JSON.stringify(await service.call(request.endpoint, payload), null, 2)}${landing}`;
        } catch (retryError) {
          return failureText(retryError);
        }
      }
    }
  }));
}
function registerAgentTools(ctx, service, settings) {
  ctx.inject(["tools"], (scoped) => {
    const disposers = [];
    const sync = () => {
      while (disposers.length > 0)
        disposers.pop()?.();
      const current = settings.get();
      if (!current.agentTools.enabled)
        return;
      for (const name2 of current.agentTools.allow) {
        try {
          disposers.push(registerOne(scoped, service, settings, name2));
        } catch {
        }
      }
    };
    scoped.effect(() => {
      sync();
      const off = settings.onChange(sync);
      return () => {
        off();
        while (disposers.length > 0)
          disposers.pop()?.();
      };
    }, "dsh-home-hosted: agent tools");
  });
}

// src/util/surface.ts
function readSurface(ctx) {
  try {
    const profile = ctx.get("profileContext");
    return profile?.name === "desktop" ? "desktop" : "web";
  } catch {
    return "web";
  }
}

// src/index.ts
var name = "dsh-home-hosted";
var inject = [];
function apply(ctx, config) {
  const resolved = {
    stateDir: config?.stateDir,
    homeHostedCommand: config?.homeHostedCommand,
    defaultEntryId: config?.defaultEntryId ?? "dsh",
    instanceRoots: config?.instanceRoots ?? []
  };
  const stateDir = pluginStateDir(resolved.stateDir);
  ensureDir(stateDir, 448);
  const panel = resolveHomeHostedHome(stateDir);
  const settings = new SettingsStore(path17.join(stateDir, "settings.json"), resolved.defaultEntryId);
  const service = new HomeHostedService(ctx, {
    home: panel.home,
    panelHomeSource: panel.source,
    stateDir,
    homeHostedCommand: resolved.homeHostedCommand,
    defaultEntryId: resolved.defaultEntryId,
    instanceRoots: resolved.instanceRoots,
    surface: readSurface(ctx),
    settings
  });
  registerRpc(ctx, service);
  registerAgentTools(ctx, service, settings);
  registerInstancesNotice(ctx, {
    instances: () => service.instancesNow(),
    enabled: () => settings.get().instancesNotice
  });
  registerAuthNotice(ctx, () => settings.get().authNotice ? service.panelLogUrl() : null);
  void service.instances().catch(() => {
  });
  ctx.effect(() => {
    const timer = setTimeout(() => {
      void service.reconcile().catch(() => {
      });
    }, 5e3);
    return () => clearTimeout(timer);
  }, "dsh-home-hosted: startup reconcile");
}
export {
  Config,
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
