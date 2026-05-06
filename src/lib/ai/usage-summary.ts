import { getOpenAIModelPricing, stripOpenAIModelId } from '@/lib/ai/model-pricing'

export type UsageLogRow = {
  user_id?: string | null
  route?: string | null
  action?: string | null
  estimated_cost_usd?: number | null
  input_tokens?: number | null
  cached_input_tokens?: number | null
  output_tokens?: number | null
  total_tokens?: number | null
  status?: string | null
  latency_ms?: number | null
  module?: string | null
  model?: string | null
}

export type UsageSummary = {
  totalCostUsd: number
  totalInputTokens: number
  totalCachedInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCalls: number
  failedCalls: number
  averageLatencyMs: number | null
  costByModule: Record<string, number>
  tokensByModule: Record<string, number>
  costByModel: Record<string, number>
  costByRoute: Record<string, number>
  costByAction: Record<string, number>
  /** If cached pricing is known: hypothetical cost without cache discount on cached tokens */
  cacheSavingsEstimateUsd: number | null
  /** Admin aggregate: estimated cost per user id */
  costByUser?: Record<string, number>
  mostExpensiveUserId?: string | null
  mostExpensiveUserCostUsd?: number | null
  mostExpensiveModule?: string | null
  mostExpensiveModuleCostUsd?: number | null
}

function num(n: unknown): number {
  const x = Number(n)
  return Number.isFinite(x) ? x : 0
}

function topCostEntry(costMap: Record<string, number>): { key: string; value: number } | null {
  let best: { key: string; value: number } | null = null
  for (const [k, v] of Object.entries(costMap)) {
    if (!best || v > best.value) best = { key: k, value: v }
  }
  return best
}

export function summarizeUsageLogs(
  rows: UsageLogRow[],
  options?: { includePerUser?: boolean }
): UsageSummary {
  let totalCostUsd = 0
  let totalInputTokens = 0
  let totalCachedInputTokens = 0
  let totalOutputTokens = 0
  let totalTokens = 0
  let totalCalls = 0
  let failedCalls = 0
  let latencySum = 0
  let latencyCount = 0
  const costByModule: Record<string, number> = {}
  const tokensByModule: Record<string, number> = {}
  const costByModel: Record<string, number> = {}
  const costByUser: Record<string, number> = {}
  const costByRoute: Record<string, number> = {}
  const costByAction: Record<string, number> = {}

  for (const r of rows) {
    totalCalls += 1
    if (String(r.status || '').toLowerCase() === 'failed') failedCalls += 1

    const c = num(r.estimated_cost_usd)
    totalCostUsd += c

    const it = Math.floor(num(r.input_tokens))
    const cit = Math.floor(num(r.cached_input_tokens))
    const ot = Math.floor(num(r.output_tokens))
    const tt = r.total_tokens != null ? Math.floor(num(r.total_tokens)) : it + ot

    totalInputTokens += it
    totalCachedInputTokens += cit
    totalOutputTokens += ot
    totalTokens += tt

    const lm = r.latency_ms
    if (lm != null && Number.isFinite(Number(lm))) {
      latencySum += Number(lm)
      latencyCount += 1
    }

    const mod = r.module || 'unknown'
    costByModule[mod] = (costByModule[mod] || 0) + c
    tokensByModule[mod] = (tokensByModule[mod] || 0) + tt

    const mdl = r.model || 'unknown'
    costByModel[mdl] = (costByModel[mdl] || 0) + c

    const routeKey = (r.route && String(r.route).trim()) || '(no route)'
    costByRoute[routeKey] = (costByRoute[routeKey] || 0) + c

    const actionKey = (r.action && String(r.action).trim()) || '(no action)'
    costByAction[actionKey] = (costByAction[actionKey] || 0) + c

    if (options?.includePerUser && r.user_id) {
      const uid = String(r.user_id)
      costByUser[uid] = (costByUser[uid] || 0) + c
    }
  }

  const averageLatencyMs = latencyCount > 0 ? Math.round(latencySum / latencyCount) : null

  const topUser = options?.includePerUser ? topCostEntry(costByUser) : null
  const topMod = topCostEntry(costByModule)

  return {
    totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
    totalInputTokens,
    totalCachedInputTokens,
    totalOutputTokens,
    totalTokens,
    totalCalls,
    failedCalls,
    averageLatencyMs,
    costByModule,
    tokensByModule,
    costByModel,
    costByRoute,
    costByAction,
    cacheSavingsEstimateUsd: null,
    ...(options?.includePerUser
      ? {
          costByUser,
          mostExpensiveUserId: topUser?.key ?? null,
          mostExpensiveUserCostUsd: topUser
            ? Math.round(topUser.value * 1_000_000) / 1_000_000
            : null,
        }
      : {}),
    mostExpensiveModule: topMod?.key ?? null,
    mostExpensiveModuleCostUsd: topMod ? Math.round(topMod.value * 1_000_000) / 1_000_000 : null,
  }
}

function round6(n: number) {
  return Math.round(n * 1_000_000) / 1_000_000
}

/** Approximate USD saved vs paying full input price on cached prompt tokens. */
export function computeCacheSavingsUsd(rows: UsageLogRow[]): number | null {
  let total = 0
  let any = false
  for (const r of rows) {
    const cached = Math.max(0, Math.floor(Number(r.cached_input_tokens) || 0))
    if (cached <= 0) continue
    const p = getOpenAIModelPricing(stripOpenAIModelId(String(r.model || '')))
    if (!p) continue
    any = true
    total += (cached / 1_000_000) * (p.inputPer1M - p.cachedInputPer1M)
  }
  return any ? round6(total) : null
}
