import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createHabitSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  points_per_completion: z.number().min(1).max(1000).default(25),
})

const updateHabitSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  points_per_completion: z.number().min(1).max(1000).optional(),
  is_active: z.boolean().optional(),
})

// GET /api/habits - Get all habits for the current user
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

    // Get habits first
    const { data: habits, error: habitsError } = await supabase
      .from('daily_habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (habitsError) {
      console.error('Error fetching habits:', habitsError)
      return NextResponse.json(
        {
          error: 'Failed to fetch habits',
          details: habitsError.message,
          code: habitsError.code,
        },
        { status: 500 }
      )
    }

    console.log('Fetched habits:', habits?.length || 0)

    // Get current week's start and end dates
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // End of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999)

    // Get this week's completions for each habit
    const habitsWithCompletions = await Promise.all(
      (habits || []).map(async (habit) => {
        const { data: completions, error: completionsError } = await supabase
          .from('habit_completions')
          .select('id, completed_at, points_awarded')
          .eq('user_id', user.id)
          .eq('habit_id', habit.id)
          .gte('completed_at', startOfWeek.toISOString())
          .lte('completed_at', endOfWeek.toISOString())
          .order('completed_at', { ascending: false })

        if (completionsError) {
          console.error('Error fetching habit completions:', completionsError)
        }

        return {
          ...habit,
          habit_completions: completions || [],
          weekly_completion_count: completions?.length || 0,
          last_completed: completions?.[0]?.completed_at || null,
        }
      })
    )

    console.log('Returning habits with completions:', habitsWithCompletions.length)
    return NextResponse.json({ habits: habitsWithCompletions }, { status: 200 })
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

// POST /api/habits - Create a new habit
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
    const validatedData = createHabitSchema.parse(body)

    const { data: habit, error: habitError } = await supabase
      .from('daily_habits')
      .insert({
        user_id: user.id,
        ...validatedData,
      })
      .select()
      .single()

    if (habitError) {
      console.error('Error creating habit:', habitError)
      return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 })
    }

    return NextResponse.json({ habit }, { status: 201 })
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
