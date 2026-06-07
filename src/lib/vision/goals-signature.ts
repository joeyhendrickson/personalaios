/**
 * Stable signature of a user's goal IDs at the time their vision was aligned.
 * Used to detect when new goals were added (not edits, retitles, or progress).
 */
export function computeGoalsSignature(goals: Array<{ id?: string | null }>): string {
  return (goals || [])
    .map((g) => (g.id || '').trim())
    .filter(Boolean)
    .sort()
    .join('::')
}

/** Legacy signatures stored title|completion pairs before we tracked goal IDs only. */
function isLegacyGoalsSignature(signature: string): boolean {
  return signature.includes('|')
}

/**
 * True when the user has added at least one goal that did not exist when the
 * vision was last saved. Edits, retitles, completion, and progress do not count.
 */
export function goalsHaveNewAdditionsSinceSignature(
  storedSignature: string | null,
  goals: Array<{ id?: string | null }>
): boolean {
  if (!storedSignature || isLegacyGoalsSignature(storedSignature)) return false

  const storedIds = new Set(
    storedSignature
      .split('::')
      .map((s) => s.trim())
      .filter(Boolean)
  )
  if (storedIds.size === 0) return false

  return (goals || []).some((g) => g.id && !storedIds.has(g.id))
}
