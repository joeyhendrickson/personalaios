import { z } from 'zod'

/** Canonical person row in DB = `relationships` (existing LifeStacks table). */
export const relationshipConsentFlagsSchema = z.object({
  googlePeopleSync: z.boolean().optional(),
  eventSuggestions: z.boolean().optional(),
  aiOutreachDrafts: z.boolean().optional(),
  allowAutomatedReminders: z.boolean().optional(),
})

export type RelationshipConsentFlags = z.infer<typeof relationshipConsentFlagsSchema>

export const cachedScoresSchema = z.object({
  health: z.number().min(0).max(100).optional(),
  attention: z.number().min(0).max(100).optional(),
  recency: z.number().min(0).max(100).optional(),
  version: z.number().optional(),
})

export type CachedRelationshipScores = z.infer<typeof cachedScoresSchema>

export const relationshipNoteInputSchema = z.object({
  relationshipId: z.string().uuid(),
  body: z.string().min(1).max(20_000),
  isPinned: z.boolean().optional(),
})

export const outreachDraftInputSchema = z.object({
  relationshipId: z.string().uuid(),
  channel: z.enum(['sms', 'email']),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(16_000),
})

export const sentMessageLogSchema = z.object({
  relationshipId: z.string().uuid(),
  channel: z.enum(['sms', 'email']),
  provider: z.string(),
  providerMessageId: z.string().optional(),
  toFingerprint: z.string(),
  bodyPreview: z.string(),
  status: z.string(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type SentMessageLog = z.infer<typeof sentMessageLogSchema>

export const interactionSignalInputSchema = z.object({
  relationshipId: z.string().uuid(),
  contactHistoryId: z.string().uuid().optional(),
  signalType: z.string().min(1).max(120),
  weight: z.number().min(-10).max(10).default(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export interface RelationshipScoreResult {
  healthScore: number
  attentionScore: number
  recencyScore: number
  components: Record<string, number>
}

export interface EventCandidateInput {
  id: string
  title: string
  description?: string | null
  startAt?: Date | null
  zipCode?: string | null
  lat?: number | null
  lng?: number | null
  tags?: string[]
}

export interface ScoredEventRecommendation {
  eventCandidateId: string
  score: number
  reasons: string[]
}
