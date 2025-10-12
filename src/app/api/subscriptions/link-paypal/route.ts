import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { paypal_subscription_id, email, user_id, plan_type } = await request.json()

    if (!paypal_subscription_id || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create or update subscription record immediately when user approves
    // This ensures the user has access even before webhook arrives
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('paypal_subscription_id', paypal_subscription_id)
      .single()

    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          user_id: user.id,
          email: email,
          plan_type: plan_type || 'standard',
          status: 'active', // Mark as active immediately
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }
    } else {
      // Create new subscription record
      const { error: insertError } = await supabase.from('subscriptions').insert({
        paypal_subscription_id: paypal_subscription_id,
        user_id: user.id,
        email: email,
        plan_type: plan_type || 'standard',
        status: 'active', // Mark as active immediately
        billing_cycle: 'monthly',
        started_at: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error('Error creating subscription:', insertError)
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
      }
    }

    // Log analytics for subscription creation
    await supabase.from('user_activity_logs').insert({
      user_id: user.id,
      activity_type: 'subscription_created',
      activity_data: {
        plan_type: plan_type,
        paypal_subscription_id: paypal_subscription_id,
        source: 'paypal_direct',
      },
      created_at: new Date().toISOString(),
    })

    console.log('✅ Subscription linked successfully for user:', user.id)

    return NextResponse.json({
      success: true,
      message: 'Subscription linked successfully',
    })
  } catch (error) {
    console.error('Subscription link error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
