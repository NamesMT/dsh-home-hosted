import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createXdgAutostartProvider, xdgDesktopEntry } from '../../src/boot/xdg.js'
import { cleanup, ctxFor, fakeRun, spec, tempHome } from './harness.js'

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
})
