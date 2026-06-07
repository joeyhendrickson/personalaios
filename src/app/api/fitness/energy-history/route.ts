import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeEnergyStressScores } from '@/lib/fitness/compute-energy-stress'
import { fetchEnergyStressInputs } from '@/lib/fitness/fetch-energy-inputs'
import { localDateString } from '@/lib/fitness/snapshot-daily-energy'

export const dynamic = 'force-dynamic'

export type EnergyHistoryEntry = {
  id: string
  log_date: string
  self_energy_level: number
  stress_level: number
  sleep_hours: number | null
  resting_heart_rate: number | null
  steps: number | null
  adjustments_applied: string[]
  recorded_at: string
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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('user_id', user.id)
      .maybeSingle()

    const timezone = profile?.timezone || 'America/New_York'
    const today = localDateString(timezone)

    const { data: historyRows, error: historyError } = await supabase
      .from('fitness_energy_history')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(30)

    if (historyError) {
      if (historyError.code === '42P01') {
        return NextResponse.json(
          {
            error: 'Energy history table not found',
            details: 'Run migration 076_fitness_energy_history.sql',
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: historyError.message }, { status: 500 })
    }

    const history: EnergyHistoryEntry[] = (historyRows ?? []).map((row) => ({
      id: row.id,
      log_date: row.log_date,
      self_energy_level: row.self_energy_level,
      stress_level: row.stress_level,
      sleep_hours: row.sleep_hours != null ? Number(row.sleep_hours) : null,
      resting_heart_rate: row.resting_heart_rate,
      steps: row.steps,
      adjustments_applied: Array.isArray(row.adjustments_applied) ? row.adjustments_applied : [],
      recorded_at: row.recorded_at,
    }))

    const inputs = await fetchEnergyStressInputs(supabase, user.id, today)
    const computed = computeEnergyStressScores(inputs)

    const todayEntry: EnergyHistoryEntry = {
      id: 'live',
      log_date: today,
      self_energy_level: computed.selfEnergyLevel,
      stress_level: computed.stressLevel,
      sleep_hours: inputs.sleep_hours,
      resting_heart_rate: inputs.resting_heart_rate,
      steps: inputs.steps,
      adjustments_applied: computed.adjustmentsApplied,
      recorded_at: new Date().toISOString(),
    }

    const historyWithoutToday = history.filter((h) => h.log_date !== today)
    const persistedToday = history.find((h) => h.log_date === today)

    return NextResponse.json(
      {
        today: persistedToday ?? todayEntry,
        live: todayEntry,
        history: historyWithoutToday,
        timezone,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch energy history' },
      { status: 500 }
    )
  }
}
