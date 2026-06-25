'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  LIFESTACKS_WAKE_WORD_PAUSE_EVENT,
  LIFESTACKS_WAKE_WORD_RESUME_EVENT,
  openLifestacksAdvisor,
  pauseWakeWordListener,
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
const RESTART_DELAY_MS = 350

export function HeyLifestacksListener({ enabled }: HeyLifestacksListenerProps) {
  const enabledRef = useRef(enabled)
  const pausedRef = useRef(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const lastWakeAtRef = useRef(0)
  const restartingRef = useRef(false)
  const permissionBlockedRef = useRef(false)

  enabledRef.current = enabled

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
    if (!enabledRef.current || pausedRef.current || !isWakeWordSupported()) return
    const recognition = recognitionRef.current
    if (!recognition || restartingRef.current) return
    try {
      recognition.start()
      permissionBlockedRef.current = false
    } catch {
      /* already running */
    }
  }, [])

  const scheduleRestart = useCallback(() => {
    if (!enabledRef.current || pausedRef.current) return
    restartingRef.current = true
    window.setTimeout(() => {
      restartingRef.current = false
      startRecognition()
    }, RESTART_DELAY_MS)
  }, [startRecognition])

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
      pausedRef.current = true
      pauseWakeWordListener()
      stopRecognition()
      openLifestacksAdvisor({
        initialMessage: remainder || undefined,
        startListening: true,
      })
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        permissionBlockedRef.current = true
        stopRecognition()
        return
      }
      if (event.error === 'aborted') return
      scheduleRestart()
    }

    recognition.onend = () => {
      scheduleRestart()
    }

    recognitionRef.current = recognition

    return () => {
      stopRecognition()
      recognitionRef.current = null
    }
  }, [scheduleRestart, stopRecognition])

  useEffect(() => {
    if (enabled && !pausedRef.current) {
      startRecognition()
    } else {
      stopRecognition()
    }
  }, [enabled, startRecognition, stopRecognition])

  useEffect(() => {
    const onPause = () => {
      pausedRef.current = true
      stopRecognition()
    }
    const onResume = () => {
      pausedRef.current = false
      if (enabledRef.current) {
        startRecognition()
      }
    }
    window.addEventListener(LIFESTACKS_WAKE_WORD_PAUSE_EVENT, onPause)
    window.addEventListener(LIFESTACKS_WAKE_WORD_RESUME_EVENT, onResume)
    return () => {
      window.removeEventListener(LIFESTACKS_WAKE_WORD_PAUSE_EVENT, onPause)
      window.removeEventListener(LIFESTACKS_WAKE_WORD_RESUME_EVENT, onResume)
    }
  }, [startRecognition, stopRecognition])

  useEffect(() => {
    if (!enabled) return

    const retryAfterGesture = () => {
      if (!permissionBlockedRef.current || !enabledRef.current || pausedRef.current) return
      startRecognition()
    }

    document.addEventListener('pointerdown', retryAfterGesture)
    return () => document.removeEventListener('pointerdown', retryAfterGesture)
  }, [enabled, startRecognition])

  return null
}
