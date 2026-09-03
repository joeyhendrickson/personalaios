import { sanitizeProjectCategory, sanitizeTaskCategory } from '@/lib/dream-catcher/plan-projects'
import {
  onboardingPlanSchema,
  type OnboardingPlan,
  type OnboardingPlanItem,
} from '@/lib/dream-catcher/generate-onboarding-plan'

const GOAL_TYPES = new Set(['weekly', 'monthly', 'quarterly', 'yearly'])

function normalizeItem(item: OnboardingPlanItem): OnboardingPlanItem {
  switch (item.type) {
    case 'create_goal':
      return {
        ...item,
        goal_type: GOAL_TYPES.has(item.goal_type) ? item.goal_type : 'monthly',
        target_value:
          typeof item.target_value === 'number'
            ? item.target_value
            : Number(item.target_value) || 1,
        target_unit:
          typeof item.target_unit === 'string' && item.target_unit.trim()
            ? item.target_unit.trim().slice(0, 50)
            : 'milestone',
        priority_level:
          typeof item.priority_level === 'number'
            ? Math.min(5, Math.max(1, item.priority_level))
            : 3,
      }
    case 'create_project':
      return {
        ...item,
        category: sanitizeProjectCategory(item.category),
      }
    case 'create_task':
      return {
        ...item,
        category: sanitizeTaskCategory(item.category),
      }
    default:
      return item
  }
}

/** Coerce intake/AI plan rows into a shape that passes onboardingPlanSchema. */
export function normalizeOnboardingPlan(input: unknown): OnboardingPlan | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as OnboardingPlan
  if (!Array.isArray(raw.items) || raw.items.length === 0) return null

  try {
    return onboardingPlanSchema.parse({
      ...raw,
      summary: String(raw.summary || '').trim() || 'Life Plan from your Dream Catcher session.',
      items: raw.items.map((item) => normalizeItem(item as OnboardingPlanItem)),
    })
  } catch {
    return null
  }
}
