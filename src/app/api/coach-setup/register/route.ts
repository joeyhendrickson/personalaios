import { NextRequest, NextResponse } from 'next/server'
import { verifyOrCapturePayPalOrder } from '@/lib/paypal/server'
import { COACH_SETUP_CONTACT_EMAIL, COACH_SETUP_PAYPAL_VALUE } from '@/lib/coach-setup/constants'
import {
  createSupabaseServiceClient,
  normalizeCoachSetupRegistration,
  type CoachSetupRegistrationMetadata,
} from '@/lib/coach-setup/registration'

export async function POST(request: NextRequest) {
  try {
    const { orderID, userEmail, metadata } = await request.json()
    const registrationMetadata = (metadata || {}) as CoachSetupRegistrationMetadata

    if (!orderID || !userEmail) {
      return NextResponse.json({ error: 'Missing order ID or email' }, { status: 400 })
    }

    const captureData = await verifyOrCapturePayPalOrder(orderID)

    if (captureData.status !== 'COMPLETED') {
      console.error('Coach setup payment capture failed:', captureData)
      return NextResponse.json({ error: 'Payment was not completed' }, { status: 400 })
    }

    const purchaseUnit = captureData.purchase_units?.[0]
    const capture = purchaseUnit?.payments?.captures?.[0]
    const amount = capture?.amount?.value || COACH_SETUP_PAYPAL_VALUE
    const currency = capture?.amount?.currency_code || 'USD'
    const normalized = normalizeCoachSetupRegistration(registrationMetadata)

    const supabase = createSupabaseServiceClient()

    const { data: existingBooking } = await supabase
      .from('coach_setup_bookings')
      .select('id')
      .eq('paypal_order_id', orderID)
      .maybeSingle()

    if (existingBooking) {
      return NextResponse.json({
        success: true,
        orderID,
        amount,
        message: 'Booking already recorded',
      })
    }

    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        paypal_order_id: orderID,
        amount,
        currency,
        plan_type: 'coach_setup',
        status: 'completed',
        payment_details: {
          capture: captureData,
          registration: registrationMetadata,
        },
        user_email: userEmail,
      })
      .select('id')
      .single()

    if (paymentError) {
      console.error('Error storing coach setup payment:', paymentError)
      return NextResponse.json({ error: 'Failed to store payment' }, { status: 500 })
    }

    const { error: bookingError } = await supabase.from('coach_setup_bookings').insert({
      user_id: normalized.user_id,
      payment_id: paymentRecord?.id || null,
      paypal_order_id: orderID,
      full_name: normalized.full_name,
      email: userEmail,
      phone: normalized.phone,
      focus_notes: normalized.focus_notes,
      amount,
      currency,
      payment_status: 'completed',
      booking_status: 'paid',
      terms_accepted: normalized.terms_accepted,
      payment_details: {
        capture: captureData,
        registration: registrationMetadata,
      },
    })

    if (bookingError) {
      console.error('Error storing coach setup booking:', bookingError)
      return NextResponse.json({ error: 'Failed to store booking' }, { status: 500 })
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const clientName = normalized.full_name

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Life Stacks <noreply@lifestacks.ai>',
          to: COACH_SETUP_CONTACT_EMAIL,
          subject: `New Coach Setup Session: ${clientName}`,
          html: `
            <h2>New Lifestacks Coach Setup Booking ($49)</h2>
            <p><strong>Name:</strong> ${clientName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Phone:</strong> ${normalized.phone || 'Not provided'}</p>
            <p><strong>Focus for session:</strong> ${normalized.focus_notes || 'Not provided'}</p>
            <p><strong>PayPal Order ID:</strong> ${orderID}</p>
            <p><strong>Amount:</strong> $${amount}</p>
            <p>Follow up to schedule the 1-on-1 session (up to 1 hour).</p>
          `,
        })

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Life Stacks <noreply@lifestacks.ai>',
          to: userEmail,
          subject: 'Your Lifestacks Coach Session Is Confirmed',
          html: `
            <h2>Thank you for booking!</h2>
            <p>Hi ${clientName},</p>
            <p>Your payment of $${amount} for a personalized Lifestacks AI setup and coach session has been received.</p>
            <p>We will reach out shortly at this email to schedule your private 1-on-1 call (up to 1 hour).</p>
            <p>If you have questions before then, contact us at <a href="mailto:${COACH_SETUP_CONTACT_EMAIL}">${COACH_SETUP_CONTACT_EMAIL}</a>.</p>
          `,
        })
      } catch (emailError) {
        console.error('Coach setup booking email failed:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      orderID,
      amount,
      message: 'Coach session booked successfully',
    })
  } catch (error) {
    console.error('Coach setup registration error:', error)
    const message = error instanceof Error ? error.message : 'Booking failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
