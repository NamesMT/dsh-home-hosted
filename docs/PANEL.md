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
is older). Bumping one alone makes the page recommend a range the plugin is not built against. A bump
is therefore those two plus the version-coupled tests — *unless* the release moved something this
plugin names: a path under `.hh`, `CONFIG_SCHEMA`, `serverSchema`, `/api/settings`, or a CLI
subcommand. 0.7.2 (the panel's reverse proxy, all under `.hh/.proxy/`) moved none of them.

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
