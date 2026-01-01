'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Sparkles,
  Target,
  Eye,
  Calendar,
  Trash2,
  Plus,
  CheckCircle,
  Loader2,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SavedSession {
  id: string
  assessment_data: {
    goals_generated?: Array<{
      goal: string
      category: string
      priority: string
      timeline: string
    }>
    vision_statement?: string
    personality_traits?: string[]
    dreams_discovered?: string[]
    executive_skills?: any
    executive_blocking_factors?: any
    personality_question_index?: number
  }
  completed_at: string | null
  created_at: string
}

export default function SavedDreamsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autofilling, setAutofilling] = useState<string | null>(null)

  useEffect(() => {
    fetchSavedSessions()
  }, [])

  const fetchSavedSessions = async () => {
    try {
      const response = await fetch('/api/modules/dream-catcher/saved')
      if (!response.ok) {
        throw new Error('Failed to fetch saved sessions')
      }
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved dreams')
    } finally {
      setLoading(false)
    }
  }

  const handleAutofill = async (sessionId: string, goals: any[]) => {
    setAutofilling(sessionId)
    try {
      const response = await fetch('/api/modules/dream-catcher/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals,
          is_new_user: false, // Always append for saved sessions
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to autofill dashboard')
      }

      const data = await response.json()
      alert(`Successfully added ${data.goals_added} goals to your dashboard!`)
      router.push('/dashboard?autofilled=true')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to autofill dashboard')
    } finally {
      setAutofilling(null)
    }
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this saved dream session?')) return

    try {
      const response = await fetch(`/api/modules/dream-catcher/saved/${sessionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete session')
      }

      setSessions(sessions.filter((s) => s.id !== sessionId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete session')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your saved dreams...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/modules/dream-catcher">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dream Catcher
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black flex items-center">
                  <Sparkles className="h-8 w-8 mr-3 text-purple-600" />
                  Your Saved Dreams
                </h1>
                <p className="text-sm text-gray-600">
                  View and manage your saved Dream Catcher sessions
                </p>
              </div>
            </div>
            <Link href="/modules/dream-catcher">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                New Journey
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {sessions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Dreams Yet</h3>
              <p className="text-gray-600 mb-6">
                Complete a Dream Catcher journey and save it to see it here.
              </p>
              <Link href="/modules/dream-catcher">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Start Dream Catcher Journey
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Dream Catcher Session
                        {session.assessment_data.goals_generated &&
                        session.assessment_data.goals_generated.length > 0 ? (
                          <span className="ml-2 text-sm font-normal text-green-600">
                            <CheckCircle className="h-4 w-4 inline mr-1" />
                            Completed
                          </span>
                        ) : (
                          <span className="ml-2 text-sm font-normal text-blue-600">
                            In Progress
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {session.completed_at
                          ? new Date(session.completed_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : new Date(session.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(session.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {session.assessment_data.vision_statement && (
                    <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-start space-x-2">
                        <Eye className="h-4 w-4 text-purple-600 mt-0.5" />
                        <p className="text-sm text-gray-700 italic line-clamp-2">
                          "{session.assessment_data.vision_statement}"
                        </p>
                      </div>
                    </div>
                  )}

                  {session.assessment_data.goals_generated && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {session.assessment_data.goals_generated.length} Goals Generated
                      </p>
                      <div className="space-y-1">
                        {session.assessment_data.goals_generated.slice(0, 3).map((goal, i) => (
                          <div key={i} className="text-xs text-gray-600 flex items-center">
                            <Target className="h-3 w-3 mr-1 text-purple-600" />
                            <span className="truncate">{goal.goal}</span>
                          </div>
                        ))}
                        {session.assessment_data.goals_generated.length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{session.assessment_data.goals_generated.length - 3} more goals
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {/* Continue button - show if session is incomplete */}
                    {(!session.assessment_data.goals_generated ||
                      session.assessment_data.goals_generated.length === 0) && (
                      <Button
                        onClick={() =>
                          router.push(`/modules/dream-catcher?sessionId=${session.id}`)
                        }
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                        size="sm"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Continue
                      </Button>
                    )}
                    {/* Autofill button - only show if goals exist */}
                    {session.assessment_data.goals_generated &&
                      session.assessment_data.goals_generated.length > 0 && (
                        <Button
                          onClick={() =>
                            handleAutofill(
                              session.id,
                              session.assessment_data.goals_generated || []
                            )
                          }
                          disabled={autofilling === session.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          {autofilling === session.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Target className="h-4 w-4 mr-2" />
                              Add to Dashboard
                            </>
                          )}
                        </Button>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
