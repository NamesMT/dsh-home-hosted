// src/index.ts
import path11 from "node:path";

// src/config.ts
import z from "@deepseek-ai/schemastery";
var Config = z.object({
  stateDir: z.string().description("Plugin state directory; defaults to $DSH_HOME/dsh-home-hosted"),
  homeHostedCommand: z.string().description("home-hosted executable to put in a generated autostart entry"),
  defaultEntryId: z.string().default("dsh").description("Server entry id used for the running harness")
});

// src/shared/contracts.ts
var RPC_PATH = "/home-hosted";
var RPC_VERSION = 1;
var AGENT_TOOL_NAMES = [
  "status",
  "servers_list",
  "servers_start",
  "servers_stop",
  "servers_restart",
  "servers_create",
  "servers_update",
  "servers_delete",
  "autostart_install",
  "autostart_uninstall"
];
var MUTATING_AGENT_TOOLS = [
  "servers_start",
  "servers_stop",
  "servers_restart",
  "servers_create",
  "servers_update",
  "servers_delete",
  "autostart_install",
  "autostart_uninstall"
];
var DEFAULT_SETTINGS = {
  autostart: { enabled: false, mechanism: "auto" },
  entries: [],
  agentTools: { enabled: false, allow: ["status", "servers_list"] }
};

// src/service.ts
import { Service } from "@deepseek-ai/cordis";
import fs9 from "node:fs";
import path10 from "node:path";
import process7 from "node:process";

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
function currentUser(ctx) {
  const value = ctx.env.USER?.trim() || ctx.env.LOGNAME?.trim() || ctx.env.USERNAME?.trim();
  if (value)
    return value;
  try {
    return os.userInfo().username;
  } catch {
    return null;
  }
}
function uidOf(ctx) {
  const configured = ctx.env.UID?.trim();
  if (configured)
    return configured;
  const uid = process.getuid?.();
  return uid === void 0 ? null : String(uid);
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
  return name2;
}
function assertMarker(marker) {
  if (marker.trim() === "")
    throw new Error("marker must not be empty");
  return assertNoControl(marker, "marker");
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
  return escaped !== value || /[\s"']/.test(value) ? `"${escaped}"` : value;
}
function systemdText(value) {
  assertNoControl(value, "unit setting");
  return replaceAll(value, [["%", "%%"]]);
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
function desktopWord(value) {
  assertNoControl(value, "desktop Exec word");
  const escaped = replaceAll(value, [["\\", "\\\\"], ['"', '\\"'], ["`", "\\`"], ["$", "\\$"], ["%", "%%"]]);
  return DESKTOP_RESERVED.test(value) || escaped !== value ? `"${escaped}"` : value;
}
function desktopExec(program, args) {
  return [program, ...args].map(desktopWord).join(" ");
}
function windowsArg(value) {
  assertNoControl(value, "windows argument");
  if (value !== "" && !/[\s"]/.test(value))
    return value;
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
function windowsCommandLine(program, args) {
  return [program, ...args].map(windowsArg).join(" ");
}
function batchCommandLine(program, args) {
  return replaceAll(windowsCommandLine(program, args), [["%", "%%"]]);
}
function powershellLiteral(value) {
  assertNoControl(value, "powershell value");
  return `'${value.split("'").join("''")}'`;
}
function cmdQuote(value) {
  if (value !== "" && !/[\s"&|<>^]/.test(value))
    return value;
  return `"${value.split('"').join('""')}"`;
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
    `WorkingDirectory=${systemdExecWord(spec.cwd)}`,
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
    ...user ? [`User=${user}`] : [],
    "Type=exec",
    `ExecStart=${[spec.command, ...spec.args].map(systemdExecWord).join(" ")}`,
    `WorkingDirectory=${systemdExecWord(spec.cwd)}`,
    "Restart=always",
    "RestartSec=5",
    ...envLines(spec),
    "",
    "[Install]",
    "WantedBy=multi-user.target",
    ""
  ].join("\n")}`;
}
function codeOf(result) {
  return result.error ? null : result.code;
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
    nRestarts: props.NRestarts ?? "",
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
        if (before.reachable) {
          const disableCommand = shellCommand("systemctl", ["--user", "disable", "--now", unit]);
          const disable = await ctx.run("systemctl", ["--user", "disable", "--now", unit]);
          const disableCode = codeOf(disable);
          if (disableCode !== 0 && disableCode !== 1 && disableCode !== 4)
            return failed(problem(disable, disableCommand) ?? "disable failed", { commands: [disableCommand] });
        } else if (!own.exists) {
          return { ok: true, changed: false, detail: `no unit file at ${file} and systemctl is unavailable; nothing to remove`, commands: [], needsPrivilege: false };
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
    }
  };
}
function systemUserName(ctx) {
  const user = currentUser(ctx);
  return user && /^[A-Za-z_][A-Za-z0-9._-]*$/.test(user) ? user : null;
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
  const contentOf = (spec) => systemdSystemUnit(spec, ctx.isRoot ? systemUserName(ctx) : null);
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
      return {
        mechanism,
        available: privileged,
        bootCapable: privileged,
        privileged,
        reason: privileged ? "systemd is PID 1 and this process can use root, so a system unit starts at boot" : "systemd is PID 1, but installing a system unit needs root or passwordless sudo"
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
          detail: `${probe.detail}${privileged ? "" : "; needs root to change"}`,
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
function launchdPlist(spec) {
  validate2(spec);
  const label = launchdLabel(spec);
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
          available: domain !== null,
          bootCapable: false,
          privileged: true,
          reason: domain === null ? `no launchd gui/$UID or user/$UID domain is reachable for uid ${uidOf(ctx) ?? "?"}` : `launchd ${domain} domain is reachable; a LaunchAgent loads at login, not at boot`
        };
      }
      const canElevate = ctx.isRoot || await ctx.sudo();
      return {
        mechanism,
        available: canElevate,
        bootCapable: canElevate,
        privileged: canElevate,
        reason: canElevate ? "this process can write /Library/LaunchDaemons, so a LaunchDaemon starts at boot" : "a LaunchDaemon needs root or passwordless sudo"
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
        const content = launchdPlist(spec);
        const own = inspectOwned(file, spec.marker);
        if (own.exists && !own.owned)
          return failed(own.reason ?? "foreign file");
        if (!await privileged())
          return failed("writing /Library/LaunchDaemons needs root; the plist is staged for you to install", {
            needsPrivilege: true,
            commands: [
              shellCommand("sudo", ["install", "-m", "0644", posixJoin(tempDir(ctx), `${label}.plist`), file]),
              shellCommand("sudo", ["launchctl", "bootstrap", "system", file]),
              shellCommand("sudo", ["launchctl", "enable", `system/${label}`])
            ]
          });
        const domain = await domainOf();
        if (domain === null)
          return failed(`launchd has no reachable domain for uid ${uidOf(ctx) ?? "?"}; refusing to write an agent that could never load`);
        ensureDirQuiet(path3.posix.dirname(file));
        ensureDirQuiet(spec.logDir);
        const loaded = codeOf2(await ctx.run("launchctl", ["print", `${domain}/${label}`])) === 0;
        const before = { text: own.text, exists: own.exists };
        let changed = false;
        if (mode === "agent" || ctx.isRoot) {
          const write = writeOwned(file, spec.marker, content, 420);
          if (write.refusal)
            return failed(write.refusal);
          changed = write.changed;
        } else {
          const staged = posixJoin(tempDir(ctx), `${label}.plist`);
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
function xdgDesktopEntry(spec) {
  validate3(spec);
  return `${[
    "[Desktop Entry]",
    "Type=Application",
    `Name=${spec.label}`,
    `Comment=home-hosted daemon, managed by ${spec.marker}`,
    `Exec=${desktopExec(spec.command, spec.args)}`,
    `Path=${spec.cwd}`,
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    `X-HomeHosted-Marker=${spec.marker}`,
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
        const own = inspectOwned(file, assertMarker(spec.marker));
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
        const write = writeOwned(file, spec.marker, xdgDesktopEntry(spec), 420);
        if (write.refusal)
          return failed(write.refusal);
        const text = inspectOwned(file, spec.marker).text;
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
        const own = inspectOwned(file, spec.marker);
        if (own.exists && !own.owned)
          return failed(own.reason ?? "foreign file");
        const remove = removeOwned(file, spec.marker);
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
        if (current.exists && !owned && current.data !== payload.data)
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
        if (current.data !== payload.data) {
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
  const isRoot = process3.getuid?.() === 0;
  const ctx = {
    platform,
    home: options.home ?? os2.homedir(),
    env: options.env ?? process3.env,
    run: options.run ?? run,
    sudo: options.sudo ?? (async () => isRoot ? true : await sudoAvailable()),
    isRoot,
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
    const bootCapable = available.find((mechanism) => mechanism !== "container" && byMechanism.get(mechanism)?.bootCapable === true);
    if (bootCapable)
      return bootCapable;
    if (available.includes("container"))
      return "container";
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
  return {
    providers,
    detect: detectAll,
    status: buildStatus,
    async install(spec, mechanism) {
      const before = await buildStatus(spec, mechanism);
      const chosen = mechanism ?? before.mechanism ?? before.recommended;
      const target = chosen ? providers.find((provider) => provider.mechanism === chosen) : void 0;
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
      const chosen = mechanism ?? before.mechanism;
      const target = chosen ? providers.find((provider) => provider.mechanism === chosen) : void 0;
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
    }
  };
}

// src/home-hosted/config-file.ts
import fs7 from "node:fs";

// src/util/paths.ts
import os3 from "node:os";
import path6 from "node:path";
function expandHome(value) {
  if (value === "~")
    return os3.homedir();
  if (value.startsWith("~/") || value.startsWith("~\\"))
    return path6.join(os3.homedir(), value.slice(2));
  return value;
}
function dshHome() {
  const configured = process.env.DSH_HOME?.trim();
  return configured ? path6.resolve(expandHome(configured)) : path6.join(os3.homedir(), ".dsh");
}
function homeHostedHome() {
  const configured = process.env.HHOSTED_HOME?.trim();
  return configured ? path6.resolve(expandHome(configured)) : path6.join(os3.homedir(), ".home-hosted");
}
function pluginStateDir(override) {
  const configured = override?.trim();
  if (configured)
    return path6.resolve(expandHome(configured));
  return path6.join(dshHome(), "dsh-home-hosted");
}
function runtimeFile(home = homeHostedHome()) {
  return path6.join(home, "run.json");
}
function secretsFile(home = homeHostedHome()) {
  return path6.join(home, ".control-secrets.json");
}
function configFile(home = homeHostedHome()) {
  return path6.join(home, "servers.config.json");
}

// src/home-hosted/config-file.ts
function readConfig(home) {
  const file = configFile(home);
  const raw = readJson(file);
  if (raw === null) {
    const exists = fs7.existsSync(file);
    return { raw: null, exists, error: exists ? "the config file could not be parsed" : null };
  }
  if (!Array.isArray(raw.servers) && raw.servers !== void 0)
    return { raw: null, exists: true, error: "the config file has a servers field that is not an array" };
  return { raw, exists: true, error: null };
}
function writeConfig(home, raw, writtenBy = "dsh-home-hosted") {
  const meta = { schema: 1, ...raw.meta ?? {}, writtenBy };
  const next = { ...raw, meta };
  writeFileAtomic(configFile(home), `${JSON.stringify(next, null, 2)}
`);
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
function patchEntry(raw, id, patch) {
  const servers = (raw.servers ?? []).map((entry) => {
    if (entry.id !== id)
      return entry;
    const merged = { ...entry, ...patch };
    if (patch.stop !== void 0 && typeof entry.stop === "object" && entry.stop !== null)
      merged.stop = { ...entry.stop, ...patch.stop };
    return merged;
  });
  return { ...raw, servers };
}

// src/home-hosted/dsh-entry.ts
import path8 from "node:path";
import process5 from "node:process";

// src/home-hosted/launch.ts
import fs8 from "node:fs";
import path7 from "node:path";
import process4 from "node:process";
async function which(command) {
  const probe = process4.platform === "win32" ? "where.exe" : "which";
  const result = await run(probe, [command], { timeoutMs: 5e3 });
  if (result.code !== 0)
    return null;
  const first = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0];
  return first ?? null;
}
function resolveShimmedCli(absolute, nodePath = process4.execPath) {
  if (!fs8.existsSync(absolute))
    return null;
  if (/\.(?:mjs|cjs|js)$/.test(absolute))
    return { program: nodePath, args: [absolute], cliEntry: absolute, shimPath: null, source: "entry" };
  const shimTarget = /^#\s*cmd-shim-target=(.+)$/m.exec(readText(absolute) ?? "")?.[1]?.trim();
  if (shimTarget !== void 0 && fs8.existsSync(shimTarget))
    return { program: nodePath, args: [shimTarget], cliEntry: shimTarget, shimPath: absolute, source: "shim-target" };
  return { program: absolute, args: [], cliEntry: null, shimPath: absolute, source: "shim" };
}
async function resolveHomeHostedLaunch(override) {
  const configured = override?.trim();
  const found = configured && configured.length > 0 ? configured : await which("home-hosted") ?? await which("hh");
  if (found === null || found === void 0)
    return null;
  const launch = resolveShimmedCli(path7.resolve(found));
  if (launch === null)
    return null;
  return configured ? { ...launch, source: "override" } : launch;
}
function homeHostedEnv(facts, launch, extra = {}) {
  const dirs = [
    launch.shimPath === null ? null : path7.dirname(launch.shimPath),
    path7.dirname(process4.execPath),
    ...(process4.env.PATH ?? "").split(path7.delimiter),
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
  }).join(path7.delimiter);
  const env = {
    PATH: pathValue,
    HOME: process4.env.HOME ?? process4.env.USERPROFILE ?? "",
    HHOSTED_HOME: facts.home,
    ...extra
  };
  if (facts.projectDir)
    env.HHOSTED_PROJECT = facts.projectDir;
  return env;
}
function buildHomeHostedBootSpec(facts, launch, options) {
  const logDir = path7.join(facts.home, ".logs");
  fs8.mkdirSync(logDir, { recursive: true });
  const args = [...launch.args, "up", "--foreground", "--home", facts.home];
  if (facts.projectDir)
    args.push("--project", facts.projectDir);
  return {
    command: launch.program,
    args,
    cwd: facts.projectDir ?? facts.home,
    env: homeHostedEnv(facts, launch),
    marker: options.marker ?? "managed by dsh-home-hosted",
    unitName: "home-hosted",
    label: "home-hosted control panel",
    logDir
  };
}

// src/home-hosted/dsh-entry.ts
async function resolveDshLaunch() {
  const fromArgv = process5.argv[1];
  if (typeof fromArgv === "string" && /\.[cm]?js$/.test(fromArgv) && path8.isAbsolute(fromArgv))
    return { program: process5.execPath, args: [fromArgv], cliEntry: fromArgv, shimPath: null, source: "entry" };
  const found = await which("dsh");
  return found === null ? null : resolveShimmedCli(found, process5.execPath);
}
function buildDshEntry(facts) {
  const launch = facts.launch;
  const entryArgs = launch?.args ?? [];
  const profile = facts.profile === null || facts.profile === void 0 ? "web" : facts.profile;
  const appArgs = [];
  if (facts.port !== null) {
    appArgs.push(
      "--port",
      "{port}",
      "--host",
      "{host}",
      "--no-open",
      "--trusted-host",
      `localhost:{port}`
    );
    if (facts.host === "0.0.0.0")
      appArgs.push("--trusted-host", "{lanIp}:{port}");
  }
  const launcherArgs = profile === "web" ? ["web"] : ["--profile", profile];
  const args = [...entryArgs, ...launcherArgs, ...appArgs];
  return {
    id: facts.id,
    label: "DSH web",
    enabled: true,
    autostart: true,
    command: launch?.program ?? "dsh",
    args,
    bind: facts.host === "0.0.0.0" ? "lan" : "local",
    port: facts.port,
    cwd: process5.cwd(),
    env: {},
    dataEnvs: { DSH_HOME: facts.dshHome },
    onPortConflict: "kill",
    stop: { killPortHolders: true },
    health: {
      enabled: true,
      mode: "http",
      http: { path: "/", method: "GET", expectStatusBelow: 400, expectBody: "" }
    }
  };
}

// src/home-hosted/entries.ts
var DEFAULT_ON_PORT_CONFLICT = "kill";
function defaultIntent(id) {
  return {
    id,
    autostart: true,
    onPortConflict: DEFAULT_ON_PORT_CONFLICT,
    stopKillPortHolders: true
  };
}
function ownedPatch(intent, live) {
  const stop = live?.stop ?? {};
  return {
    autostart: intent.autostart,
    onPortConflict: intent.onPortConflict,
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
  const killPortHolders = live.stop?.killPortHolders;
  if (killPortHolders !== intent.stopKillPortHolders)
    drift.push("stop.killPortHolders");
  return drift;
}
function snapshotOwned(live) {
  const snapshot = { id: live.id };
  if (live.autostart !== void 0)
    snapshot.autostart = live.autostart;
  if (live.onPortConflict !== void 0)
    snapshot.onPortConflict = live.onPortConflict;
  if (typeof live.stop === "object" && live.stop !== null) {
    const killPortHolders = live.stop.killPortHolders;
    if (typeof killPortHolders === "boolean")
      snapshot.stop = { killPortHolders };
  }
  return snapshot;
}
function restorePatch(live, snapshot) {
  const stop = live.stop ?? {};
  const previous = snapshot?.stop ?? {};
  return {
    autostart: snapshot?.autostart ?? false,
    onPortConflict: snapshot?.onPortConflict ?? "block",
    stop: {
      ...stop,
      killPortHolders: typeof previous.killPortHolders === "boolean" ? previous.killPortHolders : false
    }
  };
}

// src/home-hosted/panel.ts
var PanelError = class extends Error {
  constructor(message, code, status = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "PanelError";
  }
};
var PanelClient = class {
  baseUrl;
  token;
  timeoutMs;
  constructor(options) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? 1e4;
  }
  async request(method, path12, body) {
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path12}`, {
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
      const message = typeof record?.message === "string" ? record.message : `the panel answered ${response.status}`;
      const code = typeof record?.code === "string" ? record.code : "PANEL_ERROR";
      throw new PanelError(message, code, response.status);
    }
    return parsed;
  }
  async listServers() {
    const answer2 = await this.request("GET", "/api/servers");
    return answer2.servers;
  }
  async getServer(id) {
    const answer2 = await this.request("GET", `/api/servers/${encodeURIComponent(id)}`);
    return answer2.server;
  }
  async createServer(entry) {
    const answer2 = await this.request("POST", "/api/servers", entry);
    return answer2.server;
  }
  async updateServer(id, patch) {
    const answer2 = await this.request("PATCH", `/api/servers/${encodeURIComponent(id)}`, patch);
    return answer2.server;
  }
  async deleteServer(id) {
    await this.request("DELETE", `/api/servers/${encodeURIComponent(id)}`);
  }
  async startServer(id) {
    await this.request("POST", `/api/servers/${encodeURIComponent(id)}/start`);
  }
  async stopServer(id) {
    await this.request("POST", `/api/servers/${encodeURIComponent(id)}/stop`);
  }
  async restartServer(id) {
    await this.request("POST", `/api/servers/${encodeURIComponent(id)}/restart`);
  }
  /** Re-list the port's listeners and stop what is not the panel's own tree. */
  async freePort(id) {
    return await this.request("POST", `/api/servers/${encodeURIComponent(id)}/free-port`);
  }
};
async function verifyToken(baseUrl, token, timeoutMs = 5e3) {
  try {
    await new PanelClient({ baseUrl, token, timeoutMs }).listServers();
    return true;
  } catch {
    return false;
  }
}

// src/home-hosted/runtime.ts
import http from "node:http";
import https from "node:https";
import process6 from "node:process";
function readRuntime(home) {
  const raw = readJson(runtimeFile(home));
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
    process6.kill(pid, 0);
    return true;
  } catch {
    return false;
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

// src/home-hosted/token.ts
import { randomBytes } from "node:crypto";
import path9 from "node:path";
function storedTokenPath(stateDir) {
  return path9.join(stateDir, "panel-token");
}
function readStoredToken(stateDir) {
  const text = readText(storedTokenPath(stateDir))?.trim();
  return text !== void 0 && text.length > 0 ? text : null;
}
function storeToken(stateDir, token) {
  writeFileAtomic(storedTokenPath(stateDir), `${token}
`, 384);
}
function generateToken() {
  return randomBytes(32).toString("base64url");
}
function apiTokenEnrolled(home) {
  const secrets = readJson(secretsFile(home));
  return secrets !== null && secrets.apiToken !== null && secrets.apiToken !== void 0;
}
async function ensureToken(options) {
  const stored = readStoredToken(options.stateDir);
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
  const result = await options.exec(["--home", options.home, "set-token"], { HHOSTED_TOKEN: token });
  if (result.code !== 0) {
    return {
      token: null,
      enrolled: false,
      detail: `could not enrol an API token: ${result.stderr.trim() || result.stdout.trim() || `exit ${String(result.code)}`}`
    };
  }
  storeToken(options.stateDir, token);
  return { token, enrolled: true, detail: "enrolled a new panel API token" };
}

// src/service.ts
var ENTRY_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
var HomeHostedError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "HomeHostedError";
  }
};
var HomeHostedService = class extends Service {
  constructor(ctx, options) {
    super(ctx, "homeHosted");
    this.options = options;
    this.snapshotsFile = path10.join(options.stateDir, "snapshots.json");
  }
  clientCache = null;
  launchCache = null;
  tokenDetail = "";
  snapshotsFile;
  // -------------------------------------------------------------------------
  // Facts
  // -------------------------------------------------------------------------
  runtime() {
    return readRuntime(this.options.home);
  }
  /** The entry id this very process was started as, when the panel supervises us. */
  selfEntryId() {
    const id = process7.env.HHOSTED_SERVER_ID;
    return id !== void 0 && id.length > 0 ? id : null;
  }
  /** What the config's `meta.writtenBy` names: the panel release when we can read it. */
  writtenBy() {
    return this.runtime()?.version ?? "dsh-home-hosted";
  }
  webServer() {
    const service = this.ctx.get("webServer");
    const port = typeof service?.port === "number" ? service.port : null;
    const host = typeof service?.host === "string" ? service.host : "127.0.0.1";
    return { port, host };
  }
  async launch() {
    if (this.launchCache !== null && this.launchCache.until > Date.now())
      return this.launchCache.value;
    const value = await resolveHomeHostedLaunch(this.options.homeHostedCommand);
    this.launchCache = { value, until: Date.now() + 6e4 };
    return value;
  }
  async cliExec(args, env) {
    if (this.options.execCli !== void 0)
      return await this.options.execCli(args, env);
    const launch = await this.launch();
    if (launch === null)
      throw new HomeHostedError("the home-hosted executable was not found on PATH", "CLI_NOT_FOUND");
    return await run(launch.program, [...launch.args, ...args], { env, timeoutMs: 3e4 });
  }
  // -------------------------------------------------------------------------
  // Panel
  // -------------------------------------------------------------------------
  async panelStatus() {
    const runtime = this.runtime();
    const stored = readStoredToken(this.options.stateDir);
    const enrolledOnDisk = apiTokenEnrolled(this.options.home);
    const reachable = runtime !== null && (pidAlive(runtime.pid) || await probePanel(runtime.url));
    const answered = runtime !== null && await probePanel(runtime.url);
    const token = stored !== null ? "enrolled" : enrolledOnDisk ? "present" : "absent";
    const writeVia = answered && stored !== null ? "api" : "file";
    return {
      home: this.options.home,
      reachable: answered,
      url: runtime?.url ?? null,
      version: runtime?.version ?? null,
      pid: runtime?.pid ?? null,
      writeVia,
      token,
      detail: answered ? stored !== null ? this.tokenDetail || "the panel is answering and this plugin holds a token" : enrolledOnDisk ? "the panel is answering, but home-hosted already holds an API token this plugin does not have" : "the panel is answering; a token will be enrolled on the first write" : runtime === null ? "no run.json: the panel is not running, so entries are written straight to servers.config.json" : reachable ? "the panel process is alive but is not answering" : "the panel is not running"
    };
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
    const client = new PanelClient({ baseUrl: runtime.url, token: ensured.token });
    this.clientCache = { client, until: Date.now() + 3e4 };
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
  snapshots() {
    return readJson(this.snapshotsFile) ?? {};
  }
  saveSnapshots(snapshots) {
    writeJsonAtomic(this.snapshotsFile, snapshots, 384);
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
    const read = readConfig(this.options.home);
    for (const entry of read.raw?.servers ?? [])
      map.set(entry.id, { view: { id: entry.id, status: "unknown", pid: null, url: null, config: entry }, config: entry });
    return map;
  }
  async createEntry(intent, patch, live) {
    if (intent.id !== this.options.defaultEntryId)
      return null;
    const dsh = await resolveDshLaunch();
    const { port, host } = this.webServer();
    const generated = buildDshEntry({
      id: intent.id,
      port,
      host,
      profile: process7.env.DSH_PROFILE ?? "web",
      dshHome: process7.env.DSH_HOME ?? dshHome(),
      launch: dsh
    });
    return { ...live ?? generated, ...generated, ...patch };
  }
  async writeOwned(intent) {
    const live = (await this.liveEntries()).get(intent.id) ?? null;
    const snapshots = this.snapshots();
    if (snapshots[intent.id] === void 0) {
      snapshots[intent.id] = live === null ? { id: intent.id } : snapshotOwned(live.config);
      this.saveSnapshots(snapshots);
    }
    const patch = ownedPatch(intent, live?.config ?? null);
    const client = await this.tryClient();
    if (client !== null) {
      if (live !== null) {
        await client.updateServer(intent.id, patch);
        return;
      }
      const entry2 = await this.createEntry(intent, patch, null);
      if (entry2 === null) {
        throw new HomeHostedError(
          `no server "${intent.id}" exists; create it first, then this plugin can adopt its autostart and conflict policy`,
          "ENTRY_MISSING"
        );
      }
      await client.createServer(entry2);
      return;
    }
    const read = readConfig(this.options.home);
    if (read.error !== null)
      throw new HomeHostedError(read.error, "CONFIG_UNREADABLE");
    let raw = read.raw ?? {};
    if (findEntry(raw, intent.id) !== null) {
      writeConfig(this.options.home, patchEntry(raw, intent.id, patch), this.writtenBy());
      return;
    }
    const entry = await this.createEntry(intent, patch, null);
    if (entry === null)
      throw new HomeHostedError(`no server "${intent.id}" exists in ${this.options.home}/servers.config.json`, "ENTRY_MISSING");
    if (await this.panelRunning()) {
      writeConfig(this.options.home, upsertEntry(raw, { ...entry, autostart: false }), this.writtenBy());
      raw = readConfig(this.options.home).raw ?? raw;
      writeConfig(this.options.home, patchEntry(raw, intent.id, { autostart: intent.autostart }), this.writtenBy());
      return;
    }
    writeConfig(this.options.home, upsertEntry(raw, entry), this.writtenBy());
  }
  async panelRunning() {
    const runtime = this.runtime();
    return runtime !== null && (pidAlive(runtime.pid) || await probePanel(runtime.url));
  }
  async applyIntents(intents, adopt = false) {
    for (const raw of intents) {
      if (!ENTRY_ID_PATTERN.test(raw.id))
        throw new HomeHostedError(`"${raw.id}" is not a valid server id`, "INVALID_ID");
      const intent = {
        id: raw.id,
        autostart: raw.autostart === true,
        onPortConflict: raw.onPortConflict ?? "kill",
        stopKillPortHolders: raw.stopKillPortHolders !== false
      };
      await this.writeOwned(intent);
      const current = this.options.settings.get();
      const entries = current.entries.filter((entry) => entry.id !== intent.id);
      entries.push(intent);
      this.options.settings.update({ entries });
    }
    return await this.entriesStatus();
  }
  async restoreEntry(id) {
    const live = (await this.liveEntries()).get(id) ?? null;
    if (live === null)
      throw new HomeHostedError(`no server "${id}" exists`, "ENTRY_MISSING");
    const snapshots = this.snapshots();
    const patch = restorePatch(live.config, snapshots[id] ?? null);
    const client = await this.tryClient();
    if (client !== null)
      await client.updateServer(id, patch);
    else {
      const read = readConfig(this.options.home);
      if (read.error !== null || read.raw === null)
        throw new HomeHostedError(read.error ?? "the config file is unreadable", "CONFIG_UNREADABLE");
      writeConfig(this.options.home, patchEntry(read.raw, id, patch), this.writtenBy());
    }
    delete snapshots[id];
    this.saveSnapshots(snapshots);
    const current = this.options.settings.get();
    this.options.settings.update({ entries: current.entries.filter((entry) => entry.id !== id) });
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
  ladder() {
    if (this.options.createLadder !== void 0)
      return this.options.createLadder();
    return createBootLadder({ env: process7.env });
  }
  async bootSpec() {
    const launch = await this.launch();
    if (launch === null)
      return null;
    const runtime = this.runtime();
    return buildHomeHostedBootSpec(
      {
        home: this.options.home,
        projectDir: process7.env.HHOSTED_PROJECT ?? runtime?.projectDir ?? null,
        version: runtime?.version ?? null
      },
      launch,
      { stateDir: this.options.stateDir }
    );
  }
  async bootStatus(mechanism) {
    const platform = process7.platform === "linux" ? "linux" : process7.platform === "darwin" ? "darwin" : process7.platform === "win32" ? "win32" : "other";
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
        detail: "the home-hosted executable was not found on PATH, so no boot entry can be generated",
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
      throw new HomeHostedError("the home-hosted executable was not found on PATH", "CLI_NOT_FOUND");
    const result = await this.ladder().install(spec, mechanism);
    if (result.ok) {
      this.options.settings.update({
        autostart: {
          enabled: true,
          mechanism: mechanism ?? result.mechanism ?? this.options.settings.get().autostart.mechanism
        }
      });
    }
    return { result, status: await this.bootStatus(mechanism) };
  }
  async uninstallBoot(mechanism) {
    const spec = await this.bootSpec();
    if (spec === null)
      throw new HomeHostedError("the home-hosted executable was not found on PATH", "CLI_NOT_FOUND");
    const result = await this.ladder().uninstall(spec, mechanism);
    if (result.ok)
      this.options.settings.update({ autostart: { ...this.options.settings.get().autostart, enabled: false } });
    return { result, status: await this.bootStatus(mechanism) };
  }
  /**
   * Re-assert an entry that is already installed: a node or CLI upgrade moves the
   * paths a unit was written with, and the fix is to rewrite it.
   *
   * Never installs one that is not there. Installing is a deliberate act — it can
   * need root and it makes this machine start something at boot — so it happens on
   * an explicit click or an approved tool call, not as a side effect of startup.
   */
  async reconcile() {
    if (!this.options.settings.get().autostart.enabled)
      return;
    const status = await this.bootStatus();
    if (status.state !== "enabled-failing" && status.state !== "installed-disabled")
      return;
    const fileBacked = status.mechanism === "systemd-user" || status.mechanism === "systemd-system" || status.mechanism === "xdg-autostart" || status.mechanism === "launchd-agent" || status.mechanism === "launchd-daemon";
    if (fileBacked && (status.unitPath === null || !fs9.existsSync(status.unitPath)))
      return;
    try {
      await this.installBoot();
    } catch {
    }
  }
  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------
  async status() {
    const client = await this.tryClient();
    const panel = await this.panelStatus();
    let servers = [];
    let lastError = null;
    if (client !== null) {
      try {
        servers = await client.listServers();
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    } else if (panel.reachable) {
      lastError = panel.detail;
    }
    return {
      panel,
      boot: await this.bootStatus(),
      entries: await this.entriesStatus(),
      servers,
      settings: this.options.settings.get(),
      lastError
    };
  }
  // -------------------------------------------------------------------------
  // Endpoint dispatch
  // -------------------------------------------------------------------------
  async call(endpoint, payload) {
    const input = payload ?? {};
    switch (endpoint) {
      case "status":
        return await this.status();
      case "settings.update": {
        const patch = input.patch ?? {};
        this.options.settings.update(patch);
        return await this.status();
      }
      case "servers.list":
        return await (await this.requireClient()).listServers();
      case "servers.get":
        return await (await this.requireClient()).getServer(String(input.id));
      case "servers.create": {
        const entry = input.entry;
        if (typeof entry?.id !== "string" || !ENTRY_ID_PATTERN.test(entry.id))
          throw new HomeHostedError("a server entry needs an id matching ^[a-z0-9][a-z0-9_-]*$", "INVALID_ID");
        return await (await this.requireClient()).createServer(entry);
      }
      case "servers.update":
        return await (await this.requireClient()).updateServer(String(input.id), input.patch ?? {});
      case "servers.delete": {
        const id = String(input.id);
        if (id === this.selfEntryId()) {
          throw new HomeHostedError(
            `"${id}" is the entry this very process runs as, and deleting it stops this session; pause it (autostart off) or restore it instead`,
            "SELF_ENTRY"
          );
        }
        await (await this.requireClient()).deleteServer(id);
        return { id };
      }
      case "servers.start":
        await (await this.requireClient()).startServer(String(input.id));
        return await this.entriesStatus();
      case "servers.stop":
        await (await this.requireClient()).stopServer(String(input.id));
        return await this.entriesStatus();
      case "servers.restart":
        await (await this.requireClient()).restartServer(String(input.id));
        return await this.entriesStatus();
      case "servers.freePort":
        return await (await this.requireClient()).freePort(String(input.id));
      case "entries.apply": {
        const intents = Array.isArray(input.intents) ? input.intents : [];
        return await this.applyIntents(intents, input.adopt === true);
      }
      case "entries.restore":
        return await this.restoreEntry(String(input.id));
      case "boot.install":
        return await this.installBoot(input.mechanism);
      case "boot.uninstall":
        return await this.uninstallBoot(input.mechanism);
      case "boot.verify":
        return await this.bootStatus();
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
              const message = error instanceof Error ? error.message : String(error);
              return answer(body.endpoint, { ok: false, error: { code, message } });
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
        void dispose();
      };
    }, "dsh-home-hosted: rpc route");
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
    onPortConflict: value?.onPortConflict ?? base.onPortConflict,
    stopKillPortHolders: typeof value?.stopKillPortHolders === "boolean" ? value.stopKillPortHolders : base.stopKillPortHolders
  };
}
function normalize(raw, fallbackEntryId) {
  const entries = Array.isArray(raw?.entries) ? raw.entries.map((intent) => normalizeIntent(intent, fallbackEntryId)) : [];
  const allow = Array.isArray(raw?.agentTools?.allow) ? raw.agentTools.allow.filter(knownTool) : DEFAULT_SETTINGS.agentTools.allow;
  return {
    autostart: {
      enabled: raw?.autostart?.enabled === true,
      mechanism: raw?.autostart?.mechanism ?? "auto"
    },
    entries,
    agentTools: {
      enabled: raw?.agentTools?.enabled === true,
      allow: allow.length > 0 ? allow : [...DEFAULT_SETTINGS.agentTools.allow]
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
      autostart: { ...this.current.autostart, ...patch.autostart ?? {} },
      entries: patch.entries ?? this.current.entries,
      agentTools: { ...this.current.agentTools, ...patch.agentTools ?? {} }
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
var TOOL_SPECS = {
  status: {
    endpoint: "status",
    description: "Report the home-hosted panel state, its boot-autostart entry, and the entries this plugin manages.",
    parameters: {}
  },
  servers_list: {
    endpoint: "servers.list",
    description: "List every server home-hosted supervises, with status, pid and url.",
    parameters: {}
  },
  servers_start: {
    endpoint: "servers.start",
    description: "Start a server supervised by home-hosted.",
    parameters: { id: { type: "string", required: true, description: "Server entry id" } }
  },
  servers_stop: {
    endpoint: "servers.stop",
    description: "Stop a server supervised by home-hosted.",
    parameters: { id: { type: "string", required: true, description: "Server entry id" } }
  },
  servers_restart: {
    endpoint: "servers.restart",
    description: "Restart a server supervised by home-hosted. Restarting the entry this session runs as will end the session.",
    parameters: { id: { type: "string", required: true, description: "Server entry id" } }
  },
  servers_create: {
    endpoint: "servers.create",
    description: "Add a server entry to home-hosted. The entry runs a command on this machine under the panel's supervision.",
    parameters: { entry: { type: "json", required: true, description: "A full home-hosted server entry, including its id and command" } }
  },
  servers_update: {
    endpoint: "servers.update",
    description: "Change fields of an existing home-hosted server entry.",
    parameters: {
      id: { type: "string", required: true, description: "Server entry id" },
      patch: { type: "json", required: true, description: "Fields to change" }
    }
  },
  servers_delete: {
    endpoint: "servers.delete",
    description: "Stop and remove a home-hosted server entry. Refused for the entry this session runs as.",
    parameters: { id: { type: "string", required: true, description: "Server entry id" } }
  },
  autostart_install: {
    endpoint: "boot.install",
    description: "Install the OS entry that starts home-hosted at boot or login.",
    parameters: { mechanism: { type: "string", description: "Explicit mechanism, e.g. systemd-user; omit to pick the best available one" } }
  },
  autostart_uninstall: {
    endpoint: "boot.uninstall",
    description: "Remove the OS entry that starts home-hosted at boot or login.",
    parameters: { mechanism: { type: "string", description: "Explicit mechanism; omit to use the installed one" } }
  }
};
function toolNameFor(name2) {
  return `home_hosted_${name2}`;
}
function registerOne(ctx, service, name2) {
  const spec = TOOL_SPECS[name2];
  const toolName = toolNameFor(name2);
  const mutating = MUTATING_AGENT_TOOLS.includes(name2);
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
      if (mutating) {
        const approval = ctx.get("approval");
        if (approval?.request === void 0)
          return "refused: this deployment has no approval service, so a mutating home-hosted tool cannot run.";
        const outcome = await approval.request({
          agent: exec?.agent,
          toolName,
          reason: `${spec.description} (${JSON.stringify(input)})`
        });
        if (outcome !== "allowed-once")
          return `refused: approval answered "${outcome}".`;
      }
      try {
        const payload = name2 === "servers_create" ? { entry: input.entry } : name2 === "servers_update" ? { id: input.id, patch: input.patch } : name2 === "status" || name2 === "servers_list" ? {} : { id: input.id, mechanism: input.mechanism };
        const value = await service.call(spec.endpoint, payload);
        return JSON.stringify(value, null, 2);
      } catch (error) {
        return `failed: ${error instanceof Error ? error.message : String(error)}`;
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
          disposers.push(registerOne(scoped, service, name2));
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

// src/index.ts
var name = "dsh-home-hosted";
var inject = [];
function apply(ctx, config) {
  const resolved = {
    stateDir: config?.stateDir,
    homeHostedCommand: config?.homeHostedCommand,
    defaultEntryId: config?.defaultEntryId ?? "dsh"
  };
  const stateDir = pluginStateDir(resolved.stateDir);
  ensureDir(stateDir, 448);
  const settings = new SettingsStore(path11.join(stateDir, "settings.json"), resolved.defaultEntryId);
  const service = new HomeHostedService(ctx, {
    home: homeHostedHome(),
    stateDir,
    homeHostedCommand: resolved.homeHostedCommand,
    defaultEntryId: resolved.defaultEntryId,
    settings
  });
  registerRpc(ctx, service);
  registerAgentTools(ctx, service, settings);
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
