# Compatibility — what may change, and what may not

Two surfaces outlive the release that wrote them: **settings files absolutely, the page within
reason.** The rules are in `AGENTS.md`; this is the reasoning and the exact pin.

## The version pin

`dependencies['home-hosted']` in `package.json` and `EXPECTED_RANGE` in `resolve.ts` **must agree** —
`test/resolve` fails if they diverge, and asserts `MIN_SUPPORTED_VERSION` lies inside the range. The
page offers `EXPECTED_RANGE` to install and warns when a global copy is older; bumping one alone makes
it recommend a range the plugin is not built against.

The pin is `^0.7.19`. `MIN_SUPPORTED_VERSION` is `0.7.0` and stays there.

**A capability that needs a newer 0.7.x degrades; it never raises the floor.** A `^0.7.3` range already
admits every 0.7.x, so a feature added in 0.7.12/0.7.13 (`logs`, `restart <id>`) is reachable without
moving the pin — and a *local* panel older than it is a real scenario, not a mistake. The newer path is
tried first and an unknown-command refusal falls back to what that panel can do
(`lifecycleForeign`). Detect the refusal from the CLI's own text and know **all** its shapes: a
pre-0.7.13 panel answers a 404 through the daemon, while a 0.7.12 CLI rejects the positional with
`Unexpected argument` — the one a 404-only check misses. Both are pinned in `test/service`.

### Re-checking a bump

A bump is the two constants plus the version-coupled tests — *unless* the release moved something this
plugin names: a path under `.hh`, `CONFIG_SCHEMA`, `serverSchema`, `/api/settings`, or a CLI
subcommand. Check by **use**, not by filename: `docs/PANEL.md` records which upstream surfaces were
checked and why none reaches this plugin. Filenames alone cannot show that a change reaches us — they
disagree as soon as a comment lands in a schema file.

**0.7.4 → 0.7.19 moved one thing that does reach us**, and no filename showed it. Upstream `applyPatch`
began deleting a top-level key set to `null` (`1f58a5d`, 0.7.18), and `serverSchema.label` began to admit
`null` (`45d689e`). This plugin keeps its own copy of that function for the file fallback, so the two
had to be made to agree again — one `applyPatchFields` with the top-level branch, plus one
`nullGroupRefusal` read by `src/service.ts` **and** `patchEntry`/`patchControl`, so a null group is
refused identically whichever path would carry it. No shipped caller reached the harmful case — the
tool layer's own field types admit a `null` only for `port`/`bootstrap`, the two the panel's schema
accepts, and the page emits `port` alone — but the drift was real and the next field to allow `null`
would have exposed it. Measured against a real 0.7.19 panel: `PATCH {port:null}` deletes the key, and
only `port` and `bootstrap` have a schema admitting `null`.

## Settings files

`src/settings.ts` holds `SETTINGS_VERSION` and migrates on **read**, never in `update()`.

- An **absent** optional and an explicit **`null`** are different, and a read path that assumes the
  first crashes on the second: `lastAttempt` was spread through whenever it was not `undefined`, so a
  stored `null` — what a cleared optional looks like written back — reached the page and took the Boot
  section down. Non-records are rejected at both ends now.
- An explicit empty tool allowlist means "no tools"; the old default pair means "nobody chose". That
  distinction is bound to `PRE_MERGE_SETTINGS_VERSION`, the release that merged the tools — never to
  the current stamp, or a later release reinterprets a deliberate choice as a default.
- A new agent tool is **not** retro-added to an existing allowlist. Renaming one needs a
  `LEGACY_TOOL_NAMES` entry, or an upgrade silently disables it.

## The page

The host and the page ship separately: an upgrade writes a new `lib/client.js` while an older host may
be answering. So:

- **A new response field is optional and read defensively.** A required field blanks the page instead
  of degrading it. A field is read as a **value**, not as a key being present — a sentence that read
  `boot.recommended` straight into a template rendered the literal `"would use undefined"` against a
  panel that omits it.
- **Every visible string needs an `en` + `zh` entry**; parity is enforced, and a literal `t('…')` key
  that does not exist is a test failure.
- **The client bundle's externals do not change**: `react`, `react-dom`, `react/jsx-runtime`. Adding
  another means editing `scripts/build-client.mjs` deliberately, not by accident.

## Config compatibility against older panels

`onPortConflict: kill` arrived in home-hosted 0.6.0 and `persistent` in 0.6.3, and an older panel
handed either key can refuse to *boot* from the config. The plugin used to consult the answering
panel's version and refuse or drop them (`KILL_UNSUPPORTED`). **That is gone on purpose**: it pins
`^0.7.19` and autostarts its own copy, so a panel older than those keys is only reachable by
deliberately preferring an old global install, and this is pre-1.0. Supporting older panels again
means restoring that check from history, not re-deriving it.

`writeConfig` keeps the panel's `meta` and never invents `meta.schema`: an absent schema reads as the
panel's current one, while a stale stamp stops the panel booting.

## How to test

`test/service` pins the CLI-refusal shapes, `test/resolve` the pin agreement, `test/settings` the read
migrations and the non-record guards, `test/config-file` the merge-key parity against the pinned
dependency. When a compatibility claim changes, break the guard you are relying on and watch a test
fail before believing it.
