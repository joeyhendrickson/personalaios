import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ booked: false })
    }

    const { data: booking } = await supabase
      .from('coach_setup_bookings')
      .select('id, booking_status, created_at, amount')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      booked: Boolean(booking),
      booking: booking ?? null,
    })
  } catch (error) {
    console.error('Coach setup status error:', error)
    return NextResponse.json({ booked: false })
  }
}
