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

function ymd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function nextYmd(date: Date): string {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return ymd(next)
}

/** Closed-open civil day interval (end is exclusive at midnight next day). */
function civilDayRange(date: Date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return {
    range: {
      start: { date: { year: y, month: m, day: d }, time: { hours: 0, minutes: 0, seconds: 0 } },
      end: {
        date: { year: next.getFullYear(), month: next.getMonth() + 1, day: next.getDate() },
        time: { hours: 0, minutes: 0, seconds: 0 },
      },
    },
    windowSizeDays: 1,
    dataSourceFamily: 'users/me/dataSourceFamilies/all-sources',
  }
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function stepsFromRollupPoint(point: Record<string, unknown>): number | null {
  const steps = (point.steps ?? point.value) as Record<string, unknown> | undefined
  if (!steps || typeof steps !== 'object') return null
  const sum = toNumber(steps.countSum ?? steps.count_sum)
  return sum === null ? null : Math.round(sum)
}

/** Daily step total via dailyRollUp. */
export async function fetchDailySteps(accessToken: string, date: Date): Promise<number | null> {
  try {
    const { data } = await axios.post(
      `${HEALTH_BASE}/users/me/dataTypes/steps/dataPoints:dailyRollUp`,
      civilDayRange(date),
      { headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' } }
    )
    const points: Array<Record<string, unknown>> = data?.rollupDataPoints ?? []
    if (points.length) {
      const total = points.reduce((acc, p) => acc + (stepsFromRollupPoint(p) ?? 0), 0)
      if (Number.isFinite(total)) return total
    }
  } catch {
    // fall through to list fallback
  }

  // Fallback: reconcile step intervals for the civil day.
  try {
    const day = ymd(date)
    const nextDay = nextYmd(date)
    const filter = encodeURIComponent(
      `steps.interval.start_time >= "${day}T00:00:00" AND steps.interval.start_time < "${nextDay}T00:00:00"`
    )
    const url =
      `${HEALTH_BASE}/users/me/dataTypes/steps/dataPoints:reconcile` +
      `?filter=${filter}&pageSize=500`
    const { data } = await axios.get(url, { headers: authHeaders(accessToken) })
    const points: Array<Record<string, unknown>> = data?.dataPoints ?? []
    if (!points.length) return null
    const total = points.reduce((acc, p) => {
      const steps = p.steps as Record<string, unknown> | undefined
      const count = toNumber(steps?.count ?? steps?.countSum ?? steps?.count_sum)
      return acc + (count ?? 0)
    }, 0)
    return Number.isFinite(total) ? Math.round(total) : null
  } catch {
    return null
  }
}

/** Minutes asleep for the night ending on this civil date. */
export async function fetchSleepMinutes(accessToken: string, date: Date): Promise<number | null> {
  try {
    const day = ymd(date)
    const nextDay = nextYmd(date)
    const filter = encodeURIComponent(
      `sleep.interval.civil_end_time >= "${day}" AND sleep.interval.civil_end_time < "${nextDay}"`
    )
    const url =
      `${HEALTH_BASE}/users/me/dataTypes/sleep/dataPoints:reconcile` +
      `?dataSourceFamily=users/me/dataSourceFamilies/google-wearables&filter=${filter}`
    const { data } = await axios.get(url, { headers: authHeaders(accessToken) })
    const points: Array<{
      sleep?: { metadata?: { main?: boolean }; summary?: { minutesAsleep?: string | number } }
    }> = data?.dataPoints ?? []
    if (!points.length) return null

    const mains = points.filter((p) => p?.sleep?.metadata?.main)
    const chosen = mains.length ? [mains[mains.length - 1]] : [points[points.length - 1]]
    const minutes = Number(chosen[0]?.sleep?.summary?.minutesAsleep ?? 0)
    return minutes > 0 ? minutes : null
  } catch {
    return null
  }
}

function restingHeartRateFromPoint(point: Record<string, unknown>): number | null {
  const metric = (point.daily_resting_heart_rate ??
    point.dailyRestingHeartRate ??
    point.restingHeartRate) as Record<string, unknown> | undefined
  if (!metric || typeof metric !== 'object') return null
  const bpm = toNumber(
    metric.beats_per_minute ?? metric.beatsPerMinute ?? metric.bpm ?? metric.value
  )
  return bpm !== null && bpm > 0 ? Math.round(bpm) : null
}

function restingHeartRateFromRollup(point: Record<string, unknown>): number | null {
  const range = (point.restingHeartRatePersonalRange ?? point.resting_heart_rate_personal_range) as
    | Record<string, unknown>
    | undefined
  if (!range || typeof range !== 'object') return null
  const min = toNumber(range.beatsPerMinuteMin ?? range.beats_per_minute_min)
  const max = toNumber(range.beatsPerMinuteMax ?? range.beats_per_minute_max)
  if (min === null && max === null) return null
  if (min !== null && max !== null) return Math.round((min + max) / 2)
  return Math.round(min ?? max ?? 0) || null
}

/**
 * Daily resting heart rate (bpm). Daily metrics use a .date filter, not civil_start_time.
 */
export async function fetchRestingHeartRate(
  accessToken: string,
  date: Date
): Promise<number | null> {
  const day = ymd(date)
  const nextDay = nextYmd(date)

  const listFilters = [
    `daily_resting_heart_rate.date >= "${day}" AND daily_resting_heart_rate.date < "${nextDay}"`,
    `daily_resting_heart_rate.date = "${day}"`,
  ]

  for (const expr of listFilters) {
    try {
      const filter = encodeURIComponent(expr)
      const url = `${HEALTH_BASE}/users/me/dataTypes/daily-resting-heart-rate/dataPoints?filter=${filter}&pageSize=10`
      const { data } = await axios.get(url, { headers: authHeaders(accessToken) })
      const points: Array<Record<string, unknown>> = data?.dataPoints ?? []
      for (let i = points.length - 1; i >= 0; i--) {
        const bpm = restingHeartRateFromPoint(points[i])
        if (bpm !== null) return bpm
      }
    } catch {
      // try next filter shape
    }
  }

  try {
    const filter = encodeURIComponent(
      `daily_resting_heart_rate.date >= "${day}" AND daily_resting_heart_rate.date < "${nextDay}"`
    )
    const url =
      `${HEALTH_BASE}/users/me/dataTypes/daily-resting-heart-rate/dataPoints:reconcile` +
      `?filter=${filter}&pageSize=10`
    const { data } = await axios.get(url, { headers: authHeaders(accessToken) })
    const points: Array<Record<string, unknown>> = data?.dataPoints ?? []
    for (let i = points.length - 1; i >= 0; i--) {
      const bpm = restingHeartRateFromPoint(points[i])
      if (bpm !== null) return bpm
    }
  } catch {
    // fall through to rollup fallback
  }

  try {
    const { data } = await axios.post(
      `${HEALTH_BASE}/users/me/dataTypes/daily-resting-heart-rate/dataPoints:dailyRollUp`,
      civilDayRange(date),
      { headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' } }
    )
    const points: Array<Record<string, unknown>> = data?.rollupDataPoints ?? []
    for (let i = points.length - 1; i >= 0; i--) {
      const bpm = restingHeartRateFromRollup(points[i])
      if (bpm !== null) return bpm
    }
  } catch {
    return null
  }

  return null
}
