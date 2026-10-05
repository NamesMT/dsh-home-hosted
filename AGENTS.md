# AGENTS.md

`dsh-home-hosted` is a DeepSeek Harness (dsh) plugin: it sets up and manages the servers in a
`home-hosted` panel — a Gitea, a Jellyfin, anything — from the page or by prompt, using the pinned
copy of the panel it ships. Managing the `dsh` entry and the OS boot entry is the highlight on top
of that, not the point of the plugin.
One package, two halves — host `src/**`, browser `src/client/**` — declared through `dsh.bundle`
(`cordis.patch.yml`) and `dsh.client`. Depth is split by topic under `docs/`, the way `home-hosted`
splits its own: `DESIGN.md` (index) · `BOOT.md` · `PANEL.md` · `ENTRIES.md` · `WORKSPACES.md` ·
`AGENT-TOOLS.md`. Read the file for the area you touch, and keep it updated with the decision, not
the diff.

## Commands

```sh
pnpm typecheck && pnpm test && pnpm build   # what CI runs (Linux)
pnpm build:host | pnpm build:client         # one half at a time (`lib/index.js`, `lib/client.js`)
pnpm exec vitest run test/client -t <name>  # focused run
gh workflow run release.yml -f version=0.4.0 # release; see Releasing
```

The two bundles are committed (`lib/index.js`, `lib/client.js`), so a change to either half must be
followed by its build — CI builds too, but a stale `lib/` in a commit is what users install. That is
what makes a non-registry install work at all: pnpm resolves a local path to `link:` and runs no
`prepare`, and a git-hosted `prepare` is refused until the user allowlists it in the profile's
`pnpm-workspace.yaml`, so never move the build behind a `prepare` script. Sourcemaps and `lib/types/`
are gitignored; `prepack` rebuilds both into the published tarball. Test the page against a throwaway
profile (`dsh plugin --profile scratch add .`): never install a real boot entry, run a real service
manager, or restart the harness you are running in to "check" something.

## Layout

- `src/index.ts` — plugin entry (settings, service, RPC, tools, startup reconcile, sign-in notice).
- `src/config.ts` — the Cordis row config: `stateDir`, `homeHostedCommand`, `defaultEntryId`.
- `src/service.ts` — the orchestrator: panel lifecycle, entries, boot, tokens, servers, dispatch.
- `src/rpc.ts` — the page's transport, `POST /api/home-hosted` (`RPC_PATH` + `API_BASE`).
- `src/tools.ts` — the agent tools; `src/settings.ts` — the versioned settings file.
- `src/util/**` — paths, fs/exec seams, and `surface.ts` (which dsh surface this is: web or Desktop).
- `src/home-hosted/**` — resolution and version constants, launchers, panel API, panel control, token,
  owned keys, config file, the managed `dsh` entry, the 401 notice.
- `src/boot/**` — the autostart ladder: one provider per mechanism, plus payload builders and the
  ownership marker in `common.ts`.
- `src/client/**` — the settings page (sections + primitives + locales); `src/shared/contracts.ts` —
  the one wire contract both halves share.
- `scripts/` — the two esbuild wrappers plus the release version/notes helpers.

## Rules that matter

- Keep `README.md` and `docs/**` maintained as part of the change, in the same commit: an undocumented
  behavior change is unfinished, and a doc that contradicts the code is a bug.
- The plugin owns exactly `autostart`, `onPortConflict`, `persistent` and `stop.killPortHolders`
  (`OWNED_ENTRY_KEYS`); a patch never carries anything else from a person's entry.
- Snapshot before adopting. `{ id }` alone is the marker for an entry this plugin created, so an
  owned key that was absent is recorded as the schema's default, never omitted — restore-versus-delete
  depends on telling those apart.
- `writeConfig` keeps the panel's `meta` and never invents `meta.schema`: an absent schema reads as
  the panel's current one, while a stale stamp stops the panel booting.
- Writes go through the authenticated panel API when it answers and the token proves itself,
  otherwise straight to `.hh/<workspace>/servers.config.json` (atomic write, schema-shaped); the
  panel's `control` lives in `.hh/settings.json` and is patched there.
- **A server id is only unique inside a workspace**: every read and write names one — `?workspace=`
  on the API, `.hh/<workspace>/…` on disk, and `workspace` in an RPC payload or tool argument. A
  missing workspace means the panel's `default`, which is also the only one the plugin *manages*
  (reconcile, the `dsh` entry, snapshots); every other one is reachable per call.
- A pre-0.7 root is never read or written; it is only *recognised* (`isLegacyRoot`), reported as
  `legacyRoot`, and fixed by `panel.migrate` (`home-hosted migrate --yes`).
- The settings file is versioned (`SETTINGS_VERSION`). Migrate on **read**, never in `update()`; an
  explicit empty allowlist means "no tools", and the old default pair means "nobody chose" — bound to
  the release that merged the tools (`PRE_MERGE_SETTINGS_VERSION`), never to the current stamp.
- A mutating agent tool asks for approval only when the calling session is not `danger-full-access`,
  and fails closed when the sandbox cannot be read. Renaming a tool needs a `LEGACY_TOOL_NAMES` entry,
  or an upgrade silently disables it.
- A panel is a state root: the plugin drives exactly one, discovery names the others, and a call naming
  another asks the user first, then reaches it by editing that panel's config file, running the CLI
  against its state root, or minting a token and using its API — the three ways `FOREIGN_MECHANISMS`
  lists per endpoint, least invasive first.
- Desktop (`ctx.get('profileContext')?.name === 'desktop'`) starts its own reserved profile, so the
  harness entry is refused there (`DESKTOP_ENTRY_UNSUPPORTED`) and the page shows it web-only; every
  other server entry is managed exactly as on web.
- Boot entries point at a generated stable launcher, never at a pnpm path; the marker proves ownership
  and uninstall/disable refuses an artifact this plugin did not write.
- The `dsh` row stays a bare `dsh` when the project declares dsh: home-hosted resolves a bare command
  through the row's cwd and its project dir (`node_modules/.bin`) before PATH, so the launcher is only
  for an image a bare name cannot reach.
- A mechanism stays selectable without privilege: stage the file and return the exact commands rather
  than hiding the option.
- The client bundle is CJS with only `react`, `react-dom`, `react/jsx-runtime` external — never import
  `@deepseek-ai/*` into it — and every visible string needs an `en` + `zh` entry (parity is enforced,
  and a literal `t('…')` key that does not exist is a test failure).
- A refused mutation is `ok: false` **inside a successful envelope**: read the payload, not just
  `envelope.ok`, and surface it.

## Gotchas

- Tests never bind a fixed port, touch a real service manager, or write outside a temp dir; boot
  providers take the injected `run` seam and pin payloads with snapshots.
- macOS temp dirs resolve differently (`/var/…` → `/private/var/…`): compare canonical paths.
- Windows is not gated yet — the suite still carries POSIX assumptions, so port it before adding a
  Windows leg to `platform-gate.yml`.
- `home-hosted`'s bin is not in its `exports`: resolve it through the pinned copy (`resolveCli`), never
  `require.resolve('home-hosted/bin/…')`.
- pnpm 12 enforces a minimum release age, so `pnpm-workspace.yaml` pins it to `0` — CI and a fresh
  checkout must agree.
- The `unsupported` boot candidate is real (no OS entry can work here), not a bug to filter out.
- The plugin cannot act at boot: it re-asserts entries while dsh runs, and startup `reconcile()`
  repairs an entry that exists — it never installs one.
- A successful install hands the running panel to the new entry through a detached helper: prove the
  start, stop the previous mechanism's panel (its own restart policy would revive it), start the entry
  — *then* retire the other mechanisms, since retiring first deletes the entry currently keeping the
  panel (and this plugin) alive. A mechanism that cannot start anything (`windows-run`,
  `xdg-autostart`) reports `activate() → null`, and nothing is stopped.
- An entry this process runs as is never deleted (the panel is told to stop it); "stop managing" pauses
  or restores it instead.
- Only the `home-hosted` this plugin pins is supported (`^0.7.3`): the state layout is `.hh`, and
  the `kill`/`persistent` version guards were dropped pre-1.0, so an older panel handed those keys
  can refuse to boot — see DESIGN.
- **The panel console is a first-class diagnostic** (`panel.console` / `home-hosted/panel-console.ts`):
  read from disk so it needs no session, no token and no answering panel, and matching
  `home-hosted logs` line for line. A missing log reads as empty, never as an error. A new agent tool
  is **not** retro-added to an existing allow-list — see the settings note above.
- **A "read a fixed window, take the last N" reader is wrong when the unit is bytes and the request
  is lines**, because a line's length is unbounded: a stack trace or a JSON dump is one line and can
  be kilobytes, so a window sized per *line* silently returns fewer lines than asked. The console
  reader grows its window until `limit` lines are present or the file start is reached, and stops at
  one block when a short line answers immediately (measured: 20 lines of a 37.9 MB log reads 64 KiB).
  Home-hosted's `readTail` grows for the same reason. This is the same class as the upstream
  `asked 5000 → got 1464` bug — check any `Math.min(size, …)` followed by a `slice(-n)`.
- **A capability that needs a newer panel degrades; it never raises the floor.** `^0.7.3` already
  admits every 0.7.x, so a feature added in 0.7.12/0.7.13 (`logs`, `restart <id>`) is reachable
  without moving the pin — and a *local* panel older than it is a real scenario, not a mistake. So
  the newer path is tried first and an unknown-command refusal falls back to what that panel can do
  (`lifecycleForeign`). This is deliberate: bumping `MIN_SUPPORTED_VERSION` would refuse a panel that
  works, to gain nothing. Detect the refusal from the CLI's own text, and know all of its shapes — a
  pre-0.7.13 panel answers a 404 through the daemon, and a 0.7.12 CLI rejects the positional with
  `Unexpected argument`, which is the one a 404-only check misses (both pinned in `test/service`).

## Where to extend

- **Endpoint**: `contracts.ts` (endpoint + payload) → `service.ts` dispatch → `src/client/api.ts` when
  the page needs it.
- **Agent tool**: `contracts.ts` (`AgentToolName`, mutating set) → a spec in `tools.ts` → locale labels.
- **Panel inventory**: `src/home-hosted/instances.ts` (which roots exist) → `service.instances()`
  (cache) → `instances-notice.ts` (what the agent is told) · `tools.ts` (which panel a call may hit).
- **Boot mechanism**: a provider in `src/boot/<mechanism>.ts` → the list in `ladder.ts` → `test/boot`.
- **Page**: a `src/client/section-*.tsx` → wire it in `page.tsx` → locales (both languages).

## Releasing

Versions are dispatched, never hand-edited:

```sh
gh workflow run release.yml -f version=0.4.0        # -f dry-run=true to rehearse
```

It gates on the macOS suite (`platform-gate.yml`) at that commit, typechecks/tests/builds, lets
changelogen derive the changelog and bump/commit/tag `v<version>`, creates the GitHub release and
publishes through npm trusted publishing. Below 1.0 the minor means "read the notes and act"; anything
else is a patch. `prepublishOnly` runs typecheck + tests, so a release cannot ship a red suite.
