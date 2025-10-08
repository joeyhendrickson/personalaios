import { NextResponse, NextRequest } from 'next/server'
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
    const { habit_id } = body

    if (!habit_id) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Check if already completed today
    const { data: existingCompletion } = await supabase
      .from('habit_master_completions')
      .select('id')
      .eq('habit_id', habit_id)
      .eq('user_id', user.id)
      .eq('completion_date', today)
      .single()

    if (existingCompletion) {
      return NextResponse.json({ error: 'Habit already completed today' }, { status: 400 })
    }

    // Get habit details for points calculation
    const { data: habit } = await supabase
      .from('habit_master_habits')
      .select('title, points_per_completion, streak_bonus_points')
      .eq('id', habit_id)
      .single()

    // Create completion record
    const { data: completion, error } = await supabase
      .from('habit_master_completions')
      .insert({
        habit_id,
        user_id: user.id,
        completion_date: today,
        points_earned: habit?.points_per_completion || 10,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating completion:', error)
      return NextResponse.json({ error: 'Failed to create completion' }, { status: 500 })
    }

    // Update streak
    await updateHabitStreak(supabase, habit_id, user.id, today)

    // Award points to user
    await supabase.from('points_ledger').insert({
      user_id: user.id,
      points: habit?.points_per_completion || 10,
      description: `Habit completion: ${habit?.title || 'Habit'}`,
      category: 'habit_completion',
    })

    // Update leaderboard
    await updateLeaderboard(supabase, user.id, habit_id)

    return NextResponse.json(completion)
  } catch (error) {
    console.error('Error in completion API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateHabitStreak(
  supabase: any,
  habitId: string,
  userId: string,
  completionDate: string
) {
  const { data: streak } = await supabase
    .from('habit_master_streaks')
    .select('*')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .single()

  const today = new Date(completionDate)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let newCurrentStreak = 1
  let newLongestStreak = streak?.longest_streak || 0

  if (streak?.last_completion_date === yesterday.toISOString().split('T')[0]) {
    // Continuing streak
    newCurrentStreak = (streak.current_streak || 0) + 1
  } else if (streak?.last_completion_date !== completionDate) {
    // Starting new streak
    newCurrentStreak = 1
  }

  newLongestStreak = Math.max(newLongestStreak, newCurrentStreak)

  await supabase.from('habit_master_streaks').upsert({
    habit_id: habitId,
    user_id: userId,
    current_streak: newCurrentStreak,
    longest_streak: newLongestStreak,
    last_completion_date: completionDate,
    streak_start_date: newCurrentStreak === 1 ? completionDate : streak?.streak_start_date,
    is_active: true,
  })
}

async function updateLeaderboard(supabase: any, userId: string, habitId: string) {
  // Get habit category
  const { data: habit } = await supabase
    .from('habit_master_habits')
    .select('category_id')
    .eq('id', habitId)
    .single()

  if (!habit) return

  // Get current leaderboard entry
  const { data: leaderboard } = await supabase
    .from('habit_master_leaderboards')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', habit.category_id)
    .single()

  // Get total completions for this category
  const { data: completions } = await supabase
    .from('habit_master_completions')
    .select('id')
    .eq('user_id', userId)
    .in(
      'habit_id',
      supabase
        .from('habit_master_habits')
        .select('id')
        .eq('user_id', userId)
        .eq('category_id', habit.category_id)
    )

  // Get current streak for this category
  const { data: streaks } = await supabase
    .from('habit_master_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .in(
      'habit_id',
      supabase
        .from('habit_master_habits')
        .select('id')
        .eq('user_id', userId)
        .eq('category_id', habit.category_id)
    )

  const totalCompletions = completions?.length || 0
  const currentStreak = Math.max(...(streaks?.map((s: any) => s.current_streak) || [0]))
  const totalPoints = totalCompletions * 10 // Assuming 10 points per completion

  if (leaderboard) {
    await supabase
      .from('habit_master_leaderboards')
      .update({
        total_completions: totalCompletions,
        current_streak: currentStreak,
        total_points: totalPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leaderboard.id)
  } else {
    await supabase.from('habit_master_leaderboards').insert({
      user_id: userId,
      category_id: habit.category_id,
      total_completions: totalCompletions,
      current_streak: currentStreak,
      total_points: totalPoints,
    })
  }
}
