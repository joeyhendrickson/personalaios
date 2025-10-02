import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/habits/test - Test if habits table exists and is accessible
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Testing habits table for user:', user.id)

    // Test if we can query the habits table
    const { data: habits, error: habitsError } = await supabase
      .from('daily_habits')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)

    if (habitsError) {
      console.error('Error testing habits table:', habitsError)
      return NextResponse.json(
        {
          error: 'Habits table error',
          details: habitsError.message,
          code: habitsError.code,
        },
        { status: 500 }
      )
    }

    // Test if we can query the habit_completions table
    const { data: completions, error: completionsError } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)

    if (completionsError) {
      console.error('Error testing habit_completions table:', completionsError)
      return NextResponse.json(
        {
          error: 'Habit completions table error',
          details: completionsError.message,
          code: completionsError.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Habits tables are accessible',
        user_id: user.id,
        habits_count: habits?.length || 0,
        completions_count: completions?.length || 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error testing habits tables:', error)
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
