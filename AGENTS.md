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

## Docs

Where knowledge lives, and when to reach for each:

| tier | what it holds | when you use it |
| --- | --- | --- |
| `AGENTS.md` — this file | orientation and the rules that prevent defects | read every session; write when a rule is learned the hard way |
| `.agentDocs/` | depth: module rationale, traps with their causes, compatibility | read on demand, before touching that area; write when a rule needs its reasoning kept |
| `docs/` | how-to and reference for a person using this package | read when the task is user-facing; write in the same commit as the change |
| `README.md` | the first read, for a person | write alongside `docs/` |

- **One home per fact.** State the rule here, keep the reasoning in `.agentDocs/` and link it — never both.
- **A dead pointer is a bug.** If the target is gone, delete the pointer rather than leave it.
- Move depth behind a pointer once a section outgrows a screen or two; keep the rule inline.

| file | what it covers |
| --- | --- |
| [`.agentDocs/ARCHITECTURE.md`](.agentDocs/ARCHITECTURE.md) | what each module owns and why; the two doc sets |
| [`.agentDocs/GOTCHAS.md`](.agentDocs/GOTCHAS.md) | index of the traps this repo already paid for, split by topic |
| [`.agentDocs/COMPATIBILITY.md`](.agentDocs/COMPATIBILITY.md) | the version pin, settings migrations, page compatibility |
| [`docs/DESIGN.md`](docs/DESIGN.md) | index of the user-facing topic docs |

`docs/*.md` are for a person and are published; `.agentDocs/*.md` are for an agent and are not.
`.agentDocs/GOTCHAS.md` is an index — read only the `gotchas/` topic for the area you touch, never all
of them. Depth goes behind a pointer, never pasted twice.

## Commands

```sh
pnpm typecheck && pnpm test && pnpm build   # what CI runs (Linux)
pnpm build:host | pnpm build:client         # one half at a time
pnpm exec vitest run test/client -t <name>  # focused run
gh workflow run release.yml -f version=0.4.0 # release; see Releasing
```

`pnpm-workspace.yaml` is load-bearing, so do not tidy it away: dropping `allowBuilds: esbuild` makes
`pnpm install` fail outright (pnpm 12 blocks esbuild's `postinstall`, which fetches its platform
binary), and `minimumReleaseAge: 0` is deliberate, not a leftover.

Test the page against a throwaway profile (`dsh plugin --profile scratch add .`): **never** install a
real boot entry, run a real service manager, or restart the harness you are running in to "check"
something.

## Structure

- `src/index.ts` (plugin entry) · `src/config.ts` (the Cordis row config).
- `src/service.ts` (panel lifecycle, entries, boot, tokens, servers, dispatch) · `src/rpc.ts`
  (`POST /api/home-hosted`, `RPC_PATH` + `API_BASE`).
- `src/tools.ts` (the agent tools) · `src/settings.ts` (the versioned settings file).
- `src/util/**` (host-only seams) · `src/home-hosted/**` (resolution, launchers, panel API/control,
  token, config file, the managed `dsh` entry, the 401 notice) · `src/boot/**` (the ladder, one
  provider per mechanism) · `scripts/` (the two esbuild wrappers plus release helpers).
- `src/client/**` (the settings page) · `src/shared/contracts.ts` (the one wire contract both halves
  share — **keep it import-free**: both esbuild entries inline it).

## Rules that matter

These prevent defects if broken. They stay here rather than in `.agentDocs/` for that reason — a rule
nobody reads is worse than a long file.

- **The plugin owns exactly** `autostart`, `onPortConflict`, `persistent` and `stop.killPortHolders`;
  a patch never carries anything else from a person's entry.
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
- **A pre-0.7 root is never read or written**; it is only *recognised* (`isLegacyRoot`) and reported as
  `legacyRoot`. home-hosted 0.8 dropped the relocation and refuses such a root, so the only remedy is
  to run the latest 0.7.x once before installing this — the refusal says so.
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
- **Invent no capability over the panel's control route, and open no unauthenticated `/api` route** to
  get around it: `/_hh` belongs to the pinned dependency, token-plus-loopback.
- **Desktop is a second surface**: the harness entry is refused there (`DESKTOP_ENTRY_UNSUPPORTED`) and
  the page shows it web-only; every other server entry is managed exactly as on web.
- **Boot entries point at a generated stable launcher**, never at a pnpm path; the marker proves
  ownership and uninstall/disable refuses an artifact this plugin did not write.
- **The `dsh` entry stays a bare `dsh`** when the project declares dsh: home-hosted resolves a bare
  command through the row's cwd and its project dir (`node_modules/.bin`) before PATH, so the
  launcher is only for an image a bare name cannot reach.
- **A mechanism stays selectable without privilege**: stage the file and return the exact commands
  rather than hiding the option.
- **The client bundle is CJS with only** `react`, `react-dom`, `react/jsx-runtime` external — never
  import `@deepseek-ai/*` into it — and every visible string needs an `en` + `zh` entry (parity is
  enforced, and a literal `t('…')` key that does not exist is a test failure).
- **A refused mutation is `ok: false` inside a successful envelope**: read the payload, not just
  `envelope.ok`, and surface it.
- **Only `home-hosted@^0.8.0` is supported**, and the floor is that same release — a 0.7.x panel is one
  this plugin cannot drive, not a lesser-supported one. See [COMPATIBILITY](.agentDocs/COMPATIBILITY.md).
- **The panel console is a first-class diagnostic** (`panel.console`): read from disk, so it needs no
  session, no token and no answering panel, and matches `home-hosted logs` line for line.

## How to work here

- **Check the callers before you change anything.** Grep who uses it and which tests name it. If the
  impact is unclear, say so — do not guess.
- **Never overwrite or delete a large section you have not understood.** Read it, or say what you could
  not determine and ask.
- **Do not invent requirements.** Build what was asked; surface what else you notice and let it be
  decided.
- **Fix the class, not the instance.** A copied helper, a rule stated twice, a guard bypassed by a
  second path is one problem: one implementation, one guard. That is the work, not a follow-up to ask
  for. Stay inside the task rather than refactoring the world.
- **Verify before claiming, and say what you checked.** A passing test is not evidence it pins
  anything — **break the thing it guards and watch it fail.** If it still passes, either the test is
  decoration or a different guard is running; find out which. Where a stub cannot answer the question,
  drive the real thing.
- **Never write an identifier from memory.** A commit hash, path, line number or version must be quoted
  from the source; a plausible-looking invented one is worse than none.
- **A stated blocker is a hypothesis, not a fact.** Re-test "cannot install X" / "tool unavailable"
  before inheriting it, and never report a failure your own flag forced.
- **Report the risk with the change** — correctness, security, operational and integration; plus what
  you could not verify and every assumption you made. An unverified claim marked as such beats a
  confident one that is wrong.
- **Missing recall of this repo?** Read this file, `.agentDocs/` and `git log` before acting, then ask
  1–3 focused questions rather than guessing at intent.
- **Two guards here looked like the one that runs and were not**: a launchd hint has two copies, and
  `assertArg`/`assertLabel` are thin delegators whose real protection is the escaper behind them. The
  copies this repo paid for are in [GOTCHAS](.agentDocs/GOTCHAS.md).
- **A "text rules" test here copied the regexes it asserted** and survived the exact change its
  comment forbade.
- **Leave the docs better than you found them**: delete what is stale, compact what has grown, and
  never leave a pointer to content that does not exist.

## Conciseness

**Prune verbose, keep correctness** — code, comments, docs alike.

- Code: a comment only for non-obvious *intent*, never to restate the line, and never long. A block
  arguing for its own change is a commit message.
- Docs: one idea per sentence. Cut anything that would not change what a reader does.
- Delete history `git log` already holds — keep the *rule* that came out of it, not the story.
- **Never drop a caveat to save a line.** Concise means no filler, not fewer facts.

## User-facing docs

`README.md` and the topical `docs/*.md` are for a person, not an agent:

- **Concise first read**, depth behind collapsible `<details>` spoilers, and **visuals for skimmers** —
  this repo's media is `assets/` (referenced by raw GitHub URL so it renders on npm too).
- **Docs ship with the change.** A user-visible change updates the docs describing it in the *same
  commit*. A stale doc is a bug like stale code.
- **A user-facing change also lands in `.agentDocs/` when it changes a rule or a trap** — but keep the
  *reasoning* there and the *rule* here.

## Releasing

**Commits are conventional** (`fix:`, `feat:`, `docs:`…), because `scripts/check-release-version.mjs`
parses them: it refuses a patch while a `!` or `BREAKING CHANGE:` commit is pending and warns on a
minor without one.

Versions are dispatched, never hand-edited:

```sh
gh workflow run release.yml -f version=0.4.0        # -f dry-run=true to rehearse
```

It gates on the macOS suite (`platform-gate.yml`) at that commit, typechecks/tests/builds, lets
changelogen bump/commit/tag `v<version>`, creates the release and publishes through npm trusted
publishing. Below 1.0 the minor means "read the notes and act"; anything else is a patch.
`prepublishOnly` runs typecheck + tests; `pnpm pack` ships `package.json`'s `files` list, which
deliberately excludes `.agentDocs/`.

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
