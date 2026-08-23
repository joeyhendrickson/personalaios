import type { AdvisorVectorRetrieveResult } from './types'

const STRONG_MATCH_SCORE = 0.75

/** Only spend extra RAG passes when the first pass actually retrieved usable chunks. */
export function shouldUpgradeToMultiPass(
  result: AdvisorVectorRetrieveResult,
  confidenceThreshold = 0.8
): boolean {
  if (!result.usedRag || result.chunks.length === 0) return false
  return assessRetrievalQuality(result) < confidenceThreshold
}

export function assessRetrievalQuality(result: AdvisorVectorRetrieveResult): number {
  if (!result.usedRag || result.chunks.length === 0) {
    return 0.3
  }

  const includedChunks = result.chunks.filter((chunk) => chunk.includedInPrompt)
  if (includedChunks.length === 0) {
    return 0.4
  }

  const strongMatches = includedChunks.filter((chunk) => chunk.score >= STRONG_MATCH_SCORE).length
  const avgScore =
    includedChunks.reduce((sum, chunk) => sum + chunk.score, 0) / includedChunks.length
  const strongRatio = strongMatches / includedChunks.length
  const volumeBonus = Math.min(includedChunks.length / 8, 1) * 0.1

  return Math.min(strongRatio * 0.5 + avgScore * 0.4 + volumeBonus, 1)
}
