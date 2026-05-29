import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'
import { exchangeGoogleHealthCode, getConnectedEmail } from '@/lib/google-health'
import { HEALTH_PROVIDER } from '@/lib/fitness/provider-connection'

function fitnessUrl(params: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || ''
  return `${base}/modules/fitness-tracker?${params}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(fitnessUrl('health=error&reason=access_denied'))
  }
  if (!code || !state) {
    return NextResponse.redirect(fitnessUrl('health=error&reason=invalid_request'))
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user || user.id !== state) {
      return NextResponse.redirect(fitnessUrl('health=error&reason=unauthorized'))
    }

    const tokens = await exchangeGoogleHealthCode(code)
    if (!tokens.access_token || !tokens.refresh_token) {
      // No refresh token usually means the user previously granted consent without
      // offline access; prompt=consent in the auth URL should prevent this.
      return NextResponse.redirect(fitnessUrl('health=error&reason=no_refresh_token'))
    }

    const tokenExpiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600_000).toISOString()
    const email = await getConnectedEmail(tokens.access_token)

    const { error: dbError } = await supabase.from('fitness_provider_connections').upsert(
      {
        user_id: user.id,
        provider: HEALTH_PROVIDER,
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token),
        token_expires_at: tokenExpiresAt,
        scope: tokens.scope ?? null,
        connected_email: email,
        status: 'connected',
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

    if (dbError) {
      console.error('Error storing Google Health connection:', dbError)
      return NextResponse.redirect(fitnessUrl('health=error&reason=storage_failed'))
    }

    return NextResponse.redirect(fitnessUrl('health=connected&tab=stats'))
  } catch (err) {
    console.error('Error in Google Health OAuth callback:', err)
    return NextResponse.redirect(fitnessUrl('health=error&reason=token_exchange'))
  }
}
