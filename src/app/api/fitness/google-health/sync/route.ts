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

    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    let sleepHours: number | null = null
    let restingHeartRate: number | null = null
    let steps: number | null = null

    if (connection.import_sleep) {
      let minutes = await fetchSleepMinutes(accessToken, today)
      if (!minutes) minutes = await fetchSleepMinutes(accessToken, yesterday)
      if (minutes && minutes > 0) sleepHours = Math.round((minutes / 60) * 100) / 100
    }

    if (connection.import_resting_heart_rate) {
      let rhr = await fetchRestingHeartRate(accessToken, today)
      if (!rhr) rhr = await fetchRestingHeartRate(accessToken, yesterday)
      if (rhr && rhr > 0) restingHeartRate = rhr
    }

    if (connection.import_steps) {
      const s = await fetchDailySteps(accessToken, today)
      if (typeof s === 'number' && s >= 0) steps = s
    }

    if (sleepHours === null && restingHeartRate === null && steps === null) {
      await supabase
        .from('fitness_provider_connections')
        .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
        .eq('id', connection.id)
      return NextResponse.json({
        ok: true,
        imported: { sleepHours, restingHeartRate, steps },
        message: 'Connected, but no recent Google Health data was available yet.',
      })
    }

    const { contextual_energy_level_1_10 } = computeContextualEnergyLevel({
      sleep_hours: sleepHours,
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      resting_heart_rate: restingHeartRate,
      stress_level_1_10: null,
      energy_level_self_1_10: null,
    })

    // Upsert today's auto-synced row so repeated syncs don't create duplicates.
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const { data: existing } = await supabase
      .from('fitness_biometrics')
      .select('id')
      .eq('user_id', user.id)
      .eq('source', 'google_health')
      .gte('recorded_at', startOfToday.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const row = {
      sleep_hours: sleepHours,
      resting_heart_rate: restingHeartRate,
      steps,
      contextual_energy_level_1_10,
      source: 'google_health',
      recorded_at: new Date().toISOString(),
    }

    if (existing?.id) {
      await supabase.from('fitness_biometrics').update(row).eq('id', existing.id)
    } else {
      await supabase.from('fitness_biometrics').insert({ user_id: user.id, ...row })
    }

    await supabase
      .from('fitness_provider_connections')
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq('id', connection.id)

    return NextResponse.json({
      ok: true,
      imported: { sleepHours, restingHeartRate, steps, contextual_energy_level_1_10 },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to sync Google Health data' },
      { status: 500 }
    )
  }
}
