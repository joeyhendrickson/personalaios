import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/test-strategic - Test endpoint to debug strategic recommendations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          authError: authError?.message,
          hasUser: !!user,
        },
        { status: 401 }
      )
    }

    console.log('Test strategic endpoint - User authenticated:', user.id)

    // Test database queries
    const { data: projects, error: projectsError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      data: {
        projects: {
          count: projects?.length || 0,
          error: projectsError?.message,
          sample: projects?.slice(0, 2) || [],
        },
        goals: {
          count: goals?.length || 0,
          error: goalsError?.message,
          sample: goals?.slice(0, 2) || [],
        },
        tasks: {
          count: tasks?.length || 0,
          error: tasksError?.message,
          sample: tasks?.slice(0, 2) || [],
        },
      },
    })
  } catch (error) {
    console.error('Test strategic endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
