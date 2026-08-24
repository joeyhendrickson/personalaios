import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { awardSoberDayPoints, syncSobrietyBadges } from '@/lib/sobriety/award'
import { computeDrinkSavings } from '@/lib/sobriety/savings'
import { computeSoberStreak, countSoberDays } from '@/lib/sobriety/streak'
import { buildAfterDrinkBiometrics } from '@/lib/sobriety/after-drink-biometrics'
import { SOBRIETY_BADGES } from '@/lib/sobriety/badges'
import { SOBRIETY_POINTS_PER_SOBER_DAY } from '@/lib/sobriety/types'

const logSchema = z.object({
  log_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  drank: z.boolean(),
  drink_count: z.number().int().min(0).max(50).optional(),
  estimated_spend: z.number().min(0).max(10000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  source: z.enum(['manual', 'budget_place']).optional(),
})

async function defaultProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('sobriety_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (data) return data
  const { data: created } = await supabase
    .from('sobriety_profiles')
    .upsert(
      {
        user_id: userId,
        typical_drink_cost: 8,
        typical_drinks_per_week: 7,
        typical_drink_label: 'drink',
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()
  return created
}

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

    const profile = await defaultProfile(supabase, user.id)

    const [
      { data: logs },
      { data: decisions },
      { data: places },
      { data: badges },
      energyRes,
      bioRes,
    ] = await Promise.all([
      supabase
        .from('sobriety_daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(365),
      supabase
        .from('sobriety_decision_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('drink_date', { ascending: false })
        .limit(200),
      supabase
        .from('sobriety_influence_places')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen_date', { ascending: false }),
      supabase
        .from('sobriety_user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false }),
      supabase
        .from('fitness_energy_history')
        .select('log_date, stress_level, self_energy_level, sleep_hours')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(90),
      supabase
        .from('fitness_biometrics')
        .select(
          'sync_date, recorded_at, stress_level_1_10, contextual_energy_level_1_10, energy_level_self_1_10, sleep_hours'
        )
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(90),
    ])

    const energyRows = energyRes.error ? [] : energyRes.data || []
    const bioRows = bioRes.error ? [] : bioRes.data || []

    const today = new Date().toISOString().slice(0, 10)
    const dailyLogs = logs || []
    const streak = computeSoberStreak(dailyLogs, today)
    const soberDays = countSoberDays(dailyLogs)
    const savings = computeDrinkSavings({
      typicalDrinkCost: Number(profile?.typical_drink_cost ?? 8),
      typicalDrinksPerWeek: Number(profile?.typical_drinks_per_week ?? 7),
      soberDayCount: soberDays,
    })
    const todaysLog = dailyLogs.find((l) => l.log_date === today) || null
    const drinkLogs = dailyLogs.filter((l) => l.drank)
    const afterDrink = buildAfterDrinkBiometrics(
      drinkLogs.map((l) => ({ log_date: l.log_date, drink_count: l.drink_count })),
      energyRows,
      bioRows
    )
    const recentRumination = (decisions || []).some((d) => d.has_rumination)

    return NextResponse.json({
      profile,
      logs: dailyLogs,
      decisions: decisions || [],
      places: places || [],
      highlightedPlaces: (places || []).filter((p) => p.highlighted && p.user_confirmed),
      badges: {
        catalog: SOBRIETY_BADGES,
        earned: badges || [],
      },
      streak,
      soberDays,
      savings,
      todaysLog,
      afterDrink,
      recentRumination,
      pointsPerSoberDay: SOBRIETY_POINTS_PER_SOBER_DAY,
      today,
    })
  } catch (error) {
    console.error('Sobriety tracker GET failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to load Sobriety Tracker',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
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

    const body = logSchema.parse(await request.json())
    const logDate = body.log_date || new Date().toISOString().slice(0, 10)
    const drank = body.drank
    const drinkCount = drank ? (body.drink_count ?? 1) : 0

    const { data: existing } = await supabase
      .from('sobriety_daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', logDate)
      .maybeSingle()

    const payload = {
      user_id: user.id,
      log_date: logDate,
      drank,
      drink_count: drinkCount,
      estimated_spend: drank ? (body.estimated_spend ?? null) : 0,
      notes: body.notes ?? null,
      source: body.source ?? 'manual',
      points_awarded: existing?.points_awarded ?? 0,
    }

    const { data: entry, error: upsertError } = await supabase
      .from('sobriety_daily_logs')
      .upsert(payload, { onConflict: 'user_id,log_date' })
      .select()
      .single()

    if (upsertError || !entry) {
      return NextResponse.json(
        { error: 'Failed to save log', details: upsertError?.message },
        { status: 500 }
      )
    }

    let pointsAwarded = entry.points_awarded || 0
    if (!drank) {
      pointsAwarded = await awardSoberDayPoints(supabase, user.id, {
        id: entry.id,
        log_date: entry.log_date,
        drank: entry.drank,
        points_awarded: entry.points_awarded,
      })
      entry.points_awarded = pointsAwarded
    }

    const newBadges = await syncSobrietyBadges(supabase, user.id)

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: drank ? 'sobriety_drink_logged' : 'sobriety_sober_day',
      description: drank
        ? `Logged ${drinkCount} drink(s) on ${logDate}`
        : `Logged a sober day on ${logDate}`,
      metadata: { log_date: logDate, drink_count: drinkCount, points: pointsAwarded },
    })

    return NextResponse.json({ entry, pointsAwarded, newBadges, success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Sobriety tracker POST failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to save log',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await supabase
      .from('sobriety_daily_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete log', details: error.message },
        { status: 500 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete log',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
