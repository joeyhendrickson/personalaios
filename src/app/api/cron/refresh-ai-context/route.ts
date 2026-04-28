/**
 * Daily cron: refresh AI context cache for active users.
 * Configure in vercel.json crons.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { refreshUserContextCache } from '@/lib/ai-context/cache-generator'

const BATCH_SIZE = 10
const MAX_USERS = 100

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: staleRows } = await supabase
      .from('user_context_cache')
      .select('user_id')
      .or(`last_full_refresh_at.lt.${staleThreshold},last_full_refresh_at.is.null`)
      .limit(MAX_USERS)

    let userIds = [...new Set((staleRows || []).map((u: { user_id: string }) => u.user_id))]

    if (userIds.length === 0) {
      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: MAX_USERS })
      userIds = (listData?.users || []).map((u) => u.id).slice(0, BATCH_SIZE)
    }

    const toProcess = userIds.slice(0, BATCH_SIZE)
    const results: { userId: string; success: boolean; ms: number }[] = []

    for (const userId of toProcess) {
      const r = await refreshUserContextCache(userId, {
        route: '/api/cron/refresh-ai-context',
      })
      results.push({ userId, success: r.success, ms: r.durationMs })
    }

    const succeeded = results.filter((r) => r.success).length
    const totalMs = results.reduce((s, r) => s + r.ms, 0)

    return NextResponse.json({
      success: true,
      processed: toProcess.length,
      succeeded,
      totalDurationMs: totalMs,
      results: results.map((r) => ({ userId: r.userId.slice(0, 8) + '…', success: r.success })),
    })
  } catch (error) {
    console.error('[ContextCache] Cron error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }
  return POST(request)
}
