# Client and page

Read before touching the settings page's state, or a sentence the host sends the page to render.

- **UI state that outlives the context that gave it meaning.** `ServersSection` is not remounted when
  the viewed workspace changes (no `key` on it), so `editing`/`deleting`/`freeing`/`freeNote` keyed
  by bare server id — only unique inside a workspace — described another workspace's server after a
  switch, and a save wrote A's values over B's. Fixed at the **state**, not the display: each
  selection is stamped with the workspace it was made in (`scopedSelection`), so a foreign one is
  inert. `busyKey` already encoded this for in-flight keys
  (`src/client/section-servers.tsx`, `test/client/servers-scoping.test.tsx`).
- **When a comparator only checks part of what it describes, check whether a field was dropped
  before it ever got there.** `bootAttemptView` dropped the mechanism, so the persisted note could
  only be gated on `state` and switching the preference left the old mechanism's refusal on screen.
  The pattern to copy is `visibleBootAttempt`: show a fresh attempt only while its `state` and
  `mechanism` still match the live ones (`src/client/boot.ts`, `test/client/boot-fresh.test.tsx`).
- **A diagnostic that quotes internal vocabulary is not a diagnostic.** The mechanism picker's option
  values *are* `systemd-system`/`xdg-autostart`, but the host already sends a sentence for each
  (`BootCandidate.reason`) and the page was dropping it. Both renderings now read one
  `reasonFor(mechanism)` lookup, so they cannot drift (`src/client/section-boot.tsx`).
- **Word a convention as a possibility, not a fact** — those mechanism reasons are the host's own
  observation about *this* machine, not claims about what a name universally means.
- **Read a new response field as a value, not as a key.** The `recommended` sentence rendered the
  literal `"would use undefined"` against a panel that omits it — a real case, because the page is
  bundled separately from the host. Check `typeof value === 'string' && length > 0` and fall back;
  the same guard covers an explicit `null` (`src/client/section-boot.tsx`).
- **Package artwork is a manifest field, and every way of getting it wrong is silent.** The Plugins
  page inlines `package.json#icon` as a data URL — a **relative** path inside the package, one of
  `.svg`/`.png`/`.jpg`/`.jpeg`/`.webp`, a regular file, ≤256 KiB (`iconOf` in `dsh-app-boot`). It
  refuses an absolute path, a URL scheme, an unknown extension, a file that escapes the package, or
  one over the cap — and a refusal renders the generic default mark with a `error` string in a field
  the page never displays, so the plugin simply looks unbranded. The field is also outside
  `package.json#files` unless added, which fails one release later on the installed copy only.
  `test/resolve` ("the package artwork") checks all three, because none of them shows up any other
  way. The artwork itself is upstream's `docs/branding/logo-mark.svg` — the 16px mark, not the 512
  grid one: at the 30–36px slot the page renders, the full mark's three rack units and nine vent
  slots fall below a pixel and smear.
- **A host that grows the seat you were working around turns the workaround into a second icon.**
  dsh before 0.2.2 picked settings-nav glyphs from a closed list of section ids and fell back to its
  own gear, and `settings.section` projects only `id`/`order`/`label` — so this plugin claimed its own
  nav row and masked the gear with a house (`settings-nav-icon.ts`). dsh 0.2.2 added a
  `settings.section.icon` list, scoped by the same id, rendered over that gear as a *fallback* — and
  moved the gear **inside** a `.navIcon` span, so the stand-in's `button > svg` selector stopped
  hiding anything. The row then showed the host's gear **beside** our house: the duplicated icon a
  user reports. Two rules follow. Look for the seat before keeping a workaround, because the host's
  own contract says it plainly ("register an icon component with the same `id` as its
  `settings.section` contribution … the component receives `size` in pixels and `active` … without a
  matching icon registration the shell renders its default glyph"); and treat the **slot's presence
  as the detection**, stopping the stand-in when it arrives, because the settings shell can mount
  after the plugin's effect — registering into the seat while the stand-in is still up paints the
  same duplicate from the other side. A workaround that fakes host UI must be able to *stop*, so the
  installer returns a stopper (`src/client/index.tsx`, `test/client/index.test.ts`).
- **A host that prints a secret once is a host whose secret you must go and read.** home-hosted
  generates a random first-run password and prints it **once**, on the machine that started the
  panel, deliberately never over its API (`GET /api/auth/session` answers
  `usingDefaultPassword: true` with `defaultPassword: null`). That promise silently inverts when
  *this plugin* is the thing that starts the panel as a managed entry: the line lands in
  `.hh/.logs/home-hosted.log`, which no window shows, and the person is locked out by a password
  nobody was told. So read the machine-local file the panel's own `status` command reads
  (`.hh/.control-secrets.json`, `password.initial` while `isDefault` is true) and show it —
  `src/home-hosted/first-run-password.ts`. Two things to keep straight: a restored `global:secrets`
  keeps the hash but **not always the text**, and an empty box there would read as "your password is
  blank"; and `isDefault: false` means the stored text is history, not the current password. Two
  corrections this cost, both worth not repeating: the reader must mirror the panel's `initialPassword`
  getter **including its legacy branch** (a pre-0.12 home stores only a hash of the shared `hh`, so a
  text-only reader calls a perfectly recoverable password unrecoverable), and the advice for the truly
  lost case must be something the person can *do* — telling a Desktop user to run a CLI command was
  wrong twice over, since this plugin starts the panel (no terminal in front of them) and the command
  named (`account reset`) does not exist in the pinned release (`set-password` is the one). The page
  offers a button that runs it; `src/home-hosted/panel-password.ts`.
- **A secret shown on the page is a secret you just widened the audience for.** The first-run
  password is read from disk for the panel section (`PanelStatus.firstRunPassword`), and
  `home_hosted_status` answers that same status object — so the text would have reached every agent
  that called it. The fix is a redaction on the agent path only (`redactForAgent` in `src/tools.ts`):
  keep `state`, drop `password`. Two lessons worth keeping. The page and the model are different
  audiences, and "the page needs it" never implies "the tool should return it" — the panel's own API
  token has always been reported as a word for this reason. And **a redaction helper no call site
  invokes is worthless**: pinning the helper left the suite green with both agent call sites
  un-wrapped, which only an end-to-end `status` tool call caught.
