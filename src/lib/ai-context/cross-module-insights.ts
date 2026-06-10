/**
 * Precomputed cross-module signals for decision-tree reasoning in Advisor chat.
 */
import type {
  CrossModuleInsight,
  CrossModuleInsightsSummary,
  ModuleContextSummary,
} from '@/types/context-cache'
import type { RawUserData } from './fetch-user-data'

const FINANCIAL_GOAL_KEYWORDS = [
  'money',
  'financial',
  'income',
  'save',
  'saving',
  'budget',
  'debt',
  'revenue',
  'profit',
  'invest',
  'spend',
  'payment',
  'earn',
]

function isFinancialGoal(title: string, category?: string): boolean {
  const text = `${title} ${category ?? ''}`.toLowerCase()
  return FINANCIAL_GOAL_KEYWORDS.some((k) => text.includes(k))
}

function getModuleSummary(
  summaries: ModuleContextSummary[],
  moduleId: string
): ModuleContextSummary | undefined {
  return summaries.find((s) => s.moduleId === moduleId)
}

export function buildCrossModuleInsights(
  raw: RawUserData,
  moduleSummaries: ModuleContextSummary[]
): CrossModuleInsightsSummary {
  const insights: CrossModuleInsight[] = []
  const emotionalThemes: string[] = []
  const budget = raw.budgetContext
  const budgetMod = getModuleSummary(moduleSummaries, 'budget-optimizer')
  const traderMod = getModuleSummary(moduleSummaries, 'day-trader')
  const fitnessMod = getModuleSummary(moduleSummaries, 'fitness-tracker')
  const narrativeMod = getModuleSummary(moduleSummaries, 'narrative-integration')
  const focusMod = getModuleSummary(moduleSummaries, 'focus-enhancer')
  const gratitudeMod = getModuleSummary(moduleSummaries, 'gratitude-journal')
  const groceryMod = getModuleSummary(moduleSummaries, 'grocery-optimizer')

  const financialGoals = [
    ...raw.userGoals.filter((g) =>
      isFinancialGoal(String(g.title ?? ''), String(g.category ?? ''))
    ),
    ...(budgetMod?.objectiveFacts.filter((f) => f.includes('Budget goal')) ?? []),
  ]

  if (budget?.monthNet != null && budget.monthNet < 0) {
    insights.push({
      id: 'negative_monthly_cashflow',
      category: 'financial management',
      insight: `Last 30 days spending exceeded income by $${Math.abs(budget.monthNet).toFixed(0)}.`,
      relatedModules: ['budget-optimizer'],
      suggestedFollowUp:
        financialGoals.length > 0
          ? "Compare this gap to the user's financial goals and identify which spending categories diverged most."
          : 'Ask which categories increased and whether any were one-time vs recurring.',
    })
  }

  if (budget?.tradingTransferTotal && budget.tradingTransferTotal > 500) {
    const hasTraderData = traderMod?.hasData
    insights.push({
      id: 'trading_transfers_detected',
      category: 'stock trading',
      insight: `$${budget.tradingTransferTotal.toFixed(0)} transferred to trading/investment platforms in the last 30 days.`,
      relatedModules: ['budget-optimizer', 'day-trader'],
      suggestedFollowUp: hasTraderData
        ? 'Cross-reference trading analyses and ask whether recent market performance explains monthly losses.'
        : 'Ask if recent market losses may explain the monthly shortfall; suggest logging analyses in Market Advisor.',
    })
  }

  if (
    budget?.monthExpenses != null &&
    budget?.monthIncome != null &&
    budget.monthExpenses > budget.monthIncome * 1.15
  ) {
    insights.push({
      id: 'spending_above_income',
      category: 'spending improvement',
      insight: `Spending ($${budget.monthExpenses.toFixed(0)}) is materially above income ($${budget.monthIncome.toFixed(0)}) this month.`,
      relatedModules: ['budget-optimizer'],
      suggestedFollowUp:
        'Review top spending categories and unusual transfers (ATM, cash apps) before assuming market losses.',
    })
  }

  if (financialGoals.length > 0 && budget?.monthNet != null && budget.monthNet < 0) {
    insights.push({
      id: 'goals_vs_cashflow',
      category: 'financial management',
      insight:
        'User has financial goals but negative recent cash flow — likely blocking progress toward those goals.',
      relatedModules: ['budget-optimizer', 'day-trader'],
      suggestedFollowUp:
        'Name the specific goal, quantify the gap, and explore income vs spending vs investment losses as separate branches.',
    })
  }

  if (fitnessMod?.hasData && fitnessMod.objectiveFacts.some((f) => f.includes('stress'))) {
    const lowEnergy = fitnessMod.objectiveFacts.some(
      (f) => f.includes('energy') && /[1-4]\/10/.test(f)
    )
    if (lowEnergy) {
      insights.push({
        id: 'low_energy_fitness',
        category: 'alignment of goals to current energy levels',
        insight:
          'Fitness data shows low energy or elevated stress — may affect task and goal capacity.',
        relatedModules: ['fitness-tracker'],
        suggestedFollowUp:
          'Before pushing productivity, align daily plan to energy; reference specific biometrics if present.',
      })
    }
  }

  if (groceryMod?.hasData && budgetMod?.hasData) {
    insights.push({
      id: 'nutrition_spending_link',
      category: 'nutrition improvement',
      insight:
        'Both grocery purchase history and budget data are available — can connect food choices to spending.',
      relatedModules: ['grocery-optimizer', 'budget-optimizer'],
      suggestedFollowUp:
        'Reference specific receipt items or categories when discussing nutrition or food spending tradeoffs.',
    })
  }

  for (const mod of [narrativeMod, focusMod, gratitudeMod]) {
    if (!mod?.hasData) continue
    for (const note of mod.subjectiveNotes.slice(0, 2)) {
      emotionalThemes.push(`${mod.moduleId}: ${note.slice(0, 120)}`)
    }
  }

  if (emotionalThemes.length) {
    insights.push({
      id: 'emotional_context_available',
      category: 'emotional stability',
      insight:
        'User has recorded emotional/spiritual content in I Am Present, Focus Enhancer, or Gratitude Journal.',
      relatedModules: [
        'narrative-integration',
        'focus-enhancer',
        'gratitude-journal',
        'dating-manager',
        'relationship-manager',
      ],
      suggestedFollowUp:
        'Lead with empathy; reference their own words before giving practical next steps.',
    })
  }

  return {
    insights,
    emotionalThemes: emotionalThemes.slice(0, 6),
    financialSnapshot: budget
      ? {
          monthIncome: budget.monthIncome,
          monthExpenses: budget.monthExpenses,
          monthNet: budget.monthNet,
          tradingTransferTotal: budget.tradingTransferTotal,
          topSpendingCategories: budget.topSpendingCategories,
        }
      : undefined,
  }
}

export function formatCrossModuleInsightsForPrompt(
  summary: CrossModuleInsightsSummary | null
): string {
  if (!summary?.insights?.length) {
    return 'CROSS-MODULE SIGNALS: None precomputed — infer links from MODULE CONTEXT and dashboard data.'
  }

  const lines = summary.insights.map(
    (i) =>
      `- [${i.category}] ${i.insight} (modules: ${i.relatedModules.join(', ')})${i.suggestedFollowUp ? ` → ${i.suggestedFollowUp}` : ''}`
  )

  return `CROSS-MODULE SIGNALS (use as decision-tree hints — verify against MODULE CONTEXT before stating as fact):\n${lines.join('\n')}`
}
