import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z
    .enum(['health', 'productivity', 'learning', 'financial', 'personal', 'other'])
    .optional(),
  target_points: z.number().int().min(0).optional(),
  target_money: z.number().min(0).optional(),
  is_completed: z.boolean().optional(),
})

// GET /api/goals/[id] - Get a specific goal
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { data: goal, error } = await supabase
      .from('weekly_goals')
      .select(
        `
        *,
        week:weeks(*),
        tasks(*)
      `
      )
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
      }
      console.error('Error fetching goal:', error)
      return NextResponse.json({ error: 'Failed to fetch goal' }, { status: 500 })
    }

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/goals/[id] - Update a specific goal
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
    const validatedData = updateGoalSchema.parse(body)

    const { data: goal, error } = await supabase
      .from('weekly_goals')
      .update(validatedData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select(
        `
        *,
        week:weeks(*),
        tasks(*)
      `
      )
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
      }
      console.error('Error updating goal:', error)
      return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
    }

    return NextResponse.json({ goal })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/goals/[id] - Delete a specific goal
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { error } = await supabase
      .from('weekly_goals')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting goal:', error)
      return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Goal deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
