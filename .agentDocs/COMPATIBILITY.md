# Compatibility — what may change, and what may not

Two surfaces outlive the release that wrote them: **settings files absolutely, the page within
reason.** The rules are in `AGENTS.md`; this is the reasoning and the exact pin.

## The version pin

`dependencies['home-hosted']` in `package.json` and `EXPECTED_RANGE` in `resolve.ts` **must agree** —
`test/resolve.test.ts` fails if they diverge, and asserts `MIN_SUPPORTED_VERSION` lies inside the
range. The page offers `EXPECTED_RANGE` to install and warns when a global copy is older; bumping one
alone makes it recommend a range the plugin is not built against.

The pin is `^0.9.4`, and `MIN_SUPPORTED_VERSION` is `0.9.0`: 0.9.0 raised the config schema to 2
**and** made an unstamped file read as schema 1, so a config this plugin created without a stamp is
refused by 0.9 ("config schema 1 needs 1 migration") while a schema-2 stamp is refused by 0.8 as a
newer release's file. No stamp satisfies both gates, so a 0.8.x panel is not a lesser-supported copy —
it is one this plugin cannot drive, and the floor moved with the pin.

The pin moved to 0.9.4 without the floor moving, because that release adds nothing this plugin needs.
Everything it ships is additive and read as a value, never as a key being present — see
[PANEL](../docs/PANEL.md#which-home-hosted-runs) for the surfaces checked.

### The schema stamp

**A file this plugin creates carries `meta.schema`, read from the pinned release** (`panel-schema.ts`
reads `CONFIG_SCHEMA` from the dependency's shipped sourcemap). Hard-coding the number is the defect
this replaced: `2` would be wrong at the next bump, from the other side, and nothing would say so.

**A write refuses a file whose stamp is not the pinned schema — either direction, or absent.** Below it
needs `home-hosted migrate`; above it was written by a newer release than this plugin pins. Writing
over either claims a migration that never ran, and the panel then refuses to boot what this plugin
keeps editing. Measured on a real 0.9.2 panel: a `schema: 2` stamp over an old
`notifications.telegram` block makes the panel report the key as unrecognized and ignore it, so the
notifications end up silently off with no error anywhere. Only `home-hosted migrate` may lift a
config; the refusal names it.

**Judge the stamp from the file, not from the caller's object.** `writeConfig` receives whatever the
caller built, and `upsertEntry({}, …)` hands in a fresh `{}`; reading `raw.meta` then reported "carries
no meta.schema" for a file that declared one, naming the wrong problem. `stampedMeta` reads the file
on disk and lets the caller's keys only fill what it does not have.

**A refused write carries a wire `code`.** `rpc.ts` answers with an error's own `code`, so a config
refusal reported `INTERNAL` until `ConfigLayoutError`/`ConfigPatchError` carried one — a message with
nothing for the page to key a remedy to.

**One rule, and the read reports it too.** `schemaRefusal` is what a write refuses with and what
`status` puts in `lastError`, so the page warns before a call is attempted instead of the root looking
healthy until the first write fails. It is deliberately **not** inside `readConfig`: discovery and
every foreign-panel call read through that, so judging there made a 0.9-era sibling panel report as
unreadable and hid the entries it still holds — measured, it broke instance discovery. A read serves
what the file says; only acting on it is refused.

### Re-checking a bump

A bump is the two constants plus the version-coupled tests — *unless* the release moved something this
plugin names: a path under `.hh`, `serverSchema`, `/api/settings`, or a CLI subcommand. **Check by use,
not by filename**: a change that reaches this plugin can live in a function body, and filenames
disagree as soon as a comment lands in a schema file. `docs/PANEL.md` records which surfaces were
checked. **Measure a schema question against the real panel, not `--print-config`** — it does not
validate the servers file, so a probe built on it reports every case as safe; use `/api/workspaces`
`configError` or a PATCH status.

## Copies of the panel's own semantics

**A copy of the panel's function is a fork of its semantics, so a bump can silently split them.** This
plugin keeps `applyPatchFields`/`mergeGroup` (`src/home-hosted/config-file.ts`) because the file
fallback must mean what the API means: upstream's top-level `null` *deletes* a key, and the copy must
too, or the panel refuses to boot the file it wrote. The null-group refusal is one `nullGroupRefusal`
read by `src/service.ts` **and** `patchEntry`/`patchControl` for the same reason.

**`null` clears a key; `''` stores a blank one, and only a schema that admits `null` may carry it.**
Clearing a label must send `null` — the panel stores `''`, so every `label ?? id` display then shows a
blank label and nothing reports a failure. Read the nullable set from the pinned release, never
hand-list it: `panelNullablePatchFields()` (`test/helpers/panel-schema.ts`) reads `editableFields` from
the shipped sourcemap and asserts it against the tool layer (`test/tools.test.ts`), so a newly nullable
field fails the parity guard instead of arriving as a bug.

**A pid is not an identity, and the plugin must never signal on one.** Pids are recycled and a zombie
answers signal 0. Only the CLI's own `down` may signal, because it alone can prove identity from
`run.json`'s `startedAt`; a generated helper waits and logs instead. Prove the class by **signal
delivery**, never by "is it still alive".

## Settings files

`src/settings.ts` holds `SETTINGS_VERSION` and migrates on **read**, never in `update()`.

- An **absent** optional and an explicit **`null`** are different: `lastAttempt` was spread through
  whenever it was not `undefined`, so a stored `null` — what a cleared optional looks like written
  back — reached the page and took the Boot section down. Non-records are rejected at both ends now.
- An explicit empty tool allowlist means "no tools"; the old default pair means "nobody chose". That
  distinction is bound to `PRE_MERGE_SETTINGS_VERSION`, the release that merged the tools — never to
  the current stamp, or a later release reinterprets a deliberate choice as a default.
- A new agent tool is **not** retro-added to an existing allowlist; renaming one needs a
  `LEGACY_TOOL_NAMES` entry, or an upgrade silently disables it.

## The page

The host and the page ship separately: an upgrade writes a new `lib/client.js` while an older host may
be answering. So **a new response field is optional and read defensively** — a required field blanks
the page instead of degrading it, and a field is read as a **value**, not as a key being present (a
sentence that read `boot.recommended` straight into a template rendered `"would use undefined"`
against a panel that omits it). **Every visible string needs an `en` + `zh` entry**, and **the client
bundle's externals do not change** (`react`, `react-dom`, `react/jsx-runtime`); adding another means
editing `scripts/build-client.mjs` deliberately.

## The panel's control route

`/_hh` is the pinned dependency's own control route — four routes (`shutdown` plus three lifecycle),
token-plus-loopback, with no local path to proxy, backups, TLS or config
(`node_modules/home-hosted/dist/cli.js`). This repo registers none of it, so a capability cannot be
invented over it; the rule this plugin owns is that nothing may open an unauthenticated `/api` route
to get around it.

## What an older panel can no longer be

`onPortConflict: kill` (0.6.0), `persistent` (0.6.3), `restart <id>` (0.7.13), the nullable-`label`
patch (0.7.21) and the relocating pre-workspace root (0.8.0) all predate the floor, so none needs a
version check; the version probes and the stop-then-start `restart` retry are gone with them.
`writeConfig` keeps the panel's `meta` and stamps `meta.schema` on a file it creates, read from the
pinned release: an absent schema reads as the **oldest** shape, while a stamp above what the panel
understands stops it booting.

## How to test

`test/resolve.test.ts` pins the two range constants against each other and the floor inside them,
`test/service.test.ts` the panel-targeting rules, `test/settings.test.ts` the read migrations,
`test/config-file.test.ts` the merge-key parity against the pinned dependency. When a compatibility
claim changes, break the guard you are relying on and watch a test fail before believing it.
