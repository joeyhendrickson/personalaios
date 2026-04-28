import type { EventCandidateInput, ScoredEventRecommendation } from './types'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export interface RankEventsParams {
  userZip?: string | null
  userLat?: number | null
  userLng?: number | null
  relationshipZip?: string | null
  relationshipLat?: number | null
  relationshipLng?: number | null
  interestKeywords?: string[]
  maxResults?: number
}

/**
 * Ranks cached event_candidates for a user + optional relationship context.
 * Uses ZIP match (weak), geo distance when coords exist, and simple keyword overlap.
 */
export function rankEventCandidates(
  candidates: EventCandidateInput[],
  params: RankEventsParams
): ScoredEventRecommendation[] {
  const max = params.maxResults ?? 20
  const keywords = (params.interestKeywords ?? []).map((k) => k.toLowerCase())

  const anchorLat = params.relationshipLat ?? params.userLat
  const anchorLng = params.relationshipLng ?? params.userLng
  const anchorZip = params.relationshipZip ?? params.userZip

  const scored = candidates.map((ev) => {
    let score = 50
    const reasons: string[] = []

    if (anchorZip && ev.zipCode && anchorZip.slice(0, 5) === ev.zipCode.slice(0, 5)) {
      score += 25
      reasons.push('same_zip_prefix')
    }

    if (anchorLat != null && anchorLng != null && ev.lat != null && ev.lng != null) {
      const km = haversineKm(anchorLat, anchorLng, ev.lat, ev.lng)
      const distScore = Math.max(0, 30 - km / 5)
      score += distScore
      if (distScore > 5) reasons.push('nearby')
    }

    if (keywords.length && ev.tags?.length) {
      const tagSet = new Set(ev.tags.map((t) => t.toLowerCase()))
      const hits = keywords.filter((k) =>
        [...tagSet].some((t) => t.includes(k) || k.includes(t))
      ).length
      if (hits > 0) {
        score += Math.min(20, hits * 7)
        reasons.push('keyword_match')
      }
    }

    const hay = `${ev.title} ${ev.description ?? ''}`.toLowerCase()
    for (const k of keywords) {
      if (k && hay.includes(k)) {
        score += 5
        reasons.push(`text:${k}`)
        break
      }
    }

    if (ev.startAt) {
      const days = (ev.startAt.getTime() - Date.now()) / 86400000
      if (days >= 0 && days <= 14) {
        score += 10
        reasons.push('upcoming_2w')
      }
    }

    return {
      eventCandidateId: ev.id,
      score,
      reasons: [...new Set(reasons)],
    }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, max)
}
