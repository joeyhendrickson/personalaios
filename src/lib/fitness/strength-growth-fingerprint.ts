export type StrengthGrowthStatPoint = {
  exercise_name: string
  measurement_value: number
  measurement_unit: string
  recorded_at: string
}

export function normalizeStrengthStatsForChart(
  stats: Array<{
    stat_type?: string
    exercise_name: string
    measurement_value: number
    measurement_unit: string
    recorded_at: string
  }>
): StrengthGrowthStatPoint[] {
  return stats
    .filter((s) => !s.stat_type || s.stat_type === 'strength')
    .map((s) => ({
      exercise_name: s.exercise_name,
      measurement_value: s.measurement_value,
      measurement_unit: s.measurement_unit,
      recorded_at: s.recorded_at,
    }))
    .sort((a, b) => {
      const byExercise = a.exercise_name.localeCompare(b.exercise_name)
      if (byExercise !== 0) return byExercise
      return a.recorded_at.localeCompare(b.recorded_at)
    })
}

export function computeStrengthStatsFingerprint(
  stats: Array<{
    stat_type?: string
    exercise_name: string
    measurement_value: number
    measurement_unit: string
    recorded_at: string
  }>
): string {
  return JSON.stringify(normalizeStrengthStatsForChart(stats))
}
