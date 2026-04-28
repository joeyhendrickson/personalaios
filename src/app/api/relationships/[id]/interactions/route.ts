import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { RI } from '@/lib/relationship-intel/schema'
import { extractInteractionMetadata } from '@/lib/relationship-intel/extract-interaction'
import { refreshScoresForPerson } from '@/lib/relationship-intel/refresh-scores'

const interactionSchema = z.object({
  type: z.enum(['message', 'call', 'hangout', 'project', 'other']),
  content: z.string().min(1).max(100_000),
  extract: z.boolean().optional().default(true),
  timestamp: z
    .string()
    .optional()
    .refine((s) => s === undefined || !Number.isNaN(Date.parse(s)), {
      message: 'Invalid timestamp',
    }),
})

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

    const body = interactionSchema.parse(await request.json())
    const { data: person } = await supabase
      .from(RI.people)
      .select('id')
      .eq('id', personId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    const interactionAt =
      body.timestamp !== undefined
        ? new Date(body.timestamp).toISOString()
        : new Date().toISOString()

    let extraction: Record<string, unknown> = {}
    if (body.extract) {
      const parsed = await extractInteractionMetadata(body.content, body.type, {
        userId: user.id,
        route: `/api/relationships/${personId}/interactions`,
      })
      if (parsed) extraction = parsed as unknown as Record<string, unknown>
    }

    const { data: row, error } = await supabase
      .from(RI.interactions)
      .insert({
        user_id: user.id,
        person_id: personId,
        type: body.type,
        content: body.content,
        interaction_at: interactionAt,
        extraction,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await refreshScoresForPerson(supabase, user.id, personId)

    return NextResponse.json({ interaction: row }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 })
    }
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
