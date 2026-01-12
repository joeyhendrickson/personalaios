import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const { category, amount, frequency } = body

    if (!category || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Category and amount are required' }, { status: 400 })
    }

    // Check if expected expense with this category already exists
    const { data: existingExpense, error: findError } = await supabase
      .from('expected_expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .eq('is_active', true)
      .maybeSingle()

    if (findError) {
      console.error('Error finding expected expense:', findError)
      return NextResponse.json({ error: 'Failed to find expected expense' }, { status: 500 })
    }

    if (existingExpense) {
      // Update existing expense
      const { data: expense, error: updateError } = await supabase
        .from('expected_expenses')
        .update({
          amount: parseFloat(amount),
          frequency: frequency || existingExpense.frequency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingExpense.id)
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

      return NextResponse.json({
        success: true,
        expense,
        action: 'updated',
      })
    } else {
      // Create new expected expense
      const { data: expense, error: insertError } = await supabase
        .from('expected_expenses')
        .insert({
          user_id: user.id,
          category,
          amount: parseFloat(amount),
          frequency: frequency || 'monthly',
          is_active: true,
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
        action: 'created',
      })
    }
  } catch (error) {
    console.error('Error in POST /api/budget/expected-expenses/update-by-category:', error)
    return NextResponse.json(
      {
        error: 'Failed to update expected expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
