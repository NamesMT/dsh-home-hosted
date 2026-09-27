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
`src/home-hosted/resolve.ts` (what the page offers to install globally and warns
about when a global copy is older). Bumping one alone makes the page recommend a
range the plugin is not actually built against.

That copy resolves to a pnpm path carrying a version and a peer hash
(`…/.pnpm/home-hosted@0.6.1_zod@4.6.5/node_modules/home-hosted/…`), which moves
on the next install and disappears when the profile is rebuilt. A boot entry
that baked it in would fail exactly when it matters.

So the boot entry runs a generated launcher in the plugin state directory
(`bin/home-hosted.mjs`, rewritten on every plugin start). At boot the launcher
finds the pinned copy again — recorded path, then `$DSH_HOME/profiles/*`
node_modules (flat or pnpm), then PATH — and forwards its argv, so the entry
survives plugin upgrades and profile reinstalls. The plugin preflights the
launcher the way the unit invokes it and shows the version it answers.

## Agent tools are merged and on by default

Six tools, not ten: `servers_lifecycle` carries start/stop/restart, `servers_edit`
carries create/update/delete, `autostart_manage` carries install/uninstall, and
`ui_manage` drives the panel's own UI (`ui-update` / `ui-revert` / `ui-switch`).
They are registered on by default; what gates a mutating call is the session's
own permission mode, not a plugin-level default.

## The dsh entry is the only entry the page manages

The page shows one toggle: manage `dsh` as a home-hosted entry, or not. Adding
one sends a minimal intent (`{ id: 'dsh', autostart: true }`) and the host fills
the rest from the platform default policy; removing one restores an entry this
plugin merely adopted, and deletes one it created. Removing an entry the panel
supervises stops that process — which may be the session asking for it.

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
or stopping the *panel* no longer ends a prompt mid-flight. The key arrived in
home-hosted 0.6.3, so the write and the drift check both consult the panel's
version: an older panel gets no such key (it would only be dropped and warned),
while the stored intent keeps what the person asked for.

## Approvals follow the session's sandbox

A mutating agent tool asks the approval service only when the calling session is
*not* already `danger-full-access` (`ctx.sandboxPolicy.resolve({ session })`).
Asking anyway made a Full-access run fail whenever the deployment's approvals
auto-reject — the session had already granted exactly what the tool was asking
about. Below full access the tool still asks and still fails closed, and the
refusal names the mode and the remedy (Full access, or an answerable approval
channel).

## Config compatibility

`onPortConflict: kill` did not exist before home-hosted 0.6.0, and an older panel
that is handed it refuses to *boot* (its config schema rejects the value) — a
plugin must never brick the panel it manages. So the policy is checked before any
write against the version whose schema will parse it: the answering panel, or the
CLI that will parse it next. Below 0.6.0 the write is refused with
`KILL_UNSUPPORTED` and the page offers the fix it already has — replace the panel
with the preferred copy, or choose another policy.

## macOS: agent or daemon

A `LaunchAgent` starts at login; starting before login means a `LaunchDaemon` in
`/Library/LaunchDaemons`, which is root-owned and needs a one-time `sudo`
install. The daemon is therefore offered even when this process cannot elevate:
install stages the plist and returns the three commands to run. The daemon plist
names the invoking user in `UserName`, Apple's sanctioned way to avoid running
the panel as root, and the recommendation still prefers a mechanism this process
can install on its own so "Automatic" stays a single click.

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
`/api/servers` never triggers its file watcher. A write to
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

Only `autostart`, `onPortConflict` and `stop.killPortHolders`. Everything else —
command, args, env, health, restart, labels — is the person's, and a patch never
touches it.

Adopting an entry snapshots those three keys first (absence included). Disabling
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
rather than guessed from `--help`: `set-token` replaces whatever hash is there
(so `--clear` is not needed to overwrite, and is not used — see below),
`HHOSTED_TOKEN` is the non-interactive input, and every command peels
`--home <dir>` off before any state module is imported and turns it into
`HHOSTED_HOME` — which is what makes the secrets file, `run.json` and the servers
config live under the directory this plugin passes, so the plugin and the CLI
always agree on where state is.

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

## Privilege

Boot scope needs privilege somewhere on every platform: a system unit, or
`loginctl enable-linger` on Linux; a LaunchDaemon on macOS; an elevated task on
Windows. Login scope needs none. When this process cannot elevate, the page shows
the exact commands instead of prompting for a password — a headless panel has no
askpass and `sudo -n` is the only honest probe.

## Tests

No fixed ports: every stub listener binds `127.0.0.1` with port 0 and reads the
assigned port. No test starts dsh, home-hosted, or an OS service manager; the
subprocess seam and the boot ladder are injected.
