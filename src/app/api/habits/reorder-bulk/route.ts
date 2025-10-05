import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reorderHabitsSchema = z.object({
  habits: z
    .array(
      z.object({
        id: z.string().uuid(),
        order_index: z.number().int().min(0),
      })
    )
    .min(1),
})

// POST /api/habits/reorder-bulk - Reorder multiple habits at once
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
    const { habits } = reorderHabitsSchema.parse(body)

    // Validate that all habits belong to the user
    const habitIds = habits.map((h) => h.id)
    const { data: existingHabits, error: fetchError } = await supabase
      .from('daily_habits')
      .select('id, user_id')
      .in('id', habitIds)

    if (fetchError) {
      console.error('Error fetching habits for validation:', fetchError)
      return NextResponse.json({ error: 'Failed to validate habits' }, { status: 500 })
    }

    // Check if all habits belong to the user
    const userHabitIds =
      existingHabits?.filter((h) => h.user_id === user.id)?.map((h) => h.id) || []

    const invalidHabits = habitIds.filter((id) => !userHabitIds.includes(id))
    if (invalidHabits.length > 0) {
      return NextResponse.json(
        {
          error: 'Some habits do not belong to the current user',
          invalidHabits,
        },
        { status: 403 }
      )
    }

    // Update all habits in a transaction-like approach
    const updatePromises = habits.map(
      (habit) =>
        supabase
          .from('daily_habits')
          .update({
            order_index: habit.order_index,
            updated_at: new Date().toISOString(),
          })
          .eq('id', habit.id)
          .eq('user_id', user.id) // Extra safety check
    )

    const results = await Promise.all(updatePromises)

    // Check for any errors
    const errors = results.filter((result) => result.error)
    if (errors.length > 0) {
      console.error('Error updating habits:', errors)
      return NextResponse.json(
        {
          error: 'Failed to update some habits',
          details: errors.map((e) => e.error),
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully reordered ${habits.length} habits`,
      updated_count: habits.length,
    })
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
