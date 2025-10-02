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

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const activityType = searchParams.get('activityType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const offset = (page - 1) * limit

    // Build query for activity logs
    let query = supabase.from('user_activity_logs').select(`
        *,
        auth.users!inner(email)
      `)

    // Add filters
    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (activityType) {
      query = query.eq('activity_type', activityType)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Add sorting and pagination
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data: activities, error: activitiesError } = await query

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('user_activity_logs')
      .select('id', { count: 'exact', head: true })

    if (userId) countQuery = countQuery.eq('user_id', userId)
    if (activityType) countQuery = countQuery.eq('activity_type', activityType)
    if (startDate) countQuery = countQuery.gte('created_at', startDate)
    if (endDate) countQuery = countQuery.lte('created_at', endDate)

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error fetching activity count:', countError)
      return NextResponse.json({ error: 'Failed to fetch activity count' }, { status: 500 })
    }

    // Get activity type statistics
    const { data: activityStats, error: statsError } = await supabase
      .from('user_activity_logs')
      .select('activity_type')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    if (statsError) {
      console.error('Error fetching activity stats:', statsError)
    }

    // Count activity types
    const activityTypeCounts = (activityStats || []).reduce(
      (acc: Record<string, number>, activity) => {
        acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1
        return acc
      },
      {}
    )

    return NextResponse.json({
      activities: activities || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      activityTypeCounts,
    })
  } catch (error) {
    console.error('Unexpected error in admin activity:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
