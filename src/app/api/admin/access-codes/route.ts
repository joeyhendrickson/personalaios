import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check admin access
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', user.email)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch all access codes
    const { data: codes, error: codesError } = await supabase
      .from('access_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (codesError) {
      console.error('Error fetching access codes:', codesError)
      return NextResponse.json({ error: 'Failed to fetch access codes' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      codes: codes || []
    })

  } catch (error) {
    console.error('Unexpected error in access codes API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check admin access
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', user.email)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { name, email, expires_days } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Code name is required' }, { status: 400 })
    }

    // Call the database function to create the code
    const { data, error } = await supabase.rpc('create_access_code', {
      code_name: name,
      code_email: email || null,
      expires_days: expires_days || 30
    })

    if (error) {
      console.error('Error creating access code:', error)
      return NextResponse.json({ error: 'Failed to create access code' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ...data
    })

  } catch (error) {
    console.error('Unexpected error creating access code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    // Check admin access
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', user.email)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id, is_active } = await request.json()

    if (!id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Update the access code
    const { data, error } = await supabase
      .from('access_codes')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating access code:', error)
      return NextResponse.json({ error: 'Failed to update access code' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      code: data
    })

  } catch (error) {
    console.error('Unexpected error updating access code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
