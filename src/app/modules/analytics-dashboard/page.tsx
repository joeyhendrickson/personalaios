'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  Target,
  CheckCircle,
  Activity,
  Calendar,
  BarChart3,
  Brain,
  Zap,
  Award,
  AlertCircle,
  Loader2,
  RefreshCw,
  Star,
  TrendingDown,
  Users,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AnalyticsSummary {
  totalPoints: number
  completedTasks: number
  completedProjects: number
  completedHabits: number
  activeProjects: number
  habitCompletionRate: number
  taskCompletionRate: number
  projectCompletionRate: number
  averagePointsPerDay: number
  streakDays: number
  categoryBreakdown: Array<{
    category: string
    points: number
    percentage: number
  }>
  recentAccomplishments: Array<{
    title: string
    points: number
    date: string
    type: string
  }>
  weeklyProgress: Array<{
    week: string
    points: number
    tasksCompleted: number
  }>
}

interface AIInsights {
  overallProgress: string
  strengths: string[]
  areasForImprovement: string[]
  actionableRecommendations: string[]
  goalAlignment: string
  productivityScore: number
  nextSteps: string[]
}

export default function AnalyticsDashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics/summary')
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const analyzeWithAI = async () => {
    setAnalyzingWithAI(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics/ai-insights', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI insights')
      }

      const data = await response.json()
      setAiInsights(data)
    } catch (err) {
      console.error('Error generating AI insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setAnalyzingWithAI(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/modules">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Life Hacks
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <BarChart3 className="h-8 w-8 mr-3 text-purple-600" />
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  Deep insights into your productivity, habits, and progress toward goals
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button onClick={fetchAnalytics} variant="outline" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={analyzeWithAI}
                disabled={analyzingWithAI}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {analyzingWithAI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    AI Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="container mx-auto px-6 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {analytics && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Total Points</p>
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.totalPoints.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {(analytics.averagePointsPerDay || 0).toFixed(1)} pts/day
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Completed Tasks</p>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.completedTasks}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(analytics.taskCompletionRate || 0).toFixed(1)}% completion rate
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Habit Streaks</p>
                  <Zap className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.completedHabits}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(analytics.habitCompletionRate || 0).toFixed(1)}% completion rate
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Active Projects</p>
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.activeProjects}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.completedProjects} completed
                </p>
              </div>
            </div>

            {/* AI Insights Section */}
            {aiInsights && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-8 shadow-lg">
                <div className="flex items-center mb-6">
                  <Brain className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      AI Insights & Recommendations
                    </h2>
                    <p className="text-sm text-gray-600">
                      Powered by AI analysis of your complete activity data
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Productivity Score */}
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Award className="h-5 w-5 mr-2 text-purple-600" />
                      Productivity Score
                    </h3>
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="#E5E7EB"
                            strokeWidth="12"
                            fill="none"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="#9333EA"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${(aiInsights.productivityScore / 100) * 351.86} 351.86`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-bold text-gray-900">
                            {aiInsights.productivityScore}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-sm text-gray-600">
                      {aiInsights.overallProgress}
                    </p>
                  </div>

                  {/* Goal Alignment */}
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Target className="h-5 w-5 mr-2 text-blue-600" />
                      Goal Alignment
                    </h3>
                    <p className="text-gray-700">{aiInsights.goalAlignment}</p>
                  </div>
                </div>

                {/* Strengths */}
                <div className="mt-6 bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Your Strengths
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiInsights.strengths.map((strength, index) => (
                      <div
                        key={index}
                        className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-800">{strength}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Areas for Improvement */}
                <div className="mt-6 bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingDown className="h-5 w-5 mr-2 text-orange-600" />
                    Areas for Improvement
                  </h3>
                  <div className="space-y-3">
                    {aiInsights.areasForImprovement.map((area, index) => (
                      <div
                        key={index}
                        className="flex items-start p-3 bg-orange-50 border border-orange-200 rounded-lg"
                      >
                        <AlertCircle className="h-5 w-5 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-800">{area}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actionable Recommendations */}
                <div className="mt-6 bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-purple-600" />
                    Actionable Recommendations
                  </h3>
                  <div className="space-y-3">
                    {aiInsights.actionableRecommendations.map((recommendation, index) => (
                      <div
                        key={index}
                        className="flex items-start p-4 bg-purple-50 border border-purple-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-800 flex-1">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next Steps */}
                <div className="mt-6 bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-blue-600" />
                    Your Next Steps
                  </h3>
                  <div className="space-y-2">
                    {aiInsights.nextSteps.map((step, index) => (
                      <div key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-1 flex-shrink-0" />
                        <p className="text-sm text-gray-800">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Progress Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Calendar className="h-6 w-6 mr-2 text-blue-600" />
                Weekly Progress
              </h3>
              <div className="space-y-4">
                {(analytics.weeklyProgress || []).map((week, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{week.week}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{week.tasksCompleted} tasks</span>
                        <span className="text-sm font-bold text-purple-600">{week.points} pts</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((week.points / Math.max(...(analytics.weeklyProgress?.map((w) => w.points) || [1]))) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2 text-indigo-600" />
                Category Breakdown
              </h3>
              <div className="space-y-4">
                {(analytics.categoryBreakdown || []).map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{category.category}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                          {(category.percentage || 0).toFixed(1)}%
                        </span>
                        <span className="text-sm font-bold text-indigo-600">
                          {category.points} pts
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Accomplishments */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Award className="h-6 w-6 mr-2 text-yellow-600" />
                Recent Accomplishments
              </h3>
              <div className="space-y-3">
                {(analytics.recentAccomplishments || []).map((accomplishment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Award className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{accomplishment.title}</p>
                        <p className="text-xs text-gray-600">
                          {accomplishment.type} •{' '}
                          {new Date(accomplishment.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">
                      +{accomplishment.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completion Rates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h4 className="text-sm font-medium text-gray-600 mb-4">Task Completion</h4>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-green-600">
                      {(analytics.taskCompletionRate || 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                    <div
                      style={{ width: `${analytics.taskCompletionRate || 0}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h4 className="text-sm font-medium text-gray-600 mb-4">Habit Completion</h4>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-orange-600">
                      {(analytics.habitCompletionRate || 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                    <div
                      style={{ width: `${analytics.habitCompletionRate || 0}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500 transition-all duration-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h4 className="text-sm font-medium text-gray-600 mb-4">Goal Completion</h4>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {(analytics.projectCompletionRate || 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                    <div
                      style={{ width: `${analytics.projectCompletionRate || 0}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action for AI Analysis */}
            {!aiInsights && (
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white text-center">
                <Brain className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Get AI-Powered Insights</h3>
                <p className="text-purple-100 mb-6">
                  Let AI analyze your complete activity data and provide personalized
                  recommendations for improving your productivity and reaching your goals faster.
                </p>
                <Button
                  onClick={analyzeWithAI}
                  disabled={analyzingWithAI}
                  className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-8 py-3"
                >
                  {analyzingWithAI ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Analyzing Your Data...
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5 mr-2" />
                      Generate AI Analysis
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
