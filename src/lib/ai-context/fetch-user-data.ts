/**
 * Fetches raw user data from Supabase for AI context.
 * Used by cache generator and as fallback when cache is stale/missing.
 * Deterministic transformations only – no AI calls.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getModuleTables } from './module-mappings'
import type { StaticProfileSummary, StructuredStateSummary } from '@/types/context-cache'
import {
  isGoalClosed,
  isProjectCompleted,
  isTaskCompleted,
} from '@/lib/life-coach/partition-user-data'
import { sumEarnedPoints } from '@/lib/points/sum-earned-points'
import {
  aggregateClassifiedTransactions,
  classifyTransactionForContext,
} from '@/lib/budget/transaction-context'

export interface BudgetTransactionRow {
  id: string
  date: string
  amount: number
  name?: string
  merchant_name?: string
  category?: string[] | string
  type_override?: 'income' | 'expense' | 'transfer' | null
  amount_override?: number | null
}

export interface BudgetContextData {
  transactions: BudgetTransactionRow[]
  recentTransactions: Array<{
    date: string
    name: string
    amount: number
    category?: string
    kind?: string
  }>
  monthIncome?: number
  monthExpenses?: number
  monthNet?: number
  tradingTransferTotal?: number
  transferTotal?: number
  topSpendingCategories?: string[]
  overridesAppliedCount?: number
}

export async function fetchBudgetContextData(
  supabase: SupabaseClient,
  userId: string
): Promise<BudgetContextData> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const startDate = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: connections } = await supabase
    .from('bank_connections')
    .select('id')
    .eq('user_id', userId)

  const connectionIds = (connections ?? []).map((c) => c.id)
  if (!connectionIds.length) {
    return { transactions: [], recentTransactions: [] }
  }

  const { data: accounts } = await supabase
    .from('bank_accounts')
    .select('id')
    .in('bank_connection_id', connectionIds)

  const accountIds = (accounts ?? []).map((a) => a.id)
  if (!accountIds.length) {
    return { transactions: [], recentTransactions: [] }
  }

  const { data: txRows } = await supabase
    .from('transactions')
    .select('id, date, amount, name, merchant_name, category')
    .in('bank_account_id', accountIds)
    .gte('date', startDate)
    .order('date', { ascending: false })
    .limit(200)

  const rawTransactions = (txRows ?? []) as BudgetTransactionRow[]
  const txIds = rawTransactions.map((t) => t.id)

  let excludedIds = new Set<string>()
  if (txIds.length) {
    const { data: exclusions } = await supabase
      .from('transaction_exclusions')
      .select('transaction_id')
      .eq('user_id', userId)
      .in('transaction_id', txIds)
    excludedIds = new Set((exclusions ?? []).map((e) => e.transaction_id))
  }

  const visible = rawTransactions.filter((t) => !excludedIds.has(t.id))
  const visibleIds = visible.map((t) => t.id)

  let overridesMap: Record<
    string,
    { type_override: 'income' | 'expense' | 'transfer' | null; amount_override: number | null }
  > = {}
  if (visibleIds.length) {
    const { data: overrides } = await supabase
      .from('transaction_type_overrides')
      .select('transaction_id, type_override, amount_override')
      .eq('user_id', userId)
      .in('transaction_id', visibleIds)
    overridesMap = (overrides ?? []).reduce(
      (acc, row) => {
        acc[row.transaction_id] = {
          type_override: (row.type_override as 'income' | 'expense' | 'transfer') ?? null,
          amount_override: row.amount_override != null ? Number(row.amount_override) : null,
        }
        return acc
      },
      {} as typeof overridesMap
    )
  }

  const classified = visible.map((t) =>
    classifyTransactionForContext({
      ...t,
      type_override: overridesMap[t.id]?.type_override ?? null,
      amount_override: overridesMap[t.id]?.amount_override ?? null,
    })
  )

  const aggregated = aggregateClassifiedTransactions(classified)
  const overridesAppliedCount = classified.filter((t) => t.typeOverride != null).length

  const transactions: BudgetTransactionRow[] = classified.map((t) => ({
    id: t.id,
    date: t.date,
    amount: t.amount,
    name: t.name,
    category: t.category,
    type_override: t.typeOverride,
  }))

  return {
    transactions,
    recentTransactions: aggregated.recentTransactions,
    monthIncome: aggregated.monthIncome,
    monthExpenses: aggregated.monthExpenses,
    monthNet: aggregated.monthNet,
    tradingTransferTotal: aggregated.tradingTransferTotal,
    transferTotal: aggregated.transferTotal,
    topSpendingCategories: aggregated.topSpendingCategories,
    overridesAppliedCount,
  }
}

export interface RawUserData {
  /** Rows from `goals` (user goals — weekly/monthly/etc.) */
  userGoals: Record<string, unknown>[]
  /** Dashboard projects (`projects`; formerly weekly_goals) */
  dashboardProjects: Record<string, unknown>[]
  tasks: Record<string, unknown>[]
  habits: Record<string, unknown>[]
  educationItems: Record<string, unknown>[]
  priorities: Record<string, unknown>[]
  points: Record<string, unknown>[]
  completedTasksToday: Record<string, unknown>[]
  relationships: Record<string, unknown>[]
  habitCompletionsToday: Record<string, unknown>[]
  installedModules: { module_id: string }[]
  assessmentData: Record<string, unknown>
  moduleData: Array<{
    module_id: string
    data: Record<string, unknown[]>
    total_records: number
  }>
  budgetContext?: BudgetContextData
  _computed?: {
    weeklyPoints: number
    dailyPoints: number
    firePriorities: Record<string, unknown>[]
    categories: string[]
  }
}

const TABLE_ORDER_COLUMNS: Record<string, string[]> = {
  fitness_biometrics: ['sync_date', 'recorded_at', 'created_at'],
  fitness_energy_history: ['recorded_at', 'created_at'],
  daily_nutrition: ['log_date', 'recorded_at', 'created_at'],
  gratitude_journal_entries: ['entry_date', 'created_at'],
}

async function fetchModuleTableRows(
  supabase: SupabaseClient,
  userId: string,
  tableName: string,
  limit = 20
): Promise<unknown[]> {
  const orderColumns = TABLE_ORDER_COLUMNS[tableName] ?? ['created_at']
  for (const column of orderColumns) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .order(column, { ascending: false, nullsFirst: false })
        .limit(limit)
      if (!error && data?.length) return data as unknown[]
      if (error && !error.message.toLowerCase().includes('column')) break
    } catch {
      break
    }
  }

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .limit(limit)
    if (!error && data?.length) return data as unknown[]
  } catch {
    // Skip unknown tables
  }
  return []
}

/** Live fetch for one installed module — used when advisor needs fresh wearable/bank module data. */
export async function fetchModuleDataForContext(
  supabase: SupabaseClient,
  userId: string,
  moduleId: string
): Promise<{ module_id: string; data: Record<string, unknown[]>; total_records: number } | null> {
  const tables = getModuleTables(moduleId)
  const tableData: Record<string, unknown[]> = {}
  let totalRecords = 0
  for (const tableName of tables) {
    const rows = await fetchModuleTableRows(supabase, userId, tableName)
    if (rows.length) {
      tableData[tableName] = rows as Record<string, unknown>[]
      totalRecords += rows.length
    }
  }
  if (totalRecords === 0) return null
  return { module_id: moduleId, data: tableData, total_records: totalRecords }
}

export async function fetchRawUserData(
  supabase: SupabaseClient,
  userId: string
): Promise<RawUserData> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const [
    dashboardProjectsResult,
    userGoalsResult,
    tasksResult,
    habitsResult,
    educationResult,
    prioritiesResult,
    pointsResult,
    installedModulesResult,
    completedTasksTodayResult,
    relationshipsResult,
    habitCompletionsResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('*, goals(id, title, goal_type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('daily_habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('order_index', { ascending: true }),
    supabase.from('education_items').select('*').eq('user_id', userId).eq('is_active', true),
    supabase
      .from('priorities')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .eq('is_deleted', false)
      .order('priority_score', { ascending: false }),
    supabase
      .from('points_ledger')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('installed_modules')
      .select('module_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_accessed', { ascending: false }),
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('updated_at', todayStart.toISOString()),
    supabase
      .from('relationships')
      .select('*')
      .eq('user_id', userId)
      .order('last_interaction', { ascending: false }),
    supabase
      .from('daily_habit_completions')
      .select('*, daily_habits(title)')
      .eq('user_id', userId)
      .gte('completed_at', todayStart.toISOString()),
    supabase.from('profiles').select('assessment_data').eq('id', userId).single(),
  ])

  let assessmentData =
    (profileResult?.data as { assessment_data?: Record<string, unknown> } | null)
      ?.assessment_data || {}
  if (!assessmentData || Object.keys(assessmentData as object).length === 0) {
    const { data } = await supabase
      .from('user_profiles')
      .select('assessment_data')
      .eq('user_id', userId)
      .single()
    assessmentData =
      (data as { assessment_data?: Record<string, unknown> } | null)?.assessment_data || {}
  }

  const dashboardProjects = (dashboardProjectsResult.data || []) as Record<string, unknown>[]
  const userGoals = (userGoalsResult.data || []) as Record<string, unknown>[]
  const tasks = (tasksResult.data || []) as Record<string, unknown>[]
  const installedModulesList = (installedModulesResult.data || []) as { module_id: string }[]

  const moduleDataPromises = installedModulesList.map(async (mod) => {
    const tables = getModuleTables(mod.module_id)
    const tableData: Record<string, unknown[]> = {}
    let totalRecords = 0
    for (const tableName of tables) {
      const rows = await fetchModuleTableRows(supabase, userId, tableName)
      if (rows.length) {
        tableData[tableName] = rows as Record<string, unknown>[]
        totalRecords += rows.length
      }
    }
    return { module_id: mod.module_id, data: tableData, total_records: totalRecords }
  })

  const moduleData = await Promise.all(moduleDataPromises)
  const budgetContext = await fetchBudgetContextData(supabase, userId)

  const points = (pointsResult.data || []) as Record<string, unknown>[]
  const recentPoints = points.filter((p) => new Date((p.created_at as string) || 0) >= weekStart)
  const dailyPoints = sumEarnedPoints(
    points.filter((p) => new Date((p.created_at as string) || 0) >= todayStart)
  )
  const weeklyPoints = sumEarnedPoints(recentPoints)

  const priorities = (prioritiesResult.data || []) as Record<string, unknown>[]
  const firePriorities = priorities.filter(
    (p) =>
      (p.title as string)?.includes('🔥') ||
      p.priority_level === 'fire' ||
      ((p.priority_score as number) ?? 0) >= 90
  )

  const allCategories = [
    ...new Set(
      [
        ...userGoals.filter((g) => !isGoalClosed(g)),
        ...dashboardProjects.filter((p) => !isProjectCompleted(p)),
        ...tasks.filter((t) => !isTaskCompleted(t)),
      ]
        .map((i) => (i.category as string) || '')
        .filter(Boolean)
    ),
  ] as string[]

  return {
    userGoals,
    dashboardProjects,
    tasks,
    habits: (habitsResult.data || []) as Record<string, unknown>[],
    educationItems: (educationResult.data || []) as Record<string, unknown>[],
    priorities,
    points,
    completedTasksToday: (completedTasksTodayResult.data || []) as Record<string, unknown>[],
    relationships: (relationshipsResult.data || []) as Record<string, unknown>[],
    habitCompletionsToday: (habitCompletionsResult.data || []) as Record<string, unknown>[],
    installedModules: installedModulesList,
    assessmentData: assessmentData as Record<string, unknown>,
    moduleData,
    budgetContext,
    _computed: {
      weeklyPoints,
      dailyPoints,
      firePriorities,
      categories: allCategories,
    },
  }
}

/** Build static profile from assessment data (no AI) */
export function buildStaticProfileSummary(
  assessmentData: Record<string, unknown>
): StaticProfileSummary {
  const a = assessmentData as {
    personality_traits?: string[]
    personal_insights?: string[]
    dreams_discovered?: string[]
    vision_statement?: string
    executive_skills?: Record<string, unknown>
    executive_blocking_factors?: Array<{ factor: string }>
  }
  return {
    personalityTraits: a.personality_traits || [],
    personalInsights: a.personal_insights || [],
    dreamsDiscovered: a.dreams_discovered || [],
    visionStatement: a.vision_statement,
    executiveSkills: a.executive_skills,
    blockingFactors: a.executive_blocking_factors?.map((f) => f.factor).filter(Boolean) || [],
  }
}

/** Build structured state from raw data (no AI) */
export function buildStructuredStateSummary(
  raw: RawUserData & { _computed?: Record<string, unknown> }
): StructuredStateSummary {
  const c = raw._computed as
    | {
        weeklyPoints?: number
        dailyPoints?: number
        firePriorities?: Record<string, unknown>[]
        categories?: string[]
      }
    | undefined
  const weeklyPoints = c?.weeklyPoints ?? 0
  const dailyPoints = c?.dailyPoints ?? 0
  const firePriorities = (c?.firePriorities ?? []) as Record<string, unknown>[]
  const categories = (c?.categories ?? []) as string[]

  const fmtGoalProgress = (g: Record<string, unknown>) => {
    const cv = g.current_value
    const tv = g.target_value
    const unit = (g.target_unit as string) || ''
    if (cv != null && tv != null) return `${cv}/${tv}${unit ? ' ' + unit : ''}`
    return (g.status as string) || 'active'
  }

  const fmtProjectProgress = (p: Record<string, unknown>) =>
    `${p.current_points ?? 0}/${p.target_points ?? 0}`

  const activeGoals = raw.userGoals.filter((g) => !isGoalClosed(g))
  const activeProjects = raw.dashboardProjects.filter((p) => !isProjectCompleted(p))
  const openTasks = raw.tasks.filter((t) => !isTaskCompleted(t))

  const linkedProjects = activeProjects.filter((p) => Boolean(p.goal_id))
  const orphanProjects = activeProjects.filter((p) => !p.goal_id)
  const goalsWithProjects = new Set<string>()
  for (const p of linkedProjects) {
    const gid = p.goal_id
    if (typeof gid === 'string' && gid) goalsWithProjects.add(gid)
  }

  return {
    weeklyPoints,
    dailyPoints,
    totalGoals: activeGoals.length,
    totalDashboardProjects: activeProjects.length,
    completedGoalsCount: raw.userGoals.length - activeGoals.length,
    completedProjectsCount: raw.dashboardProjects.length - activeProjects.length,
    completedTasksCount: raw.tasks.length - openTasks.length,
    linkedProjectsCount: linkedProjects.length,
    orphanProjectsCount: orphanProjects.length,
    goalsWithProjectsCount: goalsWithProjects.size,
    totalTasks: openTasks.length,
    totalHabits: raw.habits.length,
    activePriorities: raw.priorities.length,
    completedTasksToday: raw.completedTasksToday.length,
    habitCompletionsToday: raw.habitCompletionsToday.length,
    completedTodayList: raw.completedTasksToday.slice(0, 10).map((t) => ({
      title: (t.title as string) || 'Untitled',
      category: t.category as string,
    })),
    categories,
    installedModules: raw.installedModules.map((m) => m.module_id),
    topGoals: activeGoals.slice(0, 8).map((g) => ({
      title: (g.title as string) || 'Untitled',
      goalType: g.goal_type as string | undefined,
      category: undefined,
      progress: fmtGoalProgress(g),
    })),
    topDashboardProjects: activeProjects.slice(0, 8).map((p) => ({
      title: (p.title as string) || 'Untitled',
      category: p.category as string | undefined,
      progress: fmtProjectProgress(p),
    })),
    topTasks: openTasks.slice(0, 10).map((t) => ({
      title: (t.title as string) || 'Untitled',
      category: t.category as string,
      status: (t.status as string) || 'pending',
    })),
    topHabits: raw.habits.slice(0, 5).map((h) => (h.title as string) || ''),
    topPriorities: raw.priorities.slice(0, 5).map((p) => ({
      title: (p.title as string) || 'Untitled',
      level: (p.priority_level as string) || String(p.priority_score ?? ''),
    })),
    firePriorities: firePriorities.slice(0, 3).map((p) => ({
      title: (p.title as string) || 'Untitled',
    })),
    relationships: raw.relationships.slice(0, 5).map((r) => ({
      name: (r.name as string) || (r.contact_name as string) || 'Unknown',
      lastInteraction: r.last_interaction
        ? new Date(r.last_interaction as string).toLocaleDateString()
        : undefined,
    })),
    moduleSummaries: raw.moduleData.map((m) => ({
      moduleId: m.module_id,
      summary: `${Object.keys(m.data).length} tables, ${m.total_records} records`,
    })),
  }
}
