import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { RI } from '@/lib/relationship-intel/schema'
import { refreshScoresForPerson } from '@/lib/relationship-intel/refresh-scores'

const bodySchema = z.object({
  goal_id: z.string().uuid(),
  link_type: z.enum(['advisor', 'collaborator', 'potential', 'none']),
  strength: z.number().min(0).max(1),
  evidence: z.string().max(8000).optional(),
})

/** Upserts a person↔goal link (MVP helper; keeps goal_score grounded in explicit evidence). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: personId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = bodySchema.parse(await request.json())
    const { data: person } = await supabase
      .from(RI.people)
      .select('id')
      .eq('id', personId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    const { data: goal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', body.goal_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const { data: row, error } = await supabase
      .from(RI.person_goal_links)
      .upsert(
        {
          user_id: user.id,
          person_id: personId,
          goal_id: body.goal_id,
          link_type: body.link_type,
          strength: body.strength,
          evidence: body.evidence ?? null,
        },
        { onConflict: 'person_id,goal_id' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await refreshScoresForPerson(supabase, user.id, personId)

    return NextResponse.json({ person_goal_link: row })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
