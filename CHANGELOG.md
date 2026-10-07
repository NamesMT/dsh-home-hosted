# Changelog


## v0.7.6

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.7.5...v0.7.6)

### 🩹 Fixes

- **deps:** Bump home-hosted to ^0.7.20 ([895c6ad](https://github.com/NamesMT/dsh-home-hosted/commit/895c6ad))
- **panel-control:** Never signal a pid the helpers cannot prove is the panel ([765f5c3](https://github.com/NamesMT/dsh-home-hosted/commit/765f5c3))

### 📖 Documentation

- Record the 0.7.20 re-check and the pid-is-not-an-identity trap ([7fc0071](https://github.com/NamesMT/dsh-home-hosted/commit/7fc0071))

### ✅ Tests

- **panel-control:** Pin that neither helper carries a signal ([dd7ea5b](https://github.com/NamesMT/dsh-home-hosted/commit/dd7ea5b))

### ❤️ Contributors

- NamesMT

## v0.7.5

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.7.4...v0.7.5)

### 🚀 Enhancements

- **panel:** Read the panel's own console, so a misbehaving panel can explain itself ([6a625e2](https://github.com/NamesMT/dsh-home-hosted/commit/6a625e2))
- **boot:** Name the mechanism Automatic would install ([6fc5eef](https://github.com/NamesMT/dsh-home-hosted/commit/6fc5eef))
- **boot:** Say where a boot entry's own output went ([71b58f2](https://github.com/NamesMT/dsh-home-hosted/commit/71b58f2))
- **boot:** Name the mechanism a caller got wrong instead of denying any exists ([f0db6d4](https://github.com/NamesMT/dsh-home-hosted/commit/f0db6d4))
- **tools:** Enumerate the mechanism parameter, so a model cannot name one that is not ([b411d33](https://github.com/NamesMT/dsh-home-hosted/commit/b411d33))
- **service:** Name the endpoint probably meant when one is unknown ([d338614](https://github.com/NamesMT/dsh-home-hosted/commit/d338614))

### 🔥 Performance

- **test:** Route the launcher preflight through a seam, 31.6s -> 8.2s ([1f47ec2](https://github.com/NamesMT/dsh-home-hosted/commit/1f47ec2))
- **test:** Give reconcile the same preflight seam, 8.2s -> 5.3s ([8b547a4](https://github.com/NamesMT/dsh-home-hosted/commit/8b547a4))

### 🩹 Fixes

- **servers:** Restart another panel's entry with `restart <id>`, not a stop/start pair ([d13eda9](https://github.com/NamesMT/dsh-home-hosted/commit/d13eda9))
- **panel:** Grow the console read window, so long lines do not truncate the tail ([aa98410](https://github.com/NamesMT/dsh-home-hosted/commit/aa98410))
- **boot:** Quote Windows display commands with the rules cmd.exe reads back ([58c7640](https://github.com/NamesMT/dsh-home-hosted/commit/58c7640))
- **panel:** Join a rotated console the way concatenating the files does ([87c77a4](https://github.com/NamesMT/dsh-home-hosted/commit/87c77a4))
- **tools:** Advertise the panel's whole entry surface, not 15 of its 23 fields ([0b7ac65](https://github.com/NamesMT/dsh-home-hosted/commit/0b7ac65))
- **client:** Humanise drift keys, and make the entry editor's scope a decision ([385d492](https://github.com/NamesMT/dsh-home-hosted/commit/385d492))
- **tools:** Refuse a partly numeric line count instead of parsing its prefix ([78afd40](https://github.com/NamesMT/dsh-home-hosted/commit/78afd40))
- **client:** Scope the servers section's state to the workspace it names ([da9b239](https://github.com/NamesMT/dsh-home-hosted/commit/da9b239))
- **boot:** Validate the spec windowsRunPayload builds from, like every other builder ([c526fe3](https://github.com/NamesMT/dsh-home-hosted/commit/c526fe3))
- **client:** Stop a stored null crashing the boot page, and explain the mechanism names ([dd20e7a](https://github.com/NamesMT/dsh-home-hosted/commit/dd20e7a))
- **layout:** A workspace id from disk could escape the state root ([f7772aa](https://github.com/NamesMT/dsh-home-hosted/commit/f7772aa))
- **resolve:** Compare prerelease identifiers numerically, in both copies ([bfa5704](https://github.com/NamesMT/dsh-home-hosted/commit/bfa5704))
- **client:** Name the code a dropped transport actually carries ([8d64cab](https://github.com/NamesMT/dsh-home-hosted/commit/8d64cab))
- **service:** Match the CLI's refusal shapes by position, not by substring ([a25f67e](https://github.com/NamesMT/dsh-home-hosted/commit/a25f67e))
- **console:** Decode the tail once, so a character split by a block boundary survives ([cc2b77c](https://github.com/NamesMT/dsh-home-hosted/commit/cc2b77c))
- **exec:** Decode process output with a StringDecoder, not per chunk ([d41d02b](https://github.com/NamesMT/dsh-home-hosted/commit/d41d02b))
- **dsh-entry:** Apply each platform's case rule in isBareCommand ([b9b14ae](https://github.com/NamesMT/dsh-home-hosted/commit/b9b14ae))
- **release:** Apply semver's own rules in the gate, and test it ([2fa52e9](https://github.com/NamesMT/dsh-home-hosted/commit/2fa52e9))
- **panel-schema:** Refuse to slice on a boundary that was not found ([9b0ebc0](https://github.com/NamesMT/dsh-home-hosted/commit/9b0ebc0))
- **deps:** Bump home-hosted to ^0.7.19 ([9edb971](https://github.com/NamesMT/dsh-home-hosted/commit/9edb971))
- **config:** Delete a top-level key an explicit null clears, as the panel does ([e4cf3f0](https://github.com/NamesMT/dsh-home-hosted/commit/e4cf3f0))

### 💅 Refactors

- Consolidate eight copies of isRecord, one of which accepted an array ([e6f97d6](https://github.com/NamesMT/dsh-home-hosted/commit/e6f97d6))
- **contracts:** Derive the mechanism type from the list, not beside it ([6d2148c](https://github.com/NamesMT/dsh-home-hosted/commit/6d2148c))
- **contracts:** Derive three more types from their lists, and drop a dead one ([9c1e877](https://github.com/NamesMT/dsh-home-hosted/commit/9c1e877))

### 📖 Documentation

- **panel:** Record the 0.7.4–0.7.17 pin check, and why the floor does not move ([da4ef2d](https://github.com/NamesMT/dsh-home-hosted/commit/da4ef2d))
- **panel:** Record the two caller-less RPC endpoints, and why they stay ([04667e7](https://github.com/NamesMT/dsh-home-hosted/commit/04667e7))
- Correct three stale claims, and enforce the rule one of them only stated ([375d653](https://github.com/NamesMT/dsh-home-hosted/commit/375d653))
- Mark the glib oracle check as a one-off, not a standing verification ([6ea3f89](https://github.com/NamesMT/dsh-home-hosted/commit/6ea3f89))
- Split AGENTS.md into orientation plus .agentDocs/ depth ([0414fdd](https://github.com/NamesMT/dsh-home-hosted/commit/0414fdd))
- Restore three rules the AGENTS.md split dropped ([8a59e2e](https://github.com/NamesMT/dsh-home-hosted/commit/8a59e2e))
- Let a person reach the topic docs from the README ([fc85228](https://github.com/NamesMT/dsh-home-hosted/commit/fc85228))
- ⚠️  State the setup, stack and commit rules a cold session lacks ([de28ba4](https://github.com/NamesMT/dsh-home-hosted/commit/de28ba4))
- Adopt the working-method rules, adapted, and record what was rejected ([225fdb2](https://github.com/NamesMT/dsh-home-hosted/commit/225fdb2))
- Fix the root cause, and cut the common-knowledge block ([842ef59](https://github.com/NamesMT/dsh-home-hosted/commit/842ef59))
- Record the three guarantees that rest on the runtime ([dc66186](https://github.com/NamesMT/dsh-home-hosted/commit/dc66186))
- Record the texture-validator class, with both cases from this repo ([99e65ef](https://github.com/NamesMT/dsh-home-hosted/commit/99e65ef))
- Record the cost-paid-on-an-unused-path class ([67b7db8](https://github.com/NamesMT/dsh-home-hosted/commit/67b7db8))
- Record the control-flow-on-text class, with both cases ([38fa1c5](https://github.com/NamesMT/dsh-home-hosted/commit/38fa1c5))
- **agent:** One canonical section order, and the verification method inline ([4db3e5a](https://github.com/NamesMT/dsh-home-hosted/commit/4db3e5a))
- Drop a private home path from a gotcha ([d548649](https://github.com/NamesMT/dsh-home-hosted/commit/d548649))
- Record the message-that-makes-the-reader-derive-it class ([0f30ba7](https://github.com/NamesMT/dsh-home-hosted/commit/0f30ba7))
- Record the correct-only-for-observed-input class ([0fefebf](https://github.com/NamesMT/dsh-home-hosted/commit/0fefebf))
- Record the comparison-narrower-than-its-comment class ([f262993](https://github.com/NamesMT/dsh-home-hosted/commit/f262993))
- Measure the Windows case-insensitivity claim instead of asserting it ([1f90ce5](https://github.com/NamesMT/dsh-home-hosted/commit/1f90ce5))
- Record the documented-reason-with-no-test class ([3b676d6](https://github.com/NamesMT/dsh-home-hosted/commit/3b676d6))
- Record the doc-read-in-one-context class ([0b4c67c](https://github.com/NamesMT/dsh-home-hosted/commit/0b4c67c))
- Record the same-claim-stated-twice class ([144c491](https://github.com/NamesMT/dsh-home-hosted/commit/144c491))
- **console:** Correct a claim the constant never satisfied, and pin the loop ([28586a9](https://github.com/NamesMT/dsh-home-hosted/commit/28586a9))
- Record the documented-bound class ([8810cb7](https://github.com/NamesMT/dsh-home-hosted/commit/8810cb7))
- Attribute the rotation constant to the panel, not this repo ([5b965fa](https://github.com/NamesMT/dsh-home-hosted/commit/5b965fa))
- Record the reused-heuristic class ([e046bad](https://github.com/NamesMT/dsh-home-hosted/commit/e046bad))
- Record the list-must-stay-in-step class, as an inventory ([8d948ef](https://github.com/NamesMT/dsh-home-hosted/commit/8d948ef))
- Record guard strength, with the per-member inventory ([1f605c2](https://github.com/NamesMT/dsh-home-hosted/commit/1f605c2))
- Record the line-ending audit, with the sweep as evidence ([f1a52e0](https://github.com/NamesMT/dsh-home-hosted/commit/f1a52e0))
- Record the 0.7.19 re-check, and the semantics a bump can fork ([54eefca](https://github.com/NamesMT/dsh-home-hosted/commit/54eefca))

### ✅ Tests

- **panel:** Pin the console read's guards — a foreign target, and a missing log ([83b0d82](https://github.com/NamesMT/dsh-home-hosted/commit/83b0d82))
- Stop four tests reporting a pass they never earned ([5e1da9b](https://github.com/NamesMT/dsh-home-hosted/commit/5e1da9b))
- Add happy-dom, so a component can be driven rather than only reasoned about ([43457a7](https://github.com/NamesMT/dsh-home-hosted/commit/43457a7))
- **client:** Drive the state-scoping fix under happy-dom, and close a second gap ([f23bda0](https://github.com/NamesMT/dsh-home-hosted/commit/f23bda0))
- **config:** Guard the merge-key copies against the panel's own ([4569dd6](https://github.com/NamesMT/dsh-home-hosted/commit/4569dd6))
- **boot:** Prove the payload builder's guard is load-bearing, and correct its rationale ([a065d2f](https://github.com/NamesMT/dsh-home-hosted/commit/a065d2f))
- **boot:** Cover the two guard rules nothing exercised, and verify the plist oracle ([a01a58b](https://github.com/NamesMT/dsh-home-hosted/commit/a01a58b))
- **boot:** Pin the six text-classification rules against their real tool output ([d0f6b12](https://github.com/NamesMT/dsh-home-hosted/commit/d0f6b12))
- **boot:** Cover the system-scope journal hint, the branch the user one missed ([eadd0b3](https://github.com/NamesMT/dsh-home-hosted/commit/eadd0b3))
- **boot:** Drive the windows text rules through the provider, and cover a branch nothing reached ([f95c126](https://github.com/NamesMT/dsh-home-hosted/commit/f95c126))
- **panel:** Pin that the panel token does not cross a cross-origin redirect ([cd06952](https://github.com/NamesMT/dsh-home-hosted/commit/cd06952))
- **exec:** Pin the no-shell guarantee with an argument that would exploit a shell ([4eb1cf4](https://github.com/NamesMT/dsh-home-hosted/commit/4eb1cf4))
- **fsx:** Pin the atomic write's mechanism, which had no direct test ([aeb9720](https://github.com/NamesMT/dsh-home-hosted/commit/aeb9720))
- **service:** Pin the cli cache's three promises, which nothing asserted ([c9baa19](https://github.com/NamesMT/dsh-home-hosted/commit/c9baa19))
- **service:** Pin the instances cache window, which nothing asserted ([bbc062a](https://github.com/NamesMT/dsh-home-hosted/commit/bbc062a))
- **docs:** Guard the shipped docs' links and anchors, and make it able to fail ([0c9dbda](https://github.com/NamesMT/dsh-home-hosted/commit/0c9dbda))
- **client:** One source for the SectionProps every section test builds ([d5f6a0c](https://github.com/NamesMT/dsh-home-hosted/commit/d5f6a0c))
- **contracts:** Guard the policy list against the panel's own schema ([ae0a401](https://github.com/NamesMT/dsh-home-hosted/commit/ae0a401))
- Pin the top-level null rule and the nullable-field boundary ([0b35ac4](https://github.com/NamesMT/dsh-home-hosted/commit/0b35ac4))

### 🎨 Styles

- **dsh-entry:** Drop a comment orphaned by the previous fix ([4fe3aaa](https://github.com/NamesMT/dsh-home-hosted/commit/4fe3aaa))

#### ⚠️ Breaking Changes

- ⚠️  State the setup, stack and commit rules a cold session lacks ([de28ba4](https://github.com/NamesMT/dsh-home-hosted/commit/de28ba4))

### ❤️ Contributors

- NamesMT

## v0.7.4

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.7.3...v0.7.4)

### 🩹 Fixes

- **config:** Merge a nested patch group the way the panel's API does ([a7479e9](https://github.com/NamesMT/dsh-home-hosted/commit/a7479e9))
- **config:** Refuse a servers file that is not an object, and an entry that is not one ([6818588](https://github.com/NamesMT/dsh-home-hosted/commit/6818588))
- **config:** Refuse a null patch group the panel's own schema rejects ([33fb544](https://github.com/NamesMT/dsh-home-hosted/commit/33fb544))
- **config:** Route setControl through the control merge too ([18f6bec](https://github.com/NamesMT/dsh-home-hosted/commit/18f6bec))

### ✅ Tests

- **panel:** Pin both write shapes, flat stored entry and nested view ([a2d4ef9](https://github.com/NamesMT/dsh-home-hosted/commit/a2d4ef9))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.7.3

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.7.2...v0.7.3)

### 🩹 Fixes

- **boot:** Escape a .desktop line for GKeyFile, not only for Exec ([6ad4c46](https://github.com/NamesMT/dsh-home-hosted/commit/6ad4c46))
- **boot:** Stop doubling backslashes in a systemd path or free-text setting ([9c4174a](https://github.com/NamesMT/dsh-home-hosted/commit/9c4174a))
- **panel:** Read a create/patch answer as the flat entry the panel sends ([70e703a](https://github.com/NamesMT/dsh-home-hosted/commit/70e703a))

### 📖 Documentation

- **changelog:** Record the 0.7.2 pin bump ([73dba12](https://github.com/NamesMT/dsh-home-hosted/commit/73dba12))
- **boot:** The .desktop entry has two parsers, and the key file runs first ([9c6e6bf](https://github.com/NamesMT/dsh-home-hosted/commit/9c6e6bf))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.7.2

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.7.1...v0.7.2)

### 🩹 Fixes

- **deps:** Pin home-hosted ^0.7.3 ([e67169f](https://github.com/NamesMT/dsh-home-hosted/commit/e67169f))

### 🏡 Chore

- **build:** Stop committing the host sourcemap ([2d7cf91](https://github.com/NamesMT/dsh-home-hosted/commit/2d7cf91))

### ❤️ Contributors

- NamesMT

## v0.7.1

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.7.0...v0.7.1)

### 🩹 Fixes

- **boot:** Re-prove ownership before retiring, and read EPERM as alive ([b780f40](https://github.com/NamesMT/dsh-home-hosted/commit/b780f40))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.7.0

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.6.3...v0.7.0)

### 🚀 Enhancements

- Dsh 0.2.0-rc.2 support, Desktop surface, and server-first identity ([78956a5](https://github.com/NamesMT/dsh-home-hosted/commit/78956a5))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.6.3

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.6.2...v0.6.3)

### 📖 Documentation

- **design:** Trim the notes and fold the version pinning rule ([6f97f80](https://github.com/NamesMT/dsh-home-hosted/commit/6f97f80))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.6.2

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.6.1...v0.6.2)

### 🩹 Fixes

- **boot:** Never run a system entry as root, and keep entries alive across a restart ([8f053dc](https://github.com/NamesMT/dsh-home-hosted/commit/8f053dc))
- **boot:** Never write a User= systemd cannot resolve, and refuse an injected name ([a7f0a96](https://github.com/NamesMT/dsh-home-hosted/commit/a7f0a96))

### 📖 Documentation

- **boot:** An ordinary entry is detached too, so KillMode keeps every server ([e27bad4](https://github.com/NamesMT/dsh-home-hosted/commit/e27bad4))

### ✅ Tests

- **boot:** Resolve accounts against an injected user database ([11e1745](https://github.com/NamesMT/dsh-home-hosted/commit/11e1745))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.6.1

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.6.0...v0.6.1)

### 🚀 Enhancements

- **tools:** Concise descriptions, explicit workspace, UI via the panel CLI ([4a0e290](https://github.com/NamesMT/dsh-home-hosted/commit/4a0e290))

### 🩹 Fixes

- **launcher:** Pin by tier, and never read a shim's surrounding package ([9d89ccc](https://github.com/NamesMT/dsh-home-hosted/commit/9d89ccc))

### 📖 Documentation

- **tools:** Shorten the ui_manage description ([884d73e](https://github.com/NamesMT/dsh-home-hosted/commit/884d73e))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.6.0

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.5.3...v0.6.0)

### 🚀 Enhancements

- **autostart:** Hand the running panel to the installed entry ([7e7747e](https://github.com/NamesMT/dsh-home-hosted/commit/7e7747e))

### ✅ Tests

- **boot:** Scope the ladder fake to the user systemd scope ([1db26de](https://github.com/NamesMT/dsh-home-hosted/commit/1db26de))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.5.3

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.5.2...v0.5.3)

### 🩹 Fixes

- **panel-client:** Move the Workspaces section above Servers ([aa98b4c](https://github.com/NamesMT/dsh-home-hosted/commit/aa98b4c))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.5.2

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.5.1...v0.5.2)

### 💅 Refactors

- **workspace:** Pin the managed workspace to `default` ([3a61525](https://github.com/NamesMT/dsh-home-hosted/commit/3a61525))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.5.1

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.5.0...v0.5.1)

### 🩹 Fixes

- **panel-client:** Name the workspace the panel answer belongs to ([1e3c1c8](https://github.com/NamesMT/dsh-home-hosted/commit/1e3c1c8))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.5.0

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.4.5...v0.5.0)

### 🚀 Enhancements

- **workspaces:** ⚠️  Manage home-hosted 0.7 workspaces ([0e0b9b4](https://github.com/NamesMT/dsh-home-hosted/commit/0e0b9b4))

### 🩹 Fixes

- Explain the panel takeover and retire a stale boot refusal ([c684db1](https://github.com/NamesMT/dsh-home-hosted/commit/c684db1))

### 📖 Documentation

- **agents:** Require keeping README and docs updated with the change ([402ec9f](https://github.com/NamesMT/dsh-home-hosted/commit/402ec9f))

#### ⚠️ Breaking Changes

- **workspaces:** ⚠️  Manage home-hosted 0.7 workspaces ([0e0b9b4](https://github.com/NamesMT/dsh-home-hosted/commit/0e0b9b4))

### ❤️ Contributors

- NamesMT

## v0.4.5

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.4.4...v0.4.5)

## v0.4.4

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.4.3...v0.4.4)

### 🩹 Fixes

- A panel root this instance already uses is never traded away ([eb4c7a8](https://github.com/NamesMT/dsh-home-hosted/commit/eb4c7a8))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.4.3

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.4.2...v0.4.3)

### 🩹 Fixes

- Never adopt the machine-wide panel from a home that never ran this plugin ([0bbff6b](https://github.com/NamesMT/dsh-home-hosted/commit/0bbff6b))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.4.2

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.4.1...v0.4.2)

### 🩹 Fixes

- Run the dsh the project depends on, by name ([4b4f5fa](https://github.com/NamesMT/dsh-home-hosted/commit/4b4f5fa))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.4.1

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.4.0...v0.4.1)

### 🩹 Fixes

- Name the boot artifact per install, and finish the stop button ([9eabae8](https://github.com/NamesMT/dsh-home-hosted/commit/9eabae8))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.4.0

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.3.3...v0.4.0)

### 🚀 Enhancements

- Know and act on every home-hosted panel, not just the one we own ([34c74f5](https://github.com/NamesMT/dsh-home-hosted/commit/34c74f5))

### 🩹 Fixes

- Boot the dsh this plugin was installed on ([92576c4](https://github.com/NamesMT/dsh-home-hosted/commit/92576c4))

### 📖 Documentation

- Say each install drives its own panel root ([9c7f749](https://github.com/NamesMT/dsh-home-hosted/commit/9c7f749))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.3.3

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.3.2...v0.3.3)

### 🩹 Fixes

- Bind the generated dsh entry to loopback ([99f5525](https://github.com/NamesMT/dsh-home-hosted/commit/99f5525))

### 📖 Documentation

- State that deleting on toggle-off is intended ([d45a837](https://github.com/NamesMT/dsh-home-hosted/commit/d45a837))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.3.2

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.3.1...v0.3.2)

### 🩹 Fixes

- Make the token warning visible, and put back a deleted entry ([2113d47](https://github.com/NamesMT/dsh-home-hosted/commit/2113d47))
- Replace the panel token in one write, not clear-then-set ([0df6a9f](https://github.com/NamesMT/dsh-home-hosted/commit/0df6a9f))

### 📖 Documentation

- An AGENTS.md for the next agent, and a true owned-key constant ([2476446](https://github.com/NamesMT/dsh-home-hosted/commit/2476446))
- Record the home-hosted CLI facts the token flow depends on ([633e971](https://github.com/NamesMT/dsh-home-hosted/commit/633e971))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

## v0.3.1

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.3.0...v0.3.1)

## v0.3.0

[compare changes](https://github.com/NamesMT/dsh-home-hosted/compare/v0.2.2...v0.3.0)

### 🚀 Enhancements

- Boot a cloned dsh, and repair the panel token instead of failing ([3ae937a](https://github.com/NamesMT/dsh-home-hosted/commit/3ae937a))

### 🩹 Fixes

- Compare canonical paths, and gate the release on macOS ([888ddab](https://github.com/NamesMT/dsh-home-hosted/commit/888ddab))

### 📖 Documentation

- Lead with the stack, not just dsh ([5ddc357](https://github.com/NamesMT/dsh-home-hosted/commit/5ddc357))

### ❤️ Contributors

- NamesMT ([@NamesMT](https://github.com/NamesMT))

