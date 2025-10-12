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

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('paypal_subscription_id', subscriptionId)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Check if subscription was created within 24 hours
    const subscriptionDate = new Date(subscription.created_at)
    const now = new Date()
    const hoursSinceCreation = (now.getTime() - subscriptionDate.getTime()) / (1000 * 60 * 60)

    if (hoursSinceCreation > 24) {
      return NextResponse.json(
        {
          error: 'Refund window expired (24 hours)',
          hoursSinceCreation: Math.round(hoursSinceCreation * 100) / 100,
        },
        { status: 400 }
      )
    }

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

    // Get subscription details from PayPal
    const subscriptionResponse = await fetch(
      `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!subscriptionResponse.ok) {
      throw new Error('Failed to fetch subscription from PayPal')
    }

    const paypalSubscription = await subscriptionResponse.json()

    // Find the most recent payment
    const latestPayment = paypalSubscription.billing_info?.last_payment
    if (!latestPayment) {
      return NextResponse.json({ error: 'No payment found to refund' }, { status: 400 })
    }

    // Process refund through PayPal
    const refundResponse = await fetch(
      `${PAYPAL_BASE_URL}/v2/payments/captures/${latestPayment.transaction_id}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          amount: {
            value: '20.00',
            currency_code: 'USD',
          },
          note_to_payer: reason || 'Cancellation within 24-hour refund window',
        }),
      }
    )

    if (!refundResponse.ok) {
      const errorDetails = await refundResponse.text()
      console.error('PayPal refund error:', errorDetails)
      throw new Error('Failed to process refund with PayPal')
    }

    const refundResult = await refundResponse.json()

    // Update subscription status
    await supabase
      .from('subscriptions')
      .update({
        status: 'refunded',
        cancelled_at: new Date().toISOString(),
        refund_id: refundResult.id,
        refund_reason: reason || '24-hour cancellation',
        updated_at: new Date().toISOString(),
      })
      .eq('paypal_subscription_id', subscriptionId)

    // Log the refund activity
    await supabase.from('user_activity_logs').insert({
      user_id: subscription.user_id,
      activity_type: 'subscription_refunded',
      activity_data: {
        subscription_id: subscriptionId,
        refund_id: refundResult.id,
        refund_amount: '20.00',
        refund_reason: reason || '24-hour cancellation',
        hours_since_creation: Math.round(hoursSinceCreation * 100) / 100,
      },
      created_at: new Date().toISOString(),
    })

    console.log('✅ Refund processed successfully:', refundResult.id)

    return NextResponse.json({
      success: true,
      refundId: refundResult.id,
      refundAmount: '20.00',
      hoursSinceCreation: Math.round(hoursSinceCreation * 100) / 100,
      message: 'Refund processed successfully',
    })
  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
