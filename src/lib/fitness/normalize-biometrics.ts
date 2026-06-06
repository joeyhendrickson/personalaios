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

/** Pick the row to show in "Latest biometrics" — prefer the newest Google Health sync. */
export function pickLatestBiometricsDisplay(rows: FitnessBiometricRow[]): {
  latest: FitnessBiometricRow | null
  latestGoogle: FitnessBiometricRow | null
  latestManual: FitnessBiometricRow | null
} {
  if (!rows.length) {
    return { latest: null, latestGoogle: null, latestManual: null }
  }

  const latestGoogle = rows.find(isGoogleHealthRow) ?? null
  const latestManual = rows.find((r) => !isGoogleHealthRow(r)) ?? null
  const latestByTime = rows[0]

  if (!latestGoogle) {
    return { latest: latestByTime, latestGoogle: null, latestManual }
  }

  if (!latestManual || latestByTime.source === 'google_health') {
    return { latest: latestByTime, latestGoogle, latestManual }
  }

  // Manual stress/energy may be newer; still surface synced wearable metrics.
  return {
    latest: {
      ...latestManual,
      sleep_hours: latestManual.sleep_hours ?? latestGoogle.sleep_hours,
      resting_heart_rate: latestManual.resting_heart_rate ?? latestGoogle.resting_heart_rate,
      steps: latestManual.steps ?? latestGoogle.steps,
      contextual_energy_level_1_10:
        latestManual.sleep_hours != null ||
        latestManual.resting_heart_rate != null ||
        latestManual.stress_level_1_10 != null ||
        latestManual.energy_level_self_1_10 != null
          ? latestManual.contextual_energy_level_1_10
          : latestGoogle.contextual_energy_level_1_10,
    },
    latestGoogle,
    latestManual,
  }
}
