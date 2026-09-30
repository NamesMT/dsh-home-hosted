import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { CliLaunch } from '../src/home-hosted/launch.js'
import { buildHomeHostedBootSpec, homeHostedEnv } from '../src/home-hosted/launch.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

const launch: CliLaunch = { program: '/usr/bin/node', args: ['/srv/hh/bin/home-hosted.mjs'], cliEntry: '/srv/hh/bin/home-hosted.mjs', shimPath: null, source: 'entry' }

/**
 * The environment an entry is written with must come from the environment the
 * account was resolved from — reading `process.env` here is how the `User=` line
 * and the `HOME=` line came to describe two different people.
 */
describe('the environment a boot entry is written with', () => {
  it('reads PATH and HOME from the injected environment, not this process', () => {
    const env = homeHostedEnv(
      { home: '/srv/hh', env: { PATH: '/opt/injected/bin', HOME: '/home/injected' } },
      launch,
    )

    expect(env.HOME).toBe('/home/injected')
    expect((env.PATH ?? '').split(path.delimiter)).toContain('/opt/injected/bin')
    // The installer's own PATH must not leak into an entry built for another account.
    expect(env.PATH ?? '').not.toContain('/srv/hh/definitely-not-a-real-dir')
  })

  it('carries the injected project dir and home into the spec it builds', () => {
    scratch = tempDir()
    const spec = buildHomeHostedBootSpec(
      { home: scratch.path, projectDir: '/srv/project', env: { PATH: '/opt/injected/bin', HOME: '/home/injected' } },
      launch,
      { stateDir: scratch.path },
    )

    expect(spec.env.HOME).toBe('/home/injected')
    expect(spec.env.HHOSTED_HOME).toBe(scratch.path)
    expect(spec.env.HHOSTED_PROJECT).toBe('/srv/project')
    expect((spec.env.PATH ?? '').split(path.delimiter)).toContain('/opt/injected/bin')
  })

  it('still omits HOME when an account was resolved but its home is not knowable', () => {
    const env = homeHostedEnv(
      { home: '/srv/hh', accountHome: null, env: { PATH: '/opt/injected/bin', HOME: '/home/injected' } },
      launch,
    )
    expect('HOME' in env).toBe(false)
  })
})
