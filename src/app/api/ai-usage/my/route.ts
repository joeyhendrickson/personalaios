import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildAiUsageResponse, parseUsageFilters } from '@/lib/ai/usage-fetch'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sp = request.nextUrl.searchParams
    const filters = parseUsageFilters(sp)
    // Never trust client-supplied userId for this endpoint
    filters.userId = null

    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '50', 10) || 50, 1), 200)
    const offset = Math.max(parseInt(sp.get('offset') || '0', 10) || 0, 0)

    const { logs, count, summary } = await buildAiUsageResponse(supabase, filters, {
      enforceUserId: user.id,
      limit,
      offset,
      includePerUser: false,
    })

    return NextResponse.json({ logs, summary, count })
  } catch (e) {
    console.error('[ai-usage/my]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load AI usage' },
      { status: 500 }
    )
  }
}
