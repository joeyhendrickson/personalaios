import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getGoogleCalendarAuthUrl,
  getGoogleCalendarRedirectUri,
  isGoogleCalendarConfigured,
} from '@/lib/google-calendar'
import { getRequestOrigin } from '@/lib/request-origin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json(
        {
          error:
            'Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (or GOOGLE_CALENDAR_* equivalents).',
        },
        { status: 500 }
      )
    }

    const origin = getRequestOrigin(request)
    return NextResponse.json({
      auth_url: getGoogleCalendarAuthUrl(user.id, origin),
      redirect_uri: getGoogleCalendarRedirectUri(origin),
    })
  } catch (error) {
    console.error('Error generating Google Calendar auth URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
