import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeAiCostMapForDisplay,
  normalizeAiCostUsdForDisplay,
} from '@/lib/ai/format-ai-cost-usd'
import {
  summarizeUsageLogs,
  computeCacheSavingsUsd,
  type UsageLogRow,
  type UsageSummary,
} from '@/lib/ai/usage-summary'

export type AiUsageQueryFilters = {
  startDate?: string | null
  endDate?: string | null
  module?: string | null
  action?: string | null
  model?: string | null
  status?: string | null
  /** Admin-only: restrict to one user */
  userId?: string | null
}

const MAX_SUMMARY_ROWS = 80_000

export function parseUsageFilters(sp: URLSearchParams): AiUsageQueryFilters {
  return {
    startDate: sp.get('startDate'),
    endDate: sp.get('endDate'),
    module: sp.get('module'),
    action: sp.get('action'),
    model: sp.get('model'),
    status: sp.get('status'),
    userId: sp.get('userId'),
  }
}

export function applyAiUsageFilters(
  q: any,
  filters: AiUsageQueryFilters,
  options: { enforceUserId?: string } = {}
) {
  let query = q
  if (options.enforceUserId) {
    query = query.eq('user_id', options.enforceUserId)
  } else if (filters.userId) {
    query = query.eq('user_id', filters.userId)
  }
  if (filters.startDate) {
    const d = new Date(filters.startDate)
    if (!Number.isNaN(d.getTime())) query = query.gte('created_at', d.toISOString())
  }
  if (filters.endDate) {
    const d = new Date(filters.endDate)
    if (!Number.isNaN(d.getTime())) query = query.lte('created_at', d.toISOString())
  }
  if (filters.module) query = query.eq('module', filters.module)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.model) query = query.eq('model', filters.model)
  if (filters.status) query = query.eq('status', filters.status)
  return query
}

const SUMMARY_SELECT =
  'user_id,estimated_cost_usd,input_tokens,cached_input_tokens,output_tokens,total_tokens,status,latency_ms,module,model,route,action'

export async function fetchAiUsageLogsPage(
  client: SupabaseClient,
  filters: AiUsageQueryFilters,
  options: { enforceUserId?: string; limit: number; offset: number }
) {
  const limit = Math.min(Math.max(options.limit, 1), 200)
  const offset = Math.max(options.offset, 0)
  let q = client.from('ai_usage_logs').select('*', { count: 'exact' })
  q = applyAiUsageFilters(q, filters, { enforceUserId: options.enforceUserId })
  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return { data: data || [], error, count: count ?? 0 }
}

export async function fetchAiUsageSummaryRows(
  client: SupabaseClient,
  filters: AiUsageQueryFilters,
  options: { enforceUserId?: string }
): Promise<{ rows: UsageLogRow[]; truncated: boolean }> {
  const rows: UsageLogRow[] = []
  let offset = 0
  const page = 2500
  let truncated = false

  while (offset < MAX_SUMMARY_ROWS) {
    let q = client.from('ai_usage_logs').select(SUMMARY_SELECT)
    q = applyAiUsageFilters(q, filters, { enforceUserId: options.enforceUserId })
    const { data, error } = await q
      .order('created_at', { ascending: false })
      .range(offset, offset + page - 1)
    if (error) throw new Error(error.message)
    const chunk = (data || []) as UsageLogRow[]
    rows.push(...chunk)
    if (chunk.length < page) break
    offset += page
    if (offset + page > MAX_SUMMARY_ROWS) {
      truncated = true
      break
    }
  }

  return { rows, truncated }
}

function normalizeUsageLogForDisplay<T extends { estimated_cost_usd?: number | null }>(log: T): T {
  return {
    ...log,
    estimated_cost_usd: normalizeAiCostUsdForDisplay(log.estimated_cost_usd),
  }
}

function normalizeUsageSummaryForDisplay(summary: UsageSummary): UsageSummary {
  return {
    ...summary,
    totalCostUsd: normalizeAiCostUsdForDisplay(summary.totalCostUsd) ?? 0,
    cacheSavingsEstimateUsd: normalizeAiCostUsdForDisplay(summary.cacheSavingsEstimateUsd),
    mostExpensiveUserCostUsd: normalizeAiCostUsdForDisplay(summary.mostExpensiveUserCostUsd),
    mostExpensiveModuleCostUsd: normalizeAiCostUsdForDisplay(summary.mostExpensiveModuleCostUsd),
    costByModule: normalizeAiCostMapForDisplay(summary.costByModule),
    costByModel: normalizeAiCostMapForDisplay(summary.costByModel),
    costByRoute: normalizeAiCostMapForDisplay(summary.costByRoute),
    costByAction: normalizeAiCostMapForDisplay(summary.costByAction),
    ...(summary.costByUser ? { costByUser: normalizeAiCostMapForDisplay(summary.costByUser) } : {}),
  }
}

export async function buildAiUsageResponse(
  client: SupabaseClient,
  filters: AiUsageQueryFilters,
  options: { enforceUserId?: string; limit: number; offset: number; includePerUser?: boolean }
) {
  const [{ rows: summaryRows, truncated }, page] = await Promise.all([
    fetchAiUsageSummaryRows(client, filters, { enforceUserId: options.enforceUserId }),
    fetchAiUsageLogsPage(client, filters, {
      enforceUserId: options.enforceUserId,
      limit: options.limit,
      offset: options.offset,
    }),
  ])

  const baseSummary = summarizeUsageLogs(summaryRows, {
    includePerUser: options.includePerUser === true,
  })
  const summary = {
    ...baseSummary,
    cacheSavingsEstimateUsd: computeCacheSavingsUsd(summaryRows),
    ...(truncated ? { summaryTruncated: true as const } : {}),
  }

  if (page.error) {
    throw new Error(page.error.message)
  }

  return {
    logs: (page.data as Array<{ estimated_cost_usd?: number | null }>).map(
      normalizeUsageLogForDisplay
    ),
    count: page.count,
    summary: normalizeUsageSummaryForDisplay(summary),
  }
}
