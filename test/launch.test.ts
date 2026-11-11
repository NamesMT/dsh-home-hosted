import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { CliLaunch } from '../src/home-hosted/launch.js'
import { buildHomeHostedBootSpec, homeHostedEnv, isWindowsSystemPath, parseVersion, resolveShimmedCli, which, whichAll } from '../src/home-hosted/launch.js'
import { cmdShimArgv, launchArgv } from '../src/home-hosted/node-interpreter.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
})

const launch: CliLaunch = { program: '/usr/bin/node', args: ['/srv/hh/bin/home-hosted.mjs'], cliEntry: '/srv/hh/bin/home-hosted.mjs', shimPath: null, source: 'entry' }

/**
 * `where.exe` answers with **one line per hit**, and taking the first line is how the Windows help
 * viewer became the CLI. Driven against the real `which` on this host, so the split is the thing
 * under test rather than a copy of it.
 */
describe('which reports every hit, in the order the OS lists them', () => {
  /**
   * `where.exe` output, through the seam rather than the machine.
   *
   * On a WSL host `where.exe` really is reachable through interop, so a test that let the real
   * probe run would be asserting Windows against a machine that is not Windows — and would pass
   * on a developer box while proving nothing.
   */
  it('returns every line where.exe printed, in order', async () => {
    const asked: Array<{ program: string, args: string[] }> = []
    const hits = await whichAll('hh', {
      platform: 'win32',
      exec: async (program, args) => {
        asked.push({ program, args })
        // The real answer on Windows 11 for `where hh`: the OS's help viewer, plus a real shim.
        return { code: 0, stdout: 'C:\\Windows\\hh.exe\r\nC:\\Users\\mt\\AppData\\Roaming\\npm\\hh.cmd\r\n' }
      },
    })
    expect(asked).toEqual([{ program: 'where.exe', args: ['hh'] }])
    // Both, in the order the OS gave them: dropping any line here is the reported defect.
    expect(hits).toEqual(['C:\\Windows\\hh.exe', 'C:\\Users\\mt\\AppData\\Roaming\\npm\\hh.cmd'])
    expect(await which('hh', {
      platform: 'win32',
      exec: async () => ({ code: 0, stdout: 'C:\\Windows\\hh.exe\r\nC:\\Users\\mt\\AppData\\Roaming\\npm\\hh.cmd\r\n' }),
    })).toBe('C:\\Windows\\hh.exe')
  })

  it('answers nothing on win32 when where.exe finds no file', async () => {
    // Measured: `where` exits 1 and writes "INFO: Could not find files…" to stderr.
    expect(await whichAll('home-hosted', {
      platform: 'win32',
      exec: async () => ({ code: 1, stdout: '' }),
    })).toEqual([])
  })

  it('returns them all on POSIX too, and `which` still returns the first', async () => {
    scratch = tempDir()
    const dirs = ['first', 'second'].map((name) => {
      const dir = path.join(scratch!.path, name)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'hh-twice'), '#!/bin/sh\n', 'utf8')
      fs.chmodSync(path.join(dir, 'hh-twice'), 0o755)
      return dir
    })
    const previous = process.env.PATH
    process.env.PATH = [...dirs, previous ?? ''].join(path.delimiter)
    try {
      const all = await whichAll('hh-twice', { platform: 'linux' })
      // Both, first-listed first: the loop in `resolveCli` depends on this order.
      expect(all).toEqual(dirs.map(dir => path.join(dir, 'hh-twice')))
      expect(await which('hh-twice', { platform: 'linux' })).toBe(path.join(dirs[0]!, 'hh-twice'))
    }
    finally {
      process.env.PATH = previous
    }
  })

  it('falls back to plain `which` when the host has no -a, rather than reporting nothing', async () => {
    // GNU which 2.25 without the flag: exit 1, nothing on stdout.
    const asked: string[][] = []
    const hits = await whichAll('home-hosted', {
      platform: 'linux',
      exec: async (_program, args) => {
        asked.push(args)
        return args[0] === '-a' ? { code: 1, stdout: '' } : { code: 0, stdout: '/usr/local/bin/home-hosted\n' }
      },
    })
    expect(asked).toEqual([['-a', 'home-hosted'], ['home-hosted']])
    expect(hits).toEqual(['/usr/local/bin/home-hosted'])
  })

  it('answers nothing rather than throwing for a command that is not there', async () => {
    expect(await whichAll('dsh-home-hosted-definitely-absent', { platform: 'linux' })).toEqual([])
    expect(await which('dsh-home-hosted-definitely-absent', { platform: 'linux' })).toBeNull()
  })
})

/**
 * The Windows rule that stops the OS's own binaries being mistaken for an install.
 *
 * Measured on Windows 11: `cmd.exe /c "where hh"` prints `C:\Windows\hh.exe` and exits 0, because
 * `hh` is a legitimate alias of the home-hosted CLI — but `C:\Windows\hh.exe` is the Microsoft HTML
 * Help viewer. A package manager never installs into the system directory, so a hit there is not a
 * candidate at all, and probing it can flash its help window.
 */
describe('the Windows system directory is never a candidate', () => {
  it('matches the default %SystemRoot%', () => {
    expect(isWindowsSystemPath('C:\\Windows\\hh.exe', { platform: 'win32', env: {} })).toBe(true)
    expect(isWindowsSystemPath('C:\\Windows\\System32\\cmd.exe', { platform: 'win32', env: {} })).toBe(true)
  })

  it('matches whatever SystemRoot or WINDIR names, and case-insensitively', () => {
    const env = { SystemRoot: 'D:\\WinNT' }
    expect(isWindowsSystemPath('d:\\winnt\\hh.exe', { platform: 'win32', env })).toBe(true)
    expect(isWindowsSystemPath('D:\\WinNT\\System32\\x.exe', { platform: 'win32', env })).toBe(true)
    expect(isWindowsSystemPath('C:\\Windows\\hh.exe', { platform: 'win32', env })).toBe(false)
  })

  it('does not match a path that merely starts with the same letters', () => {
    // `C:\WindowsApps` is a different directory, and prefix matching would swallow it.
    expect(isWindowsSystemPath('C:\\WindowsApps\\hh.exe', { platform: 'win32', env: {} })).toBe(false)
    expect(isWindowsSystemPath('C:\\Windows.old\\hh.exe', { platform: 'win32', env: {} })).toBe(false)
  })

  it('leaves a real install alone, and does nothing on another platform', () => {
    expect(isWindowsSystemPath('C:\\Users\\mt\\AppData\\Roaming\\npm\\hh.cmd', { platform: 'win32', env: {} })).toBe(false)
    // A POSIX path is not judged by the Windows rule.
    expect(isWindowsSystemPath('/usr/local/bin/home-hosted', { platform: 'linux', env: {} })).toBe(false)
    expect(isWindowsSystemPath('C:\\Windows\\hh.exe', { platform: 'linux', env: {} })).toBe(false)
  })
})

/**
 * A Windows `.cmd`/`.bat` is not an executable image, so `spawn` without a shell fails `EINVAL`
 * (measured with node 24 on Windows 11). A legitimate global install there must still identify.
 *
 * The version probe is a *launch*, so it no longer owns a copy of this rule: it goes through
 * `launchArgv` like the boot entry and the panel's own start do, which is what makes an override
 * resolvable under Desktop (where the probe's program would otherwise be the Electron binary).
 * These cases assert the rule at its one home, `cmdShimArgv`, so a second implementation cannot
 * drift from it.
 */
describe('probing a Windows shim', () => {
  const cmdShim: CliLaunch = { program: 'C:\\Users\\mt\\AppData\\Roaming\\npm\\hh.cmd', args: [], cliEntry: null, shimPath: 'C:\\Users\\mt\\AppData\\Roaming\\npm\\hh.cmd', source: 'shim' }

  it('goes through cmd.exe with the shim as its own argv word', () => {
    const plan = cmdShimArgv(cmdShim.program, ['--version'], 'win32')
    // The shim must be one argv word, not concatenated into a command string: `run()` passes each
    // word separately, and the single-line forms were measured to fail for a path with a space.
    expect(plan.kind).toBe('argv')
    if (plan.kind !== 'argv')
      return
    expect(plan.argv[0]).toMatch(/cmd\.exe$/i)
    expect(plan.argv.slice(1)).toEqual(['/d', '/c', cmdShim.program, '--version'])
  })

  it('refuses a path carrying a cmd metacharacter rather than quoting it', () => {
    // A value must never become a command, and `&` is legal in a Windows filename.
    for (const bad of ['C:\\a & b\\hh.cmd', 'C:\\a|b\\hh.cmd', 'C:\\a^b\\hh.cmd', 'C:\\a%b\\hh.cmd'])
      expect(cmdShimArgv(bad, ['--version'], 'win32').kind, bad).toBe('refused')
  })

  it('runs a script entry through a real node, never through this process', async () => {
    // The Desktop case: `launch.program` is the Electron binary there, so the probe must name the
    // interpreter instead. A pinned source stands in for the machine.
    const node = async () => ({ path: '/usr/bin/node', source: 'execPath' as const })
    expect(await launchArgv(launch, ['--version'], node, 'win32')).toEqual(['/usr/bin/node', '/srv/hh/bin/home-hosted.mjs', '--version'])
    expect(await launchArgv(launch, ['--version'], node, 'linux')).toEqual(['/usr/bin/node', '/srv/hh/bin/home-hosted.mjs', '--version'])
  })

  it('will not spawn a .cmd on a host that has no cmd.exe', () => {
    expect(cmdShimArgv(cmdShim.program, ['--version'], 'linux').kind).toBe('refused')
  })
})

describe('resolveShimmedCli', () => {
  it('runs a shim target through node, and keeps a real binary as its own program', () => {
    scratch = tempDir()
    const target = path.join(scratch.path, 'home-hosted.mjs')
    fs.writeFileSync(target, '#!/usr/bin/env node\n', 'utf8')
    const shim = path.join(scratch.path, 'hh')
    fs.writeFileSync(shim, `#!/bin/sh\n# cmd-shim-target=${target}\nexec node ${target} "$@"\n`, 'utf8')

    const viaTarget = resolveShimmedCli(shim, '/usr/bin/node')
    expect(viaTarget?.source).toBe('shim-target')
    expect(viaTarget?.cliEntry).toBe(target)

    const binary = path.join(scratch.path, 'real')
    fs.writeFileSync(binary, 'not a script\n', 'utf8')
    const direct = resolveShimmedCli(binary, '/usr/bin/node')
    expect(direct).toMatchObject({ program: binary, cliEntry: null, source: 'shim' })

    expect(resolveShimmedCli(path.join(scratch.path, 'missing'))).toBeNull()
  })
})

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
