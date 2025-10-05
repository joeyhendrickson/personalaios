import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskOrders } = body

    if (!taskOrders || !Array.isArray(taskOrders)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected taskOrders array.' },
        { status: 400 }
      )
    }

    // Validate that all task IDs belong to the user
    const taskIds = taskOrders.map((item: any) => item.id)
    const { data: userTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user.id)
      .in('id', taskIds)

    if (fetchError) {
      console.error('Error fetching user tasks:', fetchError)
      return NextResponse.json({ error: 'Failed to validate tasks' }, { status: 500 })
    }

    const userTaskIds = userTasks?.map((task) => task.id) || []
    const invalidTaskIds = taskIds.filter((id) => !userTaskIds.includes(id))

    if (invalidTaskIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid task IDs: ${invalidTaskIds.join(', ')}` },
        { status: 403 }
      )
    }

    // Update sort_order for each task
    const updates = taskOrders.map((item: any) =>
      supabase
        .from('tasks')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .eq('user_id', user.id)
    )

    const results = await Promise.all(updates)

    // Check for any errors
    const errors = results.filter((result) => result.error)
    if (errors.length > 0) {
      console.error('Error updating task orders:', errors)
      return NextResponse.json({ error: 'Failed to update some tasks' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Task order updated successfully',
    })
  } catch (error) {
    console.error('Error in reorder tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
