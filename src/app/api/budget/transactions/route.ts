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

    // Build query
    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        bank_accounts!inner (
          id,
          name,
          type,
          bank_connections!inner (
            user_id
          )
        ),
        transaction_categorizations (
          category_id,
          budget_categories (
            id,
            name,
            color,
            icon
          )
        )
      `
      )
      .eq('bank_accounts.bank_connections.user_id', user.id)
      .order('date', { ascending: false })
      .order('datetime', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
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

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('bank_accounts.bank_connections.user_id', user.id)

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
    }

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
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
