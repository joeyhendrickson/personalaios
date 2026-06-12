import { describe, expect, it } from 'vitest'
import { normalizeBudgetAnalysis, parseBudgetAnalysisText } from './normalize-budget-analysis'

describe('parseBudgetAnalysisText', () => {
  it('parses JSON wrapped in markdown fences', () => {
    const parsed = parseBudgetAnalysisText(
      '```json\n{"financial_health":{"score":82,"assessment":"Good"}}\n```'
    )
    expect(parsed).toEqual({
      financial_health: { score: 82, assessment: 'Good' },
    })
  })

  it('extracts the first JSON object from surrounding text', () => {
    const parsed = parseBudgetAnalysisText(
      'Here is your analysis:\n{"financial_health":{"score":55}}\nThanks!'
    )
    expect(parsed).toEqual({ financial_health: { score: 55 } })
  })
})

describe('normalizeBudgetAnalysis', () => {
  it('fills required UI fields when the model returns a partial payload', () => {
    const normalized = normalizeBudgetAnalysis(
      { financial_health: { score: 61, assessment: 'Needs work' } },
      { totalExpenses: 1200, totalIncome: 3000 }
    )

    expect(normalized.financial_health.score).toBe(61)
    expect(normalized.financial_health.strengths.length).toBeGreaterThan(0)
    expect(normalized.financial_health.concerns.length).toBeGreaterThan(0)
    expect(normalized.savings_opportunities).toHaveLength(1)
    expect(normalized.actionable_insights).toHaveLength(1)
    expect(normalized.budget_recommendations.income_allocation.needs).toBe(50)
    expect(normalized.monthly_budget_suggestion.total_income).toBe(3000)
  })

  it('returns a render-safe empty-state analysis', () => {
    const normalized = normalizeBudgetAnalysis(null, {
      emptyMessage: 'No transactions found. Please sync your bank accounts first.',
    })

    expect(normalized.financial_health.assessment).toContain('No transactions found')
    expect(normalized.savings_opportunities).toHaveLength(1)
    expect(normalized.actionable_insights[0].priority).toBe('medium')
  })
})
