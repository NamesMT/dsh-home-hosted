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
  windowsArg,
  windowsCommandLine,
  xmlEscape,
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

describe('windows escaping', () => {
  it('implements the CreateProcess quoting rules', () => {
    expect(windowsArg('node.exe')).toBe('node.exe')
    expect(windowsArg('C:\\Program Files\\nodejs\\node.exe')).toBe('"C:\\Program Files\\nodejs\\node.exe"')
    expect(windowsArg('a"b')).toBe('"a\\"b"')
    expect(windowsArg('C:\\path with space\\')).toBe('"C:\\path with space\\\\"')
    expect(windowsCommandLine('node.exe', ['a b'])).toBe('node.exe "a b"')
  })

  it('doubles % inside a .cmd wrapper', () => {
    expect(batchCommandLine('node.exe', ['--pct', '50%'])).toBe('node.exe --pct 50%%')
  })

  it('neutralises & inside a .cmd wrapper', () => {
    expect(batchCommandLine('cmd.exe', ['A&B'])).toBe('cmd.exe A^&B')
  })

  it('quotes for powershell and cmd display forms', () => {
    expect(powershellLiteral('a\'b')).toBe(`'a''b'`)
    expect(cmdQuote('plain')).toBe('plain')
    expect(cmdQuote('C:\\a b')).toBe('"C:\\a b"')
  })
})

describe('systemd path settings', () => {
  it('escapes specifiers and a trailing backslash', () => {
    expect(systemdPath('/tmp/plain')).toBe('/tmp/plain')
    expect(systemdPath('/tmp/100%')).toBe('/tmp/100%%')
    expect(systemdPath('/tmp/trail\\')).toBe('/tmp/trail\\\\')
    expect(systemdPath('/tmp/my dir')).toBe('/tmp/my dir')
  })

  it('refuses what cannot be encoded', () => {
    expect(() => systemdPath('relative/path')).toThrow(/absolute/)
    expect(() => systemdPath('/tmp/a"b')).toThrow(/double quote/)
    expect(() => systemdPath('/tmp/a\nb')).toThrow(/control/)
  })
})

