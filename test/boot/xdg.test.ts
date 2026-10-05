import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createXdgAutostartProvider, xdgDesktopEntry } from '../../src/boot/xdg.js'
import { cleanup, ctxFor, fakeRun, spec, tempHome } from './harness.js'

/**
 * `GKeyFile` reads a `.desktop` line before anything else does, and refuses a
 * backslash that is not one of `\n`, `\t`, `\r`, `\s` or `\\`. So a value the
 * generator writes must never carry a lone backslash — otherwise the entry is
 * unloadable while `desktop-file-validate` still calls it clean.
 *
 * This returns the value GLib would hand the next layer, or null when the line
 * is one `GKeyFile` refuses.
 */
function keyFileRead(line: string): string | null {
  let out = ''
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== '\\') {
      out += line[index]
      continue
    }
    const next = line[index + 1]
    const known = next === 'n' ? '\n' : next === 't' ? '\t' : next === 'r' ? '\r' : next === 's' ? ' ' : next === '\\' ? '\\' : null
    if (known === null)
      return null
    out += known
    index += 1
  }
  return out
}

describe('xdg autostart', () => {
  let home: string
  let entryPath: string
  let entrySpec: ReturnType<typeof spec>

  beforeEach(() => {
    home = tempHome()
    entryPath = path.join(home, '.config', 'autostart', 'home-hosted.desktop')
    entrySpec = spec()
  })
  afterEach(() => cleanup(home))

  it('is available but login-scoped', async () => {
    const runner = fakeRun()
    const provider = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))
    const candidate = await provider.detect()
    expect(candidate.available).toBe(true)
    expect(candidate.bootCapable).toBe(false)
    expect(candidate.privileged).toBe(true)
    expect(runner.calls).toEqual([])
  })

  it('installs the entry without running anything', async () => {
    const runner = fakeRun()
    const provider = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))
    const result = await provider.install(entrySpec)
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    expect(fs.readFileSync(entryPath, 'utf8')).toBe(xdgDesktopEntry(entrySpec))
    expect(runner.calls).toEqual([])
  })

  it('converges without rewriting and reads back as enabled', async () => {
    const runner = fakeRun()
    const provider = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))
    await provider.install(entrySpec)
    const second = await provider.install(entrySpec)
    expect(second.ok).toBe(true)
    expect(second.changed).toBe(false)
    expect((await provider.status(entrySpec)).state).toBe('enabled-running')
  })

  it('reports installed-disabled when the entry is switched off', async () => {
    fs.mkdirSync(path.dirname(entryPath), { recursive: true })
    fs.writeFileSync(entryPath, xdgDesktopEntry(entrySpec).replace('X-GNOME-Autostart-enabled=true', 'X-GNOME-Autostart-enabled=false'))
    const runner = fakeRun()
    const provider = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))
    expect((await provider.status(entrySpec)).state).toBe('installed-disabled')
  })

  it('uninstalls and tolerates an already absent entry', async () => {
    const runner = fakeRun()
    const provider = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))
    await provider.install(entrySpec)
    const removed = await provider.uninstall(entrySpec)
    expect(removed.ok).toBe(true)
    expect(removed.changed).toBe(true)
    expect(fs.existsSync(entryPath)).toBe(false)
    const again = await provider.uninstall(entrySpec)
    expect(again.ok).toBe(true)
    expect(again.changed).toBe(false)
    expect(again.detail).toMatch(/already gone/)
  })

  it('never touches another application\'s autostart entry', async () => {
    const foreignPath = path.join(home, '.config', 'autostart', '9router.desktop')
    fs.mkdirSync(path.dirname(foreignPath), { recursive: true })
    fs.writeFileSync(foreignPath, '[Desktop Entry]\nType=Application\nName=9router\n')
    const runner = fakeRun()
    const provider = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))

    await provider.install(entrySpec)
    await provider.uninstall(entrySpec)
    await provider.status(entrySpec)

    expect(fs.existsSync(foreignPath)).toBe(true)
    expect(fs.readFileSync(foreignPath, 'utf8')).toContain('9router')
    expect(runner.calls).toEqual([])
  })

  it('refuses to touch a foreign entry', async () => {
    fs.mkdirSync(path.dirname(entryPath), { recursive: true })
    fs.writeFileSync(entryPath, '[Desktop Entry]\nName=someone else\n')
    const runner = fakeRun()
    const provider = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))
    expect((await provider.install(entrySpec)).ok).toBe(false)
    expect((await provider.uninstall(entrySpec)).ok).toBe(false)
    expect(fs.existsSync(entryPath)).toBe(true)
    expect((await provider.status(entrySpec)).state).toBe('not-installed')
  })

  it('writes every line so GKeyFile can read it back', () => {
    // The bug: `Path=`/`Name=`/`Exec=` were quoted only for the shell layer. A
    // backslash in any of them is a key-file escape rather than data, so the
    // entry failed to load (`Key file contains key "Exec" which has a value that
    // cannot be interpreted`) while `desktop-file-validate` reported it as clean.
    const hostile = spec({
      args: ['/opt/a b/cli.js', 'up', '--home', 'C:\\Users\\tester\\proj', '$HOME'],
      cwd: 'C:\\Users\\tester\\proj',
      label: 'my\\panel',
    })
    const lines = xdgDesktopEntry(hostile).split('\n')
    for (const line of lines)
      expect(keyFileRead(line), `not a readable key file: ${line}`).not.toBeNull()

    // `Path=` carries no shell layer, so key-file escaping is the whole story and
    // GLib hands the next reader the path untouched.
    const path = lines.find(line => line.startsWith('Path=')) ?? ''
    expect(path).toBe('Path=C:\\\\Users\\\\tester\\\\proj')
    expect(keyFileRead(path)).toBe('Path=C:\\Users\\tester\\proj')

    // `Exec=` carries both layers, so its backslashes are doubled twice. What
    // survives is the path itself, not a path with a character eaten away.
    const exec = lines.find(line => line.startsWith('Exec=')) ?? ''
    expect(exec).toContain('"C:\\\\\\\\Users\\\\\\\\tester\\\\\\\\proj"')
    expect(keyFileRead(exec)).toContain('"C:\\\\Users\\\\tester\\\\proj"')
  })

  it('still recognises its own entry when the path it runs carries a backslash', async () => {
    // Ownership is proved by the marker on disk, so the reader has to search for
    // the same escaped form the writer produced — or a hostile marker makes the
    // plugin treat its own entry as foreign and refuse to repair it.
    const own = spec({ marker: 'managed\\by:dsh', cwd: '/home/tester', args: ['up'] })
    const file = path.join(home, '.config', 'autostart', `${own.unitName}.desktop`)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, xdgDesktopEntry(own))

    const runner = fakeRun()
    const provider = createXdgAutostartProvider(ctxFor({ home, run: runner.run }))
    expect((await provider.status(own)).state).toBe('enabled-running')
    const removed = await provider.uninstall(own)
    expect(removed.ok).toBe(true)
    expect(removed.changed).toBe(true)
    expect(fs.existsSync(file)).toBe(false)
  })
})
