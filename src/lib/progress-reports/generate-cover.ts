import 'server-only'

import OpenAI from 'openai'
import { logAIUsage } from '@/lib/ai/usage-logger'

export async function generateCoverImageBase64(
  userId: string,
  coverArtPrompt: string,
  periodLabel: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[progress-reports] OPENAI_API_KEY missing; skipping cover image')
    return null
  }

  const client = new OpenAI({ apiKey })
  const started = Date.now()

  try {
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt: `${coverArtPrompt}. Theme: "${periodLabel}" progress report cover. No words or letters in the image.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
    })

    await logAIUsage({
      userId,
      module: 'progress-reports',
      action: 'generate_cover_dalle3',
      route: '/api/progress-reports/generate',
      model: 'dall-e-3',
      provider: 'openai',
      latencyMs: Date.now() - started,
      description: 'DALL-E 3 progress report cover',
      metadata: { periodLabel },
      actualCostUsd: 0.04,
    })

    const b64 = response.data?.[0]?.b64_json
    return b64 || null
  } catch (error) {
    console.error('[progress-reports] DALL-E cover failed:', error)
    await logAIUsage({
      userId,
      module: 'progress-reports',
      action: 'generate_cover_dalle3',
      route: '/api/progress-reports/generate',
      model: 'dall-e-3',
      provider: 'openai',
      status: 'error',
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}
