/** Sum only positive ledger entries (points earned), ignoring progress reversals and adjustments. */
export function sumEarnedPoints(
  entries: Array<{ points?: number | null }> | null | undefined
): number {
  if (!entries?.length) return 0
  return entries.reduce((sum, entry) => {
    const points = Number(entry.points) || 0
    return points > 0 ? sum + points : sum
  }, 0)
}
