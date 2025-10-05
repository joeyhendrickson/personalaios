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

    const { data: jobs, error } = await supabase
      .from('project_plan_builder_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching analysis jobs:', error)
      return NextResponse.json({ error: 'Failed to fetch analysis jobs' }, { status: 500 })
    }

    return NextResponse.json({
      jobs: jobs || [],
      message: 'Analysis jobs fetched successfully',
    })
  } catch (error) {
    console.error('Error in jobs GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
