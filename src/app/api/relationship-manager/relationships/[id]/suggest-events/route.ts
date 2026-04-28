import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { searchEventbriteEvents } from '@/lib/integrations/eventbrite'
import { buildRelationshipContextBundle } from '@/lib/relationship-manager/context-bundle'

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

    let events: Awaited<ReturnType<typeof searchEventbriteEvents>> = []
    try {
      const qParts = [
        rel.relationship_type,
        rel.name.split(/\s+/)[0],
        bundle.profileText
          .split('\n')
          .find((l) => l.startsWith('Interests:'))
          ?.replace(/^Interests:\s*/, '') || '',
      ].filter(Boolean)
      const q = qParts.join(' ').slice(0, 120)

      const end = new Date()
      end.setDate(end.getDate() + 45)
      events = await searchEventbriteEvents({
        locationAddress: zip,
        within: '25mi',
        q: q || 'networking social',
        startDateRange: {
          start: new Date().toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Event search failed'
      if (msg.includes('EVENTBRITE_PRIVATE_TOKEN')) {
        return NextResponse.json(
          {
            error: 'Eventbrite is not configured',
            hint: 'Set EVENTBRITE_PRIVATE_TOKEN in server environment for local event search.',
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
      .map(
        (ev, i) =>
          `${i + 1}. ${ev.title}${ev.startAt ? ` — ${ev.startAt.toISOString()}` : ''}${ev.url ? ` — ${ev.url}` : ''}`
      )
      .join('\n')

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
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
      events: shortList,
      ranked: normalized,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
