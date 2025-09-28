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

    // Get all habits for the user, ordered by created_at (fallback when order_index doesn't exist)
    const { data: habits, error: habitsError } = await supabase
      .from('daily_habits')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (habitsError) {
      console.error('Error fetching habits for reorder:', habitsError)
      return NextResponse.json(
        {
          error: 'Failed to fetch habits',
          message:
            'Habit reordering is not available until the database migration is applied. Please apply the order_index migration first.',
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

    // Since order_index column doesn't exist yet, return a helpful message
    return NextResponse.json(
      {
        error: 'Habit reordering not available',
        message:
          'Habit reordering requires the order_index column to be added to the database. Please apply the migration first.',
        migrationRequired: true,
      },
      { status: 400 }
    )
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
