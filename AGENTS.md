# AGENTS.md

`dsh-home-hosted` is a DeepSeek Harness (dsh) plugin: it runs the `home-hosted` panel from the pinned
copy it ships, installs the OS entry that starts the panel at boot, and manages the panel's servers.
One package, two halves — host `src/**`, browser `src/client/**` — declared through `dsh.bundle`
(`cordis.patch.yml`) and `dsh.client`. Depth lives in `docs/DESIGN.md`; read it before touching the
panel, token, boot, entry or sign-in code, and keep it updated with the decision, not the diff.

## Commands

```sh
pnpm typecheck && pnpm test && pnpm build   # what CI runs (Linux)
pnpm build:host | pnpm build:client         # one half at a time (`lib/index.js`, `lib/client.js`)
pnpm exec vitest run test/client -t <name>  # focused run
gh workflow run release.yml -f version=0.4.0 # release; see Releasing
```

The shipped artifacts are committed (`lib/**`), so a change to either half must be followed by its
build — CI builds too, but a stale `lib/` in a commit is what users install. Test the page against a
throwaway profile (`dsh plugin --profile scratch add .`): never install a real boot entry, run a real
service manager, or restart the harness you are running in to "check" something.

## Layout

- `src/index.ts` — plugin entry (settings, service, RPC, tools, startup reconcile, sign-in notice).
- `src/config.ts` — the Cordis row config: `stateDir`, `homeHostedCommand`, `defaultEntryId`.
- `src/service.ts` — the orchestrator: panel lifecycle, entries, boot, tokens, servers, dispatch.
- `src/rpc.ts` — the page's transport, `POST /api/home-hosted` (`RPC_PATH` + `API_BASE`).
- `src/tools.ts` — the agent tools; `src/settings.ts` — the versioned settings file.
- `src/home-hosted/**` — resolution and version constants, launchers, panel API, panel control, token,
  owned keys, config file, the managed `dsh` entry, the 401 notice.
- `src/boot/**` — the autostart ladder: one provider per mechanism, plus payload builders and the
  ownership marker in `common.ts`.
- `src/client/**` — the settings page (sections + primitives + locales); `src/shared/contracts.ts` —
  the one wire contract both halves share.
- `scripts/` — the two esbuild wrappers plus the release version/notes helpers.

## Rules that matter

- The plugin owns exactly `autostart`, `onPortConflict`, `persistent` and `stop.killPortHolders`
  (`OWNED_ENTRY_KEYS`); a patch never carries anything else from a person's entry.
- Snapshot before adopting. `{ id }` alone is the marker for an entry this plugin created, so an
  owned key that was absent is recorded as the schema's default, never omitted — restore-versus-delete
  depends on telling those apart.
- `writeConfig` keeps the panel's `meta` and never invents `meta.schema`: an absent schema reads as
  the panel's current one, while a stale stamp stops the panel booting.
- Writes go through the authenticated panel API when it answers and the token proves itself,
  otherwise straight to `servers.config.json` (atomic write, schema-shaped).
- Whatever the plugin writes into the panel's config must be parseable by the panel that will boot
  from it: check `configVersion()` and either refuse (`MIN_KILL_VERSION` → `KILL_UNSUPPORTED`) or drop
  the key (`MIN_PERSISTENT_VERSION`).
- The settings file is versioned (`SETTINGS_VERSION`). Migrate on **read**, never in `update()`; an
  explicit empty allowlist means "no tools", and the old default pair means "nobody chose".
- A mutating agent tool asks for approval only when the calling session is not `danger-full-access`,
  and fails closed when the sandbox cannot be read. Renaming a tool needs a `LEGACY_TOOL_NAMES` entry,
  or an upgrade silently disables it.
- Boot entries point at a generated stable launcher, never at a pnpm path; the marker proves ownership
  and uninstall/disable refuses an artifact this plugin did not write.
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
- An entry this process runs as is never deleted (the panel is told to stop it); "stop managing" pauses
  or restores it instead.

## Where to extend

- **Endpoint**: `contracts.ts` (endpoint + payload) → `service.ts` dispatch → `src/client/api.ts` when
  the page needs it.
- **Agent tool**: `contracts.ts` (`AgentToolName`, mutating set) → a spec in `tools.ts` → locale labels.
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
