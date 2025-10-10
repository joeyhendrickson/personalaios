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

    // Clear existing fire_auto priorities (only non-deleted ones)
    // But first check if we already have priorities for the same goals/tasks to avoid duplicates
    const { error: deleteError } = await supabase
      .from('priorities')
      .delete()
      .eq('user_id', user.id)
      .eq('priority_type', 'fire_auto')
      .eq('is_deleted', false) // Only delete non-soft-deleted priorities

    if (deleteError) {
      console.error('Error clearing existing fire priorities:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear existing fire priorities' },
        { status: 500 }
      )
    }

    const newPriorities = []

    // Add fires goals as priorities (only if not soft-deleted)
    if (firesGoals && firesGoals.length > 0) {
      for (const goal of firesGoals) {
        // Check if this goal already has ANY existing priority (active or deleted)
        const { data: existingPriorities, error: checkError } = await supabase
          .from('priorities')
          .select('id, title, is_deleted')
          .eq('user_id', user.id)
          .eq('priority_type', 'fire_auto')
          .eq('source_type', 'project')
          .eq('project_id', goal.id)

        console.log(`Checking goal ${goal.id} (${goal.title}) for existing priority:`, {
          existingPriorities,
          checkError: checkError?.message,
        })

        // Skip this goal if it already has any priority (active or deleted)
        if (existingPriorities && existingPriorities.length > 0) {
          console.log(
            `✅ Skipping goal ${goal.id} - already has priority: ${existingPriorities[0].id} (deleted: ${existingPriorities[0].is_deleted})`
          )
          continue
        }

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
          is_completed: isCompleted,
          manual_order: newPriorities.length + 1,
          // Only include project_id if the column exists (handled by migration)
          ...(goal.id && { project_id: goal.id }),
        })
      }
    }

    // Add fires tasks as priorities (only if not soft-deleted)
    if (firesTasks && firesTasks.length > 0) {
      for (const task of firesTasks) {
        // Check if this task already has ANY existing priority (active or deleted)
        const { data: existingPriorities } = await supabase
          .from('priorities')
          .select('id, title, is_deleted')
          .eq('user_id', user.id)
          .eq('priority_type', 'fire_auto')
          .eq('source_type', 'task')
          .eq('task_id', task.id)

        console.log(`Checking task ${task.id} for existing priority:`, {
          existingPriorities,
        })

        // Skip this task if it already has any priority (active or deleted)
        if (existingPriorities && existingPriorities.length > 0) {
          console.log(
            `✅ Skipping task ${task.id} - already has priority: ${existingPriorities[0].id} (deleted: ${existingPriorities[0].is_deleted})`
          )
          continue
        }

        newPriorities.push({
          user_id: user.id,
          title: `🔥 ${task.title}`,
          description: `Fire Task: ${task.description || 'Complete this urgent task'}`,
          priority_type: 'fire_auto',
          priority_score: 90, // High priority for fires
          source_type: 'task',
          is_completed: false,
          manual_order: newPriorities.length + 1,
          // Only include task_id and project_id if the columns exist (handled by migration)
          ...(task.id && { task_id: task.id }),
          ...(task.weekly_goal_id && { project_id: task.weekly_goal_id }),
        })
      }
    }

    // Insert new fire priorities
    if (newPriorities.length > 0) {
      // Remove optional columns that might not exist in CI environment
      const safePriorities = newPriorities.map((priority) => {
        const { task_id, project_id, ...safePriority } = priority
        return safePriority
      })

      const { error: insertError } = await supabase.from('priorities').insert(safePriorities)

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
