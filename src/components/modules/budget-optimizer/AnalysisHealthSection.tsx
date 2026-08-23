'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { buildAnalysisReasoning, buildNetWorthNarrative } from '@/lib/budget/analysis-reasoning'
import type { NormalizedBudgetAnalysis } from '@/lib/budget/normalize-budget-analysis'
import type { NetWorthPeriodChange } from '@/lib/budget/net-worth-period-change'
import { parseSpendingSummary } from '@/lib/budget/parse-spending-summary'
import { sanitizeAnalysisText } from '@/lib/budget/sanitize-analysis-text'

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

function healthScoreClass(score: number): string {
  if (score >= 80) return 'budget-analysis-score-high'
  if (score >= 60) return 'budget-analysis-score-mid'
  return 'budget-analysis-score-low'
}

export function AnalysisHealthSection(props: {
  analysis: NormalizedBudgetAnalysis
  spendingSummary?: Record<string, unknown> | null
  periodChange: NetWorthPeriodChange | null
  netWorthLoading?: boolean
}) {
  const { analysis, spendingSummary, periodChange, netWorthLoading } = props
  const [healthTab, setHealthTab] = useState<'summary' | 'reasoning'>('summary')
  const spending = parseSpendingSummary(spendingSummary)
  const narrative = buildNetWorthNarrative(periodChange, analysis, spending)
  const reasoning = buildAnalysisReasoning(analysis, spending, periodChange)
  const assessment = sanitizeAnalysisText(
    analysis.financial_health.assessment,
    'The score reflects income, spending, and goal alignment from this period.'
  )

  const change = periodChange?.change ?? null
  const ChangeIcon =
    change == null ? Minus : change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
  const changeClass =
    change == null
      ? 'budget-analysis-muted'
      : change > 0
        ? 'budget-analysis-positive'
        : change < 0
          ? 'budget-analysis-negative'
          : 'budget-analysis-body'

  return (
    <>
      <div className="budget-analysis-section">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold budget-analysis-section-title">
              Net worth change this period
            </h3>
            <p className="text-sm budget-analysis-muted mt-1">
              {periodChange
                ? `${periodChange.startDate} → ${periodChange.endDate}`
                : 'Uses the date range selected for this analysis.'}
            </p>
          </div>
          <div className={`flex items-center gap-2 text-xl font-semibold ${changeClass}`}>
            <ChangeIcon className="h-5 w-5" />
            {netWorthLoading && change == null
              ? 'Loading…'
              : change == null
                ? 'Not enough net worth history'
                : `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatUsd(Math.abs(change))}`}
            {change != null && periodChange?.changePct != null && (
              <span className="text-sm font-medium">{formatPct(periodChange.changePct)}</span>
            )}
          </div>
        </div>

        {periodChange?.startValue != null && periodChange.endValue != null && (
          <p className="text-sm budget-analysis-body mb-4">
            Started at {formatUsd(periodChange.startValue)} and ended at{' '}
            {formatUsd(periodChange.endValue)}.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium budget-analysis-positive mb-2">Positives</h4>
            {narrative.positives.length === 0 ? (
              <p className="text-sm budget-analysis-muted">
                No clear positives tied to this net worth change yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {narrative.positives.map((item, index) => (
                  <li key={index} className="flex items-start text-sm budget-analysis-body">
                    <CheckCircle className="h-4 w-4 budget-analysis-positive mr-2 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="font-medium budget-analysis-warning mb-2">Negatives</h4>
            {narrative.negatives.length === 0 ? (
              <p className="text-sm budget-analysis-muted">
                No clear negatives tied to this net worth change yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {narrative.negatives.map((item, index) => (
                  <li key={index} className="flex items-start text-sm budget-analysis-body">
                    <AlertTriangle className="h-4 w-4 budget-analysis-negative mr-2 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="budget-analysis-section">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold budget-analysis-section-title">
            Financial Health Score
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${healthScoreClass(analysis.financial_health.score)}`}
          >
            {analysis.financial_health.score}/100
          </span>
        </div>

        <div className="budget-analysis-inner-tabs mb-4" role="tablist" aria-label="Health score">
          <button
            type="button"
            role="tab"
            aria-selected={healthTab === 'summary'}
            className={`budget-analysis-inner-tab ${healthTab === 'summary' ? 'budget-analysis-inner-tab--active' : ''}`}
            onClick={() => setHealthTab('summary')}
          >
            Summary
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={healthTab === 'reasoning'}
            className={`budget-analysis-inner-tab ${healthTab === 'reasoning' ? 'budget-analysis-inner-tab--active' : ''}`}
            onClick={() => setHealthTab('reasoning')}
          >
            Logic and Reasoning
          </button>
        </div>

        {healthTab === 'summary' ? (
          <div>
            <p className="budget-analysis-body mb-4">{assessment}</p>
            {analysis.financial_health.goal_progress && (
              <div className="pt-4 border-t border-[hsl(43_76%_52%/0.25)]">
                <h4 className="font-medium budget-analysis-highlight mb-2">Goal Progress</h4>
                <p className="text-sm budget-analysis-body">
                  {sanitizeAnalysisText(analysis.financial_health.goal_progress, '')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm budget-analysis-muted">
              Evidence behind this score and the recommendations — not the raw model output.
            </p>
            {reasoning.map((section) => (
              <div key={section.title}>
                <h4 className="font-medium budget-analysis-highlight mb-2">{section.title}</h4>
                <ul className="space-y-1">
                  {section.bullets.map((bullet, index) => (
                    <li key={index} className="text-sm budget-analysis-body pl-4 relative">
                      <span className="absolute left-0 text-[hsl(43_76%_52%)]">•</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
