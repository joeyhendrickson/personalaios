import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (adminError || !adminUser || !adminUser.is_active) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Fetch all trial subscriptions with email notification tracking
    const { data: trials, error: trialsError } = await supabase
      .from('trial_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (trialsError) {
      console.error('Error fetching trials:', trialsError)
      return NextResponse.json({ error: 'Failed to fetch trials' }, { status: 500 })
    }

    // Calculate statistics
    const now = new Date()
    const stats = {
      total: trials?.length || 0,
      active: trials?.filter(t => t.status === 'active' && new Date(t.trial_end) > now).length || 0,
      expired: trials?.filter(t => t.status === 'expired').length || 0,
      converted: trials?.filter(t => t.status === 'converted').length || 0,
      cancelled: trials?.filter(t => t.status === 'cancelled').length || 0,
      expiryNotificationsSent: trials?.filter(t => t.expiry_notification_sent_at !== null).length || 0,
      expiredNotificationsSent: trials?.filter(t => t.expired_notification_sent_at !== null).length || 0,
      pendingNotifications: trials?.filter(t => {
        if (t.status !== 'active') return false
        const trialEnd = new Date(t.trial_end)
        const hoursUntilExpiry = (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60)
        return hoursUntilExpiry <= 48 && hoursUntilExpiry > 0 && !t.expiry_notification_sent_at
      }).length || 0
    }

    // Enrich trial data with calculated fields
    const enrichedTrials = trials?.map(trial => {
      const trialEnd = new Date(trial.trial_end)
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const isExpired = trialEnd < now
      
      return {
        ...trial,
        daysRemaining: Math.max(0, daysRemaining),
        isExpired,
        notificationStatus: {
          expiryNotificationSent: !!trial.expiry_notification_sent_at,
          expiredNotificationSent: !!trial.expired_notification_sent_at,
          needsExpiryNotification: !isExpired && daysRemaining <= 2 && !trial.expiry_notification_sent_at,
          needsExpiredNotification: isExpired && trial.status === 'active' && !trial.expired_notification_sent_at
        }
      }
    })

    return NextResponse.json({
      success: true,
      trials: enrichedTrials,
      stats
    })

  } catch (error) {
    console.error('Admin trials fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
