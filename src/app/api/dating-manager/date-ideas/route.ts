import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { searchGoogleEvents, searchGoogleLocal } from '@/lib/integrations/serpapi-events'

const schema = z.object({
  zip_code: z.string().min(3).max(20),
  category: z.enum(['events', 'restaurants', 'movies', 'activities', 'coffee', 'bars']),
})

// Categories that are best served by place listings (google_local) vs. event listings.
const PLACE_CATEGORIES = new Set(['restaurants', 'coffee', 'bars', 'activities'])

const CATEGORY_QUERY: Record<string, string> = {
  events: 'live music events',
  movies: 'movies showtimes',
  restaurants: 'date night restaurants',
  coffee: 'cozy coffee shops',
  bars: 'cocktail bars',
  activities: 'fun things to do',
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { zip_code, category } = schema.parse(await request.json())
    const q = CATEGORY_QUERY[category] || 'date ideas'

    try {
      const ideas = PLACE_CATEGORIES.has(category)
        ? await searchGoogleLocal({ q, location: zip_code })
        : await searchGoogleEvents({ q, location: zip_code, dateFilter: 'date:month' })

      return NextResponse.json({
        zip_code,
        category,
        source: PLACE_CATEGORIES.has(category) ? 'google_local' : 'google_events',
        ideas: ideas.slice(0, 12),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Search failed'
      if (msg.includes('SERPAPI_KEY')) {
        return NextResponse.json(
          {
            error: 'Date ideas search is not configured',
            hint: 'Set SERPAPI_KEY in the server environment.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: e.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get date ideas' },
      { status: 500 }
    )
  }
}
