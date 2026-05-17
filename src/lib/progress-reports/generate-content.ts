import 'server-only'

import { generateText } from 'ai'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAIUsage, normalizeUsageFromVercelAI } from '@/lib/ai/usage-logger'
import type { ProgressReportDocument, ReportPeriodType } from './types'
import type { RawReportContext } from './collect-data'

export async function generateReportContent(
  userId: string,
  periodType: ReportPeriodType,
  periodLabel: string,
  periodStart: string,
  periodEnd: string,
  context: RawReportContext
): Promise<
  Pick<
    ProgressReportDocument,
    'narrativeSummary' | 'highlightsBullets' | 'coverArtPrompt' | 'moduleHighlights'
  >
> {
  const prompt = `You are writing a polished personal progress report for a Life Stacks user.

PERIOD: ${periodLabel} (${periodType})
DATES: ${periodStart} through ${periodEnd}

RAW DATA:
${JSON.stringify(
  {
    stats: context.stats,
    moduleHighlights: context.moduleHighlights,
    accomplishments: context.accomplishments,
  },
  null,
  2
)}

Write JSON only:
{
  "narrativeSummary": "2-4 paragraphs in warm, encouraging second person. Summarize what they accomplished, momentum, and growth themes. Reference specific numbers from stats when helpful.",
  "highlightsBullets": ["5-8 short bullet strings for key wins — mix dashboard tasks/projects/habits/points with Life Hack module insights where data exists"],
  "coverArtPrompt": "A single DALL-E prompt (max 900 chars) for an elegant magazine-style progress report cover: abstract, uplifting, professional. Include subtle motifs suggesting growth and productivity. No text in the image. Cohesive color palette.",
  "moduleHighlights": [
    {
      "moduleId": "same id from input",
      "moduleLabel": "label",
      "usageCount": 0,
      "conclusions": ["1-2 refined takeaway sentences per module that had conclusions or usage — synthesize their module work, do not invent therapy"]
    }
  ]
}

Rules:
- Only include modules present in the input or with clear data.
- If a module has conclusions in input, refine them; do not fabricate clinical claims.
- Keep tone celebratory and practical, not clinical.`

  const started = Date.now()
  const result = await generateText({
    model: defaultOpenaiModel(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
  })

  await logAIUsage({
    userId,
    module: 'progress-reports',
    action: 'generate_narrative',
    route: '/api/progress-reports/generate',
    model: resolveOpenAIModelId(),
    ...normalizeUsageFromVercelAI(result),
    latencyMs: Date.now() - started,
    description: `Progress report narrative (${periodType})`,
  })

  let parsed: {
    narrativeSummary?: string
    highlightsBullets?: string[]
    coverArtPrompt?: string
    moduleHighlights?: ProgressReportDocument['moduleHighlights']
  } = {}

  try {
    parsed = JSON.parse(result.text)
  } catch {
    const match = result.text.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
  }

  const mergedHighlights =
    parsed.moduleHighlights && parsed.moduleHighlights.length > 0
      ? parsed.moduleHighlights
      : context.moduleHighlights

  return {
    narrativeSummary:
      String(parsed.narrativeSummary || '').trim() ||
      'You made meaningful progress this period. Keep building on your momentum.',
    highlightsBullets: (parsed.highlightsBullets || [])
      .map((b) => String(b).trim())
      .filter(Boolean)
      .slice(0, 10),
    coverArtPrompt:
      String(parsed.coverArtPrompt || '').trim() ||
      'Elegant abstract magazine cover art celebrating personal growth, soft gradients, gold and blue tones, minimalist, no text, professional report aesthetic',
    moduleHighlights: mergedHighlights,
  }
}
