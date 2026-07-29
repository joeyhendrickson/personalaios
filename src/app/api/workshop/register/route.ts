import { NextRequest, NextResponse } from 'next/server'
import { verifyOrCapturePayPalOrder } from '@/lib/paypal/server'
import {
  createSupabaseServiceClient,
  normalizeWorkshopRegistration,
  type WorkshopRegistrationMetadata,
} from '@/lib/workshop/registration'
import { WORKSHOP_ID_EMAIL, WORKSHOP_PAYPAL_VALUE } from '@/lib/workshop/constants'

export async function POST(request: NextRequest) {
  try {
    const { orderID, userEmail, metadata } = await request.json()
    const registrationMetadata = (metadata || {}) as WorkshopRegistrationMetadata

    if (!orderID || !userEmail) {
      return NextResponse.json({ error: 'Missing order ID or email' }, { status: 400 })
    }

    const captureData = await verifyOrCapturePayPalOrder(orderID)

    if (captureData.status !== 'COMPLETED') {
      console.error('Workshop payment capture failed:', captureData)
      return NextResponse.json({ error: 'Payment was not completed' }, { status: 400 })
    }

    const purchaseUnit = captureData.purchase_units?.[0]
    const capture = purchaseUnit?.payments?.captures?.[0]
    const amount = capture?.amount?.value || WORKSHOP_PAYPAL_VALUE
    const currency = capture?.amount?.currency_code || 'USD'
    const normalized = normalizeWorkshopRegistration(registrationMetadata)

    const supabase = createSupabaseServiceClient()

    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        paypal_order_id: orderID,
        amount,
        currency,
        plan_type: 'workshop',
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
      console.error('Error storing workshop payment:', paymentError)
      return NextResponse.json({ error: 'Failed to store workshop payment' }, { status: 500 })
    }

    const { error: registrationError } = await supabase.from('workshop_registrations').insert({
      payment_id: paymentRecord?.id || null,
      paypal_order_id: orderID,
      full_name: normalized.full_name,
      email: userEmail,
      phone: normalized.phone,
      on_site_stay: normalized.on_site_stay,
      amount,
      currency,
      payment_status: 'completed',
      registration_status: 'id_pending',
      id_verified: false,
      terms_accepted: normalized.terms_accepted,
      payment_details: {
        capture: captureData,
        registration: registrationMetadata,
      },
    })

    if (registrationError) {
      console.error('Error storing workshop registration:', registrationError)
      return NextResponse.json({ error: 'Failed to store workshop registration' }, { status: 500 })
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const registrantName = normalized.full_name

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Life Stacks <noreply@lifestacks.ai>',
          to: WORKSHOP_ID_EMAIL,
          subject: `New Workshop Registration: ${registrantName}`,
          html: `
            <h2>New Lifestacks Workshop Registration</h2>
            <p><strong>Name:</strong> ${registrantName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Phone:</strong> ${normalized.phone || 'Not provided'}</p>
            <p><strong>On-site stay:</strong> ${normalized.on_site_stay ? 'Yes' : 'No'}</p>
            <p><strong>PayPal Order ID:</strong> ${orderID}</p>
            <p><strong>Amount:</strong> $${amount}</p>
            <p>Reminder: Registrant must email government ID to ${WORKSHOP_ID_EMAIL} to complete registration.</p>
          `,
        })

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Life Stacks <noreply@lifestacks.ai>',
          to: userEmail,
          subject: 'Lifestacks Workshop Registration Received',
          html: `
            <h2>Thank you for registering!</h2>
            <p>Hi ${registrantName},</p>
            <p>Your payment of $${amount} for the Lifestacks Workshop has been received.</p>
            <p><strong>Next step:</strong> Email a clear copy of your government-issued photo ID to <a href="mailto:${WORKSHOP_ID_EMAIL}">${WORKSHOP_ID_EMAIL}</a> to complete your registration.</p>
            <p>Workshop dates: July 29 – August 7, 2026<br/>
            Check-in: July 29 at 3:00 PM<br/>
            Checkout: August 7 at 11:00 AM<br/>
            Location: 7475 Augusta Woods Terrace, Westerville, Ohio 43082</p>
          `,
        })
      } catch (emailError) {
        console.error('Workshop registration email failed:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      orderID,
      amount,
      message: 'Registration completed successfully',
    })
  } catch (error) {
    console.error('Workshop registration error:', error)
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
