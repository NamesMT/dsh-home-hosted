import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  binEntryFromManifest,
  compareVersions,
  EXPECTED_RANGE,
  MIN_SUPPORTED_VERSION,
  parseVersion,
  pinnedManifestPath,
  resolveCli,
} from '../src/home-hosted/resolve.js'
import { fileURLToPath } from 'node:url'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

/** A fake installed package with a bin entry. */
function fakePackage(root: string, version = '0.7.3', bin: unknown = { 'home-hosted': 'bin/home-hosted.mjs' }): string {
  const dir = path.join(root, 'node_modules', 'home-hosted')
  const manifest = path.join(dir, 'package.json')
  writeJsonFile(manifest, { name: 'home-hosted', version, bin })
  fs.mkdirSync(path.join(dir, 'bin'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'bin', 'home-hosted.mjs'), '#!/usr/bin/env node\nconsole.log(`v${version}`)\n', 'utf8')
  return manifest
}

describe('CLI version handling', () => {
  it('reads the first version out of CLI output, prerelease included', () => {
    expect(parseVersion('home-hosted 0.6.1')).toBe('0.6.1')
    expect(parseVersion('0.5.0\n')).toBe('0.5.0')
    expect(parseVersion('1.2.3-rc.4 extra')).toBe('1.2.3-rc.4')
    expect(parseVersion('no version here')).toBeNull()
    expect(parseVersion(null)).toBeNull()
  })

  it('orders releases above their own prereleases', () => {
    expect(compareVersions('0.6.1', '0.6.1-rc.1')).toBeGreaterThan(0)
    expect(compareVersions('0.6.1-rc.1', '0.6.1')).toBeLessThan(0)
    expect(compareVersions('0.5.0', '0.6.1')).toBeLessThan(0)
    expect(compareVersions('0.6.1', '0.6.1')).toBe(0)
  })

  it('accepts both bin manifest shapes', () => {
    scratch = tempDir()
    expect(binEntryFromManifest(fakePackage(scratch.path))).toBe(path.join(scratch.path, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'))
    expect(binEntryFromManifest(fakePackage(scratch.path, '0.6.1', 'bin/home-hosted.mjs')))
      .toBe(path.join(scratch.path, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'))
    expect(binEntryFromManifest(path.join(scratch.path, 'missing', 'package.json'))).toBeNull()
  })
})

describe('CLI resolution order', () => {
  it('lets an explicit operator override win', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const override = path.join(scratch.path, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs')
    const resolution = await resolveCli({
      override,
      packageManifest: () => manifest,
      readVersion: async () => '9.9.9',
    })
    expect(resolution.status.source).toBe('config')
    expect(resolution.status.version).toBe('9.9.9')
    expect(resolution.launch?.program).toBe(process.execPath)
  })

  it('reports an override that does not exist instead of silently running another copy', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const missing = path.join(scratch.path, 'nowhere', 'home-hosted')
    const resolution = await resolveCli({
      override: missing,
      packageManifest: () => manifest,
    })
    // Never substituted: the operator asked for this exact command.
    expect(resolution.launch).toBeNull()
    expect(resolution.status.source).toBe('config')
    expect(resolution.status.path).toBe(missing)
    expect(resolution.status.supported).toBe(false)
    expect(resolution.status.detail).toContain('could not be used')
    // The alternatives are still reported, so the page can offer them.
    expect(resolution.status.dependency).toMatchObject({ source: 'dependency' })
  })

  it('prefers the plugin\'s own pinned dependency over PATH', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const resolution = await resolveCli({
      packageManifest: () => manifest,
      readVersion: async () => '0.7.1',
      findOnPath: async () => '/usr/local/bin/home-hosted',
    })
    expect(resolution.status.source).toBe('dependency')
    expect(resolution.status.path).toBe(path.join(scratch.path, 'node_modules', 'home-hosted', 'bin', 'home-hosted.mjs'))
    expect(resolution.status.supported).toBe(true)
    expect(resolution.status.detail).toContain('pinned dependency')
  })

  it('falls back to PATH, and says the copy is not the pinned one', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const resolution = await resolveCli({
      packageManifest: () => null,
      readVersion: async () => '0.7.0',
      findOnPath: async command => (command === 'home-hosted' ? manifest.replace('package.json', 'bin/home-hosted.mjs') : null),
    })
    expect(resolution.status.source).toBe('path')
    expect(resolution.status.supported).toBe(true)
    expect(resolution.status.detail).toContain('not the pinned dependency')
  })

  it('flags a CLI older than the oldest supported release', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path, '0.3.0')
    const resolution = await resolveCli({
      packageManifest: () => manifest,
      readVersion: async () => '0.3.0',
    })
    expect(resolution.status.supported).toBe(false)
    expect(resolution.status.detail).toContain('oldest supported release')
  })

  it('draws the supported floor at home-hosted 0.7.0', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const pathOf = async (command: string): Promise<string | null> =>
      command === 'home-hosted' ? manifest.replace('package.json', 'bin/home-hosted.mjs') : null

    const at = await resolveCli({ packageManifest: () => null, readVersion: async () => '0.7.0', findOnPath: pathOf })
    expect(at.status.supported).toBe(true)

    const below = await resolveCli({ packageManifest: () => null, readVersion: async () => '0.6.9', findOnPath: pathOf })
    expect(below.status.supported).toBe(false)
    expect(below.status.detail).toContain('oldest supported release (0.7.0)')
  })

  it('reports no CLI at all instead of inventing one', async () => {
    const resolution = await resolveCli({
      packageManifest: () => null,
      findOnPath: async () => null,
    })
    expect(resolution.launch).toBeNull()
    expect(resolution.status).toMatchObject({ source: 'none', path: null, supported: false })
    expect(resolution.status.detail).toContain('no home-hosted CLI found')
  })

  it('ships a dependency the plugin can resolve in this repo', () => {
    // The whole point of the pin: the plugin carries its own copy.
    expect(pinnedManifestPath()).not.toBeNull()
  })
})

describe('CLI preference', () => {
  /** Both copies exist: the plugin's own, and one on PATH. */
  async function both(prefer: 'pinned' | 'global') {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    return await resolveCli({
      prefer,
      packageManifest: () => manifest,
      readVersion: async () => '0.7.0',
      findOnPath: async command => (command === 'home-hosted' ? manifest.replace('package.json', 'bin/home-hosted.mjs') : null),
    })
  }

  it('prefers the pinned dependency by default', async () => {
    const resolution = await both('pinned')
    expect(resolution.status.source).toBe('dependency')
    expect(resolution.status.prefer).toBe('pinned')
    expect(resolution.status.dependency).toMatchObject({ source: 'dependency', version: '0.7.3' })
    expect(resolution.status.global).toMatchObject({ source: 'path', version: '0.7.0' })
  })

  it('uses the global install when that is the chosen preference', async () => {
    const resolution = await both('global')
    expect(resolution.status.source).toBe('path')
    expect(resolution.status.prefer).toBe('global')
    expect(resolution.status.detail).toBe('the global install on PATH (0.7.0)')
  })

  it('falls back to the pinned copy when the chosen global install is missing', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const resolution = await resolveCli({
      prefer: 'global',
      packageManifest: () => manifest,
      findOnPath: async () => null,
    })
    expect(resolution.status.source).toBe('dependency')
    expect(resolution.status.global).toBeNull()
  })

  it('falls back to PATH when the pinned copy is missing, whatever the preference', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const resolution = await resolveCli({
      prefer: 'pinned',
      packageManifest: () => null,
      findOnPath: async command => (command === 'home-hosted' ? manifest.replace('package.json', 'bin/home-hosted.mjs') : null),
      readVersion: async () => '0.7.0',
    })
    expect(resolution.status.source).toBe('path')
    expect(resolution.status.dependency).toBeNull()
  })
})

/**
 * `docs/PANEL.md` states that the supported range "is stated twice and both must agree:
 * `dependencies['home-hosted']` in `package.json` and `EXPECTED_RANGE` in `resolve.ts`"
 * — and that bumping one alone makes the page recommend a range the plugin is not built
 * against. That was **unenforced**: setting the manifest to `^0.7.99` while
 * `EXPECTED_RANGE` stayed `^0.7.3` failed nothing. This makes the documented rule a
 * checked one, reading the manifest as data rather than restating the string.
 */
describe('the pinned range is stated in two places and they agree', () => {
  const manifestPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json')

  it('matches the range the plugin advertises', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { dependencies?: Record<string, string> }
    expect(manifest.dependencies?.['home-hosted'], 'package.json must pin home-hosted').toBe(EXPECTED_RANGE)
  })

  it('keeps the oldest supported release inside that range', () => {
    // `MIN_SUPPORTED_VERSION` is the floor the plugin relies on, so it has to be a
    // version the range actually admits — a floor *above* the range would advertise a
    // copy the plugin then refuses.
    expect(compareVersions(MIN_SUPPORTED_VERSION, EXPECTED_RANGE.replace(/^[^0-9]*/, ''))).toBeLessThanOrEqual(0)
  })
})
