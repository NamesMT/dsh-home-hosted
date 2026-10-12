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
