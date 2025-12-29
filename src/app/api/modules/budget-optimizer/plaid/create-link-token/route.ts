import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PlaidService } from '@/lib/plaid'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create link token for the user
    const linkTokenResponse = await PlaidService.createLinkToken(user.id)

    return NextResponse.json({
      success: true,
      link_token: linkTokenResponse.link_token,
      expiration: linkTokenResponse.expiration,
    })
  } catch (error) {
    console.error('Error creating link token:', error)

    // Check if it's a credentials issue
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log diagnostic information (server-side only, never exposed to client)
    const plaidEnv = process.env.PLAID_ENV || 'sandbox'
    const hasClientId = !!process.env.PLAID_CLIENT_ID
    const hasSandboxSecret = !!process.env.PLAID_SECRET_SANDBOX
    const hasProductionSecret = !!process.env.PLAID_SECRET_PRODUCTION
    const hasLegacySecret = !!process.env.PLAID_SECRET

    console.error('Plaid configuration diagnostic:', {
      PLAID_ENV: plaidEnv,
      has_PLAID_CLIENT_ID: hasClientId,
      has_PLAID_SECRET_SANDBOX: hasSandboxSecret,
      has_PLAID_SECRET_PRODUCTION: hasProductionSecret,
      has_PLAID_SECRET: hasLegacySecret,
      client_id_length: process.env.PLAID_CLIENT_ID?.length || 0,
    })

    if (errorMessage.includes('credentials not configured')) {
      return NextResponse.json(
        {
          error: 'Plaid credentials not configured',
          details:
            'Please ensure PLAID_CLIENT_ID and PLAID_SECRET_PRODUCTION (or PLAID_SECRET_SANDBOX) are set in your environment variables.',
        },
        { status: 500 }
      )
    }

    // Provide helpful error for invalid credentials
    if (errorMessage.includes('invalid client_id or secret')) {
      return NextResponse.json(
        {
          error: 'Invalid Plaid credentials',
          details: `The Plaid ${plaidEnv} credentials are incorrect. Please verify:
- PLAID_CLIENT_ID matches your Plaid dashboard
- ${plaidEnv === 'production' ? 'PLAID_SECRET_PRODUCTION' : 'PLAID_SECRET_SANDBOX'} matches your Plaid ${plaidEnv} environment
- No extra spaces or characters in the values
- Credentials are copied correctly from your Plaid dashboard`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create link token',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
