# Client and page

Read before touching the settings page's state, or a sentence the host sends the page to render.

- **UI state that outlives the context that gave it meaning.** `ServersSection` is not remounted when
  the viewed workspace changes (no `key` on it), so `editing`/`deleting`/`freeing`/`freeNote` keyed
  by bare server id — only unique inside a workspace — described another workspace's server after a
  switch, and a save wrote A's values over B's. Fixed at the **state**, not the display: each
  selection is stamped with the workspace it was made in (`scopedSelection`), so a foreign one is
  inert. `busyKey` already encoded this for in-flight keys
  (`src/client/section-servers.tsx`, `test/client/servers-scoping.test.tsx`).
- **When a comparator only checks part of what it describes, check whether a field was dropped
  before it ever got there.** `bootAttemptView` dropped the mechanism, so the persisted note could
  only be gated on `state` and switching the preference left the old mechanism's refusal on screen.
  The pattern to copy is `visibleBootAttempt`: show a fresh attempt only while its `state` and
  `mechanism` still match the live ones (`src/client/boot.ts`, `test/client/boot-fresh.test.tsx`).
- **A diagnostic that quotes internal vocabulary is not a diagnostic.** The mechanism picker's option
  values *are* `systemd-system`/`xdg-autostart`, but the host already sends a sentence for each
  (`BootCandidate.reason`) and the page was dropping it. Both renderings now read one
  `reasonFor(mechanism)` lookup, so they cannot drift (`src/client/section-boot.tsx`).
- **Word a convention as a possibility, not a fact** — those mechanism reasons are the host's own
  observation about *this* machine, not claims about what a name universally means.
- **Read a new response field as a value, not as a key.** The `recommended` sentence rendered the
  literal `"would use undefined"` against a panel that omits it — a real case, because the page is
  bundled separately from the host. Check `typeof value === 'string' && length > 0` and fall back;
  the same guard covers an explicit `null` (`src/client/section-boot.tsx`).
