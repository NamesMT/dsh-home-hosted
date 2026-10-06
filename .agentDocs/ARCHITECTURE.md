# Architecture — what each half owns, and why

`AGENTS.md` has the file map. This is the reasoning behind it: why the shapes are what they are, so
you can judge a change instead of guessing at it. User-facing behaviour lives in `docs/`.

## One package, two halves

The host is `src/**` and the browser half is `src/client/**`. `cordis.patch.yml` declares both
through `dsh.bundle` and `dsh.client`. They share exactly one wire contract,
`src/shared/contracts.ts`.

**Both bundles are committed** (`lib/index.js`, `lib/client.js`), so a change to either half must be
followed by its build. CI builds too, but a stale `lib/` in a commit is what users install. That is
what makes a non-registry install work at all: pnpm resolves a local path to `link:` and runs no
`prepare`, and a git-hosted `prepare` is refused until the user allowlists it in the profile's
`pnpm-workspace.yaml` — so never move the build behind a `prepare` script. Sourcemaps and `lib/types/`
are gitignored; `prepack` rebuilds both into the published tarball.

**The client bundle is CJS with only `react`, `react-dom` and `react/jsx-runtime` external.** Never
import `@deepseek-ai/*` into it — the host may, the browser half may not.

**`src/shared/` must stay importable by both halves.** It has no imports at all today, which is what
makes it safe: both esbuild entries inline it and neither pulls in a node builtin. `src/util/*` is the
host-only one — it uses `node:` APIs and the client never touches it. Adding a node import to
`src/shared/` would break the client build, so put host-only helpers in `src/util/`.

## Layout

- `src/index.ts` — plugin entry: settings, service, RPC, tools, startup reconcile, sign-in notice.
- `src/config.ts` — the Cordis row config: `stateDir`, `homeHostedCommand`, `defaultEntryId`.
- `src/service.ts` — the orchestrator: panel lifecycle, entries, boot, tokens, servers, dispatch.
- `src/rpc.ts` — the page's transport, `POST /api/home-hosted` (`RPC_PATH` + `API_BASE`).
- `src/tools.ts` — the agent tools; `src/settings.ts` — the versioned settings file.
- `src/util/**` — paths, fs/exec seams, and `surface.ts` (which dsh surface this is: web or Desktop).
- `src/home-hosted/**` — resolution and version constants, launchers, panel API, panel control, token,
  owned keys, config file, the managed `dsh` entry, the 401 notice.
- `src/boot/**` — the autostart ladder: one provider per mechanism, plus payload builders and the
  ownership marker in `common.ts`.
- `src/client/**` — the settings page (sections + primitives + locales).
- `scripts/` — the two esbuild wrappers plus the release version/notes helpers.

## The two documentation sets

- `docs/*.md` — **user-facing**, published, split by topic: `DESIGN.md` (index), `BOOT.md`,
  `PANEL.md`, `ENTRIES.md`, `WORKSPACES.md`, `AGENT-TOOLS.md`. Concise, with depth in `<details>`
  spoilers. Keep them current in the same commit as the change.
- `.agentDocs/*.md` — **agent-facing**, not published. The traps and the reasoning behind the rules.
  This file plus `GOTCHAS.md` and `COMPATIBILITY.md`.

A fact that a user needs goes in `docs/`. A fact that only prevents a future defect goes here.

## Writing to the panel: API first, then file

The panel's API is preferred when it answers and this plugin's token proves itself. Otherwise the
write goes straight to `.hh/<workspace>/servers.config.json` (atomic, schema-shaped); the panel's
`control` block lives in `.hh/settings.json` and is patched there.

Why it matters beyond correctness: home-hosted's config store compares the bytes it last wrote, so an
API write never triggers its file watcher. A direct file write does — and the watcher *starts* a newly
added entry. So the two-phase add exists: write the entry with `autostart: false`, then flip it. See
[`../docs/ENTRIES.md`](../docs/ENTRIES.md).

## The boot ladder

`src/boot/` is one provider per mechanism behind a shared ladder. `detect()` reports candidates;
`status()` reports what is installed now; `install()`/`uninstall()` write the artifact. Adding a
mechanism is a provider file plus a line in `ladder.ts`.

`BootStatus.candidates[].reason` is the host's own sentence explaining a mechanism on *this* machine.
The page renders it — do not re-derive that wording in the client, or the two will drift.

The ladder is injected at the `run` seam, so tests never touch a real service manager. Payload
builders are pure and snapshot-pinned.

## Agent tools and the page

The page and the tools are two consumers of one `service.call` dispatch, which is why a refusal is
`ok: false` **inside a successful envelope**: read the payload, not just `envelope.ok`.

Tools are declared in `src/tools.ts` against `AgentToolName` and gated by the session's sandbox. The
declared parameter list is the *only* thing a model can see, so a field the panel accepts but the tool
never names is a capability with no way to reach it.

## How to test

`pnpm typecheck && pnpm test && pnpm build` — what CI runs. One half at a time:
`pnpm build:host` / `pnpm build:client`. Focused: `pnpm exec vitest run test/client -t <name>`.

Never install a real boot entry, run a real service manager, or restart the harness you are running in
to "check" something. Test the page against a throwaway profile: `dsh plugin --profile scratch add .`.
