import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

/**
 * PATCH - Set or clear the type override for a transaction (income vs expense)
 * Body: { type_override: 'income' | 'expense' | 'transfer' | null }
 * - 'income' = display as green/up (income)
 * - 'expense' = display as red/down (expense)
 * - 'transfer' = display as grey/neutral (transfer)
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
      if (!['income', 'expense', 'transfer'].includes(type_override)) {
        return NextResponse.json(
          { error: 'type_override must be "income", "expense", or "transfer"' },
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
      let deleteError: { message?: string; code?: string } | null = null
      try {
        const admin = createAdminClient()
        const { error } = await admin
          .from('transaction_type_overrides')
          .delete()
          .eq('transaction_id', transactionId)
          .eq('user_id', user.id)
        deleteError = error
      } catch {
        const { error } = await supabase
          .from('transaction_type_overrides')
          .delete()
          .eq('transaction_id', transactionId)
          .eq('user_id', user.id)
        deleteError = error
      }
      if (deleteError) {
        console.error('Error deleting transaction type override:', deleteError)
        return NextResponse.json(
          {
            error: 'Failed to clear override',
            details: deleteError.message,
            code: deleteError.code,
          },
          { status: 500 }
        )
      }
    } else {
      const row = {
        user_id: user.id,
        transaction_id: transactionId,
        type_override,
      }
      let upsertError: { message?: string; code?: string } | null = null
      try {
        const admin = createAdminClient()
        const { error } = await admin.from('transaction_type_overrides').upsert(row, {
          onConflict: 'transaction_id',
          ignoreDuplicates: false,
        })
        upsertError = error
      } catch {
        const { error } = await supabase.from('transaction_type_overrides').upsert(row, {
          onConflict: 'transaction_id',
          ignoreDuplicates: false,
        })
        upsertError = error
      }
      if (upsertError) {
        console.error('Error upserting transaction type override:', upsertError)
        const hint =
          upsertError.message?.includes('check') || upsertError.code === '23514'
            ? 'Apply migration 034 or 048 so type_override allows transfer (SQL Editor: supabase/migrations/048_ensure_transfer_type_override_constraint.sql), or run supabase db push.'
            : undefined
        return NextResponse.json(
          {
            error: 'Failed to save override',
            details: upsertError.message,
            code: upsertError.code,
            hint,
          },
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
