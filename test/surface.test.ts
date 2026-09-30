import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import type { Context as ContextType } from '@deepseek-ai/cordis'
import { readSurface } from '../src/util/surface.js'

/** A context whose only meaningful seat is `profileContext`, as dsh registers it. */
function withProfile(name: string | undefined): ContextType {
  return { get: (key: string) => (key === 'profileContext' ? { name } : undefined) } as unknown as ContextType
}

/**
 * Desktop detection reads the same field dsh's own composition keys its Desktop
 * rows on, so the name is the whole contract.
 */
describe('the dsh surface', () => {
  it('reads Desktop from the profile context dsh registers', () => {
    expect(readSurface(withProfile('desktop'))).toBe('desktop')
  })

  it('treats every other profile as the web surface', () => {
    expect(readSurface(withProfile('web'))).toBe('web')
    expect(readSurface(withProfile('headless'))).toBe('web')
    // A context that answers something shapeless is not a Desktop client.
    expect(readSurface(withProfile(undefined))).toBe('web')
  })

  it('falls back to web when no profile context exists', () => {
    // A host too old to register the service is not a Desktop client, and the
    // web surface is what this plugin was built for.
    expect(readSurface(new Context())).toBe('web')
  })

  it('falls back to web when reading the service throws', () => {
    const angry = { get: () => { throw new Error('service unavailable') } } as unknown as ContextType
    expect(readSurface(angry)).toBe('web')
  })
})
