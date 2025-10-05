import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: plans, error } = await supabase
      .from('project_plan_builder_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching generated plans:', error)
      return NextResponse.json({ error: 'Failed to fetch generated plans' }, { status: 500 })
    }

    // Format plans for frontend (exclude content for list view)
    const formattedPlans = (plans || []).map((plan) => ({
      id: plan.id,
      title: plan.title,
      status: plan.status,
      created_at: plan.created_at,
      download_url:
        plan.status === 'completed' ? `/api/project-plan-builder/plans/${plan.id}/download` : null,
    }))

    return NextResponse.json({
      plans: formattedPlans,
      message: 'Generated plans fetched successfully',
    })
  } catch (error) {
    console.error('Error in plans GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
