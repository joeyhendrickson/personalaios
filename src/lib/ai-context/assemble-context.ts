/**
 * Assembles AI context from cache + ephemeral data.
 * Use assembleAIContext() for all AI prompts to get token-efficient context.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import {
  fetchRawUserData,
  buildStaticProfileSummary,
  buildStructuredStateSummary,
} from './fetch-user-data'
import type {
  AssembleContextOptions,
  AssembledContext,
  UserContextCacheRow,
  StaticProfileSummary,
  StructuredStateSummary,
  DerivedInsightsSummary,
} from '@/types/context-cache'

/** Max age in hours for cache to be considered fresh */
const CACHE_FRESH_HOURS = 24
const CACHE_INCREMENTAL_FRESH_HOURS = 2

function isCacheFresh(row: UserContextCacheRow | null): boolean {
  if (!row?.last_full_refresh_at) return false
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

  return `DASHBOARD STATE:
- Points: Weekly ${s.weeklyPoints}, Daily ${s.dailyPoints}
- Has Good Living Category: ${hasGoodLiving}
- User GOALS (${s.totalGoals}) — weekly/monthly targets from Goals feature: Top: ${topUserGoalsFmt}
- Dashboard PROJECTS (${totalProjects}) — week-scoped tiles on Projects panel (not the same table as User Goals): Top: ${topProjectsFmt}
- Tasks: ${s.totalTasks}, Habits: ${s.totalHabits}, Priorities: ${s.activePriorities}, Completed today: ${s.completedTasksToday}
- Modules: ${s.installedModules.join(', ') || 'None'}
- Top tasks: ${s.topTasks.map((t) => `${t.title} [${t.status}]`).join('; ') || 'None'}
- Completed today: ${s.completedTodayList?.map((t) => `${t.title} (${t.category || ''})`).join('; ') || 'None'}
- Habits: ${s.topHabits?.filter(Boolean).join('; ') || 'None'}
- Priorities: ${s.topPriorities.map((p) => p.title).join('; ') || 'None'}
- Fire: ${s.firePriorities.map((p) => p.title).join('; ') || 'None'}
- Relationships: ${s.relationships?.map((r) => `${r.name} (${r.lastInteraction || 'Never'})`).join('; ') || 'None'}
- Module data: ${s.moduleSummaries.map((m) => `${m.moduleId}: ${m.summary}`).join('; ') || 'None'}`
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
  const { messages, currentModule, preferLiveIfStale = false } = options

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

  if (row && (fresh || !preferLiveIfStale)) {
    usedCache = true
    if (row.last_full_refresh_at) {
      cacheAgeHours = (Date.now() - new Date(row.last_full_refresh_at).getTime()) / (1000 * 60 * 60)
    }
    staticProfile = row.static_profile_summary_json
    structuredState = row.structured_state_summary_json
    derivedInsights = row.derived_insights_summary_json
    layers.push('static', 'structured', 'derived')
  }

  if (!staticProfile || !structuredState) {
    const raw = await fetchRawUserData(adminSupabase, userId)
    staticProfile = buildStaticProfileSummary(raw.assessmentData)
    structuredState = buildStructuredStateSummary(
      raw as Parameters<typeof buildStructuredStateSummary>[0]
    )
    if (!usedCache) layers.push('static', 'structured')
  }

  if (!derivedInsights && !usedCache) {
    derivedInsights = null
    layers.push('derived')
  }

  if (messages?.length) layers.push('ephemeral')

  const parts: string[] = []
  const profileStr = formatStaticProfile(staticProfile)
  if (profileStr) parts.push(profileStr)
  parts.push(formatStructuredState(structuredState))
  const derivedStr = formatDerived(derivedInsights)
  if (derivedStr) parts.push(derivedStr)
  if (currentModule) parts.push(`CURRENT MODULE: ${currentModule}`)
  const ephemeralStr = formatEphemeralMessages(messages)
  if (ephemeralStr) parts.push(ephemeralStr)

  const systemContext = parts.filter(Boolean).join('\n\n')

  return {
    systemContext,
    usedCache,
    cacheAgeHours,
    layersIncluded: [...new Set(layers)],
  }
}
