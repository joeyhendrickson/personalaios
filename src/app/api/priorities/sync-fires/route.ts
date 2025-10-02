import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/priorities/sync-fires - Automatically sync fires category items to priorities
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

    console.log('Syncing fires priorities for user:', user.id)

    // Get all active fires category goals
    const { data: firesGoals, error: goalsError } = await supabase
      .from('weekly_goals')
      .select('id, title, description, category, current_points, target_points')
      .eq('user_id', user.id)
      .eq('category', 'fires')
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error('Error fetching fires goals:', goalsError)
      return NextResponse.json({ error: 'Failed to fetch fires goals' }, { status: 500 })
    }

    // Get all pending fires category tasks
    const { data: firesTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, description, category, points_value, money_value, weekly_goal_id, status')
      .eq('user_id', user.id)
      .eq('category', 'fires')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Error fetching fires tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch fires tasks' }, { status: 500 })
    }

    // Clear existing fire_auto priorities
    const { error: deleteError } = await supabase
      .from('priorities')
      .delete()
      .eq('user_id', user.id)
      .eq('priority_type', 'fire_auto')

    if (deleteError) {
      console.error('Error clearing existing fire priorities:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear existing fire priorities' },
        { status: 500 }
      )
    }

    const newPriorities = []

    // Add fires goals as priorities
    if (firesGoals && firesGoals.length > 0) {
      for (const goal of firesGoals) {
        const progress =
          goal.target_points > 0 ? Math.round((goal.current_points / goal.target_points) * 100) : 0
        const isCompleted = progress >= 100

        newPriorities.push({
          user_id: user.id,
          title: `🔥 ${goal.title}`,
          description: `Fire Goal: ${goal.description || 'Complete this urgent goal'} (${progress}% complete)`,
          priority_type: 'fire_auto',
          priority_score: 95, // High priority for fires
          source_type: 'project',
          project_id: goal.id,
          is_completed: isCompleted,
          manual_order: newPriorities.length + 1,
        })
      }
    }

    // Add fires tasks as priorities
    if (firesTasks && firesTasks.length > 0) {
      for (const task of firesTasks) {
        newPriorities.push({
          user_id: user.id,
          title: `🔥 ${task.title}`,
          description: `Fire Task: ${task.description || 'Complete this urgent task'}`,
          priority_type: 'fire_auto',
          priority_score: 90, // High priority for fires
          source_type: 'task',
          task_id: task.id,
          project_id: task.weekly_goal_id,
          is_completed: false,
          manual_order: newPriorities.length + 1,
        })
      }
    }

    // Insert new fire priorities
    if (newPriorities.length > 0) {
      const { error: insertError } = await supabase.from('priorities').insert(newPriorities)

      if (insertError) {
        console.error('Error inserting fire priorities:', insertError)
        return NextResponse.json({ error: 'Failed to insert fire priorities' }, { status: 500 })
      }
    }

    console.log(`Synced ${newPriorities.length} fire priorities`)

    return NextResponse.json(
      {
        message: `Synced ${newPriorities.length} fire priorities`,
        count: newPriorities.length,
        goals: firesGoals?.length || 0,
        tasks: firesTasks?.length || 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error syncing fire priorities:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync fire priorities',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
