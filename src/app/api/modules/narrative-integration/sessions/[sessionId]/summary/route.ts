import { NextRequest, NextResponse } from 'next/server'
import {
  getNarrativeIntegrationEvent,
  getNarrativeIntegrationSession,
  updateNarrativeIntegrationSession,
} from '@/lib/narrative-integration/actions'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params

    const session = await getNarrativeIntegrationSession(sessionId)
    const event = await getNarrativeIntegrationEvent(sessionId)

    // Completion gate: only mark completed if key artifacts exist + stress is stable-ish
    const stressOk = (session.stress_level ?? 10) <= 7
    const hasMeaning = !!session.meaning_statement
    const hasLesson = !!session.lesson_statement
    const hasAction = !!session.future_action

    const oldBelief = event?.what_belief_formed_afterward || event?.frozen_belief || null
    const updatedBelief = event?.current_reinterpretation || null

    const summary = {
      title: session.title || 'Narrative Integration Summary',
      event_brief: session.event_summary || event?.what_happened_briefly || '',
      old_belief: oldBelief,
      updated_belief: updatedBelief,
      meaning_statement: session.meaning_statement || '',
      lesson_learned: session.lesson_statement || '',
      gratitude_or_grounding_statement: session.present_grounding_summary || '',
      future_action: session.future_action || '',
      date_completed: new Date().toISOString(),
      revisit_guidance:
        'You do not need to keep replaying this today. You have already extracted the lesson for now. Return to your next action.',
    }

    const completion_status =
      stressOk && hasMeaning && hasLesson && hasAction ? 'completed' : 'in_progress'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Upsert into summaries (RLS uses user_id)
    const { error: upsertError } = await supabase.from('narrative_integration_summaries').upsert(
      {
        session_id: sessionId,
        user_id: user.id,
        ...summary,
      },
      { onConflict: 'session_id' }
    )

    if (upsertError) throw new Error(upsertError.message)

    const updated = await updateNarrativeIntegrationSession(sessionId, {
      completion_status: completion_status as any,
      completed_at: completion_status === 'completed' ? new Date().toISOString() : null,
    })

    return NextResponse.json({ summary, session: updated })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
