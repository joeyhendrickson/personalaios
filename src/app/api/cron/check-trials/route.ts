import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTrialExpiryNotification, sendTrialExpiredNotification } from '@/lib/email/trial-notification'

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
    
    // Calculate 48 hours from now
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // Find active trials that expire in approximately 48 hours and haven't been notified
    const { data: trialsToNotify, error: trialsError } = await supabase
      .from('trial_subscriptions')
      .select('*')
      .eq('status', 'active')
      .is('expiry_notification_sent_at', null)
      .lte('trial_end', fortyEightHoursFromNow.toISOString())
      .gte('trial_end', now.toISOString())

    if (trialsError) {
      console.error('Error fetching trials:', trialsError)
      return NextResponse.json({ error: 'Failed to fetch trials' }, { status: 500 })
    }

    console.log(`Found ${trialsToNotify?.length || 0} trials to notify`)

    const notifications = []
    const errors = []

    // Send notifications for trials expiring in 48 hours
    for (const trial of trialsToNotify || []) {
      const trialEnd = new Date(trial.trial_end)
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // Only send if it's approximately 2 days remaining
      if (daysRemaining === 2) {
        console.log(`Sending 48-hour notification to ${trial.email}`)
        
        const emailResult = await sendTrialExpiryNotification({
          email: trial.email,
          name: trial.name || undefined,
          daysRemaining: 2,
          trialEndDate: trial.trial_end,
          conversionPrice: trial.conversion_price,
          planType: trial.will_convert_to
        })

        if (emailResult.success) {
          // Update trial record with notification timestamp
          await supabase
            .from('trial_subscriptions')
            .update({
              expiry_notification_sent_at: now.toISOString(),
              expiry_notification_message_id: emailResult.messageId,
              updated_at: now.toISOString()
            })
            .eq('id', trial.id)

          notifications.push({
            trialId: trial.id,
            email: trial.email,
            status: 'sent',
            messageId: emailResult.messageId
          })
        } else {
          errors.push({
            trialId: trial.id,
            email: trial.email,
            error: emailResult.error
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
            updated_at: now.toISOString()
          })
          .eq('id', trial.id)

        const emailResult = await sendTrialExpiredNotification({
          email: trial.email,
          name: trial.name || undefined,
          daysRemaining: 0,
          trialEndDate: trial.trial_end,
          conversionPrice: trial.conversion_price,
          planType: trial.will_convert_to
        })

        if (emailResult.success) {
          // Update trial record with expiration notification
          await supabase
            .from('trial_subscriptions')
            .update({
              expired_notification_sent_at: now.toISOString(),
              expired_notification_message_id: emailResult.messageId,
              updated_at: now.toISOString()
            })
            .eq('id', trial.id)

          notifications.push({
            trialId: trial.id,
            email: trial.email,
            status: 'expired_notification_sent',
            messageId: emailResult.messageId
          })
        } else {
          errors.push({
            trialId: trial.id,
            email: trial.email,
            error: emailResult.error
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
        errors
      }
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Allow POST as well for manual triggering
export async function POST(request: Request) {
  return GET(request)
}
