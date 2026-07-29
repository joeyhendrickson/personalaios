import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyOrCapturePayPalOrder } from '@/lib/paypal/server'
import { WORKSHOP_ID_EMAIL, WORKSHOP_PAYPAL_VALUE } from '@/lib/workshop/constants'

export async function POST(request: NextRequest) {
  try {
    const { orderID, userEmail, metadata } = await request.json()

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

    const supabase = await createClient()
    const { error: paymentError } = await supabase.from('payments').insert({
      paypal_order_id: orderID,
      amount,
      currency: capture?.amount?.currency_code || 'USD',
      plan_type: 'workshop',
      status: 'completed',
      payment_details: {
        capture: captureData,
        registration: metadata || {},
      },
      user_email: userEmail,
    })

    if (paymentError) {
      console.error('Error storing workshop payment:', paymentError)
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const registrantName = metadata?.name || 'Workshop registrant'

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Life Stacks <noreply@lifestacks.ai>',
          to: WORKSHOP_ID_EMAIL,
          subject: `New Workshop Registration: ${registrantName}`,
          html: `
            <h2>New Lifestacks Workshop Registration</h2>
            <p><strong>Name:</strong> ${registrantName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Phone:</strong> ${metadata?.phone || 'Not provided'}</p>
            <p><strong>On-site stay:</strong> ${metadata?.onSiteStay ? 'Yes' : 'No'}</p>
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
