import type { SupabaseClient } from '@supabase/supabase-js'
import { computeEnergyStressScores } from '@/lib/fitness/compute-energy-stress'
import { fetchEnergyStressInputs } from '@/lib/fitness/fetch-energy-inputs'

export type EnergyHistoryRow = {
  id: string
  user_id: string
  log_date: string
  self_energy_level: number
  stress_level: number
  sleep_hours: number | null
  resting_heart_rate: number | null
  steps: number | null
  adjustments_applied: string[]
  recorded_at: string
}

export async function snapshotDailyEnergyForUser(
  db: SupabaseClient,
  userId: string,
  logDate: string
): Promise<{ ok: boolean; row?: EnergyHistoryRow; error?: string }> {
  try {
    const inputs = await fetchEnergyStressInputs(db, userId, logDate)
    const { selfEnergyLevel, stressLevel, adjustmentsApplied } = computeEnergyStressScores(inputs)

    const payload = {
      user_id: userId,
      log_date: logDate,
      self_energy_level: selfEnergyLevel,
      stress_level: stressLevel,
      sleep_hours: inputs.sleep_hours,
      resting_heart_rate: inputs.resting_heart_rate,
      steps: inputs.steps,
      adjustments_applied: adjustmentsApplied,
      recorded_at: new Date().toISOString(),
    }

    const { data, error } = await db
      .from('fitness_energy_history')
      .upsert(payload, { onConflict: 'user_id,log_date' })
      .select()
      .single()

    if (error) {
      return { ok: false, error: error.message }
    }

    const bioPayload = {
      user_id: userId,
      sync_date: logDate,
      source: 'daily_snapshot',
      recorded_at: payload.recorded_at,
      sleep_hours: inputs.sleep_hours,
      resting_heart_rate: inputs.resting_heart_rate,
      steps: inputs.steps,
      stress_level_1_10: stressLevel,
      energy_level_self_1_10: selfEnergyLevel,
      contextual_energy_level_1_10: selfEnergyLevel,
      fitbit_opt_in: false,
    }

    const { data: existingBio } = await db
      .from('fitness_biometrics')
      .select('id')
      .eq('user_id', userId)
      .eq('sync_date', logDate)
      .eq('source', 'daily_snapshot')
      .maybeSingle()

    if (existingBio?.id) {
      await db.from('fitness_biometrics').update(bioPayload).eq('id', existingBio.id)
    } else {
      await db.from('fitness_biometrics').insert(bioPayload)
    }

    return {
      ok: true,
      row: {
        id: data.id,
        user_id: data.user_id,
        log_date: data.log_date,
        self_energy_level: data.self_energy_level,
        stress_level: data.stress_level,
        sleep_hours: data.sleep_hours != null ? Number(data.sleep_hours) : null,
        resting_heart_rate: data.resting_heart_rate,
        steps: data.steps,
        adjustments_applied: Array.isArray(data.adjustments_applied)
          ? data.adjustments_applied
          : [],
        recorded_at: data.recorded_at,
      },
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Snapshot failed' }
  }
}

export function localDateString(timezone: string, at = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(at)
    const y = parts.find((p) => p.type === 'year')?.value
    const m = parts.find((p) => p.type === 'month')?.value
    const d = parts.find((p) => p.type === 'day')?.value
    if (y && m && d) return `${y}-${m}-${d}`
  } catch {
    /* fall through */
  }
  return at.toISOString().slice(0, 10)
}

export function localHourMinute(
  timezone: string,
  at = new Date()
): { hour: number; minute: number } {
  try {
    const str = at.toLocaleString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
    const [h, m] = str.split(':').map((x) => parseInt(x, 10))
    return { hour: h ?? 0, minute: m ?? 0 }
  } catch {
    return { hour: at.getUTCHours(), minute: at.getUTCMinutes() }
  }
}
