'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  Sparkles,
  Target,
  Lightbulb,
  User,
  Bot,
  Loader2,
  CheckCircle,
  FileText,
  Heart,
  Brain,
  Eye,
  List,
  Clock,
  AlertTriangle,
  X,
  Mic,
  Volume2,
  VolumeX,
  Shield,
} from 'lucide-react'
import {
  INTAKE_QUESTION_COUNT,
  normalizeDreamCatcherPhase,
  STREAMLINED_PHASES,
} from '@/lib/dream-catcher/streamlined-phases'
import type { OnboardingPlan } from '@/lib/dream-catcher/generate-onboarding-plan'
import type { DashboardPlanPreview } from '@/lib/dream-catcher/dashboard-plan-preview'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  phase?: 'intake' | 'vision' | 'goals' | 'summary' | 'confirm'
}

interface AssessmentData {
  personality_traits?: string[]
  personal_insights?: string[]
  influences_identified?: string[]
  measurement_preferences?: string[]
  executive_skills?: {
    strengths: string[]
    areas_for_development: string[]
    skill_levels: Record<string, 'strong' | 'moderate' | 'developing'>
  }
  executive_blocking_factors?: Array<{
    factor: string
    impact: 'high' | 'medium' | 'low'
    category: string
    strategies: string[]
  }>
  dreams_discovered?: string[]
  vision_statement?: string
  life_plan_summary?: string
  goals_generated?: Array<{
    goal: string
    category: string
    priority: string
    timeline: string
    target_value?: number
    target_unit?: string
  }>
  project_ideas?: Array<{
    title: string
    description?: string
    category?: string
    linked_goal?: string
  }>
  habit_ideas?: Array<{ title: string; description?: string }>
  task_ideas?: Array<{ title: string; description?: string; category?: string }>
  education_items?: Array<{
    title: string
    description?: string
    target_date?: string
    priority_level?: number
  }>
  fitness_profile?: { goals?: Array<Record<string, unknown>>; baseline?: Record<string, unknown> }
  ruminations?: Array<{
    description: string
    severity?: string
    fear_type?: string
    coping_strategies?: string[]
  }>
  gratitude_starters?: { items?: string[]; practice_idea?: string; reflection?: string }
  key_relationships?: Array<{
    name: string
    relationship_type?: string
    notes?: string
    contact_frequency_days?: number
    priority_level?: number
  }>
}

function mergeAssessmentData(
  existing: AssessmentData,
  incoming: Record<string, unknown>
): AssessmentData {
  const merged = { ...existing }
  for (const [key, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) {
      const prev = Array.isArray(merged[key as keyof AssessmentData])
        ? (merged[key as keyof AssessmentData] as unknown[])
        : []
      merged[key as keyof AssessmentData] = [...new Set([...prev, ...value])] as never
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      merged[key as keyof AssessmentData] &&
      typeof merged[key as keyof AssessmentData] === 'object' &&
      !Array.isArray(merged[key as keyof AssessmentData])
    ) {
      merged[key as keyof AssessmentData] = {
        ...(merged[key as keyof AssessmentData] as Record<string, unknown>),
        ...(value as Record<string, unknown>),
      } as never
    } else if (value !== undefined && value !== null && value !== '') {
      merged[key as keyof AssessmentData] = value as never
    }
  }
  return merged
}

function DreamCatcherModuleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewUser = searchParams.get('newUser') === 'true'
  const sessionId = searchParams.get('sessionId')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<
    'intake' | 'vision' | 'goals' | 'summary' | 'confirm'
  >('intake')
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({})
  const [intakeQuestionIndex, setIntakeQuestionIndex] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [dashboardPreview, setDashboardPreview] = useState<DashboardPlanPreview | null>(null)
  const [pendingPlan, setPendingPlan] = useState<OnboardingPlan | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [exitHasProgress, setExitHasProgress] = useState(false)
  const [isAutofilling, setIsAutofilling] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true)
  const [continuousMode, setContinuousMode] = useState(false)
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechTimeRef = useRef<number>(0)
  const isRecognitionRunningRef = useRef<boolean>(false)

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize speech synthesis
      synthRef.current = window.speechSynthesis

      // Initialize speech recognition if available
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true // Enable continuous listening for voice-to-voice
        recognition.interimResults = true // Get interim results for better UX
        recognition.lang = 'en-US'

        recognition.onstart = () => {
          isRecognitionRunningRef.current = true
          setIsListening(true)
        }

        recognition.onresult = (event: any) => {
          let finalTranscript = ''
          let interimTranscript = ''

          // Process all results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          const currentTranscript = finalTranscript + interimTranscript
          // Stop any playing audio when user speaks
          if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current = null
          }
          setInputMessage(currentTranscript)
          lastSpeechTimeRef.current = Date.now()

          // In continuous mode, auto-submit after 10 seconds of silence
          // Trigger when mic is active and user has spoken (any transcript appears)
          // We'll submit the final transcript (confirmed speech) after 10 seconds of silence
          if (continuousMode && isListening && currentTranscript.trim()) {
            // Clear existing timeout
            if (speechTimeoutRef.current) {
              clearTimeout(speechTimeoutRef.current)
            }

            // Set up auto-submit after 10 seconds of silence
            speechTimeoutRef.current = setTimeout(() => {
              // Use finalTranscript (confirmed speech) for submission, fallback to currentTranscript if no final yet
              const textToSubmit = finalTranscript.trim() || currentTranscript.trim()
              if (textToSubmit && !isLoading && continuousMode && isListening) {
                console.log('Auto-submitting after 10s silence:', textToSubmit)
                // Stop the mic after submitting
                setContinuousMode(false)
                if (recognitionRef.current && isRecognitionRunningRef.current) {
                  try {
                    recognitionRef.current.stop()
                  } catch (error) {
                    console.log('Error stopping recognition:', error)
                  }
                }
                isRecognitionRunningRef.current = false
                setIsListening(false)
                // Clear timeout
                if (speechTimeoutRef.current) {
                  clearTimeout(speechTimeoutRef.current)
                  speechTimeoutRef.current = null
                }
                // Auto-submit the message
                setInputMessage('')
                sendMessageDirectly(textToSubmit)
              }
            }, 10000) // 10 seconds
          }
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)

          // Handle permission errors specifically
          if (event.error === 'not-allowed' || event.error === 'denied') {
            isRecognitionRunningRef.current = false
            setIsListening(false)
            setContinuousMode(false)
            setMicPermissionError(
              'Microphone access was denied. Please allow microphone access in your browser settings and try again.'
            )
            return
          }

          if (event.error !== 'no-speech') {
            isRecognitionRunningRef.current = false
            setIsListening(false)
            setContinuousMode(false)
            // DO NOT auto-restart recognition after errors
            // The mic should only be active when the user explicitly clicks the red mic button
          }
        }

        recognition.onend = () => {
          isRecognitionRunningRef.current = false
          setIsListening(false)
          // DO NOT auto-restart recognition
          // The mic should only be active when the user explicitly clicks the red mic button
          // This prevents the mic from picking up the AI's voice
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Speak AI responses when voice is enabled using OpenAI TTS
  useEffect(() => {
    if (isVoiceEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant') {
        console.log('Voice enabled, speaking assistant message:', {
          messageId: lastMessage.id,
          contentLength: lastMessage.content.length,
          isVoiceEnabled,
        })
        // CRITICAL: Stop speech recognition when AI starts speaking
        // This prevents the mic from picking up the AI's voice
        if (recognitionRef.current && isRecognitionRunningRef.current) {
          try {
            recognitionRef.current.stop()
            isRecognitionRunningRef.current = false
            setIsListening(false)
            setContinuousMode(false)
          } catch (error) {
            console.log('Error stopping recognition when AI speaks:', error)
            // Update state even if stop fails
            isRecognitionRunningRef.current = false
            setIsListening(false)
            setContinuousMode(false)
          }
        }

        // Stop any existing audio immediately to prevent overlapping voices
        if (currentAudioRef.current) {
          currentAudioRef.current.pause()
          currentAudioRef.current = null
        }

        // Cancel any ongoing browser TTS
        if (synthRef.current) {
          synthRef.current.cancel()
        }

        // Remove markdown formatting and clean text
        const cleanText = lastMessage.content.replace(/\*\*/g, '').replace(/\n/g, ' ').trim()

        // Use OpenAI TTS as primary, with browser TTS as fallback
        ;(async () => {
          console.log('Attempting to speak with OpenAI TTS, text length:', cleanText.length)

          try {
            const openaiResponse = await fetch('/api/openai/text-to-speech', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: cleanText,
                voice: 'alloy', // Default OpenAI voice (options: alloy, echo, fable, onyx, nova, shimmer)
              }),
            })

            if (openaiResponse.ok) {
              const openaiBlob = await openaiResponse.blob()
              console.log('OpenAI TTS audio blob received, size:', openaiBlob.size)

              // Stop any existing audio
              if (currentAudioRef.current) {
                currentAudioRef.current.pause()
                currentAudioRef.current = null
              }

              const audioUrl = URL.createObjectURL(openaiBlob)
              const audio = new Audio(audioUrl)
              currentAudioRef.current = audio

              audio.onended = () => {
                console.log('OpenAI TTS audio playback ended')
                URL.revokeObjectURL(audioUrl)
                currentAudioRef.current = null
              }

              audio.onerror = (error) => {
                console.error('OpenAI TTS audio playback error:', error)
                URL.revokeObjectURL(audioUrl)
                currentAudioRef.current = null
                // Fallback to browser TTS
                fallbackToBrowserTTS(cleanText)
              }

              audio.onplay = () => {
                console.log('OpenAI TTS audio playback started')
              }

              try {
                await audio.play()
                console.log('OpenAI TTS audio play() succeeded')
                return // Success, don't fallback
              } catch (playError: any) {
                console.error('Error calling audio.play():', playError)
                // Fallback to browser TTS on play error
                fallbackToBrowserTTS(cleanText)
              }
            } else {
              // Non-OK response, try to read error details
              let errorText = ''
              try {
                errorText = await openaiResponse.text()
                console.log('OpenAI TTS API error response:', errorText)
              } catch {}

              console.warn(
                'OpenAI TTS failed (status:',
                openaiResponse.status,
                '), falling back to browser TTS'
              )
              fallbackToBrowserTTS(cleanText)
            }
          } catch (openaiError) {
            console.error('Error in OpenAI TTS:', openaiError)
            fallbackToBrowserTTS(cleanText)
          }
        })()

        // Fallback function for browser TTS
        function fallbackToBrowserTTS(text: string) {
          console.log('Attempting browser TTS fallback, text length:', text.length)

          if (typeof window === 'undefined') {
            console.error('Browser TTS not available: window is undefined')
            return
          }

          if (!window.speechSynthesis) {
            console.error('Browser TTS not available: speechSynthesis not supported')
            return
          }

          // Cancel any ongoing speech
          window.speechSynthesis.cancel()

          // Wait a moment for cancellation to complete
          setTimeout(() => {
            console.log('Creating SpeechSynthesisUtterance')
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.rate = 0.9
            utterance.pitch = 1
            utterance.volume = 0.8

            utterance.onstart = () => {
              console.log('✅ Browser TTS started speaking')
            }

            utterance.onerror = (error) => {
              console.error('❌ Browser TTS error:', {
                error: error.error,
                type: error.type,
                charIndex: error.charIndex,
                charLength: error.charLength,
              })
            }

            utterance.onend = () => {
              console.log('✅ Browser TTS finished speaking')
            }

            utterance.onpause = () => {
              console.log('⏸️ Browser TTS paused')
            }

            utterance.onresume = () => {
              console.log('▶️ Browser TTS resumed')
            }

            try {
              console.log('Calling window.speechSynthesis.speak()')
              window.speechSynthesis.speak(utterance)
              console.log('window.speechSynthesis.speak() called successfully')
            } catch (speakError) {
              console.error('❌ Error calling speechSynthesis.speak():', speakError)
            }
          }, 100)
        }
      }
    }
  }, [messages, isVoiceEnabled, continuousMode])

  // Load saved session if sessionId is present
  useEffect(() => {
    if (sessionId) {
      loadSavedSession(sessionId)
    }
  }, [sessionId])

  // Load saved session function
  const loadSavedSession = async (id: string) => {
    setIsLoadingSession(true)
    try {
      const response = await fetch(`/api/modules/dream-catcher/saved/${id}`)
      if (!response.ok) {
        throw new Error('Failed to load saved session')
      }
      const data = await response.json()
      const session = data.session

      if (session && session.assessment_data) {
        console.log('Loading saved session:', {
          sessionId: id,
          hasAssessmentData: !!session.assessment_data,
          hasMessages: !!session.assessment_data.conversation_messages,
          messageCount: session.assessment_data.conversation_messages?.length || 0,
          currentPhase: session.assessment_data.current_phase,
          questionIndex: session.assessment_data.personality_question_index,
        })

        // Restore assessment data (but exclude conversation_messages from the main assessment data)
        const { conversation_messages, ...restoredAssessmentData } = session.assessment_data
        setAssessmentData(restoredAssessmentData)

        // Restore phase
        if (session.assessment_data.current_phase) {
          setCurrentPhase(
            normalizeDreamCatcherPhase(session.assessment_data.current_phase) as typeof currentPhase
          )
        }

        const savedIndex =
          session.assessment_data.intake_question_index ??
          session.assessment_data.personality_question_index
        if (savedIndex !== undefined) {
          setIntakeQuestionIndex(savedIndex)
        }

        // Restore conversation messages if they exist
        if (
          conversation_messages &&
          Array.isArray(conversation_messages) &&
          conversation_messages.length > 0
        ) {
          const restoredMessages = conversation_messages.map((msg: any) => ({
            id: msg.id || Date.now().toString() + Math.random(),
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            phase: msg.phase || 'personality',
          }))
          console.log('Restoring', restoredMessages.length, 'messages')
          setMessages(restoredMessages)
        } else {
          // If no conversation messages, show resume message
          const resumeMessage: ChatMessage = {
            id: 'resume',
            role: 'assistant',
            content: `Welcome back! 🌟 I've loaded your saved progress. We were in the ${session.assessment_data.current_phase || 'personality'} phase. Let's continue where we left off!\n\nWhen you're ready to continue, type your responses or click the microphone button to speak your response.`,
            timestamp: new Date(),
            phase: session.assessment_data.current_phase || 'personality',
          }
          setMessages([resumeMessage])
        }
      } else {
        console.warn('Session loaded but no assessment data found')
        throw new Error('No assessment data in saved session')
      }
    } catch (error) {
      console.error('Error loading saved session:', error)
      alert('Failed to load saved session. Starting a new session.')
      // Fall through to show welcome message
    } finally {
      setIsLoadingSession(false)
    }
  }

  // Initialize with welcome message (only if no sessionId and not loading and no messages exist)
  useEffect(() => {
    if (!sessionId && !isLoadingSession && messages.length === 0) {
      const welcomeContent = isNewUser
        ? `Welcome to LifeStacks! I'll ask ${INTAKE_QUESTION_COUNT} thoughtful questions about your goals, habits, fitness, relationships, and what gets in your way.\n\nThen we'll craft your vision and Life Plan — distributed across your dashboard (goals, projects, tasks, habits, education) and life modules (Fitness Tracker, Gratitude Journal, Relationship Manager, Focus Enhancer).\n\nAt the end I'll summarize who you are and what you're building, then you'll review and confirm before anything is created.\n\nHere's the first question: What matters most to you right now? Tell me about your top priorities in your own words.`
        : `Welcome back to Dream Catcher! We'll walk through ${INTAKE_QUESTION_COUNT} questions to refresh your Life Plan — dashboard items and life modules. You'll review everything and confirm before anything is added. Your existing data stays as it is.\n\nWhat matters most to you right now? Tell me about your top priorities in your own words.`

      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date(),
        phase: 'intake',
      }
      setMessages([welcomeMessage])
    }
  }, [isNewUser, sessionId, isLoadingSession, messages.length])

  const loadDashboardPreview = async (data: AssessmentData): Promise<OnboardingPlan | null> => {
    if (!data.goals_generated || data.goals_generated.length === 0) return null

    setIsLoadingPreview(true)
    setPreviewError(null)
    try {
      const response = await fetch('/api/modules/dream-catcher/preview-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_data: data,
          vision_statement: data.vision_statement,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to build dashboard preview')
      }
      const result = await response.json()
      setDashboardPreview(result.preview)
      setPendingPlan(result.plan)
      return result.plan as OnboardingPlan
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to load preview')
      setDashboardPreview(null)
      setPendingPlan(null)
      return null
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const sendMessageDirectly = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    // Stop the mic when user submits a message
    if (continuousMode || isRecognitionRunningRef.current) {
      setContinuousMode(false)
      if (recognitionRef.current && isRecognitionRunningRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.log('Error stopping recognition on submit:', error)
        }
      }
      isRecognitionRunningRef.current = false
      setIsListening(false)
      // Clear any pending auto-submit timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
        speechTimeoutRef.current = null
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      phase: currentPhase,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/modules/dream-catcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          conversation_history: messages.slice(-10).map((msg) => ({
            role: msg.role,
            content: msg.content,
            phase: msg.phase,
          })),
          current_phase: currentPhase,
          assessment_data: assessmentData,
          personality_question_index: intakeQuestionIndex,
          intake_question_index: intakeQuestionIndex,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        const nextIndex =
          data.intake_question_index ?? data.personality_question_index ?? intakeQuestionIndex
        setIntakeQuestionIndex(nextIndex)

        // Remove markdown formatting from AI response
        const cleanResponse = data.response.replace(/\*\*/g, '').replace(/\n\n\n+/g, '\n\n')

        const nextPhase = data.next_phase
          ? (normalizeDreamCatcherPhase(data.next_phase) as typeof currentPhase)
          : currentPhase

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: cleanResponse,
          timestamp: new Date(),
          phase: nextPhase,
        }

        setMessages((prev) => [...prev, assistantMessage])

        if (data.next_phase && nextPhase !== currentPhase) {
          setCurrentPhase(nextPhase)
          if (nextPhase !== 'intake') {
            setIntakeQuestionIndex(0)
          }
        }

        let mergedAssessment = assessmentData
        if (data.assessment_data) {
          mergedAssessment = mergeAssessmentData(assessmentData, data.assessment_data)
          setAssessmentData(mergedAssessment)
        }

        if (nextPhase === 'summary' || nextPhase === 'goals') {
          setShowResults(true)
        }

        if (nextPhase === 'confirm') {
          setShowConfirmation(true)
          setShowResults(true)
        }

        if (mergedAssessment.goals_generated && mergedAssessment.goals_generated.length > 0) {
          if (nextPhase === 'confirm' || nextPhase === 'summary' || nextPhase === 'goals') {
            void loadDashboardPreview(mergedAssessment)
          }
        }

        // DO NOT auto-restart listening after AI responds
        // The mic should stay OFF until the user explicitly clicks the red mic button
      } else {
        const errorData = await response.json()
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I apologize, but I'm having trouble processing your response right now. ${errorData.error || 'Please try again in a moment.'}`,
          timestamp: new Date(),
          phase: currentPhase,
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'm sorry, I'm experiencing some technical difficulties. Please try again in a moment.",
        timestamp: new Date(),
        phase: currentPhase,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    const messageToSend = inputMessage.trim()
    setInputMessage('')
    await sendMessageDirectly(messageToSend)
  }

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      // Request microphone permission explicitly
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach((track) => track.stop())
        setMicPermissionError(null)
        return true
      }
      return false
    } catch (error: any) {
      console.error('Microphone permission error:', error)
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicPermissionError(
          'Microphone access was denied. Please allow microphone access in your browser settings and try again.'
        )
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setMicPermissionError('No microphone found. Please connect a microphone and try again.')
      } else {
        setMicPermissionError('Failed to access microphone. Please check your browser settings.')
      }
      return false
    }
  }

  const toggleContinuousMode = async () => {
    if (continuousMode) {
      setContinuousMode(false)
      // Always stop recognition if it's running, regardless of state
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          // Ignore errors if already stopped
          console.log('Error stopping recognition (may already be stopped):', error)
        }
      }
      isRecognitionRunningRef.current = false
      setIsListening(false)
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
        speechTimeoutRef.current = null
      }
    } else {
      // Clear any previous permission errors
      setMicPermissionError(null)

      // Request microphone permission before starting recognition
      const hasPermission = await requestMicrophonePermission()
      if (!hasPermission) {
        // Permission was denied, don't start recognition
        return
      }

      // CRITICAL: Stop any playing audio immediately when mic is activated
      // This prevents speech-to-text from picking up the AI voice
      const currentAudio = currentAudioRef.current
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0 // Reset to beginning
        currentAudioRef.current = null
      }
      if (synthRef.current) {
        synthRef.current.cancel()
        synthRef.current = null
      }

      // Also stop any browser TTS that might be playing
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }

      // Always stop recognition first to ensure clean state
      if (recognitionRef.current && isRecognitionRunningRef.current) {
        try {
          recognitionRef.current.stop()
          // Wait a brief moment for recognition to fully stop
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
          // Ignore errors if already stopped
          console.log('Error stopping recognition before restart:', error)
        }
      }

      setContinuousMode(true)
      if (recognitionRef.current && !isRecognitionRunningRef.current) {
        try {
          recognitionRef.current.start()
          // State will be updated by onstart handler
        } catch (error: any) {
          console.error('Error starting recognition:', error)
          // Check if error is because it's already started
          if (error.name === 'InvalidStateError' || error.message?.includes('already started')) {
            console.log('Recognition already started, updating state')
            isRecognitionRunningRef.current = true
            setIsListening(true)
          } else {
            setMicPermissionError('Failed to start speech recognition. Please try again.')
            setContinuousMode(false)
          }
        }
      }
    }
  }

  const toggleVoice = () => {
    const newVoiceState = !isVoiceEnabled
    setIsVoiceEnabled(newVoiceState)

    // If turning voice off, immediately stop any playing audio
    if (!newVoiceState) {
      const currentAudio = currentAudioRef.current
      if (currentAudio) {
        currentAudio.pause()
        currentAudioRef.current = null
      }
      if (synthRef.current) {
        synthRef.current.cancel()
        synthRef.current = null
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleExit = () => {
    // Always prompt on exit so we can offer the Fear Catcher as an alternative path.
    // Track whether there's unsaved progress to show the right warning copy.
    const hasProgress = messages.length > 1 || Object.keys(assessmentData).length > 0
    setExitHasProgress(hasProgress)
    setShowExitWarning(true)
  }

  // Offer the Fear Catcher as a different way in: name fears → goals → dashboard.
  const goToFearCatcher = () => {
    setShowExitWarning(false)
    router.push(`/modules/fear-catcher${isNewUser ? '?newUser=true' : ''}`)
  }

  // New users who bail out before setting up their dashboard get marked 'skipped'
  // so the dashboard stops routing them back into Dream Catcher.
  const leaveToDashboardAsNewUser = async () => {
    try {
      await fetch('/api/assistant/onboarding/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped' }),
      })
    } catch {
      /* non-fatal — still let them leave */
    }
    router.push('/dashboard')
  }

  const confirmExit = () => {
    // Mark that user has exited (we'll track this in the database)
    setShowExitWarning(false)
    if (isNewUser) {
      void leaveToDashboardAsNewUser()
    } else {
      router.push('/modules')
    }
  }

  const handleSaveDreams = async () => {
    if (!assessmentData || Object.keys(assessmentData).length === 0) {
      alert('No progress to save yet. Please answer at least one question first.')
      return
    }

    setIsAutofilling(true)

    try {
      // Include conversation messages and current state in saved data
      const saveData = {
        ...assessmentData,
        conversation_messages: messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
          phase: msg.phase,
        })),
        current_phase: currentPhase,
        intake_question_index: intakeQuestionIndex,
        personality_question_index: intakeQuestionIndex,
      }

      const response = await fetch('/api/modules/dream-catcher/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_data: saveData,
          completed_at:
            assessmentData.goals_generated && assessmentData.goals_generated.length > 0
              ? new Date().toISOString()
              : null, // Mark as incomplete if no goals yet
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save progress')
      }

      const hasGoals = assessmentData.goals_generated && assessmentData.goals_generated.length > 0
      alert(
        hasGoals
          ? 'Your Dream Catcher session has been saved! You can view it anytime from the Dream Catcher module.'
          : 'Your progress has been saved! You can continue later from where you left off.'
      )
      // Don't redirect, let them stay to continue or autofill
    } catch (error) {
      console.error('Error saving progress:', error)
      alert(error instanceof Error ? error.message : 'Failed to save progress. Please try again.')
    } finally {
      setIsAutofilling(false)
    }
  }

  const handleAutofillDashboard = async () => {
    if (!assessmentData.goals_generated || assessmentData.goals_generated.length === 0) {
      alert('No goals yet. Finish the chat through the confirm step first.')
      return
    }

    const planToCommit = pendingPlan ?? (await loadDashboardPreview(assessmentData))
    if (!planToCommit) {
      alert(previewError || 'Could not load dashboard preview. Please try again.')
      return
    }

    setIsAutofilling(true)

    try {
      const response = await fetch('/api/modules/dream-catcher/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_data: assessmentData,
          vision_statement: assessmentData.vision_statement,
          is_new_user: isNewUser,
          plan: planToCommit,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to set up dashboard')
      }

      const data = await response.json()
      const c = data.counts || {}
      alert(
        data.message ||
          `Dashboard updated: ${c.goals_added ?? data.goals_added ?? 0} goals, ${c.projects_added ?? 0} projects, ${c.tasks_added ?? 0} tasks, ${c.habits_added ?? 0} habits added.`
      )

      router.push('/dashboard?onboarded=true&lifePlan=1')
    } catch (error) {
      console.error('Error setting up dashboard:', error)
      alert(
        error instanceof Error ? error.message : 'Failed to set up dashboard. Please try again.'
      )
    } finally {
      setIsAutofilling(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getPhaseInfo = (phase: string) => {
    const normalized = normalizeDreamCatcherPhase(phase)
    const phases = {
      intake: {
        name: 'Quick Intake',
        icon: <User className="h-4 w-4" />,
        bgClass: 'bg-purple-100',
        borderClass: 'border-purple-200',
        borderActiveClass: 'border-purple-300',
        textClass: 'text-purple-700',
      },
      vision: {
        name: 'Vision',
        icon: <Eye className="h-4 w-4" />,
        bgClass: 'bg-pink-100',
        borderClass: 'border-pink-200',
        borderActiveClass: 'border-pink-300',
        textClass: 'text-pink-700',
      },
      goals: {
        name: 'Goals',
        icon: <Target className="h-4 w-4" />,
        bgClass: 'bg-orange-100',
        borderClass: 'border-orange-200',
        borderActiveClass: 'border-orange-300',
        textClass: 'text-orange-700',
      },
      summary: {
        name: 'Life Plan',
        icon: <Sparkles className="h-4 w-4" />,
        bgClass: 'bg-blue-100',
        borderClass: 'border-blue-200',
        borderActiveClass: 'border-blue-300',
        textClass: 'text-blue-700',
      },
      confirm: {
        name: 'Confirm',
        icon: <CheckCircle className="h-4 w-4" />,
        bgClass: 'bg-green-100',
        borderClass: 'border-green-200',
        borderActiveClass: 'border-green-300',
        textClass: 'text-green-700',
      },
    }
    return phases[normalized as keyof typeof phases] || phases.intake
  }

  const normalizedPhase = normalizeDreamCatcherPhase(currentPhase)
  const phaseInfo = getPhaseInfo(currentPhase)
  const phaseStepIndex = STREAMLINED_PHASES.indexOf(
    normalizedPhase as (typeof STREAMLINED_PHASES)[number]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExit}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100 text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-2" />
                {isNewUser ? 'Exit to Dashboard' : 'Exit'}
              </button>
              {!isNewUser && (
                <Link href="/modules">
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Modules
                  </button>
                </Link>
              )}
              <div>
                <h1 className="text-3xl font-bold text-black flex items-center">
                  <Sparkles className="h-8 w-8 mr-3 text-purple-600" />
                  Dream Catcher
                </h1>
                <p className="text-sm text-gray-600">
                  A short conversation, then confirm your starter dashboard
                  {!isNewUser && (
                    <span className="ml-2">
                      •{' '}
                      <Link
                        href="/modules/dream-catcher/saved"
                        className="text-purple-600 hover:text-purple-800 underline"
                      >
                        View Saved Dreams
                      </Link>
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Save Progress Button - Always visible */}
              <button
                onClick={handleSaveDreams}
                disabled={
                  isAutofilling || !assessmentData || Object.keys(assessmentData).length === 0
                }
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100 text-blue-600 disabled:text-gray-400"
                title="Save your current progress"
              >
                {isAutofilling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>{isAutofilling ? 'Saving...' : 'Save Progress'}</span>
              </button>
              {!isNewUser && (
                <Link href="/modules/dream-catcher/saved">
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100 text-purple-600">
                    <FileText className="h-4 w-4 mr-2" />
                    Saved Dreams
                  </button>
                </Link>
              )}
              <div
                className={`px-4 py-2 rounded-lg ${phaseInfo.bgClass} border ${phaseInfo.borderClass} flex items-center space-x-2`}
              >
                {phaseInfo.icon}
                <span className={`text-sm font-medium ${phaseInfo.textClass}`}>
                  {phaseInfo.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            {isLoadingSession ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 h-[600px] flex items-center justify-center shadow-lg">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading your saved progress...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 h-[600px] flex flex-col shadow-lg">
                {/* Chat Header */}
                <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Dream Catcher</h3>
                      <p className="text-sm text-gray-600">
                        {phaseInfo.name}
                        {normalizedPhase === 'intake'
                          ? ` — question ${Math.min(intakeQuestionIndex + 1, INTAKE_QUESTION_COUNT)} of ${INTAKE_QUESTION_COUNT}`
                          : phaseStepIndex >= 0
                            ? ` — step ${phaseStepIndex + 1} of ${STREAMLINED_PHASES.length}`
                            : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}
                      >
                        <div
                          className={`flex items-start space-x-2 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                        >
                          <div
                            className={`p-2 rounded-full ${
                              message.role === 'user'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-purple-100 text-purple-600'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              message.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-2">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <Bot className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                            <span className="text-sm text-gray-600">
                              Reflecting on your response...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 p-4 bg-white">
                  <div className="flex space-x-2">
                    <button
                      onClick={toggleContinuousMode}
                      disabled={isLoading}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        continuousMode
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={
                        continuousMode
                          ? 'Stop continuous voice chat'
                          : 'Start continuous voice-to-voice chat'
                      }
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <textarea
                      value={inputMessage}
                      onChange={(e) => {
                        // Stop any playing audio when user types
                        if (currentAudioRef.current) {
                          currentAudioRef.current.pause()
                          currentAudioRef.current = null
                        }
                        setInputMessage(e.target.value)
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        normalizedPhase === 'confirm'
                          ? 'Review your dashboard preview below, then confirm'
                          : isListening
                            ? 'Listening...'
                            : 'Share your thoughts or click mic...'
                      }
                      className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={2}
                      disabled={isLoading || normalizedPhase === 'confirm'}
                    />
                    <button
                      onClick={toggleVoice}
                      className={`p-2 rounded-lg transition-colors ${
                        isVoiceEnabled
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={isVoiceEnabled ? 'Disable voice output' : 'Enable voice output'}
                    >
                      {isVoiceEnabled ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isLoading || normalizedPhase === 'confirm'}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  {micPermissionError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <p className="font-medium mb-2">Microphone Access Required</p>
                      <p className="mb-2">{micPermissionError}</p>
                      <div className="text-xs mb-2">
                        <p className="font-medium mb-1">How to enable microphone access:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>
                            <strong>Chrome/Edge:</strong> Click the lock icon in the address bar →
                            Site settings → Microphone → Allow
                          </li>
                          <li>
                            <strong>Firefox:</strong> Click the shield icon → Permissions →
                            Microphone → Allow
                          </li>
                          <li>
                            <strong>Safari:</strong> Safari → Settings → Websites → Microphone →
                            Allow for this site
                          </li>
                        </ul>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={async () => {
                            setMicPermissionError(null)
                            // Try to request permission again
                            const hasPermission = await requestMicrophonePermission()
                            if (hasPermission) {
                              // If permission granted, try to start recognition
                              if (recognitionRef.current) {
                                try {
                                  recognitionRef.current.start()
                                  setContinuousMode(true)
                                } catch (error) {
                                  console.error(
                                    'Error starting recognition after permission grant:',
                                    error
                                  )
                                }
                              }
                            }
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        >
                          Retry
                        </button>
                        <button
                          onClick={() => setMicPermissionError(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                  {isListening && (
                    <p className="text-xs text-red-600 mt-2 flex items-center">
                      <Mic className="h-3 w-3 mr-1 animate-pulse" />
                      Listening... Speak now or click the mic again to stop
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Progress */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-4 shadow-lg">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Journey Progress
                </h3>
                <div className="space-y-2">
                  {STREAMLINED_PHASES.map((phase) => {
                    const info = getPhaseInfo(phase)
                    const isActive = normalizeDreamCatcherPhase(currentPhase) === phase
                    const phaseOrder = STREAMLINED_PHASES.indexOf(phase)
                    const isCompleted =
                      phaseStepIndex > phaseOrder || (phase === 'confirm' && showConfirmation)
                    return (
                      <div
                        key={phase}
                        className={`p-2 rounded ${
                          isActive
                            ? `${info.bgClass} border-2 ${info.borderActiveClass}`
                            : isCompleted
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {isCompleted && !isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            info.icon
                          )}
                          <span className="text-sm font-medium">{info.name}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Assessment Summary */}
              {Object.keys(assessmentData).length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-4 shadow-lg">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Your Assessment
                  </h3>
                  <div className="space-y-3 text-sm">
                    {assessmentData.personality_traits && (
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Personality Traits:</p>
                        <div className="flex flex-wrap gap-1">
                          {assessmentData.personality_traits.slice(0, 3).map((trait, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {assessmentData.executive_skills && (
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Executive Skills:</p>
                        <div className="text-xs text-gray-600">
                          <p className="mb-1">
                            Strengths:{' '}
                            {assessmentData.executive_skills.strengths?.slice(0, 2).join(', ') ||
                              'Assessing...'}
                          </p>
                          {assessmentData.executive_skills.areas_for_development &&
                            assessmentData.executive_skills.areas_for_development.length > 0 && (
                              <p className="text-red-600">
                                Areas to develop:{' '}
                                {assessmentData.executive_skills.areas_for_development
                                  .slice(0, 2)
                                  .join(', ')}
                              </p>
                            )}
                        </div>
                      </div>
                    )}
                    {assessmentData.executive_blocking_factors &&
                      assessmentData.executive_blocking_factors.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Blocking Factors:</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {assessmentData.executive_blocking_factors
                              .slice(0, 2)
                              .map((factor, i) => (
                                <li key={i} className="flex items-start">
                                  <Lightbulb className="h-3 w-3 mr-1 mt-0.5 text-red-500" />
                                  {factor.factor} ({factor.impact} impact)
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    {assessmentData.dreams_discovered && (
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Dreams Discovered:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {assessmentData.dreams_discovered.slice(0, 2).map((dream, i) => (
                            <li key={i} className="flex items-start">
                              <Sparkles className="h-3 w-3 mr-1 mt-0.5 text-yellow-500" />
                              {dream}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {assessmentData.goals_generated &&
                      assessmentData.goals_generated.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Goals Generated:</p>
                          <p className="text-xs text-gray-600">
                            {assessmentData.goals_generated.length} goals created
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {showConfirmation && assessmentData.goals_generated && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">
                    Review the dashboard preview below. Confirming adds new items only — nothing you
                    already have will be removed.
                  </p>
                  <button
                    onClick={handleAutofillDashboard}
                    disabled={isAutofilling || isLoadingPreview}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
                  >
                    {isAutofilling ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Setting up...</span>
                      </>
                    ) : isLoadingPreview ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Building preview...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Confirm & Setup My Dashboard</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSaveDreams}
                    disabled={isAutofilling}
                    className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
                  >
                    Save session without confirming
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation & dashboard preview */}
        {showConfirmation && assessmentData.goals_generated && (
          <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-lg border border-green-200 p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Confirm Your Life Plan</h2>
                <p className="text-sm text-gray-600">
                  {isNewUser
                    ? 'This creates your starter dashboard and life modules from your answers.'
                    : 'New items will be added alongside what you already have.'}
                </p>
              </div>
            </div>

            {(assessmentData.life_plan_summary || dashboardPreview?.life_plan_summary) && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
                  Your Life Plan Summary
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {assessmentData.life_plan_summary || dashboardPreview?.life_plan_summary}
                </p>
              </div>
            )}

            {assessmentData.vision_statement && (
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-gray-900 mb-1">Vision</h3>
                <p className="text-gray-700 italic">
                  &ldquo;{assessmentData.vision_statement}&rdquo;
                </p>
              </div>
            )}

            {isLoadingPreview && (
              <div className="flex items-center gap-2 text-sm text-gray-600 py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                Building your Life Plan preview...
              </div>
            )}

            {previewError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {previewError}
                <button
                  type="button"
                  onClick={() => void loadDashboardPreview(assessmentData)}
                  className="ml-2 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {dashboardPreview && (
              <>
                <p className="text-sm text-gray-700 mb-4">{dashboardPreview.summary}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Goals', count: dashboardPreview.totals.goals },
                    { label: 'Projects', count: dashboardPreview.totals.projects },
                    { label: 'Tasks', count: dashboardPreview.totals.tasks },
                    { label: 'Habits', count: dashboardPreview.totals.habits },
                    { label: 'Education', count: dashboardPreview.totals.education },
                    { label: 'Fitness', count: dashboardPreview.totals.fitness_goals },
                    { label: 'Focus', count: dashboardPreview.totals.ruminations },
                    { label: 'People', count: dashboardPreview.totals.relationships },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="text-2xl font-bold text-purple-700">{stat.count}</div>
                      <div className="text-xs text-gray-600">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-h-96 overflow-y-auto">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Goals</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {dashboardPreview.goals.map((g, i) => (
                        <li key={i} className="border-b border-gray-100 pb-1">
                          {g.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Projects & tasks</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {dashboardPreview.projects.slice(0, 5).map((p, i) => (
                        <li key={i} className="border-b border-gray-100 pb-1">
                          {p.title}
                        </li>
                      ))}
                      {dashboardPreview.tasks.slice(0, 3).map((t, i) => (
                        <li key={`t-${i}`} className="text-xs text-gray-500 pl-2">
                          → {t.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Daily habits</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {dashboardPreview.habits.map((h, i) => (
                        <li key={i} className="border-b border-gray-100 pb-1">
                          {h.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {dashboardPreview.education.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Education</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {dashboardPreview.education.map((e, i) => (
                          <li key={i} className="border-b border-gray-100 pb-1">
                            {e.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dashboardPreview.fitness_goals.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Fitness goals</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {dashboardPreview.fitness_goals.map((f, i) => (
                          <li key={i} className="border-b border-gray-100 pb-1">
                            {f.description || f.goal_type}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dashboardPreview.ruminations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Focus ruminations</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {dashboardPreview.ruminations.map((r, i) => (
                          <li key={i} className="border-b border-gray-100 pb-1">
                            {r.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dashboardPreview.gratitude.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Gratitude starter</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {dashboardPreview.gratitude[0]?.items.map((item, i) => (
                          <li key={i} className="border-b border-gray-100 pb-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dashboardPreview.relationships.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Key relationships</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {dashboardPreview.relationships.map((r, i) => (
                          <li key={i} className="border-b border-gray-100 pb-1">
                            {r.name}
                            {r.relationship_type ? ` (${r.relationship_type})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAutofillDashboard}
                disabled={isAutofilling || isLoadingPreview || !dashboardPreview}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
              >
                {isAutofilling ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Setting up your dashboard...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Confirm & Setup My Dashboard</span>
                  </>
                )}
              </button>
              <button
                onClick={handleSaveDreams}
                disabled={isAutofilling}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Save for later
              </button>
            </div>
          </div>
        )}

        {/* Life Plan summary — shown during summary phase before confirm */}
        {showResults && assessmentData.life_plan_summary && !showConfirmation && (
          <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-lg border border-blue-200 p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Who You Are & What You&apos;re Building
                </h2>
                <p className="text-sm text-gray-600">
                  Review this summary — next you&apos;ll confirm your full Life Plan on the
                  dashboard.
                </p>
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
              {assessmentData.life_plan_summary}
            </p>
            {assessmentData.vision_statement && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-gray-900 mb-1">Your Vision</h3>
                <p className="text-gray-700 italic">
                  &ldquo;{assessmentData.vision_statement}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}

        {/* Results Section — session summary */}
        {showResults && assessmentData.goals_generated && !showConfirmation && (
          <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Complete Assessment & Goals
                </h2>
                <p className="text-sm text-gray-600">
                  Based on your personality, executive skills, blocking factors, dreams, and vision
                </p>
              </div>
            </div>

            {assessmentData.vision_statement && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Eye className="h-4 w-4 mr-2 text-purple-600" />
                  Your Vision Statement
                </h3>
                <p className="text-gray-700 italic">"{assessmentData.vision_statement}"</p>
              </div>
            )}

            {assessmentData.executive_skills && (
              <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Target className="h-4 w-4 mr-2 text-indigo-600" />
                  Executive Skills Assessment
                </h3>
                {assessmentData.executive_skills.strengths &&
                  assessmentData.executive_skills.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Strengths:</p>
                      <div className="flex flex-wrap gap-2">
                        {assessmentData.executive_skills.strengths.map((strength, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                          >
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                {assessmentData.executive_skills.areas_for_development &&
                  assessmentData.executive_skills.areas_for_development.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Areas for Development:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {assessmentData.executive_skills.areas_for_development.map((area, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {assessmentData.executive_blocking_factors &&
              assessmentData.executive_blocking_factors.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2 text-red-600" />
                    Executive Blocking Factors & Strategies
                  </h3>
                  <div className="space-y-3">
                    {assessmentData.executive_blocking_factors.map((factor, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{factor.factor}</h4>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              factor.impact === 'high'
                                ? 'bg-red-100 text-red-700'
                                : factor.impact === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {factor.impact} impact
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">Category: {factor.category}</p>
                        {factor.strategies && factor.strategies.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">
                              Strategies to Address:
                            </p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {factor.strategies.map((strategy, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="mr-1">•</span>
                                  <span>{strategy}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessmentData.goals_generated.map((goal, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{goal.goal}</h4>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        goal.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : goal.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {goal.priority}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-600 mt-2">
                    <span className="flex items-center">
                      <Target className="h-3 w-3 mr-1" />
                      {goal.category}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {goal.timeline}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {isNewUser ? (
                <button
                  onClick={handleAutofillDashboard}
                  disabled={isAutofilling}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
                >
                  {isAutofilling ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Setting up your dashboard...</span>
                    </>
                  ) : (
                    <>
                      <Target className="h-5 w-5" />
                      <span>Set Up My Dashboard</span>
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSaveDreams}
                    disabled={isAutofilling}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
                  >
                    {isAutofilling ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5" />
                        <span>Save Dreams</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleAutofillDashboard}
                    disabled={isAutofilling}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
                  >
                    {isAutofilling ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Autofilling...</span>
                      </>
                    ) : (
                      <>
                        <Target className="h-5 w-5" />
                        <span>Add to Dashboard</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Exit Warning Modal */}
        {showExitWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <div className="flex items-start space-x-4 mb-4">
                <div className="p-2 bg-indigo-100 rounded-full">
                  {exitHasProgress ? (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  ) : (
                    <Shield className="h-6 w-6 text-indigo-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {exitHasProgress ? 'Leaving Dream Catcher?' : 'Before you go…'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {exitHasProgress
                      ? "If you leave now without saving, you'll lose your progress. Use 'Save Progress' in the header first if you'd like to keep it."
                      : "Not feeling the Dream Catcher journey right now? That's okay."}
                  </p>
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 mb-4">
                    <p className="text-sm font-medium text-indigo-900 flex items-center mb-1">
                      <Shield className="h-4 w-4 mr-2" />
                      Try the Fear Catcher instead
                    </p>
                    <p className="text-xs text-indigo-700">
                      Name what you&apos;re afraid of, and we&apos;ll turn facing those fears into
                      benefits and goals you can add straight to your dashboard.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={goToFearCatcher}
                      className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center space-x-2"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Explore My Fears</span>
                    </button>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowExitWarning(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        Continue Journey
                      </button>
                      <button
                        onClick={confirmExit}
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        {isNewUser ? 'Skip to Dashboard' : 'Exit'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DreamCatcherModule() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">Loading Dream Catcher...</p>
          </div>
        </div>
      }
    >
      <DreamCatcherModuleContent />
    </Suspense>
  )
}
