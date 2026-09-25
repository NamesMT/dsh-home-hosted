/**
 * The only place this plugin starts a process.
 *
 * Every call is an argv array with no shell, so a path or a value can never
 * become a command. Callers pass absolute programs; nothing here resolves
 * through a shell profile.
 */
import { spawn } from 'node:child_process'

export interface RunOptions {
  cwd?: string
  env?: Record<string, string | undefined>
  timeoutMs?: number
  /** Cap on each captured stream; a chatty command is truncated, not buffered forever. */
  maxBytes?: number
}

export interface RunResult {
  command: string
  args: string[]
  code: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
  timedOut: boolean
  error: string | null
}

/** Run a program and always resolve; a non-zero code is data, not a throw. */
export async function run(command: string, args: string[] = [], options: RunOptions = {}): Promise<RunResult> {
  const maxBytes = options.maxBytes ?? 256 * 1024
  const timeoutMs = options.timeoutMs ?? 20_000

  return await new Promise<RunResult>((resolve) => {
    let settled = false
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const finish = (result: Partial<RunResult>): void => {
      if (settled)
        return
      settled = true
      resolve({
        command,
        args,
        code: result.code ?? null,
        signal: result.signal ?? null,
        stdout: result.stdout ?? stdout,
        stderr: result.stderr ?? stderr,
        timedOut,
        error: result.error ?? null,
      })
    }

    let child
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    }
    catch (error) {
      finish({ error: error instanceof Error ? error.message : String(error) })
      return
    }

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdout.length < maxBytes)
        stdout += chunk.toString('utf8').slice(0, maxBytes - stdout.length)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < maxBytes)
        stderr += chunk.toString('utf8').slice(0, maxBytes - stderr.length)
    })

    child.on('error', (error) => {
      clearTimeout(timer)
      finish({ error: error.message })
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      finish({ code, signal })
    })
  })
}

/** Run a program and fail loudly on anything but success. */
export async function runOk(command: string, args: string[] = [], options: RunOptions = {}): Promise<RunResult> {
  const result = await run(command, args, options)
  if (result.error !== null)
    throw new Error(`${command} failed: ${result.error}`)
  if (result.code !== 0)
    throw new Error(`${command} exited ${String(result.code)}: ${result.stderr.trim() || result.stdout.trim()}`)
  return result
}

/** True when the program exists and answers to `--version` or similar. */
export async function hasCommand(command: string): Promise<boolean> {
  const probe = process.platform === 'win32' ? 'where.exe' : 'which'
  const result = await run(probe, [command], { timeoutMs: 5000 })
  return result.code === 0
}

/**
 * Whether this process can run one privileged command with no prompt.
 * `sudo -n` never asks for a password, so a failure is a definitive "not
 * available" rather than something to retry interactively.
 */
export async function sudoAvailable(): Promise<boolean> {
  if (process.getuid?.() === 0)
    return true
  const result = await run('sudo', ['-n', 'true'], { timeoutMs: 5000 })
  return result.code === 0
}
