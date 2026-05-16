'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, LayoutDashboard, RefreshCw, Repeat, ListTodo } from 'lucide-react'

type DashboardRecommendation = {
  id: string
  type: 'habit' | 'task'
  title: string
  description: string
  rationale: string
  category?: string
}

export default function FutureAction(props: {
  session: {
    id: string
    current_phase: string
    future_action: string | null
    lesson_statement: string | null
    safety_status: string
  }
  disabled: boolean
  onRefresh: () => void
}) {
  const visible = useMemo(() => {
    const p = props.session.current_phase
    return p === 'future_reorientation' || p === 'closure_summary'
  }, [props.session.current_phase])

  const [lesson, setLesson] = useState(props.session.lesson_statement || '')
  const [nextAction, setNextAction] = useState(props.session.future_action || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [recommendations, setRecommendations] = useState<DashboardRecommendation[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [applying, setApplying] = useState(false)
  const [addedToDashboard, setAddedToDashboard] = useState(false)

  useEffect(() => {
    setLesson(props.session.lesson_statement || '')
    setNextAction(props.session.future_action || '')
  }, [props.session.lesson_statement, props.session.future_action])

  const loadRecommendations = useCallback(async () => {
    try {
      setLoadingRecs(true)
      setError(null)
      const res = await fetch(
        `/api/modules/narrative-integration/sessions/${props.session.id}/dashboard-recommendations`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load recommendations')
      setRecommendations(json.recommendations || [])
      setSelectedIds(new Set())
      setAddedToDashboard(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recommendations')
    } finally {
      setLoadingRecs(false)
    }
  }, [props.session.id])

  useEffect(() => {
    if (
      visible &&
      props.session.current_phase === 'future_reorientation' &&
      recommendations.length === 0
    ) {
      loadRecommendations()
    }
  }, [visible, props.session.current_phase, recommendations.length, loadRecommendations])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 3) {
        next.add(id)
      }
      return next
    })
  }

  const applySelected = async () => {
    const selected = recommendations.filter((r) => selectedIds.has(r.id))
    if (selected.length === 0) {
      setError('Select at least one habit or task to add (up to 3).')
      return
    }
    try {
      setApplying(true)
      setError(null)
      setSuccess(null)
      const res = await fetch(
        `/api/modules/narrative-integration/sessions/${props.session.id}/dashboard-recommendations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'apply', items: selected }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to add to dashboard')
      setSuccess(json.message || 'Added to your dashboard.')
      setAddedToDashboard(true)
      setSelectedIds(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add to dashboard')
    } finally {
      setApplying(false)
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      const res = await fetch(`/api/modules/narrative-integration/sessions/${props.session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_statement: lesson || null,
          future_action: nextAction || null,
          current_phase: 'closure_summary',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to save')
      props.onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!visible) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">Future reorientation</h2>
        <p className="text-sm text-gray-600">
          Return your energy to life direction: capture your lesson, choose dashboard actions from
          your meaning map, then continue.
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 text-sm bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
          {success}
        </div>
      )}

      {props.session.current_phase === 'future_reorientation' && (
        <section className="mb-6 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-blue-600" />
                Add to your dashboard
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Based on your meanings and conclusions, pick 1–3 habits or tasks to add (optional).
              </p>
            </div>
            <button
              type="button"
              onClick={loadRecommendations}
              disabled={props.disabled || loadingRecs}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRecs ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingRecs ? (
            <p className="text-sm text-gray-600">
              Generating recommendations from your meaning map…
            </p>
          ) : recommendations.length === 0 ? (
            <button
              type="button"
              onClick={loadRecommendations}
              disabled={props.disabled}
              className="text-sm text-blue-600 font-medium hover:text-blue-800"
            >
              Generate recommendations
            </button>
          ) : (
            <ul className="space-y-3">
              {recommendations.map((rec) => {
                const checked = selectedIds.has(rec.id)
                return (
                  <li key={rec.id}>
                    <label
                      className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? 'border-blue-400 bg-white ring-1 ring-blue-200'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${props.disabled || addedToDashboard ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={
                          props.disabled || addedToDashboard || (!checked && selectedIds.size >= 3)
                        }
                        onChange={() => toggleSelect(rec.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900">{rec.title}</span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                              rec.type === 'habit'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.type === 'habit' ? (
                              <Repeat className="h-3 w-3" />
                            ) : (
                              <ListTodo className="h-3 w-3" />
                            )}
                            {rec.type === 'habit' ? 'Daily habit' : 'Task'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                        <p className="text-xs text-blue-800/80 mt-1 italic">{rec.rationale}</p>
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          {recommendations.length > 0 && !addedToDashboard && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applySelected}
                disabled={props.disabled || applying || selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {applying
                  ? 'Adding…'
                  : `Add ${selectedIds.size || ''} selected to dashboard`.trim()}
              </button>
              <p className="text-xs text-gray-500 self-center">Or skip and continue below.</p>
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-900">Lesson statement</label>
          <textarea
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            disabled={props.disabled}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={4}
            placeholder="What lesson are you carrying forward?"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-900">
            One grounded next step this week
          </label>
          <textarea
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            disabled={props.disabled}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={4}
            placeholder="What will you do instead of replaying the loop?"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={save}
          disabled={props.disabled || saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Continue to Summary'}
        </button>
      </div>
    </div>
  )
}
