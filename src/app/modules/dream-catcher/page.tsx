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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize with welcome message
  useEffect(() => {
    const welcomeContent = isNewUser
      ? "Welcome to Life Stacks! 🌟 Before we set up your dashboard, let's discover your true dreams and create a clear vision for your future. This journey will help us personalize your experience.\n\n**Important:** If you exit before completing this journey, you'll lose all the information you've shared and won't be able to autofill your dashboard. You can always come back later, but your progress won't be saved.\n\nWe'll go through 8 phases together:\n\n1. **Personality Assessment** - I'll ask you 20 structured questions to understand your personality profile\n2. **Personal Assessment** - Exploring your values and desires\n3. **Influence Exploration** - Questioning what shapes your thoughts\n4. **Executive Skills Assessment** - Evaluating your executive functioning capabilities\n5. **Executive Blocking Factors** - Identifying and removing personal barriers\n6. **Dream Discovery** - Identifying your authentic dreams\n7. **Vision Creation** - Crafting your vision statement\n8. **Goal Generation** - Creating actionable goals\n\nAt the end, you can choose to autofill your dashboard with the goals we create together!\n\nLet's begin with the Personality Assessment. I'll ask you 20 questions, one at a time. Just answer naturally - there are no right or wrong answers!"
      : "Welcome back to Dream Catcher! 🌟 I'm here to help you discover your true dreams and create a clear vision for your future. We'll go through a journey together:\n\n1. **Personality Assessment** - I'll ask you 20 structured questions to understand your personality profile\n2. **Personal Assessment** - Exploring your values and desires\n3. **Influence Exploration** - Questioning what shapes your thoughts\n4. **Executive Skills Assessment** - Evaluating your executive functioning capabilities\n5. **Executive Blocking Factors** - Identifying and removing personal barriers\n6. **Dream Discovery** - Identifying your authentic dreams\n7. **Vision Creation** - Crafting your vision statement\n8. **Goal Generation** - Creating actionable goals\n\n**Note:** You can exit at any time, but if you exit before completing, you'll lose your progress. At the end, you can save your dreams and choose to add them to your dashboard (they'll be added to your existing goals, not replace them).\n\nLet's begin with the Personality Assessment. I'll ask you 20 questions, one at a time. Just answer naturally - there are no right or wrong answers!"

    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: welcomeContent,
      timestamp: new Date(),
      phase: 'personality',
    }
    setMessages([welcomeMessage])
  }, [isNewUser])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      phase: currentPhase,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/modules/dream-catcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
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

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
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
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Share your thoughts..."
                    className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
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
