import { NextRequest, NextResponse } from 'next/server'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

// Get PayPal access token
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
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const { planType, userEmail, amount } = await request.json()

    const price = amount || (planType === 'premium' ? '249.99' : '20.00')
    const planName = planType === 'premium' ? 'Life Stacks Premium' : 'Life Stacks Basic'

    // Get access token
    console.log('Getting PayPal access token...')
    const accessToken = await getAccessToken()
    console.log('Access token obtained:', accessToken ? 'YES' : 'NO')

    // Create PayPal order using REST API
    console.log('Creating PayPal order with:', { planType, userEmail, amount, price, planName })
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
            description: `${planName} - Monthly Subscription`,
            custom_id: `subscription_${planType}_${userEmail}`,
          },
        ],
        application_context: {
          brand_name: 'Life Stacks',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/create-account`,
        },
      }),
    })

    const orderData = await orderResponse.json()

    if (!orderResponse.ok) {
      console.error('PayPal order creation failed:', orderData)
      throw new Error(orderData.message || 'Failed to create PayPal order')
    }

    return NextResponse.json({
      orderID: orderData.id,
      order: orderData,
    })
  } catch (error: any) {
    console.error('Failed to create order:', error)
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 })
  }
}
