import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const accountId = searchParams.get('account_id')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // First, get all bank account IDs for this user's connections
    const { data: userConnections, error: connectionsError } = await supabase
      .from('bank_connections')
      .select('id')
      .eq('user_id', user.id)

    if (connectionsError) {
      console.error('Error fetching bank connections:', connectionsError)
      return NextResponse.json({ error: 'Failed to fetch bank connections' }, { status: 500 })
    }

    if (!userConnections || userConnections.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false,
        },
      })
    }

    const connectionIds = userConnections.map((c) => c.id)

    // Get bank account IDs for these connections
    const { data: bankAccounts, error: accountsError } = await supabase
      .from('bank_accounts')
      .select('id, name, type, bank_connection_id')
      .in('bank_connection_id', connectionIds)

    if (accountsError) {
      console.error('Error fetching bank accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 })
    }

    if (!bankAccounts || bankAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false,
        },
      })
    }

    const bankAccountIds = bankAccounts.map((a) => a.id)

    // Build transaction query with date filters
    let query = supabase.from('transactions').select('*').in('bank_account_id', bankAccountIds)

    // Apply date filters (must be applied before ordering and range)
    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }
    if (accountId) {
      query = query.eq('bank_account_id', accountId)
    }
    if (category) {
      query = query.contains('category', [category])
    }

    // Order by date descending (newest first)
    query = query.order('date', { ascending: false })

    // Apply range for pagination (Supabase requires this)
    query = query.range(offset, offset + limit - 1)

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      console.error('Query parameters:', {
        startDate,
        endDate,
        limit,
        offset,
        bankAccountIds: bankAccountIds.length,
      })
      return NextResponse.json(
        {
          error: 'Failed to fetch transactions',
          details: transactionsError.message,
          code: transactionsError.code,
        },
        { status: 500 }
      )
    }

    // Debug: Log what we got
    console.log(
      `Fetched ${transactions?.length || 0} transactions for date range ${startDate} to ${endDate}`
    )

    // Get total count for pagination
    let countQuery = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .in('bank_account_id', bankAccountIds)

    if (startDate) {
      countQuery = countQuery.gte('date', startDate)
    }
    if (endDate) {
      countQuery = countQuery.lte('date', endDate)
    }
    if (accountId) {
      countQuery = countQuery.eq('bank_account_id', accountId)
    }
    if (category) {
      countQuery = countQuery.contains('category', [category])
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting transactions:', countError)
      console.error('Count query parameters:', {
        startDate,
        endDate,
        bankAccountIds: bankAccountIds.length,
      })
    }

    console.log(`Total count for date range ${startDate} to ${endDate}: ${count || 0}`)

    // Enrich transactions with bank account info
    const enrichedTransactions = (transactions || []).map((transaction) => {
      const account = bankAccounts.find((a) => a.id === transaction.bank_account_id)
      return {
        ...transaction,
        bank_accounts: account
          ? {
              id: account.id,
              name: account.name,
              type: account.type,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      transactions: enrichedTransactions,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/budget/transactions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
