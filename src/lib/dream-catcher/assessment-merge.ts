import { DREAM_CATCHER_LIMITS } from '@/lib/dream-catcher/plan-limits'

type RecordLike = Record<string, unknown>

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function mergeStringArrays(prev: unknown[], incoming: unknown[], max: number): string[] {
  const combined = [...prev, ...incoming].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  )
  return [...new Set(combined.map(norm))].slice(0, max)
}

function keyOf(item: RecordLike, field: string): string {
  const v = item[field]
  return typeof v === 'string' ? norm(v) : ''
}

function mergeObjectArrayByField(
  prev: unknown[],
  incoming: unknown[],
  field: string,
  max: number
): RecordLike[] {
  const map = new Map<string, RecordLike>()

  for (const raw of [...prev, ...incoming]) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const item = raw as RecordLike
    const key = keyOf(item, field)
    if (!key) continue
    map.set(key, { ...(map.get(key) ?? {}), ...item })
  }

  return [...map.values()].slice(0, max)
}

const ARRAY_FIELD_CONFIG: Array<{
  key: string
  kind: 'string' | 'object'
  field?: string
  max: number
}> = [
  { key: 'personality_traits', kind: 'string', max: 20 },
  { key: 'personal_insights', kind: 'string', max: 30 },
  { key: 'measurement_preferences', kind: 'string', max: 15 },
  { key: 'dreams_discovered', kind: 'string', max: 15 },
  { key: 'goals_generated', kind: 'object', field: 'goal', max: DREAM_CATCHER_LIMITS.goals.max },
  { key: 'project_ideas', kind: 'object', field: 'title', max: DREAM_CATCHER_LIMITS.projects.max },
  { key: 'habit_ideas', kind: 'object', field: 'title', max: DREAM_CATCHER_LIMITS.habits.max },
  { key: 'task_ideas', kind: 'object', field: 'title', max: DREAM_CATCHER_LIMITS.tasks.max },
  {
    key: 'education_items',
    kind: 'object',
    field: 'title',
    max: DREAM_CATCHER_LIMITS.education.max,
  },
  {
    key: 'ruminations',
    kind: 'object',
    field: 'description',
    max: DREAM_CATCHER_LIMITS.ruminations.max,
  },
  {
    key: 'key_relationships',
    kind: 'object',
    field: 'name',
    max: DREAM_CATCHER_LIMITS.relationships.max,
  },
]

/** Merge assessment_data without duplicating object arrays (fixes runaway goal counts). */
export function mergeAssessmentData(existing: object, incoming: RecordLike): RecordLike {
  const merged: RecordLike = { ...(existing as RecordLike) }

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || value === null || value === '') continue

    const config = ARRAY_FIELD_CONFIG.find((c) => c.key === key)

    if (config && Array.isArray(value)) {
      const prev = Array.isArray(merged[key]) ? (merged[key] as unknown[]) : []
      if (config.kind === 'string') {
        merged[key] = mergeStringArrays(prev, value, config.max)
      } else if (config.field) {
        merged[key] = mergeObjectArrayByField(prev, value, config.field, config.max)
      }
      continue
    }

    if (Array.isArray(value)) {
      const prev = Array.isArray(merged[key]) ? (merged[key] as unknown[]) : []
      merged[key] = mergeStringArrays(prev, value, 50)
      continue
    }

    if (
      typeof value === 'object' &&
      merged[key] &&
      typeof merged[key] === 'object' &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = {
        ...(merged[key] as RecordLike),
        ...(value as RecordLike),
      }
      continue
    }

    merged[key] = value
  }

  return clampAssessmentData(merged)
}

/** Enforce caps on all structured assessment arrays. */
export function clampAssessmentData(data: object): RecordLike {
  const clamped: RecordLike = { ...(data as RecordLike) }

  for (const config of ARRAY_FIELD_CONFIG) {
    if (!Array.isArray(clamped[config.key])) continue
    const arr = clamped[config.key] as unknown[]
    clamped[config.key] = arr.slice(0, config.max)
  }

  const gratitude = clamped.gratitude_starters
  if (gratitude && typeof gratitude === 'object' && !Array.isArray(gratitude)) {
    const g = { ...(gratitude as RecordLike) }
    if (Array.isArray(g.items)) {
      g.items = (g.items as unknown[])
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .slice(0, DREAM_CATCHER_LIMITS.gratitudeItems.max)
    }
    clamped.gratitude_starters = g
  }

  const fitness = clamped.fitness_profile
  if (fitness && typeof fitness === 'object' && !Array.isArray(fitness)) {
    const f = { ...(fitness as RecordLike) }
    if (Array.isArray(f.goals)) {
      f.goals = (f.goals as unknown[]).slice(0, DREAM_CATCHER_LIMITS.fitnessGoals.max)
    }
    clamped.fitness_profile = f
  }

  return clamped
}

/** Trim assessment for API prompts so context stays within token limits. */
export function summarizeAssessmentForPrompt(data: RecordLike): RecordLike {
  const clamped = clampAssessmentData(data)
  return {
    personality_traits: clamped.personality_traits,
    personal_insights: Array.isArray(clamped.personal_insights)
      ? (clamped.personal_insights as string[]).slice(-8)
      : [],
    measurement_preferences: clamped.measurement_preferences,
    dreams_discovered: Array.isArray(clamped.dreams_discovered)
      ? (clamped.dreams_discovered as string[]).slice(-5)
      : [],
    vision_statement: clamped.vision_statement,
    life_plan_summary:
      typeof clamped.life_plan_summary === 'string'
        ? (clamped.life_plan_summary as string).slice(0, 800)
        : undefined,
    goals_generated: clamped.goals_generated,
    project_ideas: clamped.project_ideas,
    habit_ideas: clamped.habit_ideas,
    task_ideas: clamped.task_ideas,
    education_items: clamped.education_items,
    fitness_profile: clamped.fitness_profile,
    ruminations: clamped.ruminations,
    gratitude_starters: clamped.gratitude_starters,
    key_relationships: clamped.key_relationships,
  }
}
