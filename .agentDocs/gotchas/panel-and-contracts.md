# Panel, contracts and parity

Read before changing the wire contract, a panel write, or a copy of the panel's own shape.

- **A copy of another project's constant needs a parity test** — a missing merge key makes a partial
  patch *replace* a nested group. `test/config-file.test.ts` reads the panel's sets from the pinned
  sourcemap; copy only what you use.
- **A tool's declared parameters are the only thing a model can see** — a `serverSchema` field the
  tool never names is stored but unreachable (`src/tools.ts`).
- **Three consumers read the panel's entry surface, each with its own parity statement**: the model
  (`src/tools.ts`), the panel's UI, and the editor's documented subset (`EDITOR_FIELDS`/
  `OUT_OF_SCOPE_FIELDS`, `src/client/entry-editor.tsx`).
- **`isRecord` is one shared predicate** (`src/shared/contracts.ts`); the `!Array.isArray` half is
  load-bearing, or `Object.entries` yields an array's indices.
- **An absent optional and an explicit `null` are different** — spreading `lastAttempt` on
  `!== undefined` let a stored `null` crash the Boot section (`src/settings.ts`,
  `test/settings.test.ts`).
- **A parsed-but-unread field is worth deleting** — assign one only if something reads it
  (`src/boot/systemd.ts`).
- **A helper that is tested but never called is a missing wire, not dead code — check which**
  (`humanizeKey` was wired; `formatCandidate` is genuinely dead, `src/client/format.ts`).
- **`home-hosted`'s bin is not in its `exports`**: resolve it through the pinned copy (`resolveCli`),
  never `require.resolve('home-hosted/bin/…')`.
- **Two representations drift only if a consumer can act on the difference** — the foreign result's
  missing `home` is not a bug, because "which panel?" is only asked on the tool path
  (`src/tools.ts`).
- **A branch on a message is a branch on wording.** `stopNoteFor` checked a `client` code `rpc()` can
  never emit; name the codes with meaning and make the test drive real ones
  (`test/client/panel-stop.test.ts`).
- **A substring match on a CLI refusal is matched by position** — anchor the real shapes, and keep
  control-flow markers out of the wire shape (`src/util/exec.ts`).
- **Stopping the *panel* spares a persistent entry; stopping the *entry* ends it** — check which a
  sentence means before fixing its copy (`test/client/panel-stop.test.ts`).
