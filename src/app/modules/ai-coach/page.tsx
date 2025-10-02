'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  Brain,
  Heart,
  Target,
  TrendingUp,
  Lightbulb,
  Star,
  MessageCircle,
  User,
  Bot,
  Loader2,
  Sparkles,
  BookOpen,
  Zap,
  Shield,
  Activity,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Settings,
  BarChart3,
  PieChart,
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  personality_insights?: {
    traits_observed: string[]
    strengths_highlighted: string[]
    growth_areas: string[]
  }
  module_recommendations?: Array<{
    module: string
    reason: string
    connection: string
  }>
  actionable_advice?: Array<{
    action: string
    timeline: string
    benefit: string
  }>
  conversation_context?: {
    mood: string
    focus_area: string
    next_steps: string
  }
}

interface PersonalityInsights {
  traits_observed: string[]
  strengths_highlighted: string[]
  growth_areas: string[]
}

interface ModuleRecommendation {
  module: string
  reason: string
  connection: string
  icon: React.ReactNode
  category: string
}

const moduleIcons: Record<string, React.ReactNode> = {
  'Day Trader': <TrendingUp className="h-5 w-5" />,
  'Budget Optimizer': <DollarSign className="h-5 w-5" />,
  'Fitness Tracker': <Activity className="h-5 w-5" />,
  'Time Blocker': <Clock className="h-5 w-5" />,
  'Learning Tracker': <BookOpen className="h-5 w-5" />,
  'Habit Master': <Target className="h-5 w-5" />,
  'Mood Tracker': <Heart className="h-5 w-5" />,
  'Energy Optimizer': <Zap className="h-5 w-5" />,
  'Goal Achiever': <Star className="h-5 w-5" />,
  'Calendar AI': <Calendar className="h-5 w-5" />,
  'Analytics Dashboard': <BarChart3 className="h-5 w-5" />,
  'Sleep Optimizer': <Clock className="h-5 w-5" />,
  'Focus Enhancer': <Target className="h-5 w-5" />,
  'Stress Manager': <Heart className="h-5 w-5" />,
  'Creativity Boost': <Lightbulb className="h-5 w-5" />,
  'System Optimizer': <Settings className="h-5 w-5" />,
  'Security Monitor': <Shield className="h-5 w-5" />,
}

const moduleCategories: Record<string, string> = {
  'Day Trader': 'Finance',
  'Budget Optimizer': 'Finance',
  'Fitness Tracker': 'Health',
  'Time Blocker': 'Productivity',
  'Learning Tracker': 'Education',
  'Habit Master': 'Productivity',
  'Mood Tracker': 'Health',
  'Energy Optimizer': 'Health',
  'Goal Achiever': 'Productivity',
  'Calendar AI': 'Productivity',
  'Analytics Dashboard': 'Analytics',
  'Sleep Optimizer': 'Health',
  'Focus Enhancer': 'Productivity',
  'Stress Manager': 'Health',
  'Creativity Boost': 'Productivity',
  'System Optimizer': 'Technical',
  'Security Monitor': 'Security',
}

export default function AICoachModule() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [personalityInsights, setPersonalityInsights] = useState<PersonalityInsights | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'recommendations'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your AI Life Coach, and I'm here to help you optimize your life using your Personal AI OS. I have access to all your goals, projects, tasks, habits, and progress data to provide personalized guidance. What would you like to work on today?",
      timestamp: new Date(),
      conversation_context: {
        mood: 'welcoming',
        focus_area: 'getting_started',
        next_steps: 'Ask me anything about your goals, habits, or how to improve your life!',
      },
    }
    setMessages([welcomeMessage])
  }, [])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/life-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          conversation_history: messages.slice(-10).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          personality_insights: data.personality_insights,
          module_recommendations: data.module_recommendations,
          actionable_advice: data.actionable_advice,
          conversation_context: data.conversation_context,
        }

        setMessages((prev) => [...prev, assistantMessage])

        // Update personality insights if provided
        if (data.personality_insights) {
          setPersonalityInsights(data.personality_insights)
        }
      } else {
        const errorData = await response.json()
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I apologize, but I'm having trouble processing your request right now. ${errorData.error || 'Please try again in a moment.'}`,
          timestamp: new Date(),
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

  const getModuleRecommendations = (): ModuleRecommendation[] => {
    const recommendations: ModuleRecommendation[] = []

    messages.forEach((message) => {
      if (message.module_recommendations) {
        message.module_recommendations.forEach((rec) => {
          if (!recommendations.find((r) => r.module === rec.module)) {
            recommendations.push({
              ...rec,
              icon: moduleIcons[rec.module] || <Lightbulb className="h-5 w-5" />,
              category: moduleCategories[rec.module] || 'General',
            })
          }
        })
      }
    })

    return recommendations
  }

  const getActionableAdvice = () => {
    const advice: Array<{
      action: string
      timeline: string
      benefit: string
      source: string
    }> = []

    messages.forEach((message) => {
      if (message.actionable_advice) {
        message.actionable_advice.forEach((adv) => {
          advice.push({
            ...adv,
            source: message.content.substring(0, 50) + '...',
          })
        })
      }
    })

    return advice
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getTraitColor = (trait: string) => {
    const positiveTraits = [
      'highly_productive',
      'goal_oriented',
      'habit_focused',
      'learning_oriented',
      'achievement_focused',
      'highly_engaged',
    ]
    const neutralTraits = ['productive', 'habit_aware', 'balanced']

    if (positiveTraits.includes(trait)) return 'text-green-600 bg-green-100'
    if (neutralTraits.includes(trait)) return 'text-blue-600 bg-blue-100'
    return 'text-gray-600 bg-gray-100'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/modules">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Modules
                </button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black flex items-center">
                  <Brain className="h-8 w-8 mr-3 text-purple-600" />
                  AI Life Coach
                </h1>
                <p className="text-sm text-gray-600">
                  Your personalized AI coach with insights from your entire Personal AI OS data
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>Powered by AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Brain className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Life Coach</h3>
                    <p className="text-sm text-gray-600">
                      Analyzing your goals, habits, and progress
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
                      className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}
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

                      {/* Personality Insights */}
                      {message.personality_insights && (
                        <div className="mt-2 ml-10 bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-purple-800 mb-2 flex items-center">
                            <Sparkles className="h-4 w-4 mr-1" />
                            Personality Insights
                          </h4>
                          <div className="space-y-2">
                            {message.personality_insights.traits_observed.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-purple-700">
                                  Observed Traits:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {message.personality_insights.traits_observed.map(
                                    (trait, index) => (
                                      <span
                                        key={index}
                                        className={`px-2 py-1 text-xs rounded-full ${getTraitColor(trait)}`}
                                      >
                                        {trait.replace(/_/g, ' ')}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                            {message.personality_insights.strengths_highlighted.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-green-700">Strengths:</p>
                                <ul className="text-xs text-green-600 mt-1">
                                  {message.personality_insights.strengths_highlighted.map(
                                    (strength, index) => (
                                      <li key={index} className="flex items-center">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {strength}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Module Recommendations */}
                      {message.module_recommendations &&
                        message.module_recommendations.length > 0 && (
                          <div className="mt-2 ml-10 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                              <Lightbulb className="h-4 w-4 mr-1" />
                              Recommended Modules
                            </h4>
                            <div className="space-y-2">
                              {message.module_recommendations.map((rec, index) => (
                                <div key={index} className="bg-white rounded p-2">
                                  <div className="flex items-center space-x-2 mb-1">
                                    {moduleIcons[rec.module] || <Lightbulb className="h-4 w-4" />}
                                    <span className="font-medium text-sm">{rec.module}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {moduleCategories[rec.module] || 'General'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600">{rec.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Actionable Advice */}
                      {message.actionable_advice && message.actionable_advice.length > 0 && (
                        <div className="mt-2 ml-10 bg-green-50 border border-green-200 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                            <Target className="h-4 w-4 mr-1" />
                            Actionable Advice
                          </h4>
                          <div className="space-y-2">
                            {message.actionable_advice.map((advice, index) => (
                              <div key={index} className="bg-white rounded p-2">
                                <p className="text-sm font-medium text-gray-900">{advice.action}</p>
                                <div className="flex items-center space-x-4 mt-1">
                                  <span className="text-xs text-blue-600">
                                    ⏰ {advice.timeline}
                                  </span>
                                  <span className="text-xs text-green-600">
                                    ✨ {advice.benefit}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                            Analyzing your data and crafting a response...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-2">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about your goals, habits, or how to improve your life..."
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
              {/* Quick Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setInputMessage('Help me prioritize my goals')}
                    className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded"
                  >
                    🎯 Prioritize Goals
                  </button>
                  <button
                    onClick={() => setInputMessage('Analyze my productivity patterns')}
                    className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded"
                  >
                    📊 Productivity Analysis
                  </button>
                  <button
                    onClick={() => setInputMessage('Suggest new habits to build')}
                    className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded"
                  >
                    🔄 Habit Suggestions
                  </button>
                  <button
                    onClick={() => setInputMessage('What modules should I try?')}
                    className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded"
                  >
                    🧩 Module Recommendations
                  </button>
                  <button
                    onClick={() => setInputMessage('Help me stay motivated')}
                    className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded"
                  >
                    💪 Motivation Boost
                  </button>
                </div>
              </div>

              {/* Module Recommendations */}
              {getModuleRecommendations().length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Recommended Modules
                  </h3>
                  <div className="space-y-2">
                    {getModuleRecommendations()
                      .slice(0, 3)
                      .map((rec, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2 mb-1">
                            {rec.icon}
                            <span className="text-sm font-medium">{rec.module}</span>
                          </div>
                          <p className="text-xs text-gray-600">{rec.reason}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Actionable Advice */}
              {getActionableAdvice().length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Your Action Items
                  </h3>
                  <div className="space-y-2">
                    {getActionableAdvice()
                      .slice(0, 3)
                      .map((advice, index) => (
                        <div key={index} className="p-2 bg-green-50 rounded">
                          <p className="text-sm font-medium text-green-800">{advice.action}</p>
                          <p className="text-xs text-green-600">⏰ {advice.timeline}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Personality Insights */}
              {personalityInsights && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Your Profile
                  </h3>
                  <div className="space-y-3">
                    {personalityInsights.traits_observed.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Traits:</p>
                        <div className="flex flex-wrap gap-1">
                          {personalityInsights.traits_observed.slice(0, 3).map((trait, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 text-xs rounded-full ${getTraitColor(trait)}`}
                            >
                              {trait.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {personalityInsights.strengths_highlighted.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Strengths:</p>
                        <ul className="text-xs text-green-600">
                          {personalityInsights.strengths_highlighted
                            .slice(0, 2)
                            .map((strength, index) => (
                              <li key={index} className="flex items-center">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {strength}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
