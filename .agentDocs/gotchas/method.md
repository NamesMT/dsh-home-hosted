# Method

Cross-cutting habits. Read when a comment or doc promises something, or a measurement is offered as
evidence.

- **Fix the class, not the instance.** A fixture copied per file drifts in its *defaults*, not its
  shape; consolidate only where it removes a risk (`test/helpers/section-props.ts`).
- **A rename across files must not match string literals** — after one, diff for changed literals and
  grep the injected name before trusting the edit.
- **An unused import survives silently** (no linter, no `noUnusedLocals`); use-check each imported
  symbol after emptying a helper.
- **A link from a shipped file to a non-shipped one resolves here and 404s for every user** — derive
  the shipped set from `package.json#files` (`test/docs.test.ts`).
- **A checker must be able to fail, and its rule must be right.** Inject a break and read the **exit
  code**; validate an anchor rule against links known to work (`test/docs.test.ts`).
- **Measure whether a change is warranted** before writing it — a guard can be the whole change.
- **A comment that explains *why* is a claim, usually about a count or an order** an outcome-only test
  cannot see; a cache's window is a count, so assert the stamp **moved**, not `>=` (`writtenAt`,
  `test/service.test.ts`). Do not sleep for a window — `vi.setSystemTime`, and restore real timers.
- **An invalidation needs its own seam** (`installGlobalCli`, `src/service.ts`); say when a
  neighbouring claim IS pinned rather than assuming an omission.
- **A comment that promises "never"/"always"/"only"/"must not" is the test to write.** `isBareCommand`
  applied opposite case rules in its two branches, so Windows `DSH` was never repaired; narrow the
  condition, do not delete the fallback (`src/home-hosted/dsh-entry.ts`). A case fold is right only on
  user-typed text, never on identities.
- **A refusal that denies a capability the caller mistyped is worse than one naming the mistake** —
  `boot.install` now names the accepted set from `BOOT_MECHANISM_NAMES` (`src/tools.ts`). Prevent a
  mistake where you can, explain it where you cannot, and check the path is one actually hit.
- **When a comment promises something the runtime provides, drive the real thing and assert it** —
  the cross-origin redirect token strip (`test/panel.test.ts`), `shell: false`
  (`test/exec.test.ts`), `writeFileAtomic`'s inode change (`test/atomic-write.test.ts`).
- **A test seam one call site ignores is a seam that does not hold** — `preflightLauncher` bypassed
  `execCli`, so a stubbed test still paid ~500 ms per `status()`; it is injected now, not removed.
- **A version a record already holds should not be looked up again** — the launcher re-derived it and
  fell through to a `.pnpm` scan; the tiers are lazy now (`src/home-hosted/launcher.ts`).
- **Measure in layers**, with a bare `node` startup as reference. **Not a defect**:
  `test/launcher.test.ts` spends ~1.9 s signalling real processes; that duration *is* what it verifies.
