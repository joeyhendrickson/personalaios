import 'server-only'

import OpenAI from 'openai'
import { logAIUsage } from '@/lib/ai/usage-logger'
import { resolveOpenAIImageModelId } from '@/lib/ai/openai-model-id'

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
  const model = resolveOpenAIImageModelId()

  try {
    const response = await client.images.generate({
      model,
      prompt: `${coverArtPrompt}. Theme: "${periodLabel}" progress report cover. No words or letters in the image.`,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
    })

    const usage = (response as { usage?: { input_tokens?: number; output_tokens?: number } }).usage

    await logAIUsage({
      userId,
      module: 'progress-reports',
      action: 'generate_cover_gpt_image',
      route: '/api/progress-reports/generate',
      model,
      provider: 'openai',
      inputTokens: usage?.input_tokens ?? null,
      outputTokens: usage?.output_tokens ?? null,
      latencyMs: Date.now() - started,
      description: 'GPT Image progress report cover',
      metadata: { periodLabel },
    })

    const b64 = response.data?.[0]?.b64_json
    return b64 || null
  } catch (error) {
    console.error('[progress-reports] Cover image failed:', error)
    await logAIUsage({
      userId,
      module: 'progress-reports',
      action: 'generate_cover_gpt_image',
      route: '/api/progress-reports/generate',
      model,
      provider: 'openai',
      status: 'error',
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}
