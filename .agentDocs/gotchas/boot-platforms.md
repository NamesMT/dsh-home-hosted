# Boot and platform traps

Read before touching a boot provider, artifact builder or platform rule. The ladder is one provider
per mechanism: `detect()` reports candidates, `status()` what is installed, `install()`/`uninstall()`
write the artifact.

- **One control-character rule is the right width for three formats.** `assertNoControl`
  (`src/boot/escape.ts`) covers a systemd unit, a plist and a `.cmd` line with one regex; a wider rule
  rejects legitimate values. `%`, `&`, `|`, `^` in a `.cmd` are `batchEscape`'s job.
- **An exported builder must validate its own spec, not rely on its callers.** `install()` validates
  before calling `windowsRunPayload`, but **`uninstall()` does not**, so `../evil` as `unitName` would
  escape the directory; it calls `validate(spec)` itself now (`src/boot/windows.ts`).
- **The thin delegators are defence in depth, not the sole guard** — `assertArg`/`assertLabel`/
  `assertRegistryValueName` are one-liners over `assertNoControl`, and the escapers
  (`systemdExecWord`, `systemdText`, `desktopExec`, `windowsArg`) reject the same input.
- **A rule that matches a tool's text must be tested against its real text and the stream it reads.**
  The `Register-ScheduledTask` probe greps `stdout`, and PowerShell's absent-cmdlet error quotes that
  verb — saved only because the error goes to `stderr` (`src/util/exec.ts`).
- **`FAILED_RESULTS` decides whether a unit reads as failing**; all eight members and the negative
  direction are asserted (`src/boot/systemd.ts`).
- **The user-bus rule matches a prefix**, so the real longer `systemctl --user` refusal and the
  shorter test form both match (`src/boot/systemd.ts`).
- **The cgroup container-detection branch is neither testable nor the branch that works** — it reads
  `/proc/1/cgroup` with no seam, and a real Docker container reports `0::/`, so `/.dockerenv` fires
  first; the injectable `container=` branch is tested both ways (`test/boot/ladder.test.ts`).
- **Naming the artifact is not naming where its output went.** A boot-run panel writes
  `<home>/.hh/.logs/home-hosted.log`; `launchd` writes `<logDir>/<label>.out.log`, and `systemd`'s
  output is in the journal, named by the status line. `launchdLogPaths` is shared by both.
- **`xdg-autostart` and the Windows mechanisms have no output to name**, deliberately.
- **Windows quoting has two layers, and conflating them is a bug** — `windowsArg` produces the CRT
  rules, `cmd.exe`'s layer is separate, and `cmdQuote` wraps the copy-pasteable form; both round-trip
  against **real** Windows output (`test/boot/escape.test.ts`).
- **The plugin cannot act at boot**: `reconcile()` repairs an entry that exists, it never installs one.
- **A successful install hands the running panel to the new entry through a detached helper.** Prove
  the start, stop the previous mechanism's panel, start the entry — *then* retire the others, or you
  delete the entry keeping the panel alive (`test/boot/activate.test.ts`).
- **A restart policy turns the CLI's `down` into a restart, and no test sees it.** systemd's
  `Restart=` (read out of this machine's `systemd.service(5)`, systemd 261) restarts a process that
  dies outside systemd and explicitly not one systemd stopped itself — "When the death of the process
  is a result of systemd operation (e.g. service stop or restart), the service will not be restarted."
  So a CLI `down` on a supervised panel comes back seconds later and `panel.stop` reported a stop the
  machine had already undone; the mirror is a CLI `up` starting a panel beside the entry. Both actions
  therefore ask the installed mechanism (`control()` in `src/boot/ladder.ts`, `*Commands()` in each
  provider) and fall back to the CLI only when nothing is installed. In `test/service.test.ts` ("panel
  start and stop go through the installed entry") the entry branch asserts the CLI is never called;
  sibling tests assert the opposite on the paths that *should* reach it (no entry installed, a refused
  step, an unreachable ladder).
- **`panel.takeover` is a start *and* a stop, and it was the one path that forgot.** It stopped and
  started through the CLI while `panel.start`/`panel.stop` had already been taught to go through the
  entry, so replacing a supervised panel left the unit reporting a run that never started the
  answering process: `enabled-failing` beside a healthy panel, permanently, because nothing later
  gives that unit a successful start. `bootControl('stop')` and `bootControl('start')` now supply the
  helper's steps. The mirror is the guard's witness: it asked `selfEntryId()` — "did the answering
  panel spawn this process?" — and so refused whenever the panel came from anywhere else, which is
  exactly when two copies disagree and the button is needed. The question it meant is "would the
  **managed** entry start a panel again"; `selfEntryId()` belongs only in the second question, "would
  this session survive a `down`". `test/panel-control.test.ts` drives the generated helper against a
  fake `systemctl` on PATH and asserts the CLI never ran — a string assertion on the source would
  pass for a helper that carries the steps and takes the other branch.
- **The start verb comes from the entry's own state, not from the health probe.** `/healthz` silent is
  the only condition for showing Start (`section-panel.tsx`), and that probe times out after 2 s — so a
  *healthy but slow* panel looks identical to a wedged one. A wedged panel is still active, where
  `systemctl start` is a no-op, but a blanket `restart` would stop a working panel and every server it
  supervises over a false negative. So `startVerb()` reads `ActiveState` and picks `start`/`restart`;
  an unreadable answer means `start`, whose failure mode is a harmless no-op. launchd does the same
  with the `launchctl print` it already needs: plain `kickstart` when unloaded, `kickstart -k` when
  running. A `windows-task` cannot follow — `/Run` under `MultipleInstancesPolicy=IgnoreNew` is a no-op
  for a running instance and `schtasks` has no graceful restart — so that path reports "did not answer"
  rather than recovering, and `docs/PANEL.md` says so.
- **Commanding a unit this plugin did not write is the same bug as deleting one.** `status()` proves a
  unit exists, not who wrote it, and `home-hosted` is the name a machine-default install uses; the
  distro unit on this machine lives at `/etc/systemd/system/home-hosted.service`. `retireCommands()`
  gated its deletion on the marker, so `mayCommand()` gates start/stop on `FragmentPath` — the file
  systemd actually loaded — which also catches a unit found elsewhere on the search path.
- **WSL2 is an ordinary Linux host to `systemd-system`, and has no working `systemd-user` here.**
  Measured on WSL2 with `systemd=true`: PID 1 is systemd and `systemd-system` works end to end
  (`systemctl stop` really stops a `Restart=always` unit, and `start`/`restart` behave as documented),
  while `systemd-user` is genuinely unavailable — `user@1000.service` is `failed` and
  `systemctl --user` cannot reach a bus. `detect()` reports that honestly and `bootStatus` falls back
  to the system mechanism, so a WSL user gets autostart and a working Start/Stop, not a broken page.
  Windows `.exe`s are reachable through interop, which is a *separate* mechanism from `windows-task`:
  the plugin only uses `schtasks.exe` when `process.platform === 'win32'`, never under WSL.
- **Windows has three mechanisms because "before login" is a different trade, not a better one.**
  `windows-task` (logon trigger, `InteractiveToken`) starts only after someone logs in; `windows-boot`
  (`BootTrigger`, SID `S-1-5-18`) starts at boot but runs in **session 0**, which has no interactive
  desktop and no loaded user profile. Measured on Windows 11 through WSL interop: the boot task really
  reports `session=0` while `explorer.exe` is in session 1, and the Task Scheduler accepts the
  generated XML (`Schedule Type: At system start up`, `Run As User: SYSTEM`). So `windows-boot` is
  excluded from `recommend()` by `OPT_IN_ONLY` while staying explicitly selectable — the panel itself
  is fine there (`--no-open`), a supervised GUI server is not.
- **Two artifacts in one naming space must not share a name.** Both task mechanisms key on
  `spec.unitName`, so the boot one appends `-boot` (`bootTaskNameOf`); sharing it would make installing
  one silently replace the other, and a switch between them impossible to undo. Tests assert both
  names coexist and that uninstalling one leaves the other.
- **`schtasks /End` is not a stop, and not reliably a kill either — measured.**- **`schtasks /End` is not a stop, and not reliably a kill either — measured.** On Windows 11 through
  WSL interop, `/End` reported "terminated successfully" and `Last Result` 267014 (user-terminated), yet
  a program's own shutdown handler never ran (a PowerShell `trap` stayed cold) and a `ping` child
  survived `/End` by minutes, parent already dead. `RestartOnFailure` did **not** revive the task after
  `/End` (waited past its 1-minute interval, still `Ready`), unlike systemd's `Restart=always`. So the
  task offers `startCommands()` and deliberately no stop: only the CLI's `down`, which signals the
  panel's pids, runs the supervised servers' stop policy. `/Run` on a running task under
  `MultipleInstancesPolicy=IgnoreNew` is a real no-op (same pid, one instance, "is currently running"),
  which is why the wedged Windows panel cannot be recovered from the page.
- **A launchd job launchd does not have loaded cannot be `kickstart`ed**, so `startCommands()` proves
  it with `launchctl print` and answers null rather than printing a command that would fail.
- **An entry this process runs as is never deleted**; "stop managing" pauses or restores it instead.
  **The `unsupported` candidate is real**, not a bug to filter out.
- **A choice the host can already resolve should not be left to the reader to guess** —
  `mechanism: 'auto'` is resolved by `recommend()`, whose answer is already `BootStatus.recommended`
  (`src/boot/ladder.ts`).
- **A hint that can be wrong is worse than no hint**, so every such hint is gated on the entry
  actually being installed.

## Oracles

- **A hand-written model of someone else's parser is evidence, not equivalence.** The `.desktop`
  round-trip reads through a local `keyFileRead` imitating GLib; it was spot-checked once against a
  real `g_key_file_get_string` reader but needs a C compiler and GLib, so it cannot be committed.
  Re-run the comparison if the model changes (`test/boot/xdg.test.ts`).
- **Prefer the real thing as the oracle** — Windows quoting round-trips against real
  `CreateProcess`/`cmd.exe` output, and the control-character width against real `systemd-analyze
  verify`, `cmd.exe` and an XML parser (`test/boot/escape.test.ts`).

## Generated scripts

- **Two copies of one algorithm inside separate generated scripts are real duplication; two copies in
  normal modules are not always.** `src/home-hosted/launcher.ts` shares seven helpers, none
  byte-identical; the one that was became `COMPARE_VERSIONS_SOURCE` (`test/launcher.test.ts`).
