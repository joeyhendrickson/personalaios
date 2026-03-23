/**
 * Fetches raw user data from Supabase for AI context.
 * Used by cache generator and as fallback when cache is stale/missing.
 * Deterministic transformations only – no AI calls.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getModuleTables } from './module-mappings'
import type { StaticProfileSummary, StructuredStateSummary } from '@/types/context-cache'

export interface RawUserData {
  goals: Record<string, unknown>[]
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
  _computed?: {
    weeklyPoints: number
    dailyPoints: number
    firePriorities: Record<string, unknown>[]
    categories: string[]
  }
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
    goalsResult,
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
      .from('weekly_goals')
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

  const goals = (goalsResult.data || []) as Record<string, unknown>[]
  const tasks = (tasksResult.data || []) as Record<string, unknown>[]
  const installedModulesList = (installedModulesResult.data || []) as { module_id: string }[]

  const moduleDataPromises = installedModulesList.map(async (mod) => {
    const tables = getModuleTables(mod.module_id)
    const tableData: Record<string, unknown[]> = {}
    let totalRecords = 0
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
        if (!error && data?.length) {
          tableData[tableName] = data as unknown[]
          totalRecords += data.length
        }
      } catch {
        // Skip unknown tables
      }
    }
    return { module_id: mod.module_id, data: tableData, total_records: totalRecords }
  })

  const moduleData = await Promise.all(moduleDataPromises)

  const points = (pointsResult.data || []) as Record<string, unknown>[]
  const recentPoints = points.filter((p) => new Date((p.created_at as string) || 0) >= weekStart)
  const dailyPoints = points
    .filter((p) => new Date((p.created_at as string) || 0) >= todayStart)
    .reduce((s, p) => s + ((p.points as number) || 0), 0)
  const weeklyPoints = recentPoints.reduce((s, p) => s + ((p.points as number) || 0), 0)

  const priorities = (prioritiesResult.data || []) as Record<string, unknown>[]
  const firePriorities = priorities.filter(
    (p) =>
      (p.title as string)?.includes('🔥') ||
      p.priority_level === 'fire' ||
      ((p.priority_score as number) ?? 0) >= 90
  )

  const allCategories = [
    ...new Set([...goals, ...tasks].map((i) => (i.category as string) || '').filter(Boolean)),
  ] as string[]

  return {
    goals,
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

  return {
    weeklyPoints,
    dailyPoints,
    totalGoals: raw.goals.length,
    totalTasks: raw.tasks.length,
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
    topGoals: raw.goals.slice(0, 5).map((g) => ({
      title: (g.title as string) || 'Untitled',
      category: g.category as string,
      progress: `${g.current_points ?? 0}/${g.target_points ?? 0}`,
    })),
    topTasks: raw.tasks.slice(0, 10).map((t) => ({
      title: (t.title as string) || 'Untitled',
      category: t.category as string,
      status: (t.status as string) || 'unknown',
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
