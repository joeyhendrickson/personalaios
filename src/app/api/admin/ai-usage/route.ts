import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { buildAiUsageResponse, parseUsageFilters } from '@/lib/ai/usage-fetch'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', session.user.email)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const sp = request.nextUrl.searchParams
    const filters = parseUsageFilters(sp)

    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '50', 10) || 50, 1), 200)
    const offset = Math.max(parseInt(sp.get('offset') || '0', 10) || 0, 0)

    const admin = createAdminClient()
    const { logs, count, summary } = await buildAiUsageResponse(admin, filters, {
      enforceUserId: undefined,
      limit,
      offset,
      includePerUser: true,
    })

    return NextResponse.json({ logs, summary, count })
  } catch (e) {
    console.error('[admin/ai-usage]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load AI usage' },
      { status: 500 }
    )
  }
}
