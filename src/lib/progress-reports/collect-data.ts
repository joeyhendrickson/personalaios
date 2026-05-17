import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { ModuleHighlight, ProgressReportStats } from './types'
import { labelForModule } from './module-labels'

export type RawReportContext = {
  stats: ProgressReportStats
  moduleHighlights: ModuleHighlight[]
  accomplishments: string[]
  focusEvidence: {
    completedTasks: Array<{ title: string; category: string; points?: number }>
    pendingTasksSample: Array<{ title: string; category: string }>
    projects: Array<{
      title: string
      category: string
      progressPercent: number
      currentPoints: number
      targetPoints: number
      completedInPeriod: boolean
      updatedInPeriod: boolean
    }>
    goals: Array<{
      title: string
      goalType?: string
      progressPercent: number
      currentValue: number
      targetValue: number
    }>
    habits: Array<{ title: string; completionsInPeriod: number; pointsPerCompletion?: number }>
    habitCompletionByDay?: Record<string, number>
  }
  rawModuleNotes: Record<string, unknown>
}

export async function collectReportContext(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<RawReportContext> {
  const supabase = await createClient()
  const startIso = periodStart.toISOString()
  const endIso = periodEnd.toISOString()
  const startDate = periodStart.toISOString().split('T')[0]
  const endDate = periodEnd.toISOString().split('T')[0]

  const [
    pointsRes,
    tasksCompletedRes,
    tasksCreatedRes,
    tasksPendingRes,
    projectsRes,
    habitCompletionsRes,
    habitsRes,
    goalsRes,
    accomplishmentsRes,
    aiUsageRes,
    installedRes,
    narrativeRes,
    gratitudeRes,
    dreamRes,
    focusRes,
  ] = await Promise.all([
    supabase
      .from('points_ledger')
      .select('points, created_at, description')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('tasks')
      .select('id, title, category, points_value, completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', startIso)
      .lte('completed_at', endIso)
      .order('completed_at', { ascending: false })
      .limit(40),
    supabase
      .from('tasks')
      .select('id, title, category')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('tasks')
      .select('id, title, category')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('sort_order', { ascending: true })
      .limit(15),
    supabase
      .from('projects')
      .select(
        'id, title, category, is_completed, current_points, target_points, updated_at, created_at'
      )
      .eq('user_id', userId)
      .order('project_sort_order', { ascending: true }),
    supabase
      .from('habit_completions')
      .select('id, habit_id, completed_at, points_awarded')
      .eq('user_id', userId)
      .gte('completed_at', startIso)
      .lte('completed_at', endIso),
    supabase
      .from('daily_habits')
      .select('id, title, points_per_completion, is_active')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('goals')
      .select('id, title, goal_type, current_value, target_value, status, updated_at')
      .eq('user_id', userId)
      .in('status', ['active', 'completed']),
    supabase
      .from('accomplishments')
      .select('title, description, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('ai_usage_logs')
      .select('module, action, description, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('installed_modules')
      .select('module_id, last_accessed, installed_at')
      .eq('user_id', userId),
    supabase
      .from('narrative_integration_sessions')
      .select(
        'title, meaning_statement, lesson_statement, present_grounding_summary, future_action, completion_status, completed_at, updated_at'
      )
      .eq('user_id', userId)
      .gte('updated_at', startIso)
      .lte('updated_at', endIso)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('gratitude_journal_entries')
      .select('entry_date, gratitude_items, reflection, mood_rating')
      .eq('user_id', userId)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('entry_date', { ascending: false })
      .limit(14),
    supabase
      .from('dream_catcher_sessions')
      .select('assessment_data, completed_at, created_at')
      .eq('user_id', userId)
      .gte('completed_at', startIso)
      .lte('completed_at', endIso)
      .order('completed_at', { ascending: false })
      .limit(5),
    supabase
      .from('focus_analysis_summaries')
      .select('therapeutic_insights, timestamp, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalPoints = pointsRes.data?.reduce((sum, row) => sum + (row.points || 0), 0) || 0

  const categoryPoints: Record<string, number> = {}
  for (const task of tasksCompletedRes.data || []) {
    const cat = task.category || 'other'
    categoryPoints[cat] = (categoryPoints[cat] || 0) + 1
  }
  const topCategories = Object.entries(categoryPoints)
    .map(([category, points]) => ({ category, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)

  const projectsCompleted =
    projectsRes.data?.filter(
      (p) =>
        p.is_completed &&
        p.updated_at &&
        new Date(p.updated_at) >= periodStart &&
        new Date(p.updated_at) <= periodEnd
    ).length || 0

  const goalsProgress = (goalsRes.data || [])
    .filter((g) => g.status === 'active')
    .slice(0, 8)
    .map((g) => {
      const target = g.target_value || 0
      const current = g.current_value || 0
      const progressPercent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      return { title: g.title as string, progressPercent }
    })

  const stats: ProgressReportStats = {
    totalPoints,
    tasksCompleted: tasksCompletedRes.data?.length || 0,
    tasksCreated: tasksCreatedRes.data?.length || 0,
    projectsCompleted,
    habitCompletions: habitCompletionsRes.data?.length || 0,
    goalsProgress,
    topCategories,
  }

  const habitTitleById = new Map(
    (habitsRes.data || []).map((h) => [
      h.id,
      { title: h.title as string, points: h.points_per_completion },
    ])
  )
  const habitCompletionCounts: Record<string, number> = {}
  const habitCompletionByDay: Record<string, number> = {}

  for (const row of habitCompletionsRes.data || []) {
    const hid = row.habit_id as string
    habitCompletionCounts[hid] = (habitCompletionCounts[hid] || 0) + 1
    const day = (row.completed_at as string).split('T')[0]
    habitCompletionByDay[day] = (habitCompletionByDay[day] || 0) + 1
  }

  const habits = Object.entries(habitCompletionCounts)
    .map(([habitId, completionsInPeriod]) => {
      const meta = habitTitleById.get(habitId)
      return {
        title: meta?.title || 'Habit',
        completionsInPeriod,
        pointsPerCompletion: meta?.points,
      }
    })
    .sort((a, b) => b.completionsInPeriod - a.completionsInPeriod)
    .slice(0, 15)

  const completedTasks = (tasksCompletedRes.data || []).map((t) => ({
    title: t.title as string,
    category: (t.category as string) || 'other',
    points: t.points_value as number | undefined,
  }))

  const pendingTasksSample = (tasksPendingRes.data || []).map((t) => ({
    title: t.title as string,
    category: (t.category as string) || 'other',
  }))

  const projects = (projectsRes.data || []).map((p) => {
    const target = (p.target_points as number) || 0
    const current = (p.current_points as number) || 0
    const progressPercent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
    const updated = p.updated_at ? new Date(p.updated_at as string) : null
    const updatedInPeriod = updated ? updated >= periodStart && updated <= periodEnd : false
    const completedInPeriod =
      Boolean(p.is_completed) && updated ? updated >= periodStart && updated <= periodEnd : false
    return {
      title: p.title as string,
      category: (p.category as string) || 'other',
      progressPercent,
      currentPoints: current,
      targetPoints: target,
      completedInPeriod,
      updatedInPeriod,
    }
  })

  const goals = (goalsRes.data || [])
    .filter((g) => {
      if (g.status === 'active') return true
      const updated = g.updated_at ? new Date(g.updated_at as string) : null
      return updated ? updated >= periodStart && updated <= periodEnd : false
    })
    .slice(0, 12)
    .map((g) => {
      const target = (g.target_value as number) || 0
      const current = (g.current_value as number) || 0
      const progressPercent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      return {
        title: g.title as string,
        goalType: g.goal_type as string | undefined,
        progressPercent,
        currentValue: current,
        targetValue: target,
      }
    })

  const moduleUsageCount: Record<string, number> = {}
  for (const row of aiUsageRes.data || []) {
    const mod = row.module || 'unknown'
    moduleUsageCount[mod] = (moduleUsageCount[mod] || 0) + 1
  }

  for (const row of installedRes.data || []) {
    if (!row.last_accessed) continue
    const accessed = new Date(row.last_accessed)
    if (accessed >= periodStart && accessed <= periodEnd) {
      moduleUsageCount[row.module_id] = (moduleUsageCount[row.module_id] || 0) + 1
    }
  }

  const moduleConclusions: Record<string, string[]> = {}

  for (const session of narrativeRes.data || []) {
    const conclusions: string[] = []
    if (session.meaning_statement) conclusions.push(`Meaning: ${session.meaning_statement}`)
    if (session.lesson_statement) conclusions.push(`Lesson: ${session.lesson_statement}`)
    if (session.future_action) conclusions.push(`Next step: ${session.future_action}`)
    if (session.present_grounding_summary)
      conclusions.push(`Grounding: ${session.present_grounding_summary}`)
    if (conclusions.length) {
      const key = 'narrative-integration'
      moduleConclusions[key] = [...(moduleConclusions[key] || []), ...conclusions.slice(0, 3)]
    }
  }

  for (const entry of gratitudeRes.data || []) {
    const items = Array.isArray(entry.gratitude_items) ? entry.gratitude_items : []
    const summary =
      items.length > 0
        ? `Gratitude (${entry.entry_date}): ${items.slice(0, 3).join('; ')}`
        : entry.reflection
          ? `Reflection (${entry.entry_date}): ${entry.reflection}`
          : null
    if (summary) {
      const key = 'gratitude-journal'
      moduleConclusions[key] = [...(moduleConclusions[key] || []), summary]
    }
  }

  for (const dream of dreamRes.data || []) {
    const data = dream.assessment_data as Record<string, unknown> | null
    const line =
      (data?.summary as string) ||
      (data?.interpretation as string) ||
      (data?.dreamDescription as string) ||
      null
    if (line) {
      const key = 'dream-catcher'
      moduleConclusions[key] = [...(moduleConclusions[key] || []), String(line).slice(0, 200)]
    }
  }

  for (const focus of focusRes.data || []) {
    const insights = focus.therapeutic_insights
    const line =
      typeof insights === 'string'
        ? insights
        : insights && typeof insights === 'object' && 'summary' in insights
          ? String((insights as { summary?: string }).summary)
          : null
    if (line) {
      const key = 'focus-enhancer'
      moduleConclusions[key] = [...(moduleConclusions[key] || []), String(line).slice(0, 200)]
    }
  }

  const moduleHighlights: ModuleHighlight[] = Object.entries(moduleUsageCount)
    .map(([moduleId, usageCount]) => ({
      moduleId,
      moduleLabel: labelForModule(moduleId),
      usageCount,
      conclusions: (moduleConclusions[moduleId] || []).slice(0, 4),
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 12)

  for (const [moduleId, conclusions] of Object.entries(moduleConclusions)) {
    if (!moduleHighlights.some((m) => m.moduleId === moduleId)) {
      moduleHighlights.push({
        moduleId,
        moduleLabel: labelForModule(moduleId),
        usageCount: conclusions.length,
        conclusions: conclusions.slice(0, 4),
      })
    }
  }

  const accomplishments = (accomplishmentsRes.data || []).map((a) => {
    const desc = a.description ? `: ${a.description}` : ''
    return `${a.title}${desc}`
  })

  return {
    stats,
    moduleHighlights,
    accomplishments,
    focusEvidence: {
      completedTasks,
      pendingTasksSample,
      projects,
      goals,
      habits,
      habitCompletionByDay,
    },
    rawModuleNotes: {
      narrativeSessions: narrativeRes.data,
      gratitudeEntries: gratitudeRes.data,
      dreamSessions: dreamRes.data,
      focusAnalyses: focusRes.data,
    },
  }
}
