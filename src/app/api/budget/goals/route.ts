import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { insertBudgetGoal, normalizeBudgetGoalRow } from '@/lib/budget/budget-goals-insert'

const optionalDate = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().optional()
)

const createBudgetGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  goal_type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  goal_category: z.enum(['income', 'budget_reduction']),
  target_value: z.coerce.number().min(0).optional(),
  target_unit: z.string().max(50).optional().default('dollars'),
  priority_level: z.coerce.number().int().min(1).max(5).default(3),
  start_date: optionalDate,
  target_date: optionalDate,
})

// GET /api/budget/goals - Get all budget goals for the current user
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

    const { data: budgetGoals, error: goalsError } = await supabase
      .from('budget_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error('Error fetching budget goals:', goalsError)
      return NextResponse.json(
        { error: 'Failed to fetch budget goals', details: goalsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        goals: (budgetGoals || []).map((row) =>
          normalizeBudgetGoalRow(row as Record<string, unknown>)
        ),
      },
      { status: 200 }
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

// POST /api/budget/goals - Create a new budget goal
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
    const validatedData = createBudgetGoalSchema.parse(body)

    const { goal, error } = await insertBudgetGoal(supabase, user.id, validatedData)

    if (error || !goal) {
      console.error('Error creating budget goal:', error)
      return NextResponse.json(
        {
          error: 'Failed to create budget goal',
          details:
            error ??
            'Database schema may be out of date. Run Supabase migration 081_budget_goals_schema_fix.sql.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ goal }, { status: 201 })
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

// PUT /api/budget/goals - Update a budget goal
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

    const { data: goal, error: goalError } = await supabase
      .from('budget_goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (goalError) {
      console.error('Error updating budget goal:', goalError)
      return NextResponse.json(
        { error: 'Failed to update budget goal', details: goalError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { goal: normalizeBudgetGoalRow(goal as Record<string, unknown>) },
      { status: 200 }
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

// DELETE /api/budget/goals - Delete a budget goal
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

    const { error: deleteError } = await supabase
      .from('budget_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting budget goal:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete budget goal', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
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
