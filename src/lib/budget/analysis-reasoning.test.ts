import { describe, expect, it } from 'vitest'
import { buildAnalysisReasoning, buildNetWorthNarrative } from './analysis-reasoning'
import { normalizeBudgetAnalysis } from './normalize-budget-analysis'

describe('buildNetWorthNarrative', () => {
  it('lists positives when net worth rose and cash flow is positive', () => {
    const analysis = normalizeBudgetAnalysis({
      financial_health: {
        score: 80,
        assessment: 'On track.',
        strengths: ['Emergency fund is funded.'],
        concerns: ['Dining out is high.'],
      },
      waste_area_analysis: { total_waste_spending: 200 },
    })
    const narrative = buildNetWorthNarrative(
      {
        startDate: '2026-01-01',
        endDate: '2026-03-01',
        startValue: 10000,
        endValue: 12000,
        change: 2000,
        changePct: 20,
      },
      analysis,
      { net_savings: 500 }
    )

    expect(narrative.positives.some((item) => item.includes('rose'))).toBe(true)
    expect(narrative.positives.some((item) => item.includes('Cash flow was positive'))).toBe(true)
    expect(narrative.negatives.some((item) => item.includes('Dining out'))).toBe(true)
    expect(narrative.negatives.some((item) => item.includes('waste'))).toBe(true)
  })
})

describe('buildAnalysisReasoning', () => {
  it('turns structured analysis fields into readable evidence, not JSON', () => {
    const analysis = normalizeBudgetAnalysis({
      financial_health: { score: 71, assessment: 'Stable but tight.' },
      spending_patterns: { trends: ['Grocery spending rose in March.'] },
      budget_recommendations: {
        category_budgets: [{ category: 'Food', reasoning: 'Cut takeout by cooking twice a week.' }],
      },
      actionable_insights: [{ action: 'Pause unused subscriptions.', priority: 'high' }],
    })
    const sections = buildAnalysisReasoning(
      analysis,
      { total_income: 4000, total_expenses: 3500, transaction_count: 40 },
      {
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        startValue: 1,
        endValue: 2,
        change: 1,
        changePct: 100,
      }
    )

    const text = sections.flatMap((section) => section.bullets).join(' ')
    expect(text).toContain('71/100')
    expect(text).toContain('Grocery spending rose')
    expect(text).not.toContain('"financial_health"')
    expect(sections.some((section) => section.title === 'Logic and Reasoning')).toBe(false)
    expect(sections[0]?.title).toBe('How the score was formed')
  })
})
