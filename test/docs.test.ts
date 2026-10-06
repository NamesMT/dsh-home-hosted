/**
 * The shipped docs, checked in the context they are **read** in.
 *
 * Two failures this catches, both invisible in the repo and visible to every user of the
 * published package:
 *
 * - a link from a shipped file to a file that does not ship. `.agentDocs/` is deliberately
 *   outside `package.json#files`, so a link into it resolves here and 404s on npm.
 * - a link to a heading that was renamed or never existed. The anchor is invented from memory far
 *   more often than it is mistyped, and nothing else checks it.
 *
 * The shipped set is derived from `package.json#files` rather than restated, so moving a file
 * between published and unpublished changes this test's subject.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Every path `package.json#files` publishes, as repo-relative POSIX paths. */
function shippedPaths(): Set<string> {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { files?: string[] }
  const out = new Set<string>()
  const walk = (relative: string): void => {
    const absolute = path.join(root, relative)
    if (!fs.existsSync(absolute))
      return
    if (fs.statSync(absolute).isDirectory()) {
      for (const entry of fs.readdirSync(absolute))
        walk(path.posix.join(relative, entry))
      return
    }
    out.add(relative)
  }
  for (const entry of manifest.files ?? [])
    walk(entry.replace(/\/$/, ''))
  return out
}

/**
 * A heading as GitHub anchors it.
 *
 * Validated against known-working links rather than written from a guess: the sibling repo's
 * README links to its own emoji headings, and all nine resolve under this function. The rule that
 * matters is that an emoji is **removed without its space**, so `## 🛠 CLI` anchors as `#-cli` and
 * not `#cli` — trimming the hyphen reports working links as broken.
 */
function anchorOf(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/gu, '')
    .replace(/\s/g, '-')
}

/** Every anchor a document defines, ignoring fenced code. */
function anchorsIn(text: string): Set<string> {
  const out = new Set<string>()
  let fenced = false
  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      fenced = !fenced
      continue
    }
    if (fenced)
      continue
    const match = /^#{1,6}\s+(.*)$/.exec(line)
    if (match)
      out.add(anchorOf(match[1]!))
  }
  return out
}

const shipped = shippedPaths()
const shippedDocs = [...shipped].filter(file => file.endsWith('.md')).sort()
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8')
const cache = new Map<string, Set<string>>()
const anchorsOf = (relative: string): Set<string> => {
  if (!cache.has(relative))
    cache.set(relative, anchorsIn(read(relative)))
  return cache.get(relative)!
}

describe('the shipped docs link only to what ships', () => {
  it('publishes the docs this test assumes, so a change to `files` moves it', () => {
    // Not tautological: if `docs` left the published list, the rest of this file would have no
    // subject and would pass while checking nothing.
    expect(shippedDocs).toContain('README.md')
    expect(shippedDocs.length).toBeGreaterThan(1)
    // The agent-facing directory is deliberately unpublished — the boundary this file guards.
    expect(shipped.has('AGENTS.md')).toBe(false)
    expect([...shipped].some(file => file.startsWith('.agentDocs/'))).toBe(false)
  })

  it('never links from a shipped file to an unpublished one', () => {
    const offenders: string[] = []
    for (const doc of shippedDocs) {
      const directory = path.posix.dirname(doc)
      for (const match of read(doc).matchAll(/\]\(([^)]+)\)/g)) {
        const target = (match[1] ?? '').trim()
        if (target.startsWith('http') || target.startsWith('mailto:') || target.startsWith('#'))
          continue
        const file = target.split('#')[0] ?? ''
        if (file.length === 0)
          continue
        const resolved = path.posix.normalize(path.posix.join(directory, file))
        if (!shipped.has(resolved))
          offenders.push(`${doc} -> ${target}${fs.existsSync(path.join(root, resolved)) ? ' (exists here, does not ship)' : ' (missing)'}`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  /**
   * The rule is **validated against links known to work**, not assumed — a checker with a wrong
   * anchor rule reports working links as broken, which is worse than no checker. Every pair below
   * is a heading and the anchor the sibling repository's own README already links to for it, so
   * the expectation comes from a working link rather than from this function.
   *
   * The case that broke the first version: an emoji is removed **without its space**, so the
   * leading hyphen stays and `## 🛠 CLI` is `#-cli`. Trimming it reports working links as broken.
   */
  it('anchors a heading the way GitHub does, validated against working links', () => {
    const measured: Array<[string, string]> = [
      ['🛠 CLI', '-cli'],
      ['🤖 Agents, scripts and tools', '-agents-scripts-and-tools'],
      ['🗂 Workspaces', '-workspaces'],
      ['🎨 Bring your own UI (BYOU)', '-bring-your-own-ui-byou'],
      ['🤔 Why?', '-why'],
      // Ours, and the punctuation-heavy shapes this repo actually has.
      ['Plain heading', 'plain-heading'],
      ['KillMode=process: a restart must not take the entries with it',
        'killmodeprocess-a-restart-must-not-take-the-entries-with-it'],
      ['What `/_hh` does not offer, deliberately', 'what-_hh-does-not-offer-deliberately'],
    ]
    for (const [heading, anchor] of measured)
      expect(anchorOf(heading), heading).toBe(anchor)
  })

  it('links only to anchors its target actually defines', () => {
    const offenders: string[] = []
    for (const doc of shippedDocs) {
      const directory = path.posix.dirname(doc)
      for (const match of read(doc).matchAll(/\]\(([^)]+)\)/g)) {
        const target = (match[1] ?? '').trim()
        if (target.startsWith('http') || target.startsWith('mailto:'))
          continue
        const hash = target.indexOf('#')
        if (hash === -1)
          continue
        const file = target.slice(0, hash)
        const anchor = target.slice(hash + 1)
        if (anchor.length === 0)
          continue
        const resolved = file.length === 0 ? doc : path.posix.normalize(path.posix.join(directory, file))
        if (!shipped.has(resolved))
          continue
        if (!anchorsOf(resolved).has(anchor))
          offenders.push(`${doc} -> ${target}`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
