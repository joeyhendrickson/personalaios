import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsService } from '@/lib/elevenlabs'
import { env } from '@/lib/env'

export async function GET(request: NextRequest) {
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

    // Fetch all available voices from ElevenLabs
    const voices = await ElevenLabsService.getVoices()

    // Filter to only show voices from "My Voices" (custom/cloned voices)
    // ElevenLabs returns both premade and custom voices
    // Custom voices are those that are in the user's voice library
    // We check for custom/cloned category, or if it's in the user's library
    const customVoices = voices.filter((voice) => {
      // Include all custom/cloned voices (these are in "My Voices")
      // Also include premade and professional voices that the user has access to
      // The API returns all voices the user has access to, including their custom ones
      return (
        voice.category === 'custom' ||
        voice.category === 'cloned' ||
        voice.category === 'premade' ||
        voice.category === 'professional' ||
        // Include any voice that's not a system default
        !voice.category
      )
    })

    // Return all voices the user has access to (includes "My Voices")
    // This will automatically include any new voices added to "My Voices"
    const voicesToReturn = customVoices.length > 0 ? customVoices : voices

    // Format response with voice name and ID
    const formattedVoices = voicesToReturn.map((voice) => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description || '',
    }))

    return NextResponse.json({
      voices: formattedVoices,
      total: formattedVoices.length,
    })
  } catch (error) {
    console.error('Error fetching voices from ElevenLabs:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch voices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
