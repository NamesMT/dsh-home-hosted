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

- **UI state that outlives the context that gave it meaning.** `ServersSection` is not
  remounted when the viewed workspace changes (no `key` on it), so its own state
  survives — and `editing`/`deleting`/`freeing`/`freeNote` were keyed by bare server
  id, which the repo's own rule says is **only unique inside a workspace**. Picking a
  server in workspace A and switching to B left the editor, the delete confirmation and
  the free-port note describing A's server; with a same-named entry in B they re-bound
  to it, and a save wrote A's values over B's. Fixed at the **state**, not the display:
  each selection is stamped with the workspace it was made in (`scopedSelection`), so a
  foreign one is inert and no future reader can observe it. Clearing a separate flag
  would have left the stale value itself reachable — prefer the state fix over hiding
  the symptom, and do not keep both. `busyKey` already encoded this same invariant for
  in-flight keys; the local state was the part that missed it.
- **The codebase's own pattern for this is `visibleBootAttempt`**: a fresh attempt is
  shown only while its `state` and `mechanism` still match the live ones. Copy that
  shape for any new contextual value rather than adding a "clear it on change" effect.

- **`Number.parseInt` takes a *prefix*, so a partly numeric argument becomes a number
  nobody asked for.** `1e3` → 1, `12abc` → 12, and `0x10` → **0**, which is the "whole
  log" sentinel in the console reader — a bounded request silently became an unbounded
  read. `Number.isFinite` catches none of them. Require the **whole trimmed string** to
  be a decimal integer (`/^[+-]?\d+$/`) plus `Number.isSafeInteger` before parsing, and
  prefer refusing over defaulting where the caller can be told. Sites fixed here:
  the `panel_logs` tool's `lines`, and `parsePasswd`'s uid field — where a corrupt row
  like `1000abc` used to yield a plausible account that then becomes `User=` in a
  generated boot unit (`numberFrom` already applied this rule; the two now agree).
  Fix it only where the wrong number can *hurt*: a clamp makes a partial parse harmless,
  which is why upstream's `?tail=` was left alone.
- **Two copies of one algorithm inside separate generated scripts are real duplication;
  two copies in normal modules are not always.** `launcher.ts` builds two self-contained
  scripts (a test asserts no relative imports), and of the eight helpers they share only
  the version comparator's body was byte-identical — so it is now one interpolated
  fragment, with output verified byte-identical. The other seven genuinely differ and
  must not be merged. Extract a shared helper only where the copies can diverge.

- **A test that cannot run must report `skipped`, never `passed`.** vitest treats an
  early `return` inside a test body as a pass, so a guard like
  `if (!fs.existsSync(dependency)) return` makes the suite claim a verification it never
  performed. Use `it.skipIf(condition)` / `it.runIf(condition)` with the condition
  evaluated at **module load** — they are resolved at collection time, before any
  `beforeAll`, so a flag set in a hook cannot work. Four instances of this were found
  and fixed here, each having silently asserted nothing: an editor-scope guard that
  skipped on CI, a Windows-guarded shebang check (`buildLauncherSource` emits the
  shebang unconditionally, so the guard was pointless), a systemd `User=root` check
  reading a file the install had already `rmSync`ed (read it from the faked `sudo
  install` argv instead, while it exists), and an account test whose own fixture
  guaranteed its `if` was false on every machine. When a conditional is unavoidable,
  **force the branch with a preceding assertion** (`expect(cond).toBe(false)`) so the
  guarded assertion always runs — `test/client/api.test.ts` is the model: every
  `if (!parsed.ok) expect(...)` follows `expect(parsed.ok).toBe(false)`.
- **A test that reads a path relative to the process's cwd is a portability trap**, not
  a signal: it works when vitest starts at the repo root and fails anywhere else.
  Resolve from `import.meta.url` (`test/helpers/panel-schema.ts` is the shared reader
  for the panel's own `serverSchema`). Never hard-code an absolute path from one
  machine — the earlier editor guard named `/home/mt/...` and so ran nowhere else.

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
- **A tool's declared parameters are not documentation, they are the only thing a model can see.**
  `servers_edit` named 15 of the panel's 23 `serverSchema` fields, so eight — `persistent`,
  `bootstrap`, `dependsOn`, `envFile`, `resources`, `backupPaths`, `logBufferLines`,
  `backupIgnoreGenerated` — were accepted and stored but invisible: a capability with no way to reach
  it. A wider `additionalProperties` does **not** fix that, because a key nobody names is a key nobody
  passes. `test/tools` reads the pinned dependency's own `serverSchema` out of its sourcemap and fails
  if the two lists differ, so the next field the panel grows cannot drift silently.
- **`/_hh` is deliberately four routes** (`shutdown` + the three lifecycle ones), token-plus-loopback,
  with no local path to proxy, backups, TLS or config — so no plugin capability may be invented over
  them, and none may open an unauthenticated `/api` route to get around it. Recorded in PANEL.md.
- **Three consumers read the panel's entry surface, and each needs its own parity statement.** The
  model (`src/tools.ts` — every field), the panel's own UI (every field, and the page links to it),
  and the page's editor (`src/client/entry-editor.tsx` — the common eight, the other fifteen
  **deliberately** out of scope and declared as such). A subset is fine; an *undocumented* subset is
  the same bug as a missing tool field, so the editor exports `EDITOR_FIELDS`/`OUT_OF_SCOPE_FIELDS`
  and `test/client/entry-editor` fails when the panel grows a field neither list mentions. It also
  asserts the **rendered** labels, because a field can be declared and never drawn.
- **A helper that exists, is tested, and is never called is a missing wire, not dead code — check
  which.** `humanizeKey` was written and unit-tested for the entries drift chip, but nothing called
  it, so the page showed raw `onPortConflict, stopKillPortHolders`. Wiring it was the fix.
  `formatCandidate` is the opposite case: its combined `version · path` string has no consumer shape
  (the panel renders those in separate slots), so it is genuinely dead and is left alone rather than
  forced into a caller.
- **A "read a fixed window, take the last N" reader is wrong when the unit is bytes and the request
  is lines**, because a line's length is unbounded: a stack trace or a JSON dump is one line and can
  be kilobytes, so a window sized per *line* silently returns fewer lines than asked. The console
  reader grows its window until `limit` lines are present or the file start is reached, and stops at
  one block when a short line answers immediately (measured: 20 lines of a 37.9 MB log reads 64 KiB).
  Home-hosted's `readTail` grows for the same reason. This is the same class as the upstream
  `asked 5000 → got 1464` bug — check any `Math.min(size, …)` followed by a `slice(-n)`.
- **A rotation is joined as text, and sufficiency is counted in separators.** Gluing the two line
  arrays invents a break the log never had when `.1` is unterminated (a panel killed mid-write), so
  `rot2-partial` + `live1` must read as one line — and "the last N lines" is then one short if the
  test is on lines rather than on `N + 1` separators. Matches `home-hosted logs` exactly; verified
  against the real CLI across rotation, unterminated `.1`, long lines and an empty live file.
- **Windows quoting has two layers, and conflating them is a bug.** `commandLineToArgvW`/the CRT
  rules (backslashes pair before a `"`, an odd one escapes it) are what `windowsArg` must produce;
  `cmd.exe`'s own layer is separate, and for the copy-pasteable `commands[]` form (`cmdQuote`) the
  word is wrapped in quotes so `cmd`'s metacharacters are inert while **inside** those quotes the
  CRT rules still apply. The old `cmdQuote` doubled quotes (`""`) and could not represent a backslash
  before a quote at all — real `cmd.exe` turned `x\"y` into `x"y` and `"C:\a b\"` into `C:\a b"`.
  Both `windowsArg` (37 values) and `cmdQuote` (16 values) are round-tripped against **real** Windows
  `CreateProcess`/`cmd.exe` output in `test/boot/escape`, which is the only way to check this: the
  oracle is a parser's real behaviour, not an expected string.
- **"Untouched since X, checked by filename" is not a claim that survives.** Verify a compatibility
  claim by what a change *reaches*, not by whether a file appears in a log — the two disagree as soon
  as a comment lands in a schema file. `docs/PANEL.md` says which surfaces were checked and why none
  reaches this plugin.
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
