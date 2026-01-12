import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PlaidService } from '@/lib/plaid'
import { decrypt } from '@/lib/crypto'

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
    const { bank_connection_id, start_date, end_date } = body

    if (!bank_connection_id) {
      return NextResponse.json({ error: 'Bank connection ID is required' }, { status: 400 })
    }

    // Get bank connection
    const { data: bankConnection, error: connectionError } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('id', bank_connection_id)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !bankConnection) {
      return NextResponse.json({ error: 'Bank connection not found' }, { status: 404 })
    }

    // Decrypt access token
    // Support both schema variants: plaid_access_token or access_token
    let accessToken: string
    const encryptedToken = bankConnection.plaid_access_token || bankConnection.access_token

    if (!encryptedToken) {
      return NextResponse.json(
        { error: 'Access token not found in bank connection' },
        { status: 500 }
      )
    }

    try {
      accessToken = decrypt(encryptedToken)
    } catch (error) {
      console.error('Error decrypting access token:', error)
      // If decryption fails, try using the token as-is (for backward compatibility with unencrypted tokens)
      accessToken = encryptedToken
    }

    // Get bank accounts for this connection
    const { data: bankAccounts, error: accountsError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('bank_connection_id', bank_connection_id)

    if (accountsError || !bankAccounts) {
      return NextResponse.json({ error: 'Bank accounts not found' }, { status: 404 })
    }

    // Set default date range if not provided (last 30 days)
    const endDate = end_date || new Date().toISOString().split('T')[0]
    const startDate =
      start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log(`Syncing transactions for date range: ${startDate} to ${endDate}`)

    // Get transactions from Plaid
    const accountIds = bankAccounts.map((account) => account.account_id)
    let transactionsResponse
    try {
      transactionsResponse = await PlaidService.getTransactions(
        accessToken,
        startDate,
        endDate,
        accountIds
      )
    } catch (error: any) {
      // Handle Plaid-specific errors
      const errorMessage = error?.message || 'Unknown error'
      const errorCode = error?.response?.data?.error_code || ''

      // Check for specific Plaid error codes - handle multiple variations
      if (
        errorCode === 'ITEM_LOGIN_REQUIRED' ||
        errorMessage.includes('ITEM_LOGIN_REQUIRED') ||
        errorMessage.includes('login details of this item have changed') ||
        errorMessage.includes('user login is required') ||
        errorMessage.includes('update mode to restore')
      ) {
        // Update connection status to indicate re-authentication needed
        await supabase
          .from('bank_connections')
          .update({
            status: 'error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bank_connection_id)

        return NextResponse.json(
          {
            error: 'Bank login required',
            message: 'Please reconnect your bank account. Your bank requires you to log in again.',
            requires_reconnect: true,
          },
          { status: 400 }
        )
      }

      if (errorMessage.includes('INVALID_ACCESS_TOKEN')) {
        // Mark connection as error
        await supabase
          .from('bank_connections')
          .update({
            status: 'error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bank_connection_id)

        return NextResponse.json(
          {
            error: 'Invalid access token',
            message: 'Your bank connection is no longer valid. Please reconnect your bank account.',
            requires_reconnect: true,
          },
          { status: 400 }
        )
      }

      if (errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again in a few minutes.',
          },
          { status: 429 }
        )
      }

      // Re-throw other errors
      throw error
    }

    const transactions = transactionsResponse.transactions
    console.log(
      `Received ${transactions.length} transactions from Plaid for date range ${startDate} to ${endDate}`
    )

    // Process and store transactions
    const transactionsToInsert = []
    const transactionsToUpdate = []

    for (const transaction of transactions) {
      const bankAccount = bankAccounts.find((acc) => acc.account_id === transaction.account_id)
      if (!bankAccount) continue

      // Build transaction data - use basic fields that exist in SETUP_BUDGET_OPTIMIZER.sql schema
      // That schema has: id, bank_account_id, transaction_id, amount, date, name, merchant_name, category, pending
      // We'll use only these fields to avoid schema mismatch errors
      const transactionData: any = {
        bank_account_id: bankAccount.id,
        transaction_id: transaction.transaction_id,
        amount: transaction.amount || 0,
        date: transaction.date,
        name: transaction.name || 'Unknown Transaction',
        merchant_name: transaction.merchant_name || null,
        category: transaction.category || null, // TEXT[] array from Plaid
        pending: transaction.pending || false,
      }

      // Note: Additional fields like datetime, category_id, subcategory, account_owner,
      // iso_currency_code, location, payment_meta, personal_finance_category exist in
      // migration 015 schema but not in SETUP_BUDGET_OPTIMIZER.sql schema
      // If you need these fields, you'll need to add them via a migration

      // Check if transaction already exists
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('bank_account_id', bankAccount.id)
        .eq('transaction_id', transaction.transaction_id)
        .single()

      if (existingTransaction) {
        transactionsToUpdate.push({ id: existingTransaction.id, ...transactionData })
      } else {
        transactionsToInsert.push(transactionData)
      }
    }

    // Insert new transactions
    if (transactionsToInsert.length > 0) {
      console.log(`Attempting to insert ${transactionsToInsert.length} new transactions`)
      const { error: insertError, data: insertedData } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select()

      if (insertError) {
        console.error('Error inserting transactions:', insertError)
        console.error('Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          sample_transaction: transactionsToInsert[0],
        })
        return NextResponse.json(
          {
            error: 'Failed to insert transactions',
            details: insertError.message,
            code: insertError.code,
            hint: insertError.hint,
          },
          { status: 500 }
        )
      }
      console.log(
        `Successfully inserted ${insertedData?.length || transactionsToInsert.length} transactions`
      )
    } else {
      console.log(
        `No new transactions to insert - ${transactions.length} transactions from Plaid were all duplicates`
      )
    }

    // Update existing transactions
    if (transactionsToUpdate.length > 0) {
      for (const transaction of transactionsToUpdate) {
        const { id, ...updateData } = transaction
        const { error: updateError } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', id)

        if (updateError) {
          console.error('Error updating transaction:', updateError)
        }
      }
    }

    // Update bank connection last sync time
    await supabase
      .from('bank_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', bank_connection_id)

    // Update account balances (don't fail the sync if this fails)
    try {
      const balancesResponse = await PlaidService.getBalances(accessToken)
      for (const account of balancesResponse.accounts) {
        const bankAccount = bankAccounts.find((acc) => acc.account_id === account.account_id)
        if (bankAccount) {
          await supabase
            .from('bank_accounts')
            .update({
              current_balance: account.balances.current,
              available_balance: account.balances.available,
              updated_at: new Date().toISOString(),
            })
            .eq('id', bankAccount.id)
        }
      }
    } catch (balanceError: any) {
      // Log balance error but don't fail the sync - transactions were successfully synced
      console.error(
        'Error updating account balances (non-fatal):',
        balanceError?.message || balanceError
      )
      // Continue - transactions were already synced successfully
    }

    return NextResponse.json({
      success: true,
      transactions_synced: transactionsToInsert.length,
      transactions_updated: transactionsToUpdate.length,
      total_transactions: transactions.length,
      date_range: { start_date, end_date },
    })
  } catch (error: any) {
    console.error('Error syncing transactions:', error)

    // Log detailed error information
    const errorDetails: any = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
    }

    // Include Plaid error details if available
    if (error?.response?.data) {
      errorDetails.plaid_error = {
        error_code: error.response.data.error_code,
        error_message: error.response.data.error_message,
        error_type: error.response.data.error_type,
        display_message: error.response.data.display_message,
        request_id: error.response.data.request_id,
      }
    }

    console.error('Full error details:', JSON.stringify(errorDetails, null, 2))

    return NextResponse.json(
      {
        error: 'Failed to sync transactions',
        details: errorDetails.message,
        plaid_error: errorDetails.plaid_error || undefined,
      },
      { status: 500 }
    )
  }
}
