'use client'

import { useMemo, useState } from 'react'

export default function SessionSummary(props: {
  session: {
    id: string
    current_phase: string
    completion_status: 'in_progress' | 'completed' | 'aborted'
  } & Record<string, any>
  onRefresh: () => void
}) {
  const visible = useMemo(
    () => props.session.current_phase === 'closure_summary',
    [props.session.current_phase]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<any>(null)

  if (!visible) return null

  const generate = async () => {
    try {
      setSaving(true)
      setError(null)
      const res = await fetch(
        `/api/modules/narrative-integration/sessions/${props.session.id}/summary`,
        {
          method: 'POST',
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to generate summary')
      setSummary(json.summary)
      props.onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate summary')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">Closure summary</h2>
        <p className="text-sm text-gray-600">
          This is the “Rumination Exit Protocol.” The goal is to reduce revisiting today and return
          to action.
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
          {error}
        </div>
      )}

      <button
        onClick={generate}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Generating…' : 'Generate Narrative Integration Summary'}
      </button>

      {summary && (
        <div className="mt-5 border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-900 space-y-3">
          <div>
            <p className="font-medium">Event summary</p>
            <p className="text-gray-700">{summary.event_brief}</p>
          </div>
          <div>
            <p className="font-medium">Meaning</p>
            <p className="text-gray-700">{summary.meaning_statement}</p>
          </div>
          <div>
            <p className="font-medium">Lesson</p>
            <p className="text-gray-700">{summary.lesson_learned}</p>
          </div>
          <div>
            <p className="font-medium">Belief update</p>
            <p className="text-gray-700">
              Old: {summary.old_belief || '—'} {'  '}
              New: {summary.updated_belief || '—'}
            </p>
          </div>
          <div>
            <p className="font-medium">Present grounding</p>
            <p className="text-gray-700">{summary.gratitude_or_grounding_statement}</p>
          </div>
          <div>
            <p className="font-medium">Future action</p>
            <p className="text-gray-700">{summary.future_action}</p>
          </div>
          <div className="pt-2 border-t border-gray-200">
            <p className="font-medium">Revisit guidance</p>
            <p className="text-gray-700">{summary.revisit_guidance}</p>
          </div>
        </div>
      )}
    </div>
  )
}
