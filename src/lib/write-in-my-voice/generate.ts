import OpenAI from 'openai'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterOpenAIRestCall } from '@/lib/ai/usage-logger'
import { MATERIAL_LABELS, WRITE_IN_MY_VOICE_MODULE_ID } from './constants'
import type { GenerateVoiceContentInput, GeneratedVoiceContent } from './types'

const MATERIAL_INSTRUCTIONS: Record<string, string> = {
  blog_post:
    'Write a blog post with a compelling opening, clear sections, and a natural conclusion. Use headings if appropriate.',
  social_media_post:
    'Write a social media post — concise, scroll-stopping, and authentic to the platform norms while keeping the user voice.',
  email:
    'Write an email with an appropriate subject line, greeting, body, and sign-off in the user natural email style.',
  book: 'Write a book excerpt or chapter section with narrative flow, scene-setting, and the user distinctive prose rhythm.',
}

export async function generateVoiceContent(
  input: GenerateVoiceContentInput
): Promise<GeneratedVoiceContent> {
  const openai = new OpenAI({ apiKey: input.openaiKey })
  const materialLabel = MATERIAL_LABELS[input.materialType]
  const materialGuide =
    MATERIAL_INSTRUCTIONS[input.materialType] ?? 'Write in the requested format.'

  const voiceExcerptBlock =
    input.crossContext.voiceCorpusExcerpts.length > 0
      ? `\nEXCERPTS FROM USER'S OWN WRITING (match this voice closely):\n${input.crossContext.voiceCorpusExcerpts.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
      : ''

  const crossBlock = input.crossContext.crossModuleContext
    ? `\nRELEVANT LIFE CONTEXT (weave in only when it genuinely improves the piece — do not force it):\n${input.crossContext.crossModuleContext}`
    : ''

  const p = input.voiceProfile
  const prompt = `You are ghostwriting as this specific person. Match their voice exactly — not generic AI prose.

VOICE PROFILE:
- Tone: ${p.tone}
- Writing style: ${p.writing_style}
- Common themes: ${p.common_themes.join(', ') || 'general'}
- Signature phrases to echo naturally: ${p.signature_phrases.join(', ') || 'none identified'}
- Language: ${p.language_patterns.sentence_length} sentences, ${p.language_patterns.vocabulary_level} vocabulary, ${p.language_patterns.punctuation_style} punctuation, ${p.language_patterns.formality} formality
- Engagement style: ${p.engagement_style}
- Personal voice: ${p.personal_voice}
- DO preserve: ${p.do_list.join('; ') || 'authenticity'}
- AVOID: ${p.avoid_list.join('; ') || 'corporate or generic AI tone'}
${voiceExcerptBlock}
${crossBlock}

TASK: Write a ${materialLabel}.
${materialGuide}

USER PROMPT / TOPIC:
${input.prompt}

Return JSON: { "title": "optional title or subject line", "content": "the full written piece", "voice_match_score": 0.0-1.0 }`

  const model = resolveOpenAIModelId()
  const startMs = Date.now()

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You write in the user exact personal voice. Output only valid JSON. Never sound like a generic AI assistant.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.75,
      max_tokens: input.materialType === 'book' ? 2500 : 1200,
      response_format: { type: 'json_object' },
    })

    await logAfterOpenAIRestCall({
      startMs,
      userId: input.userId,
      module: WRITE_IN_MY_VOICE_MODULE_ID,
      action: 'generate_content',
      route: input.route,
      model,
      description: `Generated ${materialLabel} in user personal voice.`,
      response,
    })

    const raw = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw) as Record<string, unknown>

    return {
      title: typeof parsed.title === 'string' ? parsed.title : undefined,
      content: typeof parsed.content === 'string' ? parsed.content : '',
      voice_match_score:
        typeof parsed.voice_match_score === 'number'
          ? Math.min(1, Math.max(0, parsed.voice_match_score))
          : 0.85,
    }
  } catch (error) {
    await logAfterOpenAIRestCall({
      startMs,
      userId: input.userId,
      module: WRITE_IN_MY_VOICE_MODULE_ID,
      action: 'generate_content',
      route: input.route,
      model,
      description: `Generated ${materialLabel} in user personal voice.`,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}
