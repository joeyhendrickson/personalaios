import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { ModuleHighlight, ProgressReportStats } from './types'
import { labelForModule } from './module-labels'

export type RawReportContext = {
  stats: ProgressReportStats
  moduleHighlights: ModuleHighlight[]
  accomplishments: string[]
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

  const [
    pointsRes,
    tasksCompletedRes,
    tasksCreatedRes,
    projectsRes,
    habitCompletionsRes,
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
      .select('points, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('tasks')
      .select('id, title, category, completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', startIso)
      .lte('completed_at', endIso),
    supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('projects')
      .select('id, title, category, is_completed, current_points, target_points, updated_at')
      .eq('user_id', userId),
    supabase
      .from('habit_completions')
      .select('id')
      .eq('user_id', userId)
      .gte('completed_at', startIso)
      .lte('completed_at', endIso),
    supabase
      .from('goals')
      .select('id, title, current_value, target_value, status, updated_at')
      .eq('user_id', userId)
      .eq('status', 'active'),
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
      .gte('entry_date', periodStart.toISOString().split('T')[0])
      .lte('entry_date', periodEnd.toISOString().split('T')[0])
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

  const goalsProgress = (goalsRes.data || []).slice(0, 8).map((g) => {
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
    rawModuleNotes: {
      narrativeSessions: narrativeRes.data,
      gratitudeEntries: gratitudeRes.data,
      dreamSessions: dreamRes.data,
      focusAnalyses: focusRes.data,
    },
  }
}
