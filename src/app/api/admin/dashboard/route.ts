import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  console.log('🚀 ADMIN DASHBOARD API CALLED - STARTING EXECUTION')
  try {
    const supabase = await createClient()

    // Try to get user from session first
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    console.log('Session check:', { session: session?.user?.email, sessionError })

    let user = session?.user

    // If no session, try getUser
    if (!user) {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()
      console.log('Auth user check:', { user: authUser?.email, authError })
      user = authUser || undefined
    }

    if (!user) {
      console.log('No user found in session or auth')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User found:', user.email)

    // Check if user is admin - simplified check
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', user.email)
      .single()

    console.log('Admin check:', { adminUser, adminError, userEmail: user.email })

    if (adminError || !adminUser) {
      console.log('Admin access denied:', adminError)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get users from the tasks table (this should work)
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('user_id, status, created_at, updated_at')

    const { data: goalsData, error: goalsError } = await supabase
      .from('goals')
      .select('user_id, is_completed, created_at, updated_at')

    const { data: pointsData, error: pointsError } = await supabase
      .from('points_ledger')
      .select('user_id, points, created_at')

    console.log('Data counts:', {
      tasks: tasksData?.length,
      goals: goalsData?.length,
      points: pointsData?.length,
    })

    console.log('Sample tasks data:', tasksData?.slice(0, 3))
    console.log('Sample goals data:', goalsData?.slice(0, 3))
    console.log('Sample points data:', pointsData?.slice(0, 3))

    if (tasksError) console.error('Error fetching tasks:', tasksError)
    if (goalsError) console.error('Error fetching goals:', goalsError)
    if (pointsError) console.error('Error fetching points:', pointsError)

    // Get user emails by querying the admin_users table and any other sources
    // Since we can't directly query auth.users, let's get emails from admin_users first
    const { data: adminEmails } = await supabase.from('admin_users').select('email')

    console.log('Admin emails:', adminEmails)

    // For now, let's create a simple email map with known emails
    const emailMap = new Map()

    // Add admin emails
    if (adminEmails) {
      adminEmails.forEach((_admin) => {
        // We need to find the user_id for this email
        // For now, let's just add it to a list we can reference
      })
    }

    // Add some known emails manually for testing
    emailMap.set('479218be-0000-0000-0000-000000000000', 'josephgregoryhendrickson@gmail.com')
    emailMap.set('94a93832-0000-0000-0000-000000000000', 'joeyhendrickson@gmail.com')
    emailMap.set('90779c8f-0000-0000-0000-000000000000', 'test@example.com')

    console.log('Data fetched successfully:', {
      tasks: tasksData?.length || 0,
      goals: goalsData?.length || 0,
      points: pointsData?.length || 0,
    })

    // Get analytics data
    const { error: analyticsError } = await supabase.from('user_analytics_summary').select('*')

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError)
      // Don't fail, just use empty analytics
    }

    // Get unique user IDs from the data
    const userIds = new Set()
    if (tasksData) tasksData.forEach((t) => userIds.add(t.user_id))
    if (goalsData) goalsData.forEach((g) => userIds.add(g.user_id))
    if (pointsData) pointsData.forEach((p) => userIds.add(p.user_id))

    console.log('Unique user IDs:', Array.from(userIds))
    console.log(
      'User IDs from tasks:',
      tasksData?.map((t) => t.user_id)
    )
    console.log(
      'User IDs from goals:',
      goalsData?.map((g) => g.user_id)
    )
    console.log(
      'User IDs from points:',
      pointsData?.map((p) => p.user_id)
    )

    // Calculate analytics for each user
    const userAnalyticsArray = Array.from(userIds).map((userId) => {
      const userPoints = pointsData?.filter((p) => p.user_id === userId) || []
      const userTasks = tasksData?.filter((t) => t.user_id === userId) || []
      const userGoals = goalsData?.filter((g) => g.user_id === userId) || []

      return {
        user_id: userId,
        email: `User ${(userId as string).substring(0, 8)}`, // We'll get real emails later
        total_points: userPoints.reduce((sum, p) => sum + (p.points || 0), 0),
        today_points: 0,
        weekly_points: 0,
        total_tasks_created: userTasks.length,
        total_tasks_completed: userTasks.filter((t) => t.status === 'completed').length,
        total_goals_created: userGoals.length,
        total_goals_completed: userGoals.filter((g) => g.is_completed).length,
        last_activity: new Date().toISOString(),
        first_visit: new Date().toISOString(),
      }
    })

    // Email map is already created above

    const dashboardData = {
      total_users: userAnalyticsArray.length,
      active_users_today: userAnalyticsArray.filter(
        (a) =>
          a.last_activity && new Date(a.last_activity) >= new Date(new Date().setHours(0, 0, 0, 0))
      ).length,
      total_tasks_created: userAnalyticsArray.reduce((sum, a) => sum + a.total_tasks_created, 0),
      total_goals_created: userAnalyticsArray.reduce((sum, a) => sum + a.total_goals_created, 0),
      total_tasks_completed: userAnalyticsArray.reduce(
        (sum, a) => sum + a.total_tasks_completed,
        0
      ),
      total_goals_completed: userAnalyticsArray.reduce(
        (sum, a) => sum + a.total_goals_completed,
        0
      ),
      total_points_earned: userAnalyticsArray.reduce((sum, a) => sum + a.total_points, 0),
      total_points_today: userAnalyticsArray.reduce((sum, a) => sum + a.today_points, 0),
      average_session_duration: 0,
      top_active_users: userAnalyticsArray
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 5)
        .map((analytics) => ({
          email: analytics.email,
          total_visits: 0, // We don't have visit data yet
          total_time_spent: 0, // We don't have time data yet
          last_visit: analytics.last_activity,
          total_points: analytics.total_points,
          today_points: analytics.today_points,
          weekly_points: analytics.weekly_points,
        })),
    }

    // Build users data from real analytics
    const users = userAnalyticsArray.map((analytics) => ({
      user_id: analytics.email, // Use email as ID for now
      email: analytics.email,
      created_at: analytics.first_visit,
      last_sign_in_at: analytics.last_activity,
      total_visits: 0, // We don't have visit data yet
      total_time_spent: 0, // We don't have time data yet
      total_tasks_created: analytics.total_tasks_created,
      total_goals_created: analytics.total_goals_created,
      total_tasks_completed: analytics.total_tasks_completed,
      total_goals_completed: analytics.total_goals_completed,
      total_points: analytics.total_points,
      today_points: analytics.today_points,
      weekly_points: analytics.weekly_points,
      last_visit: analytics.last_activity,
      first_visit: analytics.first_visit,
    }))

    // Get recent activity logs and map to real emails
    const { data: recentActivityRaw, error: activityError } = await supabase
      .from('user_activity_logs')
      .select(
        `
        id,
        user_id,
        activity_type,
        activity_data,
        page_url,
        created_at
      `
      )
      .order('created_at', { ascending: false })
      .limit(50)

    // Map activity logs to include real emails
    const recentActivity =
      recentActivityRaw?.map((activity) => {
        const userData = userAnalyticsArray.find((u) => u.user_id === activity.user_id)
        return {
          ...activity,
          auth: {
            users: {
              email: userData?.email || `User ${activity.user_id.substring(0, 8)}`,
            },
          },
        }
      }) || []

    console.log('Activity data:', { recentActivity: recentActivity?.length, activityError })

    if (activityError) {
      console.error('Error fetching recent activity:', activityError)
      // Don't fail completely, just use empty data
      console.log('Continuing with empty activity data')
    }

    return NextResponse.json({
      dashboard: dashboardData || {},
      users: users || [],
      recentActivity: recentActivity || [],
      adminUser: {
        email: adminUser.email,
        role: adminUser.role,
      },
    })
  } catch (error) {
    console.error('Unexpected error in admin dashboard:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
