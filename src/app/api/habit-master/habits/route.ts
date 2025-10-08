import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // First, check if we need to migrate existing habits from daily_habits table
    const { data: existingHabitMasterHabits } = await supabase
      .from('habit_master_habits')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    // If no habit_master_habits exist, migrate from daily_habits
    if (!existingHabitMasterHabits || existingHabitMasterHabits.length === 0) {
      const { data: dailyHabits } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', user.id)

      if (dailyHabits && dailyHabits.length > 0) {
        // Get or create a default category for migrated habits
        let { data: defaultCategory } = await supabase
          .from('habit_categories')
          .select('id')
          .eq('name', 'General')
          .single()

        if (!defaultCategory) {
          const { data: newCategory } = await supabase
            .from('habit_categories')
            .insert({
              name: 'General',
              description: 'General daily habits',
              color: '#3B82F6',
              icon: 'Target',
            })
            .select('id')
            .single()
          defaultCategory = newCategory
        }

        // Migrate each daily habit to habit_master_habits
        for (const dailyHabit of dailyHabits) {
          const { data: migratedHabit } = await supabase
            .from('habit_master_habits')
            .insert({
              user_id: user.id,
              title: dailyHabit.title,
              description: dailyHabit.description || '',
              category_id: defaultCategory?.id,
              habit_type: 'positive',
              points_per_completion: dailyHabit.points_value || 10,
              difficulty_level: 'medium',
              stage_of_change: 'action',
              is_public: false,
              share_achievements: true,
            })
            .select()
            .single()

          if (migratedHabit) {
            // Create initial streak record
            await supabase.from('habit_master_streaks').insert({
              habit_id: migratedHabit.id,
              user_id: user.id,
              current_streak: 0,
              longest_streak: 0,
              is_active: true,
            })

            // Migrate completion history from habit_completions
            const { data: oldCompletions } = await supabase
              .from('habit_completions')
              .select('*')
              .eq('habit_id', dailyHabit.id)
              .eq('user_id', user.id)

            if (oldCompletions && oldCompletions.length > 0) {
              const newCompletions = oldCompletions.map((completion: any) => ({
                habit_id: migratedHabit.id,
                user_id: user.id,
                completion_date: completion.completion_date,
                notes: '',
                points_earned: dailyHabit.points_value || 10,
              }))

              await supabase.from('habit_master_completions').insert(newCompletions)

              // Update streak based on completion history
              // Simple calculation: count consecutive days from most recent completion
              const sortedCompletions = oldCompletions.sort(
                (a: any, b: any) =>
                  new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime()
              )

              let currentStreak = 0
              let longestStreak = 0
              let tempStreak = 0
              let previousDate: Date | null = null

              for (const completion of sortedCompletions) {
                const completionDate = new Date(completion.completion_date)

                if (!previousDate) {
                  tempStreak = 1
                } else {
                  const dayDiff = Math.floor(
                    (previousDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24)
                  )
                  if (dayDiff === 1) {
                    tempStreak++
                  } else {
                    if (tempStreak > longestStreak) longestStreak = tempStreak
                    tempStreak = 1
                  }
                }
                previousDate = completionDate
              }

              // Check if streak is current (completed today or yesterday)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const mostRecentCompletion = sortedCompletions[0]
                ? new Date(sortedCompletions[0].completion_date)
                : null
              if (mostRecentCompletion) {
                mostRecentCompletion.setHours(0, 0, 0, 0)
                const daysSinceLastCompletion = Math.floor(
                  (today.getTime() - mostRecentCompletion.getTime()) / (1000 * 60 * 60 * 24)
                )
                if (daysSinceLastCompletion <= 1) {
                  currentStreak = tempStreak
                }
              }

              if (tempStreak > longestStreak) longestStreak = tempStreak

              await supabase
                .from('habit_master_streaks')
                .update({
                  current_streak: currentStreak,
                  longest_streak: longestStreak,
                })
                .eq('habit_id', migratedHabit.id)
                .eq('user_id', user.id)
            }
          }
        }
      }
    }

    // Now fetch all habit_master_habits
    const { data: habits, error } = await supabase
      .from('habit_master_habits')
      .select(
        `
        *,
        category:habit_categories(*)
      `
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching habits:', error)
      return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 })
    }

    // Get streak data for each habit
    const habitsWithStreaks = await Promise.all(
      habits.map(async (habit) => {
        const { data: streak } = await supabase
          .from('habit_master_streaks')
          .select('current_streak, longest_streak')
          .eq('habit_id', habit.id)
          .eq('user_id', user.id)
          .single()

        // Calculate completion rate for last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: completions } = await supabase
          .from('habit_master_completions')
          .select('id')
          .eq('habit_id', habit.id)
          .eq('user_id', user.id)
          .gte('completion_date', thirtyDaysAgo.toISOString().split('T')[0])

        const completionRate = completions ? (completions.length / 30) * 100 : 0

        return {
          ...habit,
          current_streak: streak?.current_streak || 0,
          longest_streak: streak?.longest_streak || 0,
          completion_rate: Math.round(completionRate),
        }
      })
    )

    return NextResponse.json(habitsWithStreaks)
  } catch (error) {
    console.error('Error in habits API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const {
      title,
      description,
      category_id,
      habit_type,
      cue_description,
      craving_description,
      response_description,
      reward_description,
      if_then_plan,
      personal_value,
      committed_action,
      is_keystone,
      keystone_impact,
      automatic_thought,
      cognitive_distortion,
      reframe_statement,
      stage_of_change,
      autonomy_score,
      competence_score,
      relatedness_score,
      points_per_completion,
      difficulty_level,
      is_public,
      share_achievements,
    } = body

    if (!title || !category_id) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 })
    }

    const { data: habit, error } = await supabase
      .from('habit_master_habits')
      .insert({
        user_id: user.id,
        title,
        description,
        category_id,
        habit_type,
        cue_description,
        craving_description,
        response_description,
        reward_description,
        if_then_plan,
        personal_value,
        committed_action,
        is_keystone,
        keystone_impact,
        automatic_thought,
        cognitive_distortion,
        reframe_statement,
        stage_of_change: stage_of_change || 'precontemplation',
        autonomy_score,
        competence_score,
        relatedness_score,
        points_per_completion: points_per_completion || 10,
        difficulty_level: difficulty_level || 'medium',
        is_public: is_public || false,
        share_achievements: share_achievements !== false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating habit:', error)
      return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 })
    }

    // Create initial streak record
    await supabase.from('habit_master_streaks').insert({
      habit_id: habit.id,
      user_id: user.id,
      current_streak: 0,
      longest_streak: 0,
      is_active: true,
    })

    return NextResponse.json(habit)
  } catch (error) {
    console.error('Error in create habit API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
