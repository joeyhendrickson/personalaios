import { generateObject } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildPersonIntelligenceProfile } from './profile-aggregate'
import { RI } from './schema'
import type { InteractionRow, PersonRow } from './types'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterVercelSdkCall } from '@/lib/ai/usage-logger'

const planSchema = z.object({
  deepen_connection: z.array(z.string()).max(8),
  align_on_goals: z.array(z.string()).max(8),
})

export type RelationshipGrowthPlan = z.infer<typeof planSchema>

export async function generateRelationshipGrowthPlan(
  supabase: SupabaseClient,
  userId: string,
  personId: string,
  options?: { route?: string }
): Promise<{ ok: true; data: RelationshipGrowthPlan } | { ok: false; error: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: 'OPENAI_API_KEY is not configured' }
  }

  const { data: person, error: pe } = await supabase
    .from(RI.people)
    .select('*')
    .eq('id', personId)
    .eq('user_id', userId)
    .maybeSingle()
  if (pe || !person) return { ok: false, error: 'Person not found' }

  const since = new Date(Date.now() - 28 * 86_400_000).toISOString()
  const { data: interactions } = await supabase
    .from(RI.interactions)
    .select('*')
    .eq('person_id', personId)
    .eq('user_id', userId)
    .gte('interaction_at', since)
    .order('interaction_at', { ascending: true })

  const { data: links } = await supabase
    .from(RI.person_goal_links)
    .select('goal_id, link_type, strength, evidence')
    .eq('person_id', personId)
    .eq('user_id', userId)

  const goalIds = [...new Set((links ?? []).map((l) => l.goal_id))]
  let goalLines = ''
  if (goalIds.length > 0) {
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title')
      .in('id', goalIds)
      .eq('user_id', userId)
    const linkRows = links ?? []
    goalLines = (goals ?? [])
      .map((g: { id: string; title: string }) => {
        const link = linkRows.find((l) => String(l.goal_id) === String(g.id))
        return `- ${g.title} (${link?.link_type}, strength ${link?.strength}) evidence: ${link?.evidence ?? ''}`
      })
      .join('\n')
  }

  const p = person as PersonRow
  const ix = (interactions ?? []) as InteractionRow[]
  const profile = buildPersonIntelligenceProfile(p, ix)

  const ixBlock = ix.map((i) => `[${i.type}] ${i.interaction_at}: ${i.content}`).join('\n---\n')

  const system = `You help the user strengthen a specific relationship and align on goals.

Rules:
1) Only suggest moves that are grounded in the provided interactions, notes bullets, or linked goals evidence.
2) Each bullet is a concrete, respectful action the user can take (no manipulation, no fake urgency).
3) If data is thin, output fewer bullets — never invent shared history.
4) "deepen_connection" = social trust, presence, appreciation, shared experience follow-ups supported by text.
5) "align_on_goals" = small collaborative steps tied to stated goals/evidence.`

  const user = `Person: ${p.name}
State: ${p.perceived_relationship_state}
Notes (verbatim):
"""
${p.notes ?? ''}
"""

Profile aggregate (derived only from logs):
${JSON.stringify(profile.extracted, null, 2)}

Linked goals:
${goalLines || '(none)'}

Interactions:
${ixBlock || '(none)'}`

  const startMs = Date.now()
  const modelId = resolveOpenAIModelId()
  try {
    const result = await generateObject({
      model: defaultOpenaiModel(),
      schema: planSchema,
      system,
      prompt: user,
      temperature: 0.35,
    })
    await logAfterVercelSdkCall({
      startMs,
      userId,
      module: 'relationship_intel',
      action: 'generate_relationship_growth_plan',
      route: options?.route ?? null,
      model: modelId,
      description: 'Generated relationship growth ideas from saved context.',
      result,
    })
    return { ok: true, data: result.object }
  } catch (e) {
    await logAfterVercelSdkCall({
      startMs,
      userId,
      module: 'relationship_intel',
      action: 'generate_relationship_growth_plan',
      route: options?.route ?? null,
      model: modelId,
      description: 'Generated relationship growth ideas from saved context.',
      status: 'failed',
      error: e instanceof Error ? e.message : 'Model error',
    })
    return { ok: false, error: e instanceof Error ? e.message : 'Model error' }
  }
}
