import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsService } from '@/lib/elevenlabs'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    // Get API key directly from process.env to ensure we have the latest value
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || env.ELEVENLABS_API_KEY?.trim()

    if (!apiKey) {
      console.error('ElevenLabs API key is not configured', {
        hasEnvKey: !!env.ELEVENLABS_API_KEY,
        hasProcessEnvKey: !!process.env.ELEVENLABS_API_KEY,
      })
      return NextResponse.json({ error: 'ElevenLabs API key is not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { text, voiceIdOrName } = body
    // Use ELEVENLABS_VOICE_ID from env var (defaults to "Henry")

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 })
    }

    // Generate speech using ElevenLabs directly
    // We need to call the API directly here since blob URLs don't work server-side
    let voiceId = voiceIdOrName || env.ELEVENLABS_VOICE_ID

    // ElevenLabs voice IDs are alphanumeric strings (typically 17-22 characters)
    // They are NOT UUIDs. Names contain spaces, special characters, etc.
    const isElevenLabsId = (id: string) => /^[A-Za-z0-9]{15,25}$/.test(id)
    const looksLikeName = (str: string) => /\s/.test(str) || str.includes('-') || str.length > 50

    // If it looks like a name (contains spaces, hyphens, or is very long), look it up
    if (voiceId && looksLikeName(voiceId)) {
      console.log('Looking up voice ID for name:', voiceId)
      const foundVoiceId = await ElevenLabsService.getVoiceIdByName(voiceId)
      if (foundVoiceId && isElevenLabsId(foundVoiceId)) {
        console.log('Found voice ID:', foundVoiceId)
        voiceId = foundVoiceId
      } else {
        console.warn('Voice lookup failed for:', voiceId, 'falling back to Henry')
        // Fallback to "Henry" if lookup fails
        const henryVoiceId = await ElevenLabsService.getVoiceIdByName(
          'Henry - Deep, Professional, and Soothing'
        )
        if (henryVoiceId && isElevenLabsId(henryVoiceId)) {
          voiceId = henryVoiceId
        } else {
          // Try just "Henry" as fallback
          const henryShortId = await ElevenLabsService.getVoiceIdByName('Henry')
          if (henryShortId && isElevenLabsId(henryShortId)) {
            voiceId = henryShortId
          } else {
            console.error('Henry voice lookup also failed, cannot proceed')
            return NextResponse.json(
              {
                error: 'Voice ID lookup failed.',
                details: `Could not find voice ID for "${voiceId}" or fallback "Henry"`,
              },
              { status: 400 }
            )
          }
        }
      }
    }

    // Default to "Henry" if no voice specified or if voiceId doesn't look like a valid ID
    if (!voiceId || (!isElevenLabsId(voiceId) && !looksLikeName(voiceId))) {
      console.log('No valid voice ID, looking up Henry')
      const henryVoiceId = await ElevenLabsService.getVoiceIdByName(
        'Henry - Deep, Professional, and Soothing'
      )
      if (henryVoiceId && isElevenLabsId(henryVoiceId)) {
        voiceId = henryVoiceId
      } else {
        // Try just "Henry" as fallback
        const henryShortId = await ElevenLabsService.getVoiceIdByName('Henry')
        if (henryShortId && isElevenLabsId(henryShortId)) {
          voiceId = henryShortId
        } else {
          console.error('Henry voice lookup failed')
          return NextResponse.json(
            {
              error:
                'Voice ID not found. Please configure ELEVENLABS_VOICE_ID or ensure "Henry" voice exists.',
            },
            { status: 400 }
          )
        }
      }
    }

    // Final validation - ensure we have a valid ElevenLabs ID format
    if (!voiceId || !isElevenLabsId(voiceId)) {
      console.error('Invalid voice ID format:', voiceId)
      return NextResponse.json(
        {
          error:
            'Invalid voice ID format. Voice ID must be an alphanumeric string (15-25 characters).',
          details: `Received: "${voiceId}"`,
        },
        { status: 400 }
      )
    }

    // Call ElevenLabs API directly
    // Use the API key we retrieved above
    // Log diagnostic info (without exposing the full key)
    console.log('Calling ElevenLabs API:', {
      voiceId,
      textLength: text.length,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
    })

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
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

      // Enhanced logging for production debugging
      const diagnosticInfo = {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails,
        voiceId: voiceId,
        voiceIdIsUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          voiceId || ''
        ),
        originalVoiceIdOrName: voiceIdOrName,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
        apiKeyEndsWith:
          apiKey && apiKey.length > 10 ? `...${apiKey.substring(apiKey.length - 4)}` : 'none',
        apiKeyLooksValid: apiKey ? /^[a-zA-Z0-9]{20,}/.test(apiKey) : false,
        // Check environment variable sources
        hasProcessEnv: !!process.env.ELEVENLABS_API_KEY,
        hasEnvObject: !!env.ELEVENLABS_API_KEY,
        processEnvLength: process.env.ELEVENLABS_API_KEY?.length || 0,
        envObjectLength: env.ELEVENLABS_API_KEY?.length || 0,
        nodeEnv: process.env.NODE_ENV,
        // Test the API key directly to see if it works
        apiKeyTest: 'See /api/elevenlabs/debug for API key test',
      }

      console.error('ElevenLabs text-to-speech API error (detailed):', diagnosticInfo)

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
