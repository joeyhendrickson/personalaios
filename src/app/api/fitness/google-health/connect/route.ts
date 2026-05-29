import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleHealthAuthUrl, isGoogleHealthConfigured } from '@/lib/google-health'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isGoogleHealthConfigured()) {
      return NextResponse.json(
        {
          error:
            'Google Health is not configured. Set GOOGLE_HEALTH_CLIENT_ID and GOOGLE_HEALTH_CLIENT_SECRET.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ auth_url: getGoogleHealthAuthUrl(user.id) })
  } catch (error) {
    console.error('Error generating Google Health auth URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
