import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/total-habit-trophies/debug - Debug endpoint to check database state
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if total_habit_trophies table exists and has data
    const { data: trophies, error: trophiesError } = await supabase
      .from('total_habit_trophies')
      .select('*')
      .limit(5)

    // Check if user_total_habit_trophies table exists and has data
    const { data: userTrophies, error: userTrophiesError } = await supabase
      .from('user_total_habit_trophies')
      .select('*')
      .eq('user_id', user.id)

    // Check habit completions
    const { data: habitCompletions, error: completionError } = await supabase
      .from('habit_completions')
      .select('id')
      .eq('user_id', user.id)

    return NextResponse.json({
      tablesExist: {
        total_habit_trophies: !trophiesError,
        user_total_habit_trophies: !userTrophiesError,
        habit_completions: !completionError,
      },
      data: {
        totalTrophies: trophies?.length || 0,
        userTrophies: userTrophies?.length || 0,
        totalCompletions: habitCompletions?.length || 0,
      },
      errors: {
        trophiesError: trophiesError?.message,
        userTrophiesError: userTrophiesError?.message,
        completionError: completionError?.message,
      },
    })
  } catch (error) {
    console.error('Error in debug endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
