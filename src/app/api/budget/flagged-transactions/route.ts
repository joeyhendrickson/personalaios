import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET - List all transactions flagged for review (status = pending)
 */
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

    const { data: flags } = await supabase
      .from('transaction_flags')
      .select('transaction_id')
      .eq('user_id', user.id)
      .eq('status', 'pending')

    if (!flags || flags.length === 0) {
      return NextResponse.json({ success: true, transactions: [] })
    }

    const transactionIds = flags.map((f) => f.transaction_id)

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .in('id', transactionIds)
      .order('date', { ascending: false })

    if (txError) {
      console.error('Error fetching flagged transactions:', txError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: txError.message },
        { status: 500 }
      )
    }

    const { data: bankAccounts } = await supabase.from('bank_accounts').select('id, name, type')

    const enriched = (transactions || []).map((t) => {
      const account = (bankAccounts || []).find((a) => a.id === t.bank_account_id)
      return {
        ...t,
        bank_accounts: account ? { id: account.id, name: account.name, type: account.type } : null,
      }
    })

    return NextResponse.json({ success: true, transactions: enriched })
  } catch (error: any) {
    console.error('Error in GET /api/budget/flagged-transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flagged transactions', details: error?.message },
      { status: 500 }
    )
  }
}
