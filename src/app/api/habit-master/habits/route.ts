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

    const { data: habits, error } = await supabase
      .from('habit_master_habits')
      .select(`
        *,
        category:habit_categories(*)
      `)
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
    await supabase
      .from('habit_master_streaks')
      .insert({
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
