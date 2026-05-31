import 'server-only'

import { generateText } from 'ai'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterVercelSdkCall } from '@/lib/ai/usage-logger'

function toDataUrl(mimeType: string, buffer: Buffer): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

function extractJson(text: string): Record<string, unknown> {
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as Record<string, unknown>
  } catch {
    /* fall through */
  }
  return { raw: text }
}

export type ProspectPhotoAnalysis = {
  attractiveness_score: number
  appearance_summary: string
  alignment_question: string
  raw?: string
}

/**
 * Scores a prospect photo's attractiveness (0-100) and, rather than treating looks
 * as the whole picture, returns a reflective question about how that attraction
 * aligns (or conflicts) with the user's stated life vision.
 */
export async function scoreProspectPhoto(
  buffer: Buffer,
  mimeType: string,
  visionContext: string,
  log?: { userId: string; route: string }
): Promise<ProspectPhotoAnalysis> {
  const image = toDataUrl(mimeType, buffer)
  const startMs = Date.now()
  const modelId = resolveOpenAIModelId()

  const result = await generateText({
    model: defaultOpenaiModel(),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a thoughtful dating coach helping someone evaluate a potential partner.
Give a candid but respectful read of this photo.

USER'S LIFE VISION (their goals/projects/priorities/habits):
${visionContext.slice(0, 2500)}

Return ONLY valid JSON:
{
  "attractiveness_score": number (0-100, your honest general-audience read of physical attractiveness),
  "appearance_summary": "1-2 neutral sentences on presentation/style/vibe (no demographic guesses, no medical claims)",
  "alignment_question": "one probing question that helps the user reflect on whether this physical attraction supports or distracts from the life they're building"
}`,
          },
          { type: 'image', image },
        ],
      },
    ],
  })

  if (log) {
    await logAfterVercelSdkCall({
      startMs,
      userId: log.userId,
      module: 'dating_manager',
      action: 'score_prospect_photo',
      route: log.route,
      model: modelId,
      description: 'Scored a dating prospect photo and generated an alignment question.',
      result,
    })
  }

  const parsed = extractJson(result.text)
  const score = Number(parsed.attractiveness_score)
  return {
    attractiveness_score: Number.isFinite(score)
      ? Math.max(0, Math.min(100, Math.round(score)))
      : 0,
    appearance_summary:
      typeof parsed.appearance_summary === 'string' ? parsed.appearance_summary : '',
    alignment_question:
      typeof parsed.alignment_question === 'string'
        ? parsed.alignment_question
        : 'How does this attraction support the life you want to build?',
    raw: result.text,
  }
}

export type CouplePhotoAnalysis = {
  connection_score: number
  emotional_read: string
  expressions: string[]
  caution: string
  raw?: string
}

/**
 * Analyzes a photo of the user with a prospect, focusing on emotive cues that imply
 * genuine connection (mutual smiles, eye contact, relaxed/open body language, mirroring)
 * versus signs of distance or performance. Quality over quantity.
 */
export async function analyzeCouplePhoto(
  buffer: Buffer,
  mimeType: string,
  prospectName: string,
  log?: { userId: string; route: string }
): Promise<CouplePhotoAnalysis> {
  const image = toDataUrl(mimeType, buffer)
  const startMs = Date.now()
  const modelId = resolveOpenAIModelId()

  const result = await generateText({
    model: defaultOpenaiModel(),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `This is a photo of the user together with a potential partner ("${prospectName}").
Read the EMOTIONAL connection between the two people from their expressions and body language — focus on quality of connection, not photo quality.
Look for genuine vs. performed smiles (eye crinkling/Duchenne), mutual eye contact or gaze toward each other, relaxed and open posture, physical closeness, mirroring, and warmth. Also note any signs of distance, tension, or one-sided engagement.
Do NOT identify or guess identities; describe only observable expression and posture.

Return ONLY valid JSON:
{
  "connection_score": number (0-100, how much genuine mutual connection the expressions imply),
  "emotional_read": "2-4 sentences interpreting the emotional dynamic",
  "expressions": ["short observable cues, e.g. 'genuine eye-crinkling smile on both', 'leaning toward each other'"],
  "caution": "one sentence on what a single photo can't tell you (or empty string)"
}`,
          },
          { type: 'image', image },
        ],
      },
    ],
  })

  if (log) {
    await logAfterVercelSdkCall({
      startMs,
      userId: log.userId,
      module: 'dating_manager',
      action: 'analyze_couple_photo',
      route: log.route,
      model: modelId,
      description: 'Analyzed a couple photo for emotional connection cues.',
      result,
    })
  }

  const parsed = extractJson(result.text)
  const score = Number(parsed.connection_score)
  return {
    connection_score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
    emotional_read: typeof parsed.emotional_read === 'string' ? parsed.emotional_read : '',
    expressions: Array.isArray(parsed.expressions)
      ? (parsed.expressions as unknown[]).map(String).slice(0, 12)
      : [],
    caution: typeof parsed.caution === 'string' ? parsed.caution : '',
    raw: result.text,
  }
}
