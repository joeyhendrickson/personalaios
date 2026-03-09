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

    const transactionIds = (transactions || []).map((t) => t.id)

    // Fetch excluded transaction IDs (user has chosen to hide these, e.g. duplicates)
    let excludedIds = new Set<string>()
    if (transactionIds.length > 0) {
      const { data: exclusions } = await supabase
        .from('transaction_exclusions')
        .select('transaction_id')
        .eq('user_id', user.id)
        .in('transaction_id', transactionIds)
      excludedIds = new Set((exclusions || []).map((e) => e.transaction_id))
    }

    // Filter out excluded transactions
    const visibleTransactions = (transactions || []).filter((t) => !excludedIds.has(t.id))

    // Fetch type overrides and flags for visible transactions
    const visibleIds = visibleTransactions.map((t) => t.id)
    let overridesMap: Record<string, 'income' | 'expense' | 'transfer'> = {}
    let flaggedIds = new Set<string>()
    if (visibleIds.length > 0) {
      const overridesRes = await supabase
        .from('transaction_type_overrides')
        .select('transaction_id, type_override')
        .eq('user_id', user.id)
        .in('transaction_id', visibleIds)
      overridesMap = (overridesRes.data || []).reduce(
        (acc, row) => {
          acc[row.transaction_id] = row.type_override as 'income' | 'expense' | 'transfer'
          return acc
        },
        {} as Record<string, 'income' | 'expense' | 'transfer'>
      )
      const flagsRes = await supabase
        .from('transaction_flags')
        .select('transaction_id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .in('transaction_id', visibleIds)
      if (!flagsRes.error) {
        flaggedIds = new Set((flagsRes.data || []).map((f) => f.transaction_id))
      }
    }

    // Enrich visible transactions with bank account info, type override, and flag status
    const enrichedTransactions = visibleTransactions.map((transaction) => {
      const account = bankAccounts.find((a) => a.id === transaction.bank_account_id)
      return {
        ...transaction,
        type_override: overridesMap[transaction.id] ?? null,
        is_flagged: flaggedIds.has(transaction.id),
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
