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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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
  const [availableVoices, setAvailableVoices] = useState<Array<{ id: string; name: string }>>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('Henry')
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechTimeRef = useRef<number>(0)

  // Load available voices and selected voice preference
  useEffect(() => {
    // Load selected voice from localStorage
    const savedVoice = localStorage.getItem('elevenlabs_selected_voice')
    if (savedVoice) {
      setSelectedVoice(savedVoice)
    }

    // Fetch available voices from ElevenLabs
    fetch('/api/elevenlabs/voices')
      .then((res) => res.json())
      .then((data) => {
        if (data.voices && data.voices.length > 0) {
          setAvailableVoices(data.voices)
          // If saved voice is not in the list, use the first available voice
          if (
            savedVoice &&
            !data.voices.find((v: any) => v.name === savedVoice || v.id === savedVoice)
          ) {
            setSelectedVoice(data.voices[0].name)
            localStorage.setItem('elevenlabs_selected_voice', data.voices[0].name)
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching voices:', error)
        // Fallback to default voices if API fails
        setAvailableVoices([
          { id: 'Henry', name: 'Henry' },
          { id: 'Titan', name: 'Titan' },
          { id: 'Joel', name: 'Joel' },
          { id: 'Marcelo', name: 'Marcelo' },
          { id: 'Frank', name: 'Frank' },
          { id: 'Chuck', name: 'Chuck' },
        ])
      })
  }, [])

  // Close voice selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showVoiceSelector && !target.closest('.voice-selector-container')) {
        setShowVoiceSelector(false)
      }
    }

    if (showVoiceSelector) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showVoiceSelector])

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

          // In continuous mode, auto-submit after 2 seconds of silence
          if (continuousMode && finalTranscript.trim()) {
            // Clear existing timeout
            if (speechTimeoutRef.current) {
              clearTimeout(speechTimeoutRef.current)
            }

            // Set up auto-submit after 10 seconds of silence
            speechTimeoutRef.current = setTimeout(() => {
              if (finalTranscript.trim() && !isLoading) {
                // Auto-submit the message
                const messageToSend = finalTranscript.trim()
                setInputMessage('')
                sendMessageDirectly(messageToSend)
              }
            }, 10000) // 10 seconds
          }
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          if (event.error !== 'no-speech') {
            setIsListening(false)
            if (continuousMode) {
              // Restart listening after error (except for no-speech)
              setTimeout(() => {
                if (continuousMode && recognitionRef.current) {
                  try {
                    recognitionRef.current.start()
                  } catch (error) {
                    console.error('Error restarting recognition:', error)
                  }
                }
              }, 1000)
            }
          }
        }

        recognition.onend = () => {
          setIsListening(false)
          // Restart listening if in continuous mode
          if (continuousMode && recognitionRef.current) {
            setTimeout(() => {
              try {
                recognitionRef.current.start()
              } catch (error) {
                // Ignore errors when already listening
              }
            }, 500)
          }
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
            voiceIdOrName: selectedVoice, // Use selected voice
          }),
        })
          .then((response) => {
            if (response.ok) {
              return response.blob()
            }
            throw new Error('Failed to generate speech')
          })
          .then((audioBlob) => {
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

              // In continuous mode, restart listening after AI finishes speaking
              if (continuousMode && recognitionRef.current && !isListening) {
                setTimeout(() => {
                  try {
                    recognitionRef.current?.start()
                  } catch (error) {
                    // Ignore errors when already listening
                  }
                }, 500)
              }
            }

            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl)
              currentAudioRef.current = null
            }

            audio.play()
          })
          .catch((error) => {
            console.error('Error playing ElevenLabs audio:', error)
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
  }, [messages, isVoiceEnabled, continuousMode, selectedVoice])

  // Initialize with welcome message
  useEffect(() => {
    const welcomeContent = isNewUser
      ? "Welcome to Life Stacks! 🌟 Before we set up your dashboard, let's discover your true dreams and create a clear vision for your future. This journey will help us personalize your experience.\n\nImportant: If you exit before completing this journey, you'll lose all the information you've shared and won't be able to autofill your dashboard. You can always come back later, but your progress won't be saved.\n\nWe'll go through 8 phases together:\n\n1. Personality Assessment - I'll ask you 20 structured questions to understand your personality profile\n2. Personal Assessment - Exploring your values and desires\n3. Influence Exploration - Questioning what shapes your thoughts\n4. Executive Skills Assessment - Evaluating your executive functioning capabilities\n5. Executive Blocking Factors - Identifying and removing personal barriers\n6. Dream Discovery - Identifying your authentic dreams\n7. Vision Creation - Crafting your vision statement\n8. Goal Generation - Creating actionable goals\n\nAt the end, you can choose to autofill your dashboard with the goals we create together!\n\nLet's begin with the Personality Assessment. I'll ask you 20 questions, one at a time. Just answer naturally - there are no right or wrong answers!"
      : "Welcome back to Dream Catcher! 🌟 I'm here to help you discover your true dreams and create a clear vision for your future. We'll go through a journey together:\n\n1. Personality Assessment - I'll ask you 20 structured questions to understand your personality profile\n2. Personal Assessment - Exploring your values and desires\n3. Influence Exploration - Questioning what shapes your thoughts\n4. Executive Skills Assessment - Evaluating your executive functioning capabilities\n5. Executive Blocking Factors - Identifying and removing personal barriers\n6. Dream Discovery - Identifying your authentic dreams\n7. Vision Creation - Crafting your vision statement\n8. Goal Generation - Creating actionable goals\n\nNote: You can exit at any time, but if you exit before completing, you'll lose your progress. At the end, you can save your dreams and choose to add them to your dashboard (they'll be added to your existing goals, not replace them).\n\nLet's begin with the Personality Assessment. I'll ask you 20 questions, one at a time. Just answer naturally - there are no right or wrong answers!"

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

        // In continuous mode, restart listening after AI responds
        if (continuousMode && recognitionRef.current && !isListening) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start()
            } catch (error) {
              // Ignore errors when already listening
            }
          }, 1000)
        }
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

  const toggleContinuousMode = () => {
    if (continuousMode) {
      setContinuousMode(false)
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop()
        setIsListening(false)
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
        speechTimeoutRef.current = null
      }
    } else {
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

      setContinuousMode(true)
      if (recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.start()
          setIsListening(true)
        } catch (error) {
          console.error('Error starting recognition:', error)
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
    if (!assessmentData.goals_generated || assessmentData.goals_generated.length === 0) {
      alert('No dreams to save. Please complete the Dream Catcher journey first.')
      return
    }

    setIsAutofilling(true)

    try {
      const response = await fetch('/api/modules/dream-catcher/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_data: assessmentData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save dreams')
      }

      alert(
        'Your Dream Catcher session has been saved! You can view it anytime from the Dream Catcher module.'
      )
      // Don't redirect, let them stay to see results or autofill
    } catch (error) {
      console.error('Error saving dreams:', error)
      alert(error instanceof Error ? error.message : 'Failed to save dreams. Please try again.')
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
                              <span className="ml-2 text-purple-600">✓</span>
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
                {isListening && (
                  <p className="text-xs text-red-600 mt-2 flex items-center">
                    <Mic className="h-3 w-3 mr-1 animate-pulse" />
                    Listening... Speak now or click the mic again to stop
                  </p>
                )}
              </div>
            </div>
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
                      ? "If you exit now, you'll lose all the information you've shared and won't be able to autofill your dashboard. You can always come back later, but your progress won't be saved."
                      : "If you exit now, you'll lose all the information you've shared. You can save your progress by completing the journey and clicking 'Save Dreams'."}
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
