import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { code, email, password, name } = await request.json()

    if (!code || !email || !password || !name) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
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

    // Verify the access code first
    const { data: accessCode, error: fetchError } = await serviceSupabase
      .from('access_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (fetchError || !accessCode) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
    }

    // Validate the code
    if (!accessCode.is_active) {
      return NextResponse.json({ error: 'This access code has been deactivated' }, { status: 400 })
    }

    if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This access code has expired' }, { status: 400 })
    }

    if (accessCode.email && accessCode.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This access code is assigned to a different email address' },
        { status: 400 }
      )
    }

    // Check usage limits
    if (accessCode.max_uses !== null) {
      const usedCount = accessCode.used_count || 0
      if (usedCount >= accessCode.max_uses) {
        return NextResponse.json(
          { error: 'This access code has reached its usage limit' },
          { status: 400 }
        )
      }
    }

    console.log('✅ Access code validated, creating user...')

    // Create the user account using service role
    const { data: authData, error: signupError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        account_type: 'premium',
      },
    })

    if (signupError) {
      console.error('❌ Error creating user:', signupError)
      return NextResponse.json({ error: signupError.message }, { status: 400 })
    }

    console.log('✅ User created:', authData.user.id)

    // Update the user's profile to mark as premium
    const { error: profileError } = await serviceSupabase
      .from('profiles')
      .update({
        name,
        access_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('❌ Error updating profile:', profileError)
    }

    // Increment the used_count for the access code
    const newUsedCount = (accessCode.used_count || 0) + 1
    const { error: updateError } = await serviceSupabase
      .from('access_codes')
      .update({
        used_count: newUsedCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accessCode.id)

    if (updateError) {
      console.error('❌ Error updating access code usage:', updateError)
    }

    console.log('✅ Access code redeemed successfully')

    return NextResponse.json({
      success: true,
      message: 'Premium account created successfully',
      userId: authData.user.id,
    })
  } catch (error) {
    console.error('❌ Error redeeming access code:', error)
    return NextResponse.json({ error: 'Failed to redeem access code' }, { status: 500 })
  }
}
