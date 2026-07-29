import { NextRequest, NextResponse } from 'next/server'
import { WORKSHOP_PAYPAL_VALUE } from '@/lib/workshop/constants'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await response.json()
  return data.access_token as string
}

export async function POST(request: NextRequest) {
  try {
    const { amount, description, userEmail, metadata } = await request.json()
    const price = amount || WORKSHOP_PAYPAL_VALUE
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lifestacks.ai'

    const accessToken = await getAccessToken()

    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: price,
            },
            description: description || 'Lifestacks Workshop Registration',
            custom_id: `workshop_${userEmail}`,
          },
        ],
        application_context: {
          brand_name: 'Life Stacks',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${appUrl}/workshop?success=true`,
          cancel_url: `${appUrl}/workshop?cancelled=true`,
        },
        payer: {
          email_address: userEmail,
        },
      }),
    })

    const orderData = await orderResponse.json()

    if (!orderResponse.ok) {
      console.error('PayPal workshop order creation failed:', orderData)
      throw new Error(orderData.message || 'Failed to create PayPal order')
    }

    return NextResponse.json({
      orderID: orderData.id,
      order: orderData,
    })
  } catch (error: unknown) {
    console.error('Failed to create workshop order:', error)
    const message = error instanceof Error ? error.message : 'Failed to create order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
