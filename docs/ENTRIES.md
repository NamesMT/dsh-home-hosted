# Server entries

The entries this plugin writes and supervises, and exactly how much of one it owns.

Related: [the panel](PANEL.md) · [boot autostart](BOOT.md) · [agent tools](AGENT-TOOLS.md)

## The dsh entry boots the image the plugin was installed on

The panel starts `dsh web` from a server row, so a boot entry never runs dsh itself. That row points
at a second generated launcher (`bin/dsh.mjs`), and the launcher has to answer "which dsh" without the
plugin running.

A local build is the case that broke: a user ran a source checkout while sharing the global `~/.dsh`,
and the panel started a *different* global dsh on the same data directory, which crashed on the
version mismatch. Choosing by highest version, with the recorded path only as a tie-breaker, is what
allowed that. So the record (`bin/dsh-resolved.json`) carries `pinned` — the image this plugin was
installed on — and the launcher checks it before any version sort. A pin is carried, never guessed:
only a caller that *is* the running image adopts a new one (`repin`), so an upgrade that lands
elsewhere is adopted but a copy found on PATH never displaces the pin. A build whose path is gone
falls back to its recorded roots, then to real dsh installs, then to a bare build file, then PATH.

Candidates are ordered by how they were found, not just by version: a dsh by construction (a manifest,
`node_modules/dsh`, a pnpm store) beats a root that merely offers `lib/bin.js` (a clone), which beats a
`dsh` on PATH — a clone has no manifest, so it is found by that build-file name, a guess that must
never outrank a real install.

The row's stored command is repaired while the plugin runs (`launcherRepair`), including a row naming a
bare `dsh`: PATH is exactly what pointed at the copy that stopped working. A row this plugin created
has its command replaced; an adopted row that deliberately runs a different absolute dsh is left alone.
The row is `process.execPath` plus the launcher, so a moved node is drift too: the repair compares the
interpreter as well as the script.

### A project that depends on dsh keeps it, by name

The launcher is the fallback, not the common case. `home-hosted` resolves a bare command itself
(`resolveCommand(command, cwd, projectDir)`) by checking `node_modules/.bin/<command>` under the row's
cwd and then its own project dir, and only then PATH. So a row whose project installed dsh as a
dependency is written as a bare `dsh` with that project as its cwd: it runs the copy the project's
lockfile chose, with nothing absolute to move.

That is also why this plugin never shells out to a package manager for it: `npx dsh` falls back to the
registry and to a global when the local bin is missing, `pnpm dsh` needs pnpm on the boot PATH, and
`nlx --local` would add a global tool to a boot path for a lookup the panel already performs. The
launcher is what a row gets when a bare name would *not* reach the pinned image — a clone run without
its own `.bin`, or a global-only machine.

## The dsh entry is the only entry the page manages

One toggle: manage `dsh` as a home-hosted entry, or not. Adding one sends a minimal intent
(`{ id: 'dsh', autostart: true }`) and the host fills the rest from the platform default policy;
removing one restores an entry this plugin merely adopted, and deletes one it created. Removing an
entry the panel supervises stops that process — which may be the session asking for it.

Deleting on toggle-off is the intended reading, not an oversight: "manage" means the plugin owns the
entry, so switching it off gives the entry back — removed if created, restored if adopted. Pausing
instead would leave an entry nobody manages. The state that must never happen is the third one: a
toggle on with no entry behind it, which is why the entry is recreated from the intent while the
switch is on.

The generated entry always binds loopback (`bind: 'local'`, `--host 127.0.0.1`): `dsh` rejects
`--host 0.0.0.0` as a usage error, so repeating a running harness's network bind would produce an
entry that can never start.

## Persistence keeps dsh alive across a panel restart

A managed entry asks for `persistent: true`: home-hosted then runs it under its nanny, which owns the
child and outlives `stopAll()`/`dispose()` — so restarting or stopping the *panel* no longer ends a
prompt mid-flight. Staying up across a panel stop is the point, not a side effect: the panel's stop
copy says as much, and 0.7.2 gives the reverse-proxy engine the same treatment ("`down` leaves it
serving"). A `systemctl stop` still takes both with it unless the unit carries `KillMode=process`,
which is why that belongs on every unit this plugin writes.

## Two writes, and why the API comes first

home-hosted's config store compares the bytes it last wrote, so a write through `/api/servers` never
triggers its file watcher. A write to a workspace's `servers.config.json` does — and the watcher
*starts* a newly added entry with `autostart: true`. So:

- panel answering + this plugin holds a token → API write, nothing is started or stopped by surprise;
- panel not answering → direct file write (nobody is watching the file);
- panel answering but no token available → file write with the two-phase add: write the entry with
  `autostart: false`, then flip `autostart`. A later write to an existing entry is a *changed
  definition*, which only takes effect at that entry's next start.

## What the plugin owns

Exactly `autostart`, `onPortConflict`, `persistent` and `stop.killPortHolders` (`OWNED_ENTRY_KEYS`).
Everything else — command, args, env, health, restart, labels — is the person's, and a patch never
touches it.

Adopting an entry snapshots those keys first (absence included). Disabling restores the snapshot; a key
the snapshot does not carry is restored to the panel's schema default, because a PATCH cannot delete a
key. `kill` is the only policy that reclaims a port held by a process the panel cannot identify as the
entry's own successor, and it still refuses to touch the panel or any process the panel supervises.

## Self-reference

This process may itself be the entry being managed (`HHOSTED_SERVER_ID`).

- Deleting that entry is refused: it would stop the session doing the deleting.
- Starting/restarting it is allowed — that is the "reclaim now" case — but the UI says the page will
  disconnect, and the agent tools need approval first.

## A managed entry that was deleted

`manageDsh` with an `autostart` intent is the whole instruction: it says this plugin manages the harness
entry. If someone deletes that entry — from the panel, a tool call, or a hand edit — the page would
otherwise show a managed entry that is missing with no way to act on it. So the status read puts it
back, and startup `reconcile()` does the same for a deletion that happened while the plugin was not
running. A paused intent (`autostart: false`) is a deliberate stop and is left alone, and
`entries.apply` records `manageDsh` from the intent rather than forcing it on, so applying a paused
intent cannot leave the toggle stuck.

Recovery runs from a read, which the page polls, so it is throttled (`ENTRY_RECOVERY_INTERVAL_MS`) and
claims its attempt before its first await: a panel that refuses the create must not be hit once per
poll, and two status calls racing each other must not both create the same entry. Desktop skips all of
this — see **Desktop is a second surface**.
