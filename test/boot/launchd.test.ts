import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLaunchdAgentProvider, createLaunchdDaemonProvider, launchdPlist } from '../../src/boot/launchd.js'
import { cleanup, ctxFor, fakeRun, spec, tempHome } from './harness.js'

const LABEL = 'dev.home-hosted.home-hosted'

describe('launchd agent', () => {
  let home: string
  let logDir: string
  let plistPath: string
  let agentSpec: ReturnType<typeof spec>

  beforeEach(() => {
    home = tempHome()
    logDir = path.join(home, 'logs')
    plistPath = path.join(home, 'Library', 'LaunchAgents', `${LABEL}.plist`)
    agentSpec = spec({ logDir })
  })
  afterEach(() => cleanup(home))

  it('detects the gui domain', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const candidate = await provider.detect()
    expect(candidate.available).toBe(true)
    expect(candidate.bootCapable).toBe(false)
    expect(candidate.privileged).toBe(true)
    expect(candidate.reason).toContain('gui/1000')
  })

  it('falls back to the user domain when gui is unreachable', async () => {
    const runner = fakeRun((command, args) => {
      if (command !== 'launchctl')
        return { code: 0 }
      return args[1] === 'user/1000' ? { code: 0 } : { code: 113 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const candidate = await provider.detect()
    expect(candidate.available).toBe(true)
    expect(candidate.reason).toContain('user/1000')
  })

  it('is unavailable when neither domain is reachable', async () => {
    const runner = fakeRun(() => ({ code: 113 }))
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const candidate = await provider.detect()
    expect(candidate.available).toBe(false)
    expect(candidate.reason).toMatch(/no launchd/)
  })

  it('installs, lints, bootstraps and verifies', async () => {
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const result = await provider.install(agentSpec)
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    expect(fs.readFileSync(plistPath, 'utf8')).toBe(launchdPlist(agentSpec))
    expect(runner.lines()).toContain(`plutil -lint ${plistPath}`)
    expect(runner.lines()).toContain(`launchctl bootstrap gui/1000 ${plistPath}`)
    expect(runner.lines()).toContain(`launchctl enable gui/1000/${LABEL}`)
    expect(runner.lines()).toContain(`launchctl print gui/1000/${LABEL}`)
  })

  it('treats an identical, already loaded plist as no change', async () => {
    fs.mkdirSync(path.dirname(plistPath), { recursive: true })
    fs.writeFileSync(plistPath, launchdPlist(agentSpec))
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const result = await provider.install(agentSpec)
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(false)
    expect(runner.lines().some(line => line.includes('bootstrap'))).toBe(false)
    expect(runner.lines().some(line => line.includes('bootout'))).toBe(false)
  })

  it('reloads a loaded job when the plist changed', async () => {
    fs.mkdirSync(path.dirname(plistPath), { recursive: true })
    fs.writeFileSync(plistPath, launchdPlist(agentSpec).replace('dev.home-hosted.home-hosted.out.log', 'old.log'))
    const runner = fakeRun(() => ({ code: 0 }))
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const result = await provider.install(agentSpec)
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    const lines = runner.lines()
    expect(lines).toContain(`launchctl bootout gui/1000/${LABEL}`)
    expect(lines).toContain(`launchctl bootstrap gui/1000 ${plistPath}`)
  })

  it('accepts bootstrap exit 5 as already loaded', async () => {
    let bootstrapped = false
    const runner = fakeRun((command, args) => {
      if (command !== 'launchctl')
        return { code: 0 }
      if (args[0] === 'print' && args[1] === 'gui/1000')
        return { code: 0 }
      if (args[0] === 'print')
        return { code: bootstrapped ? 0 : 113 }
      if (args[0] === 'bootstrap') {
        bootstrapped = true
        return { code: 5 }
      }
      return { code: 0 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const result = await provider.install(agentSpec)
    expect(result.ok).toBe(true)
  })

  it('fails honestly when bootstrap fails', async () => {
    const runner = fakeRun((command, args) => {
      if (command !== 'launchctl')
        return { code: 0 }
      if (args[0] === 'print' && args[1] === 'gui/1000')
        return { code: 0 }
      if (args[0] === 'print')
        return { code: 113 }
      if (args[0] === 'bootstrap')
        return { code: 1, stderr: 'Bootstrap failed: 1: Operation not permitted' }
      return { code: 0 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const result = await provider.install(agentSpec)
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/Operation not permitted/)
  })

  it('does not claim success when print still reports 113', async () => {
    const runner = fakeRun((command, args) => {
      if (command !== 'launchctl')
        return { code: 0 }
      if (args[0] === 'print' && args[1] === 'gui/1000')
        return { code: 0 }
      if (args[0] === 'print')
        return { code: 113 }
      return { code: 0 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const result = await provider.install(agentSpec)
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/did not confirm/)
  })

  it('reports a present but unloaded plist from status()', async () => {
    fs.mkdirSync(path.dirname(plistPath), { recursive: true })
    fs.writeFileSync(plistPath, launchdPlist(agentSpec))
    const runner = fakeRun((command, args) => {
      if (command === 'launchctl' && args[1] === 'gui/1000')
        return { code: 0 }
      return { code: 113 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const status = await provider.status(agentSpec)
    expect(status.state).toBe('enabled-running')
    expect(status.detail).toMatch(/not loaded right now/)
    expect(status.unitPath).toBe(plistPath)
  })

  it('tolerates bootout exit 3 and removes the plist', async () => {
    fs.mkdirSync(path.dirname(plistPath), { recursive: true })
    fs.writeFileSync(plistPath, launchdPlist(agentSpec))
    let loaded = true
    const runner = fakeRun((command, args) => {
      if (command !== 'launchctl')
        return { code: 0 }
      if (args[0] === 'bootout') {
        loaded = false
        return { code: 3, stderr: 'No such process' }
      }
      if (args[0] === 'print' && args[1] === 'gui/1000')
        return { code: 0 }
      return { code: loaded ? 0 : 113 }
    })
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    const result = await provider.uninstall(agentSpec)
    expect(result.ok).toBe(true)
    expect(fs.existsSync(plistPath)).toBe(false)
  })

  it('refuses to touch a foreign plist', async () => {
    fs.mkdirSync(path.dirname(plistPath), { recursive: true })
    fs.writeFileSync(plistPath, '<?xml version="1.0"?><plist version="1.0"><dict/></plist>')
    const runner = fakeRun()
    const provider = createLaunchdAgentProvider(ctxFor({ home, run: runner.run, platform: 'darwin' }))
    expect((await provider.install(agentSpec)).ok).toBe(false)
    expect((await provider.uninstall(agentSpec)).ok).toBe(false)
    expect(fs.existsSync(plistPath)).toBe(true)
    expect(runner.calls).toEqual([])
  })
})

describe('launchd daemon', () => {
  let home: string
  let logDir: string
  let daemonSpec: ReturnType<typeof spec>
  const daemonPath = '/Library/LaunchDaemons/dev.home-hosted.home-hosted.plist'

  beforeEach(() => {
    home = tempHome()
    logDir = path.join(home, 'logs')
    daemonSpec = spec({ logDir })
  })
  afterEach(() => cleanup(home))

  it('needs root', async () => {
    const runner = fakeRun()
    const provider = createLaunchdDaemonProvider(ctxFor({ home, run: runner.run, platform: 'darwin', sudo: async () => false }))
    const candidate = await provider.detect()
    expect(candidate.available).toBe(false)
    expect(candidate.reason).toMatch(/root/)
  })

  it('reports the sudo install command when privilege is missing', async () => {
    const runner = fakeRun()
    const provider = createLaunchdDaemonProvider(ctxFor({
      home,
      run: runner.run,
      platform: 'darwin',
      sudo: async () => false,
      env: { USER: 'mt', UID: '1000', TMPDIR: home },
    }))
    const result = await provider.install(daemonSpec)
    expect(result.ok).toBe(false)
    expect(result.needsPrivilege).toBe(true)
    expect(result.commands).toEqual([
      `sudo install -m 0644 ${path.join(home, `${LABEL}.plist`)} ${daemonPath}`,
      `sudo launchctl bootstrap system ${daemonPath}`,
      `sudo launchctl enable system/${LABEL}`,
    ])
    expect(runner.calls.some(call => call.command === 'sudo')).toBe(false)
  })

  it('installs through sudo -n into the system domain', async () => {
    let loaded = false
    const runner = fakeRun((command, args) => {
      if (command === 'sudo') {
        const rest = args.slice(1)
        if (rest[0] === 'launchctl' && rest[1] === 'bootstrap')
          loaded = true
        if (rest[0] === 'launchctl' && rest[1] === 'print')
          return { code: loaded ? 0 : 113 }
        return { code: 0 }
      }
      if (command === 'launchctl' && args[0] === 'print')
        return { code: loaded ? 0 : 113 }
      return { code: 0 }
    })
    const provider = createLaunchdDaemonProvider(ctxFor({
      home,
      run: runner.run,
      platform: 'darwin',
      sudo: async () => true,
      env: { USER: 'mt', UID: '1000', TMPDIR: home },
    }))
    const result = await provider.install(daemonSpec)
    expect(result.ok).toBe(true)
    expect(result.needsPrivilege).toBe(true)
    const lines = runner.lines()
    expect(lines.some(line => line.startsWith('sudo -n install -m 0644 '))).toBe(true)
    expect(lines).toContain(`sudo -n plutil -lint ${daemonPath}`)
    expect(lines).toContain(`sudo -n launchctl bootstrap system ${daemonPath}`)
  })
})
