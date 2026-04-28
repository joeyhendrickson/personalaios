import 'server-only'

import type { EventbriteSearchParams, NormalizedExternalEvent } from './providers/types'

/**
 * Eventbrite API — optional OAuth or private token for server-side search.
 * Env: EVENTBRITE_PRIVATE_TOKEN (organization-scoped) or OAuth access per user in external_accounts.
 *
 * Rate limits: backoff + respect Retry-After; cache into event_candidates.
 */
export async function searchEventbriteEvents(
  params: EventbriteSearchParams,
  accessToken?: string
): Promise<NormalizedExternalEvent[]> {
  const token = accessToken ?? process.env.EVENTBRITE_PRIVATE_TOKEN?.trim()
  if (!token) {
    throw new Error('EVENTBRITE_PRIVATE_TOKEN or per-user OAuth token required')
  }

  const url = new URL('https://www.eventbriteapi.com/v3/events/search/')
  if (params.q) url.searchParams.set('q', params.q)
  if (params.locationAddress) url.searchParams.set('location.address', params.locationAddress)
  if (params.locationLatitude != null)
    url.searchParams.set('location.latitude', String(params.locationLatitude))
  if (params.locationLongitude != null)
    url.searchParams.set('location.longitude', String(params.locationLongitude))
  if (params.within) url.searchParams.set('location.within', params.within)
  if (params.startDateRange) {
    url.searchParams.set('start_date.range_start', params.startDateRange.start)
    url.searchParams.set('start_date.range_end', params.startDateRange.end)
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Eventbrite ${res.status}: ${text.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    events?: {
      id?: string
      name?: { text?: string }
      description?: { text?: string }
      url?: string
      start?: { utc?: string }
      venue_id?: string
    }[]
  }

  return (data.events ?? []).map((ev) => ({
    externalId: ev.id ?? '',
    title: ev.name?.text ?? 'Event',
    description: ev.description?.text,
    startAt: ev.start?.utc ? new Date(ev.start.utc) : undefined,
    url: ev.url,
    venueName: undefined,
    zipCode: undefined,
    raw: ev as unknown as Record<string, unknown>,
  }))
}
