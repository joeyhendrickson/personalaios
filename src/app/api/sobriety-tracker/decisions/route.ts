import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { addDays } from '@/lib/sobriety/streak'
import { syncSobrietyBadges } from '@/lib/sobriety/award'

const decisionSchema = z.object({
  drink_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day_offset: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  content: z.string().max(8000),
  has_rumination: z.boolean().optional(),
})

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

    const body = decisionSchema.parse(await request.json())
    const { data: drinkLog } = await supabase
      .from('sobriety_daily_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('log_date', body.drink_date)
      .maybeSingle()

    const { data, error } = await supabase
      .from('sobriety_decision_logs')
      .upsert(
        {
          user_id: user.id,
          drink_log_id: drinkLog?.id ?? null,
          drink_date: body.drink_date,
          day_offset: body.day_offset,
          content: body.content,
          has_rumination: body.has_rumination ?? false,
        },
        { onConflict: 'user_id,drink_date,day_offset' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save decision', details: error.message },
        { status: 500 }
      )
    }

    await syncSobrietyBadges(supabase, user.id)
    return NextResponse.json({
      decision: data,
      relatedDate: addDays(body.drink_date, body.day_offset),
      success: true,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      {
        error: 'Failed to save decision',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
