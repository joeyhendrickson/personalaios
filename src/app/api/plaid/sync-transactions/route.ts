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

    // Get transactions from Plaid
    const accountIds = bankAccounts.map((account) => account.account_id)
    const transactionsResponse = await PlaidService.getTransactions(
      bankConnection.access_token,
      startDate,
      endDate,
      accountIds
    )

    const transactions = transactionsResponse.transactions

    // Process and store transactions
    const transactionsToInsert = []
    const transactionsToUpdate = []

    for (const transaction of transactions) {
      const bankAccount = bankAccounts.find((acc) => acc.account_id === transaction.account_id)
      if (!bankAccount) continue

      const transactionData = {
        bank_account_id: bankAccount.id,
        transaction_id: transaction.transaction_id,
        amount: transaction.amount,
        date: transaction.date,
        datetime: transaction.datetime,
        name: transaction.name,
        merchant_name: transaction.merchant_name,
        category: transaction.category,
        category_id: transaction.category_id,
        subcategory: (transaction as any).subcategory || null,
        account_owner: transaction.account_owner,
        pending: transaction.pending,
        iso_currency_code: transaction.iso_currency_code || 'USD',
        location: transaction.location,
        payment_meta: transaction.payment_meta,
        personal_finance_category: transaction.personal_finance_category,
      }

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
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)

      if (insertError) {
        console.error('Error inserting transactions:', insertError)
        return NextResponse.json({ error: 'Failed to insert transactions' }, { status: 500 })
      }
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

    // Update account balances
    const balancesResponse = await PlaidService.getBalances(bankConnection.access_token)
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

    return NextResponse.json({
      success: true,
      transactions_synced: transactionsToInsert.length,
      transactions_updated: transactionsToUpdate.length,
      total_transactions: transactions.length,
      date_range: { start_date, end_date },
    })
  } catch (error) {
    console.error('Error syncing transactions:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
