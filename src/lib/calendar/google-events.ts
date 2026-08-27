export type GoogleCalendarEvent = {
  id: string
  title: string
  description: string | null
  location: string | null
  htmlLink: string | null
  allDay: boolean
  start: string
  end: string
  status: string | null
}

type GoogleDate = {
  date?: string
  dateTime?: string
  timeZone?: string
}

export type RawGoogleCalendarEvent = {
  id?: string
  status?: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start?: GoogleDate
  end?: GoogleDate
}

function asIso(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/** All-day `end.date` is exclusive in Google Calendar. */
function allDayEndIso(endDate: string): string | null {
  const date = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function parseGoogleCalendarEvent(raw: RawGoogleCalendarEvent): GoogleCalendarEvent | null {
  if (!raw?.id || raw.status === 'cancelled') return null

  const startDateTime = raw.start?.dateTime
  const endDateTime = raw.end?.dateTime
  if (startDateTime && endDateTime) {
    const start = asIso(startDateTime)
    const end = asIso(endDateTime)
    if (!start || !end) return null
    return {
      id: raw.id,
      title: (raw.summary || '(No title)').trim(),
      description: raw.description?.trim() || null,
      location: raw.location?.trim() || null,
      htmlLink: raw.htmlLink || null,
      allDay: false,
      start,
      end,
      status: raw.status ?? null,
    }
  }

  const startDate = raw.start?.date
  const endDate = raw.end?.date
  if (startDate && endDate) {
    const start = asIso(`${startDate}T00:00:00`)
    const end = allDayEndIso(endDate)
    if (!start || !end) return null
    return {
      id: raw.id,
      title: (raw.summary || '(No title)').trim(),
      description: raw.description?.trim() || null,
      location: raw.location?.trim() || null,
      htmlLink: raw.htmlLink || null,
      allDay: true,
      start,
      end,
      status: raw.status ?? null,
    }
  }

  return null
}

export function startOfLocalDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

/** Sunday-start local week covering `anchor`. `end` is exclusive. */
export function localWeekRange(anchor: Date): { start: Date; end: Date } {
  const start = startOfLocalDay(anchor)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

export function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export type DayAgenda = {
  dateKey: string
  date: string
  label: string
  isToday: boolean
  events: GoogleCalendarEvent[]
}

export function groupEventsByLocalDay(
  events: GoogleCalendarEvent[],
  weekStart: Date,
  now = new Date()
): DayAgenda[] {
  const days: DayAgenda[] = []
  const todayKey = dateKey(now)
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
  const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    const key = dateKey(day)
    days.push({
      dateKey: key,
      date: day.toISOString(),
      label: `${weekday.format(day)} ${monthDay.format(day)}`,
      isToday: key === todayKey,
      events: [],
    })
  }

  const byKey = new Map(days.map((d) => [d.dateKey, d]))
  for (const event of events) {
    const key = dateKey(new Date(event.start))
    const bucket = byKey.get(key)
    if (bucket) bucket.events.push(event)
  }

  for (const day of days) {
    day.events.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
      return a.start.localeCompare(b.start)
    })
  }

  return days
}

export function formatEventTime(event: GoogleCalendarEvent): string {
  if (event.allDay) return 'All day'
  const start = new Date(event.start)
  const end = new Date(event.end)
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${time.format(start)} – ${time.format(end)}`
}
