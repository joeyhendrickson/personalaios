/**
 * AI summarization for large module context payloads (runs during cache refresh).
 */
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { env } from '@/lib/env'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterVercelSdkCall } from '@/lib/ai/usage-logger'
import type { ModuleContextSummary } from '@/types/context-cache'

const LARGE_MODULE_RECORD_THRESHOLD = 12
const LARGE_BUDGET_TX_THRESHOLD = 40

function summarizationModelId(): string {
  return process.env.OPENAI_SUMMARIZATION_MODEL?.trim() || resolveOpenAIModelId()
}

function needsAiSummary(summary: ModuleContextSummary, budgetTxCount?: number): boolean {
  if (!summary.hasData) return false
  if (
    summary.moduleId === 'budget-optimizer' &&
    (budgetTxCount ?? 0) >= LARGE_BUDGET_TX_THRESHOLD
  ) {
    return true
  }
  const lineCount =
    summary.objectiveFacts.length + summary.subjectiveNotes.length + summary.recentHighlights.length
  return summary.recordCount >= LARGE_MODULE_RECORD_THRESHOLD || lineCount >= 10
}

function buildModulePayload(summary: ModuleContextSummary): string {
  return [
    `moduleId: ${summary.moduleId}`,
    `categories: ${summary.categories.join(', ')}`,
    `facts: ${summary.objectiveFacts.join(' | ')}`,
    `subjective: ${summary.subjectiveNotes.join(' | ')}`,
    `recent: ${summary.recentHighlights.join(' | ')}`,
  ].join('\n')
}

export async function enrichModuleSummariesWithAI(
  summaries: ModuleContextSummary[],
  ctx: { userId: string; route: string; budgetTransactionCount?: number }
): Promise<ModuleContextSummary[]> {
  if (!env.OPENAI_API_KEY) return summaries

  const toSummarize = summaries.filter((s) => needsAiSummary(s, ctx.budgetTransactionCount))
  if (!toSummarize.length) return summaries

  const payload = toSummarize.map(buildModulePayload).join('\n\n---\n\n')
  const modelId = summarizationModelId()
  const startMs = Date.now()

  const prompt = `You compress life-module data for an AI advisor. For each module below, write a dense 2-4 sentence summary that preserves:
- Specific numbers, names, dates, and user-written emotional content
- Actionable patterns (spending, energy, relationships, trading thesis)
Do NOT invent data. Return ONLY valid JSON array:
[{"moduleId":"string","aiSummary":"string"}]

MODULES:
${payload}`

  try {
    const result = await generateText({
      model: openai(modelId),
      messages: [
        { role: 'system', content: 'Return only a JSON array. No markdown.' },
        { role: 'user', content: prompt },
      ],
    })

    await logAfterVercelSdkCall({
      startMs,
      userId: ctx.userId,
      module: 'context_refresh',
      action: 'summarize_module_context',
      route: ctx.route,
      model: modelId,
      description: 'AI-compressed large module summaries for Advisor context.',
      result,
    })

    const parsed = JSON.parse(result.text) as Array<{ moduleId?: string; aiSummary?: string }>
    const byId = new Map(
      parsed.filter((p) => p.moduleId && p.aiSummary).map((p) => [p.moduleId!, p.aiSummary!])
    )

    return summaries.map((s) => {
      const aiSummary = byId.get(s.moduleId)
      return aiSummary ? { ...s, aiSummary } : s
    })
  } catch (e) {
    await logAfterVercelSdkCall({
      startMs,
      userId: ctx.userId,
      module: 'context_refresh',
      action: 'summarize_module_context',
      route: ctx.route,
      model: modelId,
      description: 'AI-compressed large module summaries for Advisor context.',
      status: 'failed',
      error: e instanceof Error ? e.message : 'Unknown error',
    })
    return summaries
  }
}
