export const NUTRITION_PLAN_TYPES = [
  'weight_loss',
  'muscle_gain',
  'maintenance',
  'performance',
  'medical',
] as const

export type NutritionPlanType = (typeof NUTRITION_PLAN_TYPES)[number]

const GOAL_TO_PLAN: Record<string, NutritionPlanType> = {
  weight_loss: 'weight_loss',
  muscle_gain: 'muscle_gain',
  endurance: 'performance',
  strength: 'performance',
  flexibility: 'maintenance',
  body_recomposition: 'maintenance',
  general_fitness: 'maintenance',
}

const TOKEN_TO_PLAN: Record<string, NutritionPlanType> = {
  weight_loss: 'weight_loss',
  weightloss: 'weight_loss',
  fat_loss: 'weight_loss',
  loss: 'weight_loss',
  cutting: 'weight_loss',
  cut: 'weight_loss',
  muscle_gain: 'muscle_gain',
  musclegain: 'muscle_gain',
  bulking: 'muscle_gain',
  bulk: 'muscle_gain',
  gain: 'muscle_gain',
  maintenance: 'maintenance',
  maintain: 'maintenance',
  balanced: 'maintenance',
  general: 'maintenance',
  general_fitness: 'maintenance',
  body_recomposition: 'maintenance',
  recomposition: 'maintenance',
  performance: 'performance',
  athletic: 'performance',
  endurance: 'performance',
  strength: 'performance',
  sport: 'performance',
  sports: 'performance',
  medical: 'medical',
  therapeutic: 'medical',
  clinical: 'medical',
}

function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/[/|,>]+/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((t) => t.replace(/[^a-z0-9_]/g, '').replace(/\s+/g, '_'))
    .filter(Boolean)
}

function matchToken(token: string): NutritionPlanType | null {
  if (NUTRITION_PLAN_TYPES.includes(token as NutritionPlanType)) {
    return token as NutritionPlanType
  }
  if (TOKEN_TO_PLAN[token]) return TOKEN_TO_PLAN[token]
  if (token.includes('loss') || token.includes('cut')) return 'weight_loss'
  if (token.includes('muscle') || token.includes('bulk')) return 'muscle_gain'
  if (token.includes('perform') || token.includes('endurance') || token.includes('strength')) {
    return 'performance'
  }
  if (token.includes('medical') || token.includes('therap')) return 'medical'
  if (token.includes('maintain') || token.includes('balance')) return 'maintenance'
  return null
}

export function inferNutritionPlanTypeFromGoals(
  goals: Array<{ goal_type?: string | null }>
): NutritionPlanType | null {
  for (const goal of goals) {
    const key = (goal.goal_type || '').toLowerCase().replace(/[\s-]+/g, '_')
    if (GOAL_TO_PLAN[key]) return GOAL_TO_PLAN[key]
  }
  return null
}

/** Map AI/manual labels to values allowed by nutrition_plans_plan_type_check. */
export function normalizeNutritionPlanType(
  raw: unknown,
  goals: Array<{ goal_type?: string | null }> = []
): NutritionPlanType {
  if (typeof raw === 'string' && raw.trim()) {
    for (const token of tokenize(raw)) {
      const match = matchToken(token)
      if (match) return match
    }
    const whole = raw.toLowerCase().replace(/[\s-]+/g, '_')
    const wholeMatch = matchToken(whole)
    if (wholeMatch) return wholeMatch
  }

  return inferNutritionPlanTypeFromGoals(goals) ?? 'maintenance'
}

export function parseAiJsonResponse(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  const jsonStr = (fenced ? fenced[1] : trimmed).trim()
  return JSON.parse(jsonStr)
}
