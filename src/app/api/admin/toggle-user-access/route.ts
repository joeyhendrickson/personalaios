import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  console.log('🔧 TOGGLE USER ACCESS API CALLED')

  try {
    const { userId, enabled } = await request.json()

    console.log('📥 Request data:', { userId, enabled })

    if (!userId || typeof enabled !== 'boolean') {
      console.log('❌ Invalid request data')
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check admin authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', session.user.email)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('✅ Admin verified:', adminUser.email)

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

    // First check if profile exists
    console.log('📝 Checking if profile exists for user:', userId)
    const { data: existingProfile, error: checkError } = await serviceSupabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is ok
      console.error('❌ Error checking profile:', checkError)
      return NextResponse.json(
        {
          error: 'Database error',
          details: checkError.message,
        },
        { status: 500 }
      )
    }

    if (existingProfile) {
      // Profile exists, update it
      console.log('📝 Updating existing profile')
      const { error: updateError } = await serviceSupabase
        .from('profiles')
        .update({
          access_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()

      if (updateError) {
        console.error('❌ Error updating user access:', updateError)
        console.error('Error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        })
        return NextResponse.json(
          {
            error: 'Failed to update user access',
            details: updateError.message,
          },
          { status: 500 }
        )
      }

      console.log('✅ Updated user access:', userId, 'enabled:', enabled)
    } else {
      // User might not have a profile yet, fetch user data from auth and create profile
      console.log('⚠️ No profile found, fetching user from auth...')

      const { data: authUser, error: authError } =
        await serviceSupabase.auth.admin.getUserById(userId)

      if (authError || !authUser) {
        console.error('❌ Error fetching user from auth:', authError)
        return NextResponse.json(
          {
            error: 'User not found',
            details: authError?.message,
          },
          { status: 404 }
        )
      }

      console.log('📋 Auth user data:', authUser.user.email, authUser.user.user_metadata)

      const { error: createError } = await serviceSupabase
        .from('profiles')
        .insert({
          id: userId,
          email: authUser.user.email,
          name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User',
          access_enabled: enabled,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (createError) {
        console.error('❌ Error creating user profile:', createError)
        console.error('Create error details:', {
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code,
        })
        return NextResponse.json(
          {
            error: 'Failed to create user profile',
            details: createError.message,
          },
          { status: 500 }
        )
      }

      console.log('✅ Created profile for user:', userId)
    }

    return NextResponse.json({
      success: true,
      message: `User access ${enabled ? 'enabled' : 'disabled'} successfully`,
      userId,
      enabled,
    })
  } catch (error) {
    console.error('❌ Toggle user access error:', error)
    return NextResponse.json(
      {
        error: 'Failed to toggle user access',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
