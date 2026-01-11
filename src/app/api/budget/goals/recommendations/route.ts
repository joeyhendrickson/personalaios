import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/budget/goals/recommendations - Get pending budget goals as recommendations
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending budget goals that haven't been added to dashboard
    const { data: recommendations, error: recommendationsError } = await supabase
      .from('budget_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .eq('is_added_to_dashboard', false)
      .order('created_at', { ascending: false })

    if (recommendationsError) {
      console.error('Error fetching budget goal recommendations:', recommendationsError)
      return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
    }

    return NextResponse.json({ recommendations: recommendations || [] }, { status: 200 })
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

// POST /api/budget/goals/recommendations - Add a budget goal to dashboard goals
export async function POST(request: Request) {
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
    const { budget_goal_id } = body

    if (!budget_goal_id) {
      return NextResponse.json({ error: 'Budget goal ID is required' }, { status: 400 })
    }

    // Get the budget goal
    const { data: budgetGoal, error: fetchError } = await supabase
      .from('budget_goals')
      .select('*')
      .eq('id', budget_goal_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !budgetGoal) {
      return NextResponse.json({ error: 'Budget goal not found' }, { status: 404 })
    }

    // Create a goal in the main goals table
    const { data: newGoal, error: createError } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        title: budgetGoal.title,
        description: budgetGoal.description,
        goal_type: budgetGoal.goal_type,
        target_value: budgetGoal.target_value,
        target_unit: budgetGoal.target_unit,
        priority_level: budgetGoal.priority_level,
        start_date: budgetGoal.start_date,
        target_date: budgetGoal.target_date,
        status: 'active',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating goal from budget goal:', createError)
      return NextResponse.json({ error: 'Failed to add goal to dashboard' }, { status: 500 })
    }

    // Update the budget goal to mark it as added
    await supabase
      .from('budget_goals')
      .update({
        is_added_to_dashboard: true,
        added_to_dashboard_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', budget_goal_id)

    return NextResponse.json({ goal: newGoal }, { status: 201 })
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
