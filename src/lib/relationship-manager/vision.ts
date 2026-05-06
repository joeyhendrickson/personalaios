import 'server-only'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterVercelSdkCall } from '@/lib/ai/usage-logger'
import { openai } from '@/lib/openai'

import { generateText } from 'ai'

function toDataUrl(mimeType: string, buffer: Buffer): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export async function describeRelationshipPhoto(
  buffer: Buffer,
  mimeType: string,
  relationshipName: string,
  log?: { userId: string; route: string }
): Promise<{ description: string; tags: string[] }> {
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

  if (log) {
    await logAfterVercelSdkCall({
      startMs,
      userId: log.userId,
      module: 'relationship_manager',
      action: 'describe_relationship_photo',
      route: log.route,
      model: modelId,
      description: 'Analyzed a relationship photo to build neutral CRM-style notes.',
      result,
    })
  }

  const text = result.text
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
  relationshipName: string,
  log?: { userId: string; route: string }
): Promise<string> {
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

  if (log) {
    await logAfterVercelSdkCall({
      startMs,
      userId: log.userId,
      module: 'relationship_manager',
      action: 'summarize_message_screenshot',
      route: log.route,
      model: modelId,
      description: 'Summarized a message screenshot for relationship context.',
      result,
    })
  }

  return result.text.trim()
}

export async function summarizeMessagePdf(
  pdfBuffer: Buffer,
  relationshipName: string,
  log?: { userId: string; route: string }
): Promise<string> {
  const startMs = Date.now()
  const modelId = resolveOpenAIModelId()
  const fileDataUrl = toDataUrl('application/pdf', pdfBuffer)

  const response = await openai.responses.create({
    model: modelId,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `This is a PDF export of a text conversation involving "${relationshipName}" (may be a group or 1:1 thread). It may contain many pages of messages, including screenshots.
1) Extract and transcribe any visible timestamps and order messages roughly chronologically.
2) Summarize topics, tone, open threads, and what seems most current vs historical.
3) Note anything time-sensitive or commitments mentioned.

Keep under 500 words. If the PDF is unreadable, say so briefly.`,
          },
          {
            type: 'input_file',
            filename: 'messages.pdf',
            file_data: fileDataUrl,
          },
        ],
      },
    ],
  })

  if (log) {
    // We don't currently have a shared logger for Responses API payloads.
    // Still emit a console line to correlate costs/time if needed.
    console.log('summarizeMessagePdf complete', {
      userId: log.userId,
      route: log.route,
      model: modelId,
      elapsedMs: Date.now() - startMs,
    })
  }

  const text =
    response.output_text?.trim() ||
    // fallback for older SDK shapes
    ((response as unknown as { output?: { content?: { text?: string }[] }[] })?.output
      ?.flatMap((o) => o.content ?? [])
      ?.map((c) => c.text)
      .filter(Boolean)
      .join('\n')
      .trim() ??
      '')

  return text || 'Unable to extract content from PDF.'
}
