'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Sparkles } from 'lucide-react'

type SessionRow = {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  completion_status: 'in_progress' | 'completed' | 'aborted'
  stress_level: number | null
  rumination_level: number | null
}

export default function NarrativeIntegrationDashboardPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const completedCount = useMemo(
    () => sessions.filter((s) => s.completion_status === 'completed').length,
    [sessions]
  )
  const avg = useMemo(() => {
    const recent = sessions.slice(0, 7)
    const stressVals = recent
      .map((s) => s.stress_level)
      .filter((v): v is number => typeof v === 'number')
    const rumVals = recent
      .map((s) => s.rumination_level)
      .filter((v): v is number => typeof v === 'number')
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
    return {
      stress: mean(stressVals),
      rumination: mean(rumVals),
    }
  }, [sessions])

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/modules/narrative-integration/sessions', { method: 'GET' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to load sessions')
        setSessions(json.sessions || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const createSession = async () => {
    try {
      setCreating(true)
      setError(null)
      const res = await fetch('/api/modules/narrative-integration/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to create session')
      window.location.href = `/modules/narrative-integration/${json.session.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/modules">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors h-9 rounded-md px-3 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Modules
                </button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-blue-600" />I Am Present
                </h1>
                <p className="text-sm text-gray-600">Make peace with the past</p>
              </div>
            </div>

            <button
              onClick={createSession}
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creating ? 'Starting…' : 'New Session'}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-600 mb-1">Sessions</p>
            <p className="text-2xl font-semibold text-gray-900">{sessions.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-semibold text-gray-900">{completedCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-600 mb-1">Design intent</p>
            <p className="text-sm text-gray-700">
              Fewer loops over time. You’ll be guided toward meaning, grounding, and a next action.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5 lg:col-span-3">
            <p className="text-sm text-gray-600 mb-1">Recent trend (last 7 sessions)</p>
            <p className="text-sm text-gray-800">
              Average stress:{' '}
              <span className="font-medium">{avg.stress ? avg.stress.toFixed(1) : '–'}</span> / 10 ·
              Average rumination:{' '}
              <span className="font-medium">
                {avg.rumination ? avg.rumination.toFixed(1) : '–'}
              </span>{' '}
              / 10
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Goal: these numbers should drift down over time, and sessions should cluster less
              around the same event.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Your sessions</h2>
            <p className="text-sm text-gray-600">
              Open one to continue, or start a new session for a different loop.
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No sessions yet. Click “New Session” to begin.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sessions.map((s) => (
                <li key={s.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <Link href={`/modules/narrative-integration/${s.id}`} className="block">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {s.title || 'I Am Present Session'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Updated {new Date(s.updated_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                          {s.completion_status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-600">
                          Stress {s.stress_level ?? '–'} / Rumination {s.rumination_level ?? '–'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
