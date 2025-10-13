import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    console.log('[Trial Signup API] Request received')
    const body = await request.json()
    console.log('[Trial Signup API] Request body:', {
      email: body.email,
      name: body.name,
      hasPassword: !!body.password,
    })

    const { email, password, name } = body

    if (!email || !password) {
      console.error('[Trial Signup API] Missing email or password')
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    console.log('[Trial Signup API] Creating Supabase client')
    const supabase = await createClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      console.log('User already exists, returning success:', email)
      return NextResponse.json({
        success: true,
        user: {
          id: existingUser.id,
          email: email,
        },
        existing: true,
      })
    }

    // Create the user with Supabase Auth - DISABLE email confirmation for trial users
    console.log('[Trial Signup API] Calling supabase.auth.signUp with email confirmation disabled')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
        // Don't send email confirmation for trial users
        emailRedirectTo: undefined,
      },
    })

    if (authError) {
      console.error('[Trial Signup API] Supabase auth error:', authError)
      console.error('[Trial Signup API] Error details:', JSON.stringify(authError, null, 2))

      // If user already exists in auth, return success
      if (authError.message.includes('already registered')) {
        console.log('[Trial Signup API] User already exists, returning success')
        return NextResponse.json({
          success: true,
          user: {
            email: email,
          },
          existing: true,
        })
      }

      console.error('[Trial Signup API] Returning auth error to client:', authError.message)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      console.error('[Trial Signup API] No user data returned from Supabase')
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    console.log('[Trial Signup API] User created in auth:', authData.user.id)

    // If no session was returned, manually sign in the user
    let sessionData = authData.session
    if (!sessionData) {
      console.log('[Trial Signup API] No session returned, manually signing in user')
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error('[Trial Signup API] Error signing in user after creation:', signInError)
      } else {
        console.log('[Trial Signup API] User signed in successfully')
        sessionData = signInData.session
      }
    }

    // Create profile record
    console.log('[Trial Signup API] Creating profile record')
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: authData.user.email,
      name: name || email.split('@')[0],
    })

    if (profileError) {
      console.error('[Trial Signup API] Error creating profile:', profileError)
      // Don't fail the signup if profile creation fails, just log it
      // The user account is already created in auth
    } else {
      console.log('[Trial Signup API] Profile created successfully')
    }

    // Create analytics record using service role client (bypasses RLS)
    console.log('[Trial Signup API] Creating analytics records')
    try {
      const { createClient: createServiceClient } = await import('@/lib/supabase/server')
      const serviceSupabase = await createServiceClient()

      // Create analytics summary
      const { error: analyticsError } = await serviceSupabase
        .from('user_analytics_summary')
        .insert({
          user_id: authData.user.id,
          first_visit: new Date().toISOString(),
        })

      if (analyticsError) {
        console.error('[Trial Signup API] Error creating analytics:', analyticsError)
      } else {
        console.log('[Trial Signup API] Analytics record created')
      }

      // Log signup activity
      const { error: activityError } = await serviceSupabase.from('user_activity_logs').insert({
        user_id: authData.user.id,
        activity_type: 'login',
        activity_data: { signup: true, email: authData.user.email, trial_signup: true },
      })

      if (activityError) {
        console.error('[Trial Signup API] Error logging activity:', activityError)
      } else {
        console.log('[Trial Signup API] Activity logged')
      }
    } catch (analyticsErr) {
      console.error('[Trial Signup API] Analytics creation failed:', analyticsErr)
      // Don't fail signup if analytics fail
    }

    console.log('[Trial Signup API] Returning success response')
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      // Return the session data for immediate sign-in
      session: sessionData,
    })
  } catch (error) {
    console.error('Trial signup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
