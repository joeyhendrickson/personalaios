import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { data: expenses, error: expensesError } = await supabase
      .from('expected_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (expensesError) {
      console.error('Error fetching expected expenses:', expensesError)
      return NextResponse.json({ error: 'Failed to fetch expected expenses' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      expenses: expenses || [],
    })
  } catch (error) {
    console.error('Error in GET /api/budget/expected-expenses:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch expected expenses',
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
    const { category, amount, frequency, notes } = body

    if (!category || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Category and amount are required' }, { status: 400 })
    }

    const { data: expense, error: insertError } = await supabase
      .from('expected_expenses')
      .insert({
        user_id: user.id,
        category,
        amount: parseFloat(amount),
        frequency: frequency || 'monthly',
        notes: notes || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating expected expense:', insertError)
      return NextResponse.json(
        {
          error: 'Failed to create expected expense',
          details: insertError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      expense,
    })
  } catch (error) {
    console.error('Error in POST /api/budget/expected-expenses:', error)
    return NextResponse.json(
      {
        error: 'Failed to create expected expense',
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
    const { id, category, amount, frequency, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (category !== undefined) updateData.category = category
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (frequency !== undefined) updateData.frequency = frequency
    if (notes !== undefined) updateData.notes = notes

    const { data: expense, error: updateError } = await supabase
      .from('expected_expenses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating expected expense:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update expected expense',
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      expense,
    })
  } catch (error) {
    console.error('Error in PUT /api/budget/expected-expenses:', error)
    return NextResponse.json(
      {
        error: 'Failed to update expected expense',
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
      .from('expected_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting expected expense:', deleteError)
      return NextResponse.json(
        {
          error: 'Failed to delete expected expense',
          details: deleteError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Expected expense deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/budget/expected-expenses:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete expected expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
