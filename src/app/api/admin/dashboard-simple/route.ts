import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET() {
  console.log('🚀 SIMPLE ADMIN DASHBOARD API CALLED')
  try {
    const supabase = await createClient()

    // Check admin authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', session.user.email)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('✅ Admin verified:', adminUser.email)

    // Create service role client for admin operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Fetch all auth users using service role
    const { data: authUsers, error: authError } = await serviceSupabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    const allUsers = authUsers?.users || []
    console.log('📊 Total auth users:', allUsers.length)

    // Fetch profiles using service role
    const { data: profiles, error: profilesError } = await serviceSupabase
      .from('profiles')
      .select('id, email, name, created_at, access_enabled')

    const profilesMap = new Map()
    if (profiles) {
      profiles.forEach((profile) => {
        profilesMap.set(profile.id, profile)
      })
    }

    // Fetch user analytics summary using service role
    const { data: analyticsData, error: analyticsError } = await serviceSupabase
      .from('user_analytics_summary')
      .select('*')

    const analyticsMap = new Map()
    if (analyticsData) {
      analyticsData.forEach((analytics) => {
        analyticsMap.set(analytics.user_id, analytics)
      })
    }

    // Fetch admin users using service role
    const { data: adminUsers, error: adminUsersError } = await serviceSupabase
      .from('admin_users')
      .select('email')
      .eq('is_active', true)

    const adminEmails = new Set()
    if (adminUsers) {
      adminUsers.forEach((admin) => adminEmails.add(admin.email))
    }

    // Fetch trial subscriptions using service role
    const { data: trialSubs, error: trialError } = await serviceSupabase
      .from('trial_subscriptions')
      .select('email, status, created_at, expires_at')

    const trialEmails = new Set()
    if (trialSubs) {
      trialSubs.forEach((trial) => trialEmails.add(trial.email))
    }

    // Fetch standard subscriptions using service role
    const { data: standardSubs, error: standardError } = await serviceSupabase
      .from('subscriptions')
      .select('user_id, plan_type, status, created_at')

    const standardUserIds = new Set()
    if (standardSubs) {
      standardSubs.forEach((sub) => standardUserIds.add(sub.user_id))
    }

    // Classify users
    const userClassifications = allUsers.map((user) => {
      let userType = 'PREMIUM' // Default for legacy users

      if (adminEmails.has(user.email)) {
        userType = 'ADMIN'
      } else if (trialEmails.has(user.email)) {
        userType = 'TRIAL'
      } else if (standardUserIds.has(user.id)) {
        userType = 'STANDARD'
      }

      const profile = profilesMap.get(user.id)
      const analytics = analyticsMap.get(user.id)

      return {
        id: user.id,
        email: user.email,
        name: profile?.name || user.email?.split('@')[0] || 'Unknown User',
        type: userType,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        access_enabled: profile?.access_enabled !== false, // Default to true if not set
        total_visits: analytics?.total_visits || 0,
        total_time_spent: analytics?.total_time_spent || 0,
        total_tasks_created: analytics?.total_tasks_created || 0,
        total_goals_created: analytics?.total_goals_created || 0,
        total_tasks_completed: analytics?.total_tasks_completed || 0,
        total_goals_completed: analytics?.total_goals_completed || 0,
        last_visit: analytics?.last_visit || user.created_at,
        first_visit: analytics?.first_visit || user.created_at,
      }
    })

    // Calculate stats
    const totalUsers = allUsers.length
    const activeUsersToday = allUsers.filter((user) => {
      if (!user.last_sign_in_at) return false
      const today = new Date()
      const lastSignIn = new Date(user.last_sign_in_at)
      return lastSignIn.toDateString() === today.toDateString()
    }).length

    const adminUsersList = userClassifications.filter((u) => u.type === 'ADMIN')
    const trialUsers = userClassifications.filter((u) => u.type === 'TRIAL')
    const standardUsers = userClassifications.filter((u) => u.type === 'STANDARD')
    const premiumUsers = userClassifications.filter((u) => u.type === 'PREMIUM')

    // Calculate totals
    const totalTasksCreated = userClassifications.reduce((sum, u) => sum + u.total_tasks_created, 0)
    const totalGoalsCreated = userClassifications.reduce((sum, u) => sum + u.total_goals_created, 0)
    const totalTasksCompleted = userClassifications.reduce(
      (sum, u) => sum + u.total_tasks_completed,
      0
    )
    const totalGoalsCompleted = userClassifications.reduce(
      (sum, u) => sum + u.total_goals_completed,
      0
    )
    const totalVisits = userClassifications.reduce((sum, u) => sum + u.total_visits, 0)
    const totalTimeSpent = userClassifications.reduce((sum, u) => sum + u.total_time_spent, 0)

    // Top active users (by time spent)
    const topActiveUsers = userClassifications
      .sort((a, b) => b.total_time_spent - a.total_time_spent)
      .slice(0, 10)

    // Trial stats
    const trialStats = {
      total: trialUsers.length,
      active: trialSubs?.filter((t) => t.status === 'active').length || 0,
      expired: trialSubs?.filter((t) => t.status === 'expired').length || 0,
      converted: trialSubs?.filter((t) => t.status === 'converted').length || 0,
      cancelled: trialSubs?.filter((t) => t.status === 'cancelled').length || 0,
      expiryNotificationsSent: 0, // TODO: implement
      expiredNotificationsSent: 0, // TODO: implement
      pendingNotifications: 0, // TODO: implement
    }

    // Standard stats
    const standardStats = {
      total: standardUsers.length,
      active: standardSubs?.filter((s) => s.status === 'active').length || 0,
      cancelled: standardSubs?.filter((s) => s.status === 'cancelled').length || 0,
      grace: standardSubs?.filter((s) => s.status === 'grace_period').length || 0,
      thisMonth:
        standardSubs?.filter((s) => {
          const created = new Date(s.created_at)
          const now = new Date()
          return (
            created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
          )
        }).length || 0,
    }

    // Premium stats
    const premiumStats = {
      total: premiumUsers.length,
      active: premiumUsers.filter(
        (u) =>
          u.last_sign_in_at &&
          new Date(u.last_sign_in_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      withActivity: premiumUsers.filter((u) => u.total_visits > 0).length,
    }

    const response = {
      // Basic dashboard data
      total_users: totalUsers,
      active_users_today: activeUsersToday,
      total_tasks_created: totalTasksCreated,
      total_goals_created: totalGoalsCreated,
      total_tasks_completed: totalTasksCompleted,
      total_goals_completed: totalGoalsCompleted,
      total_points_earned: 0, // Points system not implemented
      total_points_today: 0, // Points system not implemented
      average_session_duration: totalUsers > 0 ? totalTimeSpent / Math.max(totalVisits, 1) : 0,

      // User data
      top_active_users: topActiveUsers.map((user) => ({
        name: user.name,
        email: user.email,
        total_visits: user.total_visits,
        total_time_spent: user.total_time_spent,
        last_visit: user.last_visit,
        tasks_created: user.total_tasks_created,
        goals_created: user.total_goals_created,
        total_points: 0,
        today_points: 0,
      })),

      // User classifications
      users: userClassifications,

      // Subscription stats
      trialStats,
      standardStats,
      premiumStats,

      // Empty arrays for compatibility
      trials: trialSubs || [],
      standardSubscriptions: standardSubs || [],
      premiumUsers: premiumUsers,

      // Empty for now
      recentActivity: [],
      newUsers: userClassifications.slice(0, 10),
      bugReports: [],
      payments: [],
      paymentStats: {
        total: 0,
        totalRevenue: 0,
        basicPlanCount: 0,
        premiumPlanCount: 0,
        thisMonth: 0,
        thisMonthRevenue: 0,
      },
    }

    console.log('✅ Dashboard data prepared:', {
      totalUsers,
      activeToday: activeUsersToday,
      admin: adminUsers?.length || 0,
      trial: trialUsers.length,
      standard: standardUsers.length,
      premium: premiumUsers.length,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Simple admin dashboard error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
