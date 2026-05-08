'use client'

import { useMemo, useState } from 'react'

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

  if (!visible) return null

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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">Future reorientation</h2>
        <p className="text-sm text-gray-600">
          The session ends by returning your energy to life direction and a grounded next step.
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
          {error}
        </div>
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
