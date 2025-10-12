import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Lazy-load Supabase client to avoid build-time errors
function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.paypal.com'
    : 'https://api.sandbox.paypal.com'

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.text()
    const webhookEvent = JSON.parse(body)

    // Verify webhook signature
    const isValid = await verifyPayPalWebhook(request, body)
    if (!isValid) {
      console.error('Invalid PayPal webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log('PayPal Webhook Event:', webhookEvent.event_type)

    // Handle different webhook events
    switch (webhookEvent.event_type) {
      case 'BILLING.SUBSCRIPTION.CREATED':
        await handleSubscriptionCreated(webhookEvent, supabase)
        break

      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(webhookEvent, supabase)
        break

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(webhookEvent, supabase)
        break

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(webhookEvent, supabase)
        break

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(webhookEvent, supabase)
        break

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handlePaymentFailed(webhookEvent, supabase)
        break

      case 'BILLING.SUBSCRIPTION.RENEWED':
        await handleSubscriptionRenewed(webhookEvent, supabase)
        break

      default:
        console.log('Unhandled webhook event:', webhookEvent.event_type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function verifyPayPalWebhook(request: Request, body: string): Promise<boolean> {
  try {
    const headers = {
      'auth-algo': request.headers.get('paypal-auth-algo') || '',
      'cert-url': request.headers.get('paypal-cert-url') || '',
      'transmission-id': request.headers.get('paypal-transmission-id') || '',
      'transmission-sig': request.headers.get('paypal-transmission-sig') || '',
      'transmission-time': request.headers.get('paypal-transmission-time') || '',
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

    const { access_token } = await authResponse.json()

    // Verify webhook signature
    const verifyResponse = await fetch(
      `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          auth_algo: headers['auth-algo'],
          cert_url: headers['cert-url'],
          transmission_id: headers['transmission-id'],
          transmission_sig: headers['transmission-sig'],
          transmission_time: headers['transmission-time'],
          webhook_id: PAYPAL_WEBHOOK_ID,
          webhook_event: JSON.parse(body),
        }),
      }
    )

    const verifyResult = await verifyResponse.json()
    return verifyResult.verification_status === 'SUCCESS'
  } catch (error) {
    console.error('Webhook verification error:', error)
    return false
  }
}

async function handleSubscriptionCreated(event: any, supabase: any) {
  const subscription = event.resource
  const subscriberEmail = subscription.subscriber?.email_address
  const planId = subscription.plan_id

  console.log('Subscription created:', subscription.id, 'for', subscriberEmail)

  // Find the user by email to link user_id
  const { data: authData } = await supabase.auth.admin.listUsers()
  const matchingUser = authData?.users?.find((u: any) => u.email === subscriberEmail)

  // Store subscription in database with user_id if found
  await supabase.from('subscriptions').insert({
    paypal_subscription_id: subscription.id,
    email: subscriberEmail,
    user_id: matchingUser?.id || null,
    plan_type: getPlanTypeFromId(planId),
    status: 'pending',
    billing_cycle: 'monthly',
    started_at: new Date().toISOString(),
    next_billing_date: subscription.billing_info?.next_billing_time,
  })

  console.log('✅ Subscription created with user_id:', matchingUser?.id || 'NOT FOUND')
}

async function handleSubscriptionActivated(event: any, supabase: any) {
  const subscription = event.resource

  console.log('Subscription activated:', subscription.id)

  // Get subscription from DB
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('email, user_id')
    .eq('paypal_subscription_id', subscription.id)
    .single()

  if (!subscriptionData) {
    console.error('❌ Subscription not found in database:', subscription.id)
    return
  }

  // If user_id is missing, try to find and link it
  let userId = subscriptionData.user_id
  if (!userId && subscriptionData.email) {
    const { data: authData } = await supabase.auth.admin.listUsers()
    const matchingUser = authData?.users?.find((u: any) => u.email === subscriptionData.email)
    if (matchingUser) {
      userId = matchingUser.id
      console.log('✅ Found matching user for subscription:', userId)
    }
  }

  // Update subscription status and link user_id
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscription.id)

  console.log('✅ Subscription activated for user:', userId || 'NO USER')

  // If this was from a trial, mark trial as converted
  if (subscriptionData?.email) {
    const { data: trialData } = await supabase
      .from('trial_subscriptions')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
      })
      .eq('email', subscriptionData.email)
      .eq('status', 'active')
      .select()

    if (trialData && trialData.length > 0) {
      console.log('✅ Trial marked as converted:', subscriptionData.email)
    }
  }

  // Log analytics for subscription conversion
  if (userId) {
    await supabase.from('user_activity_logs').insert({
      user_id: userId,
      activity_type: 'subscription_activated',
      activity_data: {
        plan_type: subscriptionData.plan_type || getPlanTypeFromId(subscription.plan_id),
        paypal_subscription_id: subscription.id,
        source: 'paypal',
      },
      created_at: new Date().toISOString(),
    })
    console.log('✅ Analytics logged for subscription activation')
  }
}

async function handlePaymentCompleted(event: any, supabase: any) {
  const sale = event.resource
  const subscriptionId = sale.billing_agreement_id

  console.log('Payment completed:', sale.id, 'for subscription:', subscriptionId)

  // Get subscription to find user_id
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('user_id, email, plan_type')
    .eq('paypal_subscription_id', subscriptionId)
    .single()

  // Record the payment
  await supabase.from('payments').insert({
    paypal_order_id: sale.id,
    paypal_subscription_id: subscriptionId,
    user_id: subscriptionData?.user_id || null,
    amount: parseFloat(sale.amount.total),
    currency: sale.amount.currency,
    status: 'completed',
    payment_details: sale,
    created_at: new Date().toISOString(),
  })

  // Update subscription's last billing date
  await supabase
    .from('subscriptions')
    .update({
      last_billing_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscriptionId)

  // Log analytics for payment
  if (subscriptionData?.user_id) {
    await supabase.from('user_activity_logs').insert({
      user_id: subscriptionData.user_id,
      activity_type: 'subscription_payment',
      activity_data: {
        plan_type: subscriptionData.plan_type,
        amount: parseFloat(sale.amount.total),
        currency: sale.amount.currency,
        paypal_order_id: sale.id,
      },
      created_at: new Date().toISOString(),
    })
    console.log('✅ Payment analytics logged for user:', subscriptionData.user_id)
  }
}

async function handleSubscriptionCancelled(event: any, supabase: any) {
  const subscription = event.resource

  console.log('Subscription cancelled:', subscription.id)

  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscription.id)
}

async function handleSubscriptionSuspended(event: any, supabase: any) {
  const subscription = event.resource

  console.log('Subscription suspended:', subscription.id)

  await supabase
    .from('subscriptions')
    .update({
      status: 'suspended',
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscription.id)
}

async function handlePaymentFailed(event: any, supabase: any) {
  const subscription = event.resource

  console.log('Payment failed for subscription:', subscription.id)

  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscription.id)

  // TODO: Send email notification to user about failed payment
}

async function handleSubscriptionRenewed(event: any, supabase: any) {
  const subscription = event.resource

  console.log('Subscription renewed:', subscription.id)

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      last_billing_date: new Date().toISOString(),
      next_billing_date: subscription.billing_info?.next_billing_time,
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscription.id)
}

function getPlanTypeFromId(planId: string): string {
  // Map PayPal plan IDs to your plan types
  // You'll need to create these plan IDs in PayPal and map them here
  if (planId.includes('premium') || planId.includes('PREMIUM')) {
    return 'premium'
  }
  return 'basic'
}
