import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  binEntryFromManifest,
  compareVersions,
  parseVersion,
  pinnedManifestPath,
  resolveCli,
} from '../src/home-hosted/resolve.js'
import { tempDir, writeJsonFile } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

/** A fake installed package with a bin entry. */
function fakePackage(root: string, version = '0.6.1', bin: unknown = { 'home-hosted': 'bin/home-hosted.mjs' }): string {
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

  it('prefers the plugin\'s own pinned dependency over PATH', async () => {
    scratch = tempDir()
    const manifest = fakePackage(scratch.path)
    const resolution = await resolveCli({
      packageManifest: () => manifest,
      readVersion: async () => '0.6.1',
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
      readVersion: async () => '0.5.0',
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
