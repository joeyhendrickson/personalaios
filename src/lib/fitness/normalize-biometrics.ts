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

  if (!latestManual) {
    return { latest: latestGoogle, latestGoogle, latestManual: null }
  }

  const manualNewer =
    new Date(latestManual.recorded_at).getTime() > new Date(latestGoogle.recorded_at).getTime()

  if (!manualNewer) {
    return { latest: latestGoogle, latestGoogle, latestManual }
  }

  // Manual stress/energy may be newer; still surface synced wearable metrics.
  return {
    latest: {
      ...latestManual,
      sleep_hours: latestManual.sleep_hours ?? latestGoogle.sleep_hours,
      resting_heart_rate: latestManual.resting_heart_rate ?? latestGoogle.resting_heart_rate,
      steps: latestManual.steps ?? latestGoogle.steps,
      contextual_energy_level_1_10:
        latestManual.stress_level_1_10 != null || latestManual.energy_level_self_1_10 != null
          ? latestManual.contextual_energy_level_1_10
          : latestGoogle.contextual_energy_level_1_10,
    },
    latestGoogle,
    latestManual,
  }
}
