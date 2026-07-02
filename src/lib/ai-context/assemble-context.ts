/**
 * Assembles AI context from cache + ephemeral data.
 * Use assembleAIContext() for all AI prompts to get token-efficient context.
 */
import { createClient } from '@/lib/supabase/server'
import { buildAdvisorSourceChips } from '@/lib/advisor/source-chips'
import { createAdminClient } from '@/lib/supabaseAdmin'
import {
  fetchRawUserData,
  buildStaticProfileSummary,
  buildStructuredStateSummary,
} from './fetch-user-data'
import {
  buildModuleContextSummaries,
  formatModuleContextForPrompt,
  buildModuleSummaryForModule,
  mergeModuleSummary,
} from './module-context-builder'
import {
  buildCrossModuleInsights,
  formatCrossModuleInsightsForPrompt,
} from './cross-module-insights'
import {
  filterCrossModuleInsightsForQuestion,
  filterModulesForQuestion,
  applyModulePriority,
  formatTopicFilterNote,
  detectQuestionTopics,
  type FilterModulesResult,
} from './topic-module-filter'
import { fetchModuleDataForContext } from './fetch-user-data'
import type {
  AssembleContextOptions,
  AssembledContext,
  UserContextCacheRow,
  StaticProfileSummary,
  StructuredStateSummary,
  DerivedInsightsSummary,
  ModuleContextSummary,
  CrossModuleInsightsSummary,
} from '@/types/context-cache'
import type { AdvisorEvidence } from '@/types/advisor-evidence'
import {
  parseContextAdjustments,
  formatContextAdjustmentsPrompt,
} from '@/lib/advisor/context-adjustments'
import { buildAdvisorEvidence } from '@/lib/advisor/evidence'

/** Max age in hours for cache to be considered fresh */
const CACHE_FRESH_HOURS = 24
const CACHE_INCREMENTAL_FRESH_HOURS = 2

function isCacheFresh(row: UserContextCacheRow | null): boolean {
  if (!row?.last_full_refresh_at) return false
  const structured = row.structured_state_summary_json
  // Invalidate caches built before active-only workload counts
  if (structured && typeof structured.completedTasksCount !== 'number') return false
  const fullAge = (Date.now() - new Date(row.last_full_refresh_at).getTime()) / (1000 * 60 * 60)
  if (fullAge <= CACHE_FRESH_HOURS) return true
  if (row.last_incremental_refresh_at) {
    const incAge =
      (Date.now() - new Date(row.last_incremental_refresh_at).getTime()) / (1000 * 60 * 60)
    return incAge <= CACHE_INCREMENTAL_FRESH_HOURS
  }
  return false
}

function formatStaticProfile(p: StaticProfileSummary | null): string {
  if (!p || Object.keys(p).length === 0) return ''
  const lines: string[] = []
  if (p.personalityTraits?.length) lines.push(`Personality: ${p.personalityTraits.join(', ')}`)
  if (p.personalInsights?.length) lines.push(`Insights: ${p.personalInsights.join('; ')}`)
  if (p.dreamsDiscovered?.length) lines.push(`Dreams: ${p.dreamsDiscovered.join(', ')}`)
  if (p.visionStatement) lines.push(`Vision: ${p.visionStatement}`)
  if (p.blockingFactors?.length) lines.push(`Blocking: ${p.blockingFactors.join(', ')}`)
  return lines.length ? `USER PROFILE:\n${lines.join('\n')}` : ''
}

function formatStructuredState(s: StructuredStateSummary | null): string {
  if (!s) return ''
  const hasGoodLiving = s.categories.some(
    (c) =>
      c.toLowerCase().includes('good') ||
      c.toLowerCase().includes('living') ||
      c.toLowerCase().includes('wellness') ||
      c.toLowerCase().includes('health')
  )
  const totalProjects = typeof s.totalDashboardProjects === 'number' ? s.totalDashboardProjects : 0
  const topDp = Array.isArray(s.topDashboardProjects) ? s.topDashboardProjects : []

  const topUserGoalsFmt =
    (s.topGoals ?? [])
      .map((g) => `${g.title} (${g.goalType ?? 'goal'}, ${g.progress})`)
      .join('; ') || 'None'

  const topProjectsFmt = topDp.map((p) => `${p.title} (${p.progress})`).join('; ') || 'None'

  // Planning maturity heuristics (uses goals vs projects counts and optional projects.goal_id linkage)
  const goalCount = s.totalGoals ?? 0
  const projectCount = totalProjects
  const taskCount = s.totalTasks ?? 0
  const maturityFlags: string[] = []
  if (goalCount === 0) maturityFlags.push('No quantifiable goals set (recommended: 2–5).')
  if (goalCount > 5)
    maturityFlags.push('Too many goals (recommended: 2–5). Consider narrowing focus.')
  if (projectCount === 0) maturityFlags.push('No active projects. Add 1–3 projects per goal.')
  if (projectCount > 15)
    maturityFlags.push('High work-in-progress (15+ projects). Risk of fragmentation/burnout.')
  if (taskCount < Math.max(2 * Math.max(projectCount, 1), 5))
    maturityFlags.push('Low task breakdown for current projects. Add 2–7 tasks per project.')
  if (taskCount > 120)
    maturityFlags.push('Very high task count. Consider pruning or clarifying next actions.')

  const linked = typeof s.linkedProjectsCount === 'number' ? s.linkedProjectsCount : 0
  const orphan = typeof s.orphanProjectsCount === 'number' ? s.orphanProjectsCount : 0
  const goalsWithProjects =
    typeof s.goalsWithProjectsCount === 'number' ? s.goalsWithProjectsCount : 0
  if (goalCount > 0 && goalsWithProjects === 0)
    maturityFlags.push('No projects are linked to goals yet. Link 1–3 projects per goal.')
  if (orphan > 0 && goalCount > 0)
    maturityFlags.push('Some projects are not linked to any goal (orphans).')

  return `DASHBOARD STATE (active workload only — exclude completed/cancelled goals, projects, and tasks from counts and recommendations):
- Points: Weekly ${s.weeklyPoints}, Daily ${s.dailyPoints}
- Has Good Living Category: ${hasGoodLiving}
- Active GOALS (${s.totalGoals}) — weekly/monthly targets from Goals feature: Top: ${topUserGoalsFmt}
- Active PROJECTS (${totalProjects}) — week-scoped tiles on Projects panel: Top: ${topProjectsFmt}
- Open tasks: ${s.totalTasks}, Habits: ${s.totalHabits}, Priorities: ${s.activePriorities}, Completed today: ${s.completedTasksToday}
- Completed/closed (context only, do not assign new work): goals=${s.completedGoalsCount ?? '—'}, projects=${s.completedProjectsCount ?? '—'}, tasks=${s.completedTasksCount ?? '—'}
- Modules: ${s.installedModules.join(', ') || 'None'}
- Top open tasks: ${s.topTasks.map((t) => `${t.title} [${t.status}]`).join('; ') || 'None'}
- Completed today: ${s.completedTodayList?.map((t) => `${t.title} (${t.category || ''})`).join('; ') || 'None'}
- Habits: ${s.topHabits?.filter(Boolean).join('; ') || 'None'}
- Priorities: ${s.topPriorities.map((p) => p.title).join('; ') || 'None'}
- Fire: ${s.firePriorities.map((p) => p.title).join('; ') || 'None'}
- Relationships: ${s.relationships?.map((r) => `${r.name} (${r.lastInteraction || 'Never'})`).join('; ') || 'None'}
- Module data: ${s.moduleSummaries.map((m) => `${m.moduleId}: ${m.summary}`).join('; ') || 'None'}

COMPLETION AWARENESS:
- Recommend actions ONLY for active goals, active projects, and open tasks listed above.
- Completed/cancelled items are past wins — celebrate briefly if relevant, but never treat them as current workload or assign new work on them.

PLANNING MATURITY (heuristics — uses active counts only):
- Goals recommended: 2–5 active; Projects recommended: 6–15 active; Tasks recommended: ~2–7 open per project.
- Current active: goals=${goalCount}, projects=${projectCount}, open tasks=${taskCount}
- Goal↔Project links: linked_projects=${linked}, orphan_projects=${orphan}, goals_with_projects=${goalsWithProjects}
- Flags: ${maturityFlags.join(' | ') || 'Looks within normal ranges.'}`
}

function formatDerived(d: DerivedInsightsSummary | null): string {
  if (!d || !d.overallProgress) return ''
  const lines: string[] = [`Overall: ${d.overallProgress}`]
  if (d.strengths?.length) lines.push(`Strengths: ${d.strengths.join(', ')}`)
  if (d.recommendations?.length)
    lines.push(`Recommendations: ${d.recommendations.slice(0, 5).join('; ')}`)
  if (d.nextSteps?.length) lines.push(`Next: ${d.nextSteps.slice(0, 3).join('; ')}`)
  return `INSIGHTS:\n${lines.join('\n')}`
}

function formatEphemeralMessages(
  messages: Array<{ role: string; content: string }> | undefined
): string {
  if (!messages?.length) return ''
  const recent = messages.slice(-6)
  return `RECENT CONVERSATION:\n${recent.map((m) => `${m.role}: ${(m.content || '').slice(0, 500)}`).join('\n')}`
}

/**
 * Assembles AI context for prompts. Uses cache when fresh; falls back to live fetch.
 */
export async function assembleAIContext(
  userId: string,
  options: AssembleContextOptions = {}
): Promise<AssembledContext> {
  const {
    messages,
    currentModule,
    preferLiveIfStale = false,
    filterModulesByQuestion = true,
    modulePriority: optionModulePriority,
    contextAdjustments,
  } = options

  const parsedAdjustments = parseContextAdjustments(contextAdjustments)
  const modulePriority = [
    ...(parsedAdjustments?.modulePriority ?? []),
    ...(optionModulePriority ?? []),
  ].filter((id, i, arr) => arr.indexOf(id) === i)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    throw new Error('Unauthorized: user mismatch')
  }

  let usedCache = false
  let cacheAgeHours: number | undefined
  const layers: AssembledContext['layersIncluded'] = []

  const adminSupabase = createAdminClient()
  const { data: cacheRow } = await adminSupabase
    .from('user_context_cache')
    .select('*')
    .eq('user_id', userId)
    .single()

  const row = cacheRow as UserContextCacheRow | null
  const fresh = isCacheFresh(row)

  let staticProfile: StaticProfileSummary | null = null
  let structuredState: StructuredStateSummary | null = null
  let derivedInsights: DerivedInsightsSummary | null = null
  let moduleContext: ModuleContextSummary[] | null = null
  let crossModuleInsights: CrossModuleInsightsSummary | null = null

  if (row && fresh && !preferLiveIfStale) {
    usedCache = true
    if (row.last_full_refresh_at) {
      cacheAgeHours = (Date.now() - new Date(row.last_full_refresh_at).getTime()) / (1000 * 60 * 60)
    }
    staticProfile = row.static_profile_summary_json
    structuredState = row.structured_state_summary_json
    derivedInsights = row.derived_insights_summary_json
    moduleContext = row.module_context_summary_json
    crossModuleInsights = row.cross_module_insights_json
    layers.push('static', 'structured', 'derived')
    if (moduleContext?.length) layers.push('modules')
    if (crossModuleInsights?.insights?.length) layers.push('cross_module')
  }

  if (!staticProfile || !structuredState || !moduleContext) {
    const raw = await fetchRawUserData(adminSupabase, userId)
    if (!staticProfile) staticProfile = buildStaticProfileSummary(raw.assessmentData)
    if (!structuredState) {
      structuredState = buildStructuredStateSummary(
        raw as Parameters<typeof buildStructuredStateSummary>[0]
      )
    }
    if (!moduleContext) {
      moduleContext = buildModuleContextSummaries(raw)
      crossModuleInsights = buildCrossModuleInsights(raw, moduleContext)
      layers.push('modules', 'cross_module')
    }
    if (!usedCache) layers.push('static', 'structured')
  }

  if (!derivedInsights && !usedCache) {
    derivedInsights = null
    layers.push('derived')
  }

  if (messages?.length) layers.push('ephemeral')

  const lastUserMessage = [...(messages ?? [])].reverse().find((m) => m.role === 'user')?.content

  const wellnessTopics = lastUserMessage ? detectQuestionTopics(lastUserMessage) : []
  const prioritizeWellness = parsedAdjustments?.prioritizeTopics.includes('wellness') ?? false
  const needsLiveFitness =
    (wellnessTopics.includes('wellness') || prioritizeWellness) &&
    (structuredState?.installedModules?.includes('fitness-tracker') ?? false)

  if (needsLiveFitness && moduleContext) {
    const liveFitness = await fetchModuleDataForContext(adminSupabase, userId, 'fitness-tracker')
    if (liveFitness) {
      moduleContext = mergeModuleSummary(
        moduleContext,
        buildModuleSummaryForModule('fitness-tracker', liveFitness.data, undefined)
      )
      if (!layers.includes('modules')) layers.push('modules')
    }
  }

  let modulesForPrompt = moduleContext ?? []
  let crossForPrompt = crossModuleInsights
  let topicFilterApplied = false
  let modulesIncluded: string[] | undefined
  let topicFilterNote = ''
  let filterResult: FilterModulesResult = {
    filtered: [],
    includedModuleIds: [],
    isBroad: true,
    detectedTopics: [],
  }

  if (filterModulesByQuestion && moduleContext?.length && lastUserMessage) {
    filterResult = filterModulesForQuestion(lastUserMessage, moduleContext, {
      currentModule,
      crossModuleInsights,
      modulePriority: modulePriority.length ? modulePriority : undefined,
    })
    if (parsedAdjustments?.prioritizeTopics.length) {
      filterResult = {
        ...filterResult,
        detectedTopics: [
          ...new Set([...parsedAdjustments.prioritizeTopics, ...filterResult.detectedTopics]),
        ],
      }
    }
    modulesForPrompt = filterResult.filtered
    modulesIncluded = filterResult.includedModuleIds
    topicFilterApplied = !filterResult.isBroad || modulePriority.length > 0
    topicFilterNote = formatTopicFilterNote(filterResult)
    if (modulePriority.length) {
      topicFilterNote = [
        topicFilterNote,
        `USER MODULE PRIORITY: ${modulePriority.join(' → ')} (read and weight in this order).`,
      ]
        .filter(Boolean)
        .join('\n')
    }
    crossForPrompt = filterCrossModuleInsightsForQuestion(
      crossModuleInsights,
      filterResult.detectedTopics,
      filterResult.isBroad && modulePriority.length === 0
    )
  } else if (moduleContext?.length) {
    modulesIncluded = moduleContext.filter((m) => m.hasData).map((m) => m.moduleId)
    modulesForPrompt = applyModulePriority(
      moduleContext.filter((m) => m.hasData),
      modulePriority.length ? modulePriority : undefined
    )
    filterResult = {
      filtered: modulesForPrompt,
      includedModuleIds: modulesForPrompt.map((m) => m.moduleId),
      isBroad: true,
      detectedTopics: parsedAdjustments?.prioritizeTopics ?? [],
    }
  }

  const parts: string[] = []
  const profileStr = formatStaticProfile(staticProfile)
  if (profileStr) parts.push(profileStr)
  parts.push(formatStructuredState(structuredState))
  const derivedStr = formatDerived(derivedInsights)
  if (derivedStr) parts.push(derivedStr)

  if (topicFilterNote) parts.push(topicFilterNote)

  const adjustmentsPrompt = formatContextAdjustmentsPrompt(parsedAdjustments)
  if (adjustmentsPrompt) parts.push(adjustmentsPrompt)

  parts.push(formatModuleContextForPrompt(modulesForPrompt))
  parts.push(formatCrossModuleInsightsForPrompt(crossForPrompt))
  if (currentModule) parts.push(`CURRENT MODULE: ${currentModule}`)
  const ephemeralStr = formatEphemeralMessages(messages)
  if (ephemeralStr) parts.push(ephemeralStr)

  const systemContext = parts.filter(Boolean).join('\n\n')
  const sourceChips = buildAdvisorSourceChips(moduleContext ?? [], modulesIncluded)
  const moduleOrder = modulesForPrompt.map((m) => m.moduleId)
  const evidence = buildAdvisorEvidence({
    filterResult,
    allModuleContext: moduleContext ?? [],
    modulesForPrompt,
    modulesIncluded: modulesIncluded ?? [],
    moduleOrder,
    topicFilterApplied,
    layersIncluded: [...new Set(layers)],
    usedCache,
    cacheAgeHours,
    contextAdjustments,
    appliedAdjustments: parsedAdjustments?.promptLines,
  })

  return {
    systemContext,
    usedCache,
    cacheAgeHours,
    layersIncluded: [...new Set(layers)],
    modulesIncluded,
    topicFilterApplied,
    sourceChips,
    evidence,
  }
}
