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

    // Generate speech using ElevenLabs directly
    // We need to call the API directly here since blob URLs don't work server-side
    let voiceId = voiceIdOrName || env.ELEVENLABS_VOICE_ID

    // If it's a name (not a UUID), look it up
    if (
      voiceId &&
      !voiceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    ) {
      const foundVoiceId = await ElevenLabsService.getVoiceIdByName(voiceId)
      if (foundVoiceId) {
        voiceId = foundVoiceId
      } else {
        // Fallback to "Henry" if lookup fails
        const henryVoiceId = await ElevenLabsService.getVoiceIdByName('Henry')
        voiceId = henryVoiceId || voiceId
      }
    }

    // Default to "Henry" if no voice specified
    if (!voiceId) {
      const henryVoiceId = await ElevenLabsService.getVoiceIdByName('Henry')
      voiceId = henryVoiceId || ''
    }

    if (!voiceId) {
      return NextResponse.json(
        {
          error:
            'Voice ID not found. Please configure ELEVENLABS_VOICE_ID or ensure "Henry" voice exists.',
        },
        { status: 400 }
      )
    }

    // Call ElevenLabs API directly
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorDetails: any = { status: response.status, statusText: response.statusText }

      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = { ...errorDetails, ...errorJson }
      } catch {
        errorDetails.message = errorText
      }

      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails,
        voiceId: voiceId,
        hasApiKey: !!env.ELEVENLABS_API_KEY,
      })

      return NextResponse.json(
        {
          error: 'Failed to generate speech',
          details:
            errorDetails.message ||
            `ElevenLabs API error: ${response.status} ${response.statusText}`,
          status: response.status,
        },
        { status: response.status }
      )
    }

    const audioBlob = await response.blob()

    // Return the audio as a response
    return new NextResponse(audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"',
      },
    })
  } catch (error) {
    console.error('Error in text-to-speech API:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      hasApiKey: !!env.ELEVENLABS_API_KEY,
    })
    return NextResponse.json(
      {
        error: 'Failed to generate speech',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
