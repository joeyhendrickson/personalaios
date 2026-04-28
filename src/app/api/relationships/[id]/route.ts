import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buildPersonIntelligenceProfile } from '@/lib/relationship-intel/profile-aggregate'
import { RI } from '@/lib/relationship-intel/schema'
import type { InteractionRow, PersonRow } from '@/lib/relationship-intel/types'

const WINDOW_MS = 28 * 86_400_000

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  notes: z.string().max(20_000).nullable().optional(),
  perceived_relationship_state: z.enum(['clean', 'neutral', 'damaged']).optional(),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: person, error: pe } = await supabase
      .from(RI.people)
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (pe || !person) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const since = new Date(Date.now() - WINDOW_MS).toISOString()
    const { data: interactions } = await supabase
      .from(RI.interactions)
      .select('*')
      .eq('person_id', id)
      .eq('user_id', user.id)
      .gte('interaction_at', since)
      .order('interaction_at', { ascending: false })

    const { data: scores } = await supabase
      .from(RI.relationship_scores)
      .select('*')
      .eq('person_id', id)
      .maybeSingle()

    const { data: links } = await supabase
      .from(RI.person_goal_links)
      .select('*')
      .eq('person_id', id)
      .eq('user_id', user.id)

    const goalIds = [...new Set((links ?? []).map((l) => l.goal_id))]
    let goals: Record<string, { id: string; title: string; category: string | null }> = {}
    if (goalIds.length > 0) {
      const { data: gRows } = await supabase
        .from('goals')
        .select('id, title, category')
        .in('id', goalIds)
        .eq('user_id', user.id)
      goals = Object.fromEntries((gRows ?? []).map((g) => [g.id, g]))
    }

    const goalLinks = (links ?? []).map((l) => ({
      ...l,
      goal: goals[l.goal_id] ?? null,
    }))

    const ix = (interactions ?? []) as InteractionRow[]
    const profile = buildPersonIntelligenceProfile(person as PersonRow, ix)

    return NextResponse.json({
      person,
      interactions: interactions ?? [],
      scores: scores ?? null,
      goalLinks,
      profile,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = patchSchema.parse(await request.json())
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.perceived_relationship_state !== undefined) {
      updates.perceived_relationship_state = body.perceived_relationship_state
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates' }, { status: 400 })
    }

    const { data: person, error } = await supabase
      .from(RI.people)
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !person) {
      return NextResponse.json(
        { error: error?.message ?? 'Not found' },
        { status: error ? 500 : 404 }
      )
    }

    return NextResponse.json({ person })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
