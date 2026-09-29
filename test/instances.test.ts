import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { InstanceView } from '../src/shared/contracts.js'
import { registerInstancesNotice } from '../src/home-hosted/instances-notice.js'
import type { SystemPromptLike } from '../src/home-hosted/instances-notice.js'
import { canonicalPath, describeInstance, discoverInstances, instancesNoticeText } from '../src/home-hosted/instances.js'
import { makeHhHome } from './helpers/hh.js'
import { tempDir } from './helpers/temp.js'

interface PanelState {
  /** What `.hh/run.json` should say, when the panel was started. */
  runtime?: { pid: number, url: string, version: string, port?: number, projectDir?: string }
  /** `.hh/default/servers.config.json` entries, when the panel has a config. */
  servers?: unknown[]
}

interface Fixture {
  root: string
  managed: string
  /** Create a state root; returns its path. */
  make: (name: string, options?: PanelState) => string
}

function fixture(): Fixture {
  const scratch = tempDir()
  const root = scratch.path
  const make = (name: string, options: PanelState = {}): string => {
    const home = path.join(root, name)
    fs.mkdirSync(home, { recursive: true })
    if (options.servers !== undefined || options.runtime !== undefined) {
      makeHhHome(home, {
        workspaces: ['default'],
        ...(options.servers === undefined ? {} : { servers: { default: { meta: { writtenBy: '0.6.6' }, servers: options.servers } } }),
        ...(options.runtime === undefined ? {} : { running: options.runtime }),
      })
    }
    return home
  }
  return { root, managed: make('managed'), make }
}

const alive = (): boolean => true
const dead = (): boolean => false

describe('instance discovery', () => {
  it('always lists the managed panel first, even before its first start', () => {
    const f = fixture()
    const found = discoverInstances({ managedHome: f.managed, homeDir: f.root, listDir: () => [], alive: dead })
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({
      home: canonicalPath(f.managed),
      managed: true,
      hosting: false,
      url: null,
      running: false,
      servers: 0,
      source: 'managed',
    })
  })

  it('finds the environment root, declared roots and ~/.home-hosted siblings', () => {
    const f = fixture()
    const env = f.make('env', { servers: [] })
    const declared = f.make('declared', { servers: [] })
    const sibling = f.make('.home-hosted-staging', { servers: [] })

    const found = discoverInstances({
      managedHome: f.managed,
      envHome: env,
      extraRoots: [declared],
      homeDir: f.root,
      alive: dead,
    })

    expect(found.map(instance => [path.basename(instance.home), instance.source])).toEqual([
      ['managed', 'managed'],
      ['.home-hosted-staging', 'sibling'],
      ['declared', 'configured'],
      ['env', 'env'],
    ])
    expect(found.every(instance => instance.url === null && instance.servers === 0)).toBe(true)
    expect(sibling).toBe(path.join(f.root, '.home-hosted-staging'))
  })

  it('ignores a candidate that holds no panel state, but keeps the managed root', () => {
    const f = fixture()
    fs.mkdirSync(path.join(f.root, '.home-hosted-empty'), { recursive: true })
    const found = discoverInstances({
      managedHome: f.managed,
      extraRoots: [path.join(f.root, 'nothing-here')],
      homeDir: f.root,
      alive: dead,
    })
    expect(found.map(instance => instance.home)).toEqual([canonicalPath(f.managed)])
  })

  it('reports the facts a running panel wrote, and lists it as the host when it supervises us', () => {
    const f = fixture()
    const panel = f.make('panel', {
      servers: [{ id: 'a' }, { id: 'b' }],
      runtime: { pid: 4242, url: 'http://127.0.0.1:4444', port: 4444, version: '0.6.6', projectDir: '/srv/app' },
    })

    const running = discoverInstances({
      managedHome: panel,
      envHome: panel,
      hostingEntryId: 'dsh',
      homeDir: f.root,
      alive: () => true,
    })
    expect(running).toHaveLength(1)
    expect(running[0]).toMatchObject({
      managed: true,
      hosting: true,
      url: 'http://127.0.0.1:4444',
      port: 4444,
      pid: 4242,
      version: '0.6.6',
      running: true,
      projectDir: '/srv/app',
      servers: 2,
    })

    const stopped = discoverInstances({
      managedHome: panel,
      envHome: panel,
      hostingEntryId: 'dsh',
      homeDir: f.root,
      alive: () => false,
    })
    expect(stopped[0]).toMatchObject({ running: false, hosting: true })
  })

  it('never calls a panel the host when this process is not an entry', () => {
    const f = fixture()
    const panel = f.make('panel', { servers: [] })
    const found = discoverInstances({ managedHome: panel, envHome: panel, homeDir: f.root, listDir: () => [], alive: dead })
    expect(found[0]?.hosting).toBe(false)
  })
})

describe('instance wording', () => {
  const instance = (over: Partial<InstanceView> & { home: string }): InstanceView => ({
    managed: false,
    hosting: false,
    url: null,
    port: null,
    pid: null,
    version: null,
    running: false,
    projectDir: null,
    servers: 0,
    source: 'configured',
    ...over,
  })

  it('says nothing for a single panel', () => {
    expect(instancesNoticeText([instance({ home: '/a', managed: true })])).toBeNull()
  })

  it('names the managed panel, the others, and the rule to ask', () => {
    const text = instancesNoticeText([
      instance({ home: '/a', managed: true, url: 'http://127.0.0.1:1', running: true }),
      instance({ home: '/b', url: 'http://127.0.0.1:2' }),
      instance({ home: '/c' }),
    ]) ?? ''
    expect(text).toContain('3 panels')
    expect(text).toContain('manages only /a (http://127.0.0.1:1)')
    expect(text).toContain('/b (http://127.0.0.1:2, stopped)')
    expect(text).toContain('/c (no runtime)')
    expect(text).toContain('edits that panel\'s config file, runs the CLI against its state root')
  })

  it('names a panel for a refusal', () => {
    expect(describeInstance(instance({ home: '/a', url: 'http://127.0.0.1:1', running: true }))).toBe('/a (http://127.0.0.1:1)')
    expect(describeInstance(instance({ home: '/a', url: 'http://127.0.0.1:1' }))).toBe('/a (http://127.0.0.1:1, stopped)')
    expect(describeInstance(instance({ home: '/a' }))).toBe('/a (no runtime)')
  })
})

describe('the system-prompt notice', () => {
  interface Harness {
    contributions: Array<{ name: string, order: number, text: string | ((context: unknown) => string) }>
    registered: () => boolean
  }

  function harness(): Harness {
    const contributions: Harness['contributions'] = []
    const prompt: SystemPromptLike = {
      context: (contribution) => {
        contributions.push(contribution)
        return () => {}
      },
    }
    const scoped = {
      systemPrompt: prompt,
      effect: (body: () => unknown) => body(),
    }
    const ctx = {
      inject: (_deps: string[], callback: (value: unknown) => void) => callback(scoped),
    }
    const instances = [
      { home: '/a', managed: true } as InstanceView,
      { home: '/b', managed: false } as InstanceView,
    ]
    registerInstancesNotice(ctx as never, { instances: () => instances, enabled: () => true })
    return { contributions, registered: () => contributions.length === 1 }
  }

  it('registers one context contribution that reads the inventory per assembly', () => {
    const h = harness()
    expect(h.registered()).toBe(true)
    const contribution = h.contributions[0]!
    expect(contribution.name).toBe('dsh-home-hosted:instances')
    const text = typeof contribution.text === 'function' ? contribution.text({}) : contribution.text
    expect(text).toContain('2 panels')
  })

  it('contributes nothing when the setting is off', () => {
    const contributions: Array<{ text: string | ((context: unknown) => string) }> = []
    const scoped = {
      systemPrompt: { context: (contribution: { text: string | ((context: unknown) => string) }) => { contributions.push(contribution); return () => {} } },
      effect: (body: () => unknown) => body(),
    }
    registerInstancesNotice(
      { inject: (_deps: string[], callback: (value: unknown) => void) => callback(scoped) } as never,
      { instances: () => [{ home: '/a', managed: true } as InstanceView, { home: '/b', managed: false } as InstanceView], enabled: () => false },
    )
    const text = contributions[0]!.text
    expect(typeof text === 'function' ? text({}) : text).toBe('')
  })

  it('does nothing on a host without a system prompt service', () => {
    const scoped = { effect: () => { throw new Error('should not register') } }
    expect(() => registerInstancesNotice(
      { inject: (_deps: string[], callback: (value: unknown) => void) => callback(scoped) } as never,
      { instances: () => [], enabled: () => true },
    )).not.toThrow()
  })
})
