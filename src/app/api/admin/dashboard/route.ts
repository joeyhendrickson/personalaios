import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

    // If no data found, let's check what tables exist
    if (!tasksData || tasksData.length === 0) {
      console.log('⚠️ No tasks data found - checking if table exists')
      const { data: tableCheck, error: tableError } = await supabase
        .from('tasks')
        .select('count', { count: 'exact' })
      console.log('Tasks table check:', { count: tableCheck, error: tableError })
    }

    if (tasksError) console.error('Error fetching tasks:', tasksError)
    if (goalsError) console.error('Error fetching goals:', goalsError)
    if (pointsError) console.error('Error fetching points:', pointsError)

    // Get user emails by querying the admin_users table and any other sources
    // Since we can't directly query auth.users, let's get emails from admin_users first
    const { data: adminEmails } = await supabase.from('admin_users').select('email')

    console.log('Admin emails:', adminEmails)

    // Create email map with real user IDs from the logs
    const emailMap = new Map()
    
    // Add known user IDs and emails from your data
    emailMap.set('94a93832-cd8e-47fe-aeae-dbd945557f79', 'josephgregoryhendrickson@gmail.com')
    emailMap.set('1603aa9b-0d89-4fb7-9faf-c477f6c60ef6', 'user2@example.com') // Placeholder for second user
    
    // Try to get user emails from auth.users table via a direct query
    // Since we can't query auth.users directly, let's try to get emails from other sources
    
    // Try to get more user emails from activity logs or other sources
    const { data: activityData } = await supabase
      .from('user_activity_logs')
      .select('user_id, activity_data')
      .limit(100)
    
    // Extract emails from activity data if available
    if (activityData) {
      activityData.forEach((activity) => {
        if (activity.activity_data && typeof activity.activity_data === 'object') {
          const data = activity.activity_data as any
          if (data.email && activity.user_id) {
            emailMap.set(activity.user_id, data.email)
          }
        }
      })
    }

    // Also try to get emails from admin_users table for known users
    const { data: adminUsers } = await supabase
      .from('admin_users')
      .select('email')
    
    // Map admin users to their IDs (we'll need to match by email if possible)
    if (adminUsers) {
      adminUsers.forEach(admin => {
        // We know josephgregoryhendrickson@gmail.com is the main admin
        if (admin.email === 'josephgregoryhendrickson@gmail.com') {
          emailMap.set('94a93832-cd8e-47fe-aeae-dbd945557f79', admin.email)
        }
      })
    }

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
    console.log('Email map:', Object.fromEntries(emailMap))
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

    // Debug: Show what we expect to find
    console.log('Expected user IDs from your data:', [
      '94a93832-cd8e-47fe-aeae-dbd945557f79',
      '1603aa9b-0d89-4fb7-9faf-c477f6c60ef6'
    ])

    // Calculate analytics for each user
    const userAnalyticsArray = Array.from(userIds).map((userId) => {
      const userPoints = pointsData?.filter((p) => p.user_id === userId) || []
      const userTasks = tasksData?.filter((t) => t.user_id === userId) || []
      const userGoals = goalsData?.filter((g) => g.user_id === userId) || []
      
      // Get real email from map or use fallback
      const userEmail = emailMap.get(userId) || `User ${(userId as string).substring(0, 8)}`

      console.log(`Processing user ${userId}:`, {
        email: userEmail,
        points: userPoints.length,
        tasks: userTasks.length,
        goals: userGoals.length
      })

      return {
        user_id: userId,
        email: userEmail,
        total_points: userPoints.reduce((sum, p) => sum + (p.points || 0), 0),
        today_points: userPoints.filter((p) => {
          const today = new Date()
          const pointDate = new Date(p.created_at)
          return pointDate >= new Date(today.setHours(0, 0, 0, 0))
        }).reduce((sum, p) => sum + (p.points || 0), 0),
        weekly_points: userPoints.filter((p) => {
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return new Date(p.created_at) >= weekAgo
        }).reduce((sum, p) => sum + (p.points || 0), 0),
        total_tasks_created: userTasks.length,
        total_tasks_completed: userTasks.filter((t) => t.status === 'completed').length,
        total_goals_created: userGoals.length,
        total_goals_completed: userGoals.filter((g) => g.is_completed).length,
        last_activity: userTasks.length > 0 ? 
          userTasks.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0].updated_at :
          new Date().toISOString(),
        first_visit: userTasks.length > 0 ?
          userTasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].created_at :
          new Date().toISOString(),
        total_visits: 0, // We don't have visit tracking yet
        total_time_spent: 0, // We don't have time tracking yet
      }
    })

    console.log('Final user analytics array:', userAnalyticsArray)

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
      user_id: analytics.user_id,
      email: analytics.email,
      created_at: analytics.first_visit,
      last_sign_in_at: analytics.last_activity,
      total_visits: analytics.total_visits,
      total_time_spent: analytics.total_time_spent,
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
