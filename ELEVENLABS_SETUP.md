# ElevenLabs Voice Integration Setup

## Overview

ElevenLabs API has been integrated into all chat interfaces across Lifestacks for high-quality voice synthesis. The "Henry" voice is used by default for all AI responses.

## Environment Variables

Add the following to your `.env.local` file and Vercel environment variables:

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=6d5b219c3f0ada0beab36fa23ab5f628772a8ce9f8fdbb9017e6b66e4eec3402
ELEVENLABS_VOICE_ID=Henry  # Optional: Can be voice name or UUID. Defaults to "Henry" if not set.
```

**Note:** The voice ID can be either:

- A voice name (e.g., "Henry") - the system will look it up automatically
- A voice UUID (e.g., "21m00Tcm4TlvDq8ikWAM") - use this if you know the exact voice ID

## Integrated Chat Interfaces

The following chat interfaces now use ElevenLabs for voice output:

1. **Dream Catcher Module** (`/modules/dream-catcher`)
   - Voice toggle button (Volume2/VolumeX icon)
   - Automatically speaks AI responses when enabled
   - Uses "Henry" voice

2. **AI Coach Module** (`/modules/ai-coach`)
   - Voice toggle button (Volume2/VolumeX icon)
   - Automatically speaks AI responses when enabled
   - Uses "Henry" voice

3. **Main Chat Interface** (`/components/chat/chat-interface.tsx`)
   - Integrated with existing voice controls
   - Falls back to browser TTS if ElevenLabs fails
   - Uses "Henry" voice

## Voice Input (Speech Recognition)

All chat interfaces support voice input using the browser's Speech Recognition API:

- Click the microphone button to start listening
- Speak your message
- Your speech is automatically transcribed into the text field
- Click send or speak again

## How It Works

1. **Voice Output (Text-to-Speech):**
   - When voice is enabled, AI responses are sent to `/api/elevenlabs/text-to-speech`
   - The API calls ElevenLabs to generate speech using the "Henry" voice
   - Audio is streamed back and played automatically
   - Falls back to browser TTS if ElevenLabs is unavailable

2. **Voice Input (Speech-to-Text):**
   - Uses browser's native Speech Recognition API
   - No external service required
   - Works in Chrome, Edge, and Safari

## API Route

The ElevenLabs text-to-speech API route is located at:

- `/api/elevenlabs/text-to-speech`

**Request:**

```json
{
  "text": "Text to convert to speech",
  "voiceIdOrName": "Henry" // Optional, defaults to "Henry"
}
```

**Response:**

- Audio blob (MP3 format)
- Content-Type: `audio/mpeg`

## Troubleshooting

### Voice Not Working

1. **Check API Key:**
   - Ensure `ELEVENLABS_API_KEY` is set in `.env.local` and Vercel
   - Verify the API key is correct (starts with the provided value)

2. **Check Voice ID:**
   - If "Henry" voice is not found, the system will try to look it up
   - You can also set `ELEVENLABS_VOICE_ID` to the exact voice UUID from your ElevenLabs dashboard

3. **Check Browser Console:**
   - Look for errors in the browser console
   - Check network tab for failed API requests

4. **Fallback Behavior:**
   - If ElevenLabs fails, the system falls back to browser TTS
   - This ensures voice always works, even if ElevenLabs is unavailable

## Voice Lookup

The system automatically looks up voice IDs by name. If you have a custom voice named "Henry" in your ElevenLabs account, it will be found and used automatically.

To find your voice ID:

1. Go to ElevenLabs Dashboard
2. Navigate to "Voices"
3. Find "Henry" voice
4. Copy the Voice ID (UUID format)
5. Optionally set `ELEVENLABS_VOICE_ID` to this UUID for faster lookup
