/**
 * A near-miss suggestion for a refusal that already knows the valid set.
 *
 * "unknown endpoint \"servers.lst\"" makes a reader consult the source. The valid names are in
 * hand where the refusal is made, so the message can name the one probably meant.
 *
 * **A wrong hint is worse than silence.** An unrelated name sends a reader somewhere that cannot
 * be what they wanted, while no name sends them to the list. So the bound errs toward silence,
 * and it needs **two** conditions:
 *
 * - a **ratio** alone is right for long names and wrong for short ones, because short names share
 *   prefixes: `--no-open` scores 3 against `--no-yes` and passes a ratio bound of 3, naming an
 *   unrelated flag;
 * - so the distance must also be small in **absolute** terms.
 *
 * Measured over the 26 RPC endpoints, this scores a typo correctly or stays silent, never
 * suggesting an unrelated name. `servers.zzz` and the other shared-prefix nonsense stay silent,
 * because `servers.` alone is 8 characters of the distance.
 */

/** Levenshtein distance, iterative, two rows of state. */
export function editDistance(left: string, right: string): number {
  if (left === right)
    return 0
  if (left.length === 0 || right.length === 0)
    return Math.max(left.length, right.length)
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row, ...Array.from({ length: right.length }, () => 0)]
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = (previous[column - 1] ?? 0) + (left[row - 1] === right[column - 1] ? 0 : 1)
      current[column] = Math.min((previous[column] ?? 0) + 1, (current[column - 1] ?? 0) + 1, substitution)
    }
    previous = current
  }
  return previous[right.length] ?? 0
}

/**
 * Whether a distance is small enough to claim a near miss.
 *
 * The absolute ceiling keeps a shared shape from carrying a match; the ratio keeps a long name
 * from absorbing a distant one. Short names get the stricter rule, so a two-character difference
 * between three-letter names is not a near miss.
 */
function withinRange(distance: number, candidate: string, given: string): boolean {
  const shorter = Math.min(candidate.length, given.length)
  if (distance > 2)
    return false
  if (shorter <= 3)
    return distance <= 1
  return distance <= Math.floor(shorter / 3)
}

/** The one valid name probably meant, or null when nothing is close enough to claim. */
export function suggestName(given: string, valid: readonly string[]): string | null {
  const needle = given.trim().toLowerCase()
  if (needle.length === 0)
    return null
  // A name that is already valid has no typo to correct. Without this, one real endpoint
  // suggests another: `servers.start` and `servers.restart` are distance 2 apart, so asking
  // about the former would answer "did you mean servers.restart?" — a wrong hint, and the exact
  // failure this helper exists to avoid. The caller only reaches its refusal for an unknown
  // name, but the rule belongs here so the helper is safe to reuse.
  if (valid.some(name => name.toLowerCase() === needle))
    return null
  let best: { name: string, distance: number } | null = null
  for (const name of valid) {
    const lower = name.toLowerCase()
    const distance = editDistance(needle, lower)
    if (!withinRange(distance, lower, needle))
      continue
    // Ties break toward the earlier entry, so the answer is stable across runs.
    if (best === null || distance < best.distance)
      best = { name, distance }
  }
  return best?.name ?? null
}
