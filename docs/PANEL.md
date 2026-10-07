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
`home-hosted logs` line for line. A capability that needs a *newer* 0.7.x degrades rather than raising
the floor: `logs` (0.7.12) is a file read either way, and `restart <id>` (0.7.13) falls back to the
stop/start pair it replaced.

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

## Starting and replacing the panel

`panel.start` runs the preferred CLI's `up`, which detaches itself and returns once the panel answers —
that is the whole out-of-the-box path when nothing is running.

`panel.takeover` replaces an answering panel with the preferred copy. Stopping the old panel also stops
every server it supervises, this dsh included, so a detached helper does the work and the guard refuses
unless this session is an adopted entry with `autostart: true` (something must bring it back). The
response says the page will disconnect; the helper logs to `bin/panel-takeover.log`.

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

`/_hh` is the one unauthenticated surface a local caller can use, and it is deliberately tiny. Read
out of `src/api/control.ts` (mounted before the `/api/*` guard in `src/app.ts`), it registers exactly
**four** routes: `POST /shutdown`, and `POST /servers/:id/{start,stop,restart}`. Every one needs the
token from `run.json` plus a loopback peer, which is the whole point — a local `down` needs no session,
password or API token.

There is **no local-token path to the reverse proxy, backups, TLS, notifications or the config**. Those
live behind `/api/*` and a real credential. So a plugin capability over any of them would have to mint
a token and speak `/api`, and it must not add an unauthenticated `/api` route of its own to avoid that
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
