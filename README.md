# dsh-home-hosted

**Manage [home-hosted](https://github.com/NamesMT/home-hosted) — its boot entry, its panel and its servers — from inside DeepSeek Harness.**

**Your `dsh` web server, up after every reboot.** home-hosted starts it at boot and keeps it alive: restarting the panel no longer cuts a prompt mid-flight.

[![npm](https://img.shields.io/npm/v/dsh-home-hosted?label=npm&color=blue)](https://www.npmjs.com/package/dsh-home-hosted)
[![CI](https://github.com/NamesMT/dsh-home-hosted/actions/workflows/ci.yml/badge.svg)](https://github.com/NamesMT/dsh-home-hosted/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/dsh-home-hosted?color=green)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![dsh](https://img.shields.io/badge/dsh-%3E%3D0.1.7--rc.2-5b21b6)](https://github.com/deepseek-ai/dsh)

![The plugin's page: Detailed and Compact styles, under Settings → Home Hosted](https://raw.githubusercontent.com/NamesMT/dsh-home-hosted/main/assets/settings.gif)

## Install

```sh
dsh plugin --profile web add dsh-home-hosted
```

Then open **Settings → Home Hosted** and turn on **Manage dsh** — with the panel's autostart enabled, that is what brings `dsh` back after a reboot. Nothing is installed or started until you say so; the page defaults to a **Detailed** style, with a Compact one beside the title.

| | |
|---|---|
| 🖥️ **`dsh`, up at boot** | home-hosted starts your `dsh` entry after every reboot, so the web UI is there without you touching anything. |
| 🚀 **Boot autostart** | Installs, verifies and removes the OS entry that starts the panel — systemd, launchd, XDG or the Windows Run key. Opt in per machine. |
| 🛡️ **Survives a panel restart** | The managed entry runs under home-hosted's nanny, so a panel restart leaves it running. |
| 📦 **Ships its own panel** | The pinned `home-hosted` is a dependency, so boot runs the version this plugin is tested against. |
| 🖥️ **Server control** | Add, edit, start, stop and restart entries — written through the panel's API, so nothing restarts behind your back. |
| 🧭 **A sign-in page that helps** | dsh's 401 points at the panel log holding the tokenised URL, instead of leaving you to find it. |
| 🤖 **Agent tools** | On by default: the agent can inspect state, manage servers, install autostart and switch the panel's UI. |

## Agent tools

| Tool | Does |
|---|---|
| `home_hosted_status` | Panel, boot entry and managed-entry state |
| `home_hosted_servers_list` | Every supervised server |
| `home_hosted_servers_lifecycle` | `start` · `stop` · `restart` |
| `home_hosted_servers_edit` | `create` · `update` · `delete` |
| `home_hosted_autostart_manage` | `install` · `uninstall` |
| `home_hosted_ui_manage` | `status` · `update` · `revert` · `switch` the panel's own UI |

A tool that changes something asks for approval **only** when the session is not already Full access.

<details>
<summary><b>Boot autostart, per platform</b></summary>

| Platform | Mechanism | Starts |
|---|---|---|
| Linux | `systemd-user`, `systemd-system`, XDG autostart | login, or boot with a system unit / `loginctl enable-linger` |
| macOS | `launchd-agent`, `launchd-daemon` | login, or boot with the daemon (one-time `sudo`) |
| Windows | Run key, Task Scheduler | login |

A plugin cannot act at boot: it installs and re-syncs the entry while dsh runs, and the OS takes over from there. When the process cannot elevate, the page prints the exact commands to run instead — including the `launchd-daemon` that starts a Mac **before** login.

</details>

<details>
<summary><b>Which home-hosted runs</b></summary>

The pinned dependency by default. The page can switch to a global install, or install the pinned range globally for you. Boot entries run a small stable launcher the plugin writes, so a `node_modules` path that moves never breaks boot.

</details>

<details>
<summary><b>Managed entry and port policy</b></summary>

One entry (`dsh`) is managed from the page with a single toggle: the panel keeps it alive, restarts it and reclaims its port. A detached restart is recognised on macOS and Linux (`follow`); Windows cannot prove identity through a `.cmd` shim, so it uses `onPortConflict: kill` — which needs home-hosted 0.6.0 or newer, and the plugin refuses that write against an older panel rather than producing a config it cannot parse.

</details>

<details>
<summary><b>Configuration</b></summary>

The Cordis row config is for operator overrides only:

```yaml
- id: dsh-home-hosted
  name: 'dsh-home-hosted'
  config:
    stateDir: /custom/state/dir        # default: $DSH_HOME/dsh-home-hosted
    homeHostedCommand: /usr/bin/home-hosted
    defaultEntryId: dsh
```

Everything a person toggles lives in `<stateDir>/settings.json`. The panel API token it mints is kept `0600` there, and is never rendered or logged.

</details>

<details>
<summary><b>Development</b></summary>

```sh
pnpm install
pnpm typecheck && pnpm test && pnpm build
```

Node 24+, pnpm, 360 tests. Same four commands CI runs.

</details>

MIT · [npm](https://www.npmjs.com/package/dsh-home-hosted) · [releases](https://github.com/NamesMT/dsh-home-hosted/releases) · [issues](https://github.com/NamesMT/dsh-home-hosted/issues) · built on [home-hosted](https://github.com/NamesMT/home-hosted)
