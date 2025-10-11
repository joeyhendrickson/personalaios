import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/signin-streak/track - Track daily sign-in and award trophies
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

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Check if user already signed in today
    const { data: existingSignin, error: signinCheckError } = await supabase
      .from('daily_signin_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('signin_date', today)
      .single()

    if (signinCheckError && signinCheckError.code !== 'PGRST116') {
      console.error('Error checking existing signin:', signinCheckError)
      return NextResponse.json({ error: 'Failed to check signin status' }, { status: 500 })
    }

    if (existingSignin) {
      return NextResponse.json(
        {
          message: 'Already signed in today',
          streak: await getCurrentStreak(supabase, user.id),
        },
        { status: 200 }
      )
    }

    // Log today's sign-in
    const { data: signinLog, error: logError } = await supabase
      .from('daily_signin_logs')
      .insert({
        user_id: user.id,
        signin_date: today,
        ip_address: request.ip || request.headers.get('x-forwarded-for') || null,
        user_agent: request.headers.get('user-agent') || null,
      })
      .select()
      .single()

    if (logError) {
      console.error('Error logging signin:', logError)
      return NextResponse.json({ error: 'Failed to log signin' }, { status: 500 })
    }

    // Update or create user's sign-in streak
    const { data: userStreak, error: streakError } = await supabase
      .from('user_signin_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let currentStreak = 1
    let longestStreak = 1
    let totalSignins = 1

    if (streakError && streakError.code !== 'PGRST116') {
      console.error('Error fetching user streak:', streakError)
      return NextResponse.json({ error: 'Failed to fetch streak' }, { status: 500 })
    }

    if (userStreak) {
      // Check if user signed in yesterday (streak continues) or if there's a gap (streak resets)
      const { data: yesterdaySignin } = await supabase
        .from('daily_signin_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('signin_date', yesterday)
        .single()

      if (yesterdaySignin) {
        // Streak continues
        currentStreak = userStreak.current_streak + 1
      } else {
        // Streak was broken, reset to 1
        currentStreak = 1
      }

      longestStreak = Math.max(currentStreak, userStreak.longest_streak)
      totalSignins = userStreak.total_signins + 1

      // Update existing streak
      const { error: updateError } = await supabase
        .from('user_signin_streaks')
        .update({
          current_streak: currentStreak,
          longest_streak: longestStreak,
          total_signins: totalSignins,
          last_signin_date: today,
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating streak:', updateError)
        return NextResponse.json({ error: 'Failed to update streak' }, { status: 500 })
      }
    } else {
      // Create new streak record
      const { error: insertError } = await supabase.from('user_signin_streaks').insert({
        user_id: user.id,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_signins: totalSignins,
        last_signin_date: today,
      })

      if (insertError) {
        console.error('Error creating streak:', insertError)
        return NextResponse.json({ error: 'Failed to create streak' }, { status: 500 })
      }
    }

    // Check and award trophies based on current streak
    const awardedTrophies = await checkAndAwardTrophies(supabase, user.id, currentStreak)

    return NextResponse.json(
      {
        message: 'Sign-in tracked successfully',
        streak: {
          current: currentStreak,
          longest: longestStreak,
          total: totalSignins,
        },
        awardedTrophies,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in signin-streak track POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/signin-streak/track - Get current streak information
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

    const streak = await getCurrentStreak(supabase, user.id)

    return NextResponse.json({ streak }, { status: 200 })
  } catch (error) {
    console.error('Error in signin-streak track GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to get current streak
async function getCurrentStreak(supabase: any, userId: string) {
  const { data: userStreak, error } = await supabase
    .from('user_signin_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching streak:', error)
    return null
  }

  if (!userStreak) {
    return {
      current: 0,
      longest: 0,
      total: 0,
    }
  }

  // Check if streak is still valid (user signed in today or yesterday)
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  if (userStreak.last_signin_date === today) {
    // User signed in today, streak is current
    return {
      current: userStreak.current_streak,
      longest: userStreak.longest_streak,
      total: userStreak.total_signins,
    }
  } else if (userStreak.last_signin_date === yesterday) {
    // User signed in yesterday but not today, streak is still valid but not updated
    return {
      current: userStreak.current_streak,
      longest: userStreak.longest_streak,
      total: userStreak.total_signins,
    }
  } else {
    // Streak is broken, return 0
    return {
      current: 0,
      longest: userStreak.longest_streak,
      total: userStreak.total_signins,
    }
  }
}

// Helper function to check and award trophies
async function checkAndAwardTrophies(supabase: any, userId: string, currentStreak: number) {
  // Get all trophies that could be earned at this streak level
  const { data: availableTrophies, error: trophiesError } = await supabase
    .from('signin_streak_trophies')
    .select('*')
    .lte('streak_days_required', currentStreak)
    .order('streak_days_required', { ascending: true })

  if (trophiesError) {
    console.error('Error fetching trophies:', trophiesError)
    return []
  }

  // Get already earned trophies
  const { data: earnedTrophies, error: earnedError } = await supabase
    .from('user_signin_streak_trophies')
    .select('trophy_id')
    .eq('user_id', userId)

  if (earnedError) {
    console.error('Error fetching earned trophies:', earnedError)
    return []
  }

  const earnedTrophyIds = new Set(earnedTrophies?.map((et: any) => et.trophy_id) || [])
  const newTrophies =
    availableTrophies?.filter((trophy: any) => !earnedTrophyIds.has(trophy.id)) || []

  const awardedTrophies = []

  // Award new trophies
  for (const trophy of newTrophies) {
    const { data: newTrophy, error: insertError } = await supabase
      .from('user_signin_streak_trophies')
      .insert({
        user_id: userId,
        trophy_id: trophy.id,
      })
      .select(
        `
        *,
        signin_streak_trophies (*)
      `
      )
      .single()

    if (insertError) {
      console.error('Error awarding trophy:', insertError)
    } else {
      awardedTrophies.push(newTrophy)
    }
  }

  return awardedTrophies
}
