import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { logAIUsage } from '@/lib/ai/usage-logger'
import { resolveOpenAIRealtimeModelId } from '@/lib/ai/openai-model-id'
import { synthesizeSpeechWithRealtime } from '@/lib/voice/realtime-tts'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const started = Date.now()
  const apiKey = env.OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    console.error('OpenAI API key is not configured')
    return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 })
  }

  let userId: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    /* speech can still run with the server API key */
  }

  try {
    const body = await request.json()
    const { text, voice = 'marin' } = body as { text?: unknown; voice?: string }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 })
    }

    const wav = await synthesizeSpeechWithRealtime({
      text,
      voice: typeof voice === 'string' ? voice : 'marin',
      userId: userId ?? undefined,
    })

    await logAIUsage({
      userId,
      module: 'chat',
      action: 'realtime_tts',
      route: '/api/openai/text-to-speech',
      model: resolveOpenAIRealtimeModelId(),
      provider: 'openai',
      latencyMs: Date.now() - started,
      description: 'Realtime text-to-speech',
    })

    return new NextResponse(new Uint8Array(wav), {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'inline; filename="speech.wav"',
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in OpenAI Realtime TTS:', errorMessage)

    await logAIUsage({
      userId,
      module: 'chat',
      action: 'realtime_tts',
      route: '/api/openai/text-to-speech',
      model: resolveOpenAIRealtimeModelId(),
      provider: 'openai',
      status: 'error',
      latencyMs: Date.now() - started,
      error: errorMessage,
    })

    return NextResponse.json(
      {
        error: 'Failed to generate speech',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
