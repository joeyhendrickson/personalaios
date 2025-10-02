import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  goal_type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  target_value: z.number().min(0).optional(),
  target_unit: z.string().max(50).optional(),
  current_value: z.number().min(0).default(0),
  priority_level: z.number().int().min(1).max(5).default(3),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
})

const updateGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  goal_type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  target_value: z.number().min(0).optional(),
  target_unit: z.string().max(50).optional(),
  current_value: z.number().min(0).optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  priority_level: z.number().int().min(1).max(5).optional(),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
})

// GET /api/goals - Get all goals for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('priority_level', { ascending: true })
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error('Error fetching goals:', goalsError)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    return NextResponse.json({ goals: goals || [] }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST /api/goals - Create a new goal
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
    const validatedData = createGoalSchema.parse(body)

    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        ...validatedData,
      })
      .select()
      .single()

    if (goalError) {
      console.error('Error creating goal:', goalError)
      return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_user_activity', {
      p_user_id: user.id,
      p_activity_type: 'goal_created',
      p_activity_data: {
        goal_id: goal.id,
        goal_title: goal.title,
        goal_type: goal.goal_type,
        target_value: goal.target_value,
      },
    })

    // Update analytics
    await supabase.rpc('update_user_analytics', {
      p_user_id: user.id,
      p_activity_type: 'goal_created',
    })

    return NextResponse.json({ goal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.issues,
        },
        { status: 400 }
      )
    }
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
