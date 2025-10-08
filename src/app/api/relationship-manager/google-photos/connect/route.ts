import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      // Redirect to login instead of JSON error for OAuth flow
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)
    }

    // Google Photos API OAuth configuration
    const clientId = process.env.GOOGLE_PHOTOS_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/relationship-manager/google-photos/callback`

    if (!clientId) {
      // For development, provide instructions instead of failing
      return NextResponse.json(
        {
          error: 'Google Photos integration not configured',
          message:
            'Google Photos integration requires OAuth client credentials. This is a one-time setup for the application.',
          instructions: {
            step1: 'Go to Google Cloud Console (https://console.cloud.google.com/)',
            step2: 'Create a new project or select existing one',
            step3: 'Enable Google Photos Library API',
            step4: 'Create OAuth 2.0 credentials (Web application)',
            step5:
              'Add redirect URI: http://localhost:3000/api/relationship-manager/google-photos/callback',
            step6: 'Add GOOGLE_PHOTOS_CLIENT_ID and GOOGLE_PHOTOS_CLIENT_SECRET to .env.local',
          },
        },
        { status: 400 }
      )
    }

    const scope = 'https://www.googleapis.com/auth/photoslibrary.readonly'
    const state = user.id // Use user ID as state for security

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${state}`

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating Google Photos connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
