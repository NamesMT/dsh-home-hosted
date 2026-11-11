/**
 * Which real node runs a JS file, and the bug that made the question necessary.
 *
 * Every case here pins the seams rather than the machine: no test installs Electron,
 * runs Desktop's binary or depends on what `node` a CI box has on PATH. The one case
 * that does drive a real program builds it in a temp dir.
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  forgetNodeInterpreter,
  cmdShimArgv,
  helperArgv,
  launchArgv,
  launchRunsScript,
  nodeInterpreter,
  resolveNodeInterpreter,
} from '../src/home-hosted/node-interpreter.js'
import type { NodeInterpreterDeps } from '../src/home-hosted/node-interpreter.js'
import type { CliLaunch } from '../src/home-hosted/launch.js'
import { tempDir } from './helpers/temp.js'
import type { TempDir } from './helpers/temp.js'

let scratch: TempDir | null = null

afterEach(() => {
  scratch?.cleanup()
  scratch = null
  forgetNodeInterpreter()
})

/** The Electron binary as Desktop reports it; the whole defect is that this is not node. */
const ELECTRON_EXEC = 'C:\\Users\\me\\AppData\\Local\\Programs\\DeepSeek Harness\\DeepSeek Harness.exe'
const RESOURCES = 'C:\\Users\\me\\AppData\\Local\\Programs\\DeepSeek Harness\\resources'
const BUNDLED_NODE = path.join(RESOURCES, 'runtime', 'primary-runtime', 'dependencies', 'node', 'bin', 'node.exe')

/**
 * A deps object whose every answer is pinned.
 *
 * `exists` is a set rather than a file read, so a test states exactly which candidates
 * are present; `probe` answers per path, so "proved by --version" can be broken for one
 * candidate without touching the others.
 */
function pinned(options: {
  platform?: NodeJS.Platform
  execPath?: string
  resourcesPath?: string | null
  electron?: string | null
  present?: string[]
  proves?: string[]
  onPath?: string | null
  asked?: string[]
  found?: string[]
}): NodeInterpreterDeps & { asked: string[], found: string[] } {
  const present = new Set(options.present ?? [])
  const proves = new Set(options.proves ?? [])
  const asked: string[] = []
  const found: string[] = []
  return {
    platform: options.platform ?? 'win32',
    execPath: options.execPath ?? ELECTRON_EXEC,
    resourcesPath: options.resourcesPath === undefined ? RESOURCES : options.resourcesPath,
    electron: options.electron === undefined ? '44.7.0' : options.electron,
    exists: file => present.has(file),
    probe: async (file) => {
      asked.push(file)
      return proves.has(file)
    },
    findOnPath: async (command) => {
      found.push(command)
      return options.onPath === undefined ? null : options.onPath
    },
    asked,
    found,
  }
}

/** A real executable that answers `--version` with a node-shaped version. */
function realNode(version: string): string {
  scratch = tempDir()
  const file = path.join(scratch.path, 'node')
  fs.writeFileSync(file, `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "v${version}"; else exit 1; fi\n`, { mode: 0o755 })
  return file
}

describe('the ordinary case: this process is already node', () => {
  /**
   * POSIX and a plain `node` must keep **byte-identical** specs, and the entry that
   * already exists must not be rewritten. So the answer is `process.execPath` and
   * nothing is asked of the machine — no `exists`, no probe, no PATH lookup.
   */
  it('returns this process\'s own executable without probing anything', async () => {
    const deps = pinned({ electron: null, platform: 'linux', execPath: '/usr/bin/node' })
    const answer = await resolveNodeInterpreter(deps)

    expect(answer).toEqual({ path: '/usr/bin/node', source: 'execPath' })
    expect(deps.asked).toEqual([])
    expect(deps.found).toEqual([])
  })

  it('treats an absent electron version the same way, not only an explicit null', async () => {
    // `process.versions.electron` is simply absent in plain node, so `undefined` is the
    // value the default seam sees in production; a test that only pinned `null` would
    // leave the real branch unexercised.
    const answer = await resolveNodeInterpreter({ execPath: '/usr/bin/node', electron: undefined, platform: 'linux' })
    expect(answer).toEqual({ path: '/usr/bin/node', source: 'execPath' })
  })

  it('does not fall back to PATH when it already is node, even on win32', async () => {
    // The Windows branch only exists for Electron: a plain node on Windows is a real node
    // and its own interpreter, so the spec keeps naming it.
    const deps = pinned({ electron: null, platform: 'win32', execPath: 'C:\\Program Files\\nodejs\\node.exe' })
    expect(await resolveNodeInterpreter(deps)).toEqual({ path: 'C:\\Program Files\\nodejs\\node.exe', source: 'execPath' })
    expect(deps.found).toEqual([])
  })
})

describe('under Electron', () => {
  it('never answers the Electron executable, even when nothing else is found', async () => {
    // The exact reported defect: the entry's command was the Electron binary, and a
    // Windows entry cannot carry ELECTRON_RUN_AS_NODE, so it started the app.
    const answer = await resolveNodeInterpreter(pinned({ present: [], proves: [], onPath: null }))
    expect(answer).toBeNull()
    expect(answer?.path).not.toBe(ELECTRON_EXEC)
  })

  it('resolves Desktop\'s bundled runtime node first, and says so', async () => {
    const answer = await resolveNodeInterpreter(pinned({
      present: [BUNDLED_NODE],
      proves: [BUNDLED_NODE],
      onPath: 'C:\\Program Files\\nodejs\\node.exe',
    }))
    expect(answer).toEqual({ path: BUNDLED_NODE, source: 'bundled' })
  })

  it('names node.exe on win32 and node elsewhere', async () => {
    const macDeps = pinned({
      platform: 'darwin',
      resourcesPath: '/Applications/DeepSeek Harness.app/Contents/Resources',
      present: ['/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node'],
      proves: ['/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies/node/bin/node'],
    })
    const answer = await resolveNodeInterpreter(macDeps)
    expect(answer?.source).toBe('bundled')
    expect(answer?.path.endsWith('/node')).toBe(true)
    expect(answer?.path.endsWith('node.exe')).toBe(false)
  })

  it('falls back to a node on PATH, proved the same way', async () => {
    const onPath = '/usr/local/bin/node'
    const answer = await resolveNodeInterpreter(pinned({ present: [], proves: [onPath], onPath }))
    expect(answer).toEqual({ path: onPath, source: 'path' })
  })

  it('skips the bundled path when resourcesPath is missing, rather than guessing one', async () => {
    const onPath = '/usr/local/bin/node'
    const deps = pinned({ resourcesPath: null, proves: [onPath], onPath })
    expect(await resolveNodeInterpreter(deps)).toEqual({ path: onPath, source: 'path' })
    // Nothing under a resources directory was considered or run.
    expect(deps.asked).toEqual([onPath])
  })
})

/**
 * A path that exists is not a program that runs.
 *
 * This is the difference the whole module turns on: Desktop ships
 * `resources\runtime\bin\node.cmd`, which exists and would be found, but is only a shim
 * that sets `ELECTRON_RUN_AS_NODE=1` and execs `%DSH_DESKTOP_NODE_EXECUTABLE%` — a
 * variable an autostart entry does not supply. Trusting existence would resolve to a
 * program that cannot start the panel.
 */
describe('a candidate must be proved by --version, not merely present', () => {
  it('refuses a bundled node that exists but does not run', async () => {
    const onPath = '/usr/local/bin/node'
    const answer = await resolveNodeInterpreter(pinned({
      present: [BUNDLED_NODE],
      proves: [onPath],
      onPath,
    }))
    // Proved-bundled was tried first and failed, so the proved PATH node answers — never
    // the unproved bundled path.
    expect(answer).toEqual({ path: onPath, source: 'path' })
  })

  it('answers null when every present candidate fails the probe', async () => {
    const answer = await resolveNodeInterpreter(pinned({
      present: [BUNDLED_NODE],
      proves: [],
      onPath: 'C:\\Program Files\\nodejs\\node.exe',
    }))
    expect(answer).toBeNull()
  })

  it('proves every candidate it returns, and only returns a proved one', async () => {
    const deps = pinned({
      present: [BUNDLED_NODE],
      proves: [BUNDLED_NODE],
      onPath: null,
    })
    await resolveNodeInterpreter(deps)
    // The bundled path was asked; the PATH lookup did not happen once that answered.
    expect(deps.asked).toEqual([BUNDLED_NODE])
    expect(deps.found).toEqual([])
  })

  it('refuses a bundled node whose --version is not parseable', async () => {
    // The real probe, driven against a real program: a candidate that exits 0 but prints
    // no version is not a node, and `--version` is the only question asked.
    scratch = tempDir()
    const fake = path.join(scratch.path, 'node')
    fs.writeFileSync(fake, '#!/bin/sh\nexit 0\n', { mode: 0o755 })
    const answer = await resolveNodeInterpreter({
      platform: 'win32',
      execPath: ELECTRON_EXEC,
      electron: '44.7.0',
      resourcesPath: null,
      exists: () => true,
      findOnPath: async () => fake,
    })
    expect(answer).toBeNull()
  })

  it('accepts a real program that answers --version, and only because it did', async () => {
    const node = realNode('24.21.0')
    const answer = await resolveNodeInterpreter({
      platform: 'win32',
      execPath: ELECTRON_EXEC,
      electron: '44.7.0',
      resourcesPath: null,
      exists: () => true,
      findOnPath: async () => node,
    })
    expect(answer).toEqual({ path: node, source: 'path' })
  })
})

describe('the answer a caller gets', () => {
  it('caches a success for the process, so a poll does not pay the probe', async () => {
    // `nodeInterpreter()` is the production entry point; a success is kept because the
    // paths belong to this installation and cannot move while this process runs.
    const first = await nodeInterpreter()
    const second = await nodeInterpreter()
    // Same object, not merely an equal one: a cached answer is not re-probed.
    expect(second).toBe(first)
    // And on every platform it is a real program, never the Electron binary.
    expect(first).not.toBeNull()
  })

  it('runs a script launch through a real node, and never through the recorded program', async () => {
    const script: CliLaunch = { program: ELECTRON_EXEC, args: ['/x/home-hosted.mjs'], cliEntry: '/x/home-hosted.mjs', shimPath: null, source: 'entry' }
    expect(launchRunsScript(script)).toBe(true)
    // A shim or an executable is not a script: the recorded program stands.
    const shim: CliLaunch = { program: '/usr/local/bin/home-hosted', args: [], cliEntry: null, shimPath: '/usr/local/bin/home-hosted', source: 'shim' }
    expect(launchRunsScript(shim)).toBe(false)

    const node = realNode('24.21.0')
    const source = async () => ({ path: node, source: 'path' as const })
    expect(await launchArgv(script, ['down'], source)).toEqual([node, '/x/home-hosted.mjs', 'down'])
    expect(await launchArgv(shim, ['down'], source)).toEqual(['/usr/local/bin/home-hosted', 'down'])
  })

  it('answers null for a script launch when no node resolves', async () => {
    const script: CliLaunch = { program: ELECTRON_EXEC, args: ['/x/home-hosted.mjs'], cliEntry: '/x/home-hosted.mjs', shimPath: null, source: 'entry' }
    expect(await launchArgv(script, ['down'], async () => null)).toBeNull()
  })

  /**
   * `plan.stop` is a complete argv a generated script spawns directly, so its first word
   * has to be a program.
   *
   * Spreading a script launch's own args produced `['…/home-hosted.mjs', 'down', …]` — a
   * JS file where a program belongs. That runs on POSIX only through the entry's shebang
   * and mode bit, and on Windows not at all: measured against the real bundled node
   * 24.21.0, `spawnSync(entry, …)` answers `EFTYPE` with a null status and nothing runs.
   */
  it('builds an argv whose first word is a program, on both launch shapes', async () => {
    const node = realNode('24.21.0')
    const source = async () => ({ path: node, source: 'path' as const })

    // A script launch: the entry becomes an argument *after* the program.
    const script: CliLaunch = { program: ELECTRON_EXEC, args: ['/x/home-hosted.mjs'], cliEntry: '/x/home-hosted.mjs', shimPath: null, source: 'entry' }
    expect(await launchArgv(script, ['down', '--home', '/hh'], source))
      .toEqual([node, '/x/home-hosted.mjs', 'down', '--home', '/hh'])

    // A POSIX shim is itself the program, so it stays first with only the words appended —
    // never repeated as an argument to itself.
    const shim: CliLaunch = { program: '/usr/local/bin/home-hosted', args: [], cliEntry: null, shimPath: '/usr/local/bin/home-hosted', source: 'shim' }
    expect(await launchArgv(shim, ['down', '--home', '/hh'], source))
      .toEqual(['/usr/local/bin/home-hosted', 'down', '--home', '/hh'])

    // And no node for a script launch is a refusal, not a fabricated argv.
    expect(await launchArgv(script, ['down'], async () => null)).toBeNull()
  })
})

/**
 * A Windows **global** install is a `.cmd`, and `spawn` without a shell cannot run one.
 *
 * Measured with the bundled node 24.21.0 on native Windows:
 * `spawnSync('…\home-hosted.cmd', ['up'], {stdio:'pipe'})` → `{"error":"EINVAL"}` with a null
 * code, while `cmd.exe /d /c <shim> up` runs — and still runs when the path holds a space.
 *
 * This is the defect class of the whole change (an unrunnable thing handed to `spawn`), so the
 * rule lives in one pure function that reports **three** outcomes. Collapsing "not a shim" and
 * "a shim that must not be run" into one null is what makes a `??` chain hand back the bare
 * `.cmd`, which is why the refusal can never be a fallthrough.
 */
describe('a Windows command shim', () => {
  const CMD = 'C:\\Users\\me\\AppData\\Roaming\\npm\\home-hosted.cmd'
  const BATCH = 'C:\\tools\\home-hosted.bat'
  const METACHAR = 'C:\\Users\\me & co\\npm\\home-hosted.cmd'
  const SPACED = 'C:\\Program Files (x86)\\npm\\home-hosted.cmd'

  it('reports not-a-shim for an ordinary program, so a POSIX shim or a node is not touched', () => {
    expect(cmdShimArgv('/usr/local/bin/home-hosted', ['up'], 'win32').kind).toBe('none')
    expect(cmdShimArgv('/usr/bin/node', ['up'], 'linux').kind).toBe('none')
    // A `.mjs` is not a `.cmd`: the launcher preflight and the JS helpers must not land here.
    expect(cmdShimArgv('C:\\Users\\me\\state\\bin\\home-hosted.mjs', ['up'], 'win32').kind).toBe('none')
  })

  it('runs a .cmd through cmd.exe, with the shim as its own argv word', () => {
    for (const shim of [CMD, BATCH]) {
      const plan = cmdShimArgv(shim, ['up', '--home', 'C:\\hh'], 'win32')
      expect(plan.kind).toBe('argv')
      if (plan.kind !== 'argv')
        throw new Error('unreachable')
      // `cmd.exe` first — never the bare shim, which `spawn` answers EINVAL for.
      expect(plan.argv[0]).not.toBe(shim)
      expect(plan.argv[0]!.toLowerCase()).toMatch(/cmd(?:\.exe)?$/)
      // `/d /c <shim>` with the shim as one word, the form measured to survive spaces.
      expect(plan.argv.slice(1, 3)).toEqual(['/d', '/c'])
      expect(plan.argv[3]).toBe(shim)
      expect(plan.argv.slice(4)).toEqual(['up', '--home', 'C:\\hh'])
    }
  })

  it('handles a path with a space and parentheses, which the single-line forms fail on', () => {
    const plan = cmdShimArgv(SPACED, ['up'], 'win32')
    expect(plan.kind).toBe('argv')
    // Kept as one argv word rather than quoted into a line: `run()` passes words separately.
    if (plan.kind === 'argv')
      expect(plan.argv[3]).toBe(SPACED)
  })

  it('refuses a shim carrying a cmd metacharacter, instead of quoting it', () => {
    const plan = cmdShimArgv(METACHAR, ['up'], 'win32')
    expect(plan.kind).toBe('refused')
    // The reason names the hazard, so a person is not left guessing why the panel will not act.
    if (plan.kind === 'refused')
      expect(plan.reason).toContain('metacharacter')
    for (const bad of ['C:\\a|b\\hh.cmd', 'C:\\a<b\\hh.cmd', 'C:\\a>b\\hh.cmd', 'C:\\a^b\\hh.cmd', 'C:\\a%b\\hh.cmd'])
      expect(cmdShimArgv(bad, ['up'], 'win32').kind).toBe('refused')
  })

  it('refuses a .cmd on a platform that cannot run one, rather than calling it a program', () => {
    // Not `none`: "use it directly" is the wrong answer for a `.cmd` on Linux, and that
    // answer is what would hand the bare shim to `spawn`.
    expect(cmdShimArgv(CMD, ['up'], 'linux').kind).toBe('refused')
  })
})

describe('the complete argv a caller spawns', () => {
  const CMD = 'C:\\Users\\me\\AppData\\Roaming\\npm\\home-hosted.cmd'
  const METACHAR = 'C:\\a&b\\home-hosted.cmd'
  const cmdLaunch: CliLaunch = { program: CMD, args: [], cliEntry: null, shimPath: CMD, source: 'shim' }

  it('never returns the bare .cmd as argv[0] for a shim launch', async () => {
    const argv = await launchArgv(cmdLaunch, ['up', '--home', 'C:\\hh'], undefined, 'win32')
    expect(argv).not.toBeNull()
    expect(argv![0]).not.toBe(CMD)
    expect(argv![0]!.toLowerCase()).toMatch(/cmd(?:\.exe)?$/)
    expect(argv![3]).toBe(CMD)
  })

  it('refuses a metacharacter shim instead of spawning the bare .cmd', async () => {
    // The fallthrough this guards: returning `[launch.program, ...]` here would spawn the
    // `.cmd` itself and fail with a null status.
    const argv = await launchArgv({ ...cmdLaunch, program: METACHAR, shimPath: METACHAR }, ['up'], undefined, 'win32')
    expect(argv).toBeNull()
  })

  /**
   * A generated helper is already running under a real node, so its script program is
   * `process.execPath` — but a `.cmd` still needs `cmd.exe`, which is the case that would
   * otherwise be baked in as a program the helper cannot spawn.
   */
  it('gives a generated helper cmd.exe for a .cmd, and process.execPath for a script', () => {
    const script: CliLaunch = { program: ELECTRON_EXEC, args: ['/x/home-hosted.mjs'], cliEntry: '/x/home-hosted.mjs', shimPath: null, source: 'entry' }
    const scriptPlan = helperArgv(script, ['up', '--home', 'C:\\hh'], 'win32')
    expect(scriptPlan?.program).toBe('process.execPath')
    expect(scriptPlan?.args).toEqual(['/x/home-hosted.mjs', 'up', '--home', 'C:\\hh'])

    const cmdPlan = helperArgv(cmdLaunch, ['up'], 'win32')
    expect(cmdPlan?.program.toLowerCase()).toMatch(/cmd(?:\.exe)?$/)
    expect(cmdPlan?.args.slice(0, 3)).toEqual(['/d', '/c', CMD])

    // And a refusal is a refusal for the helper too — never a bare `.cmd` program.
    expect(helperArgv({ ...cmdLaunch, program: METACHAR }, ['up'], 'win32')).toBeNull()
  })
})
