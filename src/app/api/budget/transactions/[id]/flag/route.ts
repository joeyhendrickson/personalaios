import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyTransactionAccess(supabase: any, transactionId: string, userId: string) {
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, bank_account_id')
    .eq('id', transactionId)
    .single()
  if (!transaction) return null

  const { data: bankAccount } = await supabase
    .from('bank_accounts')
    .select('bank_connection_id')
    .eq('id', transaction.bank_account_id)
    .single()
  if (!bankAccount) return null

  const { data: connection } = await supabase
    .from('bank_connections')
    .select('user_id')
    .eq('id', bankAccount.bank_connection_id)
    .eq('user_id', userId)
    .single()
  return connection ? transaction : null
}

/**
 * POST - Flag a transaction for review (fraud check, clarify charge, etc.)
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
    const tx = await verifyTransactionAccess(supabase, transactionId, user.id)
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    let { error: insertError } = await supabase
      .from('transaction_flags')
      .insert({ user_id: user.id, transaction_id: transactionId, status: 'pending' })

    if (insertError?.code === '23505') {
      const { error: updateError } = await supabase
        .from('transaction_flags')
        .update({ status: 'pending', resolved_at: null })
        .eq('user_id', user.id)
        .eq('transaction_id', transactionId)
      insertError = updateError
    }

    if (insertError) {
      console.error('Error flagging transaction:', insertError)
      return NextResponse.json(
        {
          error: 'Failed to flag transaction',
          details: insertError.message,
          hint:
            insertError.code === '42P01'
              ? 'Run migration 036: supabase/migrations/036_create_transaction_flags.sql'
              : undefined,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, flagged: true })
  } catch (error: any) {
    console.error('Error in POST /api/budget/transactions/[id]/flag:', error)
    return NextResponse.json(
      { error: 'Failed to flag transaction', details: error?.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Mark a flagged transaction as managed/resolved
 * Body: { resolved: true }
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
    const tx = await verifyTransactionAccess(supabase, transactionId, user.id)
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('transaction_flags')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('transaction_id', transactionId)

    if (updateError) {
      console.error('Error resolving flag:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark as managed', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, resolved: true })
  } catch (error: any) {
    console.error('Error in PATCH /api/budget/transactions/[id]/flag:', error)
    return NextResponse.json(
      { error: 'Failed to mark as managed', details: error?.message },
      { status: 500 }
    )
  }
}
