import 'server-only'

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { z } from 'zod'

/**
 * Fear Catcher: turns a user's list of fears into an actionable plan.
 * For each fear we produce ways to approach/overcome it, the benefits of
 * overcoming it, and suggested goals whose achievement delivers those benefits.
 * The suggested goals can then be committed to the dashboard.
 */

export const fearGoalSchema = z.object({
  goal: z.string().min(1).max(255),
  category: z.string().max(60).optional(),
  timeline: z.string().max(60).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

export const fearAnalysisItemSchema = z.object({
  fear: z.string().min(1).max(300),
  actions: z.array(z.string().min(1).max(300)).min(1).max(6),
  benefits: z.array(z.string().min(1).max(300)).min(1).max(6),
  goals: z.array(fearGoalSchema).min(1).max(4),
})

export const fearAnalysisSchema = z.object({
  summary: z.string().min(1),
  fears: z.array(fearAnalysisItemSchema).min(1).max(12),
})

export type FearGoal = z.infer<typeof fearGoalSchema>
export type FearAnalysisItem = z.infer<typeof fearAnalysisItemSchema>
export type FearAnalysis = z.infer<typeof fearAnalysisSchema>

function cleanFears(fears: string[]): string[] {
  return Array.from(
    new Set(
      (fears || [])
        .map((f) => (typeof f === 'string' ? f.trim() : ''))
        .filter((f) => f.length > 0)
        .map((f) => f.slice(0, 300))
    )
  ).slice(0, 12)
}

/** Deterministic analysis so the flow always works, even without an AI key. */
export function buildFallbackAnalysis(fears: string[]): FearAnalysis {
  const usable = cleanFears(fears)
  const list = usable.length ? usable : ['Fear of failing at something that matters to me']

  return {
    summary:
      'Here is a starting plan to face each fear, the rewards on the other side of it, and goals that turn facing it into real progress.',
    fears: list.map((fear) => ({
      fear,
      actions: [
        'Name the fear precisely and write down exactly what triggers it',
        'Take one small, low-risk step toward it this week',
        'Talk it through with someone you trust to gain perspective',
      ],
      benefits: [
        'More confidence and a greater sense of freedom',
        'New opportunities that the fear was blocking',
        'Less anxiety quietly draining your energy',
      ],
      goals: [
        {
          goal: `Take consistent weekly action to face: ${fear}`.slice(0, 255),
          category: 'personal',
          timeline: 'monthly',
          priority: 'high',
        },
      ],
    })),
  }
}

export async function analyzeFears(fears: string[]): Promise<FearAnalysis> {
  const usable = cleanFears(fears)
  if (usable.length === 0) return buildFallbackAnalysis([])

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
    return buildFallbackAnalysis(usable)
  }

  const prompt = `You are a compassionate coach helping someone turn their fears into forward motion.

THE USER'S FEARS:
${usable.map((f, i) => `${i + 1}. ${f}`).join('\n')}

For EACH fear, produce:
- "actions": 2-4 concrete, encouraging steps to approach and gradually overcome the fear. Be specific and doable.
- "benefits": 2-4 tangible benefits the person gains once they overcome that fear.
- "goals": 1-3 measurable goals whose achievement delivers those benefits and represents overcoming the fear. Each goal should be a clear outcome (not a vague wish). Include a category (lowercase word like personal, health, financial, career, relationships, learning), a timeline (e.g. "monthly", "quarterly"), and a priority ("low" | "medium" | "high").

Be warm, practical, and specific. Do not invent fears the user did not mention.

Return ONLY valid JSON (no markdown fences):
{
  "summary": "1-2 warm sentences framing the plan",
  "fears": [
    {
      "fear": "exact fear text",
      "actions": ["...", "..."],
      "benefits": ["...", "..."],
      "goals": [ { "goal": "...", "category": "personal", "timeline": "monthly", "priority": "high" } ]
    }
  ]
}`

  try {
    const { text } = await generateText({
      model: openai(resolveOpenAIModelId()),
      messages: [
        { role: 'system', content: 'Return only valid JSON. No markdown fences.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
    })

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    const parsed = JSON.parse(start >= 0 ? text.slice(start, end + 1) : text)
    const analysis = fearAnalysisSchema.parse(parsed)

    if (analysis.fears.length === 0) return buildFallbackAnalysis(usable)
    return analysis
  } catch {
    return buildFallbackAnalysis(usable)
  }
}
