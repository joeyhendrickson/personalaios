import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function parseMonthsOut(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? '1'), 10)
  if (n >= 1 && n <= 3) return n
  return 1
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

    const { data: expenses, error } = await supabase
      .from('potential_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('months_out', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching potential expenses:', error)
      return NextResponse.json({ error: 'Failed to fetch potential expenses' }, { status: 500 })
    }

    return NextResponse.json({ success: true, expenses: expenses || [] })
  } catch (error) {
    console.error('Error in GET /api/budget/potential-expenses:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch potential expenses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
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
    const { category, amount, months_out, notes } = body

    if (!category || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Category and amount are required' }, { status: 400 })
    }

    const { data: expense, error: insertError } = await supabase
      .from('potential_expenses')
      .insert({
        user_id: user.id,
        category,
        amount: parseFloat(amount),
        months_out: parseMonthsOut(months_out),
        notes: notes || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating potential expense:', insertError)
      return NextResponse.json(
        { error: 'Failed to create potential expense', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, expense })
  } catch (error) {
    console.error('Error in POST /api/budget/potential-expenses:', error)
    return NextResponse.json(
      {
        error: 'Failed to create potential expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, category, amount, months_out, notes, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (category !== undefined) updateData.category = category
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (months_out !== undefined) updateData.months_out = parseMonthsOut(months_out)
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: expense, error: updateError } = await supabase
      .from('potential_expenses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating potential expense:', updateError)
      return NextResponse.json(
        { error: 'Failed to update potential expense', details: updateError.message },
        { status: 500 }
      )
    }

    if (!expense) {
      return NextResponse.json({ error: 'Potential expense not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, expense })
  } catch (error) {
    console.error('Error in PUT /api/budget/potential-expenses:', error)
    return NextResponse.json(
      {
        error: 'Failed to update potential expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('potential_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting potential expense:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete potential expense', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Potential expense deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/budget/potential-expenses:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete potential expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
