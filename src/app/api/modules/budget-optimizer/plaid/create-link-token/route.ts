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

    return NextResponse.json(
      {
        error: 'Failed to create link token',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
