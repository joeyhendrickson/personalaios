import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createTaskSchema = z.object({
  weekly_goal_id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z
    .enum([
      'quick_money',
      'save_money',
      'health',
      'network_expansion',
      'business_growth',
      'fires',
      'good_living',
      'big_vision',
      'job',
      'organization',
      'tech_issues',
      'business_launch',
      'future_planning',
      'innovation',
      'productivity',
      'learning',
      'financial',
      'personal',
      'other',
    ])
    .default('other'),
  points_value: z.number().int().min(0).default(0),
  money_value: z.number().min(0).default(0),
})

// GET /api/tasks - Get all tasks for the current user
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goal_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('tasks')
      .select(
        `
        *,
        weekly_goal:weekly_goals(*)
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (goalId) {
      query = query.eq('weekly_goal_id', goalId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validatedData = createTaskSchema.parse(body)

    // Verify the goal exists and belongs to the user (only if weekly_goal_id is provided)
    if (validatedData.weekly_goal_id) {
      const { data: goal, error: goalError } = await supabase
        .from('weekly_goals')
        .select('id')
        .eq('id', validatedData.weekly_goal_id)
        .eq('user_id', user.id)
        .single()

      if (goalError || !goal) {
        return NextResponse.json({ error: 'Goal not found or access denied' }, { status: 404 })
      }
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select(
        `
        *,
        weekly_goal:weekly_goals(*)
      `
      )
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_user_activity', {
      p_user_id: user.id,
      p_activity_type: 'task_created',
      p_activity_data: {
        task_id: task.id,
        task_title: task.title,
        category: task.category,
        points_value: task.points_value,
      },
    })

    // Update analytics
    await supabase.rpc('update_user_analytics', {
      p_user_id: user.id,
      p_activity_type: 'task_created',
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
