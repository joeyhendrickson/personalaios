import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PayPal SDK for server-side verification
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.paypal.com'
    : 'https://api.sandbox.paypal.com'

interface PayPalOrderDetails {
  id: string
  status: string
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string
        status: string
        amount: {
          currency_code: string
          value: string
        }
      }>
    }
  }>
}

export async function POST(request: Request) {
  try {
    const { orderID, details, planType } = await request.json()

    if (!orderID) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 })
    }

    // Verify the payment with PayPal
    const verificationResult = await verifyPayPalPayment(orderID)

    if (!verificationResult.success) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    // Store payment record in database
    const supabase = await createClient()

    // Determine plan type from amount
    const amount = verificationResult.amount ? parseFloat(verificationResult.amount) : 0
    const detectedPlanType = amount === 49.99 ? 'basic' : amount === 249.99 ? 'premium' : 'basic'

    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        paypal_order_id: orderID,
        amount: amount,
        currency: verificationResult.currency,
        plan_type: detectedPlanType,
        status: 'completed',
        payment_details: details,
        user_email: verificationResult.email || null,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error storing payment record:', paymentError)
      // Don't fail the request, payment was successful
    }

    return NextResponse.json({
      success: true,
      orderID,
      paymentId: paymentRecord?.id,
      planType: detectedPlanType,
      amount,
      message: 'Payment verified successfully',
    })
  } catch (error) {
    console.error('PayPal verification error:', error)
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 })
  }
}

async function verifyPayPalPayment(orderID: string) {
  try {
    // Get access token
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

    // Get order details
    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!orderResponse.ok) {
      throw new Error('Failed to fetch order details')
    }

    const orderDetails: PayPalOrderDetails = await orderResponse.json()

    // Verify payment status
    if (orderDetails.status !== 'COMPLETED') {
      return { success: false, error: 'Payment not completed' }
    }

    // Extract payment information
    const purchaseUnit = orderDetails.purchase_units[0]
    const capture = purchaseUnit.payments.captures[0]

    return {
      success: true,
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
      email: null, // Email is handled separately in the calling function
    }
  } catch (error) {
    console.error('PayPal verification error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
// Force rebuild Sat Oct 11 14:24:45 EDT 2025
