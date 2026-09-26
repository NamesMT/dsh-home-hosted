/**
 * Test seams for the boot ladder: an argv-only fake runner and a temp home.
 * Nothing here invokes a real systemctl/launchctl/schtasks/reg.exe.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { BootProviderContext, BootRunResult, BootSpec } from '../../src/boot/types.js'

export interface RunCall {
  command: string
  args: string[]
}

export interface FakeResponse {
  code?: number | null
  stdout?: string
  stderr?: string
  error?: string | null
}

export type FakeHandler = (command: string, args: string[]) => FakeResponse | undefined

export interface FakeRunner {
  calls: RunCall[]
  run: (command: string, args?: string[]) => Promise<BootRunResult>
  /** Every call as a human-readable line, for `commands` assertions. */
  lines: () => string[]
  find: (command: string) => RunCall[]
}

export function fakeRun(handler: FakeHandler = () => ({ code: 0 })): FakeRunner {
  const calls: RunCall[] = []
  return {
    calls,
    async run(command: string, args: string[] = []): Promise<BootRunResult> {
      calls.push({ command, args })
      const response = handler(command, args) ?? { code: 0 }
      return {
        code: response.code === undefined ? 0 : response.code,
        stdout: response.stdout ?? '',
        stderr: response.stderr ?? '',
        error: response.error ?? null,
      }
    },
    lines: () => calls.map(call => [call.command, ...call.args].join(' ')),
    find: (command: string) => calls.filter(call => call.command === command),
  }
}

export function tempHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hh-boot-'))
}

export function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

export function spec(overrides: Partial<BootSpec> = {}): BootSpec {
  return {
    command: '/usr/bin/node',
    args: ['/opt/home-hosted/dist/cli.js', 'up', '--foreground', '--home', '/home/tester/.home-hosted'],
    cwd: '/home/tester',
    env: { PATH: '/usr/bin:/bin', HOME: '/home/tester', HHOSTED_HOME: '/home/tester/.home-hosted' },
    marker: 'managed-by:dsh-home-hosted',
    unitName: 'home-hosted',
    label: 'home-hosted panel',
    logDir: '/home/tester/.home-hosted/.logs',
    ...overrides,
  }
}

export function winSpec(overrides: Partial<BootSpec> = {}): BootSpec {
  return {
    command: 'C:\\Program Files\\nodejs\\node.exe',
    args: ['C:\\home-hosted\\dist\\cli.js', 'up', '--foreground', '--home', 'C:\\Users\\tester\\.home-hosted'],
    cwd: 'C:\\Users\\tester',
    env: { PATH: 'C:\\Windows\\System32', USERPROFILE: 'C:\\Users\\tester' },
    marker: 'managed-by:dsh-home-hosted',
    unitName: 'home-hosted',
    label: 'home-hosted panel',
    logDir: 'C:\\Users\\tester\\.home-hosted\\.logs',
    ...overrides,
  }
}

export function ctxFor(overrides: Partial<BootProviderContext> & { home: string, run: BootProviderContext['run'] }): BootProviderContext {
  return {
    platform: 'linux',
    env: { USER: 'tester', UID: '1000' },
    sudo: async () => false,
    isRoot: false,
    ...overrides,
  }
}
