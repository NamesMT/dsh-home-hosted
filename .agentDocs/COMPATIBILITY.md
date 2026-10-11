# Compatibility — what may change, and what may not

Two surfaces outlive the release that wrote them: **settings files absolutely, the page within
reason.** The rules are in `AGENTS.md`; this is the reasoning and the exact pin.

## The version pin

`dependencies['home-hosted']` in `package.json` and `EXPECTED_RANGE` in `resolve.ts` **must agree** —
`test/resolve` fails if they diverge, and asserts `MIN_SUPPORTED_VERSION` lies inside the range. The
page offers `EXPECTED_RANGE` to install and warns when a global copy is older; bumping one alone makes
it recommend a range the plugin is not built against.

The pin is `^0.8.0`. `MIN_SUPPORTED_VERSION` is `0.8.0` too: 0.8.0 dropped the pre-workspace state
relocation and now *refuses* a 0.6.x root, so a 0.7.x panel is not a lesser-supported copy — it is one
this plugin cannot drive. The floor used to sit at `0.7.0` with capabilities degrading, which is why
`lifecycleForeign` once fell back to a stop-then-start pair for a panel without `restart <id>`; every
supported release has that command, so the fallback was dead weight and is gone.

An old state root is upgraded by running the **latest 0.7.x once**, before installing 0.8 — its first
run performs the move. That instruction lives in the release notes and in the refusal text, not in the
code, so the plugin carries no migrator of its own.

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

**0.7.20 did not move a named surface either, and it still found a real defect here.** Its one fix
teaches that **a pid is not an identity**: the OS recycles pids and a zombie still answers signal 0, so
home-hosted's `up`/`status`/`down` now decide with `runtimeLiveness(pid, startedAt)` and `down` refuses
to signal a pid it cannot prove is the panel. This plugin's two generated helpers had re-derived the
weak predicate — they escalated `SIGTERM`→`SIGKILL` on "the pid answers". **Measured**: run against a
live `sleep` that "inherited" the recorded pid, the activation helper delivered a real `SIGTERM` to a
process that was never the panel. Both helpers now leave every signal to the CLI's own `down`, which is
the only component that can prove identity; `test/panel-control` pins that by asserting no signal
literal survives in either generated script. The same predicate was re-derived a third time in
`panelStatus`, whose `reachable` local was dead — it now reads `answered`, so nothing there claims
liveness from a pid.

**0.7.21 changed one field of one schema, and it was the bug this file had already flagged as latent.**
`editableFields.label` (which feeds `serverPatchSchema`, not `serverSchema`) became
`labelOrNullSchema`, so `PATCH {label:null}` now clears a label instead of answering 400 (`1681a62` —
upstream's own follow-up to the `1f58a5d` drift recorded above, whose message had cited the *control*
patch schema while the editor validates against the other one). Our editor had the matching gap on the
sending side: it cleared a label with `''`, which the panel *accepts* and stores — so every
`label ?? id` display then shows a blank label instead of the id, and nothing reports a failure. It now
sends `null`, and the tool layer's `label` admits one. Both are asserted against the pinned release:
`panelNullablePatchFields()` reads `editableFields` from the shipped sourcemap, so the day a field
becomes nullable the parity guard fails instead of the hardcoded `['bootstrap', 'port']` silently
lying. The other five commits in this release reach nothing this plugin names — verified by use, not
filename: no `.proxy/proxy.json`, `ProxyService`, `terminatePid`, `DELETE /api/logs`, and `serverSchema`,
`CONFIG_SCHEMA`, `/_hh` and the CLI are untouched.

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

## What an older panel can no longer be

`onPortConflict: kill` (0.6.0), `persistent` (0.6.3), `restart <id>` (0.7.13), the nullable-`label` patch
(0.7.21): every one of those arrived before the floor, so nothing needs a version check to stay safe.
The plugin used to consult the answering panel's version and refuse or drop keys (`KILL_UNSUPPORTED`),
and later to retry a `restart` as a stop-then-start pair; both are gone, because both existed only for
panels this release refuses anyway.

`writeConfig` keeps the panel's `meta` and never invents `meta.schema`: an absent schema reads as the
panel's current one, while a stale stamp stops the panel booting.

## How to test

`test/resolve` pins the two range constants against each other and the floor inside them,
`test/service` the panel-targeting rules, `test/settings` the read migrations and the non-record
guards, `test/config-file` the merge-key parity against the pinned dependency. When a compatibility
claim changes, break the guard you are relying on and watch a test
fail before believing it.
