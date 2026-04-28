import 'server-only'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { estimateOpenAICostUsd, stripOpenAIModelId } from '@/lib/ai/model-pricing'

export type LogAIUsageInput = {
  userId: string | null | undefined
  module: string
  action: string
  route?: string | null
  model: string
  provider?: string | null
  inputTokens?: number | null
  cachedInputTokens?: number | null
  outputTokens?: number | null
  totalTokens?: number | null
  description?: string | null
  status?: string | null
  latencyMs?: number | null
  requestId?: string | null
  error?: string | null
  metadata?: Record<string, unknown>
  actualCostUsd?: number | null
}

function intOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = Math.floor(Number(v))
  return Number.isFinite(n) ? n : null
}

/** Normalize usage objects returned by Vercel AI SDK (generateText / generateObject / stream onFinish). */
export function normalizeUsageFromVercelAI(result: unknown): {
  inputTokens: number | null
  cachedInputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
} {
  if (!result || typeof result !== 'object') {
    return {
      inputTokens: null,
      cachedInputTokens: null,
      outputTokens: null,
      totalTokens: null,
    }
  }
  const r = result as Record<string, unknown>
  const usage = (r.usage as Record<string, unknown>) || {}
  const promptDetails =
    (usage.promptTokensDetails as Record<string, unknown>) ||
    (usage.prompt_tokens_details as Record<string, unknown>) ||
    {}

  const inputTokens =
    intOrNull(usage.promptTokens) ??
    intOrNull(usage.prompt_tokens) ??
    intOrNull(usage.inputTokens) ??
    intOrNull(usage.input_tokens)

  const outputTokens =
    intOrNull(usage.completionTokens) ??
    intOrNull(usage.completion_tokens) ??
    intOrNull(usage.outputTokens) ??
    intOrNull(usage.output_tokens)

  const cachedInputTokens =
    intOrNull(promptDetails.cachedTokens) ??
    intOrNull(promptDetails.cached_tokens) ??
    intOrNull(usage.cachedInputTokens)

  let totalTokens =
    intOrNull(usage.totalTokens) ??
    intOrNull(usage.total_tokens) ??
    intOrNull(usage.totalTokenCount)

  if (totalTokens == null && inputTokens != null && outputTokens != null) {
    totalTokens = inputTokens + outputTokens
  }

  return { inputTokens, cachedInputTokens, outputTokens, totalTokens }
}

/** OpenAI REST SDK chat completion / legacy completion responses. */
export function normalizeUsageFromOpenAI(result: unknown): {
  inputTokens: number | null
  cachedInputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
} {
  if (!result || typeof result !== 'object') {
    return {
      inputTokens: null,
      cachedInputTokens: null,
      outputTokens: null,
      totalTokens: null,
    }
  }
  const r = result as Record<string, unknown>
  const usage = (r.usage as Record<string, unknown>) || {}
  const promptDetails =
    (usage.prompt_tokens_details as Record<string, unknown>) ||
    (usage.promptTokensDetails as Record<string, unknown>) ||
    {}

  const inputTokens = intOrNull(usage.prompt_tokens) ?? intOrNull(usage.promptTokens)
  const outputTokens = intOrNull(usage.completion_tokens) ?? intOrNull(usage.completionTokens)
  const cachedInputTokens =
    intOrNull(promptDetails.cached_tokens) ?? intOrNull(promptDetails.cachedTokens)

  let totalTokens = intOrNull(usage.total_tokens) ?? intOrNull(usage.totalTokens)
  if (totalTokens == null && inputTokens != null && outputTokens != null) {
    totalTokens = inputTokens + outputTokens
  }

  return { inputTokens, cachedInputTokens, outputTokens, totalTokens }
}

/** Convenience after `generateText` / `generateObject` (Vercel AI SDK). */
export async function logAfterVercelSdkCall(opts: {
  startMs: number
  userId: string | null | undefined
  module: string
  action: string
  route?: string | null
  model: string
  description: string
  result?: unknown
  status?: string
  error?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const u = opts.result ? normalizeUsageFromVercelAI(opts.result) : null
  await logAIUsage({
    userId: opts.userId,
    module: opts.module,
    action: opts.action,
    route: opts.route,
    model: opts.model,
    inputTokens: u?.inputTokens,
    cachedInputTokens: u?.cachedInputTokens,
    outputTokens: u?.outputTokens,
    totalTokens: u?.totalTokens,
    description: opts.description,
    status: opts.status ?? 'completed',
    latencyMs: Date.now() - opts.startMs,
    error: opts.error ?? null,
    metadata: opts.metadata,
  })
}

/** Convenience after OpenAI Node SDK `chat.completions.create` / `completions.create`. */
export async function logAfterOpenAIRestCall(opts: {
  startMs: number
  userId: string | null | undefined
  module: string
  action: string
  route?: string | null
  model: string
  description: string
  response?: unknown
  status?: string
  error?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const u = opts.response ? normalizeUsageFromOpenAI(opts.response) : null
  await logAIUsage({
    userId: opts.userId,
    module: opts.module,
    action: opts.action,
    route: opts.route,
    model: opts.model,
    inputTokens: u?.inputTokens,
    cachedInputTokens: u?.cachedInputTokens,
    outputTokens: u?.outputTokens,
    totalTokens: u?.totalTokens,
    description: opts.description,
    status: opts.status ?? 'completed',
    latencyMs: Date.now() - opts.startMs,
    error: opts.error ?? null,
    metadata: opts.metadata,
  })
}

export async function logAIUsage(input: LogAIUsageInput): Promise<void> {
  try {
    const admin = createAdminClient()
    const model = stripOpenAIModelId(String(input.model || 'unknown'))
    const provider = (input.provider || 'openai').trim() || 'openai'

    const inTok = intOrNull(input.inputTokens)
    const cachedTok = intOrNull(input.cachedInputTokens)
    const outTok = intOrNull(input.outputTokens)
    let totalTok = intOrNull(input.totalTokens)
    if (totalTok == null && inTok != null && outTok != null) {
      totalTok = inTok + outTok
    }

    const hasTokenSignal = inTok != null || outTok != null || cachedTok != null || totalTok != null

    const estimated =
      provider === 'openai' && hasTokenSignal
        ? estimateOpenAICostUsd(model, inTok ?? 0, outTok ?? 0, cachedTok ?? 0)
        : null

    const row = {
      user_id: input.userId || null,
      module: input.module,
      action: input.action,
      route: input.route ?? null,
      model,
      provider,
      input_tokens: inTok,
      cached_input_tokens: cachedTok,
      output_tokens: outTok,
      total_tokens: totalTok,
      estimated_cost_usd: estimated,
      actual_cost_usd: input.actualCostUsd ?? null,
      description: input.description ?? null,
      status: (input.status || 'completed').trim() || 'completed',
      latency_ms: intOrNull(input.latencyMs),
      request_id: input.requestId ?? null,
      error: input.error ?? null,
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    }

    const { error } = await admin.from('ai_usage_logs').insert(row)
    if (error) {
      console.warn('[ai_usage_logs] insert failed:', error.message)
    }
  } catch (e) {
    console.warn('[ai_usage_logs]', e instanceof Error ? e.message : e)
  }
}
