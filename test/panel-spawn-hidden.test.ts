/**
 * The detached helper must not open a console window.
 *
 * On Windows, `stdio: 'ignore'` says where output goes — it does not decide whether the OS gives a
 * console-subsystem child a **window**. Only `windowsHide` does. This helper takes the panel over
 * in the background, so a window there is one the person never asked for, and it was missing.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

describe('the detached panel helper', () => {
  it('spawns with windowsHide', () => {
    // The options are inline in the source of a function that spawns a real process, so this is
    // read rather than called: the alternative is launching a helper to observe a window no test
    // can see. Same approach the repo already uses for generated sources.
    const file = fileURLToPath(new URL('../src/home-hosted/panel-control.ts', import.meta.url))
    const source = fs.readFileSync(file, 'utf8')
    const start = source.indexOf('export function spawnDetached')
    expect(start).toBeGreaterThan(-1)
    const body = source.slice(start, source.indexOf('\n}', start))
    expect(body).toContain('windowsHide: true')
  })
})
