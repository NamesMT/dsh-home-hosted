# Testing traps

A green tick says an assertion held. It does not say the code ran, or that the assertion would fail
if the code broke. Read this when you write or trust a test.

- **A test whose result depends on the checkout it runs in is not a test.** The release gate reads
  `package.json` *and* `git log <tag>..HEAD` (`scripts/check-release-version.mjs`), so a test that
  rewrote only the manifest passed on CI's shallow clone and failed on the release workflow's
  `fetch-depth: 0` clone, refusing a real release. `test/release-version.test.ts` builds a scratch
  repo and runs the gate there (`3c27275`).
- **A test that cannot run must report `skipped`, never `passed`.** vitest reports an early `return`
  as a pass. Use `it.skipIf`/`it.runIf` with the condition computed at **module load** — they resolve
  at collection time, before any `beforeAll`, so a flag set in a hook cannot work. Where a
  conditional is unavoidable, force the branch with a preceding assertion (`expect(cond).toBe(false)`).
- **A component can be driven, not only reasoned about.** `happy-dom` is a devDependency and a
  `// @vitest-environment happy-dom` comment on one file is the whole setup; with `react-dom/client`
  plus `act` that mounts a real section and clicks it. A correct helper proves nothing about the
  section applying it. `test/client/servers-scoping.test.tsx` is the pattern, **including a control
  case** so a failure cannot be misread.
- A test that re-states a rule pins nothing: if it would still pass after the rule under it is
  broken, it is documentation, not a test.
- Instrument the branch, then break the guard you named — make the branch tell you it ran before
  believing a test covers it (`test/boot/launchd.test.ts`).
- Break the guard you *named*, then grep for a second occurrence before editing one by hand — a
  launchd hint has two copies, one per return (`test/boot/launchd.test.ts`).
- A guard test's input must fail for the reason the test claims; break one rule in isolation and read
  which assertion fails (`test/boot/escape.test.ts`).
- Count the runtime characters of a test value: `'\n'` is one character, `'\\n'` is two.
- Resolve fixture paths from `import.meta.url`, never the process cwd, and never hard-code one
  machine's absolute path; `test/helpers/panel-schema.ts` is the shared reader.
- A test that passes only alongside another is not tested; check it also passes in isolation. Give an
  absent-case test its own fixture, or it passes for a previous test's leftover state.
- Tests here never bind a fixed port, start a real service manager, or write outside a temp dir;
  compare canonical paths (macOS `/var` → `/private/var`). Windows is not gated yet.
