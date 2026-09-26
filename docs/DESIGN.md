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
