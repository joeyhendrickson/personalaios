import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to verify webhook URL is accessible
 * This helps debug webhook connectivity issues
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    path: '/api/modules/budget-optimizer/plaid/webhook',
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint received POST request',
    received: body,
    timestamp: new Date().toISOString(),
  })
}
