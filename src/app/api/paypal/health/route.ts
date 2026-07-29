import { NextResponse } from 'next/server'
import { getPayPalAccessToken, getPayPalApiBase } from '@/lib/paypal/server'

export async function GET() {
  try {
    const token = await getPayPalAccessToken()

    return NextResponse.json({
      ok: true,
      mode: process.env.PAYPAL_MODE || 'live (default)',
      apiBase: getPayPalApiBase(),
      tokenReceived: Boolean(token),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PayPal health check failed'
    return NextResponse.json(
      {
        ok: false,
        mode: process.env.PAYPAL_MODE || 'live (default)',
        apiBase: getPayPalApiBase(),
        error: message,
      },
      { status: 500 }
    )
  }
}
