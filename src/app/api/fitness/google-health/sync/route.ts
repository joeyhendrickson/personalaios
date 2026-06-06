import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidHealthAccessToken } from '@/lib/fitness/provider-connection'
import { fetchDailySteps, fetchSleepMinutes, fetchRestingHeartRate } from '@/lib/google-health'
import { computeContextualEnergyLevel } from '@/lib/fitness/contextual-energy'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let accessToken: string
    let connection
    try {
      const result = await getValidHealthAccessToken(supabase, user.id)
      accessToken = result.accessToken
      connection = result.connection
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Google Health not connected'
      const needsReauth = message.toLowerCase().includes('reconnect')
      return NextResponse.json({ error: message, needsReauth }, { status: 400 })
    }

    // Pull the last 7 days so the dashboard can show a weekly summary and the
    // most recent day always populates "Latest biometrics".
    const DAYS_TO_SYNC = 7
    const now = new Date()

    let daysImported = 0
    let latestImported: {
      sleepHours: number | null
      restingHeartRate: number | null
      steps: number | null
      contextual_energy_level_1_10: number
    } | null = null

    for (let i = 0; i < DAYS_TO_SYNC; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)

      let sleepHours: number | null = null
      let restingHeartRate: number | null = null
      let steps: number | null = null

      if (connection.import_sleep) {
        const minutes = await fetchSleepMinutes(accessToken, day)
        if (minutes && minutes > 0) sleepHours = Math.round((minutes / 60) * 100) / 100
      }

      if (connection.import_resting_heart_rate) {
        const rhr = await fetchRestingHeartRate(accessToken, day)
        if (rhr && rhr > 0) restingHeartRate = rhr
      }

      if (connection.import_steps) {
        const s = await fetchDailySteps(accessToken, day)
        if (typeof s === 'number' && s >= 0) steps = s
      }

      // Nothing for this day — skip without creating an empty row.
      if (sleepHours === null && restingHeartRate === null && steps === null) continue

      const { contextual_energy_level_1_10 } = computeContextualEnergyLevel({
        sleep_hours: sleepHours,
        blood_pressure_systolic: null,
        blood_pressure_diastolic: null,
        resting_heart_rate: restingHeartRate,
        stress_level_1_10: null,
        energy_level_self_1_10: null,
      })

      const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
      // Today keeps the real current time; past days are stamped at midday so
      // ordering stays stable and "latest" remains the most recent day.
      const recordedAt = i === 0 ? now : new Date(startOfDay.getTime() + 12 * 60 * 60 * 1000)

      // Upsert the day's auto-synced row so repeated syncs don't duplicate.
      const { data: existing } = await supabase
        .from('fitness_biometrics')
        .select('id')
        .eq('user_id', user.id)
        .eq('source', 'google_health')
        .gte('recorded_at', startOfDay.toISOString())
        .lt('recorded_at', endOfDay.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const row = {
        sleep_hours: sleepHours,
        resting_heart_rate: restingHeartRate,
        steps,
        contextual_energy_level_1_10,
        source: 'google_health',
        recorded_at: recordedAt.toISOString(),
      }

      if (existing?.id) {
        await supabase.from('fitness_biometrics').update(row).eq('id', existing.id)
      } else {
        await supabase.from('fitness_biometrics').insert({ user_id: user.id, ...row })
      }

      daysImported++
      if (i === 0 || latestImported === null) {
        latestImported = { sleepHours, restingHeartRate, steps, contextual_energy_level_1_10 }
      }
    }

    await supabase
      .from('fitness_provider_connections')
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq('id', connection.id)

    if (daysImported === 0) {
      return NextResponse.json({
        ok: true,
        daysImported,
        message: 'Connected, but no recent Google Health data was available yet.',
      })
    }

    return NextResponse.json({
      ok: true,
      daysImported,
      imported: latestImported,
      message: `Synced ${daysImported} day${daysImported === 1 ? '' : 's'} from Google Health.`,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to sync Google Health data' },
      { status: 500 }
    )
  }
}
