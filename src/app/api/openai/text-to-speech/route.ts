import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    // Get API key from environment (use env object for consistency)
    const apiKey = env.OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()

    if (!apiKey) {
      console.error('OpenAI API key is not configured')
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { text, voice = 'alloy', prompt } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 })
    }

    // Validate voice option (OpenAI TTS supports: alloy, echo, fable, onyx, nova, shimmer)
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    const selectedVoice = validVoices.includes(voice) ? voice : 'alloy'

    // Optional prompt for advanced speech control (accent, emotional range, intonation, impressions, speed, tone, whispering)
    // Example: "Speak with a warm, enthusiastic tone at a moderate pace"
    const speechPrompt = prompt && typeof prompt === 'string' ? prompt : undefined

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    console.log('Calling OpenAI TTS API:', {
      voice: selectedVoice,
      textLength: text.length,
      hasApiKey: !!apiKey,
      hasPrompt: !!speechPrompt,
    })

    // Call OpenAI TTS API
    // Using gpt-4o-mini-tts model - newest and most reliable text-to-speech model
    // Supports advanced features: accent, emotional range, intonation, impressions, speed, tone, whispering
    const speechOptions: any = {
      model: 'gpt-4o-mini-tts',
      voice: selectedVoice as any,
      input: text,
    }

    // Add prompt for advanced speech control if provided
    if (speechPrompt) {
      speechOptions.prompt = speechPrompt
    }

    const mp3 = await openai.audio.speech.create(speechOptions)

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer())

    // Return the audio as a response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"',
      },
    })
  } catch (error: any) {
    // Enhanced error logging
    const apiKey = env.OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
    const errorDetails: any = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
    }

    // Handle OpenAI API errors specifically
    if (error?.status) {
      errorDetails.openaiStatus = error.status
      errorDetails.openaiStatusText = error.statusText
      errorDetails.openaiError = error.error
      errorDetails.openaiMessage = error.message
    }

    // Handle OpenAI SDK errors
    if (error?.response) {
      errorDetails.openaiResponse = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      }
    }

    console.error('Error in OpenAI TTS API:', errorDetails)

    // Return more specific error information
    const errorMessage =
      error?.message ||
      error?.error?.message ||
      (error instanceof Error ? error.message : 'Unknown error')
    const statusCode = error?.status || error?.response?.status || 500

    return NextResponse.json(
      {
        error: 'Failed to generate speech',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { debug: errorDetails }),
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    )
  }
}
