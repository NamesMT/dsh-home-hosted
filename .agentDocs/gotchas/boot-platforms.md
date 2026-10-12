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
