import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/tasks/[id]/complete - Mark a task as completed
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

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
      .eq('id', params.id)
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
      .eq('id', params.id)
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

    return NextResponse.json({
      task,
      message: 'Task completed successfully! Points and money have been added to your goal.',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
