# The panel

Which `home-hosted` runs, which state root this install owns, and how it is driven.

Related: [boot autostart](BOOT.md) · [server entries](ENTRIES.md) · [workspaces](WORKSPACES.md)

## Which home-hosted runs

The plugin depends on `home-hosted` at a pinned range and prefers it by default, so the panel is the
version the plugin was built against. A global install is a supported choice (Options → which
home-hosted to run), and the page shows both candidates with their versions and can install the pin
globally. An operator's `homeHostedCommand` always wins — that is an instruction, not a preference.

The range is stated twice and both must agree: `dependencies['home-hosted']` in `package.json` and
`EXPECTED_RANGE` in `resolve.ts` (what the page offers to install, and warns about when a global copy
is older). Bumping one alone makes the page recommend a range the plugin is not built against.
`test/resolve` **enforces** that agreement — it was a rule the docs stated and nothing checked, so
setting the manifest to `^0.7.99` while the constant stayed put failed nothing until the guard
existed. The same file asserts `MIN_SUPPORTED_VERSION` lies inside the advertised range, since a floor
above it would advertise a copy the plugin then refuses.

A bump is therefore those two plus the version-coupled tests — *unless* the release moved something
this plugin names: a path under `.hh`, `CONFIG_SCHEMA`, `serverSchema`, `/api/settings`, or a CLI
subcommand. Check that by **use**, not by filename: a file appearing in a diff cannot show that a
change reaches us, and the two disagree as soon as a comment lands in a schema file.

**0.7.18 and 0.7.19 did move one, and no filename showed it.** Upstream `applyPatch` now deletes a
top-level key set to `null` (`1f58a5d`), where it used to write it through; `serverSchema.label` also
began to admit `null` (`45d689e`). This plugin keeps its own copy of that function for the file
fallback, and the copies had drifted — the nested branch deleted, the top-level branch wrote the
`null` — so a top-level `null` that the panel deletes would have been stored, producing a config it
refuses to boot (`servers[0] ("smoke"): cwd must be a string (was null)`). One `applyPatchFields` now
serves both paths, and the refusal a `null` group gets is one rule `src/service.ts` reads too.

No shipped caller could reach the harmful case, and saying so is part of the finding: the agent tool
layer validates `patch` against the panel's own field types, so only `port` and `bootstrap` can carry
a `null` at all — exactly the two whose schema is `… | null` — while the page emits `port` alone. The
drift was real but latent; it is fixed because a copy of the panel's function is a fork of its
semantics, and the next field to allow `null` would have made it reachable.

**0.7.20 is one fix, and it found a live bug here.** It teaches that a pid is not an identity: the OS
recycles pids and a zombie still answers signal 0, so the panel's `up`/`status`/`down` now decide with
the pid *plus* `run.json`'s `startedAt`, and `down` refuses to signal a pid it cannot prove is the
panel. This plugin's two generated hand-over helpers had re-derived the weak predicate and escalated
`SIGTERM`→`SIGKILL` on "the pid answers" — **measured** by running the generated script against a live
`sleep` holding the recorded pid, and watching the stranger's own `SIGTERM` handler fire. A takeover
could therefore kill an unrelated process. Both helpers now leave every signal to the CLI's own `down`,
which is the only component that can prove identity; what they kept is a wait, never a signal.

Verified against a real 0.7.20 panel and its own CLI: `PATCH {port:null}` deletes the key; only `port`
and `bootstrap` have a schema that admits `null`; `_hh` is still exactly four routes; and every route,
subcommand and flag this plugin drives is unchanged. The console **file** — `.hh/.logs/home-hosted.log`
plus its `.1`, and the 5 MB rotation — is unchanged too, and this plugin's reader still matches
`home-hosted logs` line for line.

**0.8.0 stopped relocating an old state root, and this plugin follows it.** A 0.6.x root used to be
moved into `.hh/` on 0.7's first run; 0.8 refuses it instead, before any command resolves a path into
it, so a config at the old paths is never read as an empty panel. **Upgrading from 0.7 or earlier? Run
the latest 0.7.x once first — that release moves the state — then install 0.8.** That removed the last
version-conditional code here: a stop-then-start fallback for a panel without `restart <id>`, and
`panel.migrate`, whose CLI no longer performs the move.

**0.9.0 raised the config schema to 2, and it changed what an unstamped file means.** Schema 2 folds
the Telegram singleton and the webhook list into one `notifications.destinations` list. The part that
bites here is the stamp: a file with no `meta.schema` is read as the **oldest** shape, so 0.9's `up`
refuses to start it — `config schema 1 needs 1 migration`. This plugin writes workspace configs
directly whenever the panel does not answer, and it used to stamp them with `meta.writtenBy` alone, so
a config it created before any panel had run was unstartable on 0.9. It now stamps `meta.schema` on
every file it **creates**, reading the number from the pinned release rather than hard-coding it — a
fixed `2` would break again at the next bump, from the other side.

An existing file that does not already declare **the** schema the pinned panel reads is refused, in
both directions: below it needs `home-hosted migrate`, above it was written by a newer home-hosted
than this plugin pins. Stamping over either would claim a migration that never ran — measured, a
schema-2 stamp over an old `notifications.telegram` block makes 0.9 report the key as unrecognized and
ignore it, so the person's notifications end up silently off — and writing on regardless would leave
this plugin editing a panel that cannot boot while every call reports success. Lifting or downgrading
a config is `home-hosted migrate`'s job, and the refusal names the remedy for the direction it found.

The page says so **before** a write is attempted: a config the panel cannot boot is reported as the
panel's error, so the root is not shown as healthy until the first call fails. The entries are still
listed — the file is readable, it is only un-bootable — so nothing looks lost while you migrate it.

The floor is `0.9.0` for the same reason the pin is: a 0.8.x panel reads a schema-2 stamp as a *newer*
release's file and refuses that in turn, so no stamp satisfies both and there is no version-conditional
path. A 0.8.x panel is not a lesser-supported copy — it is one this plugin cannot drive.

### Upgrading an existing state root

A root a 0.8-era panel wrote is on config schema 1, and 0.9 refuses to boot it.

**This plugin lifts the panel it manages for you.** Both start paths — the page's Start button and the
generated launcher a boot entry runs — ask the panel's own `migrate --dry-run` after a failed start, and
when it reports a pending migration they apply `migrate --yes` and retry once. So an upgrade that raised
the schema heals itself: at boot, with no page open, and without you running anything.

```sh
# what runs for you, in order
home-hosted migrate --dry-run   # the question: is a migration pending?
home-hosted migrate --yes       # only if it is; keeps a .bak beside each rewritten file
```

The decision is the panel's own printed plan, never the failure text, so a start that failed for another
reason is left alone and a reworded refusal cannot disable the repair. Nothing here implements a
migration step: `migrate` keeps the backups, validates its output, and refuses a config it cannot lift —
that refusal is reported verbatim.

**A root that is not the one this plugin manages is not touched.** Run the two commands by hand against
it, exactly as above. The same applies when the panel refuses for a reason `migrate` cannot fix (a file
from a *newer* release, an unreadable config): the start's own error is what you get, with the migration's
refusal appended.

**0.7.21 widens that nullable set by one field, and it closed a bug here.** Clearing a server's label
sent an empty string, which the panel accepts and saves — so the entry kept a blank label instead of
falling back to its id, and nothing reported a failure. Only `null` clears the key, and 0.7.21 is the
release that let the *patch* schema carry one for `label`; before it, that request was refused with
`label must be a string (was null)`. The editor now sends `null`, and the parity guard reads the
nullable fields from the pinned release instead of a list that went stale at exactly this bump. The
release's other five fixes — proxy pid identity, a duplicate liveness predicate, a removed entry
recreating its own log, an unflushed log batch, a Windows test skip — touch nothing this plugin names:
no `.proxy/proxy.json`, `ProxyService`, `terminatePid`, or `DELETE /api/logs`, and `serverSchema`,
`CONFIG_SCHEMA`, `/_hh` and the CLI are unchanged.

**0.10.2 is a semver minor with two changes outside the config, and neither reaches this plugin.**
Two `/api/metrics` series were renamed (`hh_server_restarts_total` → `hh_server_restarts`,
`hh_servers_total` → `hh_servers`); this plugin scrapes no metrics. Clearing the panel password,
switching authentication off, and restoring an archive carrying `global:secrets` each now answer
`403 SESSION_REQUIRED` unless the caller signed in; this plugin calls none of the three, and its own
credential work is `set-token`, which still takes a token on the local channel. `CONFIG_SCHEMA` is
still 2 with the same single 1→2 step, so no config this plugin wrote needs lifting, and `0.9.x`
panels keep booting the files it writes.

Checked by use against the published sourcemaps of 0.9.7 and 0.10.2: `serverSchema` (still 25
fields) and `editableFields` (still 24), the merge keys (`restart`/`health`/`stop`, `auth`/`tls`),
`controlPatchSchema`, `settingsPatchSchema`, the workspace and server-view schemas, and every CLI
subcommand and flag this plugin drives are unchanged. The `^migrating ` anchor moved
source line only. Two upstream changes were adopted here rather than merely noted: the state-file
reader now tolerates the byte-order mark a Windows editor writes (upstream `readStateFile`), since
the two read the same files and disagreeing reported a healthy config as unparseable; and
`installedUiRecordFile` now names `.hh/.ui/ui.json`, where every release since 0.7 writes it. That
was a pre-existing bug rather than a 0.10 change — the plugin had read `<root>/.ui/ui.json`, one
directory above `.hh`, so a custom UI reported as the stock one and nothing failed — but it was
found while checking this bump, and a stale path is exactly what a bump is supposed to re-check.

`0.10.1` also added `down --with-persistent`, `restart --with-persistent` and `free-port`; none is
needed here. `panel.stop` runs `down`, and the entry this plugin writes is `persistent`, which is
exactly the thing `down` leaves running by default and what this plugin wants — passing the flag
would stop the dsh serving the page.

**0.9.4 also needs no adaptation, and that was checked by use.** It adds no command and no required
field: `PUT /api/servers/:id`, `POST /api/servers/orphans/:id/stop`, presets and restore reporting are
new routes and UI, none of which this plugin calls; `stoppedByPanel`, `orphans`, `healthRestarts` and
the action-result `code` are new *optional* fields. `serverSchema`, `editableFields`, the merge keys,
`CONFIG_SCHEMA` (still 2), the four lifecycle `/_hh` routes and every CLI subcommand and flag are
unchanged, so the pin moved and the floor did not. Verified by diffing the published sourcemaps of 0.9.2 and 0.9.4
(34 changed files) and by driving a real 0.9.4 panel: this plugin's client lists, creates, patches,
starts, stops and deletes an entry, and reads workspaces and settings, exactly as on 0.9.2.

Two 0.9.4 behaviour changes reach the page. `/healthz` now answers 503 for **any** crashed server
rather than only an `autostart` one — measured, and harmless here because `probePanel` asks whether
the panel answered at all, not whether it said 200.

And the supervisor bounds health force-restarts and then **stops** the entry, reporting `stopped` with
`stoppedByPanel: true`. Both that and a deliberate stop are `stopped`, so the status chip tells them
apart by the flag: an entry the panel gave up on reads **"Stopped by the panel"** on a warn tone, and
an operator's stop stays a plain `stopped`. The field is optional, so a 0.9.2 panel still renders the
plain chip.

That copy resolves to a pnpm path carrying a version and a peer hash, which moves on the next install
and disappears when the profile is rebuilt. A boot entry that baked it in would fail exactly when it
matters. So the entry runs a generated launcher in the plugin state dir (`bin/home-hosted.mjs`,
rewritten every start). At boot the launcher finds the pinned copy again — recorded path, then
`$DSH_HOME/profiles/*` node_modules (flat or pnpm), then PATH — and forwards its argv, so the entry
survives plugin upgrades and profile reinstalls. The plugin preflights the launcher the way the unit
invokes it and shows the version it answers.

## One panel root per state root

Two dsh installs share `~/.dsh` far more often than they should, and each one installing this plugin
used to mean two plugins editing one panel's state and one autostart unit under one ownership marker —
so the second install quietly replaced the first's boot entry.

A panel root is derived per instance: an explicit `$HHOSTED_HOME` wins, and a panel already living at
`~/.home-hosted` is adopted rather than abandoned (an upgrade must never make every server look like
it vanished), but otherwise the root is the instance's own `<stateDir>/panel`. A root counts when it is
a 0.7 one (`.hh/workspaces.json` or `.hh/settings.json`), a pre-0.7 one with a `servers.config.json`,
or when a `run.json` in either layout has a live pid — a killed panel leaves a runtime file behind, and
adopting on that would point a fresh install at somebody's dead root. Adoption is limited to an
instance that already exists (the machine's harness home, or a state dir that already holds settings):
a scratch `DSH_HOME` must not reach over and drive the panel some other install owns.

## The sign-in page points at the log

dsh web's unauthenticated 401 is a plain-text line written by the in-box connection plugin; it has no
config and no event. The plugin wraps that one internal writer (`connection.browserAuth.writeUnauthorized`)
and appends where the tokenised URL is — `<panel url>/logs?server=<entry>`. It rewrites **only** the
exact stock body, guards every assignment, and replaces the response's `end` for the single call, so an
authentication plugin's own page (or an exotic response) is passed through untouched rather than fought
over. `authNotice` turns it off; `{url}` is read per 401.

## Starting and stopping the panel

`panel.start` and `panel.stop` ask the *installed* autostart entry first, and fall back to the CLI's
`up`/`down` only when nothing supervises the panel. That fallback is the out-of-the-box path: with no
entry, the CLI is the only thing that can start one.

It cannot be the other way round. An entry that carries a restart policy — `Restart=always` for
systemd, `KeepAlive` for launchd — reads the CLI's `down` as an unexpected death and starts the panel
again seconds later, so "Stop the panel" came back on its own: a stop the page reported and the machine
did not honour. The mirror is just as wrong: a CLI `up` starts a panel *outside* the entry, which then
cannot be stopped or observed by it either. Whoever supervises the panel is who may change its state.

So an installed `systemd-user`/`systemd-system` entry answers with `systemctl start|restart` and
`stop`, and a `launchd-agent`/`launchd-daemon` with `kickstart`/`kickstart -k` and `kill`. The verb
follows the entry's own state, read before acting: `start` when the unit is not running, `restart`
when it is — the Start button appears when `/healthz` is silent, and a wedged panel is still active,
where a plain start would be a no-op. Probing matters, because that trigger is a 2 s health probe: a
merely slow panel must not be restarted, and restarting it would stop the servers it supervises.

Mechanisms that start the panel from outside their own control — a `.desktop` file, a `Run` value, a
container restart policy — have no stop to offer, so those fall back to the CLI.

A Windows scheduled task is a partial case, and the one place Start may not recover a wedged panel: it
offers `schtasks /Run` and no stop. Measured on Windows 11: `/End` asks the task to shut down in no
form a program can observe (a PowerShell `trap` never ran) and, while reporting success, leaves child
processes alive — so the CLI's `down` is the only stop that runs the panel's own stop policy. The task is registered `MultipleInstancesPolicy=IgnoreNew`, so `/Run` on a running
instance does nothing, and `schtasks` has no graceful restart — pressing Start on a wedged Windows
panel therefore reports that the panel did not answer, rather than recovering it. Stopping still goes
through the CLI's `down`, which is graceful.

The entry's command returns as soon as the service manager accepted it, which is not the same as the
panel answering: a `Type=exec` unit counts as started once the binary was executed, before it binds
its port. So the call then polls `/healthz`, and stops as soon as the panel answers — about a second
on the development machine this was measured on. The 20 s is only the ceiling for a panel that never
answers, matching the CLI's own startup budget. A stop follows the same rule with a 5 s ceiling: if
the entry's stop ran but the panel still answers, it was not the panel that entry supervises, and the
CLI's `down` finishes the job.

`panel.takeover` replaces an answering panel with the preferred copy. Stopping the old panel also stops
the non-persistent servers it supervises — this dsh only if it is one, which an entry this plugin
manages is not: it is written `persistent: true`, so it survives the panel and the session stays up.
A detached helper does the work and logs to `bin/panel-takeover.log`.

**The guard has two questions, and they are not the same one.** *Would a panel come back?* Only an
`autostart` entry starts one, and the entry that does it is the **managed** one — so that is what is
asked. It used to ask `selfEntryId()` instead, i.e. whether the *answering* panel had spawned this
process, which refused every replacement of a panel started by anything else (a hand-run `up`, a
distro unit, another supervisor) — the exact case the button exists for. *Would this session survive?*
`down` stops every non-persistent server, so a session the panel spawned without `persistent` would
not be there to see the new panel; that is only a fact when the panel really spawned us, which is
where `selfEntryId()` belongs.

**It stops and starts through the installed entry, never the CLI.** `Restart=always` and `KeepAlive`
treat the CLI's `down` as a death the entry did not cause, so the panel comes back behind the swap —
and the CLI's `up` then starts one the entry does not supervise. The unit's own run never started the
answering process, so it reports `enabled-failing` while a panel is healthy, and keeps reporting it.
`bootControl('stop')` and `bootControl('start')` supply the steps and the helper carries them.

**An installed entry can still be supervising nothing.** If the panel was started by something else —
a hand-run `up`, a distro unit, another supervisor — the entry's stop returns 0 having stopped
nothing, because there is nothing it started to stop. The helper therefore waits for the recorded pid
to go, and falls back to the CLI's `down` when it does not: starting over a live panel is what leaves
the entry failed while the old process keeps the port. The CLI remains the path when nothing is
installed, and now also when what is installed does not own the process.

`panel.start`, `panel.takeover` and `cli.installGlobal` answer a *successful* envelope whose payload
can still carry `ok: false` — the page reads the payload's `detail`/`output` rather than trusting
`envelope.ok`, so a refused control action says why instead of looking like a no-op.

## The console is readable when nothing else is

A panel that is up but misbehaving is exactly when its API is hardest to reach: the token may be
stale, `writeVia` may be `file`, and the thing that explains the symptom is what the panel printed
while starting. So `panel.console` reads `<root>/.hh/.logs/home-hosted.log` off disk — no session, no
API token, no CLI, and no dependence on the panel answering — and the `panel_logs` agent tool exposes
it. It reads one rotation too (`<log>.1`), because the end of the file that just rotated away is
usually where a crash is, and it matches `home-hosted logs` line for line (verified against a real
panel at every count).

The read **grows its window** rather than sizing one from the count. A line's length is unbounded —
a stack trace, a JSON dump or a verbose error is one line and can be kilobytes — so a window sized
per *line* silently returns fewer lines than asked for: on 500 lines of ~2 KB, `lines: 100` returned
50. The window instead grows backwards until `limit` lines are present or the file start is reached,
so a bounded request never reads an unbounded file and a short line still stops after one block
(20 lines of a 37.9 MB log reads 64 KiB). Home-hosted's own `readTail` grows for the same reason.

The rotation is joined the way **concatenating the files** joins it, not by gluing two line arrays.
A panel killed mid-write leaves `.1`'s last line unterminated, and concatenation makes that line and
the live file's first line one line (`rot2-partial` + `live1` → `rot2-partiallive1`); array-joining
invents a line break the log never had, and then "the last 2 lines" is one short. Sufficiency is
therefore counted in **separators** (`limit + 1`), the same test `logs` makes — counting lines stops
one early for exactly that reason.

A missing log is an empty one, not an error: a panel that has just started has nothing to say, and
reporting that as a failure would make the one diagnostic that always works look broken. The new tool
is **not** added to an existing settings file's allow-list — a tool that did not exist when that file
was written could not have been deselected, but granting it silently would expand a deliberate
selection, so the page's checkbox is how it is chosen.

## What `/_hh` does not offer, deliberately

`/_hh` is the one unauthenticated surface a local caller can use, and it is deliberately small. Read
out of `src/api/control.ts` (mounted before the `/api/*` guard in `src/app.ts`) at the pinned release,
it registers **seven** routes: `POST /shutdown`; `POST /servers/:id/{start,stop,restart,free-port}`;
and `GET /backups`, `POST /backups`, `POST /backups/restore`. Every one needs the token from
`run.json` plus a loopback peer, which is the whole point — a local `down` needs no session, password
or API token. (The three backup routes arrived in 0.9.5; this page said "exactly four" long after
that stopped being true, which is why the count is now quoted per release rather than as an idea.)

`free-port` and `restart` are the two this plugin uses, both through the CLI rather than by calling
`/_hh` itself.

There is **no local-token path to the reverse proxy, TLS, notifications or the config** — those live
behind `/api/*` and a real credential. So a plugin capability over any of them would have to mint a
token and speak `/api`, and it must not add an unauthenticated `/api` route of its own to avoid that
— that is the rule the plugin is built on (the CLI drives a running panel through `/_hh`, never
`/api`). `_acme` is the only other route outside the guard (loopback-only, credentials the panel
generates, a single `/:action` for DNS-01); this plugin never touches it.

The practical consequence for a foreign panel is the three mechanisms `docs/WORKSPACES.md` lists: its
config file, its own CLI, or a token the user is asked about. A panel the user has not confirmed is
never reached by a fourth route invented here.

## Two RPC endpoints have no caller, and that is fine

`servers.get` and `entries.restore` are handled by the service, typed in `RpcEndpoint`, and tested —
but no client or agent tool invokes either, which is the shape worth checking rather than assuming.

Both are **redundant surface, not unreachable capability**:

- `entries.restore`'s job is reached through `entries.remove`, which restores an entry this plugin
  merely adopted instead of deleting it (`removeManagedEntry` → the `adopted` branch). That is proven
  behaviourally, not by reading: `test/service` removes an adopted entry and asserts the panel got no
  `DELETE` and the entry's own `onPortConflict` came back.
- `servers.get` returns one entry's view, and `servers.list` — which every consumer uses — returns
  every entry's view for the workspace.

They are left in place rather than deleted: they are a coherent RPC surface for a caller that wants
one entry, deleting them is a wire change for no user-visible gain, and the capability each names is
already reachable. Recorded here so the next reader does not have to re-derive whether it was an
oversight.

## Credentials

home-hosted keeps only an API token's hash, so a token this plugin did not create can never be
recovered. On the first write with none enrolled, the plugin mints one, passes it to `home-hosted
set-token` through `HHOSTED_TOKEN` (the CLI prints nothing), and keeps it 0600 in its own state
directory. It is never rendered, logged, or embedded in a unit file.

Three facts about that CLI are load-bearing, read out of its source rather than guessed from `--help`:
`set-token` replaces whatever hash is there (so `--clear` is not needed, and is not used),
`HHOSTED_TOKEN` is the non-interactive input, and every command peels `--home <dir>` off before any
state module is imported and turns it into `HHOSTED_HOME` — which is what makes the secrets file,
`run.json` and every workspace's config live under the directory this plugin passes, so plugin and CLI
always agree on where state is. A workspace-scoped command (`start`, `stop`) also takes `--workspace`.

The token state the page shows is measured, not assumed. When the panel answers, the plugin proves its
token with a non-mutating `listServers()`: a refusal is `stale` and the write path drops to the config
file, while a panel that never answered leaves the state `unknown` — a timeout is not a refusal, and
`tokenVerified` records whether a proof actually happened.

A refused token, or a hash this plugin never had, is replaced by `panel.reclaimToken`: one `set-token`
write with a freshly minted token in `HHOSTED_TOKEN`, proved against the panel before the refreshed
status is returned. It is one write and not a `--clear`-then-set pair, because `set-token` replaces
whatever hash is there (probed against the real CLI) and clearing first would leave a window in which
the panel has no token at all. Every token operation on one state directory is serialised; two
concurrent mints used to leave the stored plaintext and the panel's hash disagreeing, and nothing could
ever recover. A failed write replaced nothing, so the previously stored token is kept — it may still be
the panel's.

Only a panel that was never started is refused: a missing or refused token is itself a common reason
the panel cannot be reached, so requiring it to answer would make the repair impossible in exactly the
case it exists for. A panel that is up but silent gets the token enrolled without a proof, and the page
says so rather than claiming a verification it did not take.

## The panel's UI is changed by the panel's own CLI

`ui.manage` shells out to `ui-switch` / `ui-update` / `ui-revert` rather than downloading a release and
installing a file. An official UI is named by its release asset (`--asset noc-console`, plus
`--repo`/`--tag` when it lives somewhere else), and the panel then picks the release matching its own
version, matches the asset name and verifies the archive — the version logic stays in one place instead
of being reimplemented against the GitHub API here. `--file` stays for a local build, which is the case
the CLI cannot cover.
