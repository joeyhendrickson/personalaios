import { describe, expect, it } from 'vitest'
import { isMissingBudgetAnalysesNameColumn } from './missing-name-column'

describe('isMissingBudgetAnalysesNameColumn', () => {
  it('matches the live PostgREST schema-cache error', () => {
    expect(
      isMissingBudgetAnalysesNameColumn({
        code: 'PGRST204',
        message: "Could not find the 'name' column of 'budget_analyses' in the schema cache",
      })
    ).toBe(true)
  })

  it('ignores unrelated insert errors', () => {
    expect(
      isMissingBudgetAnalysesNameColumn({
        code: '42501',
        message: 'permission denied for table budget_analyses',
      })
    ).toBe(false)
  })
})
