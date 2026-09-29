<div align="center">

# 📌 dsh-home-hosted

**Your whole home stack, up after every reboot — your `dsh` web server included.**

A [DeepSeek Harness](https://github.com/deepseek-ai/dsh) plugin for
[home-hosted](https://github.com/NamesMT/home-hosted), the panel that supervises your services.
Declare the servers once; this page manages the panel, the boot entry and the entries.
<sub>Nothing is installed or started until you say so.</sub>

[![npm](https://img.shields.io/npm/v/dsh-home-hosted?label=npm&color=blue)](https://www.npmjs.com/package/dsh-home-hosted)
[![CI](https://github.com/NamesMT/dsh-home-hosted/actions/workflows/ci.yml/badge.svg)](https://github.com/NamesMT/dsh-home-hosted/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/dsh-home-hosted?color=green)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![dsh](https://img.shields.io/badge/dsh-%3E%3D0.1.7--rc.2-5b21b6)](https://github.com/deepseek-ai/dsh)

[🚀 Quick start](#-quick-start) · [🎛️ What the plugin does](#-what-the-plugin-does) · [🤖 Agent tools](#-agent-tools) · [🧩 Depth](#-depth)

</div>

<div align="center">

![The plugin's page: Detailed and Compact styles, under Settings → Home Hosted](https://raw.githubusercontent.com/NamesMT/dsh-home-hosted/main/assets/settings.gif)

<sub>The Detailed style, then the same sections in Compact — both switchable from the page header.</sub>

</div>

---

## 🚀 Quick start

```sh
dsh plugin --profile web add dsh-home-hosted
```

Open **Settings → Home Hosted**, turn on **Manage dsh**, and enable autostart.
<sub>Reboot once; `dsh` comes back without you touching anything.</sub>

## 🤔 Why

A panel restart shouldn't kill a prompt mid-flight, and a reboot shouldn't cost you an SSH session.

```text
                 reboot
                   │
                   ▼
  OS boot entry ──▶ home-hosted panel ──▶ ┌─────────────┐
  systemd ·                    │          │ dsh web ✓   │
   launchd ·                   │          └─────────────┘
    XDG · Run key              │
                               ├────────▶ ┌─────────────┐
                               │          │ docker      │
                               │          │ compose     │
                               │          └─────────────┘
                               │
                               └────────▶ ┌─────────────┐
                                          │ postgres    │
                                          │ :5432       │
                                          └─────────────┘
```

**`dsh` is one entry in the panel, not the whole product.** The panel is the supervisor: it starts
each entry, watches it, restarts what dies and reclaims its port. Add your compose stack, your
database, your bot — manage them from the page, or hand the entry ids to an agent.

A plugin cannot run at boot, so this one writes the OS entry while dsh runs and the OS takes over.
One managed entry (`dsh`) is kept alive under home-hosted's nanny, so a panel restart leaves it
running.

## 🎛️ What the plugin does

| | |
|---|---|
| 🚀 **Boot autostart** | Installs, verifies and removes the OS entry. Opt in per machine. |
| 🛡️ **Survives a panel restart** | The managed entry runs under home-hosted's nanny, so restarting the panel leaves it running. |
| 📦 **Ships its own panel** | The pinned `home-hosted` is a dependency, so boot runs the version this plugin is tested against. |
| 🖥️ **Server control** | Add, edit, start, stop and restart entries — written through the panel's API, so nothing restarts behind your back. |
| 🗂 **Workspaces** | The panel manages one workspace for the `dsh` entry; the page and the agent tools reach **every** workspace it serves, counts included. |
| 🧭 **Token warnings that mean something** | A missing or refused API token is called out on the page, with one click to mint a working one. |
| 🪟 **Knows the other panels** | Several panels on one machine? The agent is told which one this plugin manages, and asks before touching another. |
| 🤖 **Agent tools** | On by default, session permissions still gate every write. |

## 🤖 Agent tools

| Tool | Does |
|---|---|
| `home_hosted_status` | Panel, boot entry and managed-entry state |
| `home_hosted_workspaces_list` | Every workspace the panel serves, with counts |
| `home_hosted_servers_list` | Every supervised server in a workspace |
| `home_hosted_servers_lifecycle` | `start` · `stop` · `restart` |
| `home_hosted_servers_edit` | `create` · `update` · `delete` |
| `home_hosted_autostart_manage` | `install` · `uninstall` |
| `home_hosted_ui_manage` | `status` · `update` · `revert` · `switch` the panel's own UI |

The server tools take a `workspace`, because an id is only unique inside one; omitting it means the
workspace the plugin manages.

A tool that changes something asks for approval **only** when the session is not already Full access.
<sub>A refused token is re-enrolled on the spot and the tool retries — see **automatic regeneration** below.</sub>
<sub>Every tool takes an optional `instance` (a panel's `--home` or URL). Omit it for the panel this plugin manages; with several panels found the call asks which one you mean, and naming another panel asks first too — then reaches it by editing its config file, running the CLI against it, or minting a token and using its API.</sub>

## 🧩 Depth

<details>
<summary><b>Boot autostart, per platform</b></summary>

| Platform | Mechanism | Starts |
|---|---|---|
| Linux | `systemd-user`, `systemd-system`, XDG autostart | login, or boot with a system unit / `loginctl enable-linger` |
| macOS | `launchd-agent`, `launchd-daemon` | login, or boot with the daemon (one-time `sudo`) |
| Windows | Run key, Task Scheduler | login |

When the process cannot elevate, the page prints the exact commands instead — including the
`launchd-daemon` that starts a Mac **before** login.

</details>

<details>
<summary><b>Which home-hosted runs</b></summary>

The pinned dependency by default; the page can switch to a global install, or install the pinned
range globally for you. Boot entries run a small stable launcher the plugin writes, so a
`node_modules` path that moves never breaks boot.

</details>

<details>
<summary><b>dsh from a local clone</b></summary>

A `dsh` you cloned and built yourself is supported: the managed entry starts a stable launcher that
re-finds your build at boot, so a rebuild, a moved checkout or a fresh profile does not strand it.
<sub>Falls back to whatever `dsh` is on PATH, and fails with the reason when it finds neither.</sub>

</details>

<details>
<summary><b>Managed entry and port policy</b></summary>

One entry (`dsh`), one toggle: the panel keeps it alive, restarts it and reclaims its port. A
detached restart is recognised on macOS and Linux (`follow`); Windows cannot prove identity through
a `.cmd` shim, so it uses `onPortConflict: kill`. The plugin pins home-hosted 0.7+, so every key it
writes is one that panel parses.

</details>

<details>
<summary><b>API tokens and automatic regeneration</b></summary>

The plugin needs its own home-hosted API token to read and write the panel. home-hosted keeps only
the token's hash, so a token it did not mint can never be recovered — `<stateDir>/panel-token` is
`0600`, never rendered or logged, and **Regenerate token** enrols a new one that replaces it.

A missing or refused token is called out on the page with that button, including when the panel is
not answering at all — a token problem is often *why* it cannot be reached.
**Regenerate token automatically** (Agent tools section, on by default) does the same thing when a
panel call is refused: the tool re-enrols and retries once instead of failing. Turn it off to be
asked instead of having a working token silently replaced.

</details>

<details>
<summary><b>Operator config</b></summary>

The Cordis row config is for operator overrides only:

```yaml
- id: dsh-home-hosted
  name: 'dsh-home-hosted'
  config:
    stateDir: /custom/state/dir        # default: $DSH_HOME/dsh-home-hosted
    homeHostedCommand: /usr/bin/home-hosted
    defaultEntryId: dsh
```

Everything a person toggles lives in `<stateDir>/settings.json`.

Each install drives its own panel root — `<stateDir>/panel`, or `$HHOSTED_HOME` when set — and names
its own boot entry, so two dsh installs no longer share one panel. An existing `~/.home-hosted`
panel is adopted as-is, and the page shows which root this install owns.

</details>

<details>
<summary><b>Development</b></summary>

```sh
pnpm install
pnpm typecheck && pnpm test && pnpm build
```

Node 24+, pnpm. The same commands CI runs.

</details>

---

<div align="center">

MIT · [npm](https://www.npmjs.com/package/dsh-home-hosted) · [releases](https://github.com/NamesMT/dsh-home-hosted/releases) · [issues](https://github.com/NamesMT/dsh-home-hosted/issues) · built on [home-hosted](https://github.com/NamesMT/home-hosted)

</div>
