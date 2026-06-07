import type { FitnessBiometricRow } from '@/components/fitness-tracker/BiometricsSection'

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function toInt(value: unknown): number | null {
  const n = toNumber(value)
  return n === null ? null : Math.round(n)
}

/** Coerce Supabase DECIMAL / numeric strings into real numbers for the UI. */
export function normalizeBiometricRow(row: Record<string, unknown>): FitnessBiometricRow {
  return {
    ...(row as FitnessBiometricRow),
    sleep_hours: toNumber(row.sleep_hours),
    blood_pressure_systolic: toInt(row.blood_pressure_systolic),
    blood_pressure_diastolic: toInt(row.blood_pressure_diastolic),
    resting_heart_rate: toInt(row.resting_heart_rate),
    steps: toInt(row.steps),
    stress_level_1_10: toInt(row.stress_level_1_10),
    energy_level_self_1_10: toInt(row.energy_level_self_1_10),
    contextual_energy_level_1_10: toInt(row.contextual_energy_level_1_10),
  }
}

export function isGoogleHealthRow(row: FitnessBiometricRow): boolean {
  return row.source === 'google_health' || Boolean(row.sync_date)
}

function localYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Ignore legacy/sync bugs that stored multi-night or invalid sleep totals. */
const PLAUSIBLE_SLEEP_HOURS_MAX = 16

export type WeeklyGoogleHealthSummary = {
  days: number
  nightsWithSleep: number
  avgSleep: number | null
  avgRhr: number | null
  totalSteps: number
  avgSteps: number | null
}

/**
 * One row per sync_date (latest recorded_at wins), last N calendar days, google_health only.
 */
export function summarizeWeeklyGoogleHealth(
  rows: FitnessBiometricRow[],
  daysBack = 7
): WeeklyGoogleHealthSummary {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(today.getDate() - (daysBack - 1))
  const startStr = localYmd(start)

  const byDate = new Map<string, FitnessBiometricRow>()
  for (const row of rows) {
    if (row.source !== 'google_health' || !row.sync_date) continue
    if (row.sync_date < startStr) continue
    const prev = byDate.get(row.sync_date)
    if (!prev || new Date(row.recorded_at).getTime() > new Date(prev.recorded_at).getTime()) {
      byDate.set(row.sync_date, row)
    }
  }

  const daily = [...byDate.values()].sort((a, b) =>
    (b.sync_date || '').localeCompare(a.sync_date || '')
  )

  const sleepVals = daily
    .map((r) => r.sleep_hours)
    .filter((v): v is number => typeof v === 'number' && v > 0 && v <= PLAUSIBLE_SLEEP_HOURS_MAX)
  const rhrVals = daily
    .map((r) => r.resting_heart_rate)
    .filter((v): v is number => typeof v === 'number' && v > 0)
  const stepVals = daily
    .map((r) => r.steps)
    .filter((v): v is number => typeof v === 'number' && v >= 0)

  const avg = (vals: number[]) =>
    vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null

  return {
    days: daily.length,
    nightsWithSleep: sleepVals.length,
    avgSleep: avg(sleepVals),
    avgRhr: avg(rhrVals),
    totalSteps: stepVals.reduce((a, b) => a + b, 0),
    avgSteps: avg(stepVals),
  }
}

/** Best recent value for each wearable field across synced Google Health rows. */
export function buildGoogleHealthSnapshot(rows: FitnessBiometricRow[]): FitnessBiometricRow | null {
  const googleRows = rows.filter(isGoogleHealthRow)
  if (!googleRows.length) return null

  const pick = <T extends number | null | undefined>(
    getter: (r: FitnessBiometricRow) => T
  ): number | null => {
    for (const row of googleRows) {
      const v = getter(row)
      if (typeof v === 'number' && Number.isFinite(v)) return v
    }
    return null
  }

  const anchor = googleRows[0]
  const sleep_hours = pick((r) => r.sleep_hours)
  const resting_heart_rate = pick((r) => r.resting_heart_rate)
  const steps = pick((r) => r.steps)

  if (sleep_hours === null && resting_heart_rate === null && steps === null) return null

  return {
    ...anchor,
    sleep_hours,
    resting_heart_rate,
    steps,
    stress_level_1_10: null,
    energy_level_self_1_10: null,
    blood_pressure_systolic: null,
    blood_pressure_diastolic: null,
  }
}

/** Pick the row to show in "Latest biometrics" — prefer the newest Google Health sync. */
export function pickLatestBiometricsDisplay(rows: FitnessBiometricRow[]): {
  latest: FitnessBiometricRow | null
  latestGoogle: FitnessBiometricRow | null
  latestManual: FitnessBiometricRow | null
} {
  if (!rows.length) {
    return { latest: null, latestGoogle: null, latestManual: null }
  }

  const sorted = [...rows].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )
  const latestGoogle = buildGoogleHealthSnapshot(sorted)
  const latestManual = sorted.find((r) => !isGoogleHealthRow(r)) ?? null

  if (!latestGoogle) {
    return { latest: sorted[0] ?? null, latestGoogle: null, latestManual }
  }

  // Google Health sync always wins for latest wearable readings; stress/energy come from computed scores.
  return { latest: latestGoogle, latestGoogle, latestManual }
}
