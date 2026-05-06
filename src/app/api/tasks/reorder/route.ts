import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_PRIORITY = new Set(['high', 'medium', 'low'])

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    for (const item of taskOrders) {
      if (item.priority != null && !ALLOWED_PRIORITY.has(String(item.priority).toLowerCase())) {
        return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 })
      }
    }

    const taskIds = taskOrders.map((item: { id: string }) => item.id)
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

    for (const item of taskOrders as {
      id: string
      sort_order: number
      priority?: string
    }[]) {
      const patch: { sort_order: number; priority?: string } = {
        sort_order: item.sort_order,
      }
      if (item.priority != null) {
        patch.priority = String(item.priority).toLowerCase()
      }

      const { error: updateError } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', item.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating task order:', updateError)
        return NextResponse.json({ error: 'Failed to update task order' }, { status: 500 })
      }
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
