/**
 * OpenAI model pricing (USD per 1M tokens). Update when OpenAI publishes new rates.
 * Unknown models: callers should treat cost as null, not throw.
 */

import { OPENAI_DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/openai-model-id'

export type ModelPricing = {
  /** Price per 1M non-cached input (prompt) tokens */
  inputPer1M: number
  /** Price per 1M cached input tokens */
  cachedInputPer1M: number
  /** Price per 1M output (completion) tokens */
  outputPer1M: number
}

/** Keys are canonical model ids (no provider prefix). */
export const OPENAI_MODEL_PRICING_USD_PER_1M: Record<string, ModelPricing> = {
  // Default app model — update from https://openai.com/pricing when needed
  [OPENAI_DEFAULT_CHAT_MODEL_ID]: {
    inputPer1M: 0.25,
    cachedInputPer1M: 0.025,
    outputPer1M: 2.0,
  },
  'gpt-5-nano': {
    inputPer1M: 0.05,
    cachedInputPer1M: 0.005,
    outputPer1M: 0.4,
  },
  'gpt-4o': {
    inputPer1M: 2.5,
    cachedInputPer1M: 1.25,
    outputPer1M: 10.0,
  },
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    cachedInputPer1M: 0.075,
    outputPer1M: 0.6,
  },
  'gpt-4-turbo': {
    inputPer1M: 10.0,
    cachedInputPer1M: 5.0,
    outputPer1M: 30.0,
  },
  'gpt-3.5-turbo': {
    inputPer1M: 0.5,
    cachedInputPer1M: 0.25,
    outputPer1M: 1.5,
  },
  o1: {
    inputPer1M: 15.0,
    cachedInputPer1M: 7.5,
    outputPer1M: 60.0,
  },
  'o1-mini': {
    inputPer1M: 3.0,
    cachedInputPer1M: 1.5,
    outputPer1M: 12.0,
  },
}

export function stripOpenAIModelId(model: string): string {
  const m = model.trim()
  if (m.includes('/')) return m.split('/').pop() || m
  return m
}

export function getOpenAIModelPricing(model: string): ModelPricing | null {
  const id = stripOpenAIModelId(model).toLowerCase()
  return OPENAI_MODEL_PRICING_USD_PER_1M[id] ?? null
}

/**
 * estimatedCost =
 *   regularInput * inputPer1M / 1e6
 * + cachedInput * cachedInputPer1M / 1e6
 * + output * outputPer1M / 1e6
 * regularInput = max(inputTokens - cachedInputTokens, 0)
 */
export function estimateOpenAICostUsd(
  model: string,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
  cachedInputTokens?: number | null | undefined
): number | null {
  const pricing = getOpenAIModelPricing(model)
  if (!pricing) return null
  const inTok = Math.max(0, Math.floor(Number(inputTokens) || 0))
  const cached = Math.max(0, Math.floor(Number(cachedInputTokens) || 0))
  const outTok = Math.max(0, Math.floor(Number(outputTokens) || 0))
  const regularInput = Math.max(inTok - cached, 0)
  const raw =
    (regularInput * pricing.inputPer1M) / 1_000_000 +
    (cached * pricing.cachedInputPer1M) / 1_000_000 +
    (outTok * pricing.outputPer1M) / 1_000_000
  return Math.round(raw * 1_000_000) / 1_000_000
}
