import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildVerifiedPeriodSummary,
  fingerprintTransactionSet,
} from '@/lib/budget/verified-period-cache'

async function fetchTransactionsInRange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  startDate: string,
  endDate: string
) {
  const { data: userConnections } = await supabase
    .from('bank_connections')
    .select('id')
    .eq('user_id', userId)

  const connectionIds = userConnections?.map((c) => c.id) || []
  if (connectionIds.length === 0) return []

  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('id')
    .in('bank_connection_id', connectionIds)

  const bankAccountIds = bankAccounts?.map((a) => a.id) || []
  if (bankAccountIds.length === 0) return []

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, date, amount, name, merchant_name, category, updated_at')
    .in('bank_account_id', bankAccountIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) {
    console.error('verified-periods fetch txs', error)
    return null
  }
  return transactions || []
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rows, error } = await supabase
      .from('budget_verified_transaction_periods')
      .select('id, start_date, end_date, content_fingerprint, created_at, updated_at')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation')) {
        return NextResponse.json(
          {
            error: 'Table missing',
            hint: 'Apply migration 046_budget_verified_transaction_periods.sql',
          },
          { status: 503 }
        )
      }
      console.error('verified-periods list', error)
      return NextResponse.json({ error: 'Failed to list saved periods' }, { status: 500 })
    }

    return NextResponse.json({ periods: rows || [] })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const start_date = body.start_date as string | undefined
    const end_date = body.end_date as string | undefined
    if (!start_date || !end_date || start_date > end_date) {
      return NextResponse.json({ error: 'Invalid start_date or end_date' }, { status: 400 })
    }

    const txs = await fetchTransactionsInRange(supabase, user.id, start_date, end_date)
    if (txs === null) {
      return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
    }

    const fingerprint = fingerprintTransactionSet(
      txs.map((t) => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        name: t.name,
        updated_at: t.updated_at,
      }))
    )

    const summary = buildVerifiedPeriodSummary(start_date, end_date, txs)

    const payload = {
      user_id: user.id,
      start_date,
      end_date,
      content_fingerprint: fingerprint,
      summary_json: summary,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('budget_verified_transaction_periods')
      .select('id')
      .eq('user_id', user.id)
      .eq('start_date', start_date)
      .eq('end_date', end_date)
      .maybeSingle()

    let row: Record<string, unknown> | null = null
    let saveError: { message?: string; code?: string } | null = null

    if (existing?.id) {
      const { data, error } = await supabase
        .from('budget_verified_transaction_periods')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      row = data
      saveError = error
    } else {
      const { data, error } = await supabase
        .from('budget_verified_transaction_periods')
        .insert(payload)
        .select()
        .single()
      row = data
      saveError = error
    }

    if (saveError) {
      console.error('verified-periods save', saveError)
      const hint =
        saveError.code === '42P01' || saveError.message?.includes('relation')
          ? 'Apply migration 046_budget_verified_transaction_periods.sql'
          : undefined
      return NextResponse.json(
        { error: 'Failed to save verified period', details: saveError.message, hint },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      period: row,
      transaction_count: txs.length,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
