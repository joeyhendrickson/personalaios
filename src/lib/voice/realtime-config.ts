import 'server-only'

import { createHash } from 'crypto'
import { ADVISOR_CROSS_MODULE_GUIDELINES } from '@/lib/ai-context/advisory-guidelines'
import { resolveOpenAIRealtimeModelId } from '@/lib/ai/openai-model-id'

const MAX_INSTRUCTIONS_CHARS = 24_000

export const REALTIME_CHAT_VOICE = 'marin' as const

const REALTIME_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
])

export function resolveRealtimeVoice(voice?: string): string {
  if (voice && REALTIME_VOICES.has(voice)) return voice
  return REALTIME_CHAT_VOICE
}

export function openaiSafetyIdentifier(userId: string): string {
  return createHash('sha256').update(userId, 'utf8').digest('hex')
}

export function buildRealtimeAdvisorInstructions(input: {
  systemContext: string
  language: string
  currentModule?: string
}): string {
  const context = input.systemContext.trim() || 'USER CONTEXT: Unavailable this turn.'
  const spoken = `You are the LifeStacks Advisor in a live spoken conversation.
Speak naturally and briefly (two to four sentences unless the user asks for more).
Do not use markdown, asterisks, hash headings, or bullet symbols — this is spoken out loud.
You cannot create, edit, delete, or complete dashboard items. Tell the user to confirm cards in the chat UI.
Never invent dashboard facts. Ground advice in the user context below.
If the user interrupts you, stop immediately and listen.
${input.language === 'es' ? 'Respond in Spanish for all spoken replies.' : 'Respond in English for all spoken replies.'}
${input.currentModule ? `The user is currently in the ${input.currentModule} module.` : ''}

${ADVISOR_CROSS_MODULE_GUIDELINES}

USER CONTEXT:
${context}`

  if (spoken.length <= MAX_INSTRUCTIONS_CHARS) return spoken
  const overhead = spoken.length - context.length
  const budget = Math.max(2_000, MAX_INSTRUCTIONS_CHARS - overhead)
  return spoken.replace(context, `${context.slice(0, budget)}\n[context truncated]`)
}

export function buildRealtimeSpeechInstructions(): string {
  return 'Read the user message aloud exactly as written. Do not add commentary, greeting, or extra words.'
}

export function buildRealtimeSessionConfig(input: {
  instructions: string
  voice?: string
}): Record<string, unknown> {
  return {
    type: 'realtime',
    model: resolveOpenAIRealtimeModelId(),
    output_modalities: ['audio'],
    instructions: input.instructions,
    audio: {
      input: {
        transcription: { model: 'gpt-4o-transcribe' },
        turn_detection: { type: 'semantic_vad' },
      },
      output: {
        voice: resolveRealtimeVoice(input.voice),
      },
    },
  }
}
