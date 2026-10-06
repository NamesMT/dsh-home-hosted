# Boot autostart

How the panel comes back after a reboot, and the account it comes back as.

Related: [the panel](PANEL.md) · [server entries](ENTRIES.md)

## A plugin cannot act at boot

The plugin runs inside dsh. At boot nothing runs yet, so autostart cannot be a runtime behaviour: the
plugin installs an OS entry while dsh runs, and the OS starts home-hosted from then on. Every plugin
start re-asserts that entry (rewrite-if-changed), which is also what repairs a node path that moved
after an upgrade.

## One boot artifact per state root

The boot artifact name follows the state root too, keyed on the *machine* default: `home-hosted` only
for `~/.dsh/dsh-home-hosted`, `home-hosted-<hash>` otherwise. Keying it on the running process's
`$DSH_HOME` would name every install's default state dir `home-hosted` and reintroduce the collision.
An install that used to write the old name retires it once its own artifact is in place, and only an
artifact carrying this plugin's marker is ever removed.

## Boot entries run the panel as a person

Two mechanisms drop privilege by name — a systemd `User=` and a launchd `UserName` — and both used to
take that name from `$USER`. That is right in the common case and wrong in the one case it exists for:
`sudo` and `pkexec` rewrite `USER`, `LOGNAME` and `HOME` to the *target* account, so a panel started
from a root shell read `USER=root`, and a mechanism that already runs as root got an entry that either
repeated root or, with the name dropped, silently kept it. `os.userInfo()` is no help: it reports the
euid.

So the account comes from whoever this process is. An elevating tool's `SUDO_UID`/`PKEXEC_UID` is an
instruction and is used while it resolves, so a stale value inherited from an ancestor cannot collapse
the entry to root; otherwise this session's own login — its database row, else the row for this uid;
otherwise the owner of the state root or the panel root, which names the person a root-launched panel
belongs to; and only then, honestly, root. The uid is the fact and `$UID` is a claim: a shell variable
rather than an exported one, so when it is present at all it was inherited. It is read only when the
platform gives no uid, and it also feeds the launchd domain (`gui/$UID`).

Two answers are refused rather than written, and both fail loudly:

- **`User=root`**, because an entry with no `User=` already runs as root — naming it only dresses up the
  silent default this change exists to surface;
- **a name the user database cannot place.** systemd matches names case-sensitively and cannot resolve
  what it does not know, so `User=<such a name>` makes the unit refuse to start (`status=217/USER`) and
  `Restart=always` turns that into a crash-loop that never mentions the account. An LDAP or NIS login
  has no `/etc/passwd` row, so those operators set `User=` themselves; the warning says so.

`HOME` is written into every spec, because `Environment=HOME=` **overrides `User=`** — verified on real
systemd. So it has to be the account's home: left at the installer's it is root's under `sudo`, and the
panel would run as the person with `~` pointing at `/root`, dying with a permission error that never
mentions its own user. It is written only when it differs, so an unchanged install stays byte-identical
and startup `reconcile()` does not rewrite the entry. When an account resolves but its home is not
knowable, the line is **omitted** instead: systemd then supplies the right one from NSS.

An installed entry that already runs as the wrong account is reported by `status()`, and the
`enabled-failing` repair heals it by installing again. A *working* entry is deliberately left alone:
re-installing stops the panel and hands it to the entry, which is a person's decision.

## KillMode=process: a restart must not take the entries with it

`persistent: true` puts an entry under a nanny the panel spawns, and the nanny is what makes it outlive
the panel: it owns the child's pipes, so a panel stop, restart or kill cannot break them. The nanny is
spawned `detached`, which gives it its own session — but *not* its own cgroup, and systemd's default
`KillMode=control-group` signals every process in the unit's cgroup. So a `systemctl stop`/`restart` —
which is what this plugin's own activation, and any `Restart=always`, runs — takes the nanny down with
the panel, quietly falsifying the guarantee the design depends on. `KillMode=process` signals the unit's
main process alone.

That main process is the generated launcher, not the panel, so the launcher has to hand a signal on: it
`spawn`s the CLI and forwards `SIGTERM`/`SIGINT`/`SIGQUIT`/`SIGHUP` to it, then exits with the child's
outcome. A `spawnSync` launcher cannot do this — it is blocked in the syscall when the signal lands, so
the signal kills the launcher and orphans the panel while the unit exits and `Restart=` loops on
"already running". The generated launchers are covered by an execution test that signals the real
artifact and asserts the panel received the stop.

An ordinary entry is spawned `detached` too, so the same applies to every supervised server and not only
the nannies: the panel re-adopts a survivor by its port, which is what makes keeping them the right
answer rather than a leak. It belongs on both units.

## macOS: agent or daemon

A `LaunchAgent` starts at login; starting before login means a `LaunchDaemon` in
`/Library/LaunchDaemons`, which is root-owned and needs a one-time `sudo`. The daemon is therefore
offered even when this process cannot elevate: install stages the plist and returns the three commands
to run. The daemon plist names the invoking user in `UserName`, Apple's sanctioned way to avoid running
the panel as root — resolved by the rule above, never from `$USER`. The recommendation still prefers a
mechanism this process can install on its own so "Automatic" stays a single click.

Reachable launchd is not a requirement: a plist in `~/Library/LaunchAgents` is loaded at the next login
whether or not the process that wrote it can reach `gui/$UID` (SSH sessions often cannot). So the agent
stays `available` and its install reports "loads at the next login" instead of refusing; only the
`bootstrap`/`enable`/`print` steps need the domain, and they are skipped when it is unreachable. The
daemon scope still needs root for `/Library/LaunchDaemons`.

## Escaping is per setting, not per file

A unit file is read by systemd, not by a shell, and its settings do not share one
escaping rule. `ExecStart=` **is** unescaped (`\\`, `\"`, and `$`/`%` are special), which
is why its words are quoted and a literal `$` or `%` is doubled. `WorkingDirectory=`
and `Description=` are taken **verbatim**: measured with `systemctl show -p
WorkingDirectory --value`, every backslash written came straight back, so doubling one
turned a directory named `a\b` into `a\\b` and the unit died with
`status=200/CHDIR`. Only `%` is special there — `%%` is a literal percent, and an
unknown specifier such as `%i` in a system unit is fatal.

The one hazard they *do* share is the line continuation: a setting whose value ends in
a backslash continues onto the next line, so a `WorkingDirectory=` ending in `\`
swallowed the `KillMode=process` line under it. The generator appends a trailing space
in that case — systemd strips surrounding whitespace before expanding the value, so the
path is unchanged and the next directive survives.

The same two-layer mistake is possible in every format this plugin writes, and it is why
each generator is exercised against the real parser (`systemd-analyze verify`, `plutil`,
`desktop-file-validate`, and a `gio launch` for the XDG entry) rather than only against
its own expectations.

### A `.desktop` line has two parsers, in order

The XDG entry is the one format that is genuinely read twice, and the first reader is
easy to forget. `GKeyFile` consumes the line — `\n`, `\t`, `\r`, `\s` and `\\` are its
escapes, and **a backslash that is none of those makes it refuse the key outright** —
and only then does the desktop session split `Exec=` with `g_shell_parse_argv` and
unquote each word. So a value is escaped for the key file *and* for the shell, and the
key-file layer runs first.

Escaping only for the shell therefore failed in a way that is invisible to
`desktop-file-validate`, which reports such a file as clean: a lone `\` anywhere in a
`Path=` or `Exec=` word (`C:\Users\…`, or any POSIX directory whose name has one) made
`g_key_file_get_string` fail with "Key file contains key … which has a value that cannot
be interpreted", the entry never loaded, and a `\$`, `` \` `` or `\"` did the same. A
backslash run was also lossy, because the key-file layer ate half of it: `a\b` came back
as `ab`. And since `desktop-file-validate` is not the loader, the entry failing to start
was the first sign.

`desktopValueEscape` is that missing first layer, `desktopValue` applies it to the plain
keys (`Path=`, `Name=`, `Comment=`), and `Exec=` applies it on top of its shell quoting.
Every ownership check reads the escaped marker too, or a marker carrying a backslash would
be written escaped and searched for raw — and the plugin would call its own entry foreign.

## Enabling autostart hands the panel over

An install alone proves nothing. The panel the plugin started keeps running, so nothing shows whether
the entry would ever start one — and the CLI refuses to start a second panel while `run.json` names a
live pid, so `enable --now` on a freshly written unit leaves it *failed* while an orphan panel holds the
port. So a successful install hands the running panel to the entry: the panel stops, and the entry
starts it. That is the only way to know autostart works rather than merely that a file was written.

The stop takes the panel's servers with it, and this plugin is usually one of them, so the work goes to
a generated detached helper (`bin/panel-activate.mjs`) that outlives the process. Its order is the
whole design:

1. prove the start can work — the unit file the plugin wrote exists and `systemctl is-enabled` agrees —
   while the panel is still up, because a start that could never work must not be attempted once the
   old panel is gone. It proves *installed and enabled*, never *already active*: `enable --now` has
   just started the unit while the panel still holds `run.json`, and home-hosted refuses a second
   panel, so the unit is `activating` or `failed` at exactly the moment this runs;
2. on a switch, stop the panel through the *previous* mechanism (`systemctl stop`, `launchctl kill`):
   its own restart policy (`Restart=always`, `KeepAlive`) would bring the panel back the moment `down`
   returned, racing the new entry;
3. stop it with the CLI's `down`, then wait for the pid, escalating to SIGTERM and SIGKILL;
4. start the entry;
5. only then remove the other mechanisms' entries.

The stop is always the CLI's `down`, never the new mechanism's own `restart`: the entry would then be
starting a *second* panel, which home-hosted refuses while `run.json` names a live pid, so a
restart-in-place over an orphan only produces a failed unit. Waiting on the pid matters for the same
reason.

Retirement is last, and deliberately not part of `install()`. Switching mechanism has to uninstall the
old one, but the old entry is often what is currently running the panel: removing it during the install
would stop the panel — and this plugin — before the new entry was ever told to start. So the ladder
carries the other mechanisms' removal steps in the activation plan, and each provider's
`retireCommands()` is the no-`--now` form for the same reason. launchd has no unload-without-stopping,
so its retirement is only safe once the panel is down and the new entry is up.

Retirement re-proves ownership before it removes anything. `status()` reports a systemd unit as
installed from its *name* alone, and `home-hosted` is the generic name the machine-default install
uses, so a unit somebody else wrote anywhere on the search path would otherwise be `disable`d and
deleted by a switch. The marker check is what makes "only an artifact carrying this plugin's marker is
ever removed" true here too.

A mechanism that cannot start anything now answers `activate() → null`: a `Run` value and a `.desktop`
file are read by the shell or the session at login. Nothing is stopped then — leaving a working panel
up beats killing it for an entry that would not bring it back. A handover that could not be spawned is
reported with the exact commands, and the panel is still up.

Those displayed commands are the ones the helper would actually run, never a daemon-shaped rewrite: an
agent's `bootout` is unprivileged and names its own `gui/<uid>` domain, so a person copying the
fallback gets a command that works.

Enabling and switching differ only in the retirement: a switch already has an entry keeping the panel
alive, so its plan carries the old mechanism's removal.

## Where the entry's own output goes

A boot-run panel's output does **not** go to the panel's own console
(`<home>/.hh/.logs/home-hosted.log`, which `panel_logs` reads and `docs/PANEL.md` describes).
Each mechanism sends it somewhere different, and the status line now names where:

| mechanism | where the output goes |
| --- | --- |
| `systemd-user` / `systemd-system` | the journal — the unit sets no `StandardOutput=`, so the detail names `journalctl --user -u <unit>` or `journalctl -u <unit>` |
| `launchd-agent` / `launchd-daemon` | `<logDir>/<label>.out.log` and `<label>.err.log`, the two paths the generated plist carries |
| `xdg-autostart` | nowhere persistent: a `.desktop` entry with `Terminal=false` has its output discarded by the session |
| `windows-run` / `windows-task` | nowhere persistent either |

So the hint appears only where a file or a query actually exists — and only once the entry is
installed, because naming a log for an entry that was never written sends someone to a
command that finds nothing. The launchd paths come from one computation
(`launchdLogPaths`), shared with the plist builder, so the plist and the status line cannot
name different files.

## What counts as "failing"

A unit's state comes from `systemctl show -p Result`. The value is compared against systemd's own
failure enum — `failed`, `exit-code`, `signal`, `timeout`, `core-dump`, `watchdog`,
`start-limit-hit`, `oom-kill` — and anything else, `success` included, is not a failure. `oom-kill`
is the one worth reading correctly: it is what a container limit or the OOM killer produces, and a
unit that died that way reading as merely "disabled" is how someone stops looking for it.

## The page says what a mechanism name means

The picker's values are the identifiers the setting stores — `systemd-system`, `systemd-user`,
`xdg-autostart`, `launchd-agent` — and they are not self-explanatory, so the page prints the host's own
one-line reason for the chosen one ("systemd is not the init system here (no /run/systemd/system)", "a
LaunchAgent loads at login, not at boot", "this needs root here, so the plugin stages the plist and
shows the sudo commands"). Those sentences come from `BootCandidate.reason`, which the host already
computed for every mechanism, available or not.

Because `auto` is not a mechanism but "let the host decide", the page also names what that decision
would be: `BootStatus.recommended` is the host's own `recommend()` answer, and `install()` falls through
to it when nothing is installed (`pickOf(mechanism ?? before.mechanism ?? before.recommended)`). So
"Automatic" says which mechanism the next install would use, instead of leaving a person to install it
and read the result. The sentence is only shown while nothing is installed under that mechanism, and it
is absent — never "undefined" — when an older panel does not send the field.

The `Details` block describes the mechanism that is actually **installed**, which is a different one
while a switch is pending, so both it and the picker read one shared lookup rather than each formatting
the name their own way.

## Privilege

Boot scope needs privilege somewhere on every platform: a system unit, or `loginctl enable-linger` on
Linux; a LaunchDaemon on macOS; an elevated task on Windows. Login scope needs none. When this process
cannot elevate, the page shows the exact commands instead of prompting for a password — a headless
panel has no askpass and `sudo -n` is the only honest probe.

That refusal is shown with the status it answered, and the page retires it as soon as the status moves:
a person runs the commands and presses Re-check. The persisted last attempt follows the same rule, so a
failed install is not re-shown once an entry exists.

Switching those entries to a `User=` later is not just a unit edit. The moment a panel runs as root,
everything it writes — `<home>/.hh`, its workspaces, logs and `snapshots.json` — is root-owned, so the
unprivileged account the unit now names cannot write its own state and the panel fails to boot with a
permission error that never mentions ownership. Moving an install from root to a user therefore needs
`chown -R <user> <home>` (and the plugin state dir) first.
