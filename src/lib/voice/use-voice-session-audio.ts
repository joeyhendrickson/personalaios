'use client'

import { useEffect, useRef, useState } from 'react'
import type { VoiceSessionPhase } from '@/components/chat/voice-session-control'

const BAR_COUNT = 12
const SPEAKING_INTERRUPT_RMS = 0.12
const SPEAKING_INTERRUPT_MS = 220

function rmsFromAnalyser(analyser: AnalyserNode, buf: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buf)
  let sum = 0
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / buf.length)
}

export function useVoiceSessionAudio(
  active: boolean,
  phase: VoiceSessionPhase,
  onInterrupt: () => void
): number[] {
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.08))
  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const interruptAboveSinceRef = useRef<number | null>(null)
  const onInterruptRef = useRef(onInterrupt)
  const phaseRef = useRef(phase)

  useEffect(() => {
    onInterruptRef.current = onInterrupt
  }, [onInterrupt])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (!active) {
      interruptAboveSinceRef.current = null
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      void ctxRef.current?.close()
      ctxRef.current = null
      analyserRef.current = null
      setLevels(Array(BAR_COUNT).fill(0.08))
      return
    }

    let cancelled = false

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const ctx = new AudioContext()
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.72
        source.connect(analyser)

        streamRef.current = stream
        ctxRef.current = ctx
        analyserRef.current = analyser

        const timeBuf = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>
        const freqBuf = new Uint8Array(analyser.frequencyBinCount)

        const tick = () => {
          if (cancelled || !analyserRef.current) return

          analyserRef.current.getByteFrequencyData(freqBuf)
          const step = Math.floor(freqBuf.length / BAR_COUNT)
          const next: number[] = []
          for (let b = 0; b < BAR_COUNT; b++) {
            let sum = 0
            const startIdx = b * step
            for (let i = 0; i < step; i++) sum += freqBuf[startIdx + i] ?? 0
            const avg = sum / step / 255
            next.push(Math.min(1, 0.08 + avg * 1.4))
          }
          setLevels(next)

          const currentPhase = phaseRef.current
          if (currentPhase === 'speaking') {
            const rms = rmsFromAnalyser(analyserRef.current, timeBuf)
            if (rms >= SPEAKING_INTERRUPT_RMS) {
              if (interruptAboveSinceRef.current == null) {
                interruptAboveSinceRef.current = performance.now()
              } else if (
                performance.now() - interruptAboveSinceRef.current >=
                SPEAKING_INTERRUPT_MS
              ) {
                interruptAboveSinceRef.current = null
                onInterruptRef.current()
              }
            } else {
              interruptAboveSinceRef.current = null
            }
          } else {
            interruptAboveSinceRef.current = null
          }

          rafRef.current = requestAnimationFrame(tick)
        }

        rafRef.current = requestAnimationFrame(tick)
      } catch (e) {
        console.warn('[VoiceSession] Microphone monitor unavailable:', e)
      }
    }

    void start()

    return () => {
      cancelled = true
      interruptAboveSinceRef.current = null
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      void ctxRef.current?.close()
      ctxRef.current = null
      analyserRef.current = null
    }
  }, [active])

  return levels
}
