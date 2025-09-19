import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/tasks/[id]/complete - Mark a task as completed
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, get the current task to check its status
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !currentTask) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      console.error('Error fetching task:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
    }

    if (currentTask.status === 'completed') {
      return NextResponse.json({ error: 'Task is already completed' }, { status: 400 })
    }

    // Update the task status to completed
    // The database trigger will automatically:
    // 1. Update the weekly goal's current points/money
    // 2. Insert records into points_ledger and money_ledger
    // 3. Set the completed_at timestamp
    const { data: task, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(
        `
        *,
        weekly_goal:weekly_goals(*)
      `
      )
      .single()

    if (error) {
      console.error('Error completing task:', error)
      return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_user_activity', {
      p_user_id: user.id,
      p_activity_type: 'task_completed',
      p_activity_data: {
        task_id: task.id,
        task_title: task.title,
        category: task.category,
        points_value: task.points_value,
        money_value: task.money_value
      }
    });

    // Update analytics
    await supabase.rpc('update_user_analytics', {
      p_user_id: user.id,
      p_activity_type: 'task_completed'
    });

    return NextResponse.json({
      task,
      message: 'Task completed successfully! Points and money have been added to your goal.',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
