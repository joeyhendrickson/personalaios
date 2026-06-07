import type { WeeklyDayStructure, WeeklyStructure } from '@/lib/fitness/adapt-workout-structure'

export const WEEKLY_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type WeeklyDayKey = (typeof WEEKLY_DAY_KEYS)[number]

const DAY_NUMBER_TO_KEY: Record<number, WeeklyDayKey> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
}

const DAY_KEY_TO_NUMBER: Record<WeeklyDayKey, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
}

const DAY_ALIASES: Record<string, WeeklyDayKey> = {
  monday: 'monday',
  mon: 'monday',
  tuesday: 'tuesday',
  tue: 'tuesday',
  tues: 'tuesday',
  wednesday: 'wednesday',
  wed: 'wednesday',
  thursday: 'thursday',
  thu: 'thursday',
  thur: 'thursday',
  thurs: 'thursday',
  friday: 'friday',
  fri: 'friday',
  saturday: 'saturday',
  sat: 'saturday',
  sunday: 'sunday',
  sun: 'sunday',
  '1': 'monday',
  '2': 'tuesday',
  '3': 'wednesday',
  '4': 'thursday',
  '5': 'friday',
  '6': 'saturday',
  '7': 'sunday',
}

const VALID_PLAN_TYPES = ['strength', 'cardio', 'hybrid', 'flexibility', 'sport_specific'] as const

export type WorkoutPlanType = (typeof VALID_PLAN_TYPES)[number]

export type PlanExerciseRow = {
  day_of_week: number | null
  week_number?: number | null
  sets?: number | null
  reps?: string | null
  weight_suggestion?: number | null
  rest_seconds?: number | null
  order_index?: number | null
  notes?: string | null
  exercise_id?: string | null
  exercises?: { name?: string | null } | null
}

export type WorkoutPlanLike = {
  weekly_structure?: unknown
  workout_plan_exercises?: PlanExerciseRow[] | null
}

type AvailableExercise = {
  id: string
  name: string
}

function emptyWeek(): WeeklyStructure {
  return {}
}

export function normalizeDayKey(raw: string): WeeklyDayKey | null {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '')
  return DAY_ALIASES[key] ?? null
}

export function dayKeyToNumber(day: string): number | null {
  const normalized = normalizeDayKey(day)
  return normalized ? DAY_KEY_TO_NUMBER[normalized] : null
}

function normalizeExerciseEntry(
  raw: Record<string, unknown>,
  index: number
): NonNullable<WeeklyDayStructure['exercises']>[number] {
  return {
    exercise_id: typeof raw.exercise_id === 'string' ? raw.exercise_id : undefined,
    exercise_name:
      typeof raw.exercise_name === 'string'
        ? raw.exercise_name
        : typeof raw.name === 'string'
          ? raw.name
          : 'Exercise',
    sets: typeof raw.sets === 'number' ? raw.sets : parseInt(String(raw.sets || 3), 10) || 3,
    reps: typeof raw.reps === 'string' ? raw.reps : String(raw.reps ?? '8-12'),
    weight_suggestion:
      typeof raw.weight_suggestion === 'number'
        ? raw.weight_suggestion
        : raw.weight_suggestion != null
          ? Number(raw.weight_suggestion)
          : null,
    rest_seconds:
      typeof raw.rest_seconds === 'number'
        ? raw.rest_seconds
        : parseInt(String(raw.rest_seconds || 60), 10) || 60,
    order_index: typeof raw.order_index === 'number' ? raw.order_index : index + 1,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
  }
}

/** Normalize AI/DB weekly_structure keys to lowercase monday–sunday. */
export function normalizeWeeklyStructureKeys(raw: unknown): WeeklyStructure {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyWeek()

  const out: WeeklyStructure = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const day = normalizeDayKey(key)
    if (!day || !value || typeof value !== 'object' || Array.isArray(value)) continue

    const block = value as Record<string, unknown>
    const exercises = Array.isArray(block.exercises)
      ? block.exercises
          .filter((ex): ex is Record<string, unknown> => !!ex && typeof ex === 'object')
          .map((ex, idx) => normalizeExerciseEntry(ex, idx))
      : []

    out[day] = {
      focus: typeof block.focus === 'string' ? block.focus : undefined,
      duration_minutes:
        typeof block.duration_minutes === 'number'
          ? block.duration_minutes
          : typeof block.duration_minutes === 'string'
            ? parseInt(block.duration_minutes, 10) || undefined
            : undefined,
      adapted_note: typeof block.adapted_note === 'string' ? block.adapted_note : undefined,
      exercises,
    }
  }

  return out
}

export function resolveExerciseId(
  exerciseId: string | undefined | null,
  exerciseName: string | undefined | null,
  availableExercises: AvailableExercise[]
): string | null {
  if (exerciseId && availableExercises.some((exercise) => exercise.id === exerciseId)) {
    return exerciseId
  }

  if (!exerciseName?.trim()) return null

  const target = exerciseName.trim().toLowerCase()
  const exact = availableExercises.find((exercise) => exercise.name.trim().toLowerCase() === target)
  if (exact) return exact.id

  const partial = availableExercises.find((exercise) => {
    const name = exercise.name.trim().toLowerCase()
    return name.includes(target) || target.includes(name)
  })
  return partial?.id ?? null
}

export function buildWeeklyStructureFromPlanExercises(
  rows: PlanExerciseRow[] | null | undefined,
  existing?: WeeklyStructure | null
): WeeklyStructure {
  const structure: WeeklyStructure = { ...normalizeWeeklyStructureKeys(existing) }

  for (const row of rows || []) {
    if (!row.day_of_week || row.day_of_week < 1 || row.day_of_week > 7) continue

    const day = DAY_NUMBER_TO_KEY[row.day_of_week]
    if (!day) continue

    const block = structure[day] ?? {
      focus: 'Training',
      duration_minutes: 45,
      exercises: [],
    }

    const exerciseName =
      row.exercises?.name?.trim() ||
      (typeof row.notes === 'string' && row.notes.trim()) ||
      'Exercise'

    block.exercises = block.exercises || []
    block.exercises.push({
      exercise_id: row.exercise_id ?? undefined,
      exercise_name: exerciseName,
      sets: row.sets ?? 3,
      reps: row.reps ?? '8-12',
      weight_suggestion: row.weight_suggestion ?? null,
      rest_seconds: row.rest_seconds ?? 60,
      order_index: row.order_index ?? block.exercises.length + 1,
      notes: row.notes ?? undefined,
    })

    if (!block.focus) block.focus = 'Training'
    if (!block.duration_minutes) block.duration_minutes = 45
    structure[day] = block
  }

  for (const day of WEEKLY_DAY_KEYS) {
    const block = structure[day]
    if (!block?.exercises?.length) continue
    block.exercises.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))
  }

  return structure
}

/** Prefer JSON weekly_structure; fall back to relational workout_plan_exercises. */
export function resolveWorkoutPlanWeeklyStructure(plan: WorkoutPlanLike): WeeklyStructure {
  const fromJson = normalizeWeeklyStructureKeys(plan.weekly_structure)
  const jsonHasWorkouts = WEEKLY_DAY_KEYS.some((day) => (fromJson[day]?.exercises?.length || 0) > 0)
  if (jsonHasWorkouts) return fromJson

  const fromRows = buildWeeklyStructureFromPlanExercises(plan.workout_plan_exercises, fromJson)
  const rowsHaveWorkouts = WEEKLY_DAY_KEYS.some(
    (day) => (fromRows[day]?.exercises?.length || 0) > 0
  )
  if (rowsHaveWorkouts) return fromRows

  return fromJson
}

export function flattenWeeklyStructureToExercises(
  weekly: WeeklyStructure,
  availableExercises: AvailableExercise[]
): Array<{
  exercise_id: string
  day_of_week: number
  week_number: number
  sets: number
  reps: string
  weight_suggestion: number | null
  rest_seconds: number
  order_index: number
  notes?: string
}> {
  const inserts: Array<{
    exercise_id: string
    day_of_week: number
    week_number: number
    sets: number
    reps: string
    weight_suggestion: number | null
    rest_seconds: number
    order_index: number
    notes?: string
  }> = []

  for (const day of WEEKLY_DAY_KEYS) {
    const block = weekly[day]
    if (!block?.exercises?.length) continue

    const dayOfWeek = DAY_KEY_TO_NUMBER[day]
    for (const [index, exercise] of block.exercises.entries()) {
      const exerciseId = resolveExerciseId(
        exercise.exercise_id,
        exercise.exercise_name,
        availableExercises
      )
      if (!exerciseId) continue

      inserts.push({
        exercise_id: exerciseId,
        day_of_week: dayOfWeek,
        week_number: 1,
        sets: exercise.sets,
        reps: exercise.reps,
        weight_suggestion: exercise.weight_suggestion ?? null,
        rest_seconds: exercise.rest_seconds,
        order_index: exercise.order_index ?? index + 1,
        notes: exercise.notes,
      })
    }
  }

  return inserts
}

export function normalizeWorkoutPlanType(raw: unknown): WorkoutPlanType {
  if (typeof raw !== 'string' || !raw.trim()) return 'hybrid'

  const token = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (VALID_PLAN_TYPES.includes(token as WorkoutPlanType)) {
    return token as WorkoutPlanType
  }
  if (token.includes('strength') || token.includes('weight')) return 'strength'
  if (token.includes('cardio') || token.includes('endurance')) return 'cardio'
  if (token.includes('flex')) return 'flexibility'
  if (token.includes('sport')) return 'sport_specific'
  return 'hybrid'
}

export function normalizeDifficultyLevel(raw: unknown): 'beginner' | 'intermediate' | 'advanced' {
  if (typeof raw !== 'string') return 'beginner'
  const token = raw.trim().toLowerCase()
  if (token === 'intermediate' || token === 'advanced') return token
  return 'beginner'
}

export { parseAiJsonResponse } from '@/lib/fitness/normalize-nutrition-plan'
