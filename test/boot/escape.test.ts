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
  powershellLiteral,
  shellCommand,
  shellQuote,
  systemdEnvLine,
  systemdExecWord,
  windowsArg,
  windowsCommandLine,
  xmlEscape,
} from '../../src/boot/escape.js'

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
    expect(desktopExec('/usr/bin/node', ['$HOME'])).toBe('/usr/bin/node "\\$HOME"')
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

