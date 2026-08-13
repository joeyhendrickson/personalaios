import { addDays } from './streak'
import type { AfterDrinkBiometrics, FitnessDaySnapshot } from './types'

export type EnergyHistoryRow = {
  log_date?: string | null
  stress_level?: number | null
  self_energy_level?: number | null
  sleep_hours?: number | null
}

export type BiometricRow = {
  sync_date?: string | null
  recorded_at?: string | null
  stress_level_1_10?: number | null
  contextual_energy_level_1_10?: number | null
  energy_level_self_1_10?: number | null
  sleep_hours?: number | null
}

export type DrinkLogRow = {
  log_date: string
  drink_count?: number | null
}

function dateFromBiometric(row: BiometricRow): string | null {
  if (row.sync_date) return String(row.sync_date).slice(0, 10)
  if (row.recorded_at) return String(row.recorded_at).slice(0, 10)
  return null
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function snapshotForDate(
  date: string,
  energy: EnergyHistoryRow[],
  biometrics: BiometricRow[]
): FitnessDaySnapshot {
  const energyRow = energy.find((row) => row.log_date === date)
  if (energyRow) {
    const bio = biometrics.find((row) => dateFromBiometric(row) === date)
    return {
      date,
      stress_level: num(energyRow.stress_level),
      self_energy: num(energyRow.self_energy_level),
      contextual_energy: num(bio?.contextual_energy_level_1_10) ?? num(energyRow.self_energy_level),
      sleep_hours: num(energyRow.sleep_hours),
      source: 'energy_history',
    }
  }

  const bio = biometrics.find((row) => dateFromBiometric(row) === date)
  if (bio) {
    return {
      date,
      stress_level: num(bio.stress_level_1_10),
      self_energy: num(bio.energy_level_self_1_10),
      contextual_energy: num(bio.contextual_energy_level_1_10),
      sleep_hours: num(bio.sleep_hours),
      source: 'biometrics',
    }
  }

  return {
    date,
    stress_level: null,
    self_energy: null,
    contextual_energy: null,
    sleep_hours: null,
    source: 'none',
  }
}

function mean(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/**
 * For each drinking day, pull Fitness Stats stress + contextual energy on day+1 and day+2.
 * Baseline is the mean of days that are not a drink day or the two days after one.
 * Deltas are presented as data, not as a verdict.
 */
export function buildAfterDrinkBiometrics(
  drinkLogs: DrinkLogRow[],
  energy: EnergyHistoryRow[],
  biometrics: BiometricRow[]
): AfterDrinkBiometrics[] {
  const drinkDates = new Set(drinkLogs.map((l) => l.log_date))
  const afterDates = new Set<string>()
  for (const date of drinkDates) {
    afterDates.add(addDays(date, 1))
    afterDates.add(addDays(date, 2))
  }

  const allDates = new Set<string>()
  for (const row of energy) if (row.log_date) allDates.add(row.log_date)
  for (const row of biometrics) {
    const d = dateFromBiometric(row)
    if (d) allDates.add(d)
  }

  const baselineEnergy: number[] = []
  const baselineStress: number[] = []
  for (const date of allDates) {
    if (drinkDates.has(date) || afterDates.has(date)) continue
    const snap = snapshotForDate(date, energy, biometrics)
    if (snap.contextual_energy != null) baselineEnergy.push(snap.contextual_energy)
    if (snap.stress_level != null) baselineStress.push(snap.stress_level)
  }

  const energyBase = mean(baselineEnergy)
  const stressBase = mean(baselineStress)

  return drinkLogs
    .slice()
    .sort((a, b) => b.log_date.localeCompare(a.log_date))
    .map((log) => {
      const day1 = snapshotForDate(addDays(log.log_date, 1), energy, biometrics)
      const day2 = snapshotForDate(addDays(log.log_date, 2), energy, biometrics)
      const afterEnergy = mean([day1.contextual_energy, day2.contextual_energy])
      const afterStress = mean([day1.stress_level, day2.stress_level])

      return {
        drinkDate: log.log_date,
        drinkCount: log.drink_count ?? 0,
        day1,
        day2,
        energyDeltaVsBaseline:
          afterEnergy != null && energyBase != null
            ? Math.round((afterEnergy - energyBase) * 10) / 10
            : null,
        stressDeltaVsBaseline:
          afterStress != null && stressBase != null
            ? Math.round((afterStress - stressBase) * 10) / 10
            : null,
      }
    })
}

export function describeCorrelation(row: AfterDrinkBiometrics): string | null {
  const parts: string[] = []
  if (row.energyDeltaVsBaseline != null) {
    if (row.energyDeltaVsBaseline <= -1) {
      parts.push(
        `Contextual energy averaged ${Math.abs(row.energyDeltaVsBaseline).toFixed(1)} points lower than your other days.`
      )
    } else if (row.energyDeltaVsBaseline >= 1) {
      parts.push(
        `Contextual energy averaged ${row.energyDeltaVsBaseline.toFixed(1)} points higher than your other days.`
      )
    }
  }
  if (row.stressDeltaVsBaseline != null) {
    if (row.stressDeltaVsBaseline >= 1) {
      parts.push(
        `Stress averaged ${row.stressDeltaVsBaseline.toFixed(1)} points higher than your other days.`
      )
    } else if (row.stressDeltaVsBaseline <= -1) {
      parts.push(
        `Stress averaged ${Math.abs(row.stressDeltaVsBaseline).toFixed(1)} points lower than your other days.`
      )
    }
  }
  if (!parts.length) return null
  return parts.join(' ')
}
