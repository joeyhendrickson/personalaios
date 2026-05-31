import 'server-only'

import type { GoogleEventsSearchParams, NormalizedExternalEvent } from './providers/types'

/**
 * Google Events via SerpApi (engine=google_events).
 *
 * Google's Events panel aggregates Eventbrite, Meetup, Ticketmaster, Facebook, and
 * venue sites, so this single source covers most "events near me" listings, including
 * Meetups. Google has no official events query API; SerpApi scrapes the results.
 *
 * Env: SERPAPI_KEY. Free tier is 250 searches/month, so callers should cache per zip.
 */

interface SerpApiTicketInfo {
  source?: string
  link?: string
  link_type?: string
}

interface SerpApiEvent {
  title?: string
  date?: { start_date?: string; when?: string }
  address?: string[]
  link?: string
  description?: string
  ticket_info?: SerpApiTicketInfo[]
  venue?: { name?: string }
  event_location_map?: { link?: string }
  thumbnail?: string
}

interface SerpApiResponse {
  events_results?: SerpApiEvent[]
  error?: string
}

/**
 * Best-effort parse of SerpApi's human date strings (no year is provided, so we
 * assume the next occurrence). Returns undefined when it can't be parsed reliably.
 */
function parseEventDate(when?: string, startDate?: string): Date | undefined {
  const now = new Date()

  // Handle SerpApi's relative phrasing first ("Today, 6 – 11 PM", "Tomorrow, 7 PM").
  const lowerWhen = (when || '').toLowerCase()
  if (lowerWhen.startsWith('today')) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (lowerWhen.startsWith('tomorrow')) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const raw = (startDate || when || '').trim()
  if (!raw) return undefined
  // Take the portion before any range separator ("–", "-", "to").
  const head = raw.split(/[–-]|(?:\bto\b)/)[0].trim()
  // Reject relative/day-of-week-only tokens that Date can misparse (e.g. "Today" → year 2001).
  if (!/\d/.test(head)) return undefined
  const candidates = [head, `${head} ${now.getFullYear()}`]
  for (const c of candidates) {
    const parsed = new Date(c)
    if (!Number.isNaN(parsed.getTime())) {
      // If the parsed date is far in the past, roll to next year.
      if (parsed.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000) {
        parsed.setFullYear(parsed.getFullYear() + 1)
      }
      return parsed
    }
  }
  return undefined
}

function stableExternalId(ev: SerpApiEvent): string {
  const basis = ev.link || `${ev.title ?? ''}|${ev.date?.when ?? ''}|${ev.venue?.name ?? ''}`
  // Compact, deterministic id (djb2-ish) so the same event de-dupes in the cache.
  let hash = 5381
  for (let i = 0; i < basis.length; i++) {
    hash = (hash * 33) ^ basis.charCodeAt(i)
  }
  return `ge_${(hash >>> 0).toString(36)}`
}

interface SerpApiLocalResult {
  title?: string
  place_id?: string
  data_id?: string
  rating?: number
  reviews?: number
  type?: string
  address?: string
  description?: string
  links?: { website?: string; directions?: string }
  thumbnail?: string
}

interface SerpApiLocalResponse {
  local_results?: SerpApiLocalResult[]
  error?: string
}

/**
 * Google Local places (restaurants, venues, things to do) via SerpApi
 * (engine=google_local). Useful for date-spot ideas like restaurants or activities.
 */
export async function searchGoogleLocal(
  params: GoogleEventsSearchParams
): Promise<NormalizedExternalEvent[]> {
  const key = process.env.SERPAPI_KEY?.trim()
  if (!key) {
    throw new Error('SERPAPI_KEY required')
  }

  const url = new URL('https://serpapi.com/search')
  url.searchParams.set('engine', 'google_local')
  url.searchParams.set('q', params.q)
  if (params.location) url.searchParams.set('location', params.location)
  url.searchParams.set('hl', 'en')
  url.searchParams.set('gl', 'us')
  url.searchParams.set('api_key', key)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SerpApi ${res.status}: ${text.slice(0, 500)}`)
  }

  const data = (await res.json()) as SerpApiLocalResponse
  if (data.error) {
    throw new Error(`SerpApi: ${data.error}`)
  }

  return (data.local_results ?? []).map((r) => {
    const ratingText = r.rating
      ? `${r.rating}★${r.reviews ? ` (${r.reviews} reviews)` : ''}`
      : undefined
    const descParts = [r.type, ratingText].filter(Boolean).join(' · ')
    return {
      externalId: `gl_${r.place_id || r.data_id || `${r.title ?? ''}|${r.address ?? ''}`}`,
      title: r.title ?? 'Place',
      description: r.description || descParts || undefined,
      whenText: ratingText,
      url: r.links?.website || r.links?.directions,
      venueName: r.title,
      address: r.address,
      raw: r as unknown as Record<string, unknown>,
    }
  })
}

export async function searchGoogleEvents(
  params: GoogleEventsSearchParams
): Promise<NormalizedExternalEvent[]> {
  const key = process.env.SERPAPI_KEY?.trim()
  if (!key) {
    throw new Error('SERPAPI_KEY required')
  }

  const query = params.location ? `${params.q} in ${params.location}` : params.q

  const url = new URL('https://serpapi.com/search')
  url.searchParams.set('engine', 'google_events')
  url.searchParams.set('q', query)
  url.searchParams.set('hl', 'en')
  url.searchParams.set('gl', 'us')
  if (params.dateFilter) url.searchParams.set('htichips', params.dateFilter)
  url.searchParams.set('api_key', key)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SerpApi ${res.status}: ${text.slice(0, 500)}`)
  }

  const data = (await res.json()) as SerpApiResponse
  if (data.error) {
    throw new Error(`SerpApi: ${data.error}`)
  }

  return (data.events_results ?? []).map((ev) => {
    const ticket = ev.ticket_info?.find((t) => t.link)
    return {
      externalId: stableExternalId(ev),
      title: ev.title ?? 'Event',
      description: ev.description,
      startAt: parseEventDate(ev.date?.when, ev.date?.start_date),
      whenText: ev.date?.when || ev.date?.start_date,
      url: ev.link || ticket?.link || ev.event_location_map?.link,
      venueName: ev.venue?.name,
      address: Array.isArray(ev.address) ? ev.address.join(', ') : undefined,
      raw: ev as unknown as Record<string, unknown>,
    }
  })
}
