'use client'

import { useEffect, useState } from 'react'

type Inventory = {
  event_name: string
  approximate_time_period: string
  people_involved_optional: string
  what_happened_briefly: string
  emotional_impact: string
  what_question_keeps_repeating: string
  what_belief_formed_afterward: string
  how_it_affects_life_now: string
}

export default function EventInventoryForm(props: {
  sessionId: string
  disabled: boolean
  onPhaseAdvanced?: () => void
}) {
  const [inv, setInv] = useState<Inventory>({
    event_name: '',
    approximate_time_period: '',
    people_involved_optional: '',
    what_happened_briefly: '',
    emotional_impact: '',
    what_question_keeps_repeating: '',
    what_belief_formed_afterward: '',
    how_it_affects_life_now: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(
          `/api/modules/narrative-integration/sessions/${props.sessionId}/event`
        )
        const json = await res.json()
        if (res.ok && json.event) {
          setInv({
            event_name: json.event.event_name || '',
            approximate_time_period: json.event.approximate_time_period || '',
            people_involved_optional: json.event.people_involved_optional || '',
            what_happened_briefly: json.event.what_happened_briefly || '',
            emotional_impact: json.event.emotional_impact || '',
            what_question_keeps_repeating: json.event.what_question_keeps_repeating || '',
            what_belief_formed_afterward: json.event.what_belief_formed_afterward || '',
            how_it_affects_life_now: json.event.how_it_affects_life_now || '',
          })
        }
      } finally {
        setLoaded(true)
      }
    })()
  }, [props.sessionId])

  const set =
    (k: keyof Inventory) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setInv((p) => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      const res = await fetch(
        `/api/modules/narrative-integration/sessions/${props.sessionId}/event`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inv),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to save inventory')

      await fetch(`/api/modules/narrative-integration/sessions/${props.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_phase: 'rumination_analysis' }),
      })

      props.onPhaseAdvanced?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save inventory')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">Step 2 — What happened? (briefly)</h2>
        <p className="text-sm text-gray-600">
          Keep it factual and high-level. This module is about coherence and meaning — not reliving.
        </p>
      </div>

      {props.disabled && (
        <div className="mb-4 text-sm bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
          Deep processing is paused. You can still save a short inventory, but the assistant will
          stay in stabilization/grounding mode.
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
          {error}
        </div>
      )}

      {!loaded ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-900">Event name</label>
            <input
              value={inv.event_name}
              onChange={set('event_name')}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., 'The breakup', 'The accident', 'That meeting'"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900">Approximate time period</label>
            <input
              value={inv.approximate_time_period}
              onChange={set('approximate_time_period')}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., '2019', 'last winter', 'when I was 17'"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-medium text-gray-900">People involved (optional)</label>
            <input
              value={inv.people_involved_optional}
              onChange={set('people_involved_optional')}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Names or roles (optional)"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-medium text-gray-900">What happened (briefly)</label>
            <textarea
              value={inv.what_happened_briefly}
              onChange={set('what_happened_briefly')}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="2–6 sentences. No graphic detail."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900">Emotional impact</label>
            <textarea
              value={inv.emotional_impact}
              onChange={set('emotional_impact')}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="How it felt / what it did to you emotionally."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900">
              What question keeps repeating?
            </label>
            <textarea
              value={inv.what_question_keeps_repeating}
              onChange={set('what_question_keeps_repeating')}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="What still feels unanswered?"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900">
              What belief formed afterward?
            </label>
            <textarea
              value={inv.what_belief_formed_afterward}
              onChange={set('what_belief_formed_afterward')}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="e.g., 'I’m not safe', 'People always leave', 'I’m powerless'"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900">
              How does it affect life now?
            </label>
            <textarea
              value={inv.how_it_affects_life_now}
              onChange={set('how_it_affects_life_now')}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="Where does the loop show up today?"
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save & Continue'}
        </button>
      </div>
    </div>
  )
}
