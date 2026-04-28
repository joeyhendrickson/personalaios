import 'server-only'

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

function toDataUrl(mimeType: string, buffer: Buffer): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export async function describeRelationshipPhoto(
  buffer: Buffer,
  mimeType: string,
  relationshipName: string
): Promise<{ description: string; tags: string[] }> {
  const image = toDataUrl(mimeType, buffer)
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are helping build CRM context about someone named "${relationshipName}".
Describe this photo in 2–4 sentences: setting, activity, mood, who might be present, anything that could help remember shared history.
Then list 5–12 short lowercase tags (comma-separated) for activities, places, or themes. No names of real people unless clearly written in the image.

Reply in exactly this format:
DESCRIPTION: <text>
TAGS: tag1, tag2, tag3`,
          },
          { type: 'image', image },
        ],
      },
    ],
  })

  const descMatch = text.match(/DESCRIPTION:\s*([\s\S]*?)(?=TAGS:|$)/i)
  const tagsMatch = text.match(/TAGS:\s*([\s\S]*?)$/i)
  const description = descMatch?.[1]?.trim() || text.trim()
  const tagStr = tagsMatch?.[1]?.trim() || ''
  const tags = tagStr
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20)

  return { description, tags }
}

export async function summarizeMessageScreenshot(
  buffer: Buffer,
  mimeType: string,
  relationshipName: string
): Promise<string> {
  const image = toDataUrl(mimeType, buffer)
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `This is a screenshot of a text conversation involving "${relationshipName}" (may be a group or 1:1 thread).
1) Transcribe any visible timestamps and order messages roughly chronologically.
2) Summarize topics, tone, open threads, and what seems most current vs historical.
3) Note anything time-sensitive or commitments mentioned.

Keep under 400 words. If unreadable, say so briefly.`,
          },
          { type: 'image', image },
        ],
      },
    ],
  })
  return text.trim()
}
