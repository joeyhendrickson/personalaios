/**
 * AI Context Cache Generator
 * Fetches user data, normalizes, generates summaries, stores in user_context_cache.
 * Uses cheaper model for derived insights; deterministic for static/structured.
 */
import { createAdminClient } from '@/lib/supabaseAdmin'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { env } from '@/lib/env'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import {
  fetchRawUserData,
  buildStaticProfileSummary,
  buildStructuredStateSummary,
} from './fetch-user-data'
import { logAfterVercelSdkCall } from '@/lib/ai/usage-logger'
import type { DerivedInsightsSummary } from '@/types/context-cache'

function summarizationModelId(): string {
  return process.env.OPENAI_SUMMARIZATION_MODEL?.trim() || resolveOpenAIModelId()
}

function simpleChecksum(obj: unknown): string {
  return JSON.stringify(obj)
    .split('')
    .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
    .toString(36)
}

export interface RefreshResult {
  success: boolean
  durationMs: number
  error?: string
  cacheVersion?: number
}

export async function refreshUserContextCache(
  userId: string,
  options?: { route?: string }
): Promise<RefreshResult> {
  const start = Date.now()
  const supabase = createAdminClient()

  try {
    const { data: existing } = await supabase
      .from('user_context_cache')
      .select('id, refresh_status')
      .eq('user_id', userId)
      .single()

    if (existing?.refresh_status === 'running') {
      const runningSince = await supabase
        .from('cache_refresh_jobs')
        .select('started_at')
        .eq('user_id', userId)
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()
      const started = (runningSince.data as { started_at?: string } | null)?.started_at
      if (started && Date.now() - new Date(started).getTime() < 5 * 60 * 1000) {
        return {
          success: false,
          durationMs: Date.now() - start,
          error: 'Refresh already in progress',
        }
      }
    }

    await supabase.from('user_context_cache').upsert(
      {
        user_id: userId,
        refresh_status: 'running',
        refresh_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    await supabase.from('cache_refresh_jobs').insert({
      user_id: userId,
      job_type: 'full',
      status: 'running',
      started_at: new Date().toISOString(),
    })

    const raw = await fetchRawUserData(supabase, userId)
    const checksum = simpleChecksum({
      userGoals: raw.userGoals.length,
      dashboardProjects: raw.dashboardProjects.length,
      tasks: raw.tasks.length,
      priorities: raw.priorities.length,
      ts: Math.floor(Date.now() / 3600000),
    })

    const staticProfile = buildStaticProfileSummary(raw.assessmentData)
    const structuredState = buildStructuredStateSummary(
      raw as Parameters<typeof buildStructuredStateSummary>[0]
    )

    const derived = await generateDerivedInsights(raw, structuredState, {
      userId,
      route: options?.route ?? '/api/ai/context-cache/refresh',
    })

    const currentVersion = (existing as { cache_version?: number } | null)?.cache_version ?? 0
    const cacheVersion = currentVersion + 1
    const now = new Date().toISOString()

    const { error } = await supabase.from('user_context_cache').upsert(
      {
        user_id: userId,
        static_profile_summary_json: staticProfile,
        structured_state_summary_json: structuredState,
        derived_insights_summary_json: derived,
        cache_version: cacheVersion,
        source_data_checksum: checksum,
        last_full_refresh_at: now,
        last_incremental_refresh_at: null,
        refresh_status: 'success',
        refresh_error: null,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )

    if (error) throw error

    await supabase
      .from('cache_refresh_jobs')
      .update({
        status: 'completed',
        completed_at: now,
        error_message: null,
      })
      .eq('user_id', userId)
      .eq('status', 'running')

    const durationMs = Date.now() - start
    console.log(`[ContextCache] Refresh completed for ${userId} in ${durationMs}ms`)

    return { success: true, durationMs, cacheVersion }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[ContextCache] Refresh failed for', userId, errMsg)

    await supabase
      .from('user_context_cache')
      .update({
        refresh_status: 'failed',
        refresh_error: errMsg,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    await supabase
      .from('cache_refresh_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errMsg,
      })
      .eq('user_id', userId)
      .eq('status', 'running')

    return {
      success: false,
      durationMs: Date.now() - start,
      error: errMsg,
    }
  }
}

async function generateDerivedInsights(
  raw: Awaited<ReturnType<typeof fetchRawUserData>>,
  structured: ReturnType<typeof buildStructuredStateSummary>,
  ctx: { userId: string; route: string }
): Promise<DerivedInsightsSummary> {
  if (!env.OPENAI_API_KEY) {
    return {
      overallProgress: 'AI summarization disabled (no API key).',
      strengths: [],
      areasForImprovement: [],
      recommendations: [],
      nextSteps: [],
    }
  }

  const prompt = `You are a productivity analyst. In 2-3 sentences, summarize this user's overall progress and provide 3-5 brief actionable recommendations. Be specific to their data. Return ONLY valid JSON:
{"overallProgress":"string","strengths":["string"],"areasForImprovement":["string"],"recommendations":["string"],"goalAlignment":"1 sentence","productivityScore":0-100,"nextSteps":["string"]}

USER DATA:
- User goals table: ${structured.totalGoals}; Dashboard projects: ${structured.totalDashboardProjects ?? '—'}
- Tasks: ${structured.totalTasks}, Habits: ${structured.totalHabits}
- Weekly points: ${structured.weeklyPoints}, Daily points: ${structured.dailyPoints}
- Completed today: ${structured.completedTasksToday}, Priorities: ${structured.activePriorities}
- Top user goals: ${structured.topGoals.map((g) => g.title).join(', ') || 'None'}
- Top dashboard projects: ${(structured.topDashboardProjects ?? []).map((p) => p.title).join(', ') || 'None'}
- Top priorities: ${structured.topPriorities.map((p) => p.title).join(', ') || 'None'}`

  const modelId = summarizationModelId()
  const startMs = Date.now()
  try {
    const result = await generateText({
      model: openai(modelId),
      messages: [
        {
          role: 'system',
          content: 'Return only valid JSON. No markdown. No extra text.',
        },
        { role: 'user', content: prompt },
      ],
    })

    await logAfterVercelSdkCall({
      startMs,
      userId: ctx.userId,
      module: 'context_refresh',
      action: 'refresh_user_context_cache',
      route: ctx.route,
      model: modelId || resolveOpenAIModelId(),
      description: 'Refreshed AI memory summary for dashboard personalization.',
      result,
    })

    const parsed = JSON.parse(result.text) as DerivedInsightsSummary
    return {
      overallProgress: parsed.overallProgress ?? '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      areasForImprovement: Array.isArray(parsed.areasForImprovement)
        ? parsed.areasForImprovement
        : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      goalAlignment: parsed.goalAlignment,
      productivityScore:
        typeof parsed.productivityScore === 'number' ? parsed.productivityScore : undefined,
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
    }
  } catch (e) {
    await logAfterVercelSdkCall({
      startMs,
      userId: ctx.userId,
      module: 'context_refresh',
      action: 'refresh_user_context_cache',
      route: ctx.route,
      model: modelId || resolveOpenAIModelId(),
      description: 'Refreshed AI memory summary for dashboard personalization.',
      status: 'failed',
      error: e instanceof Error ? e.message : 'Unknown error',
    })
    return {
      overallProgress: 'Unable to generate AI insights.',
      strengths: [],
      areasForImprovement: [],
      recommendations: [],
      nextSteps: [],
    }
  }
}
