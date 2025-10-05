import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import { encrypt } from '@/lib/crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/business-hacks/project-plan-builder?error=access_denied`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/business-hacks/project-plan-builder?error=invalid_request`
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user || user.id !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/business-hacks/project-plan-builder?error=unauthorized`
      )
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/project-plan-builder/auth/google/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/business-hacks/project-plan-builder?error=server_config`
      )
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    try {
      const { tokens } = await oauth2Client.getToken(code)
      oauth2Client.setCredentials(tokens)

      // Get user info to verify connection
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const { data: userInfo } = await oauth2.userinfo.get()

      // Encrypt tokens
      const encryptedAccessToken = encrypt(tokens.access_token || '')
      const encryptedRefreshToken = encrypt(tokens.refresh_token || '')

      // Store credentials in database
      const { error: dbError } = await supabase.from('project_plan_builder_credentials').upsert(
        {
          user_id: user.id,
          google_access_token: encryptedAccessToken,
          google_refresh_token: encryptedRefreshToken,
          google_email: userInfo.email,
          google_name: userInfo.name,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

      if (dbError) {
        console.error('Error storing Google credentials:', dbError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL}/business-hacks/project-plan-builder?error=storage_failed`
        )
      }

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/business-hacks/project-plan-builder?success=google_connected`
      )
    } catch (tokenError) {
      console.error('Error exchanging code for tokens:', tokenError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/business-hacks/project-plan-builder?error=token_exchange`
      )
    }
  } catch (error) {
    console.error('Error in Google OAuth callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/business-hacks/project-plan-builder?error=server_error`
    )
  }
}
