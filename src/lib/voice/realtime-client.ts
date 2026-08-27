'use client'

export type RealtimeChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type RealtimeVoiceHandlers = {
  language?: string
  currentModule?: string
  history?: RealtimeChatMessage[]
  onUserTranscript?: (text: string, final: boolean) => void
  onAssistantTranscript?: (text: string, final: boolean) => void
  onSpeechStarted?: () => void
  onSpeechStopped?: () => void
  onAssistantStarted?: () => void
  onAssistantDone?: () => void
  onLocalStream?: (stream: MediaStream) => void
  onError?: (message: string) => void
}

export type RealtimeVoiceHandle = {
  stop: () => void
  interrupt: () => void
  sendText: (text: string) => void
}

function isRealtimeSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof RTCPeerConnection !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}

export function getRealtimeVoiceSupported(): boolean {
  return isRealtimeSupported()
}

export async function startRealtimeVoiceSession(
  handlers: RealtimeVoiceHandlers
): Promise<RealtimeVoiceHandle> {
  if (!isRealtimeSupported()) {
    throw new Error('Realtime voice is not supported in this browser')
  }

  const pc = new RTCPeerConnection()
  const audioEl = document.createElement('audio')
  audioEl.autoplay = true
  audioEl.setAttribute('playsinline', 'true')

  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: false,
  })
  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream)
  }
  handlers.onLocalStream?.(localStream)

  pc.ontrack = (event) => {
    audioEl.srcObject = event.streams[0]
    void audioEl.play().catch(() => {
      /* autoplay may require a prior user gesture; the Start button is that gesture */
    })
  }

  const dc = pc.createDataChannel('oai-events')
  let opened = false

  const send = (event: Record<string, unknown>) => {
    if (dc.readyState !== 'open') return
    dc.send(JSON.stringify(event))
  }

  const seedHistory = () => {
    const history = (handlers.history ?? []).filter((m) => m.content.trim()).slice(-10)
    for (const message of history) {
      send({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: message.role,
          content: [{ type: 'input_text', text: message.content.slice(0, 2000) }],
        },
      })
    }
  }

  dc.addEventListener('open', () => {
    opened = true
    seedHistory()
  })

  dc.addEventListener('message', (event) => {
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(String(event.data)) as Record<string, unknown>
    } catch {
      return
    }

    const type = String(payload.type || '')
    if (type === 'error') {
      const err = payload.error as { message?: string } | undefined
      handlers.onError?.(err?.message || 'Realtime voice error')
      return
    }
    if (type === 'input_audio_buffer.speech_started') {
      handlers.onSpeechStarted?.()
      return
    }
    if (type === 'input_audio_buffer.speech_stopped') {
      handlers.onSpeechStopped?.()
      return
    }
    if (type === 'response.created') {
      handlers.onAssistantStarted?.()
      return
    }
    if (type === 'response.done' || type === 'response.cancelled') {
      handlers.onAssistantDone?.()
      return
    }

    const transcript =
      typeof payload.transcript === 'string'
        ? payload.transcript
        : typeof (payload as { item?: { formatted?: { transcript?: string } } }).item?.formatted
              ?.transcript === 'string'
          ? (payload as { item: { formatted: { transcript: string } } }).item.formatted.transcript
          : ''

    if (
      type === 'conversation.item.input_audio_transcription.delta' ||
      type === 'conversation.item.input_audio_transcription.completed'
    ) {
      const text =
        transcript ||
        (typeof payload.delta === 'string' ? payload.delta : '') ||
        (typeof (payload as { item?: { content?: Array<{ transcript?: string }> } }).item
          ?.content?.[0]?.transcript === 'string'
          ? (payload as { item: { content: Array<{ transcript: string }> } }).item.content[0]
              .transcript
          : '')
      if (text.trim()) {
        handlers.onUserTranscript?.(
          text.trim(),
          type === 'conversation.item.input_audio_transcription.completed'
        )
      }
      return
    }

    if (
      type === 'response.output_audio_transcript.delta' ||
      type === 'response.audio_transcript.delta'
    ) {
      if (typeof payload.delta === 'string' && payload.delta) {
        handlers.onAssistantTranscript?.(payload.delta, false)
      }
      return
    }

    if (
      type === 'response.output_audio_transcript.done' ||
      type === 'response.audio_transcript.done'
    ) {
      const text = transcript || (typeof payload.delta === 'string' ? payload.delta : '')
      if (text.trim()) {
        handlers.onAssistantTranscript?.(text.trim(), true)
      }
      return
    }
  })

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  const params = new URLSearchParams()
  if (handlers.language) params.set('language', handlers.language)
  if (handlers.currentModule) params.set('currentModule', handlers.currentModule)

  const sdpResponse = await fetch(`/api/openai/realtime/session?${params.toString()}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/sdp' },
    body: offer.sdp ?? '',
  })

  if (!sdpResponse.ok) {
    localStream.getTracks().forEach((track) => track.stop())
    pc.close()
    const details = await sdpResponse.text().catch(() => '')
    throw new Error(details.trim() || `Failed to start voice session (${sdpResponse.status})`)
  }

  const answer: RTCSessionDescriptionInit = {
    type: 'answer',
    sdp: await sdpResponse.text(),
  }
  await pc.setRemoteDescription(answer)

  if (!opened && dc.readyState === 'open') {
    seedHistory()
  }

  const stop = () => {
    try {
      dc.close()
    } catch {
      /* ignore */
    }
    try {
      pc.close()
    } catch {
      /* ignore */
    }
    localStream.getTracks().forEach((track) => track.stop())
    audioEl.pause()
    audioEl.srcObject = null
  }

  return {
    stop,
    interrupt: () => {
      send({ type: 'response.cancel' })
      send({ type: 'output_audio_buffer.clear' })
      audioEl.pause()
      handlers.onAssistantDone?.()
    },
    sendText: (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      send({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: trimmed }],
        },
      })
      send({ type: 'response.create' })
    },
  }
}
