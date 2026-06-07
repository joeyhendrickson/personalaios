import { google } from 'googleapis'

/**
 * Google Calendar integration for Lifestacks Calendar.
 * Auth: Google OAuth 2.0. API: Google Calendar v3.
 * Reuses the shared GOOGLE_* OAuth client when dedicated calendar creds are absent.
 */

export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.events',
]

function getClientId(): string | undefined {
  return process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
}

function getClientSecret(): string | undefined {
  return process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(getClientId() && getClientSecret())
}

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/$/, '')
}

export function getGoogleCalendarRedirectUri(requestOrigin?: string): string {
  if (process.env.GOOGLE_CALENDAR_REDIRECT_URI) {
    return process.env.GOOGLE_CALENDAR_REDIRECT_URI
  }
  const siteUrl = normalizeSiteUrl(
    requestOrigin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  )
  return `${siteUrl}/api/calendar/callback`
}

export function createGoogleCalendarOAuthClient(requestOrigin?: string) {
  return new google.auth.OAuth2(
    getClientId(),
    getClientSecret(),
    getGoogleCalendarRedirectUri(requestOrigin)
  )
}

export function getGoogleCalendarAuthUrl(state: string, requestOrigin?: string): string {
  return createGoogleCalendarOAuthClient(requestOrigin).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  })
}

export interface GoogleCalendarTokens {
  access_token: string
  refresh_token: string | null
  expiry_date: number | null
  scope: string | null
}

export async function exchangeGoogleCalendarCode(
  code: string,
  requestOrigin?: string
): Promise<GoogleCalendarTokens> {
  const client = createGoogleCalendarOAuthClient(requestOrigin)
  const { tokens } = await client.getToken(code)
  return {
    access_token: tokens.access_token || '',
    refresh_token: tokens.refresh_token || null,
    expiry_date: tokens.expiry_date ?? null,
    scope: tokens.scope ?? null,
  }
}

export async function refreshGoogleCalendarToken(
  refreshToken: string
): Promise<GoogleCalendarTokens> {
  const client = createGoogleCalendarOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()
  return {
    access_token: credentials.access_token || '',
    refresh_token: credentials.refresh_token || refreshToken,
    expiry_date: credentials.expiry_date ?? null,
    scope: credentials.scope ?? null,
  }
}

export async function getCalendarConnectedEmail(accessToken: string): Promise<string | null> {
  try {
    const client = createGoogleCalendarOAuthClient()
    client.setCredentials({ access_token: accessToken })
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data } = await oauth2.userinfo.get()
    return data.email ?? null
  } catch {
    return null
  }
}

export type CalendarRecurrence = 'none' | 'daily' | 'weekly'

export interface CreateCalendarEventInput {
  summary: string
  description?: string
  // Local wall-clock ISO strings (no trailing Z), interpreted in `timeZone`.
  startDateTime: string
  endDateTime: string
  timeZone: string
  recurrence?: CalendarRecurrence
}

function recurrenceRule(recurrence: CalendarRecurrence | undefined): string[] | undefined {
  if (recurrence === 'daily') return ['RRULE:FREQ=DAILY']
  if (recurrence === 'weekly') return ['RRULE:FREQ=WEEKLY']
  return undefined
}

export async function createCalendarEvent(
  accessToken: string,
  input: CreateCalendarEventInput
): Promise<{ id: string | null; htmlLink: string | null }> {
  const client = createGoogleCalendarOAuthClient()
  client.setCredentials({ access_token: accessToken })
  const calendar = google.calendar({ version: 'v3', auth: client })

  const { data } = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startDateTime, timeZone: input.timeZone },
      end: { dateTime: input.endDateTime, timeZone: input.timeZone },
      recurrence: recurrenceRule(input.recurrence),
      source: { title: 'Lifestacks', url: process.env.NEXT_PUBLIC_SITE_URL || undefined },
    },
  })

  return { id: data.id ?? null, htmlLink: data.htmlLink ?? null }
}
