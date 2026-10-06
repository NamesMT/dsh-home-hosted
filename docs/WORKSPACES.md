# Workspaces and several panels

A workspace is the ownership boundary; a panel is one state root. Both are plural on a real machine.

Related: [the panel](PANEL.md) · [server entries](ENTRIES.md)

## Workspaces: one managed, all reachable

home-hosted 0.7 made a workspace the ownership boundary: each has its own `servers.config.json`,
settings, secrets, logs and nanny state under `.hh/<workspace>/`, while the listener, auth, TLS, host
vitals, backups, UI and `run.json` stay at `.hh/`. A server id is therefore only unique *inside* a
workspace, and every call has to say which one it means.

The same rule reaches the page. The servers section is not remounted when the viewed workspace
changes, so anything it holds about a server has to carry the workspace it was made in — otherwise an
editor or a confirmation opened on workspace A's `web` stays live under workspace B and re-binds to
*B's* `web`. The displayed list is replaced on switch, so the ids simply stop matching; the plugin's
own in-flight keys (`busyKey`) already included the workspace, and the section's local selections now
do too.

The scoping is verified by driving the section under `happy-dom` and clicking it — open the editor,
switch workspace, read the screen — not only by calling the resolver, so the wiring for all three
selections is exercised. A control case re-renders in the *same* workspace and asserts the editor
stays open, so the failure cannot be mistaken for "it closed for some other reason".

The same lesson applies to the boot section's own stored state: `bootAttemptView` used to drop the
mechanism, so its note could only be gated on `state` and a persisted refusal survived a change of
preference — with the *old* mechanism's copy-pasteable commands. The view carries it now, and both
the fresh and persisted paths compare it.

The plugin manages exactly one workspace — **the panel's `default`**, fixed — because its intent (the
`dsh` entry, snapshots, reconcile) is a promise about one entry in one place. Making that a setting
bought nothing but a way to write into the wrong workspace, so it is a constant. The page and the agent
tools are not limited to it: they list every workspace the panel serves (`workspaces.list`,
`/api/workspaces` when it answers, the registry plus workspace files when it does not) and act on any
of them by naming it (`workspace` on the payload, `?workspace=` on the API, `.hh/<workspace>/…` on
disk). Only `default` is *reconciled*; another workspace is managed the way a person would manage it.

Every server-shaped tool call therefore carries an explicit `workspace`, required in the JSON: it is
one argument instead of a paragraph, and it keeps the same call from meaning different things on two
machines. The RPC endpoint still defaults an absent value (the page always sends one, and a hand-written
call should not break), but a model is never left to guess.

A pre-0.7 root is not read or written at all. It is recognised (`legacyRoot` on the status), refused on
every write, and fixed through one action that runs `home-hosted migrate --yes` — the same relocation a
first 0.7 start does on its own.

## Several panels on one machine

`home-hosted` can be installed per project, and one install can run several panels from different
`--home` roots. This plugin drives exactly one — the state root it resolved — so a person with two
panels used to be indistinguishable from a person with one.

Discovery is bounded, never a scan of the disk: the managed root (always listed, even before its first
start), `$HHOSTED_HOME`, the operator's `instanceRoots`, and the `~/.home-hosted*` siblings. Another
root counts only when it holds a 0.7 `.hh`, a pre-0.7 `servers.config.json`, or a `run.json` with a
live pid. The inventory is cached (`INSTANCES_CACHE_MS`); the prompt path re-measures a stale cache in
place (`instancesNow()`), because a provider that only read a snapshot would never notice a panel
started while this dsh was already running.

The agent is told rather than left to guess: with more than one panel found, `instancesNotice` adds one
runtime-context line naming the managed panel and the others (`ctx.systemPrompt.context`). Every tool
also takes an optional `instance` (a state root or URL); a mutating call that names none asks which
panel it means, through `ctx.userQuestions`, after the approval gate so a call the session may not make
prompts for nothing. The question is asked only when a human channel can answer — no answerer, or a
delegated child — and an unexpected ask failure is refused rather than treated as consent, because
changing a panel the user never confirmed is the outcome this exists to prevent. Its wording is English
like every other host-side message: the locale service is a browser-side seat, and first-party host
plugins ask in English too.

A call that names another panel is no dead end. The plugin asks how to reach it, offering every way
that endpoint has, least invasive first:

- `file` edits that panel's workspace config file
  (`.hh/<workspace>/servers.config.json`, its default workspace unless the call names another) — no
  credential, but no live status either, and a running panel applies a changed definition at that
  entry's next start;
- `cli` runs the CLI against its state root — the only runtime path the panel itself offers.
  `start`/`stop` act on one entry; a restart is now the CLI's own `restart <id>` (home-hosted
  0.7.13), which is what the panel's UI does and leaves no window in which the entry is down. A
  local panel older than that refused the command before touching anything, so the plugin falls
  back to the stop-then-start pair and reports `downgraded` in the result — the refusal is
  detected from the CLI's own text, including the `Unexpected argument` a 0.7.12 CLI prints for
  the positional id;
- `api` mints a token for that panel, enrols it and uses its HTTP API — the only way to get live
  status, and it replaces any token that panel had, which the question says outright.

The endpoint's first mechanism is the default when a caller names none, so a host that cannot reach a
person still does the least invasive thing. A read is the one silent upgrade: with a token this plugin
already holds for that panel it uses the API, because that carries live status and mints nothing. Every
such result ends by naming the panel and the mechanism it used.

A config edit reaches a running panel through its file watcher, so a newly added `autostart` entry is
written disabled and then flipped — the same two-phase add the managed path uses. The credential for
another panel lives beside the managed one, under its own slot (`panel-tokens/<slot>.token`, 0600),
minted on first use of that mechanism and never shared with the managed panel's token.

Machine-wide and self-referential endpoints are the exception: `home_hosted_status` describes the panel
this plugin manages (its payload already lists the others), and the OS boot entry is one entry for that
same panel. Those refuse a `home` rather than ignoring it, so a caller is never left believing it aimed
a boot entry at a panel it did not.

The settings stamp moved to 3 for `instancesNotice`, while the tool-name migration stays bound to the
release that merged the tools: a stamp bump must never re-read a current file's explicit two-tool
allowlist as "nobody chose".
