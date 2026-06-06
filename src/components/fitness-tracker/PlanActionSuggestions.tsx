'use client'

import { useState } from 'react'
import { Check, ListChecks, Loader2, Plus, Repeat, Sparkles } from 'lucide-react'

type Suggestion = { title: string; description: string }

export default function PlanActionSuggestions(props: {
  planType: 'nutrition' | 'workout'
  plan: Record<string, unknown>
}) {
  const { planType, plan } = props

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [habits, setHabits] = useState<Suggestion[]>([])
  const [tasks, setTasks] = useState<Suggestion[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [added, setAdded] = useState<Record<string, boolean>>({})

  const fetchSuggestions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/fitness/suggest-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: planType, plan }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || 'Could not generate suggestions.')
        return
      }
      setHabits(Array.isArray(json.habits) ? json.habits : [])
      setTasks(Array.isArray(json.tasks) ? json.tasks : [])
      setLoaded(true)
    } catch {
      setError('Could not generate suggestions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addHabit = async (s: Suggestion, key: string) => {
    setBusyKey(key)
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: s.title, description: s.description }),
      })
      if (res.ok) setAdded((p) => ({ ...p, [key]: true }))
      else setError('Could not add habit to dashboard.')
    } catch {
      setError('Could not add habit to dashboard.')
    } finally {
      setBusyKey(null)
    }
  }

  const addTask = async (s: Suggestion, key: string) => {
    setBusyKey(key)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: s.title, description: s.description, category: 'health' }),
      })
      if (res.ok) setAdded((p) => ({ ...p, [key]: true }))
      else setError('Could not add task to dashboard.')
    } catch {
      setError('Could not add task to dashboard.')
    } finally {
      setBusyKey(null)
    }
  }

  const Row = (props: { s: Suggestion; keyId: string; onAdd: () => void }) => {
    const isAdded = added[props.keyId]
    const isBusy = busyKey === props.keyId
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{props.s.title}</p>
          {props.s.description && <p className="text-xs text-gray-500">{props.s.description}</p>}
        </div>
        <button
          type="button"
          onClick={props.onAdd}
          disabled={isAdded || isBusy}
          className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
            isAdded
              ? 'bg-green-100 text-green-800'
              : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'
          }`}
        >
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isAdded ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {isAdded ? 'Added' : 'Add'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t pt-4">
      {!loaded ? (
        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Suggest Habits & Tasks
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Suggested for your dashboard
            </h5>
            <button
              type="button"
              onClick={fetchSuggestions}
              disabled={loading}
              className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
            >
              {loading ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>

          {habits.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                <Repeat className="h-3.5 w-3.5" /> Habits
              </p>
              <div className="space-y-2">
                {habits.map((s, i) => {
                  const key = `h-${i}`
                  return <Row key={key} s={s} keyId={key} onAdd={() => addHabit(s, key)} />
                })}
              </div>
            </div>
          )}

          {tasks.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                <ListChecks className="h-3.5 w-3.5" /> Tasks
              </p>
              <div className="space-y-2">
                {tasks.map((s, i) => {
                  const key = `t-${i}`
                  return <Row key={key} s={s} keyId={key} onAdd={() => addTask(s, key)} />
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
