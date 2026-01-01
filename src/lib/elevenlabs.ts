import { env } from './env'

/**
 * ElevenLabs Text-to-Speech Service
 * Provides high-quality voice synthesis using ElevenLabs API
 */
export class ElevenLabsService {
  private static readonly API_URL = 'https://api.elevenlabs.io/v1'
  private static voiceCache: Map<string, string> = new Map() // Cache voice name -> voice ID

  /**
   * Get voice ID by name (searches available voices)
   * @param voiceName - The name of the voice (e.g., "Henry")
   * @returns Voice ID string
   */
  static async getVoiceIdByName(voiceName: string): Promise<string | null> {
    // Check cache first
    if (this.voiceCache.has(voiceName)) {
      return this.voiceCache.get(voiceName) || null
    }

    try {
      const voices = await this.getVoices()
      const voice = voices.find((v) => v.name?.toLowerCase() === voiceName.toLowerCase())

      if (voice && voice.voice_id) {
        this.voiceCache.set(voiceName, voice.voice_id)
        return voice.voice_id
      }

      return null
    } catch (error) {
      console.error('Error looking up voice by name:', error)
      return null
    }
  }

  /**
   * Generate speech from text using ElevenLabs API
   * @param text - The text to convert to speech
   * @param voiceIdOrName - Voice ID (UUID) or voice name (e.g., "Henry"). Defaults to ELEVENLABS_VOICE_ID or "Henry"
   * @returns Audio blob URL
   */
  static async textToSpeech(text: string, voiceIdOrName?: string): Promise<string> {
    // Get API key directly from process.env to ensure we have the latest value
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || env.ELEVENLABS_API_KEY?.trim()

    if (!apiKey) {
      throw new Error('ElevenLabs API key is not configured')
    }

    let voiceId = voiceIdOrName || env.ELEVENLABS_VOICE_ID

    // If it's a name (not a UUID), look it up
    if (
      voiceId &&
      !voiceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    ) {
      const foundVoiceId = await this.getVoiceIdByName(voiceId)
      if (foundVoiceId) {
        voiceId = foundVoiceId
      } else {
        // Fallback to "Henry" if lookup fails
        const henryVoiceId = await this.getVoiceIdByName('Henry')
        voiceId = henryVoiceId || voiceId
      }
    }

    // Default to "Henry" if no voice specified
    if (!voiceId) {
      const henryVoiceId = await this.getVoiceIdByName('Henry')
      voiceId = henryVoiceId || ''
    }

    if (!voiceId) {
      throw new Error(
        'Voice ID not found. Please configure ELEVENLABS_VOICE_ID or ensure "Henry" voice exists.'
      )
    }

    try {
      const response = await fetch(`${this.API_URL}/text-to-speech/${voiceId}`, {
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
        console.error('ElevenLabs API error:', errorText)
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      return audioUrl
    } catch (error) {
      console.error('Error generating speech with ElevenLabs:', error)
      throw error
    }
  }

  /**
   * Get available voices from ElevenLabs
   * @returns Array of available voices
   */
  static async getVoices(): Promise<any[]> {
    // Get API key directly from process.env to ensure we have the latest value
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || env.ELEVENLABS_API_KEY?.trim()

    if (!apiKey) {
      throw new Error('ElevenLabs API key is not configured')
    }

    try {
      const response = await fetch(`${this.API_URL}/voices`, {
        headers: {
          'xi-api-key': apiKey,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`)
      }

      const data = await response.json()
      return data.voices || []
    } catch (error) {
      console.error('Error fetching voices from ElevenLabs:', error)
      throw error
    }
  }
}
