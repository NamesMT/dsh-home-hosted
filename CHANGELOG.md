# Changelog


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

