import { describe, expect, it } from 'vitest'
import { normalizeOnboardingPlan } from './normalize-onboarding-plan'

describe('normalizeOnboardingPlan', () => {
  it('sanitizes task categories that fail taskCategorySchema', () => {
    const normalized = normalizeOnboardingPlan({
      summary: 'Plan',
      items: [
        {
          type: 'create_goal',
          title: 'Launch my side business',
          goal_type: 'monthly',
          target_value: 1,
          target_unit: 'milestone',
          priority_level: 3,
        },
        {
          type: 'create_project',
          title: 'Validate the approach and audience',
          goal_title_ref: 'Launch my side business',
          category: 'business',
          target_points: 20,
          priority: 'medium',
        },
        {
          type: 'create_task',
          title: 'Research competitors',
          project_title: 'Validate the approach and audience',
          category: 'Business Growth',
          points_value: 5,
        },
      ],
    })

    expect(normalized).not.toBeNull()
    const task = normalized!.items.find((item) => item.type === 'create_task')
    expect(task?.type).toBe('create_task')
    if (task?.type === 'create_task') {
      expect(task.category).toBe('business_growth')
    }
  })

  it('coerces string goal metrics before validation', () => {
    const normalized = normalizeOnboardingPlan({
      summary: 'Plan',
      items: [
        {
          type: 'create_goal',
          title: 'Run a 5K',
          goal_type: 'monthly',
          target_value: '5',
          target_unit: '',
          priority_level: 3,
        },
        {
          type: 'create_project',
          title: 'Training block',
          goal_title_ref: 'Run a 5K',
          category: 'health',
          target_points: 10,
          priority: 'medium',
        },
        {
          type: 'create_task',
          title: 'Buy running shoes',
          project_title: 'Training block',
          category: 'other',
          points_value: 5,
        },
      ],
    })

    expect(normalized).not.toBeNull()
    const goal = normalized!.items.find((item) => item.type === 'create_goal')
    expect(goal?.type).toBe('create_goal')
    if (goal?.type === 'create_goal') {
      expect(goal.target_value).toBe(5)
      expect(goal.target_unit).toBe('milestone')
    }
  })
})
