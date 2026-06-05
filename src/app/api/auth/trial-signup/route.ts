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

    // Create the trial user as ALREADY CONFIRMED via the service-role admin API so
    // they get an immediate session (no "Confirm your signup" email, no login wall).
    const displayName = name || email.split('@')[0]
    let createdUserId: string | null = null
    let adminPathFailed = false

    try {
      const { createAdminClient } = await import('@/lib/supabaseAdmin')
      const admin = createAdminClient()
      console.log('[Trial Signup API] Creating pre-confirmed user via admin API')
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: displayName },
      })

      if (createErr) {
        // Already-registered is fine — we'll just sign them in below.
        if (/registered|already exists|exists/i.test(createErr.message)) {
          console.log('[Trial Signup API] User already exists in auth, will sign in')
        } else {
          throw createErr
        }
      } else {
        createdUserId = created.user?.id ?? null
        console.log('[Trial Signup API] Pre-confirmed user created:', createdUserId)
      }
    } catch (adminErr) {
      // Service role key missing/misconfigured — fall back to normal signUp.
      console.error('[Trial Signup API] Admin createUser failed, falling back to signUp:', adminErr)
      adminPathFailed = true
    }

    if (adminPathFailed) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: displayName } },
      })
      if (authError && !/already registered/i.test(authError.message)) {
        console.error('[Trial Signup API] Fallback signUp error:', authError.message)
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
      createdUserId = authData?.user?.id ?? createdUserId
    }

    // Establish a session on the cookie-based client so the browser is logged in
    // and the create-account page can route straight into Dream Catcher.
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      console.error('[Trial Signup API] Sign-in after creation failed:', signInError.message)
    }

    const sessionData = signInData?.session ?? null
    const finalUserId = createdUserId || signInData?.user?.id || null
    const finalEmail = signInData?.user?.email || email

    if (!finalUserId) {
      console.error('[Trial Signup API] No user id available after creation')
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    console.log('[Trial Signup API] User ready:', finalUserId)

    // Create profile record (idempotent)
    console.log('[Trial Signup API] Creating profile record')
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: finalUserId,
        email: finalEmail,
        name: displayName,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      console.error('[Trial Signup API] Error creating profile:', profileError)
      // Don't fail the signup if profile creation fails, just log it.
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
          user_id: finalUserId,
          first_visit: new Date().toISOString(),
        })

      if (analyticsError) {
        console.error('[Trial Signup API] Error creating analytics:', analyticsError)
      } else {
        console.log('[Trial Signup API] Analytics record created')
      }

      // Log signup activity
      const { error: activityError } = await serviceSupabase.from('user_activity_logs').insert({
        user_id: finalUserId,
        activity_type: 'login',
        activity_data: { signup: true, email: finalEmail, trial_signup: true },
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
        id: finalUserId,
        email: finalEmail,
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
