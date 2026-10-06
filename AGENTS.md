# AGENTS.md

`dsh-home-hosted` is a DeepSeek Harness (dsh) plugin: it sets up and manages the servers in a
`home-hosted` panel — a Gitea, a Jellyfin, anything — from the page or by prompt, using the pinned
copy of the panel it ships. Managing the `dsh` entry and the OS boot entry is the highlight on top of
that, not the point of the plugin.

One package, two halves — host `src/**`, browser `src/client/**` — sharing one wire contract
(`src/shared/contracts.ts`). Both bundles are committed (`lib/index.js`, `lib/client.js`), so a change
to either half **must** be followed by its build: CI builds too, but a stale `lib/` is what users
install. Never move the build behind a `prepare` script (a local install runs none, and a git-hosted
one is refused until allowlisted).

## Deeper docs

Read on demand, not every session. This file holds orientation and the rules that prevent defects;
these hold the reasoning and the traps.

| file | what it covers |
| --- | --- |
| [`.agentDocs/ARCHITECTURE.md`](.agentDocs/ARCHITECTURE.md) | what each module owns and why; the two doc sets |
| [`.agentDocs/GOTCHAS.md`](.agentDocs/GOTCHAS.md) | the traps this repo already paid for, with their causes |
| [`.agentDocs/COMPATIBILITY.md`](.agentDocs/COMPATIBILITY.md) | the version pin, settings migrations, page compatibility |
| [`docs/DESIGN.md`](docs/DESIGN.md) | index of the user-facing topic docs |

`docs/*.md` are for a person and are published; `.agentDocs/*.md` are for an agent and are not.

## Commands

```sh
pnpm typecheck && pnpm test && pnpm build   # what CI runs (Linux)
pnpm build:host | pnpm build:client         # one half at a time
pnpm exec vitest run test/client -t <name>  # focused run
gh workflow run release.yml -f version=0.4.0 # release; see Releasing
```

Test the page against a throwaway profile (`dsh plugin --profile scratch add .`): **never** install a
real boot entry, run a real service manager, or restart the harness you are running in to "check"
something.

## Layout

- `src/index.ts` — plugin entry (settings, service, RPC, tools, startup reconcile, sign-in notice).
- `src/config.ts` — the Cordis row config: `stateDir`, `homeHostedCommand`, `defaultEntryId`.
- `src/service.ts` — the orchestrator: panel lifecycle, entries, boot, tokens, servers, dispatch.
- `src/rpc.ts` — the page's transport, `POST /api/home-hosted` (`RPC_PATH` + `API_BASE`).
- `src/tools.ts` — the agent tools; `src/settings.ts` — the versioned settings file.
- `src/util/**` — paths, fs/exec seams, and `surface.ts` (web or Desktop). Host-only: it uses `node:`.
- `src/home-hosted/**` — resolution and version constants, launchers, panel API, panel control, token,
  owned keys, config file, the managed `dsh` entry, the 401 notice.
- `src/boot/**` — the autostart ladder: one provider per mechanism, plus payload builders and the
  ownership marker in `common.ts`.
- `src/client/**` — the settings page (sections + primitives + locales).
- `src/shared/contracts.ts` — the one wire contract both halves share. **Keep it import-free**: both
  esbuild entries inline it, and a `node:` import there breaks the client build.
- `scripts/` — the two esbuild wrappers plus the release version/notes helpers.

## Rules that matter

These prevent defects if broken. They stay here rather than in `.agentDocs/` for that reason — a rule
nobody reads is worse than a long file.

- **The plugin owns exactly** `autostart`, `onPortConflict`, `persistent` and `stop.killPortHolders`
  (`OWNED_ENTRY_KEYS`); a patch never carries anything else from a person's entry.
- **Snapshot before adopting.** `{ id }` alone is the marker for an entry this plugin created, so an
  owned key that was absent is recorded as the schema's default, never omitted — restore-versus-delete
  depends on telling those apart.
- **`writeConfig` keeps the panel's `meta`** and never invents `meta.schema`: an absent schema reads as
  the panel's current one, while a stale stamp stops the panel booting.
- **Writes go through the authenticated panel API when it answers and the token proves itself**,
  otherwise straight to `.hh/<workspace>/servers.config.json` (atomic, schema-shaped). The panel's
  `control` lives in `.hh/settings.json` and is patched there.
- **A server id is only unique inside a workspace.** Every read and write names one — `?workspace=` on
  the API, `.hh/<workspace>/…` on disk, `workspace` in an RPC payload or tool argument. A missing
  workspace means the panel's `default`, which is also the only one the plugin *manages* (reconcile,
  the `dsh` entry, snapshots); every other is reachable per call. Anything keyed by id alone — SSE, log
  buffers, series, route params, **local UI state** — must key on the pair.
- **A pre-0.7 root is never read or written**; it is only *recognised* (`isLegacyRoot`), reported as
  `legacyRoot`, and fixed by `panel.migrate` (`home-hosted migrate --yes`).
- **The settings file is versioned** (`SETTINGS_VERSION`). Migrate on **read**, never in `update()`;
  see [COMPATIBILITY](.agentDocs/COMPATIBILITY.md) for the allowlist rule.
- **A mutating agent tool asks for approval only when the calling session is not `danger-full-access`**,
  and fails closed when the sandbox cannot be read. Renaming a tool needs a `LEGACY_TOOL_NAMES` entry,
  or an upgrade silently disables it. A new tool is not retro-added to an existing allowlist.
- **A panel is a state root**: the plugin drives exactly one, discovery names the others, and a call
  naming another asks the user first, then reaches it by editing that panel's config file, running the
  CLI against its state root, or minting a token and using its API — three mechanisms, of which
  `FOREIGN_MECHANISMS` lists **which apply per endpoint**, least invasive first. An endpoint that names
  none cannot be aimed at another panel at all.
- **`/_hh` is deliberately four routes** (`shutdown` plus three lifecycle), token-plus-loopback — so no
  capability may be invented over them, and none may open an unauthenticated `/api` route to get
  around it.
- **Desktop is a second surface**: the harness entry is refused there (`DESKTOP_ENTRY_UNSUPPORTED`) and
  the page shows it web-only; every other server entry is managed exactly as on web.
- **Boot entries point at a generated stable launcher**, never at a pnpm path; the marker proves
  ownership and uninstall/disable refuses an artifact this plugin did not write.
- **A mechanism stays selectable without privilege**: stage the file and return the exact commands
  rather than hiding the option.
- **The client bundle is CJS with only** `react`, `react-dom`, `react/jsx-runtime` external — never
  import `@deepseek-ai/*` into it — and every visible string needs an `en` + `zh` entry (parity is
  enforced, and a literal `t('…')` key that does not exist is a test failure).
- **A refused mutation is `ok: false` inside a successful envelope**: read the payload, not just
  `envelope.ok`, and surface it.
- **Only `home-hosted@^0.7.3` is supported**, and a capability needing a newer 0.7.x *degrades* rather
  than raising the floor — see [COMPATIBILITY](.agentDocs/COMPATIBILITY.md).
- **The panel console is a first-class diagnostic** (`panel.console`): read from disk, so it needs no
  session, no token and no answering panel, and matches `home-hosted logs` line for line.

## Conciseness (applies everywhere)

**Prune verbose; keep correctness.** This covers code, comments, user docs and agent docs alike.

- Code: say it once, name it well. A comment only for non-obvious *intent*, never to restate the line.
- Docs: one idea per sentence; prefer a table or a line to a paragraph. Cut any sentence that would
  not change what a reader does.
- **Delete history `git log` already holds.** Keep the *rule* that came out of it, not the story — a
  list of where something used to live is archaeology, not guidance.
- Do not drop a caveat to save a line. Concise means no filler, not fewer facts.

## User-facing docs

`README.md` and the topical `docs/*.md` are for a person, not an agent:

- **Concise first read**, depth behind collapsible `<details>` spoilers, and **visuals for skimmers** —
  the media in `docs/media/` is regenerated by `pnpm run media`.
- **Docs ship with the change.** A user-visible change updates the docs describing it in the *same
  commit*. A stale doc is a bug like stale code.
- **A user-facing change also lands in `.agentDocs/` when it changes a rule or a trap** — but keep the
  *reasoning* there and the *rule* here.

## Where to extend

- **Endpoint**: `contracts.ts` (endpoint + payload) → `service.ts` dispatch → `src/client/api.ts` when
  the page needs it.
- **Agent tool**: `contracts.ts` (`AgentToolName`, mutating set) → a spec in `tools.ts` → locale labels.
- **Panel inventory**: `src/home-hosted/instances.ts` (which roots exist) → `service.instances()`
  (cache) → `instances-notice.ts` (what the agent is told) · `tools.ts` (which panel a call may hit).
- **Boot mechanism**: a provider in `src/boot/<mechanism>.ts` → the list in `ladder.ts` → `test/boot`.
- **Page**: a `src/client/section-*.tsx` → wire it in `page.tsx` → locales (both languages).
- **Why a shape is what it is**: [ARCHITECTURE](.agentDocs/ARCHITECTURE.md). **Before touching a guard
  or a platform rule**: [GOTCHAS](.agentDocs/GOTCHAS.md).

## Releasing

Versions are dispatched, never hand-edited:

```sh
gh workflow run release.yml -f version=0.4.0        # -f dry-run=true to rehearse
```

It gates on the macOS suite (`platform-gate.yml`) at that commit, typechecks/tests/builds, lets
changelogen derive the changelog and bump/commit/tag `v<version>`, creates the GitHub release and
publishes through npm trusted publishing. Below 1.0 the minor means "read the notes and act"; anything
else is a patch. `prepublishOnly` runs typecheck + tests, so a release cannot ship a red suite.
`pnpm pack` ships the `files` list in `package.json`; `.agentDocs/` is deliberately not published.
