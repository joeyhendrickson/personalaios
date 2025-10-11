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
    const { planType, userEmail } = await request.json()
    
    const price = planType === 'premium' ? '249.99' : '19.99'
    const planName = planType === 'premium' ? 'Life Stacks Premium' : 'Life Stacks Basic'
    
    const collect = {
      paypalRequestId: uuidv4(),
      body: {
        paymentSource: {
          paypal: {
            usage_type: "MERCHANT",
            usage_pattern: "SUBSCRIPTION_PREPAID",
            billing_plan: {
              billing_cycles: [
                {
                  tenure_type: "REGULAR",
                  pricing_scheme: {
                    pricing_model: "FIXED",
                    price: {
                      value: price,
                      currency_code: "USD",
                    },
                  },
                  frequency: {
                    interval_unit: "MONTH",
                    interval_count: "1",
                  },
                  total_cycles: "0", // 0 = unlimited cycles
                  start_date: new Date().toISOString().split('T')[0], // Today's date
                },
              ],
              product: {
                description: `${planName} - Monthly Subscription`,
                quantity: "1",
              },
              name: planName,
            },
            experience_context: {
              return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
              cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
            },
          },
        },
      },
    }

    const { VaultController } = await import('@paypal/paypal-server-sdk')
    const vaultController = new VaultController(client)
    
    const { result, ...httpResponse } = await vaultController.setupTokensCreate(collect)
    
    return NextResponse.json({
      setupToken: result,
      httpStatusCode: httpResponse.statusCode,
    })
    
  } catch (error: any) {
    console.error('Failed to create setup token:', error)
    return NextResponse.json(
      { error: 'Failed to create setup token' },
      { status: 500 }
    )
  }
}
