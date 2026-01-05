import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY?.trim()

    if (!apiKey) {
      console.error('OpenAI API key is not configured')
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { text, voice = 'alloy' } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 })
    }

    // Validate voice option (OpenAI TTS supports: alloy, echo, fable, onyx, nova, shimmer)
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    const selectedVoice = validVoices.includes(voice) ? voice : 'alloy'

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    console.log('Calling OpenAI TTS API:', {
      voice: selectedVoice,
      textLength: text.length,
      hasApiKey: !!apiKey,
    })

    // Call OpenAI TTS API
    // Using tts-1 model (faster, cheaper) - can use tts-1-hd for higher quality
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice as any,
      input: text,
    })

    // Convert the response to a buffer
    const buffer = Buffer.from(await response.arrayBuffer())

    // Return the audio as a response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"',
      },
    })
  } catch (error) {
    // Enhanced error logging
    const errorDetails: any = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      hasApiKey: !!process.env.OPENAI_API_KEY,
      apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    }

    // If it's an OpenAI API error, capture more details
    if (error instanceof Error && 'response' in error) {
      const openaiError = error as any
      errorDetails.openaiStatus = openaiError.response?.status
      errorDetails.openaiStatusText = openaiError.response?.statusText
      errorDetails.openaiError = openaiError.response?.data
    }

    console.error('Error in OpenAI TTS API:', errorDetails)

    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const statusCode = error instanceof Error && 'status' in error ? (error as any).status : 500

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
