'use client'

import { useMemo, useState } from 'react'

const categories = [
  'Self-knowledge',
  'Boundaries',
  'Discernment',
  'Strength',
  'Values',
  'Relationships',
  'Human nature',
  'Spiritual/existential meaning',
  'Life direction',
  'Compassion',
  'Agency',
]

export default function MeaningCards(props: {
  session: {
    id: string
    meaning_statement: string | null
    current_phase: string
    safety_status: string
  }
  disabled: boolean
  onRefresh: () => void
}) {
  const [category, setCategory] = useState<string>(categories[0])
  const [meaning, setMeaning] = useState(props.session.meaning_statement || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(() => {
    const p = props.session.current_phase
    return (
      p === 'meaning_making' ||
      p === 'present_grounding' ||
      p === 'future_reorientation' ||
      p === 'closure_summary'
    )
  }, [props.session.current_phase])

  if (!visible) return null

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      const res = await fetch(
        `/api/modules/narrative-integration/sessions/${props.session.id}/meaning`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            final_meaning_statement: meaning,
            user_selected_meaning: meaning,
            user_edited: true,
            confidence_level: 7,
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to save meaning')
      props.onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save meaning')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">Meaning-making</h2>
        <p className="text-sm text-gray-600">
          Choose a lens; write a meaning statement in your own words. No forced positivity.
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-900">Meaning category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={props.disabled}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Tip: If you feel stuck, pick the closest category and write one honest sentence.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-900">Meaning statement</label>
          <textarea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            disabled={props.disabled}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={4}
            placeholder="e.g., 'This taught me what I value and where my boundaries need to be.'"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={save}
          disabled={props.disabled || saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Meaning'}
        </button>
      </div>
    </div>
  )
}
