'use client'

import { useEffect, useState } from 'react'
import type { NarrativeIntegrationSession } from '@/lib/narrative-integration/types'

export default function StateCheck(props: {
  session: Pick<
    NarrativeIntegrationSession,
    | 'id'
    | 'title'
    | 'event_summary'
    | 'stress_level'
    | 'rumination_level'
    | 'emotional_state'
    | 'readiness_to_process'
    | 'user_goal'
    | 'current_phase'
    | 'safety_status'
  >
  disabled?: boolean
  onUpdated: (session: any) => void
}) {
  const { session } = props
  const disabled = props.disabled ?? false
  const [eventLoop, setEventLoop] = useState(session.event_summary ?? '')
  const [stress, setStress] = useState<number>(session.stress_level ?? 5)
  const [rumination, setRumination] = useState<number>(session.rumination_level ?? 5)
  const [emotionalState, setEmotionalState] = useState(session.emotional_state ?? '')
  const [ready, setReady] = useState<boolean>(session.readiness_to_process ?? true)
  const [goal, setGoal] = useState(session.user_goal ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEventLoop(session.event_summary ?? '')
    setStress(session.stress_level ?? 5)
    setRumination(session.rumination_level ?? 5)
    setEmotionalState(session.emotional_state ?? '')
    setReady(session.readiness_to_process ?? true)
    setGoal(session.user_goal ?? '')
  }, [
    session.id,
    session.event_summary,
    session.stress_level,
    session.rumination_level,
    session.emotional_state,
    session.readiness_to_process,
    session.user_goal,
  ])

  const isFirstStep = session.current_phase === 'state_check'

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      const patch: Record<string, unknown> = {
        title: goal ? `Narrative Integration — ${goal}` : null,
        event_summary: eventLoop || null,
        stress_level: stress,
        rumination_level: rumination,
        emotional_state: emotionalState || null,
        readiness_to_process: ready,
        user_goal: goal || null,
      }
      if (isFirstStep) {
        patch.current_phase = ready ? 'event_inventory' : 'stabilization'
      } else if (session.current_phase === 'stabilization' && ready) {
        patch.current_phase = 'event_inventory'
      }

      const res = await fetch(`/api/modules/narrative-integration/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to save')
      props.onUpdated(json.session)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">Step 1 — Name the Loop</h2>
        <p className="text-sm text-gray-600">
          Short calibration first. Keep it high-level — no graphic details needed. You can return
          here anytime to update what you’re holding; guided reflection uses this as live context.
        </p>
      </div>

      {session.safety_status === 'high_risk' && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          You’re in stabilization mode. We won’t do deep processing right now.
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-900">
            What event, memory, or unresolved experience keeps coming back?
          </label>
          <textarea
            value={eventLoop}
            onChange={(e) => setEventLoop(e.target.value)}
            placeholder="One or two sentences is enough."
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            disabled={disabled}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-900">
            What are you trying to do right now?
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={disabled}
          >
            <option value="">Select one (or keep blank)</option>
            <option value="understand">Understand it</option>
            <option value="make-peace">Make peace with it</option>
            <option value="learn">Learn from it</option>
            <option value="stop-replaying">Stop replaying it</option>
          </select>

          <label className="mt-4 block text-sm font-medium text-gray-900">
            Current emotional state
          </label>
          <input
            value={emotionalState}
            onChange={(e) => setEmotionalState(e.target.value)}
            placeholder="e.g., tense, sad, numb, angry, calm"
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900">
              How intense does it feel right now?
            </label>
            <span className="text-sm text-gray-700">{stress}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={stress}
            onChange={(e) => setStress(parseInt(e.target.value, 10))}
            className="w-full mt-2"
            disabled={disabled}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900">
              How strong is the rumination loop?
            </label>
            <span className="text-sm text-gray-700">{rumination}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={rumination}
            onChange={(e) => setRumination(parseInt(e.target.value, 10))}
            className="w-full mt-2"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-gray-900">
          Do you feel calm enough to reflect, or do you need grounding first?
        </label>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => setReady(true)}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg border text-sm ${
              ready
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            } disabled:opacity-50`}
          >
            Calm enough to reflect
          </button>
          <button
            type="button"
            onClick={() => setReady(false)}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg border text-sm ${
              !ready
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            } disabled:opacity-50`}
          >
            Need grounding first
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <button
          onClick={save}
          disabled={saving || disabled}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isFirstStep ? 'Continue' : 'Save Step 1'}
        </button>
      </div>
    </div>
  )
}
