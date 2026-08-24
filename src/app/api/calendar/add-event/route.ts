import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidCalendarAccessToken } from '@/lib/calendar/connection'
import {
  createCalendarEvent,
  GoogleCalendarRequestError,
  type CalendarRecurrence,
} from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const summary = typeof body.summary === 'string' ? body.summary.trim() : ''
    const description = typeof body.description === 'string' ? body.description : ''
    const startDateTime = typeof body.startDateTime === 'string' ? body.startDateTime : ''
    const endDateTime = typeof body.endDateTime === 'string' ? body.endDateTime : ''
    const timeZone =
      typeof body.timeZone === 'string' && body.timeZone ? body.timeZone : 'America/New_York'
    const recurrence: CalendarRecurrence = ['daily', 'weekly', 'none'].includes(body.recurrence)
      ? body.recurrence
      : 'none'

    if (!summary || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: 'summary, startDateTime and endDateTime are required' },
        { status: 400 }
      )
    }

    const eventInput = {
      summary,
      description,
      startDateTime,
      endDateTime,
      timeZone,
      recurrence,
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

    let event
    try {
      event = await createCalendarEvent(accessToken, eventInput)
    } catch (error) {
      const status = error instanceof GoogleCalendarRequestError ? error.status : 0
      const message = error instanceof Error ? error.message : 'Failed to add calendar event'
      const needsReauth =
        status === 401 ||
        status === 403 ||
        /insufficient|invalid credential|auth|reconnect/i.test(message)

      if (status === 401) {
        try {
          const refreshed = await getValidCalendarAccessToken(supabase, user.id, {
            forceRefresh: true,
          })
          event = await createCalendarEvent(refreshed.accessToken, eventInput)
        } catch (retryError) {
          const retryMessage =
            retryError instanceof Error ? retryError.message : 'Failed to add calendar event'
          return NextResponse.json({ error: retryMessage, needsReauth: true }, { status: 400 })
        }
      } else if (needsReauth) {
        return NextResponse.json(
          {
            error:
              'Google Calendar needs to be reconnected with calendar access. Disconnect and connect again, then retry.',
            needsReauth: true,
          },
          { status: 400 }
        )
      } else {
        throw error
      }
    }

    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        activity_type: 'calendar_event_added',
        description: `Added "${summary}" to Google Calendar`,
        metadata: { recurrence },
      })
    } catch {
      // Event already exists on Google Calendar — do not fail the request.
    }

    return NextResponse.json({ ok: true, event })
  } catch (error) {
    console.error('Add calendar event failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add calendar event' },
      { status: 500 }
    )
  }
}
