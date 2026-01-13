import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT - Update a transaction rule
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { keyword, transaction_type, category_type, is_active } = body

    const updateData: any = {}
    if (keyword !== undefined) updateData.keyword = keyword.trim().toLowerCase()
    if (transaction_type !== undefined) {
      if (!['income', 'expense', 'transfer'].includes(transaction_type)) {
        return NextResponse.json(
          { error: 'transaction_type must be income, expense, or transfer' },
          { status: 400 }
        )
      }
      updateData.transaction_type = transaction_type
    }
    if (category_type !== undefined) {
      if (!['personal', 'business'].includes(category_type)) {
        return NextResponse.json(
          { error: 'category_type must be personal or business' },
          { status: 400 }
        )
      }
      updateData.category_type = category_type
    }
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: rule, error } = await supabase
      .from('transaction_rules')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating transaction rule:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A rule with this keyword already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rule,
    })
  } catch (error: any) {
    console.error('Error in PUT /api/budget/transaction-rules/[id]:', error)
    return NextResponse.json(
      {
        error: 'Failed to update transaction rule',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete a transaction rule
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('transaction_rules')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting transaction rule:', error)
      return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/budget/transaction-rules/[id]:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete transaction rule',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
