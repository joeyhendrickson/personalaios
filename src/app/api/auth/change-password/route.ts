import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    console.log('[Change Password API] Request received')
    const body = await request.json()
    console.log('[Change Password API] Request body:', {
      currentPassword: !!body.currentPassword,
      newPassword: !!body.newPassword,
    })

    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      console.error('[Change Password API] Missing current or new password')
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      console.error('[Change Password API] New password too short')
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    console.log('[Change Password API] Creating Supabase client')
    const supabase = await createClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[Change Password API] Error getting current user:', userError)
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    console.log('[Change Password API] Current user:', user.id)

    // Verify the current password by attempting to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (signInError || !signInData.user) {
      console.error('[Change Password API] Current password verification failed:', signInError)
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    console.log('[Change Password API] Current password verified successfully')

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error('[Change Password API] Error updating password:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    console.log('[Change Password API] Password updated successfully')

    // Log the password change activity
    try {
      const { createClient: createServiceClient } = await import('@/lib/supabase/server')
      const serviceSupabase = await createServiceClient()

      const { error: activityError } = await serviceSupabase.from('user_activity_logs').insert({
        user_id: user.id,
        activity_type: 'password_change',
        activity_data: {
          timestamp: new Date().toISOString(),
          email: user.email,
        },
      })

      if (activityError) {
        console.error('[Change Password API] Error logging activity:', activityError)
      } else {
        console.log('[Change Password API] Activity logged')
      }
    } catch (activityErr) {
      console.error('[Change Password API] Activity logging failed:', activityErr)
      // Don't fail password change if activity logging fails
    }

    console.log('[Change Password API] Returning success response')
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
