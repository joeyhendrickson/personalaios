import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all transaction rules for the current user
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

    const { data: rules, error } = await supabase
      .from('transaction_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transaction rules:', error)
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rules: rules || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/budget/transaction-rules:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch transaction rules',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST - Create a new transaction rule
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
    const { keyword, transaction_type, category_type, is_active } = body

    if (!keyword || !transaction_type || !category_type) {
      return NextResponse.json(
        { error: 'keyword, transaction_type, and category_type are required' },
        { status: 400 }
      )
    }

    if (!['income', 'expense', 'transfer'].includes(transaction_type)) {
      return NextResponse.json(
        { error: 'transaction_type must be income, expense, or transfer' },
        { status: 400 }
      )
    }

    if (!['personal', 'business'].includes(category_type)) {
      return NextResponse.json(
        { error: 'category_type must be personal or business' },
        { status: 400 }
      )
    }

    const { data: rule, error } = await supabase
      .from('transaction_rules')
      .insert({
        user_id: user.id,
        keyword: keyword.trim().toLowerCase(),
        transaction_type,
        category_type,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating transaction rule:', error)
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A rule with this keyword already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rule,
    })
  } catch (error: any) {
    console.error('Error in POST /api/budget/transaction-rules:', error)
    return NextResponse.json(
      {
        error: 'Failed to create transaction rule',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
