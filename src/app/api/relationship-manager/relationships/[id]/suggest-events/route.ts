import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { searchGoogleEvents } from '@/lib/integrations/serpapi-events'
import type { NormalizedExternalEvent } from '@/lib/integrations/providers/types'
import { buildRelationshipContextBundle } from '@/lib/relationship-manager/context-bundle'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: relationshipId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rel } = await supabase
      .from('relationships')
      .select('id, name, zip_code, relationship_type')
      .eq('id', relationshipId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!rel) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let bodyZip: string | undefined
    try {
      const b = await request.json()
      if (b && typeof b.zip_code === 'string' && b.zip_code.trim()) {
        bodyZip = b.zip_code.trim()
      }
    } catch {
      /* optional body */
    }

    const zip = bodyZip || (rel.zip_code as string | null)?.trim()
    if (!zip) {
      return NextResponse.json(
        {
          error: 'Missing zip_code',
          hint: 'Set zip code on the relationship profile or pass { "zip_code": "90210" } in the request body.',
        },
        { status: 400 }
      )
    }

    const bundle = await buildRelationshipContextBundle(supabase, user.id, relationshipId)

    // Build an interest-driven query for Google Events (drop the person's name —
    // it pollutes event search). Fall back to a generic "things to do" query.
    const interests =
      bundle.profileText
        .split('\n')
        .find((l) => l.startsWith('Interests:'))
        ?.replace(/^Interests:\s*/, '')
        .trim() || ''
    const q = (interests || 'things to do').slice(0, 120)

    const CACHE_TTL_MS = 12 * 60 * 60 * 1000
    let events: NormalizedExternalEvent[] = []
    let fromCache = false

    try {
      // 1) Per-zip cache (shared across this user's relationships, refreshed every 12h).
      const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString()
      const cached = await supabase
        .from('event_candidates')
        .select('external_id, title, description, start_at, venue_name, address, url, raw')
        .eq('user_id', user.id)
        .eq('provider', 'google_events')
        .eq('zip_code', zip)
        .gte('fetched_at', cutoff)
        .order('fetched_at', { ascending: false })
        .limit(40)

      if (cached.data && cached.data.length > 0) {
        fromCache = true
        events = cached.data.map((r) => {
          const raw = (r.raw || {}) as { date?: { when?: string } }
          return {
            externalId: r.external_id as string,
            title: r.title as string,
            description: (r.description as string) ?? undefined,
            startAt: r.start_at ? new Date(r.start_at as string) : undefined,
            whenText: raw.date?.when,
            url: (r.url as string) ?? undefined,
            venueName: (r.venue_name as string) ?? undefined,
            address: (r.address as string) ?? undefined,
            raw: (r.raw as Record<string, unknown>) ?? {},
          }
        })
      } else {
        // 2) Live fetch from Google Events via SerpApi, then cache.
        events = await searchGoogleEvents({ q, location: zip, dateFilter: 'date:month' })

        if (events.length > 0) {
          const fetchedAt = new Date().toISOString()
          const rows = events.map((ev) => ({
            user_id: user.id,
            provider: 'google_events',
            external_id: ev.externalId,
            title: ev.title,
            description: ev.description ?? null,
            start_at: ev.startAt ? ev.startAt.toISOString() : null,
            venue_name: ev.venueName ?? null,
            address: ev.address ?? null,
            zip_code: zip,
            url: ev.url ?? null,
            raw: ev.raw ?? {},
            fetched_at: fetchedAt,
          }))
          const { error: cacheError } = await supabase
            .from('event_candidates')
            .upsert(rows, { onConflict: 'user_id,provider,external_id' })
          if (cacheError) console.warn('event_candidates cache write failed:', cacheError.message)
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Event search failed'
      if (msg.includes('SERPAPI_KEY')) {
        return NextResponse.json(
          {
            error: 'Event search is not configured',
            hint: 'Set SERPAPI_KEY in the server environment to enable Google Events search.',
          },
          { status: 503 }
        )
      }
      console.error('suggest-events', e)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const shortList = events.slice(0, 12)
    if (shortList.length === 0) {
      return NextResponse.json({
        zip_code: zip,
        events: [],
        ranked: [],
        note: 'No events returned for this query; try another zip or broader interests.',
      })
    }

    const eventLines = shortList
      .map((ev, i) => {
        const when = ev.whenText || (ev.startAt ? ev.startAt.toISOString() : '')
        const where = ev.venueName || ev.address || ''
        return `${i + 1}. ${ev.title}${when ? ` — ${when}` : ''}${where ? ` @ ${where}` : ''}${ev.url ? ` — ${ev.url}` : ''}`
      })
      .join('\n')

    const { text } = await generateText({
      model: defaultOpenaiModel(),
      prompt: `You help pick social or professional outings.

RELATIONSHIP CONTEXT:
${bundle.profileText}

PHOTO / ACTIVITY TAGS:
${bundle.photoContext.slice(0, 1500)}

RECENT THREAD SUMMARY (if any):
${bundle.screenshotContext.slice(0, 1500)}

CANDIDATE EVENTS (near ${zip}):
${eventLines}

Return ONLY valid JSON: { "ranked": [ { "index": number (1-based from list above), "score": number 0-100, "reason": "one sentence why it fits this relationship" } ] }
Pick up to 5 events; omit poor fits. Sort by score descending.`,
      temperature: 0.4,
    })

    let ranked: { index: number; score: number; reason: string }[] = []
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { ranked?: typeof ranked }
        ranked = Array.isArray(parsed.ranked) ? parsed.ranked : []
      }
    } catch {
      ranked = []
    }

    const normalized = ranked
      .filter((r) => r.index >= 1 && r.index <= shortList.length)
      .map((r) => ({
        ...r,
        event: shortList[r.index - 1],
      }))

    return NextResponse.json({
      zip_code: zip,
      source: 'google_events',
      cached: fromCache,
      events: shortList,
      ranked: normalized,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
