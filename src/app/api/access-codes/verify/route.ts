import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { code, email } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    // Use service role client for elevated privileges
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

    // Fetch the access code
    const { data: accessCode, error: fetchError } = await serviceSupabase
      .from('access_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (fetchError || !accessCode) {
      console.log('❌ Access code not found:', code)
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid access code',
        },
        { status: 404 }
      )
    }

    console.log('📋 Access code found:', accessCode)

    // Check if code is active
    if (!accessCode.is_active) {
      console.log('❌ Access code is inactive')
      return NextResponse.json(
        {
          valid: false,
          error: 'This access code has been deactivated',
        },
        { status: 400 }
      )
    }

    // Check if code has expired
    if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
      console.log('❌ Access code has expired')
      return NextResponse.json(
        {
          valid: false,
          error: 'This access code has expired',
        },
        { status: 400 }
      )
    }

    // Check if code is email-specific
    if (accessCode.email && email && accessCode.email.toLowerCase() !== email.toLowerCase()) {
      console.log('❌ Access code is for a different email')
      return NextResponse.json(
        {
          valid: false,
          error: 'This access code is assigned to a different email address',
        },
        { status: 400 }
      )
    }

    // Check usage limits
    if (accessCode.max_uses !== null) {
      const usedCount = accessCode.used_count || 0
      if (usedCount >= accessCode.max_uses) {
        console.log('❌ Access code has reached usage limit')
        return NextResponse.json(
          {
            valid: false,
            error: 'This access code has reached its usage limit',
          },
          { status: 400 }
        )
      }
    }

    console.log('✅ Access code is valid')

    // Return validation success with code details
    return NextResponse.json({
      valid: true,
      code: {
        id: accessCode.id,
        code: accessCode.code,
        name: accessCode.name,
        email: accessCode.email,
        expires_at: accessCode.expires_at,
        max_uses: accessCode.max_uses,
        used_count: accessCode.used_count,
      },
    })
  } catch (error) {
    console.error('❌ Error verifying access code:', error)
    return NextResponse.json({ error: 'Failed to verify access code' }, { status: 500 })
  }
}
