import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    console.log('Chat test endpoint called')

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Chat test auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Chat test user authenticated:', user.id)

    // Test basic data fetching
    const { data: dashboardProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .limit(3)

    if (projectsError) {
      console.error('Chat test projects error:', projectsError)
      return NextResponse.json(
        {
          error: 'Failed to fetch dashboard projects',
          details: projectsError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Chat test successful',
      user_id: user.id,
      projects_count: dashboardProjects?.length || 0,
      sample_projects: dashboardProjects?.slice(0, 2) || [],
    })
  } catch (error) {
    console.error('Chat test error:', error)
    return NextResponse.json(
      {
        error: 'Chat test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
