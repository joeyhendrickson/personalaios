import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Allow saving partial progress - don't require goals_generated
    // Users can save their progress at any time during the journey

    // Save Dream Catcher session to database
    const { data: savedSession, error: saveError } = await supabase
      .from('dream_catcher_sessions')
      .insert({
        user_id: user.id,
        assessment_data: assessment_data,
        completed_at: completed_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving Dream Catcher session:', saveError)

      // If table doesn't exist, we need to create it
      if (saveError.code === '42P01') {
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

    // Log activity
    const goalsCount = assessment_data.goals_generated?.length || 0
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'dream_catcher_saved',
      description:
        goalsCount > 0
          ? `Dream Catcher session saved with ${goalsCount} goals`
          : 'Dream Catcher progress saved',
      metadata: {
        session_id: savedSession.id,
        goals_count: goalsCount,
        is_complete: goalsCount > 0,
      },
    })

    return NextResponse.json({
      success: true,
      session_id: savedSession.id,
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
