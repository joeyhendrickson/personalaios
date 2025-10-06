import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/discipline-trophies - Get all available discipline trophies
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

    // Get all available trophies
    const { data: trophies, error: trophiesError } = await supabase
      .from('discipline_trophies')
      .select('*')
      .order('habit_count_required', { ascending: true })

    if (trophiesError) {
      console.error('Error fetching discipline trophies:', trophiesError)
      return NextResponse.json({ error: 'Failed to fetch trophies' }, { status: 500 })
    }

    // Get user's earned trophies
    const { data: userTrophies, error: userTrophiesError } = await supabase
      .from('user_discipline_trophies')
      .select(
        `
        *,
        discipline_trophies (*),
        daily_habits (title)
      `
      )
      .eq('user_id', user.id)

    if (userTrophiesError) {
      console.error('Error fetching user trophies:', userTrophiesError)
      return NextResponse.json({ error: 'Failed to fetch user trophies' }, { status: 500 })
    }

    // Get user's habit completion counts
    const { data: completionCounts, error: completionError } = await supabase
      .from('habit_completion_counts')
      .select(
        `
        *,
        daily_habits (title)
      `
      )
      .eq('user_id', user.id)

    if (completionError) {
      console.error('Error fetching completion counts:', completionError)
      return NextResponse.json({ error: 'Failed to fetch completion counts' }, { status: 500 })
    }

    return NextResponse.json({
      trophies,
      userTrophies,
      completionCounts,
    })
  } catch (error) {
    console.error('Error in discipline trophies GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
