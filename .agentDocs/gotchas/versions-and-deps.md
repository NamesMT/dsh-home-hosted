# Versions and dependencies

Read before a version bump, a floor change, or a release-gate edit.

The pin and floor themselves are [COMPATIBILITY](../COMPATIBILITY.md)'s; this file is how to move
them.

- **When the floor moves, delete what it made unreachable — and the tests pinning it.** The floor sat
  at `0.7.0` for a long time, so this plugin grew a stop-then-start fallback for a panel without
  `restart <id>` plus a detector for three refusal shapes; all of it was unreachable once every
  supported release had the command.
- **A guard on an irreversible action needs its decision logic tested, not its invocation.** The
  release gate (`scripts/check-release-version.mjs`) is called by one workflow step and its verdicts
  are exit codes, so test them as exit codes (`test/release-version.test.ts`). Two defects hid there:
  a version regex that accepted `0.7.018`, and a hand-written `compare` that ordered prereleases as
  text, refusing `rc.10` over `rc.2`.
- **Compare a hand-written validator against the real library on ugly inputs** — leading zeros, the
  empty string, a trailing separator — and name any deliberate deviation (`semver@7` installed
  outside the repo is enough).
- **Read an exit code directly, never through a pipe** — `node script.mjs x | head` reports `head`'s
  status, which made a failing guard look passing. **A mutation only proves something if it reverts
  the change**: comparing a *copy* of the old function proved nothing.
- **A `settings.section` registration cannot choose its own nav icon.** The shell resolves glyphs
  from a closed list of section ids and falls back to its own gear; the slot projects only
  `id`/`order`/`label`, and its owner props carry only `close`. So `settings-nav-icon.ts` marks our
  own row and masks the house in: match on the row's **text**, never the shell's hashed CSS-module
  class, and exactly, not as a substring — `.includes` would decorate a neighbour. An unresolved
  (empty) label must match nothing (`src/client/settings-nav-icon.ts`,
  `test/client/settings-nav-icon.test.ts`).
- **pnpm 12 enforces a minimum release age**, so `pnpm-workspace.yaml` pins `minimumReleaseAge: 0` —
  CI and a fresh checkout must agree.
- **A published package's *build layout* is a dependency too.** The 0.11.0 → 0.13.0 bump changed no
  schema and no route this plugin calls, but it **code-split the CLI**, so `CONFIG_SCHEMA` and every
  schema the parity guards read moved out of `dist/cli.js.map` into content-hashed chunks
  (`dist/chunks/parse-<hash>.js.map`, `contracts-<hash>`, `migrate-<hash>`). Two readers hard-coded
  that one path and returned nothing, which failed in the two worst ways available: the *stamp*
  reader answered `null`, which this plugin reads as "unknown, do not stamp", so every config file it
  creates would have gone out un-stamped — and the panel reads an absent stamp as the **oldest**
  schema and refuses to boot it; and the parity guards threw "not found", which reads like an
  upstream schema change rather than the packaging change it was. **Discover the maps, do not name
  one**, and accept both declaration spellings: 0.13.0 also moved every schema behind
  `lazy(() => …)` and turned `editableFields` from a `const … = {…} as const` into a function, so
  each anchor had to tolerate both. A count guard under each read (fields ≥ N, keys > 0) is what
  turned "found 0" into a loud failure instead of a vacuous pass.
- **An upgrade can turn a skip into a failure, and that is the upgrade doing its job.** A field-scope
  test skipped whenever the sibling `home-hosted` checkout was absent; on this machine it was, so
  the assertion actually ran for the first time and failed — on a real defect in the *test*: it read
  only `ServerConfigEditor.vue`, while `resources` is set by its sibling `addServerForm.ts`. A
  field is often built in a neighbouring module, so a "can the panel set X" check has to read the
  directory, not one file. Treat a failure that appears only after an upgrade as a question about
  the test before assuming the dependency broke something.
