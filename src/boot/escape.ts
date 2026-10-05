/**
 * Escaping for every format this plugin writes.
 *
 * None of this builds a shell command: a unit file, a plist, a `.desktop`
 * entry, a task XML and a registry value each have their own parser, and each
 * value is quoted for exactly that parser. Values that carry control
 * characters (newlines included) are rejected outright, because a newline is
 * how a value escapes its field in every one of these formats.
 */

const CONTROL = /[\u0000-\u001F\u007F]/

export function assertNoControl(value: string, what: string): string {
  if (CONTROL.test(value))
    throw new Error(`${what} must not contain control characters or newlines`)
  return value
}

export function assertUnitName(name: string): string {
  if (!/^[A-Za-z0-9._@-]+$/.test(name))
    throw new Error(`unit name ${JSON.stringify(name)} must match ^[A-Za-z0-9._@-]+$`)
  if (name.startsWith('-') || name.startsWith('.') || name.includes('..'))
    throw new Error(`unit name ${JSON.stringify(name)} must not be option-like or traverse paths`)
  return name
}

export function assertMarker(marker: string): string {
  if (marker.trim() === '')
    throw new Error('marker must not be empty')
  return assertNoControl(marker, 'marker')
}

/**
 * A user name a unit or a plist may name.
 *
 * It is *not* quoted anywhere: systemd's `User=` and launchd's `UserName` take a
 * bare name, and a value carrying a newline would therefore end the line and let
 * the rest of it become another directive. So this is the one place that decides
 * what an account name may be, and every writer goes through it.
 */
export function assertUserName(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9._-]*$/.test(name))
    throw new Error(`user name ${JSON.stringify(name)} must match ^[A-Za-z_][A-Za-z0-9._-]*$`)
  return name
}

export function assertEnvKey(key: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
    throw new Error(`environment key ${JSON.stringify(key)} is not a valid name`)
  return key
}

/** POSIX-absolute, Windows-drive-absolute or UNC; checked without consulting the host OS. */
export function isAbsolutePath(value: string): boolean {
  return value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\')
}

export function assertAbsolute(value: string, what: string): string {
  if (!isAbsolutePath(value))
    throw new Error(`${what} must be absolute, got ${JSON.stringify(value)}`)
  return assertNoControl(value, what)
}

export function assertLabel(value: string): string {
  if (value.trim() === '')
    throw new Error('label must not be empty')
  return assertNoControl(value, 'label')
}

export function assertArg(value: string, what = 'argument'): string {
  return assertNoControl(value, what)
}

function replaceAll(value: string, pairs: Array<[string, string]>): string {
  let out = value
  for (const [from, to] of pairs)
    out = out.split(from).join(to)
  return out
}

/** Single-quote a value the way a POSIX shell would, for `commands[]`. */
export function shellQuote(value: string): string {
  if (value !== '' && /^[A-Za-z0-9._/:=@%+,-]+$/.test(value))
    return value
  return `'${value.split('\'').join('\'\\\'\'')}'`
}

/** The exact line a person can paste into a shell. */
export function shellCommand(program: string, args: string[]): string {
  return [program, ...args].map(shellQuote).join(' ')
}

// ---------------------------------------------------------------------------
// systemd
// ---------------------------------------------------------------------------

/**
 * A word in `ExecStart=`/`ExecStop=`. systemd expands `%` specifiers and `$`
 * variables there before it splits the line, so both are pinned, and `;` — the
 * multi-command separator — is quoted rather than left bare.
 */
export function systemdExecWord(value: string): string {
  assertNoControl(value, 'ExecStart word')
  const escaped = replaceAll(value, [['\\', '\\\\'], ['"', '\\"'], ['$', '$$'], ['%', '%%']])
  return escaped !== value || /[\s"';]/.test(value) ? `"${escaped}"` : value
}

/**
 * A single-line free-text setting such as `Description=`.
 *
 * systemd reads these **verbatim** — unlike `ExecStart=`, it does not unescape
 * `\\` or `$` there — so doubling a backslash puts a backslash *into* the value.
 * Only two things need care: `%` starts a specifier, and a value that *ends* in a
 * backslash splices the following line onto this directive, because the
 * continuation rule applies to the raw line whatever the setting. A trailing
 * space is the one encoding that leaves both the value and the next directive
 * intact.
 */
export function systemdText(value: string): string {
  assertNoControl(value, 'unit setting')
  const escaped = value.split('%').join('%%')
  return escaped.endsWith('\\') ? `${escaped} ` : escaped
}

/**
 * A path setting (`WorkingDirectory=`).
 *
 * Measured against real systemd (`systemctl show -p WorkingDirectory --value`):
 * the value is taken **verbatim**, so a backslash is a backslash and must not be
 * doubled — doubling turned a directory named `a\b` into a path that does not
 * exist, and the unit failed with `status=200/CHDIR`. `%` still expands as a
 * specifier, and an unknown one (`%i` in a system unit) is fatal, so it is
 * escaped. The remaining hazard is a *trailing* backslash, which continues the
 * directive onto the next line and swallows it; a trailing space absorbs that
 * without changing the path.
 *
 * A double quote is refused rather than quoted: systemd does not unquote these
 * settings, so a quoted form is simply a path with a quote in it.
 */
export function systemdPath(value: string, what = 'path'): string {
  assertAbsolute(value, what)
  assertNoControl(value, what)
  if (value.includes('"'))
    throw new Error(`${what} must not contain a double quote: ${JSON.stringify(value)}`)
  const escaped = value.split('%').join('%%')
  return escaped.endsWith('\\') ? `${escaped} ` : escaped
}

/** `Environment=KEY=value`, quoted as one assignment when the value needs it. */
export function systemdEnvLine(key: string, value: string): string {
  assertEnvKey(key)
  assertNoControl(value, `environment value for ${key}`)
  const escaped = replaceAll(value, [['\\', '\\\\'], ['"', '\\"'], ['%', '%%']])
  return escaped !== value || /[\s"']/.test(value) ? `"${key}=${escaped}"` : `${key}=${value}`
}

// ---------------------------------------------------------------------------
// XML (launchd plist, scheduled-task XML)
// ---------------------------------------------------------------------------

export function xmlEscape(value: string): string {
  assertNoControl(value, 'xml value')
  return replaceAll(value, [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ['\'', '&apos;']])
}

export function xmlUnescape(value: string): string {
  return replaceAll(value, [['&lt;', '<'], ['&gt;', '>'], ['&quot;', '"'], ['&apos;', '\''], ['&amp;', '&']])
}

/** A marker inside an XML comment may not contain `--`. */
export function assertXmlCommentSafe(value: string): string {
  if (value.includes('--'))
    throw new Error('marker must not contain `--` when it is written inside an XML comment')
  return value
}

// ---------------------------------------------------------------------------
// freedesktop .desktop
// ---------------------------------------------------------------------------

const DESKTOP_RESERVED = /[\s"'\\><~|&;$*?#()`]/

/**
 * Escape one value for the **key-file** layer of a `.desktop` file.
 *
 * This is a separate layer from `Exec=`'s own quoting, and it runs *first*:
 * GLib reads the line with `GKeyFile`, which consumes `\n`, `\t`, `\r`, `\s`
 * and `\\` before anything else sees the value. A `\` that is not one of those
 * escapes makes `g_key_file_get_string` fail outright — "Key file contains key
 * … which has a value that cannot be interpreted" — so the whole entry becomes
 * unloadable, and `desktop-file-validate` happily accepts the file.
 *
 * That is why every backslash is doubled here: after the key-file layer the
 * value is byte-identical to what the next layer was handed. Only `\\` may
 * appear in the file — a bare `\` is always invalid.
 */
export function desktopValueEscape(value: string): string {
  assertNoControl(value, 'desktop value')
  return value.split('\\').join('\\\\')
}

/**
 * Quote one `Exec=` word for the desktop-entry parser.
 *
 * Two layers, in order: `desktopValueEscape` for the key file, then the shell
 * quoting below for `g_shell_parse_argv`, which is what actually splits the
 * value into words and unquotes each one.
 */
export function desktopWord(value: string): string {
  assertNoControl(value, 'desktop Exec word')
  const escaped = replaceAll(value, [['\\', '\\\\'], ['"', '\\"'], ['`', '\\`'], ['$', '\\$'], ['%', '%%']])
  const word = DESKTOP_RESERVED.test(value) || escaped !== value ? `"${escaped}"` : value
  return desktopValueEscape(word)
}

export function desktopExec(program: string, args: string[]): string {
  return [program, ...args].map(desktopWord).join(' ')
}

/**
 * A `Key=value` line in a `.desktop` file.
 *
 * The value is key-file escaped, because a `.desktop` line has no shell to
 * quote for: `Path=`/`Name=`/`Comment=` are read as plain strings, and a
 * backslash in any of them is a key-file escape rather than data.
 */
export function desktopValue(key: string, value: string): string {
  assertNoControl(value, `desktop ${key}`)
  if (key.includes('=') || key.includes('\n'))
    throw new Error(`desktop key ${JSON.stringify(key)} is not valid`)
  return `${key}=${desktopValueEscape(value)}`
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

/** Quote one argv word the way `CreateProcess`/`cmd` parse a command line. */
export function windowsArg(value: string): string {
  assertNoControl(value, 'windows argument')
  if (value !== '' && !/[\s"]/.test(value))
    return value

  let out = '"'
  let backslashes = 0
  for (const char of value) {
    if (char === '\\') {
      backslashes += 1
      continue
    }
    if (char === '"') {
      out += `${'\\'.repeat(backslashes * 2 + 1)}"`
      backslashes = 0
      continue
    }
    out += `${'\\'.repeat(backslashes)}${char}`
    backslashes = 0
  }
  out += `${'\\'.repeat(backslashes * 2)}"`
  return out
}

export function windowsCommandLine(program: string, args: string[]): string {
  return [program, ...args].map(windowsArg).join(' ')
}

/** A line for a `.cmd` wrapper: `%` is a batch metacharacter and is doubled. */
export function batchCommandLine(program: string, args: string[]): string {
  return batchEscape(windowsCommandLine(program, args))
}

/**
 * Make one already-quoted command line safe inside a batch file. `%` is doubled
 * last: the `^` inserted for a metacharacter must not itself gain a caret.
 */
function batchEscape(line: string): string {
  assertNoControl(line, 'batch command line')
  return replaceAll(line, [
    ['^', '^^'],
    ['&', '^&'],
    ['|', '^|'],
    ['<', '^<'],
    ['>', '^>'],
    ['(', '^('],
    [')', '^)'],
    ['%', '%%'],
  ])
}

/** A single-quoted PowerShell literal. */
export function powershellLiteral(value: string): string {
  assertNoControl(value, 'powershell value')
  return `'${value.split('\'').join('\'\'')}'`
}

/** Quote one word the way `cmd.exe` takes it, for a copy-pasteable `commands[]` entry. */
export function cmdQuote(value: string): string {
  if (value !== '' && !/[\s"&|<>^]/.test(value))
    return value
  return `"${value.split('"').join('""')}"`
}

export function windowsDisplayCommand(program: string, args: string[]): string {
  return [program, ...args].map(cmdQuote).join(' ')
}

// ---------------------------------------------------------------------------
// launchd / registry value names
// ---------------------------------------------------------------------------

export function assertRegistryValueName(name: string): string {
  if (name.trim() === '')
    throw new Error('registry value name must not be empty')
  return assertNoControl(name, 'registry value name')
}
