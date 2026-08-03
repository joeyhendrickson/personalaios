import { NextRequest, NextResponse } from 'next/server'
import { getPayPalAccessToken, getPayPalApiBase } from '@/lib/paypal/server'
import { WORKSHOP_PAYPAL_VALUE } from '@/lib/workshop/constants'

export async function POST(request: NextRequest) {
  try {
    const { amount, description, userEmail, returnUrl, cancelUrl, customIdPrefix } =
      await request.json()
    const price = amount || WORKSHOP_PAYPAL_VALUE
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lifestacks.ai'
    const idPrefix = customIdPrefix || 'workshop'

    const accessToken = await getPayPalAccessToken()

    const orderResponse = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
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
            custom_id: `${idPrefix}_${userEmail}`,
          },
        ],
        application_context: {
          brand_name: 'Life Stacks',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: returnUrl || `${appUrl}/workshop?success=true`,
          cancel_url: cancelUrl || `${appUrl}/workshop?cancelled=true`,
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    })

    const orderData = await orderResponse.json()

    if (!orderResponse.ok) {
      console.error('PayPal workshop order creation failed:', orderData)
      throw new Error(
        orderData.message || orderData.details?.[0]?.description || 'Failed to create PayPal order'
      )
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
