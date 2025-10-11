import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/total-habit-trophies - Get all total habit trophies and user's earned trophies
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

    // Get all available total habit trophies
    const { data: trophies, error: trophiesError } = await supabase
      .from('total_habit_trophies')
      .select('*')
      .order('total_completions_required', { ascending: true })

    if (trophiesError) {
      console.error('Error fetching total habit trophies:', trophiesError)
      return NextResponse.json({ error: 'Failed to fetch trophies' }, { status: 500 })
    }

    // Get user's earned total habit trophies
    const { data: userTrophies, error: userTrophiesError } = await supabase
      .from('user_total_habit_trophies')
      .select(
        `
        *,
        total_habit_trophies (*)
      `
      )
      .eq('user_id', user.id)

    if (userTrophiesError) {
      console.error('Error fetching user total habit trophies:', userTrophiesError)
      return NextResponse.json({ error: 'Failed to fetch user trophies' }, { status: 500 })
    }

    // Get user's total habit completions count
    const { data: habitCompletions, error: completionError } = await supabase
      .from('habit_completions')
      .select('id')
      .eq('user_id', user.id)

    if (completionError) {
      console.error('Error fetching habit completions:', completionError)
      return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 })
    }

    const totalCompletions = habitCompletions?.length || 0

    console.log('Total habit trophies debug:', {
      trophiesCount: trophies?.length || 0,
      userTrophiesCount: userTrophies?.length || 0,
      totalCompletions,
      sampleTrophies: trophies?.slice(0, 3),
      sampleUserTrophies: userTrophies?.slice(0, 3),
    })

    return NextResponse.json({
      trophies,
      userTrophies,
      totalCompletions,
    })
  } catch (error) {
    console.error('Error in total-habit-trophies GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
