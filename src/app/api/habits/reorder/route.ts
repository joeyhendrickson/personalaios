import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reorderHabitSchema = z.object({
  habitId: z.string().uuid(),
  direction: z.enum(['up', 'down']),
})

// POST /api/habits/reorder - Reorder a habit up or down
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
    const { habitId, direction } = reorderHabitSchema.parse(body)

    // Get all habits for the user, ordered by order_index
    const { data: habits, error: habitsError } = await supabase
      .from('daily_habits')
      .select('id, order_index')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (habitsError) {
      console.error('Error fetching habits for reorder:', habitsError)
      return NextResponse.json(
        {
          error: 'Failed to fetch habits',
          message: 'Habit reordering failed. Please try again.',
        },
        { status: 500 }
      )
    }

    if (!habits || habits.length === 0) {
      return NextResponse.json({ error: 'No habits found' }, { status: 404 })
    }

    // Find the current habit and its index
    const currentIndex = habits.findIndex((habit) => habit.id === habitId)
    if (currentIndex === -1) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    // Calculate new index based on direction
    let newIndex: number
    if (direction === 'up') {
      if (currentIndex === 0) {
        return NextResponse.json({ error: 'Habit is already at the top' }, { status: 400 })
      }
      newIndex = currentIndex - 1
    } else {
      if (currentIndex === habits.length - 1) {
        return NextResponse.json({ error: 'Habit is already at the bottom' }, { status: 400 })
      }
      newIndex = currentIndex + 1
    }

    // Get the habits that need to be swapped
    const currentHabit = habits[currentIndex]
    const targetHabit = habits[newIndex]

    // Swap the order_index values
    const { error: updateError1 } = await supabase
      .from('daily_habits')
      .update({ order_index: targetHabit.order_index })
      .eq('id', currentHabit.id)

    if (updateError1) {
      console.error('Error updating habit order:', updateError1)
      return NextResponse.json({ error: 'Failed to update habit order' }, { status: 500 })
    }

    const { error: updateError2 } = await supabase
      .from('daily_habits')
      .update({ order_index: currentHabit.order_index })
      .eq('id', targetHabit.id)

    if (updateError2) {
      console.error('Error updating habit order:', updateError2)
      // Try to revert the first update
      await supabase
        .from('daily_habits')
        .update({ order_index: currentHabit.order_index })
        .eq('id', currentHabit.id)
      return NextResponse.json({ error: 'Failed to update habit order' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Habit moved ${direction}`,
      new_position: newIndex + 1,
      total_habits: habits.length,
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
