'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, ShieldAlert, Sparkles } from 'lucide-react'

import StateCheck from '@/components/narrative-integration/StateCheck'
import EventInventoryForm from '@/components/narrative-integration/EventInventoryForm'
import ReflectiveDialogue from '@/components/narrative-integration/ReflectiveDialogue'
import MeaningCards from '@/components/narrative-integration/MeaningCards'
import PresentGrounding from '@/components/narrative-integration/PresentGrounding'
import FutureAction from '@/components/narrative-integration/FutureAction'
import SessionSummary from '@/components/narrative-integration/SessionSummary'

type Session = {
  id: string
  title: string | null
  event_summary: string | null
  stress_level: number | null
  rumination_level: number | null
  engagement_level: number | null
  dissociation_indicators: boolean | null
  safety_status: 'ok' | 'needs_grounding' | 'high_risk'
  emotional_state: string | null
  user_goal: string | null
  readiness_to_process: boolean | null
  current_phase:
    | 'state_check'
    | 'stabilization'
    | 'event_inventory'
    | 'rumination_analysis'
    | 'narrative_clarification'
    | 'frozen_belief'
    | 'meaning_making'
    | 'present_grounding'
    | 'future_reorientation'
    | 'closure_summary'
  meaning_statement: string | null
  lesson_statement: string | null
  present_grounding_summary: string | null
  future_action: string | null
  completion_status: 'in_progress' | 'completed' | 'aborted'
  updated_at: string
}

export default function NarrativeIntegrationSessionPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const disableDeepProcessing = useMemo(
    () => session?.safety_status === 'high_risk' || false,
    [session?.safety_status]
  )

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/modules/narrative-integration/sessions/${sessionId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load session')
      setSession(json.session)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const onSessionUpdated = (next: Session) => setSession(next)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="container mx-auto px-6 py-10">
          <Link href="/modules/narrative-integration">
            <button className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </Link>
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-red-700 text-sm">{error || 'Session not found.'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/modules/narrative-integration">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors h-9 rounded-md px-3 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-black flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-blue-600" />
                  {session.title || 'I Am Present'}
                </h1>
                <p className="text-xs text-gray-600">
                  Calm, structured reflection. Not therapy. Updated{' '}
                  {new Date(session.updated_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {session.safety_status === 'high_risk' && (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                  <ShieldAlert className="h-4 w-4" />
                  Stabilization mode
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-700">
            This module is designed to reduce rumination over time. It avoids graphic details and
            ends with grounding and a next action.
          </p>
        </div>

        <StateCheck
          session={session}
          disabled={disableDeepProcessing}
          onUpdated={onSessionUpdated}
        />

        {session.current_phase !== 'state_check' && (
          <EventInventoryForm
            sessionId={session.id}
            currentPhase={session.current_phase}
            disabled={disableDeepProcessing}
            onPhaseAdvanced={load}
          />
        )}

        <ReflectiveDialogue
          session={session}
          disabled={false}
          onUpdated={onSessionUpdated}
          onRefresh={load}
        />

        <MeaningCards session={session} disabled={disableDeepProcessing} onRefresh={load} />

        <PresentGrounding session={session} disabled={disableDeepProcessing} onRefresh={load} />

        <FutureAction session={session} disabled={disableDeepProcessing} onRefresh={load} />

        <SessionSummary session={session} onRefresh={load} />
      </div>
    </div>
  )
}
