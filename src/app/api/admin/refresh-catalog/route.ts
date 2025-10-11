import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// This endpoint will be called by Vercel cron job every 3 days
export async function GET(request: Request) {
  console.log('🔄 AUTO REFRESH CATALOG - CRON JOB TRIGGERED')

  try {
    // Verify this is a cron job request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Fetch fresh data catalog
    const dataCatalog = await fetchDataCatalog(supabase)
    const timestamp = new Date().toISOString()

    // Store with metadata
    const catalogWithTimestamp = {
      ...dataCatalog,
      _metadata: {
        last_updated: timestamp,
        next_refresh: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        version: '1.0',
        total_tables: Object.keys(dataCatalog).length,
        refresh_source: 'automated_cron',
      },
    }

    // Log the refresh for monitoring
    console.log('✅ Catalog auto-refreshed:', {
      timestamp,
      total_tables: Object.keys(dataCatalog).length,
      user_count: dataCatalog.user_classification?.count || 0,
    })

    return NextResponse.json({
      success: true,
      message: 'Data catalog refreshed successfully',
      timestamp: timestamp,
      data: catalogWithTimestamp,
      next_refresh: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (error) {
    console.error('❌ Auto refresh catalog error:', error)
    return NextResponse.json(
      {
        error: 'Failed to auto-refresh catalog',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Helper function to fetch data catalog (same as in raw-data route)
async function fetchDataCatalog(supabase: any) {
  const catalog: any = {}

  // 1. Auth Users Data
  try {
    const { data: authUsers, error } = await supabase.auth.admin.listUsers()
    catalog.auth_users = {
      count: authUsers?.users?.length || 0,
      columns: ['id', 'email', 'created_at', 'last_sign_in_at', 'email_confirmed_at'],
      sample_data: authUsers?.users?.slice(0, 3) || [],
      description: 'Supabase authentication users - source of truth for all users',
    }
  } catch (error) {
    catalog.auth_users = { error: 'Failed to fetch auth users', details: error }
  }

  // 2. Profiles Data
  try {
    const { data: profiles, error } = await supabase.from('profiles').select('*').limit(10)

    if (!error && profiles) {
      catalog.profiles = {
        count: profiles.length,
        columns: Object.keys(profiles[0] || {}),
        sample_data: profiles.slice(0, 3),
        description: 'User profile information linked to auth.users.id',
      }
    }
  } catch (error) {
    catalog.profiles = { error: 'Failed to fetch profiles', details: error }
  }

  // 3. Admin Users Data
  try {
    const { data: adminUsers, error } = await supabase.from('admin_users').select('*')

    if (!error && adminUsers) {
      catalog.admin_users = {
        count: adminUsers.length,
        columns: Object.keys(adminUsers[0] || {}),
        sample_data: adminUsers,
        description: 'Admin users with special dashboard access',
      }
    }
  } catch (error) {
    catalog.admin_users = { error: 'Failed to fetch admin users', details: error }
  }

  // 4. Trial Subscriptions Data
  try {
    const { data: trialSubs, error } = await supabase.from('trial_subscriptions').select('*')

    if (!error && trialSubs) {
      catalog.trial_subscriptions = {
        count: trialSubs.length,
        columns: Object.keys(trialSubs[0] || {}),
        sample_data: trialSubs,
        description: '7-day free trial users',
      }
    }
  } catch (error) {
    catalog.trial_subscriptions = { error: 'Failed to fetch trial subscriptions', details: error }
  }

  // 5. Standard Subscriptions Data
  try {
    const { data: standardSubs, error } = await supabase.from('subscriptions').select('*')

    if (!error && standardSubs) {
      catalog.subscriptions = {
        count: standardSubs.length,
        columns: Object.keys(standardSubs[0] || {}),
        sample_data: standardSubs,
        description: 'Standard plan subscribers ($19.99/month)',
      }
    }
  } catch (error) {
    catalog.subscriptions = { error: 'Failed to fetch subscriptions', details: error }
  }

  // 6. User Activity Logs Data
  try {
    const { data: activityLogs, error } = await supabase
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error && activityLogs) {
      catalog.user_activity_logs = {
        count: activityLogs.length,
        columns: Object.keys(activityLogs[0] || {}),
        sample_data: activityLogs,
        description: 'Detailed user activity tracking (page visits, interactions)',
      }
    }
  } catch (error) {
    catalog.user_activity_logs = { error: 'Failed to fetch activity logs', details: error }
  }

  // 7. User Analytics Summary Data
  try {
    const { data: analyticsSummary, error } = await supabase
      .from('user_analytics_summary')
      .select('*')

    if (!error && analyticsSummary) {
      catalog.user_analytics_summary = {
        count: analyticsSummary.length,
        columns: Object.keys(analyticsSummary[0] || {}),
        sample_data: analyticsSummary,
        description: 'Aggregated user analytics (visits, time spent, tasks, goals)',
      }
    }
  } catch (error) {
    catalog.user_analytics_summary = { error: 'Failed to fetch analytics summary', details: error }
  }

  // 8. User Classification Summary
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const { data: adminUsers } = await supabase
      .from('admin_users')
      .select('email')
      .eq('is_active', true)
    const { data: trialUsers } = await supabase.from('trial_subscriptions').select('email')
    const { data: standardUsers } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('plan_type', 'standard')

    if (authUsers?.users) {
      const classification = authUsers.users.map((user: any) => {
        let userType = 'PREMIUM' // Default for legacy users

        if (adminUsers?.some((admin: any) => admin.email === user.email)) {
          userType = 'ADMIN'
        } else if (trialUsers?.some((trial: any) => trial.email === user.email)) {
          userType = 'TRIAL'
        } else if (standardUsers?.some((std: any) => std.user_id === user.id)) {
          userType = 'STANDARD'
        }

        return {
          id: user.id,
          email: user.email,
          type: userType,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        }
      })

      catalog.user_classification = {
        count: classification.length,
        summary: {
          ADMIN: classification.filter((u: any) => u.type === 'ADMIN').length,
          TRIAL: classification.filter((u: any) => u.type === 'TRIAL').length,
          STANDARD: classification.filter((u: any) => u.type === 'STANDARD').length,
          PREMIUM: classification.filter((u: any) => u.type === 'PREMIUM').length,
        },
        users: classification,
        description: 'Current user classification based on subscription status',
      }
    }
  } catch (error) {
    catalog.user_classification = { error: 'Failed to classify users', details: error }
  }

  return catalog
}
