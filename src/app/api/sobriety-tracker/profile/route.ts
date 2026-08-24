import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { syncSobrietyBadges } from '@/lib/sobriety/award'

const profileSchema = z.object({
  typical_drink_cost: z.number().min(0).max(500),
  typical_drinks_per_week: z.number().min(0).max(100),
  typical_drink_label: z.string().min(1).max(80).optional(),
  sobriety_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = profileSchema.parse(await request.json())
    const { data, error } = await supabase
      .from('sobriety_profiles')
      .upsert(
        {
          user_id: user.id,
          typical_drink_cost: body.typical_drink_cost,
          typical_drinks_per_week: body.typical_drinks_per_week,
          typical_drink_label: body.typical_drink_label || 'drink',
          sobriety_start_date: body.sobriety_start_date ?? null,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save profile', details: error.message },
        { status: 500 }
      )
    }

    await syncSobrietyBadges(supabase, user.id)
    return NextResponse.json({ profile: data, success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      {
        error: 'Failed to save profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
