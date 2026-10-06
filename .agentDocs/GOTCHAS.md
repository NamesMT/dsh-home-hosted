# Gotchas — the traps this repo already paid for

Why each rule in `AGENTS.md` exists, and what went wrong when it was broken. Read the section for
the area you are touching; you do not need all of it.

`AGENTS.md` carries the rule. This file carries the cause, so a rule that looks arbitrary can be
judged rather than obeyed blindly.

## Testing

A green tick says an assertion held. It does not say the code ran, or that the assertion would fail
if the code broke. Every trap below is a case where it did not.

- **A test that re-states a rule pins nothing.** A "text rules" test copied two PowerShell regexes
  into its assertions. Changing the real rule to scan `stdout` **and** `stderr` — the exact
  "improvement" the test's own comment forbade — failed no assertion, because the copy was
  unchanged. Same for un-anchoring `/^true$/im` to `/true/i`. Both drive
  `createWindowsTaskProvider` now, so the plausible change fails the test that forbids it. **If the
  test would still pass after the rule under it is broken, it is documentation, not a test.**
- **Instrument the branch, then break the guard you named — in that order.** A `console.error`
  inside `launchd.status()`'s `domain === null` return printed nothing across the whole boot suite:
  no test reached it, and removing only that branch's log-path hint failed nothing. The branch is
  covered now and the probe confirms it fires. Before believing a test covers a branch, make the
  branch tell you it ran.
- **Break the guard you *named*, then grep for a second occurrence before editing one by hand.** An
  attempt to break a launchd hint removed the wrong copy — there are two, one per return — which
  looked like a coverage gap when the test did cover the other. Confirm *which* site you changed
  before concluding from the result.
- **A guard test's input must fail for the reason the test claims.** Each platform `validate(spec)`
  checks in order, so an input violating an *earlier* rule tells you nothing about the later one.
  Audit by breaking one rule in isolation and seeing which assertion fails. Two rules were genuinely
  uncovered this way — `assertLabel`'s and `assertRegistryValueName`'s `!== ''` checks — and both
  are **unreachable through a real `validate(spec)`** (`spec.label` is a constant, and the registry
  name arrives already narrowed by `assertUnitName`). They are asserted directly, at a call with no
  preceding check, and the reachability claim is itself asserted.
- **Count the runtime characters of a test value.** `'\n'` is one character; `'\\n'` is two. A test
  written to prove "a newline is refused" that actually passes backslash-n proves nothing about
  newlines.
- **A test that cannot run must report `skipped`, never `passed`.** vitest treats an early `return`
  in a test body as a pass, so `if (!fs.existsSync(x)) return` claims a verification it never
  performed. Use `it.skipIf`/`it.runIf` with the condition computed at **module load** — they
  resolve at collection time, before any `beforeAll`, so a flag set in a hook cannot work. Four
  instances were found here, each having silently asserted nothing. When a conditional is
  unavoidable, **force the branch with a preceding assertion** (`expect(cond).toBe(false)`) so the
  guarded assertion always runs.
- **A test that reads a path relative to the process cwd is a portability trap**, not a signal: it
  passes at the repo root and fails anywhere else. Resolve from `import.meta.url`
  (`test/helpers/panel-schema.ts` is the shared reader for the panel's own `serverSchema`). Never
  hard-code one machine's absolute path — an earlier guard named `/home/mt/...` and so ran nowhere
  else.
- **A component can be driven, not only reasoned about.** `happy-dom` is a devDependency and a
  `// @vitest-environment happy-dom` comment on one file is the whole setup; with `react-dom/client`
  plus `act` that mounts a real section and clicks it, with no provider stack. Reach for it when a
  fix lives in a component's *wiring* — `scopedSelection` being correct proves the helper, not that
  the section applies it to all three of its selections. `test/client/servers-scoping.test.tsx` is
  the pattern, **including a control case** (same workspace, unrelated re-render) so a failure
  cannot be misread as "the editor closed for some other reason".
- **A test that passes only alongside another is not tested.** Every test in this repo also passes
  in isolation (`vitest run -t <name>` with the rest skipped). Check that when you add one whose
  fixture depends on a directory, a file or a settings value.
- **Give an absent-case test its own fixture.** Asserting "nothing is named when the entry is
  absent" against a shared temp home that a previous test left a unit file in makes it pass or fail
  for the wrong reason.

Tests here never bind a fixed port, start a real service manager, or write outside a temp dir; boot
providers take the injected `run` seam and pin payloads with snapshots. macOS temp dirs resolve
differently (`/var/…` → `/private/var/…`), so compare canonical paths. Windows is not gated yet — the
suite still carries POSIX assumptions, so port it before adding a Windows leg.

## Boot and platforms

- **One control-character rule is the right width for three formats, measured not assumed.** A value
  carrying `\n` is how it escapes its field in a systemd unit, a plist and a `.cmd` line.
  `assertNoControl` covers all three with one regex, and the width was checked against real parsers:
  `systemd-analyze verify` reads `User=a<U+2028>RunAs=root` as *one* value and only a genuine `LF`
  starts a directive; real `cmd.exe` runs `rem a<U+2028>echo INJECTED` as one line; Python's XML
  parser keeps `U+0085`/`U+2028`/`U+2029` as character data. A *wider* rule would reject legitimate
  values for no gain. It does catch `\r`, NUL and `DEL`, and `%`/`&`/`|`/`^` in a `.cmd` are handled
  by the escaping (`batchEscape`), not by this guard.
- **An exported builder must not rely on its callers.** `systemdUserUnit`, `systemdSystemUnit`,
  `launchdPlist` and `xdgDesktopEntry` all call `validate(spec)` themselves; `windowsRunPayload` did
  not, yet interpolates `spec.marker` straight into the generated `.cmd`'s `rem` line. Every
  production caller validated, so nothing was exposed — but that is an assumption invisible from
  inside the function, and a hostile marker yields `rem ok<CRLF>echo PWNED<CRLF>node …`.
- **The thin delegators are defence in depth, not the sole guard.** `assertArg`, `assertLabel` and
  `assertRegistryValueName` are one-liners over `assertNoControl`, and neutering any fails no test:
  the escapers (`systemdExecWord`, `systemdText`, `desktopExec`, `windowsArg`) independently reject
  the same input. Left as-is deliberately. Their unique contributions are the non-empty rules, and
  those are unreachable from the real path.
- **A rule that matches a tool's text must be tested against the tool's real text, and the stream it
  reads.** Six rules here classify by reading output. The `Register-ScheduledTask` probe greps
  `stdout` for the verb, and PowerShell's *absent-cmdlet* error **quotes that verb** — a false
  positive that would send the install down the PowerShell path on a Windows without the
  ScheduledTasks module. It cannot happen because the error goes to **stderr** and
  `src/util/exec.ts` keeps the streams in separate fields. Pinned against strings captured from
  `powershell.exe`, not invented ones, and the test asserts the trap so nobody "improves" the rule by
  scanning both streams.
- **`FAILED_RESULTS` decides whether a unit reads as failing.** `oom-kill` is the value an operator
  most needs read correctly — it is what a container limit or the OOM killer produces — and a unit
  that died that way reading as merely "disabled" is how someone stops looking. All eight members,
  and the negative direction (`success`, empty), are asserted.
- **The user-bus rule matches a prefix**, which is why the real longer string works:
  `systemctl --user` prints `Failed to connect to user scope bus via local transport:
  $DBUS_SESSION_BUS_ADDRESS and $XDG_RUNTIME_DIR not defined (...)`, while the tests fake the shorter
  form. The rule is an `includes`, so both match. The msgid is also **untranslated in all 53 systemd
  catalogs** on the reference machine (read from the `.mo` files), so the English match is not
  locale-fragile.
- **The cgroup container-detection branch is neither testable nor the branch that works.** It calls
  `readText` on the literal `/proc/1/cgroup` with no injection seam, so a test would read the host's
  real cgroup. Measured instead: a **real Docker container reports `0::/`**, matching none of its
  four substrings — `/.dockerenv` fires first and is what actually recognises Docker. The injectable
  `container=` env branch is tested both ways in `test/boot/ladder`.
- **Naming the artifact is not naming where its output went.** A boot-run panel writes somewhere
  other than the panel's console (`<home>/.hh/.logs/home-hosted.log`, what `panel_logs` reads):
  `launchd` is told to write `<logDir>/<label>.out.log` and `.err.log`, and `systemd` sets no
  `StandardOutput=`, so its output is in the **journal** and the status line names the command to
  read it: `journalctl --user -u <unit>` for the user scope, `journalctl -u <unit>` for the system
  one — two forms because they are two different journals. `launchdLogPaths` is one computation
  shared by the plist builder and the status line, so the plist and the message cannot name
  different files.
- **`xdg-autostart` and the Windows mechanisms have no output to name**, deliberately: a `.desktop`
  entry with `Terminal=false` has its output discarded by the session, and a Run value or scheduled
  task captures none. Saying nothing is the honest answer there.
- **Windows quoting has two layers, and conflating them is a bug.** `commandLineToArgvW`/the CRT
  rules (backslashes pair before a `"`, an odd one escapes it) are what `windowsArg` must produce;
  `cmd.exe`'s layer is separate, and for the copy-pasteable `commands[]` form (`cmdQuote`) the word
  is wrapped in quotes so `cmd` metacharacters are inert while the CRT rules still apply inside them.
  The old `cmdQuote` doubled quotes and could not represent a backslash before a quote at all — real
  `cmd.exe` turned `x\"y` into `x"y` and `"C:\a b\"` into `C:\a b"`. Both are round-tripped against
  **real** Windows output in `test/boot/escape`, which is the only way to check this: the oracle is a
  parser's real behaviour, not an expected string.
- **`Number.parseInt` takes a *prefix*.** `1e3` → 1, `12abc` → 12, `0x10` → **0**, which is the
  "whole log" sentinel in the console reader — a bounded request silently became an unbounded read.
  `Number.isFinite` catches none of them. Require the whole trimmed string to be a decimal integer
  (`/^[+-]?\d+$/`) plus `Number.isSafeInteger`, and prefer refusing over defaulting where the caller
  can be told. Sites fixed: the `panel_logs` tool's `lines`, and `parsePasswd`'s uid field — where a
  corrupt row like `1000abc` yielded a plausible account that then becomes `User=` in a generated
  unit. Fix it only where the wrong number can *hurt*: a clamp makes a partial parse harmless, which
  is why upstream's `?tail=` was left alone.
- **A "read a fixed window, take the last N" reader is wrong when the unit is bytes and the request
  is lines**, because a line's length is unbounded: a stack trace or a JSON dump is one line and can
  be kilobytes. The console reader grows its window until `limit` lines are present or the file start
  is reached (measured: 20 lines of a 37.9 MB log reads 64 KiB). Same class as the upstream
  `asked 5000 → got 1464` bug — check any `Math.min(size, …)` followed by a `slice(-n)`.
- **A rotation is joined as text, and sufficiency is counted in separators.** Gluing the two line
  arrays invents a break the log never had when `.1` is unterminated (a panel killed mid-write), so
  `rot2-partial` + `live1` must read as one line — and "the last N lines" is then one short if the
  test counts lines rather than `N + 1` separators.
- **The plugin cannot act at boot.** It re-asserts entries while dsh runs, and startup `reconcile()`
  repairs an entry that exists — it never installs one.
- **A successful install hands the running panel to the new entry through a detached helper.** Prove
  the start, stop the previous mechanism's panel (its restart policy would revive it), start the
  entry — *then* retire the other mechanisms, since retiring first deletes the entry keeping the
  panel and this plugin alive. A mechanism that cannot start anything (`windows-run`,
  `xdg-autostart`) reports `activate() → null` and nothing is stopped.
- **An entry this process runs as is never deleted** (the panel is told to stop it); "stop managing"
  pauses or restores it instead.
- **The `unsupported` boot candidate is real** (no OS entry can work here), not a bug to filter out.
- **A choice the host can already resolve should not be left to the reader to guess.**
  `autostart.mechanism: 'auto'` is not a mechanism, it is "let the host decide", and the host decides
  with `recommend()` — whose answer it already sends as `BootStatus.recommended` and which `install()`
  falls through to. The page names it now, while nothing is installed under it.
- **A hint that can be wrong is worse than no hint.** Every such hint is gated on the entry actually
  being installed: an absent unit means no journal was written and no plist exists, so naming a path
  there sends someone to a file that is not there.

## A validator that decides by texture

The signature: a check on the **shape** of a value that has a canonical form with many
spellings, or a guard whose comment claims more than its code checks.

- **An id that becomes a path segment must be the id shape.** `workspaceDir` joins a workspace
  id under `.hh/`, and `readWorkspaces` accepted **any** non-empty string. A registry naming
  `../../etc` was read without error, `defaultWorkspace` returned it, and `serversFile`
  resolved outside the state root — a path the foreign-panel write path
  (`createForeign`/`updateForeign`/`deleteForeign`) then **writes through**. Guarding only the
  RPC entry point (`callWorkspace`) is what left the gap, because a foreign panel's id arrives
  from a file on disk; the builder asserts now too, since that is the one point the entry
  points share. The panel's own schema is `^[a-z0-9][a-z0-9_-]*$`.
- **A version has spellings a string compare gets wrong.** `compareVersions` compared the
  prerelease tail with `<`, so `rc.2` sorted above `rc.10` — and the ordering decides which
  `dsh` a boot entry runs. Prerelease identifiers compare numerically where both are numeric.
  **The same algorithm is inlined into both generated launchers**, so the fix had to land twice;
  a test that asserted the implementation's *text* is what let it pass while wrong. It runs the
  inlined function now instead.
- **Compare sibling branches against each other.** The address validator this class is named
  for had a thorough IPv4 list and two IPv6 prefixes; here, `getServer`/`freePort` validated and
  the foreign-file path did not. The asymmetry is the tell, and it is visible by reading the two
  branches side by side rather than either alone.

## Guarantees that rest on the runtime

Three properties here are stated as if this code owned them, and actually rest on Node, on
`rename(2)` or on `spawn`. Each is now pinned with a real test that fails if the underlying
behaviour changes, because a property nobody tests is a property nobody knows is still true.

- **The panel token does not cross a cross-origin redirect.** `PanelClient.request` attaches
  `authorization: Bearer <token>` and passes **no `redirect` option**, so the transport
  follows a 3xx with credentials attached unless it strips them itself. Undici strips
  `authorization` cross-origin and keeps it same-origin — *required* for a panel that
  redirects its own API path, and the thing that stops a panel (or anything answering for
  one) redirecting this plugin's token to a host the user never named. Pinned with two real
  loopback servers, the second recording what it received; the cross-origin case counts hits
  as well, because a runtime that never followed the redirect would also see no credential.
- **No value ever becomes a command.** `src/util/exec.ts` passes `shell: false`, so an
  argument is never interpreted. Pinned by driving the real seam with `a; touch <proof>` and
  `$(id)`, then checking the file was not created and `id` did not run — inverting the seam
  to `shell: true` fails both and prints the leak.
- **A write is atomic and a failure leaves the old file.** `writeFileAtomic` renames a
  sibling temp file into place, which is why a reader never sees half a file and a
  secret-bearing file is never briefly world-readable. Pinned by the **inode changing** on
  rewrite (in-place truncation keeps it), no `.tmp` surviving, and content surviving an
  `EACCES` failure. The test that merely said "atomic" asserted content, which a plain
  `writeFileSync` satisfies.

**The habit**: when a comment promises something the runtime provides — a redirect rule, a
signal reaching a child, a rename being atomic — drive the real thing and assert it. A stub
cannot answer a question about the transport.

## Cost paid on a path that does not use it

- **A test seam that one call site ignores is a seam that does not hold.** `preflightLauncher`
  spawns the real `home-hosted` CLI, which loads its whole graph (~500 ms) to print a version.
  It bypassed the `execCli` seam every other CLI call goes through, so a test that stubbed the
  CLI still paid for it — **once per `status()`**, because a fresh service per test always
  misses the 60 s cache. Two files construct the service; both now inject the preflight.
  Measured: `test/service.test.ts` 26.4 s → 4.1 s, `test/reconcile.test.ts` 6.7 s → 1.4 s,
  the suite 31.6 s → 5.3 s. **The preflight itself stays** — it answers something only running
  it can ("does the launcher the boot entry runs actually work?"), so it is injected, not
  removed.
- **The version a record already holds should not be looked up again.** The generated launcher
  re-derived `versionOf(record.entry)` instead of using the version `writeLauncher` wrote
  beside it, so a recorded pin whose entry is not a package layout fell through to the local
  tier — a `.pnpm` scan of 130 entries. The tiers are lazy now, best-first.
- **Measure in layers; my first two answers were wrong.** The harness was 4 ms, not the cost;
  `status()` was 650 ms and `cli()` inside it, of which the preflight was 563 ms; the preflight
  was ~500 ms of *CLI startup*, not the PATH scan I blamed first (a wide PATH measured 643 ms
  against 47 ms narrow, which looked conclusive and was the wrong 550 ms). Timing probes at each
  level, and a bare `node` startup plus the real CLI's `--version` as a reference, is what
  separated them.
- **Not a defect**: `test/launcher.test.ts` spends 1.9 s in one test that signals real processes
  and asserts nothing is orphaned. That duration *is* what it verifies.

## Oracles

- **A hand-written model of someone else's parser is evidence, not equivalence — and nothing
  re-checks it.** The `.desktop` round-trip test reads a value through a local `keyFileRead` that
  imitates GLib's escapeset, so the test *looks* like it verifies GLib fidelity and does not. It was
  spot-checked once, outside the suite, by compiling a real `g_key_file_get_string` reader and
  comparing the two across eleven values (a lone trailing backslash, `a\"b`, non-ASCII): zero
  mismatches, so the model was faithful **as of that check**. It cannot be a committed test — it needs
  a C compiler and GLib, which CI does not have. Re-run the comparison if the model or the escapeset
  changes, and never cite the spot-check as a standing guarantee.
- **Prefer the real thing as the oracle when you can.** Windows quoting is round-tripped against
  **real** `CreateProcess`/`cmd.exe` output and the systemd/plist/`.cmd` control-character width
  against real `systemd-analyze verify`, `cmd.exe` and an XML parser. An expected string written by
  hand only pins what its author believed.

## Generated scripts

- **Two copies of one algorithm inside separate generated scripts are real duplication; two copies
  in normal modules are not always.** `launcher.ts` builds two self-contained scripts (a test asserts
  no relative imports). They share seven helpers, and **none** is byte-identical — every one differs
  on purpose and must not be merged. The one that *was* byte-identical became a single interpolated
  fragment (`COMPARE_VERSIONS_SOURCE`). Extract a shared helper only where the copies can diverge, and
  re-count when you do: the count in a sentence like this is exactly what goes stale.
## Panel, contracts and parity

- **A copy of another project's constant needs a parity test, because the second copy is what goes
  stale.** `config-file.ts` mirrors the panel's `SERVER_MERGE_KEYS`/`CONTROL_MERGE_KEYS`, and a
  missing member is not cosmetic: a nested group the list omits is *replaced* by a partial patch, so
  a file write of `{ resources: { maxRssBytes: 1 } }` drops every sibling key. `test/config-file`
  reads the panel's sets from the pinned dependency's sourcemap and fails on divergence, as
  `test/tools` and `test/client/entry-editor` read its `serverSchema`. Only copy a constant you
  *use* — the plugin writes just `servers.*` and control, so it does not mirror upstream's
  notification/DDNS/proxy sets.
- **A tool's declared parameters are not documentation, they are the only thing a model can see.**
  `servers_edit` named 15 of the panel's 23 `serverSchema` fields, so eight were accepted and stored
  but invisible: a capability with no way to reach it. A wider `additionalProperties` does **not**
  fix that, because a key nobody names is a key nobody passes.
- **Three consumers read the panel's entry surface, and each needs its own parity statement.** The
  model (`src/tools.ts` — every field), the panel's own UI, and the page's editor
  (`src/client/entry-editor.tsx` — the common eight, the other fifteen **deliberately** out of
  scope and declared as such via `EDITOR_FIELDS`/`OUT_OF_SCOPE_FIELDS`). A subset is fine; an
  *undocumented* subset is the same bug as a missing tool field. It also asserts the **rendered**
  labels, because a field can be declared and never drawn.
- **`/_hh` is deliberately four routes** (`shutdown` plus three lifecycle ones), token-plus-loopback,
  with no local path to proxy, backups, TLS or config — so no plugin capability may be invented over
  them, and none may open an unauthenticated `/api` route to get around it.
- **The panel console is a first-class diagnostic** (`panel.console` /
  `home-hosted/panel-console.ts`): read from disk, so it needs no session, no token and no answering
  panel, and matches `home-hosted logs` line for line. A missing log reads as empty, never as an
  error.
- **`isRecord` is one shared predicate** (`src/shared/contracts.ts`) — never define a private copy.
  The `!Array.isArray` half is load-bearing and pinned: `typeof [] === 'object'`, so without it an
  array narrows to a record and `Object.entries` silently yields its *indices*. `src/shared/` must
  stay import-free so both halves can inline it; `src/util/*` is the host-only one. (The eight copies
  this replaced are one `git log` away.)
- **A stored optional that can be `null` is not the same as one that is absent.** `lastAttempt?:
  BootAttempt` was spread through whenever it was not `undefined`, so an explicit `null` — what a
  cleared optional looks like written back, and what the RPC accepts, since `RpcRequest.payload` is
  `unknown` and the patch is cast rather than validated — reached the page and crashed the Boot
  section on `.ok`. A non-record is rejected at both ends now.
- **A parsed-but-unread field is worth deleting.** `UnitProbe.nRestarts` was assigned from
  `systemctl show` and read by nothing (the `detail` string interpolates `props.NRestarts` directly).
  Distinct from a *field shown unparsed*: `NRestarts=7` and `Result=oom-kill` do reach a person
  through `boot.detail`, so the vocabulary is visible even where the parsed copy was unused.
- **A helper that exists, is tested, and is never called is a missing wire, not dead code — check
  which.** `humanizeKey` was written and unit-tested for the entries drift chip, but nothing called
  it, so the page showed raw `onPortConflict, stopKillPortHolders`. Wiring it was the fix.
  `formatCandidate` is the opposite: its combined `version · path` string has no consumer shape
  (the panel renders those in separate slots), so it is genuinely dead and left alone.
- **`home-hosted`'s bin is not in its `exports`**: resolve it through the pinned copy (`resolveCli`),
  never `require.resolve('home-hosted/bin/…')`.
- **Two representations of one thing drift only if a consumer can act on the difference.** Checked
  and found *not* worth changing: a foreign `servers.*` result carries `workspace` but not `home`,
  while the tool's prose names the panel. That is not the upstream `ui` bug, because "which panel?"
  is only ever asked on the **tool** path, which always appends the prose — and the RPC is the other
  consumer, where the caller named the panel itself.

## Client and page

- **UI state that outlives the context that gave it meaning.** `ServersSection` is not remounted when
  the viewed workspace changes (no `key` on it), so its state survives — and
  `editing`/`deleting`/`freeing`/`freeNote` were keyed by bare server id, which is **only unique
  inside a workspace**. Picking a server in workspace A and switching to B left the editor, the
  delete confirmation and the free-port note describing A's server; with a same-named entry in B they
  re-bound to it, and a save wrote A's values over B's. Fixed at the **state**, not the display: each
  selection is stamped with the workspace it was made in (`scopedSelection`), so a foreign one is
  inert. Clearing a separate flag would have left the stale value itself reachable — prefer the state
  fix over hiding the symptom, and do not keep both. `busyKey` already encoded this invariant for
  in-flight keys.
- **The pattern to copy is `visibleBootAttempt`**: a fresh attempt is shown only while its `state`
  and `mechanism` still match the live ones. The *persisted* path had only half of it —
  `bootAttemptView` **dropped** the mechanism, so the note could only be gated on `state`: switching
  the preference from `systemd-system` to `xdg-autostart` left the page showing the old mechanism's
  refusal and its copy-pasteable `sudo` commands. When a comparator only checks part of what it
  describes, check whether a field was dropped before it ever got there.
- **A diagnostic that quotes internal vocabulary is not a diagnostic.** The mechanism picker's option
  values *are* `systemd-system`/`xdg-autostart`, because that is what the setting stores — but the
  host already sends a sentence for each one (`BootCandidate.reason`) and the page was dropping it.
  The `Details` block was worse: it now names `boot.mechanism` — the *installed* one, which differs
  while a switch is pending. Both places read one `reasonFor(mechanism)` lookup, so the two
  renderings cannot drift.
- **Word a convention as a possibility, not a fact.** Those mechanism reasons are the host's own
  observation about *this* machine, not claims about what a name universally means.
- **Read a new response field as a value, not as a key.** The `recommended` sentence rendered the
  literal `"would use undefined"` against a panel that omits it — a real case, because the page is
  bundled separately from the host. Check `typeof value === 'string' && length > 0` and fall back;
  the same guard covers an explicit `null`.

## Versions and dependencies

- **Only the `home-hosted` this plugin pins is supported** (`^0.7.3`): the state layout is `.hh`, and
  the `kill`/`persistent` version guards were dropped pre-1.0, so an older panel handed those keys
  can refuse to boot. See [COMPATIBILITY.md](COMPATIBILITY.md).
- **A capability that needs a newer panel degrades; it never raises the floor.** `^0.7.3` already
  admits every 0.7.x, so a feature added in 0.7.12/0.7.13 is reachable without moving the pin — and a
  *local* panel older than it is a real scenario. The newer path is tried first and an
  unknown-command refusal falls back to what that panel can do (`lifecycleForeign`). Detect the
  refusal from the CLI's own text and know all of its shapes: a pre-0.7.13 panel answers a 404
  through the daemon, while a 0.7.12 CLI rejects the positional with `Unexpected argument` — the one
  a 404-only check misses.
- **"Untouched since X, checked by filename" is not a claim that survives.** Verify a compatibility
  claim by what a change *reaches*, not by whether a file appears in a log — the two disagree as soon
  as a comment lands in a schema file. `docs/PANEL.md` says which surfaces were checked and why none
  reaches this plugin.
- **pnpm 12 enforces a minimum release age**, so `pnpm-workspace.yaml` pins it to `0` — CI and a
  fresh checkout must agree.

## How to test

`pnpm typecheck && pnpm test && pnpm build` is what CI runs. Focused: `pnpm exec vitest run
test/client -t <name>`. Every test must also pass in isolation; the suite has no fixed ports, no real
service manager and no writes outside a temp dir. If you add a guard, break it and watch the test
fail — then restore it and watch it pass.
