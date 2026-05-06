import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildNetWorthSeries } from '@/lib/budget/net-worth-series'

/**
 * GET — Estimated net worth over time from current balances + posted transactions.
 * Chart starts at the earliest bank connection date for this user.
 */
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

    const { data: connections, error: connErr } = await supabase
      .from('bank_connections')
      .select('id, created_at')
      .eq('user_id', user.id)

    if (connErr) {
      console.error('net-worth-history connections:', connErr)
      return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 })
    }

    const connectionRows = connections || []
    const connectionIds = connectionRows.map((c) => c.id)

    let firstConnectionDate: string | null = null
    if (connectionRows.length > 0) {
      const earliest = connectionRows.reduce(
        (min, c) => {
          const t = new Date(c.created_at).getTime()
          return t < min.t ? { t, iso: c.created_at } : min
        },
        { t: Infinity as number, iso: connectionRows[0]!.created_at }
      )
      firstConnectionDate = new Date(earliest.iso).toISOString().slice(0, 10)
    }

    let bankAccounts: Array<{
      id: string
      type: string | null
      subtype: string | null
      current_balance: number | null
    }> = []

    if (connectionIds.length > 0) {
      const { data: accounts, error: accErr } = await supabase
        .from('bank_accounts')
        .select('id, type, subtype, current_balance')
        .in('bank_connection_id', connectionIds)

      if (accErr) {
        console.error('net-worth-history accounts:', accErr)
        return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 })
      }
      bankAccounts = accounts || []
    }

    const accountIds = bankAccounts.map((a) => a.id)

    const transactions: Array<{ bank_account_id: string; date: string; amount: number }> = []
    const pageSize = 5000
    let offset = 0

    if (accountIds.length > 0) {
      while (true) {
        const { data: page, error: txErr } = await supabase
          .from('transactions')
          .select('bank_account_id, date, amount')
          .in('bank_account_id', accountIds)
          .order('date', { ascending: true })
          .range(offset, offset + pageSize - 1)

        if (txErr) {
          console.error('net-worth-history transactions:', txErr)
          return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
        }

        if (!page?.length) break
        for (const row of page) {
          transactions.push({
            bank_account_id: row.bank_account_id,
            date: row.date,
            amount: Number(row.amount) || 0,
          })
        }
        if (page.length < pageSize) break
        offset += pageSize
      }
    }

    const { data: manualAccounts, error: manErr } = await supabase
      .from('manual_accounts')
      .select('account_type, amount')
      .eq('user_id', user.id)

    if (manErr) {
      console.error('net-worth-history manual_accounts:', manErr)
      return NextResponse.json({ error: 'Failed to load manual accounts' }, { status: 500 })
    }

    const today = new Date().toISOString().slice(0, 10)

    const points = buildNetWorthSeries({
      accounts: bankAccounts,
      transactions,
      firstConnectionDate: firstConnectionDate || today,
      today,
      manualAccounts: manualAccounts || [],
    })

    return NextResponse.json({
      success: true,
      first_connection_date: firstConnectionDate,
      today,
      points,
      disclaimer:
        'Estimated from current balances and posted transactions in this app. Early dates may be less accurate if historical transactions were not fully synced.',
    })
  } catch (error: unknown) {
    console.error('GET /api/budget/net-worth-history:', error)
    return NextResponse.json(
      {
        error: 'Failed to build net worth history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
