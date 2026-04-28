import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RI } from '@/lib/relationship-intel/schema'

/**
 * Who can help with this goal — people linked with evidence, ranked by link strength then friend score.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: goalId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: goal, error: gErr } = await supabase
      .from('goals')
      .select('id, title, status')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (gErr || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const { data: linksRaw } = await supabase
      .from(RI.person_goal_links)
      .select('person_id, link_type, strength, evidence')
      .eq('user_id', user.id)
      .eq('goal_id', goalId)

    const links = (linksRaw ?? []).filter((l) => l.link_type !== 'none')

    const personIds = [...new Set(links.map((l) => l.person_id as string))]
    if (personIds.length === 0) {
      return NextResponse.json({
        goal,
        people: [],
        underutilized_hint:
          'No one is linked to this goal yet — add links from Relationship Intel with evidence.',
      })
    }

    const { data: people } = await supabase
      .from(RI.people)
      .select('id, name')
      .in('id', personIds)
      .eq('user_id', user.id)

    const { data: scores } = await supabase
      .from(RI.relationship_scores)
      .select('person_id, friend_score, goal_score, trajectory_score')
      .eq('user_id', user.id)
      .in('person_id', personIds)

    const scoreBy = Object.fromEntries((scores ?? []).map((s) => [s.person_id, s]))
    const nameBy = Object.fromEntries((people ?? []).map((p) => [p.id, p.name]))

    const merged = (links ?? []).map((l) => {
      const pid = l.person_id as string
      const sc = scoreBy[pid] as
        | { friend_score: number; goal_score: number; trajectory_score: number }
        | undefined
      const rank =
        (l.strength as number) * 0.55 +
        (sc?.friend_score ?? 0) * 0.25 +
        (sc?.trajectory_score ?? 0) * 0.2
      return {
        person_id: pid,
        name: nameBy[pid] ?? 'Unknown',
        link_type: l.link_type,
        strength: l.strength,
        evidence: l.evidence,
        friend_score: sc?.friend_score ?? null,
        goal_score: sc?.goal_score ?? null,
        trajectory_score: sc?.trajectory_score ?? null,
        rank,
        underutilized: (sc?.goal_score ?? 0) > 0.55 && (l.strength as number) < 0.45,
      }
    })

    merged.sort((a, b) => b.rank - a.rank)

    return NextResponse.json({
      goal,
      people: merged,
      note: 'underutilized flags high global goal relevance but weak explicit link strength — good candidates to deepen evidence-based collaboration.',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
