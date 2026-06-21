'use client'

import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/contexts/language-context'
import { useChatContext } from '@/components/chat/chat-context'
import { WakeWordToggle } from '@/components/chat/wake-word-toggle'
import {
  VoiceSessionControl,
  type VoiceSessionPhase,
} from '@/components/chat/voice-session-control'
import {
  ADVISOR_TTS_FETCH_TIMEOUT_MS,
  ADVISOR_TTS_MAX_CHARS,
  stopAllChatAudio,
  VOICE_SESSION_RESUME_DELAY_MS,
  VOICE_SESSION_SILENCE_MS,
} from '@/lib/voice/voice-session'
import { useVoiceSessionAudio } from '@/lib/voice/use-voice-session-audio'
import { detectDashboardIntent } from '@/lib/assistant/detect-dashboard-intent'
import {
  pauseWakeWordListener,
  resumeWakeWordListener,
  type OpenAdvisorDetail,
} from '@/lib/voice/advisor-events'
import {
  Send,
  Plus,
  Target,
  Lightbulb,
  Calendar,
  Clock,
  Heart,
  CheckCircle2,
  Activity,
  Save,
  History,
  Trash2,
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `👋 Hi! I'm your intelligent AI assistant with full access to your dashboard data. I can help you:

• Plan your day and prioritize tasks based on your goals
• Analyze your progress and suggest improvements
• Turn a conversation into linked goals, projects, tasks, and habits — ask me to add them to your dashboard, then confirm the proposal cards (nothing is saved until you tap Confirm & Add).
• Focus on specific areas like "Good Living" or "Enjoyment"
• Track your habits, education, and priorities
• Provide personalized advice based on your data

What would you like to focus on today? Try asking me about having a "happy day" or planning your strategy!`,
}

type SavedChatSession = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

type OnboardingChoice = { id: 'new' | 'returning'; label: string }
type GoalProposal = { id: string; preview: string; payload: Record<string, unknown> }
type DashboardProposal = {
  id: string
  action_type: 'create_goal' | 'create_project' | 'create_task' | 'create_habit'
  preview: string
  sort_order: number
}

interface ChatInterfaceProps {
  onGoalCreated?: () => void
  onTaskCreated?: () => void
  onTaskCompleted?: () => void
  isExpanded: boolean
  onExpandedChange: (expanded: boolean) => void
  pendingOpenRef: MutableRefObject<OpenAdvisorDetail | null>
}

export function ChatInterface({
  onGoalCreated,
  onTaskCreated,
  onTaskCompleted,
  isExpanded,
  onExpandedChange,
  pendingOpenRef,
}: ChatInterfaceProps) {
  const { language, t } = useLanguage()
  const pathname = usePathname()
  const { wakeWordEnabled, setWakeWordEnabled, wakeWordSupported } = useChatContext()
  void onTaskCompleted
  const [dimensions, setDimensions] = useState({ width: 384, height: 600 }) // w-96 = 384px
  const [position, setPosition] = useState({ x: 16, y: 16 })
  const [isResizing, setIsResizing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const endPanelInteraction = () => {
      setIsDragging(false)
      setIsResizing(false)
    }
    window.addEventListener('mouseup', endPanelInteraction)
    window.addEventListener('blur', endPanelInteraction)
    return () => {
      window.removeEventListener('mouseup', endPanelInteraction)
      window.removeEventListener('blur', endPanelInteraction)
    }
  }, [])

  // Voice-related state
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [voiceSessionActive, setVoiceSessionActive] = useState(false)
  const [lastSpeechTime, setLastSpeechTime] = useState(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const speakGenerationRef = useRef(0)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const voiceSessionActiveRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const isLoadingRef = useRef(false)
  const pendingTranscriptRef = useRef('')
  const formRef = useRef<HTMLFormElement | null>(null)
  const contextRefreshStartedRef = useRef(false)
  const startListeningRef = useRef<() => void>(() => {})
  const submitMessageRef = useRef<(text: string) => Promise<void>>(async () => {})

  useEffect(() => {
    if (!isExpanded) return
    const width = dimensions.width
    const height = dimensions.height
    const x = Math.max(16, window.innerWidth - width - 16)
    const y = Math.max(16, window.innerHeight - height - 88)
    setPosition({ x, y })
    // Anchor once when opening; width/height are read at open time only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded])

  useEffect(() => {
    if (isExpanded) {
      pauseWakeWordListener()
    } else if (wakeWordEnabled) {
      resumeWakeWordListener()
    }
  }, [isExpanded, wakeWordEnabled])

  useEffect(() => {
    if (!isExpanded || !pendingOpenRef.current) return
    const detail = pendingOpenRef.current
    pendingOpenRef.current = null

    const timer = window.setTimeout(() => {
      if (detail.initialMessage?.trim()) {
        void submitMessageRef.current(detail.initialMessage.trim())
      } else if (detail.startListening === true) {
        startListeningRef.current()
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [isExpanded])

  // Warm cross-module context cache when Advisor opens (skip if refreshed within 24 hours)
  useEffect(() => {
    if (!isExpanded) {
      contextRefreshStartedRef.current = false
      return
    }
    if (contextRefreshStartedRef.current) return
    contextRefreshStartedRef.current = true

    void fetch('/api/ai/context-cache/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'advisor_open', forceIfOlderThanMinutes: 1440 }),
    }).catch(() => {
      contextRefreshStartedRef.current = false
    })
  }, [isExpanded])

  const currentModuleFromPath = (() => {
    const match = pathname?.match(/\/modules\/([^/]+)/)
    return match?.[1]
  })()

  // Keep speech recognition callbacks in sync with React state
  useEffect(() => {
    voiceSessionActiveRef.current = voiceSessionActive
  }, [voiceSessionActive])
  useEffect(() => {
    isSpeakingRef.current = isSpeaking
  }, [isSpeaking])

  const clearSpeechSubmitTimeout = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = null
    }
  }

  const invalidatePendingSpeech = useCallback(() => {
    speakGenerationRef.current += 1
    stopAllChatAudio()
    setIsSpeaking(false)
    isSpeakingRef.current = false
  }, [])

  useEffect(() => {
    const onPageHidden = () => {
      if (document.visibilityState !== 'hidden') return
      invalidatePendingSpeech()
      clearSpeechSubmitTimeout()
      pendingTranscriptRef.current = ''
    }
    document.addEventListener('visibilitychange', onPageHidden)
    window.addEventListener('pagehide', onPageHidden)
    return () => {
      document.removeEventListener('visibilitychange', onPageHidden)
      window.removeEventListener('pagehide', onPageHidden)
    }
  }, [invalidatePendingSpeech])

  const pauseRecognitionForAssistant = () => {
    clearSpeechSubmitTimeout()
    pendingTranscriptRef.current = ''
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
  }

  const resumeRecognitionAfterAssistant = () => {
    if (!voiceSessionActiveRef.current) return
    if (isSpeakingRef.current || isLoadingRef.current) return
    window.setTimeout(() => {
      if (!voiceSessionActiveRef.current || isSpeakingRef.current || isLoadingRef.current) return
      if (!recognitionRef.current) return
      try {
        recognitionRef.current.start()
      } catch {
        // already started
      }
    }, VOICE_SESSION_RESUME_DELAY_MS)
  }

  // Initialize speech recognition
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
          if (!voiceSessionActiveRef.current || isSpeakingRef.current || isLoadingRef.current) {
            return
          }

          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          const currentTranscript = (finalTranscript + interimTranscript).trim()
          if (!currentTranscript) return

          pendingTranscriptRef.current = currentTranscript
          setInput(currentTranscript)
          setLastSpeechTime(Date.now())
          clearSpeechSubmitTimeout()

          speechTimeoutRef.current = setTimeout(() => {
            if (!voiceSessionActiveRef.current || isSpeakingRef.current || isLoadingRef.current) {
              return
            }
            const textToSubmit = pendingTranscriptRef.current.trim()
            if (textToSubmit) {
              pendingTranscriptRef.current = ''
              setInput('')
              void submitMessageRef.current(textToSubmit)
            }
          }, VOICE_SESSION_SILENCE_MS)
        }

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'no-speech' || event.error === 'aborted') {
            if (voiceSessionActiveRef.current && !isSpeakingRef.current && !isLoadingRef.current) {
              resumeRecognitionAfterAssistant()
            }
            return
          }
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
          if (voiceSessionActiveRef.current && !isSpeakingRef.current && !isLoadingRef.current) {
            resumeRecognitionAfterAssistant()
          }
        }
      }
    }
  }, [])

  // Cleanup voice session on unmount
  useEffect(() => {
    return () => {
      clearSpeechSubmitTimeout()
      invalidatePendingSpeech()
    }
  }, [invalidatePendingSpeech])
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const [isSavingChat, setIsSavingChat] = useState(false)
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
    window.dispatchEvent(new CustomEvent('habits-refreshed'))
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

  const hasRealConversation = messages.some((m) => m.id !== 'welcome' && m.role === 'user')

  const loadSessions = async () => {
    try {
      const r = await fetch('/api/assistant/chats', { credentials: 'same-origin' })
      if (r.ok) {
        const data = await r.json()
        setSavedSessions((data.sessions || []) as SavedChatSession[])
      }
    } catch {
      // ignore
    }
  }

  // Refresh the saved list whenever the panel opens.
  useEffect(() => {
    if (showSessions) void loadSessions()
  }, [showSessions])

  const saveCurrentChat = async () => {
    if (!hasRealConversation) {
      alert('Start a conversation before saving.')
      return
    }
    setIsSavingChat(true)
    try {
      const payloadMessages = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }))

      if (currentSessionId) {
        const r = await fetch(`/api/assistant/chats/${currentSessionId}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: payloadMessages }),
        })
        if (!r.ok) throw new Error('save failed')
      } else {
        const r = await fetch('/api/assistant/chats', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: payloadMessages }),
        })
        if (!r.ok) throw new Error('save failed')
        const data = await r.json()
        setCurrentSessionId(data.session.id as string)
      }
      await loadSessions()
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Chat saved. You can reopen it anytime from Saved chats.',
        },
      ])
    } catch {
      alert('Could not save chat. Please try again.')
    } finally {
      setIsSavingChat(false)
    }
  }

  const loadSession = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const r = await fetch(`/api/assistant/chats/${sessionId}`, { credentials: 'same-origin' })
      if (!r.ok) throw new Error('load failed')
      const data = await r.json()
      const loaded = (data.session.messages || []) as ChatMessage[]
      setMessages(loaded.length > 0 ? loaded : [WELCOME_MESSAGE])
      setCurrentSessionId(sessionId)
      setShowSessions(false)
      setGoalProposals([])
      setDashboardPlan(null)
    } catch {
      alert('Could not load that chat.')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this saved chat?')) return
    try {
      const r = await fetch(`/api/assistant/chats/${sessionId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (r.ok) {
        setSavedSessions((prev) => prev.filter((s) => s.id !== sessionId))
        if (currentSessionId === sessionId) setCurrentSessionId(null)
      }
    } catch {
      // ignore
    }
  }

  const startNewChat = () => {
    setMessages([WELCOME_MESSAGE])
    setCurrentSessionId(null)
    setGoalProposals([])
    setDashboardPlan(null)
    setShowSessions(false)
  }

  // Once a chat is saved, keep it in sync so users resume exactly where they left off.
  useEffect(() => {
    if (!currentSessionId || isLoading || !hasRealConversation) return
    const handle = setTimeout(() => {
      void fetch(`/api/assistant/chats/${currentSessionId}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
        }),
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentSessionId, isLoading])

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
          payload.kind === 'habit'
            ? 'habit'
            : payload.kind === 'project'
              ? 'project'
              : payload.kind === 'task'
                ? 'task'
                : 'goal'
        const title =
          (payload.habit?.title as string) ||
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
                : `Successfully added ${count} item(s) to your dashboard (goals, projects, tasks, and habits are linked where applicable).`,
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

  const generateDashboardPlanFromChat = async (conversationOverride?: ChatMessage[]) => {
    const source = conversationOverride ?? messages
    const chatMessages = source
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
            content: `${payload.summary}\n\nReview each item below — including habits for your Habits section. Use Confirm & Add on each item, or Confirm all. Nothing is saved until you confirm.`,
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

    const trimmed = messageText.trim()
    const intent = detectDashboardIntent(trimmed, {
      hasDashboardPlan: Boolean(dashboardPlan),
      hasGoalProposals: goalProposals.length > 0,
    })

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    }

    if (intent?.type === 'dismiss_plan') {
      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setDashboardPlan(null)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Okay — I dismissed the dashboard plan. Let me know if you want to revise it.',
        },
      ])
      return
    }

    if (intent?.type === 'commit_all') {
      setMessages((prev) => [...prev, userMessage])
      setInput('')
      if (dashboardPlan) {
        await commitFullDashboardPlan()
        return
      }
      if (goalProposals.length > 0) {
        setIsLoading(true)
        try {
          for (const p of goalProposals) {
            await commitProposalById(p.id)
          }
        } finally {
          setIsLoading(false)
        }
        return
      }
    }

    if (intent?.type === 'propose_plan') {
      const nextMessages = [...messages, userMessage]
      setMessages(nextMessages)
      setInput('')
      await generateDashboardPlanFromChat(nextMessages)
      return
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    isLoadingRef.current = true
    setIsLoading(true)
    pauseRecognitionForAssistant()

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
          currentModule: currentModuleFromPath,
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

      // Speak when voice session is active (hands-free conversation loop)
      if (finalContent && voiceSessionActiveRef.current) {
        pauseRecognitionForAssistant()
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

        speakText(cleanMessage)
      } else if (voiceSessionActiveRef.current) {
        resumeRecognitionAfterAssistant()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => prev.slice(0, -1)) // Remove the assistant message on error
      if (voiceSessionActiveRef.current) {
        resumeRecognitionAfterAssistant()
      }
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }
  submitMessageRef.current = submitMessage

  const startVoiceSession = () => {
    if (!recognitionRef.current || voiceSessionActive) return
    stopAllChatAudio()
    setIsSpeaking(false)
    isSpeakingRef.current = false
    setVoiceSessionActive(true)
    voiceSessionActiveRef.current = true
    pauseWakeWordListener()
    pendingTranscriptRef.current = ''
    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error('Error starting speech recognition:', error)
    }
  }

  const endVoiceSession = () => {
    invalidatePendingSpeech()
    setVoiceSessionActive(false)
    voiceSessionActiveRef.current = false
    clearSpeechSubmitTimeout()
    pendingTranscriptRef.current = ''
    setInput('')
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
    setIsListening(false)
    if (wakeWordEnabled) {
      resumeWakeWordListener()
    }
  }

  startListeningRef.current = startVoiceSession

  useEffect(() => {
    if (!isExpanded && voiceSessionActive) {
      endVoiceSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, voiceSessionActive])

  const speakText = async (text: string) => {
    if (!voiceSessionActiveRef.current) return

    const generation = ++speakGenerationRef.current
    pauseRecognitionForAssistant()
    stopAllChatAudio()

    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\n/g, ' ')
      .trim()
      .slice(0, ADVISOR_TTS_MAX_CHARS)

    if (!cleanText) {
      resumeRecognitionAfterAssistant()
      return
    }

    const canSpeak = () =>
      voiceSessionActiveRef.current && speakGenerationRef.current === generation

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), ADVISOR_TTS_FETCH_TIMEOUT_MS)

    try {
      let response = await fetch('/api/elevenlabs/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
        signal: controller.signal,
      })

      if (!response.ok) {
        response = await fetch('/api/openai/text-to-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText, voice: 'alloy' }),
          signal: controller.signal,
        })
      }

      if (!canSpeak()) return

      if (!response.ok) {
        console.warn('[Advisor TTS] unavailable:', response.status)
        resumeRecognitionAfterAssistant()
        return
      }

      const blob = await response.blob()
      if (!canSpeak()) return

      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      ;(window as Window & { __currentChatAudio?: HTMLAudioElement }).__currentChatAudio = audio

      setIsSpeaking(true)
      isSpeakingRef.current = true

      audio.onplay = () => {
        if (!canSpeak()) {
          audio.pause()
          return
        }
        setIsSpeaking(true)
        isSpeakingRef.current = true
      }

      audio.onended = () => {
        setIsSpeaking(false)
        isSpeakingRef.current = false
        URL.revokeObjectURL(audioUrl)
        ;(window as Window & { __currentChatAudio?: HTMLAudioElement }).__currentChatAudio =
          undefined
        if (canSpeak()) resumeRecognitionAfterAssistant()
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        isSpeakingRef.current = false
        URL.revokeObjectURL(audioUrl)
        ;(window as Window & { __currentChatAudio?: HTMLAudioElement }).__currentChatAudio =
          undefined
        if (canSpeak()) resumeRecognitionAfterAssistant()
      }

      await audio.play()
    } catch (error) {
      if (!canSpeak()) return
      console.warn('[Advisor TTS] failed:', error)
      resumeRecognitionAfterAssistant()
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const voiceSessionPhase: VoiceSessionPhase = voiceSessionActive
    ? isSpeaking
      ? 'speaking'
      : isLoading
        ? 'processing'
        : 'listening'
    : 'off'

  const interruptAssistantSpeech = useCallback(() => {
    if (!isSpeakingRef.current) return
    invalidatePendingSpeech()
    resumeRecognitionAfterAssistant()
  }, [invalidatePendingSpeech])

  const voiceWaveformLevels = useVoiceSessionAudio(
    voiceSessionActive,
    voiceSessionPhase,
    interruptAssistantSpeech
  )

  // Drag handlers — threshold before drag so message text stays selectable
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return

    const startX = e.clientX
    const startY = e.clientY
    const startPositionX = position.x
    const startPositionY = position.y
    let dragging = false

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      if (!dragging) {
        if (Math.abs(deltaX) < 4 && Math.abs(deltaY) < 4) return
        dragging = true
        setIsDragging(true)
      }

      moveEvent.preventDefault()

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
      // Add spacing after periods that end sentences — but NOT after a list
      // marker like "1." so the number stays on the same line as its text.
      .replace(/([^\d\s])([.!?])\s*([A-Z][a-z])/g, '$1$2\n\n$3')
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
            className="advisor-chat-message-body bg-black text-white rounded-lg px-6 py-3 max-w-[85%] select-text"
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
        <div className="bg-gray-100 rounded-lg px-6 py-4 max-w-[85%] select-text">
          <div
            className="advisor-chat-message-body max-w-none select-text"
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
    return null
  }

  return (
    <div
      className="fixed z-[9998] bg-white rounded-lg shadow-xl border flex flex-col overflow-hidden"
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
        className={`flex items-center justify-between gap-2 p-4 border-b bg-black text-white rounded-t-lg cursor-move shrink-0 ${
          isDragging ? 'select-none' : ''
        }`}
        onMouseDown={handleDragStart}
      >
        <h3 className="font-semibold truncate">Advisor</h3>
        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={startNewChat}
            className="text-white hover:bg-gray-800 h-8 px-2"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void saveCurrentChat()}
            disabled={isSavingChat || !hasRealConversation}
            className="text-white hover:bg-gray-800 h-8 px-2"
            title={currentSessionId ? 'Update saved chat' : 'Save chat'}
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSessions((v) => !v)}
            className={`text-white hover:bg-gray-800 h-8 px-2 ${showSessions ? 'bg-gray-800' : ''}`}
            title="Saved chats"
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExpandedChange(false)}
            className="text-white hover:bg-gray-800 h-8 px-2"
          >
            ✕
          </Button>
        </div>
      </div>

      {showSessions && (
        <div className="border-b bg-gray-50 max-h-56 overflow-y-auto">
          <div className="p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Saved chats
            </div>
            {savedSessions.length === 0 ? (
              <p className="text-sm text-gray-500">
                No saved chats yet. Use the save icon to keep this conversation.
              </p>
            ) : (
              <div className="space-y-1">
                {savedSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 rounded-md border p-2 ${
                      currentSessionId === s.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void loadSession(s.id)}
                      className="min-w-0 flex-1 text-left touch-manipulation"
                      title="Open chat"
                    >
                      <div className="truncate text-sm font-medium text-gray-900">{s.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(s.updated_at).toLocaleString()}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSession(s.id)}
                      className="shrink-0 p-1 text-gray-400 hover:text-red-600 touch-manipulation"
                      title="Delete chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="advisor-chat-messages flex-1 overflow-y-auto p-4 space-y-4 relative z-[1] select-text">
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
              Creates linked goals, projects, and tasks for you to confirm — or say &quot;add to
              dashboard&quot; / &quot;yes, add it all&quot;
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

        {/* Wake word + voice session */}
        <div className="mb-3 flex flex-col gap-2">
          <WakeWordToggle
            enabled={wakeWordEnabled}
            supported={wakeWordSupported}
            onChange={setWakeWordEnabled}
          />
          <VoiceSessionControl
            supported={speechSupported}
            active={voiceSessionActive}
            phase={voiceSessionPhase}
            previewText={voiceSessionActive && input ? input : undefined}
            waveformLevels={voiceWaveformLevels}
            disabled={isLoading && !voiceSessionActive}
            onStart={startVoiceSession}
            onEnd={endVoiceSession}
            onInterrupt={interruptAssistantSpeech}
          />
        </div>

        {/* Input */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex space-x-3">
          <Input
            value={input}
            onChange={(e) => {
              stopAllChatAudio()
              invalidatePendingSpeech()
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

      {/* Resize handles — corners only; wrapper passes clicks through to messages */}
      <div
        className={`pointer-events-none absolute inset-0 z-[2] ${isResizing ? 'select-none' : ''}`}
        aria-hidden
      >
        <div
          className="pointer-events-auto absolute top-0 right-0 h-3 w-3 cursor-nesw-resize"
          onMouseDown={(e) => handleMouseDown(e, 'ne')}
        />
        <div
          className="pointer-events-auto absolute top-0 left-0 h-3 w-3 cursor-nwse-resize"
          onMouseDown={(e) => handleMouseDown(e, 'nw')}
        />
        <div
          className="pointer-events-auto absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize"
          onMouseDown={(e) => handleMouseDown(e, 'se')}
        />
        <div
          className="pointer-events-auto absolute bottom-0 left-0 h-3 w-3 cursor-nesw-resize"
          onMouseDown={(e) => handleMouseDown(e, 'sw')}
        />
      </div>
    </div>
  )
}
