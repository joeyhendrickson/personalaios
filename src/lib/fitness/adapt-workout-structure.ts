export type WeeklyDayStructure = {
  focus?: string
  duration_minutes?: number
  exercises?: Array<{
    exercise_id?: string
    exercise_name: string
    sets: number
    reps: string
    weight_suggestion?: number | null
    rest_seconds: number
    order_index?: number
    notes?: string
  }>
}

export type WeeklyStructure = Record<string, WeeklyDayStructure>

function parseRepsToMidRange(reps: string): number | null {
  const m = reps.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (m) return (parseInt(m[1], 10) + parseInt(m[2], 10)) / 2
  const single = reps.match(/(\d+)/)
  return single ? parseInt(single[1], 10) : null
}

function formatReps(mid: number, spread = 2): string {
  const low = Math.max(1, Math.floor(mid - spread))
  const high = Math.max(low + 1, Math.ceil(mid + spread))
  return `${low}-${high}`
}

/**
 * Adjusts volume/intensity hints for display — not medical advice.
 * low: reduce sets, slightly lower reps target, longer rest where helpful
 * high: slight bump in volume where safe
 */
export function adaptWeeklyStructure(
  weekly: WeeklyStructure | null | undefined,
  mode: 'low' | 'standard' | 'high'
): WeeklyStructure {
  if (!weekly || typeof weekly !== 'object') return {}
  const out: WeeklyStructure = {}

  for (const day of Object.keys(weekly)) {
    const block = weekly[day]
    if (!block) continue
    const exercises = (block.exercises || []).map((ex) => {
      let sets = Math.max(1, ex.sets)
      let reps = ex.reps
      let rest = ex.rest_seconds

      if (mode === 'low') {
        sets = Math.max(1, sets - 1)
        const mid = parseRepsToMidRange(reps)
        if (mid !== null && mid > 6) reps = formatReps(mid - 2)
        rest = Math.min(180, rest + 15)
      } else if (mode === 'high') {
        sets = sets + 1
        const mid = parseRepsToMidRange(reps)
        if (mid !== null && mid < 15) reps = formatReps(mid + 1, 1)
      }

      return {
        ...ex,
        sets,
        reps,
        rest_seconds: rest,
        notes:
          mode === 'low'
            ? `${ex.notes || ''} (Easier day: fewer sets, slightly lighter rep target.)`.trim()
            : mode === 'high'
              ? `${ex.notes || ''} (Higher-capacity day: slight volume bump.)`.trim()
              : ex.notes,
      }
    })

    out[day] = {
      ...block,
      duration_minutes:
        mode === 'low'
          ? Math.max(15, (block.duration_minutes || 45) - 10)
          : mode === 'high'
            ? (block.duration_minutes || 45) + 10
            : block.duration_minutes,
      exercises,
    }
  }

  return out
}

export function energyModeFromScore(score: number): 'low' | 'standard' | 'high' {
  if (score <= 4) return 'low'
  if (score >= 8) return 'high'
  return 'standard'
}
