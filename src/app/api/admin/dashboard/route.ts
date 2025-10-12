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

    console.log('Admin check:', {
      adminUser,
      adminError,
      userEmail: user.email,
      userId: user.id,
      sessionExists: !!session,
    })

    if (adminError || !adminUser) {
      console.log('Admin access denied:', adminError)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get data from tables that actually exist and have data
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('user_id, status, created_at, updated_at')

    const { data: goalsData, error: goalsError } = await supabase
      .from('goals')
      .select('user_id, is_completed, created_at, updated_at')

    // Skip points_ledger for now since it might not exist
    const pointsData: any[] = []
    const pointsError = null

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

    // Get ALL users from auth.users using a direct query (requires service role)
    // First try the admin method, if it fails, we'll use a different approach
    let authUsers = null
    let authUsersError = null

    try {
      const { data, error } = await supabase.auth.admin.listUsers()
      authUsers = data
      authUsersError = error
      console.log('Auth users fetched via admin:', authUsers?.users?.length, authUsersError)
    } catch (error) {
      console.log('Admin method failed, trying alternative approach:', error)
      // Alternative: We'll work with what we have in profiles and expand from there
      authUsers = null
      authUsersError = error
    }

    // Get profiles for users who have them
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, name, created_at')

    console.log('Profiles fetched:', profiles?.length, profilesError)

    // Create a combined user list from auth.users with profile data where available
    let allUsers = []

    if (authUsers?.users) {
      // We have auth users, use them as the source of truth
      allUsers = authUsers.users.map((authUser) => {
        const profile = profiles?.find((p) => p.id === authUser.id)
        return {
          id: authUser.id,
          email: authUser.email || 'No email',
          name:
            profile?.name ||
            authUser.user_metadata?.name ||
            authUser.email?.split('@')[0] ||
            'Unknown User',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          confirmed_at: authUser.email_confirmed_at,
        }
      })
    } else {
      // Fallback: Use profiles and create missing ones for known users
      console.log('Using profiles as fallback, creating missing profile records...')

      // Known users from your Supabase dashboard
      const knownUsers = [
        { id: '154e2f51-7266-457a-a932-cf9def5756dd', email: 'lbarnett243@gmail.com' },
        { id: '1603aa9b-0d89-4fb7-9faf-c477f6c60ef6', email: 'hendricksonemma@gmail.com' },
        { id: '90779c8f-2a2c-4aa8-ac92-3c98fef3c8dc', email: 'josephgregoryhendrickson@gmail.com' },
        { id: '479218be-86cd-4754-9143-09a7a24b877d', email: 'joeyhendrickson@gmail.com' },
        { id: '94a93832-cd8e-47fe-aeae-dbd945557f79', email: 'joeyhendrickson@me.com' },
      ]

      allUsers = knownUsers.map((user) => {
        const profile = profiles?.find((p) => p.id === user.id)
        return {
          id: user.id,
          email: user.email,
          name: profile?.name || user.email.split('@')[0] || 'Unknown User',
          created_at: profile?.created_at || new Date().toISOString(),
          last_sign_in_at: null,
          confirmed_at: null,
        }
      })
    }

    // Create maps for email and name lookups from allUsers
    const emailMap = new Map()
    const nameMap = new Map()

    if (allUsers) {
      allUsers.forEach((user) => {
        if (user.id) {
          emailMap.set(user.id, user.email || 'Unknown')
          nameMap.set(user.id, user.name || user.email?.split('@')[0] || 'Unknown User')
        }
      })
    }

    console.log('User maps created:', {
      emailCount: emailMap.size,
      nameCount: nameMap.size,
    })

    console.log('Data fetched successfully:', {
      tasks: tasksData?.length || 0,
      goals: goalsData?.length || 0,
      points: pointsData?.length || 0,
    })

    // Get all user activity logs to calculate visits and time spent
    const { data: allActivityLogs, error: allActivityError } = await supabase
      .from('user_activity_logs')
      .select('user_id, created_at, activity_data')
      .order('created_at', { ascending: true })

    console.log('Activity logs fetched:', allActivityLogs?.length, allActivityError)

    // Calculate visits and time spent per user
    const userSessionData = new Map()

    if (allActivityLogs) {
      allActivityLogs.forEach((log) => {
        if (!userSessionData.has(log.user_id)) {
          userSessionData.set(log.user_id, {
            visits: 0,
            totalTimeSpent: 0,
            sessions: [],
            lastActivityTime: null,
          })
        }

        const userData = userSessionData.get(log.user_id)
        const logTime = new Date(log.created_at).getTime()

        // Start a new session if last activity was more than 30 minutes ago
        if (!userData.lastActivityTime || logTime - userData.lastActivityTime > 30 * 60 * 1000) {
          userData.visits++
          userData.sessions.push({ start: logTime, end: logTime })
        } else {
          // Extend current session
          const currentSession = userData.sessions[userData.sessions.length - 1]
          currentSession.end = logTime
        }

        userData.lastActivityTime = logTime
      })

      // Calculate total time spent from all sessions
      userSessionData.forEach((data) => {
        data.totalTimeSpent =
          data.sessions.reduce((total: number, session: { start: number; end: number }) => {
            return total + (session.end - session.start)
          }, 0) / 1000 // Convert to seconds
      })
    }

    console.log('User session data calculated:', {
      users: userSessionData.size,
      sample: Array.from(userSessionData.entries()).slice(0, 2),
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
      '1603aa9b-0d89-4fb7-9faf-c477f6c60ef6',
    ])

    // Calculate analytics for each user
    const userAnalyticsArray = Array.from(userIds).map((userId) => {
      const userPoints = pointsData?.filter((p) => p.user_id === userId) || []
      const userTasks = tasksData?.filter((t) => t.user_id === userId) || []
      const userGoals = goalsData?.filter((g) => g.user_id === userId) || []

      // Get real email and name from maps or use fallback
      const userEmail = emailMap.get(userId) || `User ${(userId as string).substring(0, 8)}`
      const userName = nameMap.get(userId) || userEmail.split('@')[0] || 'Unknown User'

      const sessionData = userSessionData.get(userId) || { visits: 0, totalTimeSpent: 0 }

      console.log(`Processing user ${userId}:`, {
        name: userName,
        email: userEmail,
        points: userPoints.length,
        tasks: userTasks.length,
        goals: userGoals.length,
        visits: sessionData.visits,
        timeSpent: sessionData.totalTimeSpent,
      })

      return {
        user_id: userId,
        name: userName,
        email: userEmail,
        total_points: 0, // Points system not implemented in current analytics
        today_points: 0, // Points system not implemented in current analytics
        weekly_points: 0, // Points system not implemented in current analytics
        total_tasks_created: userTasks.length,
        total_tasks_completed: userTasks.filter((t) => t.status === 'completed').length,
        total_goals_created: userGoals.length,
        total_goals_completed: userGoals.filter((g) => g.is_completed).length,
        last_activity:
          userTasks.length > 0
            ? userTasks.sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              )[0].updated_at
            : new Date().toISOString(),
        first_visit:
          userTasks.length > 0
            ? userTasks.sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )[0].created_at
            : new Date().toISOString(),
        total_visits: sessionData.visits,
        total_time_spent: sessionData.totalTimeSpent,
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
      total_points_earned: 0, // Points system not implemented in current analytics
      total_points_today: 0, // Points system not implemented in current analytics
      average_session_duration:
        userAnalyticsArray.length > 0
          ? userAnalyticsArray.reduce(
              (sum, a) => sum + a.total_time_spent / Math.max(a.total_visits, 1),
              0
            ) / userAnalyticsArray.length
          : 0,
      top_active_users: userAnalyticsArray
        .sort((a, b) => b.total_time_spent - a.total_time_spent)
        .slice(0, 5)
        .map((analytics) => ({
          name: analytics.name,
          email: analytics.email,
          total_visits: analytics.total_visits,
          total_time_spent: analytics.total_time_spent,
          last_visit: analytics.last_activity,
          total_points: 0, // Points system not implemented in current analytics
          today_points: 0, // Points system not implemented in current analytics
          weekly_points: 0, // Points system not implemented in current analytics
        })),
    }

    // Build users data from real analytics
    const users = userAnalyticsArray.map((analytics) => ({
      user_id: analytics.user_id,
      name: analytics.name,
      email: analytics.email,
      created_at: analytics.first_visit,
      last_sign_in_at: analytics.last_activity,
      total_visits: analytics.total_visits,
      total_time_spent: analytics.total_time_spent,
      total_tasks_created: analytics.total_tasks_created,
      total_goals_created: analytics.total_goals_created,
      total_tasks_completed: analytics.total_tasks_completed,
      total_goals_completed: analytics.total_goals_completed,
      total_points: 0, // Points system not implemented in current analytics
      today_points: 0, // Points system not implemented in current analytics
      weekly_points: 0, // Points system not implemented in current analytics
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

    // Get trial users
    const { data: trialUsers } = await supabase.from('trial_subscriptions').select('email')

    const trialEmails = new Set(trialUsers?.map((t) => t.email) || [])

    // Get Standard subscriptions data
    const { data: standardSubs, error: standardSubsError } = await supabase
      .from('subscriptions')
      .select(
        `
        id,
        user_id,
        plan_type,
        status,
        current_period_start,
        current_period_end,
        paypal_subscription_id,
        payment_failed_at,
        grace_period_end,
        created_at,
        updated_at
      `
      )
      .eq('plan_type', 'standard')
      .order('created_at', { ascending: false })

    const standardUserIds = new Set(standardSubs?.map((s) => s.user_id) || [])

    // Map subscription data to include user names and emails
    const standardSubscriptions =
      standardSubs?.map((sub) => {
        const userEmail = emailMap.get(sub.user_id) || 'Unknown'
        const userName = nameMap.get(sub.user_id) || userEmail.split('@')[0] || 'Unknown User'

        return {
          ...sub,
          email: userEmail,
          name: userName,
          daysActive: sub.current_period_start
            ? Math.floor(
                (Date.now() - new Date(sub.current_period_start).getTime()) / (1000 * 60 * 60 * 24)
              )
            : 0,
          isGracePeriod: sub.status === 'grace_period',
          graceDaysRemaining: sub.grace_period_end
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(sub.grace_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
              )
            : 0,
        }
      }) || []

    // Calculate standard subscription stats
    const standardStats = {
      total: standardSubscriptions.length,
      active: standardSubscriptions.filter((s) => s.status === 'active').length,
      gracePeriod: standardSubscriptions.filter((s) => s.status === 'grace_period').length,
      cancelled: standardSubscriptions.filter((s) => s.status === 'cancelled').length,
      paymentFailed: standardSubscriptions.filter((s) => s.payment_failed_at).length,
    }

    console.log('Standard subscriptions data:', {
      count: standardSubscriptions.length,
      stats: standardStats,
      error: standardSubsError,
    })

    // Get ALL admin users to exclude them from Premium
    const { data: allAdminUsers } = await supabase
      .from('admin_users')
      .select('email')
      .eq('is_active', true)

    const adminEmails = new Set(allAdminUsers?.map((admin) => admin.email) || [])

    // Get Premium users (all users who are NOT trial and NOT standard)
    // Premium users are users in auth.users/profiles who don't have trial or standard subscriptions
    console.log('Premium user filtering debug:', {
      totalAuthUsers: allUsers?.length,
      totalProfiles: profiles?.length,
      trialEmails: Array.from(trialEmails),
      standardUserIds: Array.from(standardUserIds),
      adminEmails: Array.from(adminEmails),
      currentAdminEmail: adminUser.email,
    })

    const premiumUsers =
      allUsers
        ?.filter((user) => {
          const isTrial = trialEmails.has(user.email)
          const isStandard = standardUserIds.has(user.id)
          const isAdmin = adminEmails.has(user.email) // Check against ALL admin emails

          console.log(`User ${user.email}:`, {
            isTrial,
            isStandard,
            isAdmin,
            willBePremium: !isTrial && !isStandard && !isAdmin,
          })

          // Premium users are: not trial, not standard, not ANY admin
          return !isTrial && !isStandard && !isAdmin
        })
        .map((user) => {
          // Get user analytics data if available
          const userAnalytics = userAnalyticsArray.find((u) => u.user_id === user.id)

          return {
            id: user.id,
            user_id: user.id,
            email: user.email,
            name: user.name || user.email?.split('@')[0] || 'Unknown User',
            created_at: user.created_at,
            total_points: 0, // Points system not implemented in current analytics
            total_visits: userAnalytics?.total_visits || 0,
            total_time_spent: userAnalytics?.total_time_spent || 0,
            last_activity: userAnalytics?.last_activity || user.created_at,
          }
        }) || []

    // Calculate premium user stats
    const premiumStats = {
      total: premiumUsers.length,
      active: premiumUsers.filter((u) => {
        const lastActivity = new Date(u.last_activity)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return lastActivity >= weekAgo
      }).length,
      withActivity: premiumUsers.filter((u) => u.total_visits > 0).length,
    }

    console.log('Premium users data:', {
      count: premiumUsers.length,
      stats: premiumStats,
    })

    return NextResponse.json({
      dashboard: dashboardData || {},
      users: users || [],
      recentActivity: recentActivity || [],
      standardSubscriptions: standardSubscriptions || [],
      standardStats: standardStats,
      premiumUsers: premiumUsers || [],
      premiumStats: premiumStats,
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
