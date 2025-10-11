import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Create trial subscription record
    const { data: trialRecord, error: trialError } = await supabase
      .from('trial_subscriptions')
      .insert({
        email: email,
        plan_type: 'basic',
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: 'active',
        will_convert_to: 'basic',
        conversion_price: 49.99
      })
      .select()
      .single()

    if (trialError) {
      console.error('Error creating trial subscription:', trialError)
      return NextResponse.json({ error: 'Failed to create trial subscription' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      trial: trialRecord,
      message: 'Trial subscription created successfully'
    })

  } catch (error) {
    console.error('Trial creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get trial subscription status
    const { data: trialRecord, error: trialError } = await supabase
      .from('trial_subscriptions')
      .select('*')
      .eq('email', email)
      .single()

    if (trialError && trialError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching trial subscription:', trialError)
      return NextResponse.json({ error: 'Failed to fetch trial subscription' }, { status: 500 })
    }

    if (!trialRecord) {
      return NextResponse.json({ 
        success: false, 
        message: 'No trial subscription found' 
      })
    }

    // Check if trial is still active
    const now = new Date()
    const trialEnd = new Date(trialRecord.trial_end)
    const isActive = now < trialEnd && trialRecord.status === 'active'

    return NextResponse.json({
      success: true,
      trial: trialRecord,
      isActive,
      daysRemaining: Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    })

  } catch (error) {
    console.error('Trial fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
