import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveDreamCatcherSession } from '@/lib/dream-catcher/save-session'
import { createIamPresentStartersFromIntake } from '@/lib/dream-catcher/create-iam-present-starters'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { assessment_data, completed_at } = body

    if (!assessment_data) {
      return NextResponse.json({ error: 'Assessment data is required' }, { status: 400 })
    }

    const conversation_messages = assessment_data.conversation_messages
    const {
      conversation_messages: _cm,
      current_phase,
      intake_question_index,
      personality_question_index,
      session_source,
      session_title,
      ...restAssessment
    } = assessment_data

    const saveResult = await saveDreamCatcherSession(supabase, user.id, {
      assessment_data: restAssessment,
      conversation_messages: Array.isArray(conversation_messages)
        ? conversation_messages
        : undefined,
      current_phase: typeof current_phase === 'string' ? current_phase : undefined,
      intake_question_index:
        typeof intake_question_index === 'number'
          ? intake_question_index
          : typeof personality_question_index === 'number'
            ? personality_question_index
            : undefined,
      session_source:
        session_source === 'onboarding' ||
        session_source === 'dream_catcher' ||
        session_source === 'fear_catcher'
          ? session_source
          : 'dream_catcher',
      session_title: typeof session_title === 'string' ? session_title : undefined,
      completed_at: completed_at ?? null,
    })

    if ('error' in saveResult) {
      if (saveResult.error.includes('does not exist') || saveResult.error.includes('42P01')) {
        return NextResponse.json(
          {
            error: 'Dream Catcher sessions table not found. Please run database migration.',
            details: 'The dream_catcher_sessions table needs to be created in the database.',
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: 'Failed to save Dream Catcher session' }, { status: 500 })
    }

    const goalsCount = Array.isArray(assessment_data.goals_generated)
      ? assessment_data.goals_generated.length
      : 0

    if (goalsCount > 0) {
      await createIamPresentStartersFromIntake(supabase, user.id, assessment_data)
    }

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'dream_catcher_saved',
      description:
        goalsCount > 0
          ? `Dream Catcher session saved with ${goalsCount} goals`
          : 'Dream Catcher progress saved',
      metadata: {
        session_id: saveResult.session_id,
        goals_count: goalsCount,
        is_complete: goalsCount > 0,
      },
    })

    return NextResponse.json({
      success: true,
      session_id: saveResult.session_id,
      message: 'Dream Catcher session saved successfully',
    })
  } catch (error) {
    console.error('Error in save Dream Catcher API:', error)
    return NextResponse.json(
      {
        error: 'Failed to save Dream Catcher session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
