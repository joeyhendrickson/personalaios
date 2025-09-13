import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createGoalSchema = z.object({
  week_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z
    .enum(['health', 'productivity', 'learning', 'financial', 'personal', 'other'])
    .default('other'),
  target_points: z.number().int().min(0).default(0),
  target_money: z.number().min(0).default(0),
})

// GET /api/goals - Get all goals for the current user
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
    const weekId = searchParams.get('week_id')

    let query = supabase
      .from('weekly_goals')
      .select(
        `
        *,
        week:weeks(*),
        tasks(*)
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (weekId) {
      query = query.eq('week_id', weekId)
    }

    const { data: goals, error } = await query

    if (error) {
      console.error('Error fetching goals:', error)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    return NextResponse.json({ goals })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/goals - Create a new goal
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
    const validatedData = createGoalSchema.parse(body)

    const { data: goal, error } = await supabase
      .from('weekly_goals')
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select(
        `
        *,
        week:weeks(*),
        tasks(*)
      `
      )
      .single()

    if (error) {
      console.error('Error creating goal:', error)
      return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
    }

    return NextResponse.json({ goal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
