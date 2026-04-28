import { generateObject } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NEXT_MOVE_SYSTEM_PROMPT, buildNextMoveUserPrompt } from './prompt'
import { buildPersonIntelligenceProfile } from './profile-aggregate'
import { RI } from './schema'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterVercelSdkCall } from '@/lib/ai/usage-logger'
import type {
  GoalRow,
  InteractionRow,
  NextMoveResult,
  PersonGoalLinkRow,
  PersonRow,
  RelationshipScoresRow,
} from './types'

const nextMoveSchema = z.object({
  type: z.enum(['strategic', 'social', 'maintenance', 'recovery']),
  action_type: z.enum([
    'advance_goal',
    'strengthen_relationship',
    'test_alignment',
    'correct_trajectory',
  ]),
  strategy: z.string().min(1).max(500),
  next_move: z.string().min(1).max(600),
  reasoning: z.string().min(1).max(1000),
  optional_message: z.string().nullable(),
  optional_activity: z.string().nullable(),
  optional_agenda: z.string().nullable(),
})

const WINDOW_MS = 28 * 86_400_000

async function loadContext(
  supabase: SupabaseClient,
  userId: string,
  personId: string
): Promise<{
  person: PersonRow
  interactions: InteractionRow[]
  scores: RelationshipScoresRow | null
  goalLinks: Array<PersonGoalLinkRow & { goal: GoalRow | null }>
} | null> {
  const { data: person, error: pErr } = await supabase
    .from(RI.people)
    .select('*')
    .eq('id', personId)
    .eq('user_id', userId)
    .maybeSingle()

  if (pErr || !person) return null

  const since = new Date(Date.now() - WINDOW_MS).toISOString()
  const { data: interactions } = await supabase
    .from(RI.interactions)
    .select('*')
    .eq('person_id', personId)
    .eq('user_id', userId)
    .gte('interaction_at', since)
    .order('interaction_at', { ascending: false })

  const { data: scores } = await supabase
    .from(RI.relationship_scores)
    .select('*')
    .eq('person_id', personId)
    .maybeSingle()

  const { data: links } = await supabase
    .from(RI.person_goal_links)
    .select('*')
    .eq('person_id', personId)
    .eq('user_id', userId)

  const goalIds = [...new Set((links ?? []).map((l) => l.goal_id))]
  let goalsById: Record<string, GoalRow> = {}
  if (goalIds.length > 0) {
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title, category')
      .in('id', goalIds)
      .eq('user_id', userId)
    goalsById = Object.fromEntries((goals ?? []).map((g) => [g.id, g as GoalRow]))
  }

  const goalLinks = (links ?? []).map((l) => ({
    ...(l as PersonGoalLinkRow),
    goal: goalsById[l.goal_id] ?? null,
  }))

  return {
    person: person as PersonRow,
    interactions: (interactions ?? []) as InteractionRow[],
    scores: scores as RelationshipScoresRow | null,
    goalLinks,
  }
}

function hasMinimumGrounding(interactions: InteractionRow[], notes: string | null): boolean {
  if (interactions.length > 0) return true
  return Boolean(notes?.trim())
}

const FALLBACK: NextMoveResult = {
  type: 'maintenance',
  action_type: 'strengthen_relationship',
  strategy:
    'WIIFT: you get accurate guidance; they get you showing up with context instead of guessing — once you add it.',
  next_move: 'Add a short note or paste a recent message thread for this person, then ask again.',
  reasoning:
    'There is no interaction text in the last four weeks and no notes to ground a suggestion without guessing.',
  optional_message: null,
  optional_activity: null,
  optional_agenda: null,
}

/**
 * Produces one grounded Suggested Next Move. Uses OpenAI only when there is
 * enough user-provided text to ground the model.
 */
export async function generateNextMove(
  supabase: SupabaseClient,
  userId: string,
  personId: string,
  options?: { route?: string }
): Promise<{ ok: true; data: NextMoveResult } | { ok: false; error: string }> {
  const ctx = await loadContext(supabase, userId, personId)
  if (!ctx) return { ok: false, error: 'Person not found' }

  if (!hasMinimumGrounding(ctx.interactions, ctx.person.notes)) {
    return { ok: true, data: FALLBACK }
  }

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: 'OPENAI_API_KEY is not configured' }
  }

  const sortedIx = [...ctx.interactions].sort(
    (a, b) => new Date(a.interaction_at).getTime() - new Date(b.interaction_at).getTime()
  )

  const profile = buildPersonIntelligenceProfile(ctx.person, sortedIx)

  const userPrompt = buildNextMoveUserPrompt({
    person: ctx.person,
    interactions: sortedIx,
    scores: ctx.scores,
    goalLinks: ctx.goalLinks,
    profileExtracted: profile.extracted,
  })

  const startMs = Date.now()
  const modelId = resolveOpenAIModelId()
  try {
    const result = await generateObject({
      model: defaultOpenaiModel(),
      schema: nextMoveSchema,
      system: NEXT_MOVE_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.35,
    })
    await logAfterVercelSdkCall({
      startMs,
      userId,
      module: 'relationship_intel',
      action: 'generate_next_move',
      route: options?.route ?? null,
      model: modelId,
      description: 'Generated a suggested next step from saved relationship context.',
      result,
    })
    return { ok: true, data: result.object as NextMoveResult }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Model error'
    await logAfterVercelSdkCall({
      startMs,
      userId,
      module: 'relationship_intel',
      action: 'generate_next_move',
      route: options?.route ?? null,
      model: modelId,
      description: 'Generated a suggested next step from saved relationship context.',
      status: 'failed',
      error: msg,
    })
    return { ok: false, error: msg }
  }
}
