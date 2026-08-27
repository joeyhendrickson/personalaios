import 'server-only'

import WebSocket from 'ws'
import { resolveOpenAIRealtimeModelId } from '@/lib/ai/openai-model-id'
import {
  buildRealtimeSessionConfig,
  buildRealtimeSpeechInstructions,
  openaiSafetyIdentifier,
  resolveRealtimeVoice,
} from '@/lib/voice/realtime-config'

const PCM_SAMPLE_RATE = 24_000

function pcm16ToWav(pcm: Buffer, sampleRate = PCM_SAMPLE_RATE): Buffer {
  const header = Buffer.alloc(44)
  const dataSize = pcm.length
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)
  return Buffer.concat([header, pcm])
}

type SynthesizeSpeechInput = {
  text: string
  voice?: string
  userId?: string
}

export async function synthesizeSpeechWithRealtime({
  text,
  voice,
  userId,
}: SynthesizeSpeechInput): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured')
  }

  const model = resolveOpenAIRealtimeModelId()
  const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  }
  if (userId) {
    headers['OpenAI-Safety-Identifier'] = openaiSafetyIdentifier(userId)
  }

  const chunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url, { headers })
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('Realtime speech timed out'))
    }, 45_000)

    const fail = (error: Error) => {
      clearTimeout(timeout)
      try {
        ws.close()
      } catch {
        /* ignore */
      }
      reject(error)
    }

    const send = (event: Record<string, unknown>) => {
      ws.send(JSON.stringify(event))
    }

    ws.on('error', (error) => fail(error instanceof Error ? error : new Error(String(error))))

    ws.on('message', (raw) => {
      let event: { type?: string; delta?: string; error?: { message?: string } }
      try {
        event = JSON.parse(String(raw)) as typeof event
      } catch {
        return
      }

      if (event.type === 'error') {
        fail(new Error(event.error?.message || 'Realtime speech error'))
        return
      }

      if (event.type === 'session.created') {
        send({
          type: 'session.update',
          session: buildRealtimeSessionConfig({
            instructions: buildRealtimeSpeechInstructions(),
            voice: resolveRealtimeVoice(voice),
          }),
        })
        send({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text }],
          },
        })
        send({ type: 'response.create' })
        return
      }

      if (event.type === 'response.output_audio.delta' && typeof event.delta === 'string') {
        chunks.push(Buffer.from(event.delta, 'base64'))
        return
      }

      if (event.type === 'response.audio.delta' && typeof event.delta === 'string') {
        chunks.push(Buffer.from(event.delta, 'base64'))
        return
      }

      if (event.type === 'response.done' || event.type === 'response.output_audio.done') {
        if (event.type === 'response.done') {
          clearTimeout(timeout)
          ws.close()
          resolve()
        }
      }
    })

    ws.on('close', () => {
      clearTimeout(timeout)
      if (chunks.length === 0) {
        reject(new Error('Realtime speech returned no audio'))
        return
      }
      resolve()
    })
  })

  if (chunks.length === 0) {
    throw new Error('Realtime speech returned no audio')
  }

  return pcm16ToWav(Buffer.concat(chunks))
}
