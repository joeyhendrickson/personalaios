import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

    // Create service role client for admin operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Fetch all access codes
    const { data: codes, error: codesError } = await serviceSupabase
      .from('access_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (codesError) {
      console.error('Error fetching access codes:', codesError)
      return NextResponse.json({ error: 'Failed to fetch access codes' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      codes: codes || [],
    })
  } catch (error) {
    console.error('Unexpected error in access codes API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const { name, email, expires_days, max_uses } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Code name is required' }, { status: 400 })
    }

    // Create service role client for admin operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('🔧 Attempting to create access code:', { name, email, expires_days })

    // Generate unique 8-character code
    const generateCode = () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase()
    }

    let newCode = generateCode()

    // Ensure code is unique
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await serviceSupabase
        .from('access_codes')
        .select('code')
        .eq('code', newCode)
        .single()

      if (!existing) break

      newCode = generateCode()
      attempts++
    }

    if (attempts >= 10) {
      console.error('❌ Could not generate unique code after 10 attempts')
      return NextResponse.json(
        {
          error: 'Could not generate unique access code',
        },
        { status: 500 }
      )
    }

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (expires_days || 30))

    // Insert the new access code directly
    const { data, error } = await serviceSupabase
      .from('access_codes')
      .insert({
        code: newCode,
        name,
        email: email || null,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        max_uses: max_uses ? parseInt(max_uses) : null,
        used_count: 0,
      })
      .select()
      .single()

    console.log('📊 Insert result:', { data, error })

    if (error) {
      console.error('❌ Error inserting access code:', error)
      return NextResponse.json(
        {
          error: 'Failed to create access code',
          details: error.message,
          code: error.code,
          hint: error.hint,
        },
        { status: 500 }
      )
    }

    if (!data) {
      console.error('❌ No data returned from insert')
      return NextResponse.json(
        {
          error: 'No data returned from access code creation',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ...data,
    })
  } catch (error) {
    console.error('Unexpected error creating access code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const { id, is_active, max_uses } = await request.json()

    console.log('📝 Update request:', { id, is_active, max_uses })

    if (!id) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Create service role client for admin operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Build update object
    const updateData: any = {}
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active
    }
    if (max_uses !== undefined) {
      const parsedMaxUses = max_uses ? parseInt(max_uses.toString()) : null
      updateData.max_uses = parsedMaxUses && !isNaN(parsedMaxUses) ? parsedMaxUses : null
    }

    console.log('📊 Update data being sent:', updateData)

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 })
    }

    // Update the access code
    const { data, error } = await serviceSupabase
      .from('access_codes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating access code:', error)
      return NextResponse.json(
        {
          error: 'Failed to update access code',
          details: error.message,
        },
        { status: 500 }
      )
    }

    console.log('✅ Successfully updated access code:', data)

    return NextResponse.json({
      success: true,
      code: data,
    })
  } catch (error) {
    console.error('Unexpected error updating access code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
