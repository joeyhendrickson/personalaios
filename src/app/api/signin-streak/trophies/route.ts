import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/signin-streak/trophies - Get all sign-in streak trophies and user's earned trophies
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

    // Get all available sign-in streak trophies
    const { data: trophies, error: trophiesError } = await supabase
      .from('signin_streak_trophies')
      .select('*')
      .order('streak_days_required', { ascending: true })

    if (trophiesError) {
      console.error('Error fetching signin streak trophies:', trophiesError)
      return NextResponse.json({ error: 'Failed to fetch trophies' }, { status: 500 })
    }

    // Get user's earned sign-in streak trophies
    const { data: userTrophies, error: userTrophiesError } = await supabase
      .from('user_signin_streak_trophies')
      .select(
        `
        *,
        signin_streak_trophies (*)
      `
      )
      .eq('user_id', user.id)

    if (userTrophiesError) {
      console.error('Error fetching user signin streak trophies:', userTrophiesError)
      return NextResponse.json({ error: 'Failed to fetch user trophies' }, { status: 500 })
    }

    // Get user's current streak info
    const { data: userStreak, error: streakError } = await supabase
      .from('user_signin_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let streak = { current: 0, longest: 0, total: 0 }

    if (!streakError && userStreak) {
      // Check if streak is still valid
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      if (userStreak.last_signin_date === today || userStreak.last_signin_date === yesterday) {
        streak = {
          current: userStreak.current_streak,
          longest: userStreak.longest_streak,
          total: userStreak.total_signins,
        }
      } else {
        // Streak is broken, but keep longest and total
        streak = {
          current: 0,
          longest: userStreak.longest_streak,
          total: userStreak.total_signins,
        }
      }
    }

    return NextResponse.json({
      trophies,
      userTrophies,
      streak,
    })
  } catch (error) {
    console.error('Error in signin-streak trophies GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
