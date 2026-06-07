import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { mergeTransactionOverridePatch } from '@/lib/budget/transaction-overrides'

/**
 * PATCH - Set or clear user overrides for a transaction
 * Body: {
 *   type_override?: 'income' | 'expense' | 'transfer' | null
 *   amount_override?: number | null
 * }
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
    const { type_override, amount_override } = body

    if (type_override === undefined && amount_override === undefined) {
      return NextResponse.json(
        { error: 'Provide type_override and/or amount_override' },
        { status: 400 }
      )
    }

    if (type_override !== null && type_override !== undefined) {
      if (!['income', 'expense', 'transfer'].includes(type_override)) {
        return NextResponse.json(
          { error: 'type_override must be "income", "expense", or "transfer"' },
          { status: 400 }
        )
      }
    }

    if (amount_override !== null && amount_override !== undefined) {
      const parsed = Number(amount_override)
      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          { error: 'amount_override must be a valid number' },
          { status: 400 }
        )
      }
    }

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

    const { data: existingRow } = await supabase
      .from('transaction_type_overrides')
      .select('type_override, amount_override')
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .maybeSingle()

    const merged = mergeTransactionOverridePatch(
      existingRow
        ? {
            type_override: (existingRow.type_override as 'income' | 'expense' | 'transfer') ?? null,
            amount_override:
              existingRow.amount_override != null ? Number(existingRow.amount_override) : null,
          }
        : null,
      {
        type_override,
        amount_override:
          amount_override !== undefined && amount_override !== null
            ? Number(amount_override)
            : amount_override,
      }
    )

    const runOverrideWrite = async (
      client: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>
    ) => {
      if (!merged) {
        return client
          .from('transaction_type_overrides')
          .delete()
          .eq('transaction_id', transactionId)
          .eq('user_id', user.id)
      }

      return client.from('transaction_type_overrides').upsert(
        {
          user_id: user.id,
          transaction_id: transactionId,
          type_override: merged.type_override,
          amount_override: merged.amount_override,
        },
        { onConflict: 'transaction_id', ignoreDuplicates: false }
      )
    }

    let writeError: { message?: string; code?: string } | null = null
    try {
      const admin = createAdminClient()
      const { error } = await runOverrideWrite(admin)
      writeError = error
    } catch {
      const { error } = await runOverrideWrite(supabase)
      writeError = error
    }

    if (writeError) {
      console.error('Error saving transaction override:', writeError)
      const hint =
        writeError.code === '42P01' ||
        writeError.message?.includes('amount_override') ||
        writeError.message?.includes('transaction_type_overrides')
          ? 'Run migration 078 in Supabase SQL Editor: supabase/migrations/078_transaction_amount_override.sql'
          : writeError.message?.includes('check') || writeError.code === '23514'
            ? 'Apply migration 034 or 048 so type_override allows transfer, and migration 078 for amount overrides.'
            : undefined
      return NextResponse.json(
        {
          error: 'Failed to save override',
          details: writeError.message,
          code: writeError.code,
          hint,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      type_override: merged?.type_override ?? null,
      amount_override: merged?.amount_override ?? null,
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/budget/transactions/[id]:', error)
    return NextResponse.json(
      {
        error: 'Failed to update transaction',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
