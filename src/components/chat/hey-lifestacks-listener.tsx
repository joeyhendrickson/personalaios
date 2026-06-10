'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LIFESTACKS_WAKE_WORD_PAUSE_EVENT,
  LIFESTACKS_WAKE_WORD_RESUME_EVENT,
  openLifestacksAdvisor,
} from '@/lib/voice/advisor-events'
import {
  containsWakePhrase,
  extractRemainderAfterWakePhrase,
  isWakeWordSupported,
} from '@/lib/voice/wake-word'

type HeyLifestacksListenerProps = {
  enabled: boolean
}

const WAKE_COOLDOWN_MS = 4000

export function HeyLifestacksListener({ enabled }: HeyLifestacksListenerProps) {
  const [paused, setPaused] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const lastWakeAtRef = useRef(0)
  const restartingRef = useRef(false)

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    try {
      recognition.stop()
    } catch {
      /* already stopped */
    }
  }, [])

  const startRecognition = useCallback(() => {
    if (!enabled || paused || !isWakeWordSupported()) return
    const recognition = recognitionRef.current
    if (!recognition || restartingRef.current) return
    try {
      recognition.start()
    } catch {
      /* already running */
    }
  }, [enabled, paused])

  useEffect(() => {
    if (!isWakeWordSupported()) return

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      if (!containsWakePhrase(transcript)) return

      const now = Date.now()
      if (now - lastWakeAtRef.current < WAKE_COOLDOWN_MS) return
      lastWakeAtRef.current = now

      const remainder = extractRemainderAfterWakePhrase(transcript)
      stopRecognition()
      openLifestacksAdvisor({
        initialMessage: remainder || undefined,
        startListening: remainder ? false : true,
      })
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopRecognition()
      }
    }

    recognition.onend = () => {
      if (!enabled || paused) return
      restartingRef.current = true
      window.setTimeout(() => {
        restartingRef.current = false
        startRecognition()
      }, 350)
    }

    recognitionRef.current = recognition

    return () => {
      stopRecognition()
      recognitionRef.current = null
    }
  }, [enabled, paused, startRecognition, stopRecognition])

  useEffect(() => {
    if (enabled && !paused) {
      startRecognition()
    } else {
      stopRecognition()
    }
  }, [enabled, paused, startRecognition, stopRecognition])

  useEffect(() => {
    const onPause = () => setPaused(true)
    const onResume = () => setPaused(false)
    window.addEventListener(LIFESTACKS_WAKE_WORD_PAUSE_EVENT, onPause)
    window.addEventListener(LIFESTACKS_WAKE_WORD_RESUME_EVENT, onResume)
    return () => {
      window.removeEventListener(LIFESTACKS_WAKE_WORD_PAUSE_EVENT, onPause)
      window.removeEventListener(LIFESTACKS_WAKE_WORD_RESUME_EVENT, onResume)
    }
  }, [])

  return null
}
