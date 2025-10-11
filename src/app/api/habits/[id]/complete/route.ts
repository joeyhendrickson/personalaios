import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/habits/[id]/complete - Mark a habit as completed
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, get the habit to check if it exists and get points
    const { data: habit, error: fetchError } = await supabase
      .from('daily_habits')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (fetchError || !habit) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
      }
      console.error('Error fetching habit:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch habit' }, { status: 500 })
    }

    // Check if habit was already completed today
    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    const { data: todayCompletions, error: todayError } = await supabase
      .from('habit_completions')
      .select('id')
      .eq('user_id', user.id)
      .eq('habit_id', id)
      .gte('completed_at', startOfDay.toISOString())
      .lte('completed_at', endOfDay.toISOString())

    if (todayError) {
      console.error('Error checking today completions:', todayError)
      return NextResponse.json({ error: 'Failed to check habit status' }, { status: 500 })
    }

    if (todayCompletions && todayCompletions.length > 0) {
      return NextResponse.json({ error: 'Habit already completed today' }, { status: 400 })
    }

    // Add habit completion
    const { data: completion, error: completionError } = await supabase
      .from('habit_completions')
      .insert({
        user_id: user.id,
        habit_id: id,
        points_awarded: habit.points_per_completion,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (completionError) {
      console.error('Error completing habit:', completionError)
      return NextResponse.json({ error: 'Failed to complete habit' }, { status: 500 })
    }

    // Check and award total habit trophies
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/total-habit-trophies/check-achievements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('cookie') || '',
          },
        }
      )
    } catch (trophyError) {
      console.error('Error checking total habit trophies:', trophyError)
      // Don't fail the habit completion if trophy check fails
    }

    return NextResponse.json({
      completion,
      habit,
      message: `Habit completed! +${habit.points_per_completion} points earned.`,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
