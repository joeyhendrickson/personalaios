import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendTrialExpiryWarning,
  sendTrialExpiredNotification,
} from '@/lib/email/trial-expiry-notifications'

// This endpoint should be called by a cron job (e.g., Vercel Cron, external scheduler)
// Run daily to check for trials that need notification
export async function GET(request: Request) {
  try {
    // Verify the request is from authorized source
    // Vercel Cron automatically includes authorization, but we also check CRON_SECRET for manual triggers
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')

    // Allow if it's from Vercel Cron OR if the secret matches
    if (!isVercelCron && expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const now = new Date()

    // Calculate time ranges for notifications
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Find active trials that need notifications
    const { data: trialsToNotify, error: trialsError } = await supabase
      .from('trial_subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('trial_end', now.toISOString())
      .lte('trial_end', fortyEightHoursFromNow.toISOString())

    if (trialsError) {
      console.error('Error fetching trials:', trialsError)
      return NextResponse.json({ error: 'Failed to fetch trials' }, { status: 500 })
    }

    console.log(`Found ${trialsToNotify?.length || 0} trials to check for notifications`)

    const notifications = []
    const errors = []

    // Check each trial for appropriate notifications
    for (const trial of trialsToNotify || []) {
      const trialEnd = new Date(trial.trial_end)
      const hoursRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60))
      const daysRemaining = Math.ceil(hoursRemaining / 24)

      // Send 48-hour warning (2 days remaining)
      if (daysRemaining === 2 && !trial.expiry_notification_sent_at) {
        console.log(`Sending 48-hour notification to ${trial.email}`)

        const emailResult = await sendTrialExpiryWarning(
          trial.email,
          trial.name || '',
          daysRemaining
        )

        if (emailResult.success) {
          // Update trial record with notification timestamp
          await supabase
            .from('trial_subscriptions')
            .update({
              expiry_notification_sent_at: now.toISOString(),
              expiry_notification_message_id: emailResult.messageId,
              updated_at: now.toISOString(),
            })
            .eq('id', trial.id)

          notifications.push({
            trialId: trial.id,
            email: trial.email,
            status: '48h_warning_sent',
            messageId: emailResult.messageId,
          })
        } else {
          errors.push({
            trialId: trial.id,
            email: trial.email,
            error: emailResult.error,
          })
        }
      }

      // Send 24-hour warning (1 day remaining)
      if (
        daysRemaining === 1 &&
        trial.expiry_notification_sent_at &&
        !trial.expired_notification_sent_at
      ) {
        console.log(`Sending 24-hour notification to ${trial.email}`)

        const emailResult = await sendTrialExpiryWarning(
          trial.email,
          trial.name || '',
          daysRemaining
        )

        if (emailResult.success) {
          // Update trial record with 24h notification
          await supabase
            .from('trial_subscriptions')
            .update({
              expired_notification_sent_at: now.toISOString(),
              expired_notification_message_id: emailResult.messageId,
              updated_at: now.toISOString(),
            })
            .eq('id', trial.id)

          notifications.push({
            trialId: trial.id,
            email: trial.email,
            status: '24h_warning_sent',
            messageId: emailResult.messageId,
          })
        } else {
          errors.push({
            trialId: trial.id,
            email: trial.email,
            error: emailResult.error,
          })
        }
      }
    }

    // Find trials that have expired but haven't been notified of expiration
    const { data: expiredTrials, error: expiredError } = await supabase
      .from('trial_subscriptions')
      .select('*')
      .eq('status', 'active')
      .is('expired_notification_sent_at', null)
      .lt('trial_end', now.toISOString())

    if (!expiredError && expiredTrials && expiredTrials.length > 0) {
      console.log(`Found ${expiredTrials.length} expired trials to notify`)

      for (const trial of expiredTrials) {
        console.log(`Sending expiration notification to ${trial.email}`)

        // Update status to expired
        await supabase
          .from('trial_subscriptions')
          .update({
            status: 'expired',
            updated_at: now.toISOString(),
          })
          .eq('id', trial.id)

        const emailResult = await sendTrialExpiredNotification(trial.email, trial.name || '')

        if (emailResult.success) {
          // Update trial record with expiration notification
          await supabase
            .from('trial_subscriptions')
            .update({
              expired_notification_sent_at: now.toISOString(),
              expired_notification_message_id: emailResult.messageId,
              updated_at: now.toISOString(),
            })
            .eq('id', trial.id)

          notifications.push({
            trialId: trial.id,
            email: trial.email,
            status: 'expired_notification_sent',
            messageId: emailResult.messageId,
          })
        } else {
          errors.push({
            trialId: trial.id,
            email: trial.email,
            error: emailResult.error,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: now.toISOString(),
      notifications: notifications.length,
      errors: errors.length,
      details: {
        notifications,
        errors,
      },
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Allow POST as well for manual triggering
export async function POST(request: Request) {
  return GET(request)
}
