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

    // Get user's manual accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('manual_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (accountsError) {
      console.error('Error fetching manual accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to fetch manual accounts' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      accounts: accounts || [],
    })
  } catch (error) {
    console.error('Error in GET /api/budget/manual-accounts:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch manual accounts',
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
    const { institution_name, account_name, account_type, amount, notes } = body

    if (!institution_name || !account_type || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Institution name, account type, and amount are required' },
        { status: 400 }
      )
    }

    // Validate account_type
    const validTypes = ['investment', 'loan', 'asset', 'other']
    if (!validTypes.includes(account_type)) {
      return NextResponse.json(
        { error: `Account type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Insert manual account
    const { data: account, error: insertError } = await supabase
      .from('manual_accounts')
      .insert({
        user_id: user.id,
        institution_name,
        account_name: account_name || null,
        account_type,
        amount: parseFloat(amount),
        notes: notes || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating manual account:', insertError)
      return NextResponse.json(
        {
          error: 'Failed to create manual account',
          details: insertError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      account,
    })
  } catch (error) {
    console.error('Error in POST /api/budget/manual-accounts:', error)
    return NextResponse.json(
      {
        error: 'Failed to create manual account',
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
    const { id, institution_name, account_name, account_type, amount, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    // Validate account_type if provided
    if (account_type) {
      const validTypes = ['investment', 'loan', 'asset', 'other']
      if (!validTypes.includes(account_type)) {
        return NextResponse.json(
          { error: `Account type must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Update manual account
    const updateData: any = {}
    if (institution_name !== undefined) updateData.institution_name = institution_name
    if (account_name !== undefined) updateData.account_name = account_name
    if (account_type !== undefined) updateData.account_type = account_type
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (notes !== undefined) updateData.notes = notes

    const { data: account, error: updateError } = await supabase
      .from('manual_accounts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating manual account:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update manual account',
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      account,
    })
  } catch (error) {
    console.error('Error in PUT /api/budget/manual-accounts:', error)
    return NextResponse.json(
      {
        error: 'Failed to update manual account',
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
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    // Delete manual account
    const { error: deleteError } = await supabase
      .from('manual_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting manual account:', deleteError)
      return NextResponse.json(
        {
          error: 'Failed to delete manual account',
          details: deleteError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Manual account deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/budget/manual-accounts:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete manual account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
