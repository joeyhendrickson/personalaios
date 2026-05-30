import { google } from 'googleapis'
import axios from 'axios'

/**
 * Google Health API client (successor to the Fitbit Web API).
 * Auth: Google OAuth 2.0. Data: https://health.googleapis.com/v4.
 * Docs: https://developers.google.com/health/endpoints
 */

const HEALTH_BASE = 'https://health.googleapis.com/v4'

export const GOOGLE_HEALTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
]

// Prefer dedicated GOOGLE_HEALTH_* creds, but fall back to the shared GOOGLE_* OAuth
// client so a single Google Cloud OAuth client can serve both Drive and Health.
function getClientId(): string | undefined {
  return process.env.GOOGLE_HEALTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
}

function getClientSecret(): string | undefined {
  return process.env.GOOGLE_HEALTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
}

export function isGoogleHealthConfigured(): boolean {
  return Boolean(getClientId() && getClientSecret())
}

export function getGoogleHealthRedirectUri(): string {
  return (
    process.env.GOOGLE_HEALTH_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/fitness/google-health/callback`
  )
}

export function createGoogleHealthOAuthClient() {
  return new google.auth.OAuth2(getClientId(), getClientSecret(), getGoogleHealthRedirectUri())
}

export function getGoogleHealthAuthUrl(state: string): string {
  return createGoogleHealthOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: GOOGLE_HEALTH_SCOPES,
    state,
  })
}

export interface GoogleHealthTokens {
  access_token: string
  refresh_token: string | null
  expiry_date: number | null
  scope: string | null
}

export async function exchangeGoogleHealthCode(code: string): Promise<GoogleHealthTokens> {
  const client = createGoogleHealthOAuthClient()
  const { tokens } = await client.getToken(code)
  return {
    access_token: tokens.access_token || '',
    refresh_token: tokens.refresh_token || null,
    expiry_date: tokens.expiry_date ?? null,
    scope: tokens.scope ?? null,
  }
}

export async function refreshGoogleHealthToken(refreshToken: string): Promise<GoogleHealthTokens> {
  const client = createGoogleHealthOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()
  return {
    access_token: credentials.access_token || '',
    // Google usually omits a new refresh token on refresh — keep the existing one.
    refresh_token: credentials.refresh_token || refreshToken,
    expiry_date: credentials.expiry_date ?? null,
    scope: credentials.scope ?? null,
  }
}

export async function getConnectedEmail(accessToken: string): Promise<string | null> {
  try {
    const client = createGoogleHealthOAuthClient()
    client.setCredentials({ access_token: accessToken })
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data } = await oauth2.userinfo.get()
    return data.email ?? null
  } catch {
    return null
  }
}

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
}

function civilDayRange(date: Date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return {
    range: {
      start: { date: { year: y, month: m, day: d }, time: { hours: 0, minutes: 0, seconds: 0 } },
      end: { date: { year: y, month: m, day: d }, time: { hours: 23, minutes: 59, seconds: 59 } },
    },
    windowSizeDays: 1,
  }
}

/** Daily step total via dailyRollUp. */
export async function fetchDailySteps(accessToken: string, date: Date): Promise<number | null> {
  try {
    const { data } = await axios.post(
      `${HEALTH_BASE}/users/me/dataTypes/steps/dataPoints:dailyRollUp`,
      civilDayRange(date),
      { headers: authHeaders(accessToken) }
    )
    const points: Array<{ steps?: { countSum?: string } }> = data?.rollupDataPoints ?? []
    if (!points.length) return null
    const sum = points.reduce((acc, p) => acc + Number(p?.steps?.countSum ?? 0), 0)
    return Number.isFinite(sum) ? sum : null
  } catch {
    return null
  }
}

function ymd(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Minutes asleep for the night, reconciled to wearable data. */
export async function fetchSleepMinutes(accessToken: string, date: Date): Promise<number | null> {
  try {
    const filter = encodeURIComponent(`sleep.interval.civil_end_time >= "${ymd(date)}"`)
    const url =
      `${HEALTH_BASE}/users/me/dataTypes/sleep/dataPoints:reconcile` +
      `?dataSourceFamily=users/me/dataSourceFamilies/google-wearables&filter=${filter}`
    const { data } = await axios.get(url, { headers: authHeaders(accessToken) })
    const points: Array<{
      sleep?: { metadata?: { main?: boolean }; summary?: { minutesAsleep?: string } }
    }> = data?.dataPoints ?? []
    if (!points.length) return null

    const mains = points.filter((p) => p?.sleep?.metadata?.main)
    const chosen = mains.length ? mains : points
    const minutes = chosen.reduce(
      (acc, p) => acc + Number(p?.sleep?.summary?.minutesAsleep ?? 0),
      0
    )
    return minutes > 0 ? minutes : null
  } catch {
    return null
  }
}

/**
 * Daily resting heart rate. Daily metric shapes vary, so we read the most recent
 * data point and defensively extract a bpm value from common field names.
 */
export async function fetchRestingHeartRate(
  accessToken: string,
  date: Date
): Promise<number | null> {
  try {
    const filter = encodeURIComponent(
      `daily_resting_heart_rate.civil_start_time >= "${ymd(date)}T00:00:00"`
    )
    const url = `${HEALTH_BASE}/users/me/dataTypes/daily-resting-heart-rate/dataPoints?filter=${filter}`
    const { data } = await axios.get(url, { headers: authHeaders(accessToken) })
    const points: Array<Record<string, unknown>> = data?.dataPoints ?? []
    if (!points.length) return null

    const last = points[points.length - 1]
    const metric = (last?.dailyRestingHeartRate ?? last?.restingHeartRate) as
      | Record<string, unknown>
      | undefined
    const candidate =
      (metric?.beatsPerMinute as number | undefined) ??
      (metric?.bpm as number | undefined) ??
      (metric?.value as number | undefined)
    const bpm = typeof candidate === 'number' ? candidate : Number(candidate)
    return Number.isFinite(bpm) && bpm > 0 ? Math.round(bpm) : null
  } catch {
    return null
  }
}
