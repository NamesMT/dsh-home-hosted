# Migrating to home-hosted 0.7.1

Status: **in progress**. Target plugin release: **0.5.0** (0.x minor = the breaking channel).

| stage | state |
| --- | --- |
| 0 fixtures | with teammate `tests` |
| 1 layout + upgrade rule | done (`src/home-hosted/layout.ts`, `util/paths.ts`, adoption rule) |
| 2 config split | done (`readConfig`/`writeConfig` per workspace, `readGlobalSettings`/`setControl`) |
| 3 runtime/token/instances | done (`runFile`, `secretsFile`, state-root and adoption detection) |
| 4 API client | done (`?workspace=` on every servers call, `listWorkspaces`, `settings`) |
| 5 service | done (managed workspace, snapshots v2, foreign helpers, `--workspace`, log URL, `panel.migrate`) |
| 6 surface | done (page picker + migrate action, `workspace` tool param, `workspaces_list`, locales); the managed-workspace setting was removed after review |
| 7 dependency/docs/release | dependency pinned `^0.7.1`, floor `0.7.0`, docs in progress; release pending |

Decisions taken:
- **D1 — the managed workspace is the panel's `default`, fixed.** Every API call sends `?workspace=<id>`
  (the managed one unless the call names another); every file write uses `.hh/<id>/…`. A configurable
  managed workspace was built and then removed: it bought nothing but a way to write into the wrong
  workspace.
- **D1b — the page and the tools reach *every* workspace, fully.** Nothing about another workspace is read-only:
  `workspaces.list`, `servers.*` with a `workspace`, and the picker all act on it. Only the plugin's own intent
  (the `dsh` entry, snapshots, reconcile) is bound to one workspace, because that promise is about one entry.
- **D2 — require home-hosted 0.7+.** The plugin reads and writes the `.hh` layout only; a pre-0.7 root is not
  parsed. Consequence: **the upgrade order is load-bearing** — see §4 Stage 1.

## 1. What 0.7.1 changed

| | 0.6.8 (what the plugin was written against) | 0.7.1 |
| --- | --- | --- |
| state root | files directly under `$HHOSTED_HOME` | `$HHOSTED_HOME/.hh/` — global files at the top, one directory per workspace |
| servers | one `servers.config.json` holding `servers` **and** `control`/`defaults`/`logs`/`notifications`/`host`/`backups`/`ddns` | `.hh/<workspace>/servers.config.json` (`$schema`, `meta`, `servers` only) + panel settings in `.hh/settings.json` + workspace settings in `.hh/<workspace>/settings.json` |
| secrets | `.control-secrets.json` (password, API token, Telegram, DDNS) | `.hh/.control-secrets.json` (password, API token) + `.hh/<workspace>/.secrets.json` (Telegram, DDNS) |
| runtime | `run.json` | `.hh/run.json`; its `configPath` field is now the `.hh` **directory** |
| registry | — | `.hh/workspaces.json`; a `default` workspace always exists |
| API | path only | every scoped route takes `?workspace=<id>` (omitted → the panel's default workspace); `/api/workspaces` CRUD; global `/api/settings` vs `/api/settings/workspace` |
| CLI | `start/stop <id>` | `start/stop <id> [--workspace <id>]`; `--config` now means the default workspace's servers file |
| upgrade | — | the first 0.7 `up` relocates a 0.6 root into `.hh` and splits it; `home-hosted migrate` reports and stamps it. No `.bak` for the relocation, but `.hh/.layout-migration.json` lists what moved |

Verified against the 0.7.1 source: `.hh` paths and helpers in `src/helpers/paths.ts`; `run.json` fields in
`src/helpers/daemon.ts` and its write in `src/index.ts`; the workspace default in `src/api/servers/$.routes.ts`
(`requireWorkspace` with `workspace?`); `/api/workspaces` in `src/api/workspaces/$.routes.ts`.

## 2. Where this plugin touches those paths

| file | coupling |
| --- | --- |
| `src/util/paths.ts` | `configFile()`, `secretsFile()`, `runtimeFile()`, `hasLivePanel()` assume root-level files |
| `src/home-hosted/config-file.ts` | reads/writes `servers` **and** `control` in the one file; owns the `meta` contract |
| `src/home-hosted/runtime.ts` | `readRuntime()` reads `<root>/run.json` |
| `src/home-hosted/token.ts` | `apiTokenEnrolled()` reads `<root>/.control-secrets.json` |
| `src/home-hosted/instances.ts` | `isStateRoot()` = config **or** run.json at the root; per-instance `servers` count |
| `src/home-hosted/panel.ts` | API client; `/api/servers*` calls carry no `?workspace=` |
| `src/service.ts` | entry CRUD via API and via file; `configuredPort()`/`applyPanelPort()` read/write `control`; snapshots keyed by entry id; foreign-panel paths |
| `src/tools.ts`, `src/shared/contracts.ts` | `instance` targeting, no workspace dimension; copy names `servers.config.json` |
| `src/client/**` | page sections, `panelLogUrl()` (`/logs?server=`), copy; locales `en` + `zh` |

## 3. Decisions

| # | decision | choice |
| --- | --- | --- |
| D1 | Workspace the plugin manages | the panel's `default`, fixed (a setting was tried and removed) |
| D2 | Pre-0.7 roots | not supported for reads or writes; 0.7+ required |
| D3 | The managed entry id | `defaultEntryId` (`dsh`) keyed by `(workspace, id)` — a `dsh` in another workspace is a different entry |
| D4 | The page's server list | every workspace, selectable; the managed one is named as such |
| D5 | Version floor | `EXPECTED_RANGE = '^0.7.1'`, `MIN_SUPPORTED_VERSION = '0.7.0'` |

## 4. Plan

**Stage 0 — fixtures first.** A real 0.7.1 home with two workspaces (`.hh/workspaces.json`, both workspace
dirs, a `run.json` whose pid is or is not alive) committed as a test fixture, replacing the root-level shape
the suite builds today. Verify: every existing test that needs a config is now built through the fixture helper.

**Stage 1 — layout, and the upgrade-order rule.** New `src/home-hosted/layout.ts` with fixed 0.7 paths:
`serversFile(home, ws)`, `workspaceSettingsFile(home, ws)`, `globalSettingsFile(home)`, `secretsFile(home)`,
`runFile(home)`, plus `readWorkspaces(home)` / `defaultWorkspace(home)` (from `.hh/workspaces.json`; `default`
when absent). It also exposes one **detection-only** fact: `isLegacyRoot(home)` — a root with
`servers.config.json`/`run.json` at the top but no `.hh`. That fact is never used to read or write; it exists so
adoption still sees an install that has not been started on 0.7 yet, and so a write can refuse with an
actionable message ("start the panel once — 0.7 relocates this root to `.hh` — or run `home-hosted migrate`").
Verify: unit tests for the paths and for `readWorkspaces` (missing, unreadable, empty); a legacy root is
recognized but every write path refuses it.

**Stage 2 — config-file layer.** `config-file.ts` splits in two concerns: the **workspace** servers file
(`servers` + `meta`, unchanged contract) and the **global** settings file (`control`). `readConfig(home)` becomes
`readServers(home, workspace)`; `patchControl` writes `.hh/settings.json` and preserves every other global key.
Verify: two-phase add still applies under the 0.7 watcher; `meta.schema` preserved; an unknown key survives;
`control.port` patched without dropping `host`, `backups` or `auth`.

**Stage 3 — runtime, token, instances.** `runtimeFile`/`secretsFile` move under `.hh`; `readRuntime()` reads
`.hh/run.json`; `apiTokenEnrolled()` reads `.hh/.control-secrets.json`; `isStateRoot()` recognizes a 0.7 root
(`.hh/workspaces.json` or `.hh/run.json`); `hasLivePanel()` counts a 0.7 root whose `run.json` pid is alive, and
**also** a legacy root with a live panel, so the machine-wide install is still adopted once before it migrates.
The instance `servers` count becomes the managed workspace's count.
Verify: adoption of the machine-wide `~/.home-hosted` before and after its first 0.7 start — the highest-risk case.

**Stage 4 — API client.** `PanelClient` takes a `workspace` and appends `?workspace=` to every `/api/servers*`
call; add `listWorkspaces()` (`GET /api/workspaces`) and `settings()` (`GET /api/settings`) for the page.
Verify: with two workspaces, an entry created in the non-default one is invisible to a client without the
query — the test asserts the query is what selects it.

**Stage 5 — service.** Managed entry CRUD, snapshots and reconcile key on `(workspace, id)`; the snapshot file
gains a workspace key with a read-time migration from the flat shape. `configuredPort()` reads `.hh/settings.json`;
`applyPanelPort()` patches it. Foreign panels use the same fixed 0.7 paths and the managed workspace (or the
workspace named by the call). `panelLogUrl()` becomes `/w/<workspace>/logs?server=<id>` — the legacy `/logs?…`
redirects to the **default** workspace, which is wrong once a call may name another.
Verify: dsh entry add/repair/pause/restore on 0.7.1; a foreign panel edit; the log URL lands on the right workspace.

**Stage 6 — surface.** Plugin setting `workspace`; tool parameter `workspace` on
`servers_list`/`servers_lifecycle`/`servers_edit`; the page names the workspace and offers a picker; locales
`en` + `zh` for every new string; copy that says `servers.config.json` names the workspace file instead.
Verify: locale parity test, tool approval rules unchanged, `status` payload lists workspaces.

**Stage 7 — dependency, docs, release.** `home-hosted` → `^0.7.1`; `EXPECTED_RANGE`/`MIN_SUPPORTED_VERSION`;
README, this doc, `docs/DESIGN.md` ("Config compatibility was dropped", "One panel root", "Several panels on one
machine" all need the workspace dimension); rebuild `lib/**` (committed artifacts); release **0.5.0** with a
`BREAKING CHANGE:` footer naming the upgrade: install `dsh-home-hosted@0.5.0` **and** let the panel start once on
`home-hosted@0.7` so its root relocates — 0.4.x and 0.7 are not a supported pair.

## 5. Tests

- Fixture helper `makeHhHome({ workspaces, running })` replacing the root-level config builder; a
  `makeLegacyRoot()` used only by the detection/refusal tests.
- Update: `config-file`, `paths`, `instances`, `panel`, `service`, `tools`, `reconcile`, `dsh-entry`, `token`,
  `web-notice`, `test/client/*`.
- Add: fixed-path assertions; `readWorkspaces` edges; API-client workspace selection; adoption before/after
  migration; snapshot migration; legacy-root write refusal.
- Live check on a throwaway profile: a real 0.7.1 home with two workspaces, dsh entry lifecycle, the page, and
  one foreign panel — never install a real boot entry or restart the running harness.
- Gates: `pnpm typecheck && pnpm test && pnpm build`, then the platform gate via the release dry run.

## 6. Risks

| risk | why it matters | mitigation |
| --- | --- | --- |
| Adoption breaks on upgrade | the machine-wide `~/.home-hosted` is still a 0.6 root until it is started once; the plugin would silently switch to `stateDir/panel` and the page would look empty | detection-only `isLegacyRoot` keeps adoption; the write path refuses with the migration instruction (Stage 1) |
| A write lands on a not-yet-migrated root | the plugin writes a file the 0.7 panel never reads | every write asserts `kind === 'hh'` and fails loudly otherwise |
| `meta.schema` invented | an unreadable stamp stops the panel booting | unchanged rule: preserve, never invent |
| Snapshot key now needs the workspace | an adopted `dsh` in another workspace would be restored/removed wrongly | key `(workspace, id)` + read-time migration |
| 0.6 panel + new plugin | `?workspace=` is ignored and paths are stale | out of support (D2); `MIN_SUPPORTED_VERSION` reports it on the page |
| Old plugin + new panel | the pinned 0.7.1 CLI migrates the root under an un-updated plugin, which then reads the wrong paths | release 0.5.0 with the upgrade note; `status` calls out a legacy root |

## 7. Rollback

The plugin's copy is a dependency pin: `dsh plugin add dsh-home-hosted@0.4.5` plus restoring the plugin state
file. A migrated panel root is not rolled back by the plugin — `.hh/.layout-migration.json` records what moved,
and a 0.6 binary would need those files back at the root.

## 8. Answers (decided)

1. **Yes** — the page offers the migration: endpoint `panel.migrate` runs `home-hosted migrate --yes`, and
   `HomeHostedStatus.legacyRoot` tells the page when to show it.
2. **All of them, and not read-only** — see D1b. Nothing in a workspace other than the managed one is
   view-only; the distinction is *reconciled* vs *managed by hand*, not readable vs writable.
3. **Yes** — `status` reports the managed `workspace`, and every `ServerEntryView` carries its own
   `workspace`, because a server id alone no longer identifies an entry.

## 9. Remaining

- Stages 0 and 6 landed (teammates `tests` and `client`); the `workspace` setting removal followed.
- Rebuild `lib/**`, run the platform gate through a release dry run, then release 0.5.0 with the
  `BREAKING CHANGE:` footer naming the upgrade order (plugin first, then let the panel start once on 0.7).
