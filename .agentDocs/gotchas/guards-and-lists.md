# Guard strength and lists

Read before adding or removing a list member, or changing a validator. A list can be "covered" and
still let a member vanish.

- **Measure by removing one member and reading the error count and files** — a count is a property of
  the member, not the list.
- **Zero is the one that matters.** `ON_PORT_CONFLICT_POLICIES`'s `warn` had no guard either way
  because no behaviour differs per policy (`test/suggest.test.ts`).
- **The panel's own published schema is the authority for a copied enum** —
  `panelPortConflictPolicies()` reads it from the pinned sourcemap and throws on a too-thin extraction
  (`test/helpers/panel-schema.ts`).
- **A stub's `Record<string, unknown>` makes every literal there invisible** — literals in an untyped
  fixture are no guard (`test/service.test.ts`).
- **The list is the source and the type is derived** (`type X = (typeof LIST)[number]`); a
  hand-written union beside an annotated array leaves **presence** unchecked.
- **Mutate one side and read the error count; do not judge by looking** — `AgentToolName` looked
  guarded yet removing a list name gave 0 errors; it and `OnPortConflict` are derived now.
- **The harm decides whether it matters** — an omission is a defect only where the list *validates*
  or *explains* (`AGENT_TOOL_NAMES`, `ON_PORT_CONFLICT_POLICIES`).
- **A `Record<X, …>` or exhaustive switch is already compiler-checked** (`ForeignMechanism`,
  `TokenState`, `CliSource`, `BootState`); a union with no parallel list cannot have this bug.
- **A deliberate subset is not a parallel list** (`MUTATING_AGENT_TOOLS`, `INSTALLED_STATES`,
  `BOOT_MECHANISM_NAMES` omitting `auto`), and `FOREIGN_MECHANISMS`' omissions mean "cannot be aimed
  at another panel".
- **A constant nothing imports enforces nothing** — `OWNED_ENTRY_KEYS` named a rule only
  `ownedPatch`'s literals enforce (`src/home-hosted/entries.ts`).
- **A ratio bound tuned for long words is wrong for short ones**; the distance must also be small in
  **absolute** terms, and suffix scoring breaks the other half (`src/util/suggest.ts`).
- **An input that is already valid has no typo**, and for a suggestion the wrong hint is worse than
  silence — verify the negative case.
- **A validator that decides by texture is the tell** — a shape check on a value with many spellings,
  or a comment claiming more than the code checks.
- **An id that becomes a path segment must be the id shape** — `readWorkspaces` accepted `../../etc`,
  resolving `serversFile` outside the state root for the foreign write path to write through
  (`src/home-hosted/layout.ts`).
- **A version has spellings a string compare gets wrong** — `compareVersions` sorted `rc.2` above
  `rc.10`, and the ordering picks the `dsh` a boot entry runs (`src/home-hosted/resolve.ts`); the
  algorithm is inlined into both launchers, so a test on its text proves nothing.
- **Compare sibling branches against each other** — `getServer`/`freePort` validated and the
  foreign-file path did not (`src/home-hosted/panel.ts`).
- **`Number.parseInt` takes a *prefix*** (`0x10` → 0, the "whole log" sentinel): require
  `/^[+-]?\d+$/` plus `Number.isSafeInteger`, and refuse rather than default (`parsePasswd`, the
  `panel_logs` tool's `lines`).
