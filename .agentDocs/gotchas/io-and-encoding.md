# I/O, encoding and bounds

Read before slicing, decoding, or bounding a read of file or pipe text. There is **no Windows leg**
here (deliberate, per `platform-gate.yml`), so a CRLF break would reach a user before CI.

- **A slice boundary must be refused when absent.** `indexOf('\n', at)` returns **-1** when the line
  ends the file and `slice(at, -1)` drops the last character; normalize `\r\n` and **throw**
  (`src/boot/systemd.ts`, `src/boot/xdg.ts`, `src/boot/common.ts`).
- **A generated string is LF by construction** — a template literal normalizes `<CR><LF>`, so a test
  slicing *generated* source is safe whatever the checkout.
- **`.trim()` neutralizes a trailing CR**, which is why the `split('\n')` sites in `systemd.ts`,
  `xdg.ts` and `common.ts` are fine; `parsePasswd` returns `fields[5]` untrimmed but its consumer trims.
- **A non-LF changelog breaks `scripts/release-notes.mjs`** — a CR-only file splits into one line, so
  the anchored `^##` heading never matches (latent: CI is `ubuntu-latest`).
- **A decode per block is wrong for a character that straddles two.** A console block or a pipe chunk
  splits mid-character, and `Buffer.toString('utf8')` substitutes U+FFFD rather than throwing. Count
  separators on the **bytes** (`0x0A` cannot occur inside a multi-byte sequence) and decode once, or
  use a `StringDecoder` (`src/util/exec.ts`, `src/home-hosted/panel-console.ts`).
- **A comment that names one case is not a proof of the other** — enumerate what can straddle a
  boundary. **A module with no direct test is covered only by its callers**, so drive **real children**.
- **A test that samples the real environment cannot fail for a reason the environment does not
  exhibit** — construct the input that breaks the bound, or it pins the machine.
- **A "read a fixed window, take the last N" reader is wrong when the unit is bytes and the request is
  lines**, because a line is unbounded; the console reader grows its window instead. Check any
  `Math.min(size, …)` followed by `slice(-n)` (`src/home-hosted/panel-console.ts`).
- **A rotation is joined as text, and sufficiency is counted in separators** — gluing two line arrays
  invents a break when `.1` is unterminated, and "last N lines" is one short if the test counts lines
  rather than `N + 1` separators (`test/panel-console.test.ts`).
- **Check what actually bounds the loop** — a `const` comment claimed it grew, but the *loop* grew;
  name the condition, not the allocation.
- **Measure the unit the comment uses, and the realistic input.** The panel rotates at
  `LOG_ROTATE_BYTES` (upstream), so a synthetic 40 MB case is unreachable — **a bound is only a defect
  if a reachable input reaches it** — and a bounded read must not lose data
  (`test/panel-console.test.ts`).
