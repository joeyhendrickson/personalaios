import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleCalendarOAuthDebug, isGoogleCalendarConfigured } from '@/lib/google-calendar'
import { getCalendarConnection } from '@/lib/calendar/connection'
import { getRequestOrigin } from '@/lib/request-origin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const origin = getRequestOrigin(request)
    const configured = isGoogleCalendarConfigured()
    const connection = await getCalendarConnection(supabase, user.id)

    return NextResponse.json({
      configured,
      connected: Boolean(connection && connection.status === 'connected'),
      status: connection?.status ?? null,
      connected_email: connection?.connected_email ?? null,
      oauth: configured ? getGoogleCalendarOAuthDebug(origin) : null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load calendar status' },
      { status: 500 }
    )
  }
}
