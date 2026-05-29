'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/contexts/language-context'
import {
  Send,
  Plus,
  Target,
  Lightbulb,
  Calendar,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  Heart,
  CheckCircle2,
  Activity,
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type OnboardingChoice = { id: 'new' | 'returning'; label: string }
type GoalProposal = { id: string; preview: string; payload: Record<string, unknown> }
type DashboardProposal = {
  id: string
  action_type: 'create_goal' | 'create_project' | 'create_task'
  preview: string
  sort_order: number
}

interface ChatInterfaceProps {
  onGoalCreated?: () => void
  onTaskCreated?: () => void
  onTaskCompleted?: () => void
  triggerOpen?: boolean
}

export function ChatInterface({
  onGoalCreated,
  onTaskCreated,
  onTaskCompleted,
  triggerOpen,
}: ChatInterfaceProps) {
  const { language, t } = useLanguage()
  void onTaskCompleted
  const [isExpanded, setIsExpanded] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 384, height: 600 }) // w-96 = 384px
  const [position, setPosition] = useState({ x: 16, y: 16 }) // Default position (top-4 right-4 = 16px)
  const [isResizing, setIsResizing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Voice-related state
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [continuousMode, setContinuousMode] = useState(false)
  const [lastSpeechTime, setLastSpeechTime] = useState(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  // Handle external trigger to open chat
  useEffect(() => {
    if (triggerOpen) {
      setIsExpanded(true)
    }
  }, [triggerOpen])

  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Check for speech recognition support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechSupported(true)
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true // Enable continuous listening
        recognitionRef.current.interimResults = true // Get interim results for better UX
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onstart = () => {
          setIsListening(true)
        }

        recognitionRef.current.onresult = (event) => {
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

          console.log('Speech result:', { finalTranscript, interimTranscript, continuousMode })

          // Update input with current transcript
          const currentTranscript = finalTranscript + interimTranscript
          setInput(currentTranscript)

          // Update last speech time
          setLastSpeechTime(Date.now())

          // Clear existing timeout
          if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current)
          }

          // Set up auto-submit after 10 seconds of silence
          // Trigger when mic is active (continuousMode) and user has spoken (any transcript appears)
          // We'll submit the final transcript (confirmed speech) after 10 seconds of silence
          if (continuousMode && currentTranscript.trim()) {
            console.log(
              'Setting up auto-submit timeout - final:',
              finalTranscript,
              'interim:',
              interimTranscript
            )
            speechTimeoutRef.current = setTimeout(() => {
              console.log('Auto-submit triggered after 10s silence!')
              // Use finalTranscript (confirmed speech) for submission, fallback to currentTranscript if no final yet
              const textToSubmit = finalTranscript.trim() || currentTranscript.trim()
              if (textToSubmit) {
                console.log('Auto-submitting:', textToSubmit)
                // Clear the input and submit
                setInput('')
                submitMessage(textToSubmit)
              }
            }, 10000) // 10 seconds
          }
        }

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }

      // Load voices for better speech synthesis
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          console.log(
            'Available voices:',
            voices.map((v) => v.name)
          )
        }
      }

      // Load voices immediately and on voice change
      loadVoices()
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices
      }
    }
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
      }
    }
  }, [])
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hi! I'm your intelligent AI assistant with full access to your dashboard data. I can help you:

• Plan your day and prioritize tasks based on your goals
• Analyze your progress and suggest improvements
• Turn a conversation into linked goals, projects, and tasks (use Add to dashboard)
• Focus on specific areas like "Good Living" or "Enjoyment"
• Track your habits, education, and priorities
• Provide personalized advice based on your data

What would you like to focus on today? Try asking me about having a "happy day" or planning your strategy!`,
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Assistant onboarding state (new users / empty dashboard)
  const [onboardingActive, setOnboardingActive] = useState(false)
  const [onboardingPrompt, setOnboardingPrompt] = useState<string | null>(null)
  const [onboardingChoices, setOnboardingChoices] = useState<OnboardingChoice[] | null>(null)
  const [onboardingStep, setOnboardingStep] = useState<number>(0)
  const [goalProposals, setGoalProposals] = useState<GoalProposal[]>([])
  const [dashboardPlan, setDashboardPlan] = useState<{
    planGroupId: string
    summary: string
    proposals: DashboardProposal[]
  } | null>(null)

  const refreshDashboard = () => {
    onGoalCreated?.()
    onTaskCreated?.()
    window.dispatchEvent(new CustomEvent('goals-refreshed'))
    window.dispatchEvent(new CustomEvent('tasks-refreshed'))
    window.dispatchEvent(new CustomEvent('dashboard-refreshed'))
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Bootstraps onboarding when chat opens for an empty dashboard user.
  useEffect(() => {
    const bootstrap = async () => {
      if (!isExpanded) return
      try {
        const res = await fetch('/api/assistant/onboarding/status', {
          method: 'GET',
          credentials: 'same-origin',
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          isEmptyDashboard?: boolean
          onboarding?: { status?: string; step?: number }
        }
        const shouldOnboard =
          Boolean(data.isEmptyDashboard) &&
          (data.onboarding?.status === 'not_started' || data.onboarding?.status === 'in_progress')
        if (!shouldOnboard) return

        setOnboardingActive(true)
        // Ask the gate question (choice)
        const r = await fetch('/api/assistant/onboarding/respond', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (!r.ok) return
        const payload = (await r.json()) as {
          status: string
          prompt?: string
          choices?: OnboardingChoice[]
          question?: string
          step?: number
        }
        if (payload.status === 'needs_choice') {
          setOnboardingPrompt(payload.prompt || 'Are you new to Lifestacks?')
          setOnboardingChoices(
            payload.choices || [
              { id: 'new', label: "I'm new / not set up" },
              { id: 'returning', label: "I've used it" },
            ]
          )
          setOnboardingStep(0)
        } else if (payload.status === 'question') {
          setOnboardingPrompt(payload.question || null)
          setOnboardingChoices(null)
          setOnboardingStep(payload.step || 1)
        }
      } catch {
        // ignore
      }
    }
    void bootstrap()
  }, [isExpanded])

  const sendOnboardingChoice = async (choice: 'new' | 'returning') => {
    setIsLoading(true)
    try {
      const r = await fetch('/api/assistant/onboarding/respond', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      })
      const payload = await r.json()
      if (payload.status === 'skipped') {
        setOnboardingActive(false)
        setOnboardingPrompt(null)
        setOnboardingChoices(null)
        return
      }
      if (payload.status === 'question') {
        setOnboardingPrompt(payload.question || null)
        setOnboardingChoices(null)
        setOnboardingStep(payload.step || 1)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const submitOnboardingAnswer = async (answer: string) => {
    setIsLoading(true)
    try {
      // mirror into chat log
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'user', content: answer.trim() },
      ])

      const r = await fetch('/api/assistant/onboarding/respond', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      })
      const payload = await r.json()
      if (payload.status === 'question') {
        setOnboardingPrompt(payload.question || null)
        setOnboardingChoices(null)
        setOnboardingStep(payload.step || onboardingStep + 1)
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: payload.question || '',
          },
        ])
      } else if (payload.status === 'recommendations') {
        setOnboardingPrompt(payload.message || null)
        setGoalProposals((payload.proposals || []) as GoalProposal[])
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: payload.message || 'Here are some goal options to confirm.',
          },
        ])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const commitProposalById = async (proposalId: string) => {
    setIsLoading(true)
    try {
      const r = await fetch('/api/assistant/actions/commit', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId }),
      })
      const payload = await r.json()
      if (r.ok) {
        setGoalProposals((prev) => prev.filter((p) => p.id !== proposalId))
        setDashboardPlan((prev) =>
          prev
            ? {
                ...prev,
                proposals: prev.proposals.filter((p) => p.id !== proposalId),
              }
            : null
        )
        const label =
          payload.kind === 'project' ? 'project' : payload.kind === 'task' ? 'task' : 'goal'
        const title =
          (payload.project?.title as string) ||
          (payload.task?.title as string) ||
          (payload.goal?.title as string) ||
          'item'
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Added ${label} to your dashboard: ${title}.`,
          },
        ])
        refreshDashboard()
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Could not add item: ${payload.error || 'Unknown error'}`,
          },
        ])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const commitGoalProposal = (proposalId: string) => void commitProposalById(proposalId)

  const commitFullDashboardPlan = async () => {
    if (!dashboardPlan) return
    setIsLoading(true)
    try {
      const r = await fetch('/api/assistant/actions/commit-plan', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planGroupId: dashboardPlan.planGroupId }),
      })
      const payload = await r.json()
      if (r.ok) {
        const count = (payload.committed as { title: string }[])?.length ?? 0
        setDashboardPlan(null)
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              payload.status === 'partial'
                ? `Added ${count} item(s). Some items need attention: ${(payload.errors as { error: string }[])?.map((e) => e.error).join('; ')}`
                : `Successfully added ${count} item(s) to your dashboard (goals, projects, and tasks are linked).`,
          },
        ])
        refreshDashboard()
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Failed to add plan: ${payload.error || 'Unknown error'}`,
          },
        ])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const generateDashboardPlanFromChat = async () => {
    const chatMessages = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }))
    if (chatMessages.filter((m) => m.role === 'user').length === 0) {
      alert('Have a short conversation about your goals first, then tap Add to dashboard.')
      return
    }

    setIsLoading(true)
    try {
      const r = await fetch('/api/assistant/actions/propose', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages }),
      })
      const payload = await r.json()
      if (r.ok) {
        setDashboardPlan({
          planGroupId: payload.planGroupId,
          summary: payload.summary,
          proposals: payload.proposals,
        })
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `${payload.summary}\n\nReview each item below. Projects link to goals; tasks link to projects. Use Confirm & Add on each item, or Confirm all.`,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Could not build a dashboard plan: ${payload.error || 'Unknown error'}`,
          },
        ])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    {
      label: t('chat.quickActions.wakeUp'),
      icon: Clock,
      prompt: `Good morning! Let me give you a clear view of your day's plan.

First, let me review your priorities, tasks, and goals for today...

Is there a specific area you'd like to focus on today? (e.g., a particular project, goal category, or type of work)`,
      color: 'bg-black hover:bg-gray-800',
    },
    {
      label: t('chat.quickActions.happyDay'),
      icon: Heart,
      prompt: `Let me help you plan a happy, balanced day! I'll review:

1. 🔥 Emergency/Fire items that need attention
2. 👥 Social opportunities (friends from your relationship manager, if available)
3. 🎉 Nearby events matching your interests (based on your location data)
4. 😌 Relaxing activities from your habits list
5. ✨ Fun things aligned with your interests and projects

Let me gather this information for you...`,
      color: 'bg-black hover:bg-gray-800',
    },
    {
      label: t('chat.quickActions.checkIn'),
      icon: CheckCircle2,
      prompt: `Time for a progress check-in! Let me review:

✅ What you've completed today
📊 Your points and priority progress
⏳ Pending priorities still on your list
🎯 Strategic recommendations if you're stuck

Analyzing your day's progress now...`,
      color: 'bg-black hover:bg-gray-800',
    },
    {
      label: t('chat.quickActions.wellnessUpdate'),
      icon: Activity,
      prompt: `I'm here to help with your wellness and energy. 

Are you experiencing:
- Low energy or fatigue?
- Health issues or discomfort?
- Mental fog or difficulty focusing?
- Need for rest or recovery?

Tell me what you're feeling, and I'll provide personalized suggestions for better energy, health improvement, or how to rest and heal while staying on track for the day.`,
      color: 'bg-black hover:bg-gray-800',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== CHAT SUBMIT CALLED ===', { input: input.trim(), isLoading })
    e.preventDefault()
    if (!input.trim() || isLoading) return

    if (onboardingActive) {
      await submitOnboardingAnswer(input.trim())
      setInput('')
      return
    }

    // Use the extracted submitMessage function
    await submitMessage(input.trim())
  }

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
  }

  // Submit message function (extracted from handleSubmit for reuse)
  const submitMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    console.log('=== SUBMIT MESSAGE CALLED ===', { messageText, isLoading })

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          language: language,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const assistantMessageId = (Date.now() + 1).toString()
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
      }

      setMessages((prev) => [...prev, assistantMessage])

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let responseContent = ''
      const decoder = new TextDecoder()
      console.log('Starting to read streaming response...')
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          responseContent += decoder.decode()
          console.log('Streaming completed')
          break
        }

        responseContent += decoder.decode(value, { stream: true })

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: responseContent } : msg
          )
        )
      }

      let finalContent = responseContent.trim()
      if (!finalContent) {
        finalContent =
          'No reply text arrived from the assistant. Try again in a moment. If it keeps happening, open DevTools → Network, send a message, and inspect the POST /api/chat response.'
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: finalContent } : msg
          )
        )
      } else if (responseContent !== finalContent) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: finalContent } : msg
          )
        )
      }

      // Speak the complete response if voice is enabled
      if (finalContent && voiceEnabled) {
        // Clean and enhance the message for more natural speech
        const cleanMessage = finalContent
          // Remove markdown formatting
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/#{1,6}\s+/g, '')
          .replace(/^\s*[-*+]\s+/gm, '')
          .replace(/^\s*\d+\.\s+/gm, '')
          // Remove excessive whitespace
          .replace(/\s+/g, ' ')
          .trim()

        console.log('Speaking response:', cleanMessage)
        speakText(cleanMessage)
      }

      // Restart listening if continuous mode is on
      if (continuousMode && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start()
          } catch (error) {
            console.error('Error restarting speech recognition:', error)
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => prev.slice(0, -1)) // Remove the assistant message on error
    } finally {
      setIsLoading(false)
    }
  }

  // Voice input functions
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      // CRITICAL: Stop any playing audio immediately when mic is activated
      // This prevents speech-to-text from picking up the AI voice
      const currentAudio = (window as any).__currentChatAudio
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0 // Reset to beginning
        ;(window as any).__currentChatAudio = null
      }
      if (synthesisRef.current) {
        window.speechSynthesis.cancel()
        synthesisRef.current = null
      }

      // Also stop any browser TTS that might be playing
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }

      try {
        setContinuousMode(true)
        recognitionRef.current.start()
      } catch (error) {
        console.error('Error starting speech recognition:', error)
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setContinuousMode(false)
      recognitionRef.current.stop()
      // Clear any pending timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
      }
    }
  }

  const toggleContinuousListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Voice output functions
  const speakText = async (text: string) => {
    if (!voiceEnabled) return

    // Stop any current speech
    if (synthesisRef.current) {
      window.speechSynthesis.cancel()
    }

    // Use OpenAI TTS for voice synthesis (primary)
    try {
      // Stop any existing audio immediately to prevent overlapping voices
      if ((window as any).__currentChatAudio) {
        ;(window as any).__currentChatAudio.pause()
        ;(window as any).__currentChatAudio = null
      }
      if (synthesisRef.current) {
        window.speechSynthesis.cancel()
        synthesisRef.current = null
      }

      setIsSpeaking(true)
      const cleanText = text.replace(/\*\*/g, '').replace(/\n/g, ' ').trim()
      const openaiResponse = await fetch('/api/openai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          voice: 'alloy',
        }),
      })

      if (openaiResponse.ok) {
        const openaiBlob = await openaiResponse.blob()

        // Double-check: stop any audio that might have started while fetching
        if ((window as any).__currentChatAudio) {
          ;(window as any).__currentChatAudio.pause()
          ;(window as any).__currentChatAudio = null
        }

        const audioUrl = URL.createObjectURL(openaiBlob)
        const audio = new Audio(audioUrl)

        // Store audio reference for stopping when user inputs
        ;(window as any).__currentChatAudio = audio

        audio.onplay = () => setIsSpeaking(true)
        audio.onended = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
          ;(window as any).__currentChatAudio = null

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
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
          ;(window as any).__currentChatAudio = null
          // Fallback to browser TTS
          fallbackToBrowserTTS(text)
        }

        await audio.play()
        return
      } else {
        console.warn('OpenAI TTS failed, falling back to browser TTS')
        // Fallback to browser TTS
        fallbackToBrowserTTS(text)
      }
    } catch (error) {
      console.error('Error playing OpenAI TTS audio:', error)
      // Fallback to browser TTS
      fallbackToBrowserTTS(text)
    }
  }

  const fallbackToOpenAITTS = async (text: string) => {
    try {
      const cleanText = text.replace(/\*\*/g, '').replace(/\n/g, ' ').trim()
      const openaiResponse = await fetch('/api/openai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          voice: 'alloy',
        }),
      })

      if (openaiResponse.ok) {
        const openaiBlob = await openaiResponse.blob()
        const openaiUrl = URL.createObjectURL(openaiBlob)
        const openaiAudio = new Audio(openaiUrl)
        ;(window as any).__currentChatAudio = openaiAudio

        openaiAudio.onended = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(openaiUrl)
          ;(window as any).__currentChatAudio = null
        }

        openaiAudio.onerror = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(openaiUrl)
          ;(window as any).__currentChatAudio = null
          // Final fallback to browser TTS
          fallbackToBrowserTTS(text)
        }

        await openaiAudio.play()
        return
      }
    } catch (openaiError) {
      console.error('Error in OpenAI TTS fallback:', openaiError)
    }

    // Final fallback to browser TTS
    fallbackToBrowserTTS(text)
  }

  const fallbackToBrowserTTS = (text: string) => {
    if (!('speechSynthesis' in window)) return

    // Stop any current speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Professional and sophisticated speech parameters
    utterance.rate = 1.1 // Faster, more conversational pace
    utterance.pitch = 0.75 // Lower pitch for professional, sultry tone
    utterance.volume = 0.9 // Slightly lower volume for intimate, engaging delivery
    utterance.lang = 'en-AU' // Australian English accent

    // Try to select the most modern, high-quality voice
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      console.log(
        'Available voices:',
        voices.map((v) => `${v.name} (${v.lang}) - Local: ${v.localService}`)
      )

      // Prioritize professional, sophisticated voices
      const professionalVoices = voices.filter(
        (voice) =>
          // Premium cloud voices (highest quality)
          voice.name.toLowerCase().includes('neural') ||
          voice.name.toLowerCase().includes('enhanced') ||
          voice.name.toLowerCase().includes('premium') ||
          voice.name.toLowerCase().includes('wavenet') ||
          voice.name.toLowerCase().includes('standard') ||
          // Professional-sounding system voices (lower pitch, sophisticated)
          voice.name.toLowerCase().includes('daniel') ||
          voice.name.toLowerCase().includes('alex') ||
          voice.name.toLowerCase().includes('victoria') ||
          voice.name.toLowerCase().includes('moira') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('tessa') ||
          voice.name.toLowerCase().includes('veena') ||
          voice.name.toLowerCase().includes('fiona') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('susan') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('hazel') ||
          voice.name.toLowerCase().includes('sarah') ||
          voice.name.toLowerCase().includes('emma') ||
          // Professional cloud services
          voice.name.toLowerCase().includes('google') ||
          voice.name.toLowerCase().includes('microsoft') ||
          voice.name.toLowerCase().includes('amazon') ||
          voice.name.toLowerCase().includes('azure') ||
          // Look for voices with professional descriptors
          voice.name.toLowerCase().includes('professional') ||
          voice.name.toLowerCase().includes('business') ||
          voice.name.toLowerCase().includes('news') ||
          voice.name.toLowerCase().includes('narrator')
      )

      // Sort by quality preference (cloud voices first, then local)
      const sortedVoices = professionalVoices.sort((a, b) => {
        // Prefer cloud voices over local
        if (a.localService !== b.localService) {
          return a.localService ? 1 : -1
        }
        // Prefer English voices
        if (a.lang.startsWith('en') && !b.lang.startsWith('en')) return -1
        if (!a.lang.startsWith('en') && b.lang.startsWith('en')) return 1
        return 0
      })

      if (sortedVoices.length > 0) {
        utterance.voice = sortedVoices[0]
        console.log('Selected voice:', sortedVoices[0].name, sortedVoices[0].lang)
      } else {
        // Fallback to any non-default voice
        const nonDefaultVoices = voices.filter((voice) => !voice.default)
        if (nonDefaultVoices.length > 0) {
          utterance.voice = nonDefaultVoices[0]
          console.log('Fallback voice:', nonDefaultVoices[0].name)
        }
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
    synthesisRef.current = utterance
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  const toggleVoice = () => {
    const newVoiceState = !voiceEnabled
    setVoiceEnabled(newVoiceState)

    // If turning voice off, immediately stop any playing audio
    if (!newVoiceState) {
      const currentAudio = (window as any).__currentChatAudio
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0 // Reset to beginning
        ;(window as any).__currentChatAudio = null
      }
      if (synthesisRef.current) {
        window.speechSynthesis.cancel()
        synthesisRef.current = null
      }

      // Also stop any browser TTS that might be playing
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }

    // Also call stopSpeaking if currently speaking
    if (isSpeaking) {
      stopSpeaking()
    }
  }

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const startX = e.clientX
    const startY = e.clientY
    const startPositionX = position.x
    const startPositionY = position.y

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      const newX = Math.max(
        0,
        Math.min(window.innerWidth - dimensions.width, startPositionX + deltaX)
      )
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - dimensions.height, startPositionY + deltaY)
      )

      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Resize handlers
  const handleMouseDown = (
    e: React.MouseEvent,
    direction: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's'
  ) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = dimensions.width
    const startHeight = dimensions.height

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      let newWidth = startWidth
      let newHeight = startHeight

      // Handle different resize directions
      if (direction.includes('e')) newWidth = Math.max(300, startWidth + deltaX)
      if (direction.includes('w')) newWidth = Math.max(300, startWidth - deltaX)
      if (direction.includes('s')) newHeight = Math.max(400, startHeight + deltaY)
      if (direction.includes('n')) newHeight = Math.max(400, startHeight - deltaY)

      setDimensions({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const formatText = (content: string) => {
    // Convert markdown-style formatting to readable text with better spacing
    const formatted = content
      // Remove markdown headers and replace with bold text
      .replace(/^#{1,6}\s+/gm, '')
      // Convert **bold** to <strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert *italic* to <em>
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert bullet points to proper spacing with line breaks
      .replace(/^[\s]*[-*+]\s+/gm, '\n• ')
      // Convert numbered lists with line breaks
      .replace(/^[\s]*\d+\.\s+/gm, (match, offset, string) => {
        const num = match.trim().replace('.', '')
        return `\n${num}. `
      })
      // Add extra spacing after colons (for time sections like "Morning:")
      .replace(/([A-Za-z]+:)\s*/g, '$1\n')
      // Add spacing between different time periods or major sections
      .replace(
        /(Morning:|Midday:|Afternoon:|Evening:|Morning|Midday|Afternoon|Evening)\s*/g,
        '\n\n$1\n'
      )
      // Add spacing before questions
      .replace(/(\?)\s*([A-Z])/g, '$1\n\n$2')
      // Add spacing after periods that end sentences
      .replace(/([.!?])\s*([A-Z][a-z])/g, '$1\n\n$2')
      // Add proper spacing between paragraphs
      .replace(/\n\n+/g, '\n\n')
      // Clean up excessive line breaks but keep good spacing
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()

    return formatted
  }

  const formatMessage = (message: ChatMessage) => {
    if (message.role === 'user') {
      return (
        <div className="flex justify-end mb-4">
          <div
            className="bg-black text-white rounded-lg px-6 py-3 max-w-[85%]"
            style={{ fontSize: '16px', lineHeight: '1.6' }}
          >
            {message.content}
          </div>
        </div>
      )
    }

    const formattedContent = formatText(message.content)

    return (
      <div className="flex justify-start mb-4">
        <div className="bg-gray-100 rounded-lg px-6 py-4 max-w-[85%]">
          <div
            className="prose max-w-none"
            style={{
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '16px',
              marginBottom: '0.5rem',
            }}
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        </div>
      </div>
    )
  }

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 left-4 right-auto z-50 md:left-auto md:right-4">
        <Button
          onClick={() => setIsExpanded(true)}
          className="rounded-full w-14 h-14 shadow-lg bg-black hover:bg-gray-800"
        >
          <Send className="w-6 h-6" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className={`fixed z-50 bg-white rounded-lg shadow-xl border flex flex-col ${isResizing || isDragging ? 'select-none' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        maxWidth: '80vw',
        maxHeight: 'calc(100vh - 2rem)',
      }}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between p-4 border-b bg-black text-white rounded-t-lg cursor-move"
        onMouseDown={handleDragStart}
      >
        <h3 className="font-semibold">Productivity Advisor</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="text-white hover:bg-gray-800"
        >
          ✕
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {onboardingActive && onboardingPrompt && (
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm font-medium mb-2">Getting you set up</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{onboardingPrompt}</div>
            {onboardingChoices && onboardingChoices.length > 0 && (
              <div className="mt-3 flex gap-2">
                {onboardingChoices.map((c) => (
                  <Button
                    key={c.id}
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => void sendOnboardingChoice(c.id)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {onboardingActive && goalProposals.length > 0 && (
          <div className="space-y-3">
            {goalProposals.map((p) => (
              <div key={p.id} className="bg-gray-50 border rounded-lg p-4">
                <div className="text-sm whitespace-pre-wrap text-gray-900">{p.preview}</div>
                <div className="mt-3 flex gap-2">
                  <Button disabled={isLoading} onClick={() => void commitGoalProposal(p.id)}>
                    Confirm & Add
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => setGoalProposals((prev) => prev.filter((x) => x.id !== p.id))}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {dashboardPlan && dashboardPlan.proposals.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 space-y-3">
            <div className="text-sm font-medium text-blue-950">
              Dashboard plan (review before adding)
            </div>
            <p className="text-sm text-blue-900 whitespace-pre-wrap">{dashboardPlan.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={isLoading}
                className="touch-manipulation"
                onClick={() => void commitFullDashboardPlan()}
              >
                Confirm all
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => setDashboardPlan(null)}
              >
                Dismiss plan
              </Button>
            </div>
            {dashboardPlan.proposals.map((p) => (
              <div key={p.id} className="rounded-lg border bg-white p-3">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {p.action_type.replace('create_', '')}
                </div>
                <div className="text-sm whitespace-pre-wrap text-gray-900">{p.preview}</div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    disabled={isLoading}
                    className="touch-manipulation"
                    onClick={() => void commitProposalById(p.id)}
                  >
                    Confirm & Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() =>
                      setDashboardPlan((prev) =>
                        prev
                          ? {
                              ...prev,
                              proposals: prev.proposals.filter((x) => x.id !== p.id),
                            }
                          : null
                      )
                    }
                  >
                    Skip
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>{formatMessage(message)}</div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-6 border-t bg-gray-50">
        {!onboardingActive && (
          <div className="mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 touch-manipulation border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100"
              disabled={isLoading || messages.filter((m) => m.role === 'user').length === 0}
              onClick={() => void generateDashboardPlanFromChat()}
            >
              <Target className="w-4 h-4 mr-2" />
              Add conversation to dashboard
            </Button>
            <p className="mt-1 text-xs text-gray-500 text-center">
              Creates linked goals, projects, and tasks for you to confirm
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="default"
              onClick={() => handleQuickAction(action.prompt)}
              className={`${action.color} text-white border-0 hover:opacity-90 h-10`}
              disabled={isLoading}
            >
              <action.icon className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Voice Controls */}
        {speechSupported && (
          <div className="flex items-center space-x-2 mb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleContinuousListening}
              disabled={isLoading}
              className={`h-8 px-3 ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white hover:bg-gray-50'}`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={isSpeaking ? stopSpeaking : () => {}}
              disabled={!isSpeaking}
              className={`h-8 px-3 ${isSpeaking ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-white hover:bg-gray-50'}`}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleVoice}
              className={`h-8 px-3 ${voiceEnabled ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-white hover:bg-gray-50'}`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <span className="text-xs text-gray-500">
              {isListening
                ? continuousMode
                  ? 'Continuous Mode'
                  : 'Listening...'
                : isSpeaking
                  ? 'Speaking...'
                  : voiceEnabled
                    ? 'Voice ON'
                    : 'Voice OFF'}
            </span>
          </div>
        )}

        {/* Input */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex space-x-3">
          <Input
            value={input}
            onChange={(e) => {
              // Stop any playing audio when user types
              if (synthesisRef.current) {
                window.speechSynthesis.cancel()
                synthesisRef.current = null
              }
              // Stop audio if playing
              if ((window as any).__currentChatAudio) {
                ;(window as any).__currentChatAudio.pause()
                ;(window as any).__currentChatAudio = null
              }
              console.log('=== INPUT CHANGED ===', e.target.value)
              setInput(e.target.value)
            }}
            placeholder="Ask me anything about your strategy for the day..."
            className="flex-1 h-12 text-base"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="h-12 px-6">
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>

      {/* Resize Handles */}
      {/* Corner handles */}
      <div
        className="absolute top-0 right-0 w-3 h-3 cursor-nw-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'ne')}
      />
      <div
        className="absolute top-0 left-0 w-3 h-3 cursor-ne-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'nw')}
      />
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'se')}
      />
      <div
        className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'sw')}
      />

      {/* Edge handles */}
      <div
        className="absolute top-0 left-3 right-3 h-1 cursor-n-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'n')}
      />
      <div
        className="absolute bottom-0 left-3 right-3 h-1 cursor-s-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 's')}
      />
      <div
        className="absolute left-0 top-3 bottom-3 w-1 cursor-w-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'w')}
      />
      <div
        className="absolute right-0 top-3 bottom-3 w-1 cursor-e-resize hover:bg-gray-300"
        onMouseDown={(e) => handleMouseDown(e, 'e')}
      />
    </div>
  )
}
