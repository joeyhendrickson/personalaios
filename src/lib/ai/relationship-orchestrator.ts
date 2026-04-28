import 'server-only'

import OpenAI from 'openai'
import { z } from 'zod'

const draftSchema = z.object({
  body: z.string().min(1),
  subject: z.string().optional(),
  tone_notes: z.string().optional(),
})

const summarySchema = z.object({
  summary: z.string().min(1),
  follow_up_ideas: z.array(z.string()).max(8),
})

export interface RelationshipContextPayload {
  personName: string
  relationshipType?: string
  recentNotes?: string[]
  recentInteractions?: string[]
  sharedMemories?: string[]
  photoCaptions?: string[]
  userIntent?: string
}

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

export async function generateOutreachDraft(
  channel: 'sms' | 'email',
  ctx: RelationshipContextPayload
): Promise<z.infer<typeof draftSchema>> {
  const client = getClient()
  if (!client) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const system =
    channel === 'sms'
      ? 'You write concise, warm SMS under 300 characters. No emojis unless user asks. Never invent private facts.'
      : 'You write thoughtful personal emails. Never invent private facts; stay grounded in provided context only.'

  const user = JSON.stringify({
    channel,
    ...ctx,
    rules: [
      'Only use facts from context.',
      'If context is thin, suggest a generic check-in.',
      'No medical, legal, or financial advice.',
    ],
  })

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini'
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${system} Respond with JSON only: {"body":"...","subject":"optional","tone_notes":"optional"}`,
      },
      { role: 'user', content: user },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('Empty OpenAI response')
  return draftSchema.parse(JSON.parse(raw))
}

export async function refreshRelationshipSummary(
  ctx: RelationshipContextPayload
): Promise<z.infer<typeof summarySchema>> {
  const client = getClient()
  if (!client) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini'
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Summarize relationship context for the user. Be neutral and privacy-preserving. Bullet ideas must be actionable and consensual. Respond with JSON only: {"summary":"...","follow_up_ideas":["..."]}',
      },
      { role: 'user', content: JSON.stringify(ctx) },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('Empty OpenAI response')
  return summarySchema.parse(JSON.parse(raw))
}
