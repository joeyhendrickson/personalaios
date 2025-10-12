import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.paypal.com'
    : 'https://api.sandbox.paypal.com'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { subscriptionId, reason } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('paypal_subscription_id', subscriptionId)
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Check if already cancelled
    if (subscription.status === 'cancelled' || subscription.status === 'refunded') {
      return NextResponse.json({ error: 'Subscription already cancelled' }, { status: 400 })
    }

    // Check if within 24-hour refund window
    const subscriptionDate = new Date(subscription.created_at)
    const now = new Date()
    const hoursSinceCreation = (now.getTime() - subscriptionDate.getTime()) / (1000 * 60 * 60)
    const isEligibleForRefund = hoursSinceCreation <= 24

    // Get PayPal access token
    const authResponse = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    if (!authResponse.ok) {
      throw new Error('Failed to get PayPal access token')
    }

    const { access_token } = await authResponse.json()

    // Cancel subscription in PayPal
    const cancelResponse = await fetch(
      `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          reason: reason || 'User requested cancellation',
        }),
      }
    )

    if (!cancelResponse.ok) {
      throw new Error('Failed to cancel subscription in PayPal')
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'User requested cancellation',
        updated_at: new Date().toISOString(),
      })
      .eq('paypal_subscription_id', subscriptionId)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    // Log the cancellation activity
    await supabase.from('user_activity_logs').insert({
      user_id: user.id,
      activity_type: 'subscription_cancelled',
      activity_data: {
        subscription_id: subscriptionId,
        cancellation_reason: reason || 'User requested cancellation',
        hours_since_creation: Math.round(hoursSinceCreation * 100) / 100,
        eligible_for_refund: isEligibleForRefund,
      },
      created_at: new Date().toISOString(),
    })

    // If eligible for refund, create a refund request for admin approval
    let refundRequestId = null
    if (isEligibleForRefund) {
      try {
        const { data: refundRequest, error: requestError } = await supabase
          .from('refund_requests')
          .insert({
            user_id: user.id,
            subscription_id: subscription.id,
            paypal_subscription_id: subscriptionId,
            email: subscription.email,
            amount: 20.0,
            currency: 'USD',
            request_reason: `Cancellation within 24-hour window - ${reason || 'user requested'}`,
            status: 'pending',
            hours_since_creation: Math.round(hoursSinceCreation * 100) / 100,
          })
          .select()
          .single()

        if (requestError) {
          console.error('Failed to create refund request:', requestError)
        } else {
          refundRequestId = refundRequest.id
          console.log('✅ Refund request created for admin approval:', refundRequestId)
        }
      } catch (refundError) {
        console.error('Failed to create refund request:', refundError)
        // Don't fail the cancellation if refund request creation fails
      }
    }

    console.log('✅ Subscription cancelled successfully:', subscriptionId)

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      refundRequestCreated: !!refundRequestId,
      refundRequestId: refundRequestId,
      hoursSinceCreation: Math.round(hoursSinceCreation * 100) / 100,
      eligibleForRefund: isEligibleForRefund,
    })
  } catch (error) {
    console.error('Cancellation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
