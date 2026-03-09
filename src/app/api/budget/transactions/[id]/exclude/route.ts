import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST - Exclude a transaction from the list (e.g. duplicate)
 * The transaction is hidden from the user's view but not deleted from the database
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: transactionId } = await params

    // Verify user has access to this transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, bank_account_id')
      .eq('id', transactionId)
      .single()

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const { data: bankAccount } = await supabase
      .from('bank_accounts')
      .select('bank_connection_id')
      .eq('id', transaction.bank_account_id)
      .single()

    if (!bankAccount) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })
    }

    const { data: connection } = await supabase
      .from('bank_connections')
      .select('user_id')
      .eq('id', bankAccount.bank_connection_id)
      .eq('user_id', user.id)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const { error: insertError } = await supabase
      .from('transaction_exclusions')
      .insert({ user_id: user.id, transaction_id: transactionId })

    if (insertError) {
      // Already excluded (unique violation) - treat as success
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, excluded: true })
      }
      console.error('Error excluding transaction:', insertError)
      const hint =
        insertError.code === '42P01' || insertError.message?.includes('relation')
          ? 'Run migration 035: Supabase SQL Editor → paste and run supabase/migrations/035_create_transaction_exclusions.sql'
          : undefined
      return NextResponse.json(
        {
          error: 'Failed to exclude transaction',
          details: insertError.message,
          code: insertError.code,
          hint,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, excluded: true })
  } catch (error: any) {
    console.error('Error in POST /api/budget/transactions/[id]/exclude:', error)
    return NextResponse.json(
      {
        error: 'Failed to exclude transaction',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
