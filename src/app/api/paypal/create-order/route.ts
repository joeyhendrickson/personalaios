import { NextRequest, NextResponse } from 'next/server'
import { Client, Environment, LogLevel } from '@paypal/paypal-server-sdk'
import { v4 as uuidv4 } from 'uuid'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET

const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: PAYPAL_CLIENT_ID!,
    oAuthClientSecret: PAYPAL_CLIENT_SECRET!,
  },
  timeout: 0,
  environment: Environment.Sandbox,
  logging: {
    logLevel: LogLevel.Info,
    logRequest: { logBody: true },
    logResponse: { logHeaders: true },
  },
})

export async function POST(request: NextRequest) {
  try {
    const { paymentTokenId, planType, userEmail } = await request.json()
    
    const price = planType === 'premium' ? '249.99' : '19.99'
    const planName = planType === 'premium' ? 'Life Stacks Premium' : 'Life Stacks Basic'
    
    const collect = {
      body: {
        intent: "CAPTURE",
        purchaseUnits: [
          {
            amount: {
              currencyCode: "USD",
              value: price,
            },
            description: `${planName} - Monthly Subscription`,
          },
        ],
        payment_source: {
          paypal: {
            vault_id: paymentTokenId,
            stored_credential: {
              payment_initiator: "MERCHANT",
              usage: "SUBSEQUENT",
              usage_pattern: "RECURRING_POSTPAID",
            },
          },
        },
      },
      prefer: "return=minimal",
    }

    const { OrdersController } = await import('@paypal/paypal-server-sdk')
    const ordersController = new OrdersController(client)
    
    const { result, ...httpResponse } = await ordersController.ordersCreate(collect)
    
    return NextResponse.json({
      order: result,
      httpStatusCode: httpResponse.statusCode,
    })
    
  } catch (error: any) {
    console.error('Failed to create order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
