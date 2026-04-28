import type { RelationshipScoreResult } from './types'

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export interface ScoreInputs {
  /** Days since last meaningful touch (contact_history or manual last_contact_date). */
  daysSinceLastContact: number | null
  /** Target cadence in days (from relationships.contact_frequency_days). */
  preferredCadenceDays: number
  /** Rolling counts from interactions / contact_history. */
  positiveCount30d: number
  negativeCount30d: number
  /** Optional 0–1 engagement from product (e.g. replies). */
  replyRate?: number
}

/**
 * Deterministic, explainable scores (no ML). Tune weights via product analytics.
 * - recency: higher when contact is recent vs preferred cadence
 * - attention: higher when overdue for outreach
 * - health: blend of sentiment balance + recency
 */
export function computeRelationshipScores(input: ScoreInputs): RelationshipScoreResult {
  const cadence = Math.max(1, input.preferredCadenceDays)
  const days = input.daysSinceLastContact ?? cadence * 2

  const overdueRatio = days / cadence
  const recencyScore = clamp(Math.round(100 * Math.exp(-days / (cadence * 1.5))), 0, 100)
  const attentionScore = clamp(
    Math.round(100 * (1 - Math.exp(-Math.max(0, overdueRatio - 1)))),
    0,
    100
  )

  const netSentiment = input.positiveCount30d - input.negativeCount30d * 1.5
  const sentimentBoost = clamp(50 + netSentiment * 8, 0, 100)
  const reply = input.replyRate != null ? clamp(input.replyRate * 100, 0, 100) : 70
  const healthScore = clamp(
    Math.round(recencyScore * 0.45 + sentimentBoost * 0.35 + reply * 0.2),
    0,
    100
  )

  return {
    healthScore,
    attentionScore,
    recencyScore,
    components: {
      days_since_last_contact: days,
      preferred_cadence_days: cadence,
      overdue_ratio: overdueRatio,
      positive_30d: input.positiveCount30d,
      negative_30d: input.negativeCount30d,
      sentiment_boost: sentimentBoost,
      reply_component: reply,
    },
  }
}
