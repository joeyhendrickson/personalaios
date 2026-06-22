import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isMissingColumnError(error: { message?: string } | null): boolean {
  const msg = (error?.message || '').toLowerCase()
  return (
    msg.includes('column') && (msg.includes('does not exist') || msg.includes('could not find'))
  )
}

function normalizeGoalText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isDuplicateOfExistingGoal(
  rec: { title?: string | null; description?: string | null; target_value?: number | null },
  existingGoals: Array<{
    title?: string | null
    description?: string | null
    target_value?: number | null
    status?: string | null
  }>
): boolean {
  const recTitle = normalizeGoalText(rec.title)
  const recDesc = normalizeGoalText(rec.description)
  const recTarget = rec.target_value != null ? Number(rec.target_value) : null

  return existingGoals.some((goal) => {
    const status = String(goal.status ?? 'active').toLowerCase()
    if (status === 'completed' || status === 'cancelled') return false

    const goalTitle = normalizeGoalText(goal.title)
    const goalDesc = normalizeGoalText(goal.description)
    const goalTarget = goal.target_value != null ? Number(goal.target_value) : null

    if (recTitle && goalTitle && recTitle === goalTitle) return true
    if (
      recTarget != null &&
      goalTarget != null &&
      recTarget === goalTarget &&
      recTitle &&
      goalTitle &&
      (recTitle.includes(goalTitle) || goalTitle.includes(recTitle))
    ) {
      return true
    }
    if (recDesc && goalDesc && recDesc.length > 8 && recDesc === goalDesc) return true
    return false
  })
}

async function fetchPendingRecommendations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const baseQuery = supabase
    .from('budget_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .eq('is_added_to_dashboard', false)
    .order('created_at', { ascending: false })

  let result = await baseQuery.is('dismissed_from_dashboard_at', null)
  if (result.error && isMissingColumnError(result.error)) {
    result = await baseQuery
  }
  return result
}

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

    const { data: recommendations, error: recommendationsError } =
      await fetchPendingRecommendations(supabase, user.id)

    if (recommendationsError) {
      console.error('Error fetching budget goal recommendations:', recommendationsError)
      return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
    }

    const { data: existingGoals } = await supabase
      .from('goals')
      .select('title, description, target_value, status')
      .eq('user_id', user.id)

    const visible: typeof recommendations = []
    const now = new Date().toISOString()

    for (const rec of recommendations ?? []) {
      if (isDuplicateOfExistingGoal(rec, existingGoals ?? [])) {
        let dismissError = (
          await supabase
            .from('budget_goals')
            .update({ dismissed_from_dashboard_at: now, status: 'cancelled' })
            .eq('id', rec.id)
            .eq('user_id', user.id)
        ).error
        if (dismissError && isMissingColumnError(dismissError)) {
          dismissError = (
            await supabase
              .from('budget_goals')
              .update({ status: 'cancelled' })
              .eq('id', rec.id)
              .eq('user_id', user.id)
          ).error
        }
        if (dismissError) {
          console.warn('Could not auto-dismiss duplicate budget goal recommendation:', dismissError)
        }
        continue
      }
      visible.push(rec)
    }

    return NextResponse.json({ recommendations: visible }, { status: 200 })
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

// DELETE /api/budget/goals/recommendations - Dismiss a recommendation from the dashboard
export async function DELETE(request: Request) {
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

    const dismissedAt = new Date().toISOString()
    let { data: updated, error: updateError } = await supabase
      .from('budget_goals')
      .update({ dismissed_from_dashboard_at: dismissedAt })
      .eq('id', budget_goal_id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()

    if (updateError && isMissingColumnError(updateError)) {
      ;({ data: updated, error: updateError } = await supabase
        .from('budget_goals')
        .update({ status: 'cancelled' })
        .eq('id', budget_goal_id)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle())
    }

    if (updateError) {
      console.error('Error dismissing budget goal recommendation:', updateError)
      return NextResponse.json({ error: 'Failed to dismiss recommendation' }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json({ error: 'Budget goal not found' }, { status: 404 })
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
