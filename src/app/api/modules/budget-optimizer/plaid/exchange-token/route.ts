import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PlaidService } from '@/lib/plaid'
import { encrypt } from '@/lib/crypto'

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

    const body = await request.json()
    const { public_token, institution_id, institution_name } = body

    if (!public_token) {
      return NextResponse.json({ error: 'Public token is required' }, { status: 400 })
    }

    // Exchange public token for access token
    let tokenResponse: any
    let accessToken: string | undefined
    let itemId: string | undefined

    try {
      tokenResponse = await PlaidService.exchangePublicToken(public_token)
      accessToken = tokenResponse?.access_token
      itemId = tokenResponse?.item_id

      // Log the response structure for debugging
      console.log('Plaid token exchange response:', {
        has_access_token: !!accessToken,
        has_item_id: !!itemId,
        response_keys: tokenResponse ? Object.keys(tokenResponse) : 'no response',
      })
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error'
      console.error('Error exchanging public token:', errorMessage)

      return NextResponse.json(
        {
          error: 'Failed to exchange token',
          message: errorMessage.includes('INVALID_PUBLIC_TOKEN')
            ? 'The connection link has expired. Please try connecting again.'
            : errorMessage.includes('missing item_id')
              ? 'Invalid response from Plaid. Please try connecting again.'
              : 'Failed to connect your bank account. Please try again.',
          details: errorMessage,
        },
        { status: 400 }
      )
    }

    // Get account information
    let accountsResponse
    try {
      accountsResponse = await PlaidService.getAccounts(accessToken)
    } catch (error: any) {
      console.error('Error getting accounts:', error)
      return NextResponse.json(
        {
          error: 'Failed to retrieve accounts',
          message:
            'Connected successfully but could not retrieve account information. Please try again.',
        },
        { status: 500 }
      )
    }

    const accounts = accountsResponse.accounts

    // Encrypt access token before storing
    let encryptedAccessToken: string
    try {
      encryptedAccessToken = encrypt(accessToken)
      console.log('Access token encrypted successfully')
    } catch (encryptError) {
      console.error('Error encrypting access token:', encryptError)
      return NextResponse.json(
        {
          error: 'Encryption failed',
          message:
            'Failed to encrypt access token. Please check TOKEN_ENCRYPTION_KEY environment variable.',
          details:
            encryptError instanceof Error ? encryptError.message : 'Unknown encryption error',
        },
        { status: 500 }
      )
    }

    // Validate required fields before inserting
    if (!itemId) {
      console.error('itemId is missing from token response:', tokenResponse)
      return NextResponse.json(
        { error: 'Invalid token response: missing item_id' },
        { status: 500 }
      )
    }

    if (!encryptedAccessToken) {
      console.error('encryptedAccessToken is missing')
      return NextResponse.json({ error: 'Failed to encrypt access token' }, { status: 500 })
    }

    // Store bank connection in database
    // Log user info for debugging
    console.log('Attempting to store bank connection:', {
      user_id: user.id,
      plaid_item_id: itemId,
      institution_id: institution_id || 'not provided',
      institution_name: institution_name || 'Unknown Bank',
      encrypted_token_length: encryptedAccessToken.length,
    })

    // Prepare insert data - ensure all NOT NULL fields are provided
    const insertData: any = {
      user_id: user.id,
      plaid_access_token: encryptedAccessToken, // Encrypted for security
      plaid_item_id: itemId,
      institution_id: institution_id || 'unknown', // NOT NULL in schema
      institution_name: institution_name || 'Unknown Bank', // NOT NULL in schema
      status: 'active',
      last_sync_at: new Date().toISOString(),
    }

    const { data: bankConnection, error: connectionError } = await supabase
      .from('bank_connections')
      .insert(insertData)
      .select()
      .single()

    if (connectionError) {
      console.error('Error storing bank connection:', {
        error: connectionError,
        code: connectionError.code,
        message: connectionError.message,
        details: connectionError.details,
        hint: connectionError.hint,
        user_id: user.id,
        item_id: itemId,
        institution_id: institution_id,
      })

      // Check for specific error types
      if (connectionError.code === '23505') {
        // Unique constraint violation - connection already exists
        return NextResponse.json(
          {
            error: 'Bank connection already exists',
            message:
              'This bank account is already connected. Please disconnect it first if you want to reconnect.',
          },
          { status: 409 }
        )
      }

      if (connectionError.code === '42501') {
        // Insufficient privilege - RLS policy violation
        return NextResponse.json(
          {
            error: 'Permission denied',
            message:
              'You do not have permission to create this bank connection. Please ensure you are logged in.',
          },
          { status: 403 }
        )
      }

      // Generic error with more details - always include the actual error message
      const errorMessage = connectionError.message || 'Database error occurred'
      const errorDetails = connectionError.details || connectionError.hint || connectionError.code

      console.error('Database error details:', {
        code: connectionError.code,
        message: errorMessage,
        details: errorDetails,
        fullError: JSON.stringify(connectionError, null, 2),
      })

      return NextResponse.json(
        {
          error: 'Failed to store bank connection',
          message: errorMessage,
          details: errorDetails
            ? `Error code: ${connectionError.code || 'unknown'}. ${errorDetails}`
            : `Error code: ${connectionError.code || 'unknown'}`,
        },
        { status: 500 }
      )
    }

    // Store bank accounts
    const accountsToInsert = accounts.map((account) => ({
      bank_connection_id: bankConnection.id,
      account_id: account.account_id,
      name: account.name,
      official_name: account.official_name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      current_balance: account.balances.current,
      available_balance: account.balances.available,
      iso_currency_code: account.balances.iso_currency_code || 'USD',
    }))

    const { error: accountsError } = await supabase.from('bank_accounts').insert(accountsToInsert)

    if (accountsError) {
      console.error('Error storing bank accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to store bank accounts' }, { status: 500 })
    }

    // Create default budget categories for the user if they don't exist
    const { error: categoriesError } = await supabase.rpc('get_default_budget_categories', {
      user_uuid: user.id,
    })

    if (categoriesError) {
      console.error('Error creating default categories:', categoriesError)
      // Don't fail the request for this, just log it
    }

    return NextResponse.json({
      success: true,
      bank_connection: bankConnection,
      connection_id: bankConnection.id,
      accounts: accountsToInsert,
      message: 'Bank account connected successfully',
    })
  } catch (error) {
    console.error('Error exchanging token:', error)
    return NextResponse.json(
      {
        error: 'Failed to exchange token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
