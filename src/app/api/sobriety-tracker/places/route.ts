import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { syncSobrietyBadges } from '@/lib/sobriety/award'

const confirmSchema = z.object({
  places: z
    .array(
      z.object({
        merchant_name: z.string().min(1).max(200),
        category: z.enum(['bar', 'restaurant', 'other']),
        visit_count: z.number().int().min(1).optional(),
        total_spend: z.number().min(0).optional(),
        last_seen_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        sample_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
        transaction_ids: z.array(z.string()).optional(),
        add_dates_to_log: z.boolean().optional(),
        counts_as_sober_outing: z.boolean().optional(),
      })
    )
    .min(1)
    .max(40),
})

const patchSchema = z.object({
  id: z.string().uuid(),
  highlighted: z.boolean().optional(),
  user_confirmed: z.boolean().optional(),
  counts_as_sober_outing: z.boolean().optional(),
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

    const body = confirmSchema.parse(await request.json())
    const savedPlaces = []
    const addedLogDates: string[] = []

    for (const place of body.places) {
      const { data: row, error } = await supabase
        .from('sobriety_influence_places')
        .upsert(
          {
            user_id: user.id,
            merchant_name: place.merchant_name,
            category: place.category,
            visit_count: place.visit_count ?? 1,
            last_seen_date: place.last_seen_date ?? null,
            total_spend: place.total_spend ?? 0,
            highlighted: place.counts_as_sober_outing ? false : true,
            user_confirmed: true,
            counts_as_sober_outing: Boolean(place.counts_as_sober_outing),
          },
          { onConflict: 'user_id,merchant_name' }
        )
        .select()
        .single()

      if (error || !row) {
        console.error('Failed to upsert influence place:', error)
        continue
      }
      savedPlaces.push(row)

      const dates = place.sample_dates?.length
        ? place.sample_dates
        : place.last_seen_date
          ? [place.last_seen_date]
          : []

      for (const visitDate of dates) {
        await supabase.from('sobriety_place_visits').insert({
          user_id: user.id,
          place_id: row.id,
          transaction_id: place.transaction_ids?.[0] ?? null,
          visit_date: visitDate,
          amount: place.total_spend ?? null,
          merchant_name: place.merchant_name,
          added_to_log: Boolean(place.add_dates_to_log),
        })

        if (!place.add_dates_to_log || place.counts_as_sober_outing) continue

        const { data: existing } = await supabase
          .from('sobriety_daily_logs')
          .select('id, drank, drink_count, points_awarded, notes')
          .eq('user_id', user.id)
          .eq('log_date', visitDate)
          .maybeSingle()

        if (existing?.drank) continue

        const payload: Record<string, unknown> = {
          user_id: user.id,
          log_date: visitDate,
          drank: true,
          drink_count: Math.max(existing?.drink_count || 0, 1),
          notes: existing?.notes || `Added from Budget Master place: ${place.merchant_name}`,
          source: 'budget_place',
        }
        if (!existing) payload.points_awarded = 0

        await supabase
          .from('sobriety_daily_logs')
          .upsert(payload, { onConflict: 'user_id,log_date' })
        addedLogDates.push(visitDate)
      }
    }

    const newBadges = await syncSobrietyBadges(supabase, user.id)
    return NextResponse.json({
      places: savedPlaces,
      addedLogDates: [...new Set(addedLogDates)],
      newBadges,
      success: true,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      {
        error: 'Failed to save places',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
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
    if (typeof body.highlighted === 'boolean') updates.highlighted = body.highlighted
    if (typeof body.user_confirmed === 'boolean') updates.user_confirmed = body.user_confirmed
    if (typeof body.counts_as_sober_outing === 'boolean') {
      updates.counts_as_sober_outing = body.counts_as_sober_outing
    }

    const { data, error } = await supabase
      .from('sobriety_influence_places')
      .update(updates)
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update place', details: error.message },
        { status: 500 }
      )
    }
    return NextResponse.json({ place: data, success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      {
        error: 'Failed to update place',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
