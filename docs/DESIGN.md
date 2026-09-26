# Design notes

Decisions that are not obvious from the code, and the hazards behind them.

## A plugin cannot act at boot

The plugin runs inside dsh. At boot nothing runs yet, so autostart cannot be a
runtime behaviour: the plugin installs an OS entry while dsh runs, and the OS
starts home-hosted from then on. Every plugin start re-asserts that entry
(rewrite-if-changed), which is also what repairs a node path that moved after an
upgrade.

## Which home-hosted runs

The plugin depends on `home-hosted` at a pinned range and drives its own copy —
a global install is only a fallback. Resolution order: an operator override in
the plugin row, then the pinned dependency, then PATH.

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
