# Design notes

Decisions that are not obvious from the code, and the hazards behind them.

Depth is split by topic, the way [home-hosted](https://github.com/NamesMT/home-hosted) splits its own:
[boot autostart](BOOT.md) · [the panel](PANEL.md) · [server entries](ENTRIES.md) ·
[workspaces and several panels](WORKSPACES.md) · [agent tools](AGENT-TOOLS.md).

Read the file for the area you are about to touch, not all of them.

## What this plugin is

Server management first: a person adds their Gitea, Jellyfin, cache or bot — from the page or by
prompting an agent — and the plugin writes and supervises those entries through home-hosted. The
`dsh` entry and the OS boot entry are a highlight on top of that, which is why the boot, launcher and
sign-in machinery below is long and the server path is short.

## Desktop is a second surface

`profileContext.name` (registered by dsh's own profile boot, and what dsh's shipped composition keys
its Desktop rows on) says which surface this is; anything else, including a host too old to register
it, reads as `web`.

Desktop starts its own reserved profile inside Electron, so the harness is never one of the panel's
server entries there, and `dsh --profile desktop` is refused by the CLI — a row this plugin wrote
would only crash-loop. So the surface is reported (`status.surface`) and exactly one thing is refused:
managing the *harness* entry (`DESKTOP_ENTRY_UNSUPPORTED`, from `applyIntents`, `removeManagedEntry`
and `restoreEntry`), with `reconcile`/`ensureManagedEntry`/`repairManagedCommand` skipping it so a
stored intent cannot resurrect it. The page shows that toggle disabled and web-only.

Everything else is untouched: servers, workspaces, the panel, tokens, UI and the *panel's* boot
autostart are not surface-bound, and only the harness entry is keyed on `defaultEntryId`. Desktop is
the browser surface in Electron — the same `dsh-web-app` bundles — so `platform: "web"` already covers
its page.

## Config compatibility was dropped, deliberately

`onPortConflict: kill` arrived in home-hosted 0.6.0 and `persistent` in 0.6.3, and an older panel
handed either key can refuse to *boot* from the config. The plugin used to consult the answering
panel's version and refuse or drop them (`KILL_UNSUPPORTED`). That is gone on purpose: it pins
`home-hosted@^0.7.19` and autostarts its own copy, so a panel older than those keys is only reachable by
deliberately preferring an old global install — and this is pre-1.0. Supporting older panels again means
bringing that check back from history, not re-deriving it.

## Tests

No fixed ports: every stub listener binds `127.0.0.1` with port 0 and reads the assigned port. No test
starts dsh, home-hosted, or an OS service manager; the subprocess seam and the boot ladder are injected.
