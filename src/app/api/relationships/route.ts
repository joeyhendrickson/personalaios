import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { RI } from '@/lib/relationship-intel/schema'

const createPersonSchema = z.object({
  name: z.string().min(1).max(200),
  notes: z.string().max(20_000).optional(),
  perceived_relationship_state: z.enum(['clean', 'neutral', 'damaged']).optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: people, error } = await supabase
      .from(RI.people)
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: scores } = await supabase
      .from(RI.relationship_scores)
      .select('*')
      .eq('user_id', user.id)

    const scoreByPerson = Object.fromEntries((scores ?? []).map((s) => [s.person_id, s]))

    return NextResponse.json({
      people: (people ?? []).map((p) => ({
        ...p,
        scores: scoreByPerson[p.id] ?? null,
      })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = createPersonSchema.parse(await request.json())
    const { data: row, error } = await supabase
      .from(RI.people)
      .insert({
        user_id: user.id,
        name: body.name,
        notes: body.notes ?? null,
        perceived_relationship_state: body.perceived_relationship_state ?? 'neutral',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ person: row }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
