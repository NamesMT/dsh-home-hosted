# Design notes

Decisions that are not obvious from the code, and the hazards behind them.

## A plugin cannot act at boot

The plugin runs inside dsh. At boot nothing runs yet, so autostart cannot be a
runtime behaviour: the plugin installs an OS entry while dsh runs, and the OS
starts home-hosted from then on. Every plugin start re-asserts that entry
(rewrite-if-changed), which is also what repairs a node path that moved after an
upgrade.

## Which home-hosted runs

The plugin depends on `home-hosted` at a pinned range and prefers it by default,
so the panel is the version the plugin was built against. The preference is a
setting (Options → which home-hosted to run); a global install is a supported
choice, and the page shows both candidates with their versions and can install
the pinned range globally. An operator's `homeHostedCommand` in the plugin row
always wins — that is an instruction, not a preference.

The range is stated twice and both must agree: `dependencies['home-hosted']` in
`package.json` (what gets installed) and `EXPECTED_RANGE` in
`src/home-hosted/resolve.ts` (what the page offers to install globally, and warns
about when a global copy is older). Bumping one alone makes the page recommend a
range the plugin is not built against. A bump is therefore those two plus the
version-coupled tests — *unless* the release moved something this plugin names: a
path under `.hh`, `CONFIG_SCHEMA`, `serverSchema`, `/api/settings`, or a CLI
subcommand. 0.7.2 (the panel's reverse proxy, all of it under `.hh/.proxy/`) moved
none of them.

That copy resolves to a pnpm path carrying a version and a peer hash
(`…/.pnpm/home-hosted@0.6.1_zod@4.6.5/node_modules/home-hosted/…`), which moves
on the next install and disappears when the profile is rebuilt. A boot entry that
baked it in would fail exactly when it matters.

So the boot entry runs a generated launcher in the plugin state directory
(`bin/home-hosted.mjs`, rewritten on every plugin start). At boot the launcher
finds the pinned copy again — recorded path, then `$DSH_HOME/profiles/*`
node_modules (flat or pnpm), then PATH — and forwards its argv, so the entry
survives plugin upgrades and profile reinstalls. The plugin preflights the
launcher the way the unit invokes it and shows the version it answers.

## The dsh entry boots the image the plugin was installed on

The panel starts `dsh web` from a server row, so a boot entry never runs dsh
itself. That row points at a second generated launcher (`bin/dsh.mjs`), and the
launcher has to answer "which dsh" without the plugin running. A local build is
the case that broke: a user ran a source checkout while sharing the global
`~/.dsh`, and the panel started a *different* global dsh on the same data
directory, which crashed on the version mismatch. Choosing by highest version,
with the recorded path only as a tie-breaker, is what allowed that.

So the record (`bin/dsh-resolved.json`) carries `pinned` — the image this plugin
was installed on — and the launcher checks it before any version sort. A pin is
carried, never guessed: only a caller that *is* the running image adopts a new one
(`repin`), so an upgrade that lands elsewhere is adopted but a copy found on PATH
never displaces the pin. A build whose path is gone falls back to its recorded
roots, then to real dsh installs, then to a bare build file, and only then PATH.

Candidates are ordered by how they were found, not just by version: a dsh by
construction (a manifest, `node_modules/dsh`, a pnpm store) beats a root that
merely offers `lib/bin.js` (a clone), which beats a `dsh` on PATH — a clone has no
manifest, so it is found by that build-file name, a guess that must never outrank
a real install.

The row's stored command is repaired while the plugin runs (`launcherRepair`),
including a row that names a bare `dsh`: PATH is exactly what pointed at the copy
that stopped working. A row this plugin created has its command replaced; an
adopted row that deliberately runs a different absolute dsh is left alone.

### A project that depends on dsh keeps it, by name

The launcher is the fallback, not the common case. `home-hosted` resolves a bare
command itself (`resolveCommand(command, cwd, projectDir)`) by checking
`node_modules/.bin/<command>` under the row's cwd and then its own project
directory, and only then PATH. So a row whose project installed dsh as a
dependency is written as a bare `dsh` with that project as its cwd: it runs the
copy the project's lockfile chose, through the shim its package manager wrote,
with nothing absolute to move.

That is also why this plugin never shells out to a package manager for it: `npx
dsh` falls back to the registry and to a global when the local bin is missing,
`pnpm dsh` needs pnpm on the boot PATH, and `nlx --local` would add a global tool
to a boot path for a lookup the panel already performs. The launcher is what a row
gets when a bare name would *not* reach the pinned image — a clone run without its
own `.bin`, or a global-only machine.

## One panel root and one boot artifact per state root

Two dsh installs share `~/.dsh` far more often than they should, and each one
installing this plugin used to mean two plugins editing one panel's state and one
autostart unit under one ownership marker — so the second install quietly replaced
the first's boot entry.

A panel root is derived per instance: an explicit `$HHOSTED_HOME` wins, and a
panel already living at `~/.home-hosted` is adopted rather than abandoned (an
upgrade must never make every server look like it vanished), but otherwise the
root is the instance's own `<stateDir>/panel`. A root counts when it is a 0.7 one
(`.hh/workspaces.json` or `.hh/settings.json`), a pre-0.7 one with a
`servers.config.json`, or when a `run.json` in either layout has a live pid — a
killed panel leaves a runtime file behind, and adopting on that would point a
fresh install at somebody's dead root. Adoption is limited to an instance that
already exists (the machine's harness home, or a state dir that already holds
settings): a scratch `DSH_HOME` must not reach over and drive the panel some other
install owns.

The boot artifact name follows the state root too, keyed on the *machine* default:
`home-hosted` only for `~/.dsh/dsh-home-hosted`, `home-hosted-<hash>` otherwise.
Keying it on the running process's `$DSH_HOME` would name every install's default
state dir `home-hosted` and reintroduce the collision. An install that used to
write the old name retires it once its own artifact is in place, and only an
artifact carrying this plugin's marker is ever removed.

## Agent tools are merged and on by default

Seven tools, not ten: `servers_lifecycle` carries start/stop/restart,
`servers_edit` carries create/update/delete, `autostart_manage` carries
install/uninstall, `ui_manage` drives the panel's own UI (`ui-update` /
`ui-revert` / `ui-switch`), and `workspaces_list` is the read-only way to see
every workspace. They are registered on by default; what gates a mutating call is
the session's own permission mode, not a plugin-level default.

A description is read at the approval prompt, so each is one line a person can
glance at: what the tool does, and only the consequence they could not predict
(restarting this session's own entry ends it; installing an entry stops the
panel). Mechanics — which panel is reached how, which workspace a default means —
belong in the argument schemas and the docs.

Structured parameters are declared as objects, never as `type: 'json'`: an
author-only `json` node projects to a schema with no `type` at all, and a real
session then delivers something the handler cannot read — `create`/`update` were
unusable because of it while every test passed, since tests call the handler
directly. A declared object is validated by the runtime before the handler, so a
wrong shape is rejected with the parameter named.

## The dsh entry is the only entry the page manages

One toggle: manage `dsh` as a home-hosted entry, or not. Adding one sends a
minimal intent (`{ id: 'dsh', autostart: true }`) and the host fills the rest from
the platform default policy; removing one restores an entry this plugin merely
adopted, and deletes one it created. Removing an entry the panel supervises stops
that process — which may be the session asking for it.

Deleting on toggle-off is the intended reading, not an oversight: "manage" means
the plugin owns the entry, so switching it off gives the entry back — removed if
created, restored if adopted. Pausing instead would leave an entry nobody manages.
The state that must never happen is the third one: a toggle on with no entry
behind it, which is why the entry is recreated from the intent while the switch is
on.

The generated entry always binds loopback (`bind: 'local'`, `--host 127.0.0.1`):
`dsh` rejects `--host 0.0.0.0` as a usage error, so repeating a running harness's
network bind would produce an entry that can never start.

## The sign-in page points at the log

dsh web's unauthenticated 401 is a plain-text line written by the in-box
connection plugin; it has no config and no event. The plugin wraps that one
internal writer (`connection.browserAuth.writeUnauthorized`) and appends where
the tokenised URL is — `<panel url>/logs?server=<entry>`. It rewrites **only** the
exact stock body, guards every assignment, and replaces the response's `end` for
the single call, so an authentication plugin's own page (or an exotic response)
is passed through untouched rather than fought over. `authNotice` turns it off;
`{url}` is read per 401.

## Persistence keeps dsh alive across a panel restart

A managed entry asks for `persistent: true`: home-hosted then runs it under its
nanny, which owns the child and outlives `stopAll()`/`dispose()` — so restarting
or stopping the *panel* no longer ends a prompt mid-flight. Staying up across a
panel stop is the point, not a side effect: the panel's stop copy says as much,
and 0.7.2 gives the reverse-proxy engine the same treatment ("`down` leaves it
serving"). A `systemctl stop` still takes both with it unless the unit carries
`KillMode=process`, which is why that belongs on every unit this plugin writes —
see below.

## Approvals follow the session's sandbox

A mutating agent tool asks the approval service only when the calling session is
*not* already `danger-full-access` (`ctx.sandboxPolicy.resolve({ session })`).
Asking anyway made a Full-access run fail whenever the deployment's approvals
auto-reject — the session had already granted exactly what the tool was asking
about. Below full access the tool still asks and still fails closed, and the
refusal names the mode and the remedy (Full access, or an answerable approval
channel).

## Config compatibility was dropped, deliberately

`onPortConflict: kill` arrived in home-hosted 0.6.0 and `persistent` in 0.6.3, and
an older panel handed either key can refuse to *boot* from the config. The plugin
used to consult the answering panel's version and refuse or drop them
(`KILL_UNSUPPORTED`). That is gone on purpose: it pins `home-hosted@^0.7.2` and
autostarts its own copy, so a panel older than those keys is only reachable by
deliberately preferring an old global install — and this is pre-1.0. Supporting
older panels again means bringing that check back from history, not re-deriving
it.

## Workspaces: one managed, all reachable

home-hosted 0.7 made a workspace the ownership boundary: each has its own
`servers.config.json`, settings, secrets, logs and nanny state under
`.hh/<workspace>/`, while the listener, auth, TLS, host vitals, backups, UI and
`run.json` stay at `.hh/`. A server id is therefore only unique *inside* a
workspace, and every call has to say which one it means.

The plugin manages exactly one workspace — **the panel's `default`**, fixed —
because its intent (the `dsh` entry, snapshots, reconcile) is a promise about one
entry in one place. Making that a setting bought nothing but a way to write into
the wrong workspace, so it is a constant. The page and the agent tools are not
limited to it: they list every workspace the panel serves
(`workspaces.list`, `/api/workspaces` when it answers, the registry plus the
workspace files when it does not) and act on any of them by naming it
(`workspace` on the payload, `?workspace=` on the API, `.hh/<workspace>/…` on
disk). Only `default` is *reconciled*; another workspace is managed the way a
person would manage it.

Every server-shaped tool call therefore carries an explicit `workspace`, required
in the JSON: it is one argument instead of a paragraph, and it keeps the same call
from meaning different things on two machines. The RPC endpoint still defaults an
absent value (the page always sends one, and a hand-written call should not break),
but a model is never left to guess.

A pre-0.7 root is not read or written at all. It is recognised (a `legacyRoot`
flag on the status), refused on every write, and fixed through one action that
runs `home-hosted migrate --yes` — the same relocation a first 0.7 start does on
its own.

## Several panels on one machine

`home-hosted` can be installed per project, and one install can run several panels
from different `--home` roots. This plugin drives exactly one of them — the state
root it resolved — so a person with two panels used to be indistinguishable from a
person with one.

Discovery is bounded, never a scan of the disk: the managed root (always listed,
even before its first start), `$HHOSTED_HOME`, the operator's `instanceRoots`, and
the `~/.home-hosted*` siblings. Another root counts only when it holds a 0.7
`.hh`, a pre-0.7 `servers.config.json`, or a `run.json` with a live pid. The
inventory is cached (`INSTANCES_CACHE_MS`); the prompt path re-measures a stale
cache in place (`instancesNow()`), because a provider that only read a snapshot
would never notice a panel started while this dsh was already running.

The agent is told rather than left to guess: with more than one panel found, the
`instancesNotice` setting adds one runtime-context line naming the managed panel
and the others (`ctx.systemPrompt.context`, `instances-notice.ts`). Every tool
also takes an optional `instance` (a state root or URL); a mutating call that
names none asks which panel it means, through `ctx.userQuestions`, after the
approval gate so a call the session may not make prompts for nothing. The question
is asked only when a human channel can answer — no answerer, or a delegated child
— and an unexpected ask failure is refused rather than treated as consent, because
changing a panel the user never confirmed is the outcome this exists to prevent.
Its wording is English like every other host-side message: the locale service is a
browser-side seat, and first-party host plugins ask in English too.

A call that names another panel is no dead end. The plugin asks how to reach it,
offering every way that endpoint has, least invasive first:

- `file` edits that panel's workspace config file
  (`.hh/<workspace>/servers.config.json`, its default workspace unless the call
  names another) — no credential, but no live status either, and a running panel
  applies a changed definition at that entry's next start;
- `cli` runs the CLI against its state root — the only runtime path the panel
  itself offers (`start`/`stop`; a restart is a stop then a start, because the CLI
  has no server restart);
- `api` mints a token for that panel, enrols it and uses its HTTP API — the only
  way to get live status, and it replaces any token that panel had, which the
  question says outright.

The endpoint's first mechanism is the default when a caller names none, so a host
that cannot reach a person still does the least invasive thing. A read is the one
silent upgrade: with a token this plugin already holds for that panel it uses the
API, because that carries live status and mints nothing. Every such result ends by
naming the panel and the mechanism it used.

A config edit reaches a running panel through its file watcher, so a newly added
`autostart` entry is written disabled and then flipped — the same two-phase add
the managed path uses. The credential for another panel lives beside the managed
one, under its own slot (`panel-tokens/<slot>.token`, 0600), minted on first use
of that mechanism and never shared with the managed panel's token.

Machine-wide and self-referential endpoints are the exception: `home_hosted_status`
describes the panel this plugin manages (its payload already lists the others), and
the OS boot entry is one entry for that same panel. Those refuse a `home` rather
than ignoring it, so a caller is never left believing it aimed a boot entry at a
panel it did not.

The settings stamp moved to 3 for `instancesNotice`, while the tool-name migration
stays bound to the release that merged the tools: a stamp bump must never re-read
a current file's explicit two-tool allowlist as "nobody chose".

## Boot entries run the panel as a person

Two mechanisms drop privilege by name — a systemd `User=` and a launchd
`UserName` — and both used to take that name from `$USER`. That is right in the
common case and wrong in the one case it exists for: `sudo` and `pkexec` rewrite
`USER`, `LOGNAME` and `HOME` to the *target* account, so a panel started from a
root shell read `USER=root`, and a mechanism that already runs as root got an
entry that either repeated root or, with the name dropped, silently kept it.
`os.userInfo()` is no help: it reports the euid.

So the account comes from whoever this process is. An elevating tool's
`SUDO_UID`/`PKEXEC_UID` is an instruction and is used while it resolves, so a stale
value inherited from an ancestor cannot collapse the entry to root; otherwise this
session's own login — its database row, else the row for this uid; otherwise the
owner of the state root or the panel root, which names the person a root-launched
panel belongs to; and only then, honestly, root. The uid is the fact and `$UID` is
a claim: a shell variable rather than an exported one, so when it is present at all
it was inherited. It is read only when the platform gives no uid, and it also feeds
the launchd domain (`gui/$UID`).

Two answers are refused rather than written, and both fail loudly:

- **`User=root`**, because an entry with no `User=` already runs as root — naming
  it only dresses up the silent default this change exists to surface;
- **a name the user database cannot place.** systemd matches names
  case-sensitively and cannot resolve what it does not know, so `User=<such a
  name>` makes the unit refuse to start (`status=217/USER`) and `Restart=always`
  turns that into a crash-loop that never mentions the account. An LDAP or NIS
  login has no `/etc/passwd` row, so those operators set `User=` themselves; the
  warning says so.

`HOME` is written into every spec, because `Environment=HOME=` **overrides
`User=`** — verified on real systemd. So it has to be the account's home: left at
the installer's it is root's under `sudo`, and the panel would run as the person
with `~` pointing at `/root`, dying with a permission error that never mentions its
own user. It is written only when it differs, so an unchanged install stays
byte-identical and startup `reconcile()` does not rewrite the entry. When an
account resolves but its home is not knowable, the line is **omitted** instead:
systemd then supplies the right one from NSS, which leaving root's in place would
have prevented.

An installed entry that already runs as the wrong account is reported by `status()`,
and the `enabled-failing` repair heals it by installing again. A *working* entry is
deliberately left alone: re-installing stops the panel and hands it to the entry,
which is a person's decision and not a startup side effect.

## KillMode=process: a restart must not take the entries with it

`persistent: true` puts an entry under a nanny the panel spawns, and the nanny is
what makes it outlive the panel: it owns the child's pipes, so a panel stop,
restart or kill cannot break them. The nanny is spawned `detached`, which gives it
its own session — but *not* its own cgroup, and systemd's default
`KillMode=control-group` signals every process in the unit's cgroup. So a
`systemctl stop`/`restart` — which is what this plugin's own activation, and any
`Restart=always`, runs — takes the nanny down with the panel, quietly falsifying
the guarantee the design depends on. `KillMode=process` signals the panel alone.

An ordinary entry is spawned `detached` too, so the same applies to every
supervised server and not only the nannies: the panel re-adopts a survivor by its
port, which is what makes keeping them the right answer rather than a leak.
It belongs on both units.

## macOS: agent or daemon

A `LaunchAgent` starts at login; starting before login means a `LaunchDaemon` in
`/Library/LaunchDaemons`, which is root-owned and needs a one-time `sudo`
install. The daemon is therefore offered even when this process cannot elevate:
install stages the plist and returns the three commands to run. The daemon plist
names the invoking user in `UserName`, Apple's sanctioned way to avoid running
the panel as root — resolved by the rule above, never from `$USER`. The
recommendation still prefers a mechanism this process can install on its own so
"Automatic" stays a single click.

## macOS: reachable launchd is not a requirement

A plist in `~/Library/LaunchAgents` is loaded by launchd at the next login whether
or not the process that wrote it can reach `gui/$UID` (SSH sessions often cannot).
So the agent stays `available` and its install writes the plist and reports "loads
at the next login" instead of refusing; only the `bootstrap`/`enable`/`print`
steps need the domain, and they are skipped when it is unreachable. The daemon
scope still needs root for `/Library/LaunchDaemons`.

## Starting and replacing the panel

`panel.start` runs the preferred CLI's `up`, which detaches itself and returns
once the panel answers — that is the whole out-of-the-box path when nothing is
running.

`panel.takeover` replaces an answering panel with the preferred copy. Stopping
the old panel also stops every server it supervises, this dsh included, so a
detached helper does the work and the guard refuses unless this session is an
adopted entry with `autostart: true` (something must bring it back). The response
says the page will disconnect; the helper logs to `bin/panel-takeover.log`.

## Two writes, and why the API comes first

home-hosted's config store compares the bytes it last wrote, so a write through
`/api/servers` never triggers its file watcher. A write to a workspace's
`servers.config.json` does — and the watcher *starts* a newly added entry with
`autostart: true`.

So:

- panel answering + this plugin holds a token → API write, nothing is started or
  stopped by surprise;
- panel not answering → direct file write (nobody is watching the file);
- panel answering but no token available → file write with the two-phase add:
  write the entry with `autostart: false`, then flip `autostart`. A later write
  to an existing entry is a *changed definition*, which only takes effect at that
  entry's next start.

## What the plugin owns

Exactly `autostart`, `onPortConflict`, `persistent` and `stop.killPortHolders`
(`OWNED_ENTRY_KEYS`). Everything else — command, args, env, health, restart,
labels — is the person's, and a patch never touches it.

Adopting an entry snapshots those keys first (absence included). Disabling
restores the snapshot; a key the snapshot does not carry is restored to the
panel's schema default, because a PATCH cannot delete a key. `kill` is the only
policy that reclaims a port held by a process the panel cannot identify as the
entry's own successor, and it still refuses to touch the panel or any process the
panel supervises.

## Self-reference

This process may itself be the entry being managed (`HHOSTED_SERVER_ID`).

- Deleting that entry is refused: it would stop the session doing the deleting.
- Starting/restarting it is allowed — that is the "reclaim now" case — but the UI
  says the page will disconnect, and the agent tools need approval first.

## Credentials

home-hosted keeps only an API token's hash, so a token this plugin did not create
can never be recovered. On the first write with none enrolled, the plugin mints
one, passes it to `home-hosted set-token` through `HHOSTED_TOKEN` (the CLI prints
nothing), and keeps it 0600 in its own state directory. It is never rendered,
logged, or embedded in a unit file.

Three facts about that CLI are load-bearing, and were read out of its source
rather than guessed from `--help`: `set-token` replaces whatever hash is there (so
`--clear` is not needed, and is not used), `HHOSTED_TOKEN` is the non-interactive
input, and every command peels `--home <dir>` off before any state module is
imported and turns it into `HHOSTED_HOME` — which is what makes the secrets file,
`run.json` and every workspace's config live under the directory this plugin
passes, so the plugin and the CLI always agree on where state is. A
workspace-scoped command (`start`, `stop`) also takes `--workspace <id>`.

The token state the page shows is measured, not assumed. When the panel answers,
the plugin proves its token with a non-mutating `listServers()`: a refusal is
`stale` and the write path drops to the config file, while a panel that never
answered leaves the state `unknown` — a timeout is not a refusal, and
`tokenVerified` records whether a proof actually happened.

A refused token, or a hash this plugin never had, is replaced by
`panel.reclaimToken`: one `set-token` write with a freshly minted token in
`HHOSTED_TOKEN`, proved against the panel before the refreshed status is
returned. It is one write and not a `--clear`-then-set pair, because `set-token`
replaces whatever hash is there (probed against the real CLI) and clearing first
would leave a window in which the panel has no token at all. Every token
operation on one state directory is serialised; two concurrent mints used to
leave the stored plaintext and the panel's hash disagreeing, and nothing could
ever recover. A failed write replaced nothing, so the previously stored token is
kept — it may still be the panel's.

Only a panel that was never started is refused: a missing or refused token is
itself a common reason the panel cannot be reached, so requiring it to answer
would make the repair impossible in exactly the case it exists for. A panel that
is up but silent gets the token enrolled without a proof, and the page says so
rather than claiming a verification it did not take.

## A managed entry that was deleted

`manageDsh` with an `autostart` intent is the whole instruction: it says this
plugin manages the harness entry. If someone deletes that entry — from the panel,
a tool call, or a hand edit — the page would otherwise show a managed entry that
is missing with no way to act on it. So the status read puts it back, and startup
`reconcile()` does the same for a deletion that happened while the plugin was
not running. A paused intent (`autostart: false`) is a deliberate stop and is
left alone, and `entries.apply` records `manageDsh` from the intent rather than
forcing it on, so applying a paused intent cannot leave the toggle stuck.

Recovery runs from a read, which the page polls, so it is throttled
(`ENTRY_RECOVERY_INTERVAL_MS`) and claims its attempt before its first await:
a panel that refuses the create must not be hit once per poll, and two status
calls racing each other must not both create the same entry.

## Enabling autostart hands the panel over

An install alone proves nothing. The panel the plugin started keeps running, so
nothing shows whether the entry would ever start one — and the CLI refuses to
start a second panel while `run.json` names a live pid, so `enable --now` on a
freshly written unit leaves it *failed* while an orphan panel holds the port. So
a successful install hands the running panel to the entry: the panel stops, and
the entry starts it. That is the only way to know autostart works rather than
merely that a file was written.

The stop takes the panel's servers with it, and this plugin is usually one of
them, so the work goes to a generated detached helper (`bin/panel-activate.mjs`)
that outlives the process. Its order is the whole design:

1. prove the start can work — the unit file exists, `systemctl is-active` agrees
   — while the panel is still up, because a start that could never work must not
   be attempted once the old panel is already gone;
2. on a switch, stop the panel through the *previous* mechanism
   (`systemctl stop`, `launchctl kill`): its own restart policy
   (`Restart=always`, `KeepAlive`) would bring the panel back the moment `down`
   returned, racing the new entry;
3. stop it with the CLI's `down`, then wait for the pid, escalating to SIGTERM
   and SIGKILL;
4. start the entry;
5. only then remove the other mechanisms' entries.

The stop is always the CLI's `down`, never the new mechanism's own `restart`: the
entry would then be starting a *second* panel, which home-hosted refuses while
`run.json` names a live pid, so a restart-in-place over an orphan only produces a
failed unit. Waiting on the pid matters for the same reason — a `down` that
returned before the process exited would race the start.

Retirement is last, and deliberately not part of `install()`. Switching mechanism
has to uninstall the old one, but the old entry is often what is currently
running the panel: removing it during the install would stop the panel — and this
plugin — before the new entry was ever told to start. So the ladder carries the
other mechanisms' removal steps in the activation plan, and each provider's
`retireCommands()` is the no-`--now` form for the same reason. launchd has no
unload-without-stopping, so its retirement is only safe once the panel is down
and the new entry is up.

A mechanism that cannot start anything now answers `activate() → null`: a `Run`
value and a `.desktop` file are read by the shell or the session at login.
Nothing is stopped then — leaving a working panel up beats killing it for an
entry that would not bring it back. A handover that could not be spawned is
reported with the exact commands, and the panel is still up.

Enabling and switching differ only in the retirement: a switch already has an
entry keeping the panel alive, so its plan carries the old mechanism's removal.

## The panel's UI is changed by the panel's own CLI

`ui.manage` shells out to `ui-switch` / `ui-update` / `ui-revert` rather than
downloading a release and installing a file. An official UI is named by its
release asset (`--asset noc-console`, plus `--repo`/`--tag` when it lives
somewhere else), and the panel then picks the release matching its own version,
matches the asset name and verifies the archive — the version logic stays in one
place instead of being reimplemented against the GitHub API here. `--file` stays
for a local build, which is the case the CLI cannot cover.

## Privilege

Boot scope needs privilege somewhere on every platform: a system unit, or
`loginctl enable-linger` on Linux; a LaunchDaemon on macOS; an elevated task on
Windows. Login scope needs none. When this process cannot elevate, the page shows
the exact commands instead of prompting for a password — a headless panel has no
askpass and `sudo -n` is the only honest probe.

That refusal is shown with the status it answered, and the page retires it as soon
as the status moves: a person runs the commands and presses Re-check, and the note
must not outlive the state it described. The persisted last attempt follows the
same rule, so a failed install is not re-shown once an entry exists.

Switching those entries to a `User=` later is not just a unit edit. The moment a
panel runs as root, everything it writes — `<home>/.hh`, its workspaces, logs and
`snapshots.json` — is root-owned, so the unprivileged account the unit now names
cannot write its own state and the panel fails to boot with a permission error
that never mentions ownership. Moving an install from root to a user therefore
needs `chown -R <user> <home>` (and the plugin state dir) first.

## Tests

No fixed ports: every stub listener binds `127.0.0.1` with port 0 and reads the
assigned port. No test starts dsh, home-hosted, or an OS service manager; the
subprocess seam and the boot ladder are injected.
