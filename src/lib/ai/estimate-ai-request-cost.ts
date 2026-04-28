import { estimateOpenAICostUsd, stripOpenAIModelId } from '@/lib/ai/model-pricing'

export type EstimateAIRequestCostInput = {
  model: string
  promptText: string
  /** Expected completion size for a single scenario */
  expectedOutputTokens?: number
  /** Optional estimate of cached prompt tokens (e.g. repeated system prefix) */
  cachedInputTokensEstimate?: number
}

export type EstimateAIRequestCostResult = {
  model: string
  estimatedInputTokens: number
  cachedInputTokensEstimate: number
  expectedOutputTokens: number
  /** Single-point estimate using expectedOutputTokens */
  estimatedCostUsd: number | null
  /** Rough high bound (2x expected output) for UI ranges like ~$0.003–$0.012 */
  estimatedCostUsdHigh: number | null
}

function roughTokenCount(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

/**
 * Lightweight pre-flight cost hint. Does not block requests.
 * Uses chars/4 when no tokenizer is available.
 */
export function estimateAIRequestCost(
  input: EstimateAIRequestCostInput
): EstimateAIRequestCostResult {
  const expectedOut = Math.max(0, Math.floor(input.expectedOutputTokens ?? 256))
  const cachedEst = Math.max(0, Math.floor(input.cachedInputTokensEstimate ?? 0))
  const estimatedInputTokens = roughTokenCount(input.promptText)
  const model = stripOpenAIModelId(input.model)

  const estimatedCostUsd = estimateOpenAICostUsd(
    model,
    estimatedInputTokens,
    expectedOut,
    cachedEst
  )
  const estimatedCostUsdHigh = estimateOpenAICostUsd(
    model,
    estimatedInputTokens,
    Math.ceil(expectedOut * 2),
    cachedEst
  )

  return {
    model,
    estimatedInputTokens,
    cachedInputTokensEstimate: cachedEst,
    expectedOutputTokens: expectedOut,
    estimatedCostUsd,
    estimatedCostUsdHigh,
  }
}
