import { generateObject } from 'ai'
import { z } from 'zod'
import type { InteractionExtraction } from './types'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterVercelSdkCall } from '@/lib/ai/usage-logger'

const extractionSchema = z.object({
  topics_discussed: z.array(z.string()).max(25),
  emotional_tone: z.enum(['positive', 'neutral', 'negative']),
  alignment_signals: z.array(z.string()).max(20),
  commitments: z
    .array(
      z.object({
        quote: z.string().max(400),
        party: z.enum(['self', 'them', 'unclear']),
      })
    )
    .max(12),
  shared_experience_snippets: z.array(z.string()).max(20),
})

/**
 * Extracts grounded metadata from a single interaction body.
 * Model must only copy substrings from the input for quotes/snippets; otherwise return [].
 */
export async function extractInteractionMetadata(
  content: string,
  interactionType: string,
  logCtx?: { userId: string; route: string }
): Promise<InteractionExtraction | null> {
  if (!process.env.OPENAI_API_KEY) return null
  const trimmed = content.trim()
  if (trimmed.length < 8) {
    return {
      topics_discussed: [],
      emotional_tone: 'neutral',
      alignment_signals: [],
      commitments: [],
      shared_experience_snippets: [],
      model_version: 'none',
    }
  }

  const system = `You extract structured metadata from ONE relationship log the user pasted.

Absolute rules:
1) Copy-paste rule: Every string inside alignment_signals, commitments.quote, and shared_experience_snippets MUST be an exact contiguous substring of the user's text (case-sensitive match to the source). If you cannot find a substring, use an empty array or omit that item.
2) topics_discussed: short noun phrases (3-6 words max each) summarizing themes — only if clearly supported by the text; otherwise [].
3) emotional_tone: overall tone of the pasted exchange only (positive / neutral / negative).
4) commitments: promises or plans with verbatim quote; party = who made it from context ("I will" -> self, "I'll send" from other speaker -> them, unclear if ambiguous).
5) alignment_signals: verbatim snippets where they discuss projects, collaboration, helping, or shared work.
6) shared_experience_snippets: verbatim snippets about past hangouts, trips, meals, events together.
7) interaction_type hint: ${interactionType}
8) If text is too thin to support a field, return empty arrays — never invent events.`

  const startMs = Date.now()
  const modelId = resolveOpenAIModelId()
  try {
    const result = await generateObject({
      model: defaultOpenaiModel(),
      schema: extractionSchema,
      system,
      prompt: `TEXT:\n"""${trimmed}"""`,
      temperature: 0.1,
    })

    if (logCtx) {
      await logAfterVercelSdkCall({
        startMs,
        userId: logCtx.userId,
        module: 'relationship_intel',
        action: 'extract_interaction_metadata',
        route: logCtx.route,
        model: modelId,
        description: 'Structured interaction notes from text you saved.',
        result,
      })
    }

    const o = result.object as z.infer<typeof extractionSchema>
    const sanitize = (arr: string[]) =>
      arr.filter((s) => {
        const q = s.trim()
        return q.length > 0 && trimmed.includes(q)
      })

    const commitments = o.commitments.filter(
      (c) => c.quote.trim().length > 0 && trimmed.includes(c.quote)
    )

    return {
      topics_discussed: o.topics_discussed.map((t) => t.trim()).filter(Boolean),
      emotional_tone: o.emotional_tone,
      alignment_signals: sanitize(o.alignment_signals),
      commitments,
      shared_experience_snippets: sanitize(o.shared_experience_snippets),
      model_version: resolveOpenAIModelId(),
    }
  } catch (e) {
    if (logCtx) {
      await logAfterVercelSdkCall({
        startMs,
        userId: logCtx.userId,
        module: 'relationship_intel',
        action: 'extract_interaction_metadata',
        route: logCtx.route,
        model: modelId,
        description: 'Structured interaction notes from text you saved.',
        status: 'failed',
        error: e instanceof Error ? e.message : 'Unknown error',
      })
    }
    return {
      topics_discussed: [],
      emotional_tone: 'neutral',
      alignment_signals: [],
      commitments: [],
      shared_experience_snippets: [],
      model_version: 'error',
    }
  }
}
