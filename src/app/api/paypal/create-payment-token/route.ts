import { NextRequest, NextResponse } from 'next/server'
import { Client, Environment, LogLevel } from '@paypal/paypal-server-sdk'
import { v4 as uuidv4 } from 'uuid'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET

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
    const { setupToken } = await request.json()

    const collect = {
      paypalRequestId: uuidv4(),
      body: {
        setupToken: setupToken,
        paymentSource: {},
      },
    }

    const { VaultController } = await import('@paypal/paypal-server-sdk')
    const vaultController = new VaultController(client)

    const { result, ...httpResponse } = await (vaultController as any).paymentTokensCreate(collect)

    return NextResponse.json({
      paymentToken: result,
      httpStatusCode: httpResponse.statusCode,
    })
  } catch (error: any) {
    console.error('Failed to create payment token:', error)
    return NextResponse.json({ error: 'Failed to create payment token' }, { status: 500 })
  }
}
