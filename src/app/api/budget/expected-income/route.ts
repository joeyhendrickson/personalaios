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

    const { data: income, error: incomeError } = await supabase
      .from('expected_income')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (incomeError) {
      console.error('Error fetching expected income:', incomeError)
      return NextResponse.json({ error: 'Failed to fetch expected income' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      income: income || [],
    })
  } catch (error) {
    console.error('Error in GET /api/budget/expected-income:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch expected income',
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

    const { data: income, error: insertError } = await supabase
      .from('expected_income')
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
      console.error('Error creating expected income:', insertError)
      return NextResponse.json(
        {
          error: 'Failed to create expected income',
          details: insertError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      income,
    })
  } catch (error) {
    console.error('Error in POST /api/budget/expected-income:', error)
    return NextResponse.json(
      {
        error: 'Failed to create expected income',
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
      return NextResponse.json({ error: 'Income ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (category !== undefined) updateData.category = category
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (frequency !== undefined) updateData.frequency = frequency
    if (notes !== undefined) updateData.notes = notes

    const { data: income, error: updateError } = await supabase
      .from('expected_income')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating expected income:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update expected income',
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    if (!income) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      income,
    })
  } catch (error) {
    console.error('Error in PUT /api/budget/expected-income:', error)
    return NextResponse.json(
      {
        error: 'Failed to update expected income',
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
      return NextResponse.json({ error: 'Income ID is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('expected_income')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting expected income:', deleteError)
      return NextResponse.json(
        {
          error: 'Failed to delete expected income',
          details: deleteError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Expected income deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/budget/expected-income:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete expected income',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
