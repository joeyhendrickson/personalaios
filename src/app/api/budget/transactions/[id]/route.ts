import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH - Set or clear the type override for a transaction (income vs expense)
 * Body: { type_override: 'income' | 'expense' | null }
 * - 'income' = display as green/up (income)
 * - 'expense' = display as red/down (expense)
 * - null = clear override, use default logic
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await request.json()
    const { type_override } = body

    if (type_override !== null && type_override !== undefined) {
      if (!['income', 'expense'].includes(type_override)) {
        return NextResponse.json(
          { error: 'type_override must be "income" or "expense"' },
          { status: 400 }
        )
      }
    }

    // Verify user has access to this transaction (through bank_account -> bank_connection)
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('id, bank_account_id')
      .eq('id', transactionId)
      .single()

    if (txError || !transaction) {
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

    if (type_override === null || type_override === undefined) {
      // Clear the override
      await supabase
        .from('transaction_type_overrides')
        .delete()
        .eq('transaction_id', transactionId)
        .eq('user_id', user.id)
    } else {
      // Upsert the override
      const { error: upsertError } = await supabase.from('transaction_type_overrides').upsert(
        {
          user_id: user.id,
          transaction_id: transactionId,
          type_override,
        },
        {
          onConflict: 'transaction_id',
          ignoreDuplicates: false,
        }
      )
      if (upsertError) {
        console.error('Error upserting transaction type override:', upsertError)
        return NextResponse.json(
          { error: 'Failed to save override', details: upsertError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      type_override: type_override ?? null,
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/budget/transactions/[id]:', error)
    return NextResponse.json(
      {
        error: 'Failed to update transaction type',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
