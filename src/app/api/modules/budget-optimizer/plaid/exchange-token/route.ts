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
    const tokenResponse = await PlaidService.exchangePublicToken(public_token)
    const accessToken = tokenResponse.access_token
    const itemId = tokenResponse.item_id

    // Get account information
    const accountsResponse = await PlaidService.getAccounts(accessToken)
    const accounts = accountsResponse.accounts

    // Encrypt access token before storing
    const encryptedAccessToken = encrypt(accessToken)

    // Store bank connection in database
    const { data: bankConnection, error: connectionError } = await supabase
      .from('bank_connections')
      .insert({
        user_id: user.id,
        access_token: encryptedAccessToken, // Encrypted for security
        item_id: itemId,
        institution_id: institution_id,
        institution_name: institution_name || 'Unknown Bank',
        status: 'active',
        last_sync_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (connectionError) {
      console.error('Error storing bank connection:', connectionError)
      return NextResponse.json({ error: 'Failed to store bank connection' }, { status: 500 })
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
