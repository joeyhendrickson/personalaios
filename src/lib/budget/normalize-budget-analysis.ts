export type BudgetAnalysisWasteArea = {
  total: number
  transaction_count: number
  recommendations: string[]
}

export type BudgetAnalysisWasteAreas = {
  frequently_eating_out: BudgetAnalysisWasteArea
  impulse_online_buying: BudgetAnalysisWasteArea
  unused_memberships_subscriptions: BudgetAnalysisWasteArea
  convenience_foods_drinks: BudgetAnalysisWasteArea
  food_waste: BudgetAnalysisWasteArea & {
    grocery_spending: number
    note?: string
  }
  total_waste_spending: number
}

export type NormalizedBudgetAnalysis = {
  spending_patterns: {
    trends: string[]
    unusual_spending: string[]
    seasonal_patterns: string[]
    discrepancies?: {
      expected_vs_actual_income?: string
      expected_vs_actual_expenses?: string
      missing_categories?: string[]
      unexpected_income?: string[]
    }
  }
  accountability_questions?: Array<{
    question: string
    category: string
    context: string
    transactions?: Array<{ date: string; name: string; amount: number }>
  }>
  side_business_analysis?: {
    potential_income: number
    transfers_analysis: string
    recommendations: string[]
    questions: string[]
  }
  subscription_analysis?: {
    total_subscription_spending: number
    unaccounted_subscriptions: Array<{ name: string; amount: number; date: string }>
    recommendations: string[]
  }
  goal_alignment?: {
    connected_goals: Array<{ title: string; description?: string }>
    income_goal_coaching: string[]
    budget_reduction_coaching: string[]
    business_launch_recommendations: string[]
  }
  waste_area_analysis?: BudgetAnalysisWasteAreas
  savings_opportunities: Array<{
    category: string
    current_spending: number
    potential_savings: number
    savings_percentage: number
    recommendation: string
    connection_to_goals?: string
  }>
  budget_recommendations: {
    income_allocation: { needs: number; wants: number; savings: number }
    category_budgets: Array<{
      category: string
      recommended_amount: number
      current_spending: number
      adjustment: number
      reasoning: string
      goal_alignment?: string
    }>
    expected_income_updates?: Array<{
      suggestion: string
      reasoning: string
      estimated_amount: number
    }>
    expected_expense_updates?: Array<{
      suggestion: string
      reasoning: string
      estimated_amount?: number
      current_amount?: number
      recommended_amount?: number
    }>
  }
  financial_health: {
    score: number
    assessment: string
    strengths: string[]
    concerns: string[]
    goal_progress?: string
  }
  actionable_insights: Array<{
    priority: 'high' | 'medium' | 'low'
    action: string
    impact: string
    timeline: string
    connected_goal?: string | null
  }>
  monthly_budget_suggestion: {
    total_income: number
    recommended_expenses: number
    recommended_savings: number
    breakdown: string
  }
  cross_module_insights?: string[]
  thirty_day_actuals?: {
    income_actuals: Array<{
      category: string
      expected: number
      actual: number
      difference: number
      percentage_difference?: number
    }>
    expense_actuals: Array<{
      category: string
      expected: number
      actual: number
      difference: number
      percentage_difference?: number
    }>
    categorization_stats?: {
      incomeTransactions: number
      expenseTransactions: number
      transferTransactions: number
      incomeAssigned: number
      incomeUnassigned: number
      expenseAssigned: number
      expenseUnassigned: number
    }
  }
}

export type BudgetAnalysisFallbacks = {
  rawText?: string
  totalExpenses?: number
  totalIncome?: number
  totalExpectedMonthlyIncome?: number
  totalIncomingP2P?: number
  missingSubscriptions?: Array<{ name: string; amount: number; date: string }>
  subscriptionTotal?: number
  relevantGoals?: Array<{ title: string; description?: string }>
  wasteAreaAnalysis?: BudgetAnalysisWasteAreas
  thirtyDayActuals?: NormalizedBudgetAnalysis['thirty_day_actuals']
  emptyMessage?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((item): item is string => typeof item === 'string')
}

function normalizePriority(value: unknown): 'high' | 'medium' | 'low' {
  const priority = asString(value, 'medium').toLowerCase()
  if (priority === 'high' || priority === 'low') return priority
  return 'medium'
}

function buildDefaultWasteAreaAnalysis(
  fallbacks: BudgetAnalysisFallbacks
): BudgetAnalysisWasteAreas {
  if (fallbacks.wasteAreaAnalysis) return fallbacks.wasteAreaAnalysis

  const emptyArea = (): BudgetAnalysisWasteArea => ({
    total: 0,
    transaction_count: 0,
    recommendations: [],
  })

  return {
    frequently_eating_out: emptyArea(),
    impulse_online_buying: emptyArea(),
    unused_memberships_subscriptions: emptyArea(),
    convenience_foods_drinks: emptyArea(),
    food_waste: {
      total: 0,
      grocery_spending: 0,
      transaction_count: 0,
      recommendations: [],
      note: 'Estimated as 25% of grocery spending',
    },
    total_waste_spending: 0,
  }
}

export function parseBudgetAnalysisText(text: string): unknown | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  try {
    return JSON.parse(withoutFences)
  } catch {
    const match = withoutFences.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

export function normalizeBudgetAnalysis(
  raw: unknown,
  fallbacks: BudgetAnalysisFallbacks = {}
): NormalizedBudgetAnalysis {
  const obj = asRecord(raw) ?? {}
  const rawText = fallbacks.rawText?.trim() ?? ''
  const emptyMessage =
    fallbacks.emptyMessage ??
    (typeof obj.message === 'string' ? obj.message : '') ??
    'Run analysis to generate insights.'

  const totalExpenses = fallbacks.totalExpenses ?? 0
  const totalIncome = fallbacks.totalIncome ?? 0
  const totalExpectedMonthlyIncome = fallbacks.totalExpectedMonthlyIncome ?? 0
  const monthlyIncome = totalExpectedMonthlyIncome || (totalIncome > 0 ? totalIncome : 0)

  const spendingPatterns = asRecord(obj.spending_patterns)
  const discrepancies = asRecord(spendingPatterns?.discrepancies)
  const financialHealth = asRecord(obj.financial_health)
  const budgetRecommendations = asRecord(obj.budget_recommendations)
  const incomeAllocation = asRecord(budgetRecommendations?.income_allocation)
  const monthlyBudget = asRecord(obj.monthly_budget_suggestion)
  const sideBusiness = asRecord(obj.side_business_analysis)
  const subscriptionAnalysis = asRecord(obj.subscription_analysis)
  const goalAlignment = asRecord(obj.goal_alignment)
  const wasteAreaAnalysis = asRecord(obj.waste_area_analysis)

  const defaultAssessment =
    emptyMessage ||
    rawText ||
    asString(financialHealth?.assessment, 'Based on your transaction data')

  const normalized: NormalizedBudgetAnalysis = {
    spending_patterns: {
      trends: asStringArray(spendingPatterns?.trends, ['Analysis provided in recommendations']),
      unusual_spending: asStringArray(spendingPatterns?.unusual_spending, [
        'See detailed analysis above',
      ]),
      seasonal_patterns: asStringArray(spendingPatterns?.seasonal_patterns, [
        'Pattern analysis included',
      ]),
      discrepancies: {
        expected_vs_actual_income: asString(
          discrepancies?.expected_vs_actual_income,
          rawText || defaultAssessment
        ),
        expected_vs_actual_expenses: asString(
          discrepancies?.expected_vs_actual_expenses,
          rawText || defaultAssessment
        ),
        missing_categories: asStringArray(discrepancies?.missing_categories, []),
        unexpected_income: asStringArray(discrepancies?.unexpected_income, []),
      },
    },
    accountability_questions: [],
    side_business_analysis: {
      potential_income: asNumber(sideBusiness?.potential_income, fallbacks.totalIncomingP2P ?? 0),
      transfers_analysis: asString(
        sideBusiness?.transfers_analysis,
        rawText || 'Review P2P transfers for potential side income.'
      ),
      recommendations: asStringArray(sideBusiness?.recommendations, [
        'Review analysis for specific recommendations',
      ]),
      questions: asStringArray(sideBusiness?.questions, [
        'Are incoming P2P transfers from side business income?',
      ]),
    },
    subscription_analysis: {
      total_subscription_spending: asNumber(
        subscriptionAnalysis?.total_subscription_spending,
        fallbacks.subscriptionTotal ?? 0
      ),
      unaccounted_subscriptions:
        asArray(subscriptionAnalysis?.unaccounted_subscriptions).length > 0
          ? asArray<{ name: string; amount: number; date: string }>(
              subscriptionAnalysis?.unaccounted_subscriptions
            )
          : (fallbacks.missingSubscriptions ?? []),
      recommendations: asStringArray(subscriptionAnalysis?.recommendations, [
        'Review analysis for subscription management recommendations',
      ]),
    },
    goal_alignment: {
      connected_goals:
        asArray(goalAlignment?.connected_goals).length > 0
          ? asArray<{ title: string; description?: string }>(goalAlignment?.connected_goals)
          : (fallbacks.relevantGoals ?? []),
      income_goal_coaching: asStringArray(goalAlignment?.income_goal_coaching, [
        'Review analysis for income growth coaching',
      ]),
      budget_reduction_coaching: asStringArray(goalAlignment?.budget_reduction_coaching, [
        'Review analysis for budget reduction coaching',
      ]),
      business_launch_recommendations: asStringArray(
        goalAlignment?.business_launch_recommendations,
        ['Review analysis for business launch strategies']
      ),
    },
    waste_area_analysis: normalizeWasteAreaAnalysis(wasteAreaAnalysis, fallbacks),
    savings_opportunities:
      asArray(obj.savings_opportunities).length > 0
        ? asArray<NormalizedBudgetAnalysis['savings_opportunities'][number]>(
            obj.savings_opportunities
          )
        : [
            {
              category: 'General',
              current_spending: totalExpenses,
              potential_savings: totalExpenses * 0.1,
              savings_percentage: 10,
              recommendation: rawText || defaultAssessment,
              connection_to_goals: 'Review analysis for goal connections',
            },
          ],
    budget_recommendations: {
      income_allocation: {
        needs: asNumber(incomeAllocation?.needs, 50),
        wants: asNumber(incomeAllocation?.wants, 30),
        savings: asNumber(incomeAllocation?.savings, 20),
      },
      category_budgets: asArray(budgetRecommendations?.category_budgets),
      expected_income_updates: asArray(budgetRecommendations?.expected_income_updates),
      expected_expense_updates: asArray(budgetRecommendations?.expected_expense_updates),
    },
    financial_health: {
      score: asNumber(financialHealth?.score, emptyMessage ? 0 : 70),
      assessment: defaultAssessment,
      strengths: asStringArray(financialHealth?.strengths, [
        'Regular income and spending tracking',
      ]),
      concerns: asStringArray(financialHealth?.concerns, [
        'Review detailed analysis for specific areas',
      ]),
      goal_progress: asString(financialHealth?.goal_progress) || undefined,
    },
    actionable_insights:
      asArray(obj.actionable_insights).length > 0
        ? asArray<Record<string, unknown>>(obj.actionable_insights).map((insight) => ({
            priority: normalizePriority(insight.priority),
            action: asString(insight.action, 'Review the detailed analysis above'),
            impact: asString(insight.impact, 'Improved financial awareness'),
            timeline: asString(insight.timeline, 'Immediate'),
            connected_goal:
              insight.connected_goal == null ? null : asString(insight.connected_goal),
          }))
        : [
            {
              priority: 'medium' as const,
              action: 'Review the detailed analysis above',
              impact: 'Improved financial awareness',
              timeline: 'Immediate',
              connected_goal: null,
            },
          ],
    monthly_budget_suggestion: {
      total_income: asNumber(monthlyBudget?.total_income, monthlyIncome),
      recommended_expenses: asNumber(
        monthlyBudget?.recommended_expenses,
        monthlyIncome > 0 ? monthlyIncome * 0.8 : 0
      ),
      recommended_savings: asNumber(
        monthlyBudget?.recommended_savings,
        monthlyIncome > 0 ? monthlyIncome * 0.2 : 0
      ),
      breakdown: asString(monthlyBudget?.breakdown, rawText || 'See detailed analysis above'),
    },
    cross_module_insights: asStringArray(obj.cross_module_insights, [
      'Review analysis for cross-module insights',
    ]),
    thirty_day_actuals: normalizeThirtyDayActuals(
      obj.thirty_day_actuals,
      fallbacks.thirtyDayActuals
    ),
  }

  const accountabilityQuestions = asArray<Record<string, unknown>>(obj.accountability_questions)
  normalized.accountability_questions =
    accountabilityQuestions.length > 0
      ? accountabilityQuestions.map((question) => ({
          question: asString(question.question, 'Review your spending in this category'),
          category: asString(question.category, 'General'),
          context: asString(question.context, 'Spending review'),
          transactions: asArray<{ date: string; name: string; amount: number }>(
            question.transactions
          ),
        }))
      : [
          {
            question:
              'Review the detailed analysis above for specific questions about your spending habits',
            category: 'General',
            context: 'Understanding your spending patterns',
            transactions: [],
          },
        ]

  return normalized
}

function normalizeWasteAreaAnalysis(
  raw: Record<string, unknown> | null,
  fallbacks: BudgetAnalysisFallbacks
): BudgetAnalysisWasteAreas {
  const defaults = buildDefaultWasteAreaAnalysis(fallbacks)

  if (!raw) return defaults

  const normalizeArea = (
    key: keyof Omit<BudgetAnalysisWasteAreas, 'total_waste_spending' | 'food_waste'>,
    fallback: BudgetAnalysisWasteArea
  ): BudgetAnalysisWasteArea => {
    const area = asRecord(raw[key])
    if (!area) return fallback
    return {
      total: asNumber(area.total, fallback.total),
      transaction_count: asNumber(area.transaction_count, fallback.transaction_count),
      recommendations: asStringArray(area.recommendations, fallback.recommendations),
    }
  }

  const foodWasteRaw = asRecord(raw.food_waste)
  const foodWasteFallback = defaults.food_waste

  return {
    frequently_eating_out: normalizeArea('frequently_eating_out', defaults.frequently_eating_out),
    impulse_online_buying: normalizeArea('impulse_online_buying', defaults.impulse_online_buying),
    unused_memberships_subscriptions: normalizeArea(
      'unused_memberships_subscriptions',
      defaults.unused_memberships_subscriptions
    ),
    convenience_foods_drinks: normalizeArea(
      'convenience_foods_drinks',
      defaults.convenience_foods_drinks
    ),
    food_waste: {
      total: asNumber(foodWasteRaw?.total, foodWasteFallback.total),
      grocery_spending: asNumber(
        foodWasteRaw?.grocery_spending,
        foodWasteFallback.grocery_spending
      ),
      transaction_count: asNumber(
        foodWasteRaw?.transaction_count,
        foodWasteFallback.transaction_count
      ),
      note: asString(foodWasteRaw?.note, foodWasteFallback.note),
      recommendations: asStringArray(
        foodWasteRaw?.recommendations,
        foodWasteFallback.recommendations
      ),
    },
    total_waste_spending: asNumber(raw.total_waste_spending, defaults.total_waste_spending),
  }
}

type ThirtyDayActualItem = {
  category: string
  expected: number
  actual: number
  difference: number
  percentage_difference?: number
}

function normalizeThirtyDayActuals(
  raw: unknown,
  fallback?: NormalizedBudgetAnalysis['thirty_day_actuals']
): NormalizedBudgetAnalysis['thirty_day_actuals'] | undefined {
  if (fallback && (fallback.income_actuals.length > 0 || fallback.expense_actuals.length > 0)) {
    return fallback
  }

  const source = asRecord(raw)
  if (!source && !fallback) return undefined

  const incomeActuals: ThirtyDayActualItem[] =
    asArray(source?.income_actuals).length > 0
      ? asArray<ThirtyDayActualItem>(source?.income_actuals)
      : (fallback?.income_actuals ?? [])

  const expenseActuals: ThirtyDayActualItem[] =
    asArray(source?.expense_actuals).length > 0
      ? asArray<ThirtyDayActualItem>(source?.expense_actuals)
      : (fallback?.expense_actuals ?? [])

  if (incomeActuals.length === 0 && expenseActuals.length === 0) return undefined

  return {
    income_actuals: incomeActuals,
    expense_actuals: expenseActuals,
    categorization_stats: fallback?.categorization_stats,
  }
}
