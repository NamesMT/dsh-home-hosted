import { describe, expect, it } from 'vitest'
import { detectProfile } from '../src/home-hosted/dsh-entry.js'

const argv = (...rest: string[]): string[] => ['/usr/bin/node', '/opt/dsh/lib/bin.js', ...rest]

describe('profile detection', () => {
  it('reads the profile the process was actually launched with', () => {
    expect(detectProfile(argv('--profile', 'hhsample', '--no-open'), { DSH_PROFILE: 'web' })).toBe('hhsample')
    expect(detectProfile(argv('--profile=hhsample'), {})).toBe('hhsample')
  })

  it('falls back to the profile directory the launcher pointed at', () => {
    expect(detectProfile(argv('--no-open'), { DSH_PROFILE_DIR: '/home/me/.dsh/profiles/web' })).toBe('web')
  })

  it('treats the app name as the profile, as `dsh web` does', () => {
    expect(detectProfile(argv('web', '--port', '3080'), { DSH_PROFILE: 'wrong' })).toBe('web')
  })

  it('never lets an inherited DSH_PROFILE override the argv', () => {
    expect(detectProfile(argv('--profile', 'hhsample'), { DSH_PROFILE: 'web', DSH_PROFILE_DIR: '/p/web' })).toBe('hhsample')
  })

  it('defaults to web when nothing says otherwise', () => {
    expect(detectProfile(argv('--no-open'), {})).toBe('web')
  })
})
