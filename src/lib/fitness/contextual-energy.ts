export type BiometricInputs = {
  sleep_hours?: number | null
  blood_pressure_systolic?: number | null
  blood_pressure_diastolic?: number | null
  resting_heart_rate?: number | null
  stress_level_1_10?: number | null
  energy_level_self_1_10?: number | null
}

export function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

/**
 * Combines self-reported energy with sleep/stress/heuristic signals into one 1–10 score for coaching copy only (not medical).
 */
export function computeContextualEnergyLevel(input: BiometricInputs): {
  contextual_energy_level_1_10: number
  rationale: string[]
} {
  const rationale: string[] = []
  let score = typeof input.energy_level_self_1_10 === 'number' ? input.energy_level_self_1_10 : 5

  if (typeof input.sleep_hours === 'number') {
    if (input.sleep_hours < 5) {
      score -= 2
      rationale.push('Sleep under ~5h tends to pull energy down.')
    } else if (input.sleep_hours < 6.5) {
      score -= 1
      rationale.push('Sleep is on the short side.')
    } else if (input.sleep_hours >= 7 && input.sleep_hours <= 9) {
      score += 0.5
      rationale.push('Sleep duration looks supportive.')
    }
  }

  if (typeof input.stress_level_1_10 === 'number') {
    if (input.stress_level_1_10 >= 8) {
      score -= 1.5
      rationale.push('High stress reading — recovery matters.')
    } else if (input.stress_level_1_10 >= 6) {
      score -= 0.5
      rationale.push('Elevated stress — favor lighter loading.')
    }
  }

  if (
    typeof input.resting_heart_rate === 'number' &&
    input.resting_heart_rate > 0 &&
    input.resting_heart_rate < 45
  ) {
    rationale.push('Very low resting HR — if unexpected, double-check your reading.')
  }

  const contextual_energy_level_1_10 = clampInt(score, 1, 10)
  return { contextual_energy_level_1_10, rationale }
}
