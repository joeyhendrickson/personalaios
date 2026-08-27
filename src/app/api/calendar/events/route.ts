import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidCalendarAccessToken } from '@/lib/calendar/connection'
import { GoogleCalendarRequestError, listCalendarEvents } from '@/lib/google-calendar'

function parseRange(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const from = parseRange(request.nextUrl.searchParams.get('from'))
    const to = parseRange(request.nextUrl.searchParams.get('to'))
    if (!from || !to || to.getTime() <= from.getTime()) {
      return NextResponse.json(
        { error: 'from and to must be valid ISO timestamps with to after from' },
        { status: 400 }
      )
    }

    const maxMs = 62 * 24 * 60 * 60 * 1000
    if (to.getTime() - from.getTime() > maxMs) {
      return NextResponse.json({ error: 'Date range cannot exceed 62 days' }, { status: 400 })
    }

    let accessToken: string
    try {
      const result = await getValidCalendarAccessToken(supabase, user.id)
      accessToken = result.accessToken
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Google Calendar not connected'
      const needsReauth = message.toLowerCase().includes('reconnect')
      return NextResponse.json({ error: message, needsReauth }, { status: 400 })
    }

    const range = { timeMin: from.toISOString(), timeMax: to.toISOString() }

    try {
      const events = await listCalendarEvents(accessToken, range)
      return NextResponse.json({ events })
    } catch (error) {
      const status = error instanceof GoogleCalendarRequestError ? error.status : 0
      if (status === 401) {
        try {
          const refreshed = await getValidCalendarAccessToken(supabase, user.id, {
            forceRefresh: true,
          })
          const events = await listCalendarEvents(refreshed.accessToken, range)
          return NextResponse.json({ events })
        } catch (retryError) {
          const retryMessage =
            retryError instanceof Error ? retryError.message : 'Failed to load calendar events'
          return NextResponse.json({ error: retryMessage, needsReauth: true }, { status: 400 })
        }
      }

      const message = error instanceof Error ? error.message : 'Failed to load calendar events'
      const needsReauth =
        status === 403 || /insufficient|invalid credential|auth|reconnect/i.test(message)
      return NextResponse.json({ error: message, needsReauth }, { status: needsReauth ? 400 : 500 })
    }
  } catch (error) {
    console.error('List calendar events failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load calendar events' },
      { status: 500 }
    )
  }
}
