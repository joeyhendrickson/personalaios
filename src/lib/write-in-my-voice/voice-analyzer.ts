import OpenAI from 'openai'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterOpenAIRestCall } from '@/lib/ai/usage-logger'
import { WRITE_IN_MY_VOICE_MODULE_ID } from './constants'
import type { VoiceAnalysisResult, VoiceProfile } from './types'

const DEFAULT_PROFILE: VoiceProfile = {
  tone: 'conversational',
  writing_style: 'direct and authentic',
  common_themes: [],
  signature_phrases: [],
  language_patterns: {
    sentence_length: 'varied',
    vocabulary_level: 'accessible',
    punctuation_style: 'standard',
    formality: 'semi-formal',
  },
  engagement_style: 'personal and approachable',
  content_preferences: [],
  personal_voice: 'authentic and relatable',
  do_list: [],
  avoid_list: [],
}

export class WriteInMyVoiceAnalyzer {
  private openai: OpenAI

  constructor(
    apiKey: string,
    private usageCtx?: { userId: string; route: string }
  ) {
    this.openai = new OpenAI({ apiKey })
  }

  async analyzeVoice(samples: { source_type: string; content_text: string }[]): Promise<VoiceAnalysisResult> {
    const combined = samples
      .map((s, i) => `[Sample ${i + 1} — ${s.source_type}]\n${s.content_text.slice(0, 4000)}`)
      .join('\n\n---\n\n')

    const model = resolveOpenAIModelId()
    const startMs = Date.now()

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert writing-style analyst. Extract a precise voice profile from the user writing samples. Return ONLY valid JSON matching the requested schema.',
          },
          {
            role: 'user',
            content: `Analyze these writing samples and return a JSON object with this exact structure:
{
  "tone": "string",
  "writing_style": "string",
  "common_themes": ["string"],
  "signature_phrases": ["string"],
  "language_patterns": {
    "sentence_length": "string",
    "vocabulary_level": "string",
    "punctuation_style": "string",
    "formality": "string"
  },
  "engagement_style": "string",
  "content_preferences": ["string"],
  "personal_voice": "string",
  "do_list": ["patterns to preserve when writing in this voice"],
  "avoid_list": ["patterns that would break this voice"],
  "sample_analysis": ["3-5 bullet insights about the voice"],
  "confidence_score": 0.0 to 1.0
}

WRITING SAMPLES:
${combined}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      })

      if (this.usageCtx) {
        await logAfterOpenAIRestCall({
          startMs,
          userId: this.usageCtx.userId,
          module: WRITE_IN_MY_VOICE_MODULE_ID,
          action: 'analyze_voice_profile',
          route: this.usageCtx.route,
          model,
          description: 'Analyzed uploaded writing samples to build personal voice profile.',
          response,
        })
      }

      const raw = response.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(raw) as Record<string, unknown>

      const voiceProfile: VoiceProfile = {
        tone: str(parsed.tone) || DEFAULT_PROFILE.tone,
        writing_style: str(parsed.writing_style) || DEFAULT_PROFILE.writing_style,
        common_themes: strArray(parsed.common_themes),
        signature_phrases: strArray(parsed.signature_phrases),
        language_patterns: {
          sentence_length:
            str((parsed.language_patterns as Record<string, unknown>)?.sentence_length) ||
            DEFAULT_PROFILE.language_patterns.sentence_length,
          vocabulary_level:
            str((parsed.language_patterns as Record<string, unknown>)?.vocabulary_level) ||
            DEFAULT_PROFILE.language_patterns.vocabulary_level,
          punctuation_style:
            str((parsed.language_patterns as Record<string, unknown>)?.punctuation_style) ||
            DEFAULT_PROFILE.language_patterns.punctuation_style,
          formality:
            str((parsed.language_patterns as Record<string, unknown>)?.formality) ||
            DEFAULT_PROFILE.language_patterns.formality,
        },
        engagement_style: str(parsed.engagement_style) || DEFAULT_PROFILE.engagement_style,
        content_preferences: strArray(parsed.content_preferences),
        personal_voice: str(parsed.personal_voice) || DEFAULT_PROFILE.personal_voice,
        do_list: strArray(parsed.do_list),
        avoid_list: strArray(parsed.avoid_list),
      }

      const confidence =
        typeof parsed.confidence_score === 'number'
          ? Math.min(1, Math.max(0, parsed.confidence_score))
          : 0.75

      return {
        voice_profile: voiceProfile,
        confidence_score: confidence,
        sample_analysis: strArray(parsed.sample_analysis),
      }
    } catch (error) {
      if (this.usageCtx) {
        await logAfterOpenAIRestCall({
          startMs,
          userId: this.usageCtx.userId,
          module: WRITE_IN_MY_VOICE_MODULE_ID,
          action: 'analyze_voice_profile',
          route: this.usageCtx.route,
          model,
          description: 'Analyzed uploaded writing samples to build personal voice profile.',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
      throw error
    }
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}
