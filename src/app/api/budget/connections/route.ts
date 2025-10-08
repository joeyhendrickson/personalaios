import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's bank connections with accounts
    const { data: connections, error: connectionsError } = await supabase
      .from('bank_connections')
      .select(
        `
        *,
        bank_accounts (
          id,
          account_id,
          name,
          official_name,
          type,
          subtype,
          mask,
          current_balance,
          available_balance,
          iso_currency_code
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (connectionsError) {
      console.error('Error fetching bank connections:', connectionsError)
      return NextResponse.json({ error: 'Failed to fetch bank connections' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      connections: connections || [],
    })
  } catch (error) {
    console.error('Error in GET /api/budget/connections:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch bank connections',
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
    const connectionId = searchParams.get('id')

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    // Verify the connection belongs to the user
    const { data: connection, error: connectionError } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Bank connection not found' }, { status: 404 })
    }

    // Delete the bank connection (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('bank_connections')
      .delete()
      .eq('id', connectionId)

    if (deleteError) {
      console.error('Error deleting bank connection:', deleteError)
      return NextResponse.json({ error: 'Failed to delete bank connection' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Bank connection deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/budget/connections:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete bank connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
