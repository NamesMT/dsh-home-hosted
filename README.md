# dsh-home-hosted

A DeepSeek Harness plugin for [home-hosted](https://github.com/NamesMT/home-hosted): start the panel at boot, and manage its servers from inside dsh.

![The plugin's page under Settings → Home Hosted](https://raw.githubusercontent.com/NamesMT/dsh-home-hosted/main/assets/settings.png)

## What it does

- **Boot autostart** — installs, verifies and removes the OS entry that starts `home-hosted` at boot (systemd on Linux, launchd on macOS, Run key / Task Scheduler on Windows). Off by default; opt in from the plugin's page.
- **Runs its own home-hosted** — the pinned copy ships as a dependency, so the panel that starts at boot is the version this plugin was built against. The page can start that panel, or replace a running one with it.
- **Server management** — add, edit, start, stop and restart home-hosted's servers without leaving dsh, with the panel's API as the write path so nothing is restarted behind your back.
- **Reclaim the harness** — a managed `dsh` entry follows its own detached restart on POSIX, and uses `onPortConflict: kill` on Windows where a detached restart cannot be identified.
- **Agent tools** — on by default. `status`, `servers_list`, `servers_lifecycle` (start/stop/restart), `servers_edit` (create/update/delete), `autostart_manage` (install/uninstall), `ui_manage` (status/update/revert/switch the panel's own UI). A tool that changes something asks for approval only in a session that is not already Full access.

## Install

```sh
dsh plugin --profile web add dsh-home-hosted
```

Then open **Settings → home-hosted**.

## Configuration

The Cordis row config is for operator overrides only:

```yaml
- id: dsh-home-hosted
  name: 'dsh-home-hosted'
  config:
    stateDir: /custom/state/dir        # default: $DSH_HOME/dsh-home-hosted
    homeHostedCommand: /usr/bin/home-hosted
    defaultEntryId: dsh
```

Everything a person toggles lives in `<stateDir>/settings.json`, including **Options → which home-hosted to run**: the pinned dependency (default) or a global install. The page shows both candidates with their versions, and can install the pinned range globally for you.

## Notes

- A plugin cannot act at boot: it installs and re-syncs the OS entry while dsh runs, and the OS starts home-hosted from then on.
- The plugin ships its own `home-hosted` (pinned range) and runs that copy by default; Options in the page can switch to a global install instead. Boot entries run a small stable launcher it writes, so a `node_modules` path that moves never breaks boot.
- Boot (pre-login) needs privilege somewhere, and the page shows the exact commands when it cannot elevate: on macOS pick the boot-scope **launchd-daemon** (a one-time `sudo` install), on Linux **systemd-system** or `loginctl enable-linger`. A `LaunchAgent` and an XDG entry start at login only.
- The panel API token this plugin uses is minted on first write and kept 0600 under the plugin state directory; it is never rendered or logged.
- `onPortConflict: kill` needs home-hosted 0.6.0 or newer; against an older panel the plugin refuses that write and says so, because that panel cannot parse the config it would produce. The POSIX default is `follow`, which needs nothing extra.

## License

MIT
