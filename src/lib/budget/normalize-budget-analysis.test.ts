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

  it('does not use raw model JSON as the assessment or other prose fields', () => {
    const dump = JSON.stringify({
      financial_health: { score: 40, assessment: 'hidden' },
      spending_patterns: { trends: ['ok'] },
    })
    const normalized = normalizeBudgetAnalysis(
      { financial_health: { score: 74, assessment: dump, strengths: [dump] } },
      { rawText: dump, totalExpenses: 500, totalIncome: 2000 }
    )

    expect(normalized.financial_health.assessment).not.toContain('{')
    expect(normalized.financial_health.assessment).not.toContain('"financial_health"')
    expect(normalized.financial_health.strengths.every((item) => !item.includes('{'))).toBe(true)
    expect(normalized.savings_opportunities[0].recommendation).not.toContain('{')
    expect(normalized.monthly_budget_suggestion.breakdown).not.toContain('{')
    expect(normalized.spending_patterns.discrepancies?.expected_vs_actual_income).not.toContain('{')
  })
})
