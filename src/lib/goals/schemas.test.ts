import { describe, expect, it } from 'vitest'
import { createGoalSchema } from './schemas'

describe('createGoalSchema', () => {
  it('accepts current_value next to target_value when creating a goal', () => {
    const parsed = createGoalSchema.parse({
      title: 'Save for a car',
      goal_type: 'yearly',
      target_value: 12000,
      current_value: 3500,
      target_unit: 'dollars',
    })

    expect(parsed.current_value).toBe(3500)
    expect(parsed.target_value).toBe(12000)
  })

  it('defaults current_value to 0 when omitted', () => {
    const parsed = createGoalSchema.parse({
      title: 'Read more',
      goal_type: 'monthly',
    })

    expect(parsed.current_value).toBe(0)
  })
})
