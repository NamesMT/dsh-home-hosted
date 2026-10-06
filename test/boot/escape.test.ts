import { describe, expect, it } from 'vitest'
import {
  assertAbsolute,
  assertEnvKey,
  assertMarker,
  assertNoControl,
  assertUnitName,
  assertXmlCommentSafe,
  systemdPath,
  batchCommandLine,
  cmdQuote,
  desktopExec,
  desktopValue,
  desktopValueEscape,
  desktopWord,
  powershellLiteral,
  shellCommand,
  shellQuote,
  systemdEnvLine,
  systemdExecWord,
  systemdText,
  windowsArg,
  windowsCommandLine,
  windowsDisplayCommand,
  xmlEscape,
  xmlUnescape,
} from '../../src/boot/escape.js'

/**
 * The two parsers a `.desktop` value really passes through, reproduced so this
 * suite can prove the round trip without a desktop session.
 *
 * 1. `GKeyFile` — the line reader. It consumes `\n`, `\t`, `\r`, `\s` and `\\`,
 *    and *refuses the whole key* on a backslash that is none of those.
 * 2. `g_shell_parse_argv` + `g_shell_unquote` — split on unquoted whitespace,
 *    honouring `"` and `'`, then unquote each word.
 *
 * Verified against GLib 2.80 and `desktop-file-validate` on a real session.
 */
function keyFileRead(line: string): string {
  let out = ''
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!
    if (char !== '\\') {
      out += char
      continue
    }
    const next = line[index + 1]
    const known = next === 'n' ? '\n' : next === 't' ? '\t' : next === 'r' ? '\r' : next === 's' ? ' ' : next === '\\' ? '\\' : null
    if (known === null)
      throw new Error(`Key file contains a value that cannot be interpreted: ${JSON.stringify(line)}`)
    out += known
    index += 1
  }
  return out
}

function shellWords(value: string): string[] {
  const words: string[] = []
  let current = ''
  let quote: '"' | '\'' | null = null
  let started = false
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]!
    if (quote === '\'') {
      if (char === '\'') quote = null
      else current += char
      continue
    }
    if (quote === '"') {
      if (char === '"') {
        quote = null
      }
      else if (char === '\\' && ['"', '\\', '$', '`'].includes(value[index + 1] ?? '')) {
        current += value[index + 1]
        index += 1
      }
      else {
        current += char
      }
      continue
    }
    if (char === '"' || char === '\'') {
      quote = char
      started = true
      continue
    }
    if (/\s/.test(char)) {
      if (started || current.length > 0) words.push(current)
      current = ''
      started = false
      continue
    }
    current += char
    started = true
  }
  words.push(current)
  return words
}

/** One `.desktop` value, read exactly as the desktop session reads it. */
function roundTrip(encoded: string): string[] {
  return shellWords(keyFileRead(encoded))
}

/**
 * `Exec=` field codes, expanded the way GLib expands them at launch: `%%` is a
 * literal percent and every other `%<char>` is a field code that disappears when
 * no files were passed. `desktopWord` doubles `%` for this reason, so the value
 * an argv carries is the one that was written.
 */
function expandFieldCodes(words: string[]): string[] {
  return words.map((word) => {
    let out = ''
    for (let index = 0; index < word.length; index += 1) {
      if (word[index] !== '%') {
        out += word[index]
        continue
      }
      const next = word[index + 1]
      if (next === '%') {
        out += '%'
        index += 1
      }
      else if (next === undefined) {
        out += '%'
      }
      else {
        index += 1
      }
    }
    return out
  })
}

describe('validation', () => {
  it('accepts ordinary unit names and rejects anything else', () => {
    for (const name of ['home-hosted', 'a', 'dev.home-hosted_x@1'])
      expect(assertUnitName(name)).toBe(name)
    for (const name of ['', 'a b', 'a/b', 'a:b', 'a\nb', 'a;rm -rf'])
      expect(() => assertUnitName(name)).toThrow(/unit name/)
  })

  it('rejects control characters and newlines everywhere', () => {
    expect(() => assertNoControl('a\nb', 'value')).toThrow(/control characters/)
    expect(() => assertNoControl('a\u0000b', 'value')).toThrow(/control characters/)
    expect(() => assertNoControl('a\u007fb', 'value')).toThrow(/control characters/)
    expect(assertNoControl('plain', 'value')).toBe('plain')
  })

  /**
   * The rule's *width*, pinned. A wider rule would look safer and would refuse
   * legitimate values for no gain, so the boundary is asserted rather than left to the
   * next reader's instinct. Each rejection below was checked against a real parser:
   * `systemd-analyze verify` 261, real `cmd.exe`, and Python's XML parser all treat
   * `U+0085`/`U+2028`/`U+2029` as ordinary characters and split on a genuine `LF` only.
   */
  it('catches the separators that matter and allows the ones that do not', () => {
    // Caught: every C0 control plus DEL, which is what actually breaks a field.
    for (const ch of ['\u0000', '\n', '\r', '\t', '\u000B', '\u000C', '\u001B', '\u007F'])
      expect(() => assertNoControl(`a${ch}b`, 'value'), `${JSON.stringify(ch)} should be refused`).toThrow(/control characters/)

    // Allowed: separators a parser does *not* split on. Refusing these would reject
    // legitimate labels and paths for nothing.
    for (const ch of ['\u0085', '\u2028', '\u2029', '\u200B', '\uFEFF'])
      expect(assertNoControl(`a${ch}b`, 'value'), `${JSON.stringify(ch)} should be allowed`).toBe(`a${ch}b`)

    // And the characters that *are* significant to `cmd.exe` are not this guard's job:
    // they are escaped, not refused, so a legitimate `100%` or `a&b` survives.
    for (const ch of ['%', '&', '|', '^', '"', "'", '\\'])
      expect(assertNoControl(`a${ch}b`, 'value')).toBe(`a${ch}b`)
  })

  it('rejects an empty marker and a marker that would break an XML comment', () => {
    expect(() => assertMarker('   ')).toThrow(/empty/)
    expect(assertMarker('managed-by:dsh')).toBe('managed-by:dsh')
    expect(() => assertXmlCommentSafe('a--b')).toThrow(/--/)
  })

  it('rejects env keys that are not valid names', () => {
    expect(assertEnvKey('PATH')).toBe('PATH')
    expect(() => assertEnvKey('1PATH')).toThrow(/environment key/)
    expect(() => assertEnvKey('A-B')).toThrow(/environment key/)
  })

  it('accepts posix and windows absolute paths, rejects relative ones', () => {
    expect(assertAbsolute('/usr/bin/node', 'command')).toBe('/usr/bin/node')
    expect(assertAbsolute('C:\\Program Files\\nodejs\\node.exe', 'command')).toBe('C:\\Program Files\\nodejs\\node.exe')
    expect(() => assertAbsolute('node', 'command')).toThrow(/absolute/)
    expect(() => assertAbsolute('./node', 'command')).toThrow(/absolute/)
  })
})

describe('shell display', () => {
  it('leaves safe words alone and quotes the rest', () => {
    expect(shellQuote('/usr/bin/node')).toBe('/usr/bin/node')
    expect(shellQuote('up --foreground')).toBe(`'up --foreground'`)
    expect(shellQuote('a\'b')).toBe(`'a'\\''b'`)
  })

  it('renders a copy-pasteable command', () => {
    expect(shellCommand('sudo', ['systemctl', 'enable', '--now', 'home-hosted.service']))
      .toBe('sudo systemctl enable --now home-hosted.service')
    expect(shellCommand('sudo', ['install', '-m', '0644', '/tmp/a b.service', '/etc/systemd/system/x.service']))
      .toBe(`sudo install -m 0644 '/tmp/a b.service' /etc/systemd/system/x.service`)
  })
})

describe('systemd escaping', () => {
  it('pins $ and % and quotes when needed', () => {
    expect(systemdExecWord('/usr/bin/node')).toBe('/usr/bin/node')
    expect(systemdExecWord('a b')).toBe('"a b"')
    expect(systemdExecWord('$HOME')).toBe('"$$HOME"')
    expect(systemdExecWord('%i')).toBe('"%%i"')
    expect(systemdExecWord('say "hi"')).toBe('"say \\"hi\\""')
  })

  it('quotes a semicolon so it cannot separate systemd commands', () => {
    expect(systemdExecWord('a;b')).toBe('"a;b"')
  })

  it('writes Environment= as one assignment when the value needs quoting', () => {
    expect(systemdEnvLine('PATH', '/usr/bin:/bin')).toBe('PATH=/usr/bin:/bin')
    expect(systemdEnvLine('HOME', '/home/my user')).toBe('"HOME=/home/my user"')
    expect(systemdEnvLine('HHOSTED_HOME', '100%')).toBe('"HHOSTED_HOME=100%%"')
  })
})

describe('xml escaping', () => {
  it('escapes the five xml characters', () => {
    expect(xmlEscape(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f')
  })

  /**
   * The launchd plist and the scheduled-task XML are read by an XML parser, so what
   * matters is that a value comes back out of it — not that one example looks right.
   *
   * `&` is the trap: it must be escaped first (or `&amp;` becomes `&amp;amp;`) and
   * unescaped **last** (or `&amp;lt;` collapses to `<`). A literal `&amp;` in the
   * value is exactly the input that catches both orderings being wrong.
   */
  it('round-trips every value through escape and unescape, ampersands included', () => {
    const values = [
      'plain',
      'a&b',
      'a<b',
      'a>b',
      'a"b',
      'a\'b',
      'a&b<c>d"e\'f',
      '&',
      '<',
      '>',
      '"',
      '\'',
      '&amp;',
      '&lt;',
      '&amp;amp;',
      '&#38;',
      'a&ampb',
      '&amp',
      'amp;',
      'x &lt; y',
      'C:\\a & b\\',
      '100% & more',
      '日本 & 語',
    ]
    for (const value of values)
      expect(xmlUnescape(xmlEscape(value)), `round trip failed for ${JSON.stringify(value)}`).toBe(value)
  })

  it('escapes the ampersand of an already-escaped value, so nothing is double-decoded', () => {
    // A literal `&amp;` must survive as text, which is why `&` is escaped first.
    expect(xmlEscape('&amp;')).toBe('&amp;amp;')
    expect(xmlUnescape('&amp;amp;')).toBe('&amp;')
    // And unescaping last is what stops `&amp;lt;` collapsing to `<`.
    expect(xmlUnescape('&amp;lt;')).toBe('&lt;')
  })
})

describe('desktop escaping', () => {
  it('quotes reserved characters and escapes $ and %', () => {
    expect(desktopExec('/usr/bin/node', ['up'])).toBe('/usr/bin/node up')
    expect(desktopExec('/usr/bin/node', ['--home', '/home/my user'])).toBe('/usr/bin/node --home "/home/my user"')
    expect(desktopExec('/usr/bin/node', ['$HOME'])).toBe('/usr/bin/node "\\\\$HOME"')
  })

  it('escapes for the key file as well as for Exec, so GLib can read the line', () => {
    // The bug: a `.desktop` value goes through *two* parsers. GKeyFile reads the
    // line first and consumes `\\`; a lone `\` is not one of its escapes, so
    // `g_key_file_get_string` fails, the whole entry is unloadable, and
    // `desktop-file-validate` still reports the file as clean.
    expect(() => keyFileRead(desktopWord('/home/a\\b'))).not.toThrow()
    expect(desktopValueEscape('/home/a\\b')).toBe('/home/a\\\\b')
    expect(desktopValue('Path', 'C:\\Users\\tester')).toBe('Path=C:\\\\Users\\\\tester')
  })

  it('round-trips every word through both parsers, byte for byte', () => {
    const values = [
      'plain',
      '/opt/a b/cli.js',
      '/home/my user/.home-hosted',
      '100%',
      '$HOME',
      'a"b',
      'a\'b',
      'a;b',
      'a\\b',
      'a\\\\b',
      'a`b',
      'a&b',
      'a|b',
      'a<b>c',
      'a#b',
      'trail\\',
      'C:\\Users\\a\\b',
      '\\\\server\\share\\x',
      '日本語',
    ]
    for (const value of values)
      expect(expandFieldCodes(roundTrip(desktopWord(value)))).toEqual([value])
  })

  it('round-trips a whole Exec line, program included', () => {
    const values = ['/opt/a b/cli.js', 'up', '--home', '/home/my$proj', '100%', 'C:\\Users\\a']
    const words = expandFieldCodes(roundTrip(desktopExec('/usr/bin/node', values)))
    expect(words).toEqual(['/usr/bin/node', ...values])
  })
})

/**
 * The real `CreateProcess` argv splitter, so `windowsArg` can be checked as a round
 * trip rather than against a handful of expected strings.
 *
 * These are the CRT rules, and the whole point is the one case an eyeball cannot
 * check: backslashes are only special **immediately before a double quote**, where
 * they pair up (`n/2` literal backslashes) and an odd one escapes the quote. A
 * trailing backslash before a closing quote is the classic argv-mangling case.
 *
 * The implementation below was validated against real Windows: 37 nasty values were
 * written by `windowsCommandLine` onto a genuine command line via
 * `ProcessStartInfo.Arguments` and the child dumped its own `argv` — every one
 * survived byte-exactly (`ünïcode 日本語` included; an earlier mismatch was the
 * harness reading the file as Latin-1, not the escaping).
 */
function createProcessArgv(commandLine: string): string[] {
  const argv: string[] = []
  let index = 0
  while (index < commandLine.length) {
    while (index < commandLine.length && (commandLine[index] === ' ' || commandLine[index] === '\t'))
      index += 1
    if (index >= commandLine.length)
      break

    let word = ''
    let quoted = false
    while (index < commandLine.length) {
      const char = commandLine[index]!
      if (!quoted && (char === ' ' || char === '\t'))
        break
      if (char === '\\') {
        let backslashes = 0
        while (commandLine[index] === '\\') {
          backslashes += 1
          index += 1
        }
        if (commandLine[index] === '"') {
          word += '\\'.repeat(Math.floor(backslashes / 2))
          if (backslashes % 2 === 1)
            word += '"'
          else
            quoted = !quoted
          index += 1
          continue
        }
        word += '\\'.repeat(backslashes)
        continue
      }
      if (char === '"') {
        quoted = !quoted
        index += 1
        continue
      }
      word += char
      index += 1
    }
    argv.push(word)
  }
  return argv
}

describe('windows escaping', () => {
  it('implements the CreateProcess quoting rules', () => {
    expect(windowsArg('node.exe')).toBe('node.exe')
    expect(windowsArg('C:\\Program Files\\nodejs\\node.exe')).toBe('"C:\\Program Files\\nodejs\\node.exe"')
    expect(windowsArg('a"b')).toBe('"a\\"b"')
    expect(windowsArg('C:\\path with space\\')).toBe('"C:\\path with space\\\\"')
    expect(windowsCommandLine('node.exe', ['a b'])).toBe('node.exe "a b"')
  })

  /**
   * The round trip is the assertion that matters: an example list can only pin the
   * strings someone thought of, and a wrong quote on Windows breaks boot autostart
   * for one user in a way nobody can debug from a `toBe`.
   */
  it('round-trips every nasty value through the real CreateProcess rules', () => {
    const values = [
      'plain',
      'a b',
      'a"b',
      'a\\b',
      'a\\\\b',
      'trail\\',
      'trail\\\\',
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\path with space\\',
      // The classic mangling case: a backslash run immediately before a quote.
      'a\\"b',
      'a\\\\"b',
      'x\\"y',
      'x\\\\"y',
      '"leading',
      'trailing"',
      '""',
      'a b c',
      '%PATH%',
      '100%',
      'a&b',
      'a|b',
      'a^b',
      'a<b>c',
      'a(b)',
      'a;b',
      'a#b',
      'a=b',
      '$HOME',
      'a`b',
      "a'b",
      '~x',
      'C:\\a b\\',
      '\\\\server\\share\\x',
      'end with space ',
      'ünïcode 日本語',
    ]
    for (const value of values) {
      const argv = createProcessArgv(windowsCommandLine('node.exe', [value]))
      expect(argv, `round trip failed for ${JSON.stringify(value)}`).toEqual(['node.exe', value])
    }
    // An empty argument is its own case: it must produce a word, not vanish.
    expect(createProcessArgv(windowsCommandLine('node.exe', ['', 'x']))).toEqual(['node.exe', '', 'x'])
  })

  it('doubles % inside a .cmd wrapper', () => {
    expect(batchCommandLine('node.exe', ['--pct', '50%'])).toBe('node.exe --pct 50%%')
  })

  it('neutralises & inside a .cmd wrapper', () => {
    expect(batchCommandLine('cmd.exe', ['A&B'])).toBe('cmd.exe A^&B')
  })

  /**
   * A `.cmd` wrapper is read by `cmd.exe` before the program is even reached, so its
   * metacharacters are a *second* escaping layer. `%` is doubled last so the `^`
   * inserted for `&` does not itself gain a caret.
   */
  it('keeps a .cmd wrapper\'s metacharacters inert without double-escaping', () => {
    const value = String.raw`a&b|c<d>e^f(g)%g`
    const escaped = batchCommandLine('node.exe', [value])
    // Decode the way `cmd.exe` does: a caret escapes the next character, `%%` is one
    // percent. Stripping carets outright would be wrong — `^^` is a literal caret.
    let decoded = ''
    for (let index = 0; index < escaped.length; index += 1) {
      if (escaped[index] === '^') {
        decoded += escaped[index + 1]
        index += 1
        continue
      }
      if (escaped[index] === '%' && escaped[index + 1] === '%') {
        decoded += '%'
        index += 1
        continue
      }
      decoded += escaped[index]
    }
    expect(decoded).toBe(windowsCommandLine('node.exe', [value]))
    // A doubled percent never gains a caret, which would need a second pass.
    expect(escaped).not.toContain('^%')
  })

  it('quotes for powershell and cmd display forms', () => {
    expect(powershellLiteral('a\'b')).toBe(`'a''b'`)
    expect(cmdQuote('plain')).toBe('plain')
    expect(cmdQuote('C:\\a b')).toBe('"C:\\a b"')
  })

  /**
   * The display form exists to be **pasted into a shell**, so the test that matters is
   * what real `cmd.exe` does with the line.
   *
   * `cmd.exe` reads the line for its own metacharacters and then hands the tail to the
   * CRT, so *inside* the quotes the rules are the CRT's: a backslash run pairs up
   * before a `"`, and an odd one escapes it.
   *
   * Doubling the quotes (`""`) instead — which is what this used to do — cannot
   * express a backslash before a quote at all. Measured by feeding the exact emitted
   * line to `cmd.exe /c` on real Windows and reading the child's own argv:
   *
   *   `"x\"y"`    -> `x"y`     (backslash silently lost — the bug)
   *   `"x\\\"y"` -> `x\"y`    (correct)
   *   `"C:\a b\"` -> `C:\a b"`  (last character lost)
   *   `"C:\a b\\"` -> `C:\a b\` (correct)
   *
   * Reachable: a boot spec whose last argument ends in a backslash (a directory) puts
   * exactly that shape in `payload.data`, which the registry `add` line quotes.
   */
  it('escapes quotes and backslashes the way cmd.exe reads them back', () => {
    expect(cmdQuote('C:\\a b\\')).toBe('"C:\\a b\\\\"')
    expect(cmdQuote('C:\\a b')).toBe('"C:\\a b"')
    // A run of any length, not just one.
    expect(cmdQuote('a b\\\\\\')).toBe('"a b\\\\\\\\\\\\"')
    // Unquoted values keep their backslashes untouched — cmd does not reinterpret them.
    expect(cmdQuote('trail\\\\')).toBe('trail\\\\')
    // A quote is CRT-escaped, and the backslash before it is doubled, not dropped.
    expect(cmdQuote('a"b\\')).toBe('"a\\"b\\\\"')
    expect(cmdQuote('a"b')).toBe('"a\\"b"')
    // The case the `""` form got wrong.
    expect(cmdQuote('x\\"y')).toBe('"x\\\\\\"y"')
    // A metacharacter is still wrapped, so cmd does not read it as syntax.
    expect(cmdQuote('a&b')).toBe('"a&b"')
    expect(cmdQuote('a|b')).toBe('"a|b"')
    expect(cmdQuote('a<b>c')).toBe('"a<b>c"')
    expect(cmdQuote('a^b')).toBe('"a^b"')
  })

  /**
   * The reader `cmd.exe` actually uses for the display form, so the round trip is
   * provable without Windows.
   *
   * `cmd.exe` wraps the word (which makes `&`/`|`/`<`/`>`/`^` inert and keeps a space
   * inside it) and then hands the tail to the CRT, so **inside** the quotes the rules
   * are the CRT's: a backslash run pairs up before a `"`, and an odd one escapes it.
   * That is `createProcessArgv`'s algorithm — the same one `windowsArg` targets — and
   * it is why an earlier oracle here was wrong: `""` doubling cannot represent a
   * backslash before a quote, and real `cmd.exe` showed `x\"y` arriving as `x"y`.
   *
   * Validated against real Windows, feeding the exact emitted line to `cmd.exe /c` and
   * reading the child's own argv: backslash runs of 1-5 before a quote each round-trip
   * under these rules, as do the plain-quote and trailing-backslash cases.
   */
  it('round-trips the display form through cmd.exe\'s own reading', () => {
    const values = [
      'plain',
      'a b',
      'a"b',
      'C:\\a b\\',
      'C:\\Users\\me\\proj\\',
      'trail\\\\',
      'a b\\\\\\',
      '100%',
      'a&b',
      'a|b',
      'a<b>c',
      'a^b',
      'x\\"y',
      'a\\\\"b',
      'C:\\Program Files\\nodejs\\node.exe',
      'end ',
    ]
    for (const value of values) {
      const words = createProcessArgv(windowsDisplayCommand('prog.exe', [value]))
      expect(words, `display round trip failed for ${JSON.stringify(value)}`).toEqual(['prog.exe', value])
    }
    // An empty argument must survive as an empty word, not vanish.
    expect(createProcessArgv(windowsDisplayCommand('prog.exe', ['', 'x']))).toEqual(['prog.exe', '', 'x'])
  })

  /**
   * A PowerShell literal is single-quoted with `''` for an embedded quote. The
   * `-Command` form then hands it to the parser, so the round trip is what proves a
   * path or argument cannot end the literal.
   */
  it('round-trips a powershell literal, quotes and all', () => {
    const values = ['plain', 'a b', "a'b", "a''b", "trail'", 'C:\\a b\\', '$HOME', 'a`b', '100%', '日本語']
    for (const value of values) {
      const literal = powershellLiteral(value)
      expect(literal.startsWith('\'') && literal.endsWith('\''), `not single-quoted: ${literal}`).toBe(true)
      // Undo the one escape rule: `''` inside is a literal quote.
      expect(literal.slice(1, -1).split('\'\'').join('\''), `round trip failed for ${JSON.stringify(value)}`).toBe(value)
    }
  })
})

/**
 * systemd's real reading of a single-line setting, reproduced so the round trip
 * is provable without a running systemd.
 *
 * `WorkingDirectory=`/`Description=` are taken **verbatim** — `systemctl show -p
 * WorkingDirectory --value` returned the bytes that were written, for every
 * backslash count, which is what makes doubling one a bug. Two rules apply:
 *
 * 1. `%<char>` is a specifier and expands (`%%` is a literal percent);
 * 2. a value ending *after* an odd run of backslashes continues onto the next
 *    line, which is spliced in in place of the newline.
 */
function systemdReadSetting(value: string, nextLine = 'NEXT'): string {
  // Continuation is decided on the raw line: a final backslash escapes the newline.
  let text = value
  if (/(?:^|[^\\])(?:\\\\)*\\$/.test(text))
    text = `${text.slice(0, -1)}${nextLine}`
  // systemd strips surrounding whitespace from a setting before expanding it,
  // which is what lets a trailing space absorb a trailing backslash harmlessly.
  text = text.trim()

  let out = ''
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '%') {
      out += text[index]
      continue
    }
    const next = text[index + 1]
    if (next === undefined) {
      out += '%'
      continue
    }
    if (next === '%') {
      out += '%'
      index += 1
      continue
    }
    // A field code expands to nothing here (no specifier arguments supplied).
    index += 1
  }
  return out
}

describe('systemd path settings', () => {
  it('leaves a backslash alone, because systemd does not unescape these settings', () => {
    // The bug: `WorkingDirectory=` was written with every `\` doubled. systemd
    // takes the value verbatim, so a directory named `a\b` was addressed as
    // `a\\b` and the unit died with `status=200/CHDIR`.
    expect(systemdPath('/tmp/a\\b')).toBe('/tmp/a\\b')
    expect(systemdPath('/tmp/C:\\Users\\a')).toBe('/tmp/C:\\Users\\a')
    expect(systemdPath('/tmp/a\\tb')).toBe('/tmp/a\\tb')
  })

  it('escapes specifiers, and nothing else', () => {
    expect(systemdPath('/tmp/plain')).toBe('/tmp/plain')
    expect(systemdPath('/tmp/100%')).toBe('/tmp/100%%')
    expect(systemdPath('/tmp/%i')).toBe('/tmp/%%i')
    expect(systemdPath('/tmp/my dir')).toBe('/tmp/my dir')
  })

  it('keeps a trailing backslash from splicing the next directive away', () => {
    // A trailing `\` continues the line, so `KillMode=` was swallowed into the
    // path. A trailing space absorbs it and the path is unchanged.
    expect(systemdPath('/tmp/trail\\')).toBe('/tmp/trail\\ ')
    expect(systemdPath('/tmp/trail\\')).not.toMatch(/\\$/)
    for (const value of ['/tmp/trail\\', '/tmp/trail\\\\', '/tmp/x\\y\\'])
      expect(systemdReadSetting(systemdPath(value), 'KillMode=process')).toBe(value)
  })

  it('round-trips every path through systemd\'s own reading', () => {
    const paths = [
      '/tmp/plain',
      '/tmp/my dir',
      '/tmp/100%',
      '/tmp/%i',
      '/tmp/a\\b',
      '/tmp/a\\tb',
      '/tmp/a\\sb',
      '/tmp/a\\nb',
      '/tmp/trail\\',
      '/tmp/trail\\\\',
      '/tmp/x\\y\\',
      '/tmp/C:\\Users\\a',
    ]
    for (const path of paths)
      expect(systemdReadSetting(systemdPath(path), 'KillMode=process')).toBe(path)
  })

  it('refuses what cannot be encoded', () => {
    expect(() => systemdPath('relative/path')).toThrow(/absolute/)
    expect(() => systemdPath('/tmp/a"b')).toThrow(/double quote/)
    expect(() => systemdPath('/tmp/a\nb')).toThrow(/control/)
  })
})

describe('systemd free-text settings', () => {
  it('keeps a backslash and escapes only the specifier', () => {
    // `Description=` is read verbatim too, so doubling a backslash put one into
    // the label; a trailing backslash spliced the next directive onto it.
    expect(systemdText('home-hosted panel')).toBe('home-hosted panel')
    expect(systemdText('100%')).toBe('100%%')
    expect(systemdText('a\\b')).toBe('a\\b')
    expect(systemdText('trail\\')).toBe('trail\\ ')
  })

  it('never lets a directive be swallowed', () => {
    for (const label of ['home-hosted panel', '100%', 'a\\b', 'trail\\', 'x\\y\\'])
      expect(systemdReadSetting(systemdText(label), 'KillMode=process')).toBe(label)
  })
})

