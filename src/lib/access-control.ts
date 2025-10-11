import { createClient } from '@/lib/supabase/server'

export interface AccessStatus {
  hasAccess: boolean
  reason?: string
  subscriptionType?: 'trial' | 'standard' | 'premium' | 'expired' | 'grace_period'
  daysRemaining?: number
  graceDaysRemaining?: number
  paymentFailed?: boolean
  gracePeriodEnd?: string
  email?: string
}

export async function checkUserAccess(email?: string, userId?: string): Promise<AccessStatus> {
  if (!email && !userId) {
    return { hasAccess: false, reason: 'No user identifier provided' }
  }

  const supabase = await createClient()

  try {
    // First check if user's access has been disabled by admin
    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('access_enabled')
        .eq('id', userId)
        .single()

      if (!profileError && profile && profile.access_enabled === false) {
        return {
          hasAccess: false,
          reason: 'Access has been disabled by administrator',
        }
      }
    }

    // First check for active trial subscription
    if (email) {
      const { data: trialSubscription, error: trialError } = await supabase
        .from('trial_subscriptions')
        .select('*')
        .eq('email', email)
        .eq('status', 'active')
        .single()

      if (!trialError && trialSubscription) {
        const now = new Date()
        const trialEnd = new Date(trialSubscription.trial_end)

        if (now < trialEnd) {
          const daysRemaining = Math.ceil(
            (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
          return {
            hasAccess: true,
            subscriptionType: 'trial',
            daysRemaining,
            email: trialSubscription.email,
          }
        } else {
          // Trial expired
          await supabase
            .from('trial_subscriptions')
            .update({ status: 'expired' })
            .eq('id', trialSubscription.id)

          return {
            hasAccess: false,
            subscriptionType: 'expired',
            reason: 'Trial period has expired',
            email: trialSubscription.email,
          }
        }
      }
    }

    // Check for active paid subscription
    const subscriptionQuery = email
      ? supabase.from('subscriptions').select('*').eq('email', email)
      : supabase.from('subscriptions').select('*').eq('user_id', userId)

    const { data: subscription, error: subscriptionError } = await subscriptionQuery
      .eq('status', 'active')
      .single()

    if (!subscriptionError && subscription) {
      const now = new Date()
      const nextBilling = new Date(subscription.next_billing_date)

      // If next billing date is in the past, subscription might be expired
      if (now > nextBilling) {
        // Check if it's been more than 3 days past due (grace period)
        const daysPastDue = Math.ceil(
          (now.getTime() - nextBilling.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysPastDue > 3) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('id', subscription.id)

          return {
            hasAccess: false,
            subscriptionType: subscription.plan_type as 'standard' | 'premium',
            reason: 'Subscription payment is overdue',
            email: subscription.email,
          }
        }
      }

      return {
        hasAccess: true,
        subscriptionType: subscription.plan_type as 'standard' | 'premium',
        email: subscription.email,
      }
    }

    // No active subscription found
    return {
      hasAccess: false,
      reason: 'No active subscription found',
    }
  } catch (error) {
    console.error('Error checking user access:', error)
    return {
      hasAccess: false,
      reason: 'Error checking subscription status',
    }
  }
}

export async function requireAccess(email?: string, userId?: string): Promise<AccessStatus> {
  const accessStatus = await checkUserAccess(email, userId)

  if (!accessStatus.hasAccess) {
    console.log('Access denied:', accessStatus.reason)
  }

  return accessStatus
}
