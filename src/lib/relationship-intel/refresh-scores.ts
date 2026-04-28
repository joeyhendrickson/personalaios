import type { SupabaseClient } from '@supabase/supabase-js'
import { computeRelationshipScores } from './scoring'
import { RI } from './schema'
import type { InteractionRow, PersonGoalLinkRow } from './types'

const WINDOW_MS = 28 * 86_400_000

export async function refreshScoresForPerson(
  supabase: SupabaseClient,
  userId: string,
  personId: string
): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString()

  const { data: person, error: pe } = await supabase
    .from(RI.people)
    .select('*')
    .eq('id', personId)
    .eq('user_id', userId)
    .maybeSingle()
  if (pe || !person) return

  const { data: interactions } = await supabase
    .from(RI.interactions)
    .select('*')
    .eq('person_id', personId)
    .eq('user_id', userId)
    .gte('interaction_at', since)

  const { data: links } = await supabase
    .from(RI.person_goal_links)
    .select('*')
    .eq('person_id', personId)
    .eq('user_id', userId)

  const goalIds = [...new Set((links ?? []).map((l: PersonGoalLinkRow) => l.goal_id))]
  let titles: string[] = []
  if (goalIds.length > 0) {
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title')
      .in('id', goalIds)
      .eq('user_id', userId)
    titles = (goals ?? []).map((g: { title: string }) => g.title)
  }

  const computed = computeRelationshipScores({
    interactions: (interactions ?? []) as InteractionRow[],
    notes: person.notes as string | null,
    perceivedState: person.perceived_relationship_state as 'clean' | 'neutral' | 'damaged',
    goalLinks: (links ?? []) as PersonGoalLinkRow[],
    goalTitlesForMention: titles,
  })

  await supabase.from(RI.relationship_scores).upsert(
    {
      person_id: personId,
      user_id: userId,
      friend_score: computed.friend_score,
      goal_score: computed.goal_score,
      trajectory_score: computed.trajectory_score,
      signals: computed.signals as unknown as Record<string, unknown>,
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'person_id' }
  )
}
