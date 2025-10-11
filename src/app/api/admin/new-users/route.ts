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

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get URL parameters for time range
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24') // Default to last 24 hours

    // Get new users in the specified time range from profiles table
    const { data: newUsers, error: newUsersError } = await supabase
      .from('profiles')
      .select('id, email, name, created_at')
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (newUsersError) {
      console.error('Error fetching new users:', newUsersError)
      return NextResponse.json({ error: 'Failed to fetch new users' }, { status: 500 })
    }

    // Get recent activity for these users
    const userIds = newUsers?.map((u: any) => u.id) || []
    const { data: recentActivity, error: activityError } = await supabase
      .from('user_activity_logs')
      .select('user_id, activity_type, created_at')
      .in('user_id', userIds)
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (activityError) {
      console.error('Error fetching recent activity:', activityError)
    }

    return NextResponse.json({
      newUsers: newUsers || [],
      recentActivity: recentActivity || [],
      timeRange: `${hours} hours`,
    })
  } catch (error) {
    console.error('Unexpected error in new users:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
