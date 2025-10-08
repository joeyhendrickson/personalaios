'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { 
  Upload, 
  Brain, 
  Smartphone, 
  Target, 
  Heart, 
  Shield, 
  TrendingUp,
  MessageCircle,
  FileImage,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Eye,
  Lock,
  Lightbulb,
  Plus,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AppUsage {
  appName: string
  hours: number
  category: string
  isProblematic: boolean
  insights: string
}

interface TherapeuticInsight {
  type: 'fear' | 'validation' | 'addiction' | 'trauma' | 'stress'
  description: string
  severity: 'low' | 'medium' | 'high'
  suggestions: string[]
}

interface ConversationMessage {
  role: 'user' | 'ai'
  content: string
  timestamp: Date
  type?: 'question' | 'insight' | 'suggestion'
}

export default function FocusEnhancerPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [appUsage, setAppUsage] = useState<AppUsage[]>([])
  const [therapeuticInsights, setTherapeuticInsights] = useState<TherapeuticInsight[]>([])
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [currentConversation, setCurrentConversation] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [suggestedGoals, setSuggestedGoals] = useState<any[]>([])
  const [suggestedHabits, setSuggestedHabits] = useState<any[]>([])
  const [suggestedProjects, setSuggestedProjects] = useState<any[]>([])
  const [dynamicSuggestions, setDynamicSuggestions] = useState<any[]>([])
  const [showFearExercise, setShowFearExercise] = useState(false)
  const [userFears, setUserFears] = useState<any[]>([])
  const [currentFear, setCurrentFear] = useState<any>(null)
  const [fearDetails, setFearDetails] = useState({
    name: '',
    description: '',
    severity: 'medium',
    category: '',
    triggers: '',
    impact: '',
    growthOpportunity: ''
  })
  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([])
  const [showSavedAnalyses, setShowSavedAnalyses] = useState(false)
  const [savingAnalysis, setSavingAnalysis] = useState(false)
  const [benchmarkData, setBenchmarkData] = useState<any>(null)
  const [showBenchmark, setShowBenchmark] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageData = e.target?.result as string
      setUploadedImage(imageData)
      await analyzeScreenTime(imageData)
    }
    reader.readAsDataURL(file)
  }

  const analyzeScreenTime = async (imageData: string) => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/focus-enhancer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze screen time')
      }

      const data = await response.json()
      setAppUsage(data.appUsage || [])
      setTherapeuticInsights(data.insights || [])
      setSuggestedGoals(data.suggestedGoals || [])
      setSuggestedHabits(data.suggestedHabits || [])
      setSuggestedProjects(data.suggestedProjects || [])
      
      // Start therapeutic conversation
      if (data.insights && data.insights.length > 0) {
        startTherapeuticConversation(data.insights)
      }
    } catch (error) {
      console.error('Error analyzing screen time:', error)
      alert('Failed to analyze screen time. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const startTherapeuticConversation = (insights: TherapeuticInsight[]) => {
    const initialMessage: ConversationMessage = {
      role: 'ai',
      content: `I've analyzed your screen time data and I can see some patterns that might be worth exploring together. 

I notice you're spending significant time on ${insights.map(i => i.description).join(', ')}. These apps often serve deeper emotional needs - sometimes around validation, fear, or avoiding difficult feelings.

I'd like to have a compassionate conversation with you about what might be driving this usage. Are you open to exploring this together? We can discuss what you're really seeking when you reach for these apps, and how we might address those needs in healthier ways.

What's the first app you'd like to talk about?`,
      timestamp: new Date(),
      type: 'question'
    }
    
    setConversation([initialMessage])
    setShowInsights(true)
  }

  const sendMessage = async () => {
    if (!currentConversation.trim()) return

    const userMessage: ConversationMessage = {
      role: 'user',
      content: currentConversation,
      timestamp: new Date()
    }

    setConversation(prev => [...prev, userMessage])
    setCurrentConversation('')
    setSendingMessage(true)

    try {
      const response = await fetch('/api/focus-enhancer/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentConversation,
          conversationHistory: conversation,
          appUsage,
          therapeuticInsights
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      const aiMessage: ConversationMessage = {
        role: 'ai',
        content: data.response,
        timestamp: new Date(),
        type: data.type || 'insight'
      }

      setConversation(prev => [...prev, aiMessage])

      // Generate real-time suggestions based on conversation
      if (data.dynamicSuggestions && data.dynamicSuggestions.length > 0) {
        setDynamicSuggestions(prev => [...prev, ...data.dynamicSuggestions])
      }

      // Check if AI suggests fear exercise
      if (data.suggestFearExercise) {
        setShowFearExercise(true)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSendingMessage(false)
    }
  }

  const addToDashboard = async (type: 'goal' | 'habit' | 'project', item: any) => {
    try {
      const endpoint = type === 'goal' ? '/api/goals' : 
                     type === 'habit' ? '/api/habits' : '/api/weekly-goals'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })

      if (!response.ok) {
        throw new Error(`Failed to add ${type}`)
      }

      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} added to your dashboard!`)
    } catch (error) {
      console.error(`Error adding ${type}:`, error)
      alert(`Failed to add ${type}. Please try again.`)
    }
  }

  const suggestFeature = async (description: string) => {
    try {
      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Feature Suggestion: Focus Enhancement',
          description: `Focus Enhancer Suggestion: ${description}`,
          category: 'feature_request',
          severity: 'low'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit feature suggestion')
      }

      alert('Feature suggestion submitted! Thank you for helping improve Life Stacks.')
    } catch (error) {
      console.error('Error submitting suggestion:', error)
      alert('Failed to submit suggestion. Please try again.')
    }
  }

  const addFearToList = () => {
    if (!fearDetails.name.trim()) return

    const newFear = {
      id: Date.now(),
      ...fearDetails,
      addedAt: new Date(),
      status: 'active'
    }

    setUserFears(prev => [...prev, newFear])
    setFearDetails({
      name: '',
      description: '',
      severity: 'medium',
      category: '',
      triggers: '',
      impact: '',
      growthOpportunity: ''
    })
  }

  const startFearDetails = (fear: any) => {
    setCurrentFear(fear)
  }

  const generateGrowthSuggestions = async (fear: any) => {
    try {
      const response = await fetch('/api/focus-enhancer/fear-growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fear })
      })

      if (!response.ok) {
        throw new Error('Failed to generate growth suggestions')
      }

      const data = await response.json()
      
      // Add growth suggestions to dynamic suggestions
      setDynamicSuggestions(prev => [...prev, ...data.suggestions])
      
      // Update fear with growth opportunity
      setUserFears(prev => prev.map(f => 
        f.id === fear.id 
          ? { ...f, growthOpportunity: data.growthOpportunity, suggestions: data.suggestions }
          : f
      ))
    } catch (error) {
      console.error('Error generating growth suggestions:', error)
      alert('Failed to generate growth suggestions. Please try again.')
    }
  }

  const saveCurrentAnalysis = async () => {
    setSavingAnalysis(true)
    try {
      const analysisSummary = {
        timestamp: new Date().toISOString(),
        appUsage,
        therapeuticInsights,
        conversation,
        dynamicSuggestions,
        userFears,
        suggestedHabits,
        suggestedProjects,
        totalScreenTime: appUsage.reduce((sum, app) => sum + app.hours, 0),
        problematicAppsCount: appUsage.filter(app => app.isProblematic).length
      }

      const response = await fetch('/api/focus-enhancer/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisSummary })
      })

      if (!response.ok) {
        throw new Error('Failed to save analysis')
      }

      const data = await response.json()
      setSavedAnalyses(prev => [data.savedAnalysis, ...prev])
      alert('Analysis saved successfully!')
    } catch (error) {
      console.error('Error saving analysis:', error)
      alert('Failed to save analysis. Please try again.')
    } finally {
      setSavingAnalysis(false)
    }
  }

  const loadSavedAnalyses = async () => {
    try {
      const response = await fetch('/api/focus-enhancer/saved-analyses')
      if (!response.ok) {
        throw new Error('Failed to load saved analyses')
      }
      const data = await response.json()
      setSavedAnalyses(data.analyses || [])
      setShowSavedAnalyses(true)
    } catch (error) {
      console.error('Error loading saved analyses:', error)
      alert('Failed to load saved analyses. Please try again.')
    }
  }

  const loadSavedAnalysis = (analysis: any) => {
    setAppUsage(analysis.appUsage || [])
    setTherapeuticInsights(analysis.therapeuticInsights || [])
    setConversation(analysis.conversation || [])
    setDynamicSuggestions(analysis.dynamicSuggestions || [])
    setUserFears(analysis.userFears || [])
    setSuggestedHabits(analysis.suggestedHabits || [])
    setSuggestedProjects(analysis.suggestedProjects || [])
    setShowInsights(true)
    if (analysis.userFears && analysis.userFears.length > 0) {
      setShowFearExercise(true)
    }
    setShowSavedAnalyses(false)
  }

  const generateBenchmark = async () => {
    try {
      const response = await fetch('/api/focus-enhancer/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentAnalysis: {
            appUsage,
            totalScreenTime: appUsage.reduce((sum, app) => sum + app.hours, 0),
            problematicAppsCount: appUsage.filter(app => app.isProblematic).length
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate benchmark')
      }

      const data = await response.json()
      setBenchmarkData(data.benchmark)
      setShowBenchmark(true)
    } catch (error) {
      console.error('Error generating benchmark:', error)
      alert('Failed to generate benchmark. Please try again.')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        {/* Navigation */}
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/modules">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Life Hacks
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <Target className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <Brain className="h-8 w-8 mr-3 text-purple-600" />
              Focus Enhancer
            </h1>
            <p className="text-gray-600">
              Upload your screen time summary to get AI-powered insights about your app usage patterns 
              and therapeutic guidance for healthier digital habits.
            </p>
          </div>
          <div className="flex space-x-2">
            {(appUsage.length > 0 || conversation.length > 0) && (
              <Button 
                onClick={saveCurrentAnalysis}
                disabled={savingAnalysis}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {savingAnalysis ? 'Saving...' : 'Save Analysis'}
              </Button>
            )}
            {appUsage.length > 0 && (
              <Button 
                onClick={generateBenchmark}
                variant="outline"
              >
                <Target className="h-4 w-4 mr-2" />
                Benchmark
              </Button>
            )}
            <Button 
              onClick={loadSavedAnalyses}
              variant="outline"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Saved Analyses
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      {!uploadedImage && (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center mb-8">
          <FileImage className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload Your Screen Time Summary
          </h3>
          <p className="text-gray-600 mb-4">
            Take a screenshot of your phone's screen time summary (Settings → Screen Time → See All Activity) 
            and upload it here for analysis.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Screenshot
          </Button>
        </div>
      )}

      {/* Analysis Progress */}
      {analyzing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <Brain className="h-6 w-6 text-blue-600 mr-3 animate-pulse" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Analyzing Your Screen Time</h3>
              <p className="text-blue-700">
                Our AI is examining your app usage patterns and identifying areas for focus improvement...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* App Usage Analysis */}
      {appUsage.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Smartphone className="h-6 w-6 mr-2 text-blue-600" />
            App Usage Analysis
          </h2>
          
          <div className="space-y-4">
            {appUsage.map((app, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                app.isProblematic 
                  ? 'bg-red-50 border-red-400' 
                  : 'bg-green-50 border-green-400'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{app.appName}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{app.hours}h/day</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      app.isProblematic 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {app.category}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{app.insights}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Therapeutic Insights */}
      {therapeuticInsights.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Heart className="h-6 w-6 mr-2 text-pink-600" />
            Therapeutic Insights
          </h2>
          
          <div className="space-y-4">
            {therapeuticInsights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                insight.severity === 'high' ? 'border-red-200 bg-red-50' :
                insight.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 capitalize">{insight.type}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    insight.severity === 'high' ? 'bg-red-100 text-red-800' :
                    insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {insight.severity} priority
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {insight.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start">
                      <ArrowRight className="h-3 w-3 mr-2 mt-1 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Therapeutic Conversation */}
      {showInsights && conversation.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <MessageCircle className="h-6 w-6 mr-2 text-green-600" />
            Therapeutic Conversation
          </h2>
          
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {conversation.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-purple-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={currentConversation}
              onChange={(e) => setCurrentConversation(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Share your thoughts..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={sendingMessage}
            />
            <Button 
              onClick={sendMessage} 
              disabled={sendingMessage || !currentConversation.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {sendingMessage ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      )}

      {/* Real-time Dynamic Suggestions */}
      {dynamicSuggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-purple-500">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Brain className="h-6 w-6 mr-2 text-purple-600 animate-pulse" />
            Live Suggestions from Our Conversation
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            These suggestions are generated in real-time based on our therapeutic conversation.
          </p>
          <div className="space-y-3">
            {dynamicSuggestions.map((suggestion, index) => (
              <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {suggestion.type}
                    </span>
                  </div>
                  <Button 
                    onClick={() => addToDashboard(suggestion.type === 'goal' ? 'habit' : suggestion.type, suggestion)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {suggestion.type === 'goal' ? 'Add Habit' : `Add ${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}`}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fear Management Exercise */}
      {showFearExercise && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-red-500">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Heart className="h-6 w-6 mr-2 text-red-600" />
            "Fears to Growth" Method
          </h2>
          <p className="text-gray-600 mb-6">
            Let's work through your fears systematically and transform them into growth opportunities. 
            This exercise will help you understand your fears better and create actionable goals to overcome them.
          </p>

          {/* Fear Entry Form */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add a Fear to Work Through</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fear Description</label>
                <input
                  type="text"
                  value={fearDetails.name}
                  onChange={(e) => setFearDetails(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Fear of failure, fear of rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity (1-10)</label>
                <select
                  value={fearDetails.severity}
                  onChange={(e) => setFearDetails(prev => ({ ...prev, severity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">1-3 (Low)</option>
                  <option value="medium">4-6 (Medium)</option>
                  <option value="high">7-8 (High)</option>
                  <option value="extreme">9-10 (Extreme)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={fearDetails.category}
                  onChange={(e) => setFearDetails(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Category</option>
                  <option value="Health & Addiction">Health & Addiction</option>
                  <option value="Relationships & Trust">Relationships & Trust</option>
                  <option value="Finance & Work">Finance & Work</option>
                  <option value="Identity & Self-Worth">Identity & Self-Worth</option>
                  <option value="Family & Responsibility">Family & Responsibility</option>
                  <option value="Purpose & Creativity">Purpose & Creativity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Associated Person/Context</label>
                <input
                  type="text"
                  value={fearDetails.triggers}
                  onChange={(e) => setFearDetails(prev => ({ ...prev, triggers: e.target.value }))}
                  placeholder="e.g., Work situations, family interactions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Coping Actions</label>
                <textarea
                  value={fearDetails.description}
                  onChange={(e) => setFearDetails(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What do you currently do to cope with this fear? (e.g., avoid situations, exercise, talk to friends...)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Consequences & Impact</label>
                <textarea
                  value={fearDetails.impact}
                  onChange={(e) => setFearDetails(prev => ({ ...prev, impact: e.target.value }))}
                  placeholder="What issues does this fear cause or could cause? (emotional, relational, financial, etc.)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <Button 
              onClick={addFearToList}
              disabled={!fearDetails.name.trim()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Fear to Work Through
            </Button>
          </div>

          {/* User's Fears List */}
          {userFears.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Fears List ({userFears.length})</h3>
              <div className="space-y-4">
                {userFears.map((fear) => (
                  <div key={fear.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">{fear.name}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            fear.severity === 'extreme' ? 'bg-red-100 text-red-800' :
                            fear.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            fear.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {fear.severity} severity
                          </span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {fear.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{fear.description}</p>
                        {fear.impact && (
                          <p className="text-sm text-red-600 mb-2">
                            <strong>Impact:</strong> {fear.impact}
                          </p>
                        )}
                        {fear.triggers && (
                          <p className="text-sm text-gray-500">
                            <strong>Triggers:</strong> {fear.triggers}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => startFearDetails(fear)}
                        size="sm"
                        variant="outline"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Work Through This Fear
                      </Button>
                      <Button 
                        onClick={() => generateGrowthSuggestions(fear)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Generate Growth Goals
                      </Button>
                    </div>

                    {/* Fear Details Modal */}
                    {currentFear && currentFear.id === fear.id && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="font-medium text-gray-900 mb-3">Deep Dive Analysis</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Strategic Decision Planning</label>
                            <textarea
                              placeholder="What decisions or strategies do you need to address this fear? What preventive or restorative actions can you take?"
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Growth Opportunity</label>
                            <textarea
                              placeholder="How can you transform this fear into a growth opportunity? What positive outcome could come from facing this fear?"
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-3">
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                            Save Analysis
                          </Button>
                          <Button 
                            onClick={() => setCurrentFear(null)}
                            size="sm" 
                            variant="outline"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Growth Suggestions */}
                    {fear.suggestions && fear.suggestions.length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <h5 className="font-medium text-gray-900 mb-3">Growth Goals Generated</h5>
                        <div className="space-y-2">
                          {fear.suggestions.map((suggestion: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div>
                                <span className="font-medium">{suggestion.title}</span>
                                <span className="ml-2 text-sm text-gray-600">({suggestion.points} points)</span>
                              </div>
                              <Button 
                                onClick={() => addToDashboard(suggestion.type === 'goal' ? 'habit' : suggestion.type, suggestion)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {suggestion.type === 'goal' ? 'Add Habit' : `Add ${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}`}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggested Improvements */}
      {(suggestedGoals.length > 0 || suggestedHabits.length > 0 || suggestedProjects.length > 0) && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Target className="h-6 w-6 mr-2 text-orange-600" />
            Suggested Focus Improvements
          </h2>
          
          <div className="space-y-6">
            {/* Healthy Habits */}
            {(suggestedHabits.length > 0 || suggestedGoals.length > 0) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-blue-600" />
                  Healthy Digital Habits
                </h3>
                <div className="space-y-3">
                  {/* Convert goals to habits */}
                  {suggestedGoals.map((goal, index) => (
                    <div key={`goal-${index}`} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{goal.title}</h4>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                          <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            Daily Habit
                          </span>
                        </div>
                        <Button 
                          onClick={() => addToDashboard('habit', { ...goal, points_value: goal.target_points || 50 })}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Add Habit
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Regular habits */}
                  {suggestedHabits.map((habit, index) => (
                    <div key={`habit-${index}`} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{habit.title}</h4>
                          <p className="text-sm text-gray-600">{habit.description}</p>
                          <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            Daily Habit
                          </span>
                        </div>
                        <Button 
                          onClick={() => addToDashboard('habit', habit)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Add Habit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Focus Projects */}
            {suggestedProjects.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2 text-purple-600" />
                  Focus Projects
                </h3>
                <div className="space-y-3">
                  {suggestedProjects.map((project, index) => (
                    <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{project.title}</h4>
                          <p className="text-sm text-gray-600">{project.description}</p>
                          <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            Multi-week Project
                          </span>
                        </div>
                        <Button 
                          onClick={() => addToDashboard('project', project)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Add Project
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Analyses */}
      {showSavedAnalyses && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
            Saved Analyses ({savedAnalyses.length})
          </h2>
          <p className="text-gray-600 mb-4">
            Your previous focus enhancer analyses with timestamps and progress tracking.
          </p>
          <div className="space-y-3">
            {savedAnalyses.map((analysis, index) => (
              <div key={analysis.id} className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Analysis from {new Date(analysis.timestamp).toLocaleDateString()}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {analysis.totalScreenTime?.toFixed(1)}h total • {analysis.problematicAppsCount} problematic apps • {analysis.conversation?.length || 0} conversation messages
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(analysis.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => loadSavedAnalysis(analysis)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Load
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {savedAnalyses.length === 0 && (
            <p className="text-gray-500 text-center py-4">No saved analyses yet. Complete an analysis and save it to track your progress.</p>
          )}
        </div>
      )}

      {/* Benchmark Results */}
      {showBenchmark && benchmarkData && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-green-500">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
            Usage Benchmark Results
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Current Total Screen Time</h3>
              <p className="text-2xl font-bold text-blue-600">{benchmarkData.currentTotalHours?.toFixed(1)}h</p>
              <p className="text-sm text-gray-600">Today</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Average Screen Time</h3>
              <p className="text-2xl font-bold text-green-600">{benchmarkData.averageTotalHours?.toFixed(1)}h</p>
              <p className="text-sm text-gray-600">Historical Average</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Trend</h3>
              <p className={`text-2xl font-bold ${benchmarkData.trend === 'improving' ? 'text-green-600' : benchmarkData.trend === 'declining' ? 'text-red-600' : 'text-gray-600'}`}>
                {benchmarkData.trend === 'improving' ? '↓ Improving' : benchmarkData.trend === 'declining' ? '↑ Increasing' : '→ Stable'}
              </p>
              <p className="text-sm text-gray-600">vs Previous</p>
            </div>
          </div>

          {benchmarkData.appComparisons && benchmarkData.appComparisons.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">App Usage Comparison</h3>
              <div className="space-y-3">
                {benchmarkData.appComparisons.map((app: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{app.appName}</span>
                        <span className="ml-2 text-sm text-gray-600">
                          {app.currentHours?.toFixed(1)}h today
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${app.change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {app.change >= 0 ? '+' : ''}{app.change?.toFixed(1)}h
                        </span>
                        <p className="text-xs text-gray-500">vs average</p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${app.change >= 0 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, Math.abs(app.change) * 20)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {benchmarkData.insights && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Benchmark Insights</h3>
              <p className="text-sm text-gray-700">{benchmarkData.insights}</p>
            </div>
          )}
        </div>
      )}

      {/* Feature Suggestions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <Lightbulb className="h-6 w-6 mr-2 text-yellow-600" />
          Help Improve Life Stacks
        </h2>
        <p className="text-gray-600 mb-4">
          Is there an app or feature you wish Life Stacks had to better support your focus and productivity? 
          Let us know and we'll consider building it!
        </p>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Describe a feature or app you'd like to see..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                suggestFeature(e.currentTarget.value)
                e.currentTarget.value = ''
              }
            }}
          />
          <p className="text-xs text-gray-500">
            Press Enter to submit your suggestion
          </p>
        </div>
      </div>
    </div>
  )
}
