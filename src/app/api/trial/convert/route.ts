import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email, paymentId, planType = 'basic' } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find the trial subscription
    const { data: trialRecord, error: trialError } = await supabase
      .from('trial_subscriptions')
      .select('*')
      .eq('email', email)
      .eq('status', 'active')
      .single()

    if (trialError || !trialRecord) {
      return NextResponse.json({ error: 'No active trial found' }, { status: 404 })
    }

    // Update trial to converted status
    const { data: updatedTrial, error: updateError } = await supabase
      .from('trial_subscriptions')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
        payment_id: paymentId,
        final_plan_type: planType
      })
      .eq('id', trialRecord.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating trial subscription:', updateError)
      return NextResponse.json({ error: 'Failed to convert trial' }, { status: 500 })
    }

    // Create a regular subscription record
    const { data: subscriptionRecord, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        email: email,
        plan_type: planType,
        status: 'active',
        billing_cycle: 'monthly',
        amount: planType === 'basic' ? 49.99 : 249.99,
        currency: 'USD',
        started_at: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        payment_id: paymentId,
        trial_converted_from: trialRecord.id
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
      // Don't fail the request, trial conversion is the main goal
    }

    return NextResponse.json({
      success: true,
      trial: updatedTrial,
      subscription: subscriptionRecord,
      message: 'Trial converted to paid subscription successfully'
    })

  } catch (error) {
    console.error('Trial conversion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
