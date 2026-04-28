import 'server-only'

import type { NormalizedPlace, PlacesSearchParams } from './providers/types'

/**
 * Google Places API (New) — server key on Vercel only; never expose to client.
 * Env: GOOGLE_PLACES_API_KEY
 */
export async function searchPlacesText(params: PlacesSearchParams): Promise<NormalizedPlace[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim()
  if (!key) {
    throw new Error('GOOGLE_PLACES_API_KEY is not set')
  }

  const body: Record<string, unknown> = {
    textQuery: params.query,
    languageCode: 'en',
  }
  if (params.locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: params.locationBias.lat, longitude: params.locationBias.lng },
        radius: params.locationBias.radiusMeters ?? 15000,
      },
    }
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Places searchText ${res.status}: ${text.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    places?: {
      id?: string
      displayName?: { text?: string }
      formattedAddress?: string
      location?: { latitude?: number; longitude?: number }
    }[]
  }

  return (data.places ?? []).map((p) => ({
    placeId: p.id ?? '',
    name: p.displayName?.text ?? 'Unknown',
    formattedAddress: p.formattedAddress,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
  }))
}
