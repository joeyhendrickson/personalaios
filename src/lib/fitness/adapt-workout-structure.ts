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
  adapted_note?: string
}

export type WeeklyStructure = Record<string, WeeklyDayStructure>

export type ReadinessInputs = {
  contextualEnergy: number
  stressLevel?: number | null
}

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

function roundWeight(w: number): number {
  return Math.round(w * 2) / 2
}

function adaptWeight(weight: number | null | undefined, factor: number): number | null | undefined {
  if (weight == null || weight <= 0) return weight
  return roundWeight(weight * factor)
}

function sortedExercises(exercises: NonNullable<WeeklyDayStructure['exercises']>) {
  return [...exercises].sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999) || 0)
}

function trimExercises(
  exercises: NonNullable<WeeklyDayStructure['exercises']>,
  keepRatio: number
): NonNullable<WeeklyDayStructure['exercises']> {
  if (keepRatio >= 1 || exercises.length <= 2) return exercises
  const sorted = sortedExercises(exercises)
  const keep = Math.max(2, Math.ceil(sorted.length * keepRatio))
  return sorted.slice(0, keep)
}

function totalSets(block: WeeklyDayStructure | undefined): number {
  return (block?.exercises || []).reduce((sum, ex) => sum + ex.sets, 0)
}

function pickDayToSkip(weekly: WeeklyStructure): string | null {
  const candidates = Object.entries(weekly)
    .filter(([, block]) => (block?.exercises?.length || 0) > 0)
    .sort((a, b) => totalSets(a[1]) - totalSets(b[1]))

  if (candidates.length < 4) return null
  // Prefer dropping a lighter mid-week session before the heaviest day.
  const idx = Math.min(1, candidates.length - 2)
  return candidates[idx]?.[0] ?? null
}

type AdaptationFactors = {
  weightFactor: number
  setsDelta: number
  heavySetsDelta: number
  exerciseKeepRatio: number
  skipOneTrainingDay: boolean
  durationDelta: number
  restDelta: number
  repAdjust: number
  note: string
}

function factorsForMode(
  mode: 'low' | 'standard' | 'high',
  readiness: ReadinessInputs
): AdaptationFactors {
  const stress = readiness.stressLevel ?? 5
  const energy = readiness.contextualEnergy

  if (mode === 'high') {
    return {
      weightFactor: 1.05,
      setsDelta: 1,
      heavySetsDelta: 0,
      exerciseKeepRatio: 1,
      skipOneTrainingDay: false,
      durationDelta: 10,
      restDelta: 0,
      repAdjust: 1,
      note: 'Higher-capacity day: slight volume and load bump.',
    }
  }

  if (mode === 'low') {
    return {
      weightFactor: stress >= 8 ? 0.78 : 0.85,
      setsDelta: -1,
      heavySetsDelta: energy <= 3 ? -1 : 0,
      exerciseKeepRatio: stress >= 8 ? 0.65 : 0.75,
      skipOneTrainingDay: energy <= 4 || stress >= 8,
      durationDelta: -15,
      restDelta: 20,
      repAdjust: -2,
      note: 'Reduced load: lighter weights, fewer sets, fewer exercises.',
    }
  }

  // Standard adapted — still lighter than base when stress or energy is not ideal.
  const needsTrim = stress >= 6 || energy <= 6
  return {
    weightFactor: needsTrim ? 0.92 : 0.96,
    setsDelta: stress >= 7 ? -1 : 0,
    heavySetsDelta: 0,
    exerciseKeepRatio: needsTrim ? 0.85 : 0.95,
    skipOneTrainingDay: false,
    durationDelta: needsTrim ? -8 : -5,
    restDelta: needsTrim ? 12 : 8,
    repAdjust: needsTrim ? -1 : 0,
    note: needsTrim
      ? 'Moderate adaptation: slightly lighter weights and trimmed accessories.'
      : 'Light adaptation: small load tweak for today’s readiness.',
  }
}

/**
 * Adjusts volume, load, frequency, and exercise count for the adapted view.
 */
export function adaptWeeklyStructure(
  weekly: WeeklyStructure | null | undefined,
  mode: 'low' | 'standard' | 'high',
  readiness?: ReadinessInputs
): WeeklyStructure {
  if (!weekly || typeof weekly !== 'object') return {}

  const inputs: ReadinessInputs = readiness ?? { contextualEnergy: 5, stressLevel: 5 }
  const factors = factorsForMode(mode, inputs)
  const skipDay = factors.skipOneTrainingDay ? pickDayToSkip(weekly) : null
  const out: WeeklyStructure = {}

  for (const day of Object.keys(weekly)) {
    const block = weekly[day]
    if (!block) continue

    if (skipDay === day) {
      out[day] = {
        ...block,
        duration_minutes: Math.max(15, (block.duration_minutes || 45) - 20),
        exercises: [],
        adapted_note: 'Session skipped — recovery prioritized for stress/energy.',
        focus: block.focus ? `${block.focus} (recovery)` : 'Recovery (adapted)',
      }
      continue
    }

    let exercises = sortedExercises(block.exercises || [])
    exercises = trimExercises(exercises, factors.exerciseKeepRatio)

    exercises = exercises.map((ex) => {
      let sets = Math.max(1, ex.sets + factors.setsDelta)
      if (ex.sets >= 4 && factors.heavySetsDelta !== 0) {
        sets = Math.max(1, sets + factors.heavySetsDelta)
      }

      let reps = ex.reps
      const mid = parseRepsToMidRange(reps)
      if (mid !== null && factors.repAdjust !== 0) {
        const adjusted = mid + factors.repAdjust
        if (adjusted > 0) reps = formatReps(adjusted, factors.repAdjust < 0 ? 2 : 1)
      } else if (mode === 'high' && mid !== null && mid < 15) {
        reps = formatReps(mid + 1, 1)
      }

      const rest = Math.min(180, Math.max(30, ex.rest_seconds + factors.restDelta))
      const weight_suggestion = adaptWeight(ex.weight_suggestion, factors.weightFactor)

      return {
        ...ex,
        sets,
        reps,
        rest_seconds: rest,
        weight_suggestion,
        notes: [ex.notes, factors.note].filter(Boolean).join(' ').trim() || undefined,
      }
    })

    out[day] = {
      ...block,
      duration_minutes: Math.max(15, (block.duration_minutes || 45) + factors.durationDelta),
      exercises,
      adapted_note:
        exercises.length < (block.exercises?.length || 0)
          ? `${(block.exercises?.length || 0) - exercises.length} exercise(s) trimmed for today.`
          : undefined,
    }
  }

  return out
}

export function energyModeFromScore(score: number): 'low' | 'standard' | 'high' {
  if (score <= 4) return 'low'
  if (score >= 8) return 'high'
  return 'standard'
}

/** Combines contextual energy with raw stress for workout load adaptation. */
export function adaptationModeFromReadiness(
  contextualEnergy: number,
  stressLevel: number | null | undefined
): 'low' | 'standard' | 'high' {
  const mode = energyModeFromScore(contextualEnergy)
  if (typeof stressLevel === 'number') {
    if (stressLevel >= 8) return 'low'
    if (stressLevel >= 6 && mode === 'high') return 'standard'
    if (stressLevel >= 6 && contextualEnergy <= 5) return 'low'
  }
  return mode
}

export function trainingDaysFromStructure(weekly: WeeklyStructure | null | undefined): string[] {
  if (!weekly) return []
  return Object.keys(weekly).filter((d) => (weekly[d]?.exercises?.length || 0) > 0)
}
