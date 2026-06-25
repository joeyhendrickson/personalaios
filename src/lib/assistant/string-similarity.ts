/** Normalize titles for fuzzy matching in Advisor actions. */
export function normalizeMatchText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/** 0–1 similarity score (1 = identical). */
export function titleSimilarity(a: string, b: string): number {
  const left = normalizeMatchText(a)
  const right = normalizeMatchText(b)
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) return 0.92

  const leftTokens = new Set(left.split(' ').filter(Boolean))
  const rightTokens = new Set(right.split(' ').filter(Boolean))
  const intersection = [...leftTokens].filter((t) => rightTokens.has(t)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  const jaccard = union > 0 ? intersection / union : 0

  const longer = left.length >= right.length ? left : right
  const shorter = left.length >= right.length ? right : left
  const editScore =
    longer.length === 0 ? 0 : (longer.length - levenshteinDistance(longer, shorter)) / longer.length

  return Math.max(jaccard, editScore)
}
