'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  Plus,
  X,
  Loader2,
  Sparkles,
  Target,
  CheckCircle2,
  TrendingUp,
  Footprints,
} from 'lucide-react'

type FearGoal = {
  goal: string
  category?: string
  timeline?: string
  priority?: 'low' | 'medium' | 'high'
}

type FearAnalysisItem = {
  fear: string
  actions: string[]
  benefits: string[]
  goals: FearGoal[]
}

type FearAnalysis = {
  summary: string
  fears: FearAnalysisItem[]
}

type Phase = 'collect' | 'review'

function FearCatcherContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewUser = searchParams.get('newUser') === 'true'

  const [phase, setPhase] = useState<Phase>('collect')
  const [fears, setFears] = useState<string[]>([])
  const [fearInput, setFearInput] = useState('')
  const [analysis, setAnalysis] = useState<FearAnalysis | null>(null)
  // Selected goals keyed by `${fearIndex}:${goalIndex}`
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFear = () => {
    const value = fearInput.trim()
    if (!value) return
    setFears((prev) => (prev.includes(value) ? prev : [...prev, value]))
    setFearInput('')
  }

  const removeFear = (index: number) => {
    setFears((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFearKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addFear()
    }
  }

  const goBack = () => {
    if (isNewUser) router.push('/dashboard')
    else router.push('/modules')
  }

  const analyze = async () => {
    if (fears.length === 0) {
      setError('Add at least one fear to continue.')
      return
    }
    setError(null)
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/modules/fear-catcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fears }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to analyze fears')

      const result = data.analysis as FearAnalysis
      setAnalysis(result)

      // Pre-select every suggested goal.
      const preselected = new Set<string>()
      result.fears.forEach((f, fi) => f.goals.forEach((_, gi) => preselected.add(`${fi}:${gi}`)))
      setSelectedGoals(preselected)
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleGoal = (key: string) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedFearGoals = (): FearGoal[] => {
    if (!analysis) return []
    const out: FearGoal[] = []
    analysis.fears.forEach((f, fi) =>
      f.goals.forEach((g, gi) => {
        if (selectedGoals.has(`${fi}:${gi}`)) out.push(g)
      })
    )
    return out
  }

  const addToDashboard = async () => {
    const chosen = selectedFearGoals()
    if (chosen.length === 0) {
      setError('Select at least one goal to add to your dashboard.')
      return
    }
    setError(null)
    setIsCommitting(true)
    try {
      // Reuse the onboarding autofill path so goals are committed (and supporting
      // projects/tasks/habits are generated) and onboarding is marked complete.
      const res = await fetch('/api/modules/dream-catcher/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: chosen.map((g) => ({
            goal: g.goal,
            category: g.category,
            timeline: g.timeline,
            priority: g.priority,
          })),
          vision_statement: 'Face my fears and turn them into meaningful progress.',
          dreams_discovered: fears,
          is_new_user: isNewUser,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add goals to dashboard')

      router.push('/dashboard?onboarded=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add goals. Please try again.')
      setIsCommitting(false)
    }
  }

  const selectedCount = selectedGoals.size

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-rose-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors hover:bg-gray-100 h-9 rounded-md px-3 text-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {isNewUser ? 'Skip to Dashboard' : 'Back to Modules'}
              </button>
              <div>
                <h1 className="text-3xl font-bold text-black flex items-center">
                  <Shield className="h-8 w-8 mr-3 text-indigo-600" />
                  Fear Catcher
                </h1>
                <p className="text-sm text-gray-600">
                  Name your fears, then turn facing them into goals you can act on
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {phase === 'collect' && (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-6 shadow-lg">
              <div className="flex items-start space-x-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-full">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">What are you afraid of?</h2>
                  <p className="text-sm text-gray-600">
                    List the fears holding you back — big or small. We&apos;ll help you face each
                    one, show you what you gain by overcoming it, and turn it into goals for your
                    dashboard.
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={fearInput}
                  onChange={(e) => setFearInput(e.target.value)}
                  onKeyDown={handleFearKeyDown}
                  placeholder="e.g. Fear of public speaking"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={addFear}
                  disabled={!fearInput.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add</span>
                </button>
              </div>

              {fears.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {fears.map((fear, index) => (
                    <li
                      key={`${fear}-${index}`}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-gray-800 flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-indigo-500 shrink-0" />
                        {fear}
                      </span>
                      <button
                        onClick={() => removeFear(index)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="Remove fear"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={analyze}
                disabled={fears.length === 0 || isAnalyzing}
                className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Facing your fears...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    <span>Turn My Fears Into Goals</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {phase === 'review' && analysis && (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-6 shadow-lg">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <ShieldCheck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Your plan to face them</h2>
                  <p className="text-sm text-gray-600">{analysis.summary}</p>
                </div>
              </div>
            </div>

            {analysis.fears.map((item, fi) => (
              <div
                key={`${item.fear}-${fi}`}
                className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-6 shadow-lg"
              >
                <h3 className="text-base font-bold text-gray-900 flex items-center mb-4">
                  <Shield className="h-5 w-5 mr-2 text-indigo-600 shrink-0" />
                  {item.fear}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                    <p className="text-sm font-semibold text-indigo-800 flex items-center mb-2">
                      <Footprints className="h-4 w-4 mr-2" />
                      Ways to approach it
                    </p>
                    <ul className="space-y-1.5">
                      {item.actions.map((action, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start">
                          <span className="text-indigo-500 mr-2">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                    <p className="text-sm font-semibold text-emerald-800 flex items-center mb-2">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      What you gain
                    </p>
                    <ul className="space-y-1.5">
                      {item.benefits.map((benefit, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start">
                          <span className="text-emerald-500 mr-2">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800 flex items-center mb-2">
                    <Target className="h-4 w-4 mr-2 text-purple-600" />
                    Suggested goals
                  </p>
                  <div className="space-y-2">
                    {item.goals.map((goal, gi) => {
                      const key = `${fi}:${gi}`
                      const checked = selectedGoals.has(key)
                      return (
                        <button
                          key={key}
                          onClick={() => toggleGoal(key)}
                          className={`w-full text-left flex items-start space-x-3 rounded-lg border p-3 transition-colors ${
                            checked
                              ? 'border-purple-300 bg-purple-50'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <CheckCircle2
                            className={`h-5 w-5 mt-0.5 shrink-0 ${
                              checked ? 'text-purple-600' : 'text-gray-300'
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{goal.goal}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {goal.category && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                  {goal.category}
                                </span>
                              )}
                              {goal.timeline && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                  {goal.timeline}
                                </span>
                              )}
                              {goal.priority && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                  {goal.priority} priority
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}

            <div className="sticky bottom-4 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-4 shadow-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedCount} goal{selectedCount === 1 ? '' : 's'} selected to add to your
                dashboard
              </p>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setPhase('collect')}
                  disabled={isCommitting}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  Edit fears
                </button>
                <button
                  onClick={addToDashboard}
                  disabled={isCommitting || selectedCount === 0}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors font-medium flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Adding to dashboard...</span>
                    </>
                  ) : (
                    <>
                      <Target className="h-5 w-5" />
                      <span>Add Goals to Dashboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FearCatcherPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-rose-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-gray-600">Loading Fear Catcher...</p>
          </div>
        </div>
      }
    >
      <FearCatcherContent />
    </Suspense>
  )
}
