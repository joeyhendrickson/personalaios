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

    // Also update user's profile with assessment data (excluding conversation messages)
    // This makes the assessment data available for future AI conversations
    const profileAssessmentData = {
      ...assessment_data,
      // Remove conversation_messages from profile data (keep it only in sessions)
      conversation_messages: undefined,
      // Include metadata about when it was last updated
      last_updated: new Date().toISOString(),
    }
    delete profileAssessmentData.conversation_messages

    // Try to update profiles table first
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        assessment_data: profileAssessmentData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    // If profiles table doesn't exist or update fails, try user_profiles table
    if (profileUpdateError) {
      console.log(
        'Could not update profiles table, trying user_profiles:',
        profileUpdateError.message
      )
      const { error: userProfileUpdateError } = await supabase
        .from('user_profiles')
        .update({
          assessment_data: profileAssessmentData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (userProfileUpdateError) {
        console.log('Could not update user_profiles table either:', userProfileUpdateError.message)
        // Don't fail the save if profile update fails - session is still saved
      }
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
