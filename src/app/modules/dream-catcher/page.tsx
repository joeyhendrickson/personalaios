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
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  phase?:
    | 'personality'
    | 'assessment'
    | 'influences'
    | 'executive-skills'
    | 'executive-blocking'
    | 'dreams'
    | 'vision'
    | 'goals'
}

interface AssessmentData {
  personality_traits?: string[]
  personal_insights?: string[]
  influences_identified?: string[]
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
  goals_generated?: Array<{
    goal: string
    category: string
    priority: string
    timeline: string
  }>
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
    | 'personality'
    | 'assessment'
    | 'influences'
    | 'executive-skills'
    | 'executive-blocking'
    | 'dreams'
    | 'vision'
    | 'goals'
  >('personality')
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({})
  const [personalityQuestionIndex, setPersonalityQuestionIndex] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [isAutofilling, setIsAutofilling] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true)
  const [continuousMode, setContinuousMode] = useState(false)
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null)
  const [availableVoices, setAvailableVoices] = useState<Array<{ id: string; name: string }>>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('Henry')
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)
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

  // Speak AI responses when voice is enabled using ElevenLabs
  useEffect(() => {
    if (isVoiceEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant') {
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

        // Use ElevenLabs for voice synthesis
        fetch('/api/elevenlabs/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: cleanText,
            // Use selected voice ID or name (will be looked up by API if needed)
            voiceIdOrName:
              availableVoices.find((v) => v.name === selectedVoice)?.id || selectedVoice,
          }),
        })
          .then(async (response) => {
            if (response.ok) {
              return response.blob()
            }
            // Parse error response to get details
            let errorMessage = 'Failed to generate speech'
            let errorData: any = null
            try {
              errorData = await response.json()
              errorMessage = errorData.details || errorData.error || errorMessage
              console.error('ElevenLabs API error:', {
                status: response.status,
                error: errorData,
                textLength: cleanText.length,
              })
            } catch (parseError) {
              const errorText = await response.text()
              console.error('ElevenLabs API error (non-JSON):', {
                status: response.status,
                statusText: response.statusText,
                errorText,
              })
              errorMessage = `Failed to generate speech: ${response.status} ${response.statusText}`
            }
            // Return null to trigger fallback instead of throwing
            console.warn('ElevenLabs failed, falling back to browser TTS:', errorMessage)
            return null
          })
          .then((audioBlob) => {
            if (!audioBlob) {
              // ElevenLabs failed, use browser TTS fallback
              if (synthRef.current) {
                const utterance = new SpeechSynthesisUtterance(cleanText)
                utterance.rate = 0.9
                utterance.pitch = 1
                utterance.volume = 0.8
                synthRef.current.speak(utterance)
              }
              return
            }

            // Double-check: stop any audio that might have started while fetching
            if (currentAudioRef.current) {
              currentAudioRef.current.pause()
              currentAudioRef.current = null
            }

            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)
            currentAudioRef.current = audio

            audio.onended = () => {
              URL.revokeObjectURL(audioUrl)
              currentAudioRef.current = null

              // DO NOT auto-restart recognition after AI finishes speaking
              // The mic should stay OFF until the user explicitly clicks the red mic button
              // This ensures the AI can speak without being interrupted
            }

            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl)
              currentAudioRef.current = null
              // Fallback to browser TTS if audio playback fails
              if (synthRef.current) {
                const utterance = new SpeechSynthesisUtterance(cleanText)
                utterance.rate = 0.9
                utterance.pitch = 1
                utterance.volume = 0.8
                synthRef.current.speak(utterance)
              }
            }

            audio.play().catch((playError) => {
              console.error('Error playing audio:', playError)
              // Fallback to browser TTS if play fails
              if (synthRef.current) {
                const utterance = new SpeechSynthesisUtterance(cleanText)
                utterance.rate = 0.9
                utterance.pitch = 1
                utterance.volume = 0.8
                synthRef.current.speak(utterance)
              }
            })
          })
          .catch((error) => {
            console.error('Error in ElevenLabs fetch:', error)
            // Fallback to browser TTS if ElevenLabs fails
            if (synthRef.current) {
              const utterance = new SpeechSynthesisUtterance(cleanText)
              utterance.rate = 0.9
              utterance.pitch = 1
              utterance.volume = 0.8
              synthRef.current.speak(utterance)
            }
          })
      }
    }
  }, [messages, isVoiceEnabled, continuousMode, selectedVoice, availableVoices])

  // Initialize with welcome message
  useEffect(() => {
    const welcomeContent = isNewUser
      ? "Welcome to Life Stacks! 🌟 Before we set up your dashboard, let's discover your true dreams and create a clear vision for your future. This journey will help us personalize your experience.\n\nYou can save your progress at any time using the 'Save Progress' button, so you can pause and continue later. Your progress will be saved automatically as you go through the journey.\n\nWe'll go through 8 phases together:\n\n1. Personality Assessment - I'll ask you 20 structured questions to understand your personality profile\n2. Personal Assessment - Exploring your values and desires\n3. Influence Exploration - Questioning what shapes your thoughts\n4. Executive Skills Assessment - Evaluating your executive functioning capabilities\n5. Executive Blocking Factors - Identifying and removing personal barriers\n6. Dream Discovery - Identifying your authentic dreams\n7. Vision Creation - Crafting your vision statement\n8. Goal Generation - Creating actionable goals\n\nAt the end, you can choose to autofill your dashboard with the goals we create together!\n\nLet's begin with the Personality Assessment. I'll ask you 20 questions, one at a time. Just answer naturally - there are no right or wrong answers!\n\nWhen you're ready to respond, click the red microphone button to speak your answer. After you finish speaking, your response will automatically be submitted after 10 seconds of silence."
      : "Welcome back to Dream Catcher! 🌟 I'm here to help you discover your true dreams and create a clear vision for your future. We'll go through a journey together:\n\n1. Personality Assessment - I'll ask you 20 structured questions to understand your personality profile\n2. Personal Assessment - Exploring your values and desires\n3. Influence Exploration - Questioning what shapes your thoughts\n4. Executive Skills Assessment - Evaluating your executive functioning capabilities\n5. Executive Blocking Factors - Identifying and removing personal barriers\n6. Dream Discovery - Identifying your authentic dreams\n7. Vision Creation - Crafting your vision statement\n8. Goal Generation - Creating actionable goals\n\nYou can save your progress at any time using the 'Save Progress' button, so you can pause and continue later. At the end, you can save your dreams and choose to add them to your dashboard (they'll be added to your existing goals, not replace them).\n\nLet's begin with the Personality Assessment. I'll ask you 20 questions, one at a time. Just answer naturally - there are no right or wrong answers!\n\nWhen you're ready to respond, click the red microphone button to speak your answer. After you finish speaking, your response will automatically be submitted after 10 seconds of silence."

    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: welcomeContent,
      timestamp: new Date(),
      phase: 'personality',
    }
    setMessages([welcomeMessage])
  }, [isNewUser])

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
          personality_question_index: personalityQuestionIndex,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Update personality question index if provided
        if (data.personality_question_index !== undefined) {
          setPersonalityQuestionIndex(data.personality_question_index)
        }

        // Remove markdown formatting from AI response
        const cleanResponse = data.response.replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n')

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: cleanResponse,
          timestamp: new Date(),
          phase: data.next_phase || currentPhase,
        }

        setMessages((prev) => [...prev, assistantMessage])

        // Update phase if changed
        if (data.next_phase && data.next_phase !== currentPhase) {
          setCurrentPhase(data.next_phase)
          // Reset question index when moving to a new phase
          if (data.next_phase !== 'personality') {
            setPersonalityQuestionIndex(0)
          }
        }

        // Update assessment data
        if (data.assessment_data) {
          setAssessmentData((prev) => ({
            ...prev,
            ...data.assessment_data,
          }))
        }

        // Show results if goals are generated
        if (
          data.assessment_data?.goals_generated &&
          data.assessment_data.goals_generated.length > 0
        ) {
          setShowResults(true)
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

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName)
    localStorage.setItem('elevenlabs_selected_voice', voiceName)
    setShowVoiceSelector(false)
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
    // Check if user has made progress (has messages beyond welcome)
    const hasProgress = messages.length > 1 || Object.keys(assessmentData).length > 0

    if (hasProgress) {
      setShowExitWarning(true)
    } else {
      // No progress, safe to exit
      if (isNewUser) {
        router.push('/dashboard')
      } else {
        router.push('/modules')
      }
    }
  }

  const confirmExit = () => {
    // Mark that user has exited (we'll track this in the database)
    setShowExitWarning(false)
    if (isNewUser) {
      router.push('/dashboard')
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
      const response = await fetch('/api/modules/dream-catcher/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_data: assessmentData,
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
      alert('No goals to autofill. Please complete the Dream Catcher journey first.')
      return
    }

    setIsAutofilling(true)

    try {
      const response = await fetch('/api/modules/dream-catcher/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: assessmentData.goals_generated,
          vision_statement: assessmentData.vision_statement,
          personality_traits: assessmentData.personality_traits,
          dreams_discovered: assessmentData.dreams_discovered,
          is_new_user: isNewUser,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to autofill dashboard')
      }

      const data = await response.json()

      // Redirect to dashboard
      router.push(`/dashboard?autofilled=true&goalsAdded=${data.goals_added || 0}`)
    } catch (error) {
      console.error('Error autofilling dashboard:', error)
      alert(
        error instanceof Error ? error.message : 'Failed to autofill dashboard. Please try again.'
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
    const phases = {
      personality: {
        name: 'Personality Assessment',
        icon: <User className="h-4 w-4" />,
        color: 'purple',
        bgClass: 'bg-purple-100',
        borderClass: 'border-purple-200',
        borderActiveClass: 'border-purple-300',
        textClass: 'text-purple-700',
      },
      assessment: {
        name: 'Personal Assessment',
        icon: <Heart className="h-4 w-4" />,
        color: 'pink',
        bgClass: 'bg-pink-100',
        borderClass: 'border-pink-200',
        borderActiveClass: 'border-pink-300',
        textClass: 'text-pink-700',
      },
      influences: {
        name: 'Influence Exploration',
        icon: <Brain className="h-4 w-4" />,
        color: 'blue',
        bgClass: 'bg-blue-100',
        borderClass: 'border-blue-200',
        borderActiveClass: 'border-blue-300',
        textClass: 'text-blue-700',
      },
      'executive-skills': {
        name: 'Executive Skills Assessment',
        icon: <Target className="h-4 w-4" />,
        color: 'indigo',
        bgClass: 'bg-indigo-100',
        borderClass: 'border-indigo-200',
        borderActiveClass: 'border-indigo-300',
        textClass: 'text-indigo-700',
      },
      'executive-blocking': {
        name: 'Blocking Factors',
        icon: <Lightbulb className="h-4 w-4" />,
        color: 'red',
        bgClass: 'bg-red-100',
        borderClass: 'border-red-200',
        borderActiveClass: 'border-red-300',
        textClass: 'text-red-700',
      },
      dreams: {
        name: 'Dream Discovery',
        icon: <Sparkles className="h-4 w-4" />,
        color: 'yellow',
        bgClass: 'bg-yellow-100',
        borderClass: 'border-yellow-200',
        borderActiveClass: 'border-yellow-300',
        textClass: 'text-yellow-700',
      },
      vision: {
        name: 'Vision Creation',
        icon: <Eye className="h-4 w-4" />,
        color: 'green',
        bgClass: 'bg-green-100',
        borderClass: 'border-green-200',
        borderActiveClass: 'border-green-300',
        textClass: 'text-green-700',
      },
      goals: {
        name: 'Goal Generation',
        icon: <Target className="h-4 w-4" />,
        color: 'orange',
        bgClass: 'bg-orange-100',
        borderClass: 'border-orange-200',
        borderActiveClass: 'border-orange-300',
        textClass: 'text-orange-700',
      },
    }
    return phases[phase as keyof typeof phases] || phases.personality
  }

  const phaseInfo = getPhaseInfo(currentPhase)

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
                  Discover your true dreams and create your vision for the future
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
                        {phaseInfo.name} - Step{' '}
                        {[
                          'personality',
                          'assessment',
                          'influences',
                          'executive-skills',
                          'executive-blocking',
                          'dreams',
                          'vision',
                          'goals',
                        ].indexOf(currentPhase) + 1}{' '}
                        of 8
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
                        isListening ? 'Listening...' : 'Share your thoughts or click mic...'
                      }
                      className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={2}
                      disabled={isLoading}
                    />
                    <div className="relative voice-selector-container">
                      <button
                        onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                        disabled={!isVoiceEnabled}
                        className={`p-2 rounded-lg transition-colors ${
                          isVoiceEnabled
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        title={`Select voice (Current: ${selectedVoice})`}
                      >
                        <span className="text-xs font-medium">{selectedVoice}</span>
                      </button>
                      {showVoiceSelector && availableVoices.length > 0 && (
                        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px] max-h-[200px] overflow-y-auto">
                          <div className="p-2 border-b border-gray-200">
                            <p className="text-xs font-semibold text-gray-700">Select Voice</p>
                          </div>
                          {availableVoices.map((voice) => (
                            <button
                              key={voice.id}
                              onClick={() => handleVoiceChange(voice.name)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                selectedVoice === voice.name || selectedVoice === voice.id
                                  ? 'bg-purple-50 text-purple-700 font-medium'
                                  : 'text-gray-700'
                              }`}
                            >
                              {voice.name}
                              {(selectedVoice === voice.name || selectedVoice === voice.id) && (
                                <span className="ml-2 text-purple-600">&#10003;</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                      disabled={!inputMessage.trim() || isLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  {micPermissionError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <p className="font-medium mb-1">Microphone Access Required</p>
                      <p>{micPermissionError}</p>
                      <button
                        onClick={() => setMicPermissionError(null)}
                        className="mt-1 text-red-600 hover:text-red-800 underline"
                      >
                        Dismiss
                      </button>
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
                  {[
                    'personality',
                    'assessment',
                    'influences',
                    'executive-skills',
                    'executive-blocking',
                    'dreams',
                    'vision',
                    'goals',
                  ].map((phase, index) => {
                    const info = getPhaseInfo(phase)
                    const isActive = phase === currentPhase
                    const isCompleted =
                      Object.keys(assessmentData).length > 0 &&
                      (phase === 'goals' ? assessmentData.goals_generated : true)
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
              {showResults && assessmentData.goals_generated && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      // Scroll to results or show modal
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <List className="h-4 w-4" />
                    <span>View Your Goals</span>
                  </button>
                  {isNewUser ? (
                    <button
                      onClick={handleAutofillDashboard}
                      disabled={isAutofilling}
                      className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
                    >
                      {isAutofilling ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Autofilling...</span>
                        </>
                      ) : (
                        <>
                          <Target className="h-4 w-4" />
                          <span>Autofill Dashboard</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveDreams}
                        disabled={isAutofilling}
                        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
                      >
                        {isAutofilling ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            <span>Save Dreams</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleAutofillDashboard}
                        disabled={isAutofilling}
                        className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
                      >
                        {isAutofilling ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Autofilling...</span>
                          </>
                        ) : (
                          <>
                            <Target className="h-4 w-4" />
                            <span>Add to Dashboard</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        {showResults && assessmentData.goals_generated && (
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
                      <span>Autofilling Dashboard...</span>
                    </>
                  ) : (
                    <>
                      <Target className="h-5 w-5" />
                      <span>Autofill My Dashboard</span>
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
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {isNewUser ? 'Exit Dream Catcher?' : 'Exit Without Saving?'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {isNewUser
                      ? "If you exit now without saving, you'll lose your progress. Click 'Save Progress' in the header to save your current progress before exiting."
                      : "If you exit now without saving, you'll lose your progress. Click 'Save Progress' in the header to save your current progress before exiting."}
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowExitWarning(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Continue Journey
                    </button>
                    <button
                      onClick={confirmExit}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Exit Anyway
                    </button>
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
