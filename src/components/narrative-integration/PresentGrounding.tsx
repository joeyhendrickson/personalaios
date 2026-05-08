'use client'

import { useMemo, useState } from 'react'

export default function PresentGrounding(props: {
  session: {
    id: string
    current_phase: string
    present_grounding_summary: string | null
    safety_status: string
  }
  disabled: boolean
  onRefresh: () => void
}) {
  const visible = useMemo(() => {
    const p = props.session.current_phase
    return p === 'present_grounding' || p === 'future_reorientation' || p === 'closure_summary'
  }, [props.session.current_phase])

  const [text, setText] = useState(props.session.present_grounding_summary || '')
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
          present_grounding_summary: text || null,
          current_phase: 'future_reorientation',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to save grounding')
      props.onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save grounding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">Present grounding</h2>
        <p className="text-sm text-gray-600">
          Even with this in your story, what’s meaningful, stable, or worth protecting today?
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
          {error}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={props.disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        rows={4}
        placeholder="What remains true about you now? What deserves your attention today?"
      />

      <div className="mt-6 flex justify-end">
        <button
          onClick={save}
          disabled={props.disabled || saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Grounding'}
        </button>
      </div>
    </div>
  )
}
