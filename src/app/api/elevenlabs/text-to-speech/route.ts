import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsService } from '@/lib/elevenlabs'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    if (!env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs API key is not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { text, voiceIdOrName } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 })
    }

    // Generate speech using ElevenLabs
    // voiceIdOrName can be a voice ID (UUID) or voice name (e.g., "Henry")
    const audioUrl = await ElevenLabsService.textToSpeech(text, voiceIdOrName)

    // Fetch the audio blob and return it
    const audioResponse = await fetch(audioUrl)
    const audioBlob = await audioResponse.blob()

    // Return the audio as a response
    return new NextResponse(audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"',
      },
    })
  } catch (error) {
    console.error('Error in text-to-speech API:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate speech',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
