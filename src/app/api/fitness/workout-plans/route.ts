import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { data: plans, error } = await supabase
      .from('workout_plans')
      .select(
        `
        *,
        workout_plan_exercises (
          *,
          exercises (*)
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching workout plans:', error)
      return NextResponse.json({ error: 'Failed to fetch workout plans' }, { status: 500 })
    }

    return NextResponse.json(plans || [])
  } catch (error) {
    console.error('Error in workout plans GET:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch workout plans',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

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
    const {
      plan_name,
      plan_type,
      difficulty_level,
      duration_weeks,
      frequency_per_week,
      target_areas,
      goals_supported,
      description,
    } = body

    if (!plan_name || !plan_type) {
      return NextResponse.json({ error: 'Plan name and type are required' }, { status: 400 })
    }

    console.log(`Creating workout plan for user: ${user.id}`)
    console.log(`Plan: ${plan_name}, Type: ${plan_type}, Difficulty: ${difficulty_level}`)

    const { data: plan, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        plan_name,
        plan_type,
        difficulty_level: difficulty_level || 'beginner',
        duration_weeks: duration_weeks || 4,
        frequency_per_week: frequency_per_week || 3,
        target_areas: target_areas || [],
        goals_supported: goals_supported || [],
        description,
        is_ai_generated: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating workout plan:', error)
      return NextResponse.json({ error: 'Failed to create workout plan' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'workout_plan_created',
      description: `Created workout plan: ${plan_name}`,
      metadata: {
        plan_type,
        difficulty_level: difficulty_level || 'beginner',
        duration_weeks: duration_weeks || 4,
      },
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error in workout plans POST:', error)
    return NextResponse.json(
      {
        error: 'Failed to create workout plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const { data: plan, error } = await supabase
      .from('workout_plans')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating workout plan:', error)
      return NextResponse.json({ error: 'Failed to update workout plan' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'workout_plan_updated',
      description: `Updated workout plan: ${plan.plan_name}`,
      metadata: {
        plan_id: id,
        updates: Object.keys(updates),
      },
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error in workout plans PUT:', error)
    return NextResponse.json(
      {
        error: 'Failed to update workout plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting workout plan:', error)
      return NextResponse.json({ error: 'Failed to delete workout plan' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'workout_plan_deleted',
      description: 'Deleted workout plan',
      metadata: {
        plan_id: id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in workout plans DELETE:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete workout plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
