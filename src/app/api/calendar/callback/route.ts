import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'
import { exchangeGoogleCalendarCode, getCalendarConnectedEmail } from '@/lib/google-calendar'
import { CALENDAR_PROVIDER } from '@/lib/calendar/connection'

function calendarUrl(params: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || ''
  return `${base}/modules/calendar-ai?${params}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(calendarUrl('calendar=error&reason=access_denied'))
  }
  if (!code || !state) {
    return NextResponse.redirect(calendarUrl('calendar=error&reason=invalid_request'))
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user || user.id !== state) {
      return NextResponse.redirect(calendarUrl('calendar=error&reason=unauthorized'))
    }

    const tokens = await exchangeGoogleCalendarCode(code)
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(calendarUrl('calendar=error&reason=no_refresh_token'))
    }

    const tokenExpiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600_000).toISOString()
    const email = await getCalendarConnectedEmail(tokens.access_token)

    const { error: dbError } = await supabase.from('calendar_connections').upsert(
      {
        user_id: user.id,
        provider: CALENDAR_PROVIDER,
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token),
        token_expires_at: tokenExpiresAt,
        scope: tokens.scope ?? null,
        connected_email: email,
        status: 'connected',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

    if (dbError) {
      console.error('Error storing Google Calendar connection:', dbError)
      return NextResponse.redirect(calendarUrl('calendar=error&reason=storage_failed'))
    }

    return NextResponse.redirect(calendarUrl('calendar=connected'))
  } catch (err) {
    console.error('Error in Google Calendar OAuth callback:', err)
    return NextResponse.redirect(calendarUrl('calendar=error&reason=token_exchange'))
  }
}
