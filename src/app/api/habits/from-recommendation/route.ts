import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const addHabitFromRecommendationSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().optional(),
})

// POST /api/habits/from-recommendation - Add a habit from the recommendations page
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
    const { title, description, category } = addHabitFromRecommendationSchema.parse(body)

    // Generate random points between 25-50
    const points_per_completion = Math.floor(Math.random() * 26) + 25 // 25-50 inclusive

    console.log('Adding habit from recommendation:', {
      title,
      description,
      category,
      points_per_completion,
    })
    console.log('User ID:', user.id)

    // Check if daily_habits table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('daily_habits')
      .select('id')
      .limit(1)

    if (tableError) {
      console.error('Table check error:', tableError)
      return NextResponse.json(
        {
          error: 'daily_habits table not found or not accessible',
          details: tableError.message,
          hint: 'Please run FIX_DAILY_HABITS_TABLE.sql in your Supabase SQL Editor',
          code: tableError.code,
        },
        { status: 500 }
      )
    }

    // Insert the new habit
    const habitData = {
      user_id: user.id,
      title,
      description: description || '',
      points_per_completion,
      is_active: true,
      weekly_completion_count: 0,
    }

    console.log('Inserting habit with data:', habitData)

    const { data: habit, error: insertError } = await supabase
      .from('daily_habits')
      .insert(habitData)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting habit:', JSON.stringify(insertError, null, 2))
      return NextResponse.json(
        {
          error: 'Failed to create habit',
          details: insertError.message || 'Unknown database error',
          hint: insertError.hint || 'Check that all required columns exist in daily_habits table',
          code: insertError.code || 'UNKNOWN',
        },
        { status: 500 }
      )
    }

    console.log('Successfully created habit:', habit)

    return NextResponse.json(
      {
        message: 'Habit added successfully',
        habit,
        points_per_completion,
      },
      { status: 201 }
    )
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
