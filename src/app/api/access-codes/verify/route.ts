import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find the access code
    const { data: accessCode, error: codeError } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (codeError || !accessCode) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
    }

    // Check if code is already used
    if (accessCode.used_at) {
      return NextResponse.json({ error: 'Access code has already been used' }, { status: 400 })
    }

    // Check if code is expired
    if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Access code has expired' }, { status: 400 })
    }

    // Return success with code details
    return NextResponse.json({
      success: true,
      code: accessCode.code,
      name: accessCode.name,
      email: accessCode.email,
      message: 'Access code is valid'
    })

  } catch (error) {
    console.error('Access code verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify access code' },
      { status: 500 }
    )
  }
}

// Mark code as used when user completes signup
export async function PUT(request: Request) {
  try {
    const { code, user_id } = await request.json()

    if (!code || !user_id) {
      return NextResponse.json({ error: 'Code and user ID are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Mark the code as used
    const { data, error } = await supabase
      .from('access_codes')
      .update({
        used_at: new Date().toISOString(),
        used_by: user_id
      })
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .is('used_at', null)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to mark code as used' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Access code marked as used'
    })

  } catch (error) {
    console.error('Access code update error:', error)
    return NextResponse.json(
      { error: 'Failed to update access code' },
      { status: 500 }
    )
  }
}
