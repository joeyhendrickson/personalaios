import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidCalendarAccessToken } from '@/lib/calendar/connection'
import { createCalendarEvent, type CalendarRecurrence } from '@/lib/google-calendar'

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

    let accessToken: string
    try {
      const result = await getValidCalendarAccessToken(supabase, user.id)
      accessToken = result.accessToken
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Google Calendar not connected'
      const needsReauth = message.toLowerCase().includes('reconnect')
      return NextResponse.json({ error: message, needsReauth }, { status: 400 })
    }

    const event = await createCalendarEvent(accessToken, {
      summary,
      description,
      startDateTime,
      endDateTime,
      timeZone,
      recurrence,
    })

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'calendar_event_added',
      description: `Added "${summary}" to Google Calendar`,
      metadata: { recurrence },
    })

    return NextResponse.json({ ok: true, event })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add calendar event' },
      { status: 500 }
    )
  }
}
