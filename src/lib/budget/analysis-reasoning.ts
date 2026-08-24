import { sanitizeAnalysisText } from './sanitize-analysis-text'
import type { NormalizedBudgetAnalysis } from './normalize-budget-analysis'
import type { NetWorthPeriodChange } from './net-worth-period-change'

export type AnalysisReasoningSection = {
  title: string
  bullets: string[]
}

export type NetWorthNarrative = {
  positives: string[]
  negatives: string[]
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatPct(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

export function buildNetWorthNarrative(
  change: NetWorthPeriodChange | null,
  analysis: Pick<NormalizedBudgetAnalysis, 'financial_health' | 'waste_area_analysis'>,
  spending?: {
    total_income?: number
    total_expenses?: number
    net_savings?: number
  } | null
): NetWorthNarrative {
  const positives: string[] = []
  const negatives: string[] = []

  if (change?.change != null && change.startValue != null && change.endValue != null) {
    const pct = change.changePct != null ? ` (${formatPct(change.changePct)})` : ''
    if (change.change > 0) {
      positives.push(
        `Net worth rose ${formatUsd(change.change)}${pct}, from ${formatUsd(change.startValue)} to ${formatUsd(change.endValue)}.`
      )
    } else if (change.change < 0) {
      negatives.push(
        `Net worth fell ${formatUsd(Math.abs(change.change))}${pct}, from ${formatUsd(change.startValue)} to ${formatUsd(change.endValue)}.`
      )
    } else {
      positives.push(`Net worth held steady at ${formatUsd(change.endValue)} across this period.`)
    }
  }

  if (typeof spending?.net_savings === 'number') {
    if (spending.net_savings > 0) {
      positives.push(
        `Cash flow was positive: income exceeded spending by ${formatUsd(spending.net_savings)}.`
      )
    } else if (spending.net_savings < 0) {
      negatives.push(
        `Cash flow was negative: spending exceeded income by ${formatUsd(Math.abs(spending.net_savings))}.`
      )
    }
  }

  for (const strength of analysis.financial_health.strengths || []) {
    const text = sanitizeAnalysisText(strength, '')
    if (text) positives.push(text)
  }
  for (const concern of analysis.financial_health.concerns || []) {
    const text = sanitizeAnalysisText(concern, '')
    if (text) negatives.push(text)
  }

  const waste = analysis.waste_area_analysis?.total_waste_spending
  if (typeof waste === 'number' && waste > 0) {
    negatives.push(`Identified ${formatUsd(waste)} in likely waste-area spending this period.`)
  }

  return {
    positives: positives.slice(0, 8),
    negatives: negatives.slice(0, 8),
  }
}

export function buildAnalysisReasoning(
  analysis: NormalizedBudgetAnalysis,
  spending?: {
    total_income?: number
    total_expenses?: number
    net_savings?: number
    transaction_count?: number
  } | null,
  change?: NetWorthPeriodChange | null
): AnalysisReasoningSection[] {
  const sections: AnalysisReasoningSection[] = []

  const scoreBullets = [
    `Financial health score is ${analysis.financial_health.score}/100.`,
    sanitizeAnalysisText(
      analysis.financial_health.assessment,
      'The score reflects income, spending, and goal alignment from this period.'
    ),
  ]
  if (change?.change != null) {
    scoreBullets.push(
      change.change >= 0
        ? `Net worth moved ${formatUsd(change.change)} in your favor during the selected dates.`
        : `Net worth declined ${formatUsd(Math.abs(change.change))} during the selected dates.`
    )
  }
  sections.push({ title: 'How the score was formed', bullets: scoreBullets.filter(Boolean) })

  const evidence: string[] = []
  if (typeof spending?.total_income === 'number') {
    evidence.push(`Income in the analyzed transactions: ${formatUsd(spending.total_income)}.`)
  }
  if (typeof spending?.total_expenses === 'number') {
    evidence.push(`Spending in the analyzed transactions: ${formatUsd(spending.total_expenses)}.`)
  }
  if (typeof spending?.transaction_count === 'number') {
    evidence.push(`${spending.transaction_count} transactions were included in this run.`)
  }
  for (const trend of analysis.spending_patterns.trends.slice(0, 4)) {
    const text = sanitizeAnalysisText(trend, '')
    if (text) evidence.push(text)
  }
  if (evidence.length) {
    sections.push({ title: 'Numbers used as evidence', bullets: evidence })
  }

  const reasoning = (analysis.budget_recommendations.category_budgets || [])
    .map((row) => sanitizeAnalysisText(row.reasoning, ''))
    .filter(Boolean)
    .slice(0, 6)
  if (reasoning.length) {
    sections.push({ title: 'Category budget reasoning', bullets: reasoning })
  }

  const insights = (analysis.actionable_insights || [])
    .map((item) => sanitizeAnalysisText(item.action, ''))
    .filter(Boolean)
    .slice(0, 6)
  if (insights.length) {
    sections.push({ title: 'Actions this output is pointing to', bullets: insights })
  }

  return sections
}
