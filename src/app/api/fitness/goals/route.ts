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

    const { data: goals, error } = await supabase
      .from('fitness_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching fitness goals:', error)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    return NextResponse.json(goals || [])
  } catch (error) {
    console.error('Error in fitness goals GET:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch fitness goals',
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
    console.log('Received goal data:', JSON.stringify(body, null, 2))

    const {
      goal_type,
      target_body_type,
      target_weight,
      current_weight,
      target_body_fat_percentage,
      current_body_fat_percentage,
      target_areas,
      timeline_weeks,
      priority_level,
      description,
    } = body

    if (!goal_type) {
      console.error('Goal type is missing from request body')
      return NextResponse.json({ error: 'Goal type is required' }, { status: 400 })
    }

    console.log(`Creating fitness goal for user: ${user.id}`)
    console.log(
      `Goal type: ${goal_type}, Target areas: ${target_areas?.join(', ')}, Timeline: ${timeline_weeks} weeks`
    )

    const { data: goal, error } = await supabase
      .from('fitness_goals')
      .insert({
        user_id: user.id,
        goal_type,
        target_body_type,
        target_weight,
        current_weight,
        target_body_fat_percentage,
        current_body_fat_percentage,
        target_areas: target_areas || [],
        timeline_weeks: timeline_weeks || 12,
        priority_level: priority_level || 'medium',
        description,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating fitness goal:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return NextResponse.json(
        {
          error: 'Failed to create goal',
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_goal_created',
      description: `Created fitness goal: ${goal_type}`,
      metadata: {
        goal_type,
        target_areas: target_areas || [],
        timeline_weeks: timeline_weeks || 12,
        priority_level: priority_level || 'medium',
      },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error in fitness goals POST:', error)
    return NextResponse.json(
      {
        error: 'Failed to create fitness goal',
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
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 })
    }

    const { data: goal, error } = await supabase
      .from('fitness_goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating fitness goal:', error)
      return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_goal_updated',
      description: `Updated fitness goal: ${goal.goal_type}`,
      metadata: {
        goal_id: id,
        updates: Object.keys(updates),
      },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error in fitness goals PUT:', error)
    return NextResponse.json(
      {
        error: 'Failed to update fitness goal',
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
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('fitness_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting fitness goal:', error)
      return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_goal_deleted',
      description: 'Deleted fitness goal',
      metadata: {
        goal_id: id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in fitness goals DELETE:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete fitness goal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
